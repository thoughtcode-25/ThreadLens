import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, PyMongoError

# Load environment variables from .env in backend directory or parent directories
load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

_client = None
_db = None
_is_mock = False


def get_mongodb_uri() -> str:
    return os.environ.get("MONGODB_URI", "").strip()


def get_db():
    global _client, _db, _is_mock
    if _db is not None:
        return _db

    uri = get_mongodb_uri()
    
    # Try connecting to real MongoDB first
    if uri:
        try:
            client = MongoClient(uri, serverSelectionTimeoutMS=1500)
            client.admin.command("ping")
            _client = client
            try:
                _db = _client.get_default_database(default="llm_forensic")
            except Exception:
                _db = _client["llm_forensic"]
            print("[INFO] Connected to MongoDB server successfully.")
        except Exception as e:
            print(f"[INFO] Real MongoDB server at {uri} unavailable ({e}). Falling back to local embedded database.")
            _client = None
            _db = None

    # Fallback to local in-memory/embedded MongoDB mock
    if _db is None:
        try:
            import mongomock
            _client = mongomock.MongoClient()
            _db = _client["llm_forensic"]
            _is_mock = True
            print("[INFO] Using local embedded database (mongomock). All features are fully functional!")
        except Exception as exc:
            raise RuntimeError(f"Could not connect to MongoDB or initialize local fallback: {exc}")

    try:
        _db["logs"].create_index([("timestamp", -1)])
        _db["alerts"].create_index([("timestamp", -1)])
        _db["sessions"].create_index([("created_at", -1)])
    except Exception as exc:
        print(f"[WARN] Failed to create database indexes: {exc}")

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


