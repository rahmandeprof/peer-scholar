interface Chunk {
  id: string;
  text: string;
  meta?: Record<string, unknown>;
}

interface StoredDoc {
  documentId: string;
  chunks: Chunk[];
  embeddings: number[][];
}

export class InMemoryVectorStore {
  private store = new Map<string, StoredDoc>();

  addDocument(documentId: string, chunks: Chunk[], embeddings: number[][]) {
    this.store.set(documentId, { documentId, chunks, embeddings });
  }

  // simple flat top-k across all documents
  query(embedding: number[], topK = 4) {
    const results: {
      score: number;
      chunk: Chunk;
      documentId: string;
      index: number;
    }[] = [];

    for (const [documentId, doc] of this.store.entries()) {
      for (let i = 0; i < doc.embeddings.length; i++) {
        const score = cosineSimilarity(embedding, doc.embeddings[i]);

        results.push({ score, chunk: doc.chunks[i], documentId, index: i });
      }
    }

    results.sort((a, b) => b.score - a.score);

    return results.slice(0, topK);
  }

  getDocument(documentId: string) {
    return this.store.get(documentId) ?? null;
  }
}

function dot(a: number[], b: number[]) {
  let s = 0;

  for (let i = 0; i < a.length; i++) s += a[i] * b[i];

  return s;
}

function norm(a: number[]) {
  let s = 0;

  for (const val of a) s += val * val;

  return Math.sqrt(s);
}

function cosineSimilarity(a: number[], b: number[]) {
  return dot(a, b) / (norm(a) * norm(b) + 1e-8);
}
