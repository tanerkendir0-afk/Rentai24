"""
Türk Muhasebe Referans — Pinecone Yükleme Script'i
====================================================
Bu script, turk-muhasebe-chunks.json dosyasını okur,
her chunk için embedding oluşturur ve Pinecone'a upsert eder.

Replit'te kullanım:
1. pip install pinecone-client openai  (veya anthropic sdk)
2. .env veya Replit Secrets'a ekle:
   - PINECONE_API_KEY
   - PINECONE_INDEX_NAME (örn: "muhasebe-referans")
   - OPENAI_API_KEY (embedding için)
3. python upload_to_pinecone.py
"""

import json
import os
import time
from pinecone import Pinecone
from openai import OpenAI

# ─── Config ───────────────────────────────────────────────────
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_INDEX_NAME = os.getenv("PINECONE_INDEX_NAME", "muhasebe-referans")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSION = 1536
NAMESPACE = "turk-muhasebe"
CHUNKS_FILE = "turk-muhasebe-chunks.json"
BATCH_SIZE = 50  # Pinecone upsert batch size


def load_chunks(filepath: str) -> list:
    """JSON dosyasından chunk'ları yükler."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["chunks"]


def create_embeddings(texts: list[str], client: OpenAI) -> list[list[float]]:
    """OpenAI embedding API ile vektörler oluşturur."""
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=texts
    )
    return [item.embedding for item in response.data]


def setup_pinecone_index(pc: Pinecone) -> any:
    """Pinecone index'i kontrol eder, yoksa oluşturur."""
    existing_indexes = [idx.name for idx in pc.list_indexes()]

    if PINECONE_INDEX_NAME not in existing_indexes:
        print(f"Index '{PINECONE_INDEX_NAME}' bulunamadı, oluşturuluyor...")
        pc.create_index(
            name=PINECONE_INDEX_NAME,
            dimension=EMBEDDING_DIMENSION,
            metric="cosine",
            spec={
                "serverless": {
                    "cloud": "aws",
                    "region": "us-east-1"
                }
            }
        )
        # Index hazır olana kadar bekle
        time.sleep(10)
        print(f"Index '{PINECONE_INDEX_NAME}' oluşturuldu.")
    else:
        print(f"Index '{PINECONE_INDEX_NAME}' mevcut.")

    return pc.Index(PINECONE_INDEX_NAME)


def upload_chunks(chunks: list, index, openai_client: OpenAI):
    """Chunk'ları batch halinde embed edip Pinecone'a yükler."""
    total = len(chunks)
    print(f"\nToplam {total} chunk yüklenecek...\n")

    for i in range(0, total, BATCH_SIZE):
        batch = chunks[i:i + BATCH_SIZE]
        texts = [chunk["text"] for chunk in batch]

        # Embedding oluştur
        print(f"  Embedding oluşturuluyor: {i+1}-{min(i+BATCH_SIZE, total)} / {total}")
        embeddings = create_embeddings(texts, openai_client)

        # Pinecone vektörlerini hazırla
        vectors = []
        for chunk, embedding in zip(batch, embeddings):
            vectors.append({
                "id": chunk["id"],
                "values": embedding,
                "metadata": {
                    **chunk["metadata"],
                    "text": chunk["text"]  # Retrieval sonrası text'e erişim için
                }
            })

        # Upsert
        index.upsert(vectors=vectors, namespace=NAMESPACE)
        print(f"  ✓ Upsert tamamlandı: {len(vectors)} vektör")

        # Rate limiting
        if i + BATCH_SIZE < total:
            time.sleep(0.5)

    print(f"\n✅ Tüm {total} chunk başarıyla yüklendi!")
    print(f"   Index: {PINECONE_INDEX_NAME}")
    print(f"   Namespace: {NAMESPACE}")


def verify_upload(index):
    """Yükleme sonrası index istatistiklerini gösterir."""
    stats = index.describe_index_stats()
    ns_stats = stats.get("namespaces", {}).get(NAMESPACE, {})
    count = ns_stats.get("vector_count", 0)
    print(f"\n📊 Index İstatistikleri:")
    print(f"   Namespace '{NAMESPACE}': {count} vektör")
    print(f"   Toplam: {stats.get('total_vector_count', 0)} vektör")


def main():
    # Ortam değişkenlerini kontrol et
    if not PINECONE_API_KEY:
        raise ValueError("PINECONE_API_KEY tanımlı değil. Replit Secrets'a ekleyin.")
    if not OPENAI_API_KEY:
        raise ValueError("OPENAI_API_KEY tanımlı değil. Replit Secrets'a ekleyin.")

    # Client'ları başlat
    pc = Pinecone(api_key=PINECONE_API_KEY)
    openai_client = OpenAI(api_key=OPENAI_API_KEY)

    # Chunk'ları yükle
    chunks = load_chunks(CHUNKS_FILE)
    print(f"📄 {len(chunks)} chunk yüklendi: {CHUNKS_FILE}")

    # Pinecone index'i hazırla
    index = setup_pinecone_index(pc)

    # Yükle
    upload_chunks(chunks, index, openai_client)

    # Doğrula
    verify_upload(index)


if __name__ == "__main__":
    main()
