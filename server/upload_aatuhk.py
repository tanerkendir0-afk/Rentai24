"""
AATUHK (6183 sayılı Amme Alacakları Tahsil Usulü) — Pinecone Yükleme
Kullanım: cd ~/workspace/server && python3 upload_aatuhk.py
"""
import os, json, time
from pinecone import Pinecone
from openai import OpenAI

pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index(os.getenv("PINECONE_INDEX_NAME", "muhasebe-referans"))
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
NAMESPACE = "turk-muhasebe"

for path in ["aatuhk-chunks.json", "server/aatuhk-chunks.json", "../aatuhk-chunks.json"]:
    if os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        break
else:
    raise FileNotFoundError("aatuhk-chunks.json bulunamadı!")

chunks = data["chunks"]
total = len(chunks)
BATCH = 25

print(f"📚 AATUHK: {total} chunk yüklenecek...\n")

for i in range(0, total, BATCH):
    batch = chunks[i:i+BATCH]
    texts = [c["text"] for c in batch]
    print(f"  Embedding: {i+1}-{min(i+BATCH, total)} / {total}")
    resp = client.embeddings.create(model="text-embedding-3-small", input=texts)
    vectors = []
    for chunk, emb in zip(batch, resp.data):
        vectors.append({"id": chunk["id"], "values": emb.embedding, "metadata": {**chunk["metadata"], "text": chunk["text"]}})
    index.upsert(vectors=vectors, namespace=NAMESPACE)
    print(f"  ✓ Upsert: {len(vectors)} vektör")
    if i + BATCH < total:
        time.sleep(0.5)

stats = index.describe_index_stats()
ns = stats.get("namespaces", {}).get(NAMESPACE, {})
print(f"\n✅ AATUHK tamamlandı! ({total} chunk)")
print(f"📊 Toplam vektör: {ns.get('vector_count', 0)}")
