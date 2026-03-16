"""
VUK Batch 1 — Pinecone Yükleme
Kullanım: cd ~/workspace/server && python3 upload_vuk_batch1.py
"""
import os, json, time
from pinecone import Pinecone
from openai import OpenAI

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX_NAME", "muhasebe-referans"))
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
NAMESPACE = "turk-muhasebe"

# Chunk dosyasını yükle
script_dir = os.path.dirname(os.path.abspath(__file__))
# Önce aynı dizinde, yoksa üst dizinde ara
for path in [
    os.path.join(script_dir, "vuk-chunks-batch1.json"),
    os.path.join(os.path.dirname(script_dir), "vuk-chunks-batch1.json"),
    "vuk-chunks-batch1.json"
]:
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        break
else:
    raise FileNotFoundError("vuk-chunks-batch1.json bulunamadı!")

chunks = data["chunks"]
total = len(chunks)
BATCH = 25

print(f"📚 VUK Batch 1: {total} chunk yüklenecek...\n")

for i in range(0, total, BATCH):
    batch = chunks[i:i+BATCH]
    texts = [c["text"] for c in batch]
    
    print(f"  Embedding: {i+1}-{min(i+BATCH, total)} / {total}")
    resp = client.embeddings.create(model="text-embedding-3-small", input=texts)
    
    vectors = []
    for chunk, emb in zip(batch, resp.data):
        vectors.append({
            "id": chunk["id"],
            "values": emb.embedding,
            "metadata": {**chunk["metadata"], "text": chunk["text"]}
        })
    
    index.upsert(vectors=vectors, namespace=NAMESPACE)
    print(f"  ✓ Upsert: {len(vectors)} vektör")
    if i + BATCH < total:
        time.sleep(0.5)

stats = index.describe_index_stats()
ns = stats.get("namespaces", {}).get(NAMESPACE, {})
print(f"\n✅ VUK Batch 1 tamamlandı! ({total} chunk)")
print(f"📊 Toplam vektör: {ns.get('vector_count', 0)}")
