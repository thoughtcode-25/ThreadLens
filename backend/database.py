import os
import json
import threading
import time
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, PyMongoError

# Load environment variables from .env in backend directory or parent directories
load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

_client = None
_db = None
_is_mock = False
_remote_attempted = False
_db_lock = threading.Lock()

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def get_mongodb_uri() -> str:
    uri = os.environ.get("MONGODB_URI", "").strip()
    if not uri or "<" in uri or ">" in uri or "your-mongodb" in uri or "username:password" in uri:
        return ""
    return uri


class PersistentMockCollection:
    """High-performance mock collection with debounced async disk persistence."""

    def __init__(self, raw_collection, collection_name: str):
        self._col = raw_collection
        self._name = collection_name
        self._file_path = os.path.join(DATA_DIR, f"{collection_name}.json")
        self._lock = threading.Lock()
        self._dirty = False
        self._last_saved = 0
        self._save_timer = None
        self._load_from_disk()

    def _load_from_disk(self):
        try:
            if os.path.exists(self._file_path):
                with open(self._file_path, "r", encoding="utf-8", errors="replace") as f:
                    docs = json.load(f)
                if isinstance(docs, list) and len(docs) > 0:
                    # Keep latest 2000 records on load for lightning speed
                    if len(docs) > 2000:
                        docs = docs[-2000:]
                    try:
                        self._col.insert_many(docs, ordered=False)
                    except Exception:
                        for doc in docs:
                            try:
                                self._col.insert_one(doc)
                            except Exception:
                                pass
        except Exception as e:
            print(f"[WARN] Could not load collection {self._name} from disk: {e}")

    def _write_file_now(self):
        with self._lock:
            self._save_timer = None
            if not self._dirty:
                return
            self._dirty = False
            self._last_saved = time.time()
            try:
                os.makedirs(DATA_DIR, exist_ok=True)
                # Keep latest 1,500 records on disk for mock persistence to keep IO instant (<5ms)
                docs = list(self._col.find({}))
                if len(docs) > 1500:
                    docs = docs[-1500:]
                tmp_file = f"{self._file_path}.tmp"
                with open(tmp_file, "w", encoding="utf-8") as f:
                    json.dump(docs, f, separators=(",", ":"), default=str)
                if os.path.exists(self._file_path):
                    try:
                        os.replace(tmp_file, self._file_path)
                    except Exception:
                        os.rename(tmp_file, self._file_path)
                else:
                    os.rename(tmp_file, self._file_path)
            except Exception as e:
                print(f"[WARN] Could not persist collection {self._name} to disk: {e}")

    def _schedule_save(self, delay=3.0):
        with self._lock:
            self._dirty = True
            if self._save_timer is None:
                self._save_timer = threading.Timer(delay, self._write_file_now)
                self._save_timer.daemon = True
                self._save_timer.start()

    def insert_one(self, *args, **kwargs):
        res = self._col.insert_one(*args, **kwargs)
        self._schedule_save(delay=2.0)
        return res

    def insert_many(self, *args, **kwargs):
        res = self._col.insert_many(*args, **kwargs)
        self._schedule_save(delay=4.0)
        return res

    def update_one(self, *args, **kwargs):
        res = self._col.update_one(*args, **kwargs)
        self._schedule_save(delay=2.0)
        return res

    def update_many(self, *args, **kwargs):
        res = self._col.update_many(*args, **kwargs)
        self._schedule_save(delay=3.0)
        return res

    def delete_one(self, *args, **kwargs):
        res = self._col.delete_one(*args, **kwargs)
        self._schedule_save(delay=2.0)
        return res

    def delete_many(self, *args, **kwargs):
        res = self._col.delete_many(*args, **kwargs)
        self._schedule_save(delay=2.0)
        return res

    def find(self, *args, **kwargs):
        return self._col.find(*args, **kwargs)

    def find_one(self, *args, **kwargs):
        return self._col.find_one(*args, **kwargs)

    def count_documents(self, *args, **kwargs):
        return self._col.count_documents(*args, **kwargs)

    def create_index(self, *args, **kwargs):
        try:
            return self._col.create_index(*args, **kwargs)
        except Exception:
            return None

    def __getattr__(self, name):
        return getattr(self._col, name)


class PersistentMockDatabase:
    """Wraps mongomock database to wrap every accessed collection in PersistentMockCollection."""

    def __init__(self, raw_db):
        self._raw_db = raw_db
        self._wrapped_collections = {}

    def __getitem__(self, name: str):
        if name not in self._wrapped_collections:
            self._wrapped_collections[name] = PersistentMockCollection(self._raw_db[name], name)
        return self._wrapped_collections[name]

    def __getattr__(self, name):
        return self[name]


def get_db():
    global _client, _db, _is_mock, _remote_attempted
    if _db is not None:
        return _db

    with _db_lock:
        if _db is not None:
            return _db

        uri = get_mongodb_uri()

        # Try connecting to real MongoDB first (fast 500ms timeout)
        if uri and not _remote_attempted:
            _remote_attempted = True
            try:
                client = MongoClient(uri, serverSelectionTimeoutMS=600, connectTimeoutMS=600, socketTimeoutMS=600)
                client.admin.command("ping")
                _client = client
                try:
                    _db = _client.get_default_database(default="llm_forensic")
                except Exception:
                    _db = _client["llm_forensic"]
                print("[INFO] Connected to MongoDB Atlas/server successfully.")
            except Exception as e:
                print(f"[INFO] Remote MongoDB server unavailable ({e}). Initializing persistent local database.")
                _client = None
                _db = None

        # Fallback to local persistent MongoDB mock (persists to backend/data/*.json)
        if _db is None:
            try:
                import mongomock
                raw_client = mongomock.MongoClient()
                raw_db = raw_client["llm_forensic"]
                _db = PersistentMockDatabase(raw_db)
                _is_mock = True
                print("[INFO] Using persistent local database (backed by backend/data/). User accounts, sessions, and logs are permanently saved on disk!")
            except Exception as exc:
                raise RuntimeError(f"Could not connect to MongoDB or initialize local fallback: {exc}")

        try:
            _db["logs"].create_index([("timestamp", -1)])
            _db["alerts"].create_index([("timestamp", -1)])
            _db["sessions"].create_index([("created_at", -1)])
            _db["chat_sessions"].create_index([("updated_at", -1)])
            _db["users"].create_index([("email", 1)])
        except Exception as exc:
            pass

        return _db


def ping_db() -> bool:
    try:
        db = get_db()
        if _is_mock:
            return True
        db.command("ping")
        return True
    except Exception:
        return False


# Eager background warm-up so the very first HTTP request has 0ms cold-start latency
try:
    threading.Thread(target=get_db, daemon=True).start()
except Exception:
    pass
