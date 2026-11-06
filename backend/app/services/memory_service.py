try:
    import chromadb
    from chromadb.config import Settings
    from chromadb.utils import embedding_functions
    CHROMADB_AVAILABLE = True
except ImportError:
    chromadb = None
    CHROMADB_AVAILABLE = False

import json
import logging
import os

logger = logging.getLogger("MemoryService")

class MemoryService:
    def __init__(self):
        self.client = None
        self.collection = None
        base_dir = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
        self.fallback_file = os.path.join(base_dir, "config", "memory_fallback.json")
        os.makedirs(os.path.dirname(self.fallback_file), exist_ok=True)

        if not CHROMADB_AVAILABLE:
            logger.info("ChromaDB no disponible. Usando almacenamiento JSON local de respaldo.")
            return
        db_path = os.path.join(base_dir, "chroma_db")
        os.makedirs(db_path, exist_ok=True)
        
        try:
            self.client = chromadb.PersistentClient(path=db_path)
            self.embedding_function = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="paraphrase-multilingual-MiniLM-L12-v2")
            self.collection = self.client.get_or_create_collection(
                name="habana_memory",
                embedding_function=self.embedding_function
            )
            logger.info("ChromaDB Memory Service inicializado con exito.")
        except Exception as e:
            logger.warning(f"ChromaDB no disponible en este entorno ({e}). Usando almacenamiento JSON local de respaldo.")
            self.client = None
            self.collection = None

    def _load_fallback(self) -> list:
        if not os.path.exists(self.fallback_file):
            return []
        try:
            with open(self.fallback_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data if isinstance(data, list) else []
        except Exception:
            return []

    def _save_fallback(self, items: list):
        try:
            with open(self.fallback_file, "w", encoding="utf-8") as f:
                json.dump(items, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.warning(f"Error guardando respaldo de memoria: {e}")

    def add_memory(self, doc_id: str, text: str, metadata: dict = None):
        if metadata is None:
            metadata = {}
        if not self.collection:
            items = [m for m in self._load_fallback() if m.get("id") != doc_id]
            items.append({"id": doc_id, "text": text, "metadata": metadata})
            self._save_fallback(items)
            return True
        try:
            self.collection.upsert(
                documents=[text],
                metadatas=[metadata],
                ids=[doc_id]
            )
            logger.info(f"Memoria '{doc_id}' guardada.")
            return True
        except Exception as e:
            logger.warning(f"Error guardando memoria '{doc_id}': {e}")
            return False

    def search_memory(self, query: str, n_results: int = 3):
        if not self.collection:
            items = self._load_fallback()
            q = (query or "").lower()
            matched = [m for m in items if q in m.get("text", "").lower()]
            return [{"text": m.get("text", ""), "metadata": m.get("metadata", {})} for m in (matched or items)[:n_results]]
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results
            )
            if results and results.get('documents') and len(results['documents']) > 0:
                docs = results['documents'][0]
                metas = results['metadatas'][0] if 'metadatas' in results else [{}] * len(docs)
                return [{"text": d, "metadata": m} for d, m in zip(docs, metas)]
            return []
        except Exception as e:
            logger.warning(f"Error buscando en memoria: {e}")
            return []

    def get_all_memories(self):
        if not self.collection:
            return self._load_fallback()
        try:
            results = self.collection.get()
            docs = results.get('documents', [])
            metas = results.get('metadatas', [])
            ids = results.get('ids', [])
            
            memories = []
            for i in range(len(ids)):
                memories.append({
                    "id": ids[i],
                    "text": docs[i] if i < len(docs) else "",
                    "metadata": metas[i] if metas and i < len(metas) else {}
                })
            return memories
        except Exception as e:
            logger.warning(f"Error obteniendo memorias: {e}")
            return []

    def delete_memory(self, doc_id: str):
        if not self.collection:
            items = self._load_fallback()
            new_items = [m for m in items if m.get("id") != doc_id]
            self._save_fallback(new_items)
            return True
        try:
            self.collection.delete(ids=[doc_id])
            logger.info(f"Memoria '{doc_id}' borrada.")
            return True
        except Exception as e:
            logger.warning(f"Error borrando memoria '{doc_id}': {e}")
            return False

memory_service = MemoryService()

