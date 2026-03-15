"""
Muhasebe Ajanı — Pinecone Retriever
=====================================
FastAPI backend'inde kullanılacak retriever fonksiyonu.
Kullanıcı sorusunu embed eder, Pinecone'dan en alakalı chunk'ları çeker
ve Claude API'ye gönderilecek context'i oluşturur.

Kullanım:
    from muhasebe_retriever import get_relevant_context
    
    context = await get_relevant_context("KDV tevkifat oranları nedir?")
    # context string'i Claude API system/user mesajına eklenir
"""

import os
from pinecone import Pinecone
from openai import OpenAI

# ─── Config ───────────────────────────────────────────────────
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "muhasebe-referans")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBEDDING_MODEL = "text-embedding-3-small"
NAMESPACE = "turk-muhasebe"

# Retrieval parametreleri
TOP_K = 5                    # Kaç chunk getirilecek (3-5 ideal)
SCORE_THRESHOLD = 0.25       # Minimum benzerlik skoru (altındakiler filtrelenir)
MAX_CONTEXT_TOKENS = 3000    # Context için maksimum token limiti (yaklaşık)

# Singleton client'lar (Replit'te her request'te yeniden oluşturmamak için)
_pc = None
_index = None
_openai_client = None


def _get_clients():
    """Lazy initialization ile client'ları döndürür."""
    global _pc, _index, _openai_client
    if _pc is None:
        _pc = Pinecone(api_key=PINECONE_API_KEY)
        _index = _pc.Index(PINECONE_INDEX_NAME)
        _openai_client = OpenAI(api_key=OPENAI_API_KEY)
    return _index, _openai_client


def _create_query_embedding(query: str) -> list[float]:
    """Sorgu için embedding oluşturur."""
    _, openai_client = _get_clients()
    response = openai_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=[query]
    )
    return response.data[0].embedding


def _query_pinecone(
    embedding: list[float],
    top_k: int = TOP_K,
    category_filter: str = None
) -> list[dict]:
    """Pinecone'dan en yakın chunk'ları getirir."""
    index, _ = _get_clients()

    # Opsiyonel kategori filtresi
    filter_dict = None
    if category_filter:
        filter_dict = {"category": {"$eq": category_filter}}

    results = index.query(
        vector=embedding,
        top_k=top_k,
        include_metadata=True,
        namespace=NAMESPACE,
        filter=filter_dict
    )

    # Score threshold uygula
    filtered = []
    for match in results.get("matches", []):
        if match["score"] >= SCORE_THRESHOLD:
            filtered.append({
                "id": match["id"],
                "score": round(match["score"], 4),
                "text": match["metadata"].get("text", ""),
                "category": match["metadata"].get("category", ""),
                "subcategory": match["metadata"].get("subcategory", ""),
                "year": match["metadata"].get("year", ""),
                "keywords": match["metadata"].get("keywords", [])
            })

    return filtered


def _detect_category(query: str) -> str | None:
    """Basit keyword-based kategori tespiti. Pinecone filtresi için kullanılır."""
    query_lower = query.lower()

    category_keywords = {
        "kdv": ["kdv", "katma değer", "tevkifat", "istisna", "muaf", "indirilecek", "hesaplanan"],
        "sgk": ["sgk", "sigorta", "prim", "işsizlik", "tavan", "taban", "asgari ücret"],
        "bordro": ["bordro", "maaş", "brüt", "net", "ücret hesaplama"],
        "gelir_vergisi": ["gelir vergisi", "vergi dilimi", "tarife", "stopaj", "kümülatif"],
        "damga_vergisi": ["damga vergisi", "binde"],
        "diib": ["dİİb", "dahilde işleme", "taahhüt", "tecil", "terkin"],
        "ihracat": ["ihracat", "yurtdışı satış", "gb", "gümrük beyannamesi", "601"],
        "ithalat": ["ithalat", "cif", "fob", "gümrük vergisi", "navlun"],
        "kambiyo": ["kambiyo", "ibkb", "döviz", "tcmb", "bedel getirme", "180 gün"],
        "kur": ["kur", "kur farkı", "kambiyo kârı", "kambiyo zararı", "değerleme"],
        "amortisman": ["amortisman", "faydalı ömür", "azalan bakiye"],
        "fatura": ["fatura", "e-fatura", "e-arşiv", "iade faturası"],
        "tazminat": ["kıdem", "ihbar", "tazminat"],
        "insaat": ["inşaat", "hakediş", "yıllara yaygın"],
        "sektorel": ["fire", "hurda", "hadde", "galvaniz", "çelik", "imalat"],
        "hesap_plani": ["hesap planı", "hesap kodu", "tdhp"],
        "beyanname": ["beyanname", "takvim", "ba-bs"],
    }

    for category, keywords in category_keywords.items():
        for keyword in keywords:
            if keyword in query_lower:
                return category

    return None  # Filtre uygulanmaz, tüm kategorilerden aranır


def format_context(chunks: list[dict]) -> str:
    """Chunk'ları Claude API'ye gönderilecek context string'ine dönüştürür."""
    if not chunks:
        return ""

    context_parts = ["<referans_bilgisi>"]
    for i, chunk in enumerate(chunks, 1):
        year_note = f" [Yıl: {chunk['year']}]" if chunk['year'] != 'evergreen' else ""
        context_parts.append(
            f"\n[Kaynak {i}: {chunk['category']}/{chunk['subcategory']}{year_note}]\n"
            f"{chunk['text']}\n"
        )
    context_parts.append("</referans_bilgisi>")

    return "\n".join(context_parts)


async def get_relevant_context(
    query: str,
    top_k: int = TOP_K,
    use_category_filter: bool = True
) -> str:
    """
    Ana fonksiyon — Kullanıcı sorusuna en uygun referans bilgisini döndürür.
    
    Args:
        query: Kullanıcının sorusu
        top_k: Kaç chunk getirilecek (varsayılan 5)
        use_category_filter: Kategori filtresi uygulansın mı
    
    Returns:
        Claude API'ye eklenecek context string'i
    
    Kullanım:
        context = await get_relevant_context("Brüt 40.000 TL maaş bordrosu hesapla")
        
        # Claude API çağrısında:
        messages = [
            {"role": "user", "content": f"{context}\n\nKullanıcı sorusu: {query}"}
        ]
    """
    # Kategori tespiti (opsiyonel)
    category = _detect_category(query) if use_category_filter else None

    # Embedding oluştur
    embedding = _create_query_embedding(query)

    # Pinecone'dan chunk'ları getir
    chunks = _query_pinecone(embedding, top_k=top_k, category_filter=category)

    # Eğer kategori filtresiyle yeterli sonuç gelmezse, filtresiz tekrar dene
    if len(chunks) < 2 and category is not None:
        chunks = _query_pinecone(embedding, top_k=top_k, category_filter=None)

    # Context string'ine dönüştür
    return format_context(chunks)


# ─── FastAPI Endpoint Örneği ──────────────────────────────────
"""
from fastapi import APIRouter
from muhasebe_retriever import get_relevant_context

router = APIRouter()

@router.post("/api/muhasebe/ask")
async def ask_muhasebe(request: AskRequest):
    # 1. Referans bilgisini getir (~1.500-3.000 token)
    context = await get_relevant_context(request.question)
    
    # 2. System prompt'u oku (~500 token)
    system_prompt = open("muhasebe-system-prompt.md").read()
    
    # 3. Claude API çağrısı (~2.000-3.500 token input)
    response = anthropic_client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=system_prompt,
        messages=[
            {"role": "user", "content": f"{context}\n\nSoru: {request.question}"}
        ]
    )
    
    return {"answer": response.content[0].text}
"""
