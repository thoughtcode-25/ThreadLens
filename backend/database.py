import os
from dotenv import load_dotenv
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, PyMongoError

# Load environment variables from .env in backend directory or parent directories
load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

_client = None
_db = None


def get_mongodb_uri() -> str:
    return os.environ.get("MONGODB_URI", "").strip()


def get_db():
    global _client, _db
    if _db is not None:
        return _db

    uri = get_mongodb_uri()
    if not uri:
        raise RuntimeError("MONGODB_URI environment variable is not set. Please set MONGODB_URI in your .env file.")

    _client = MongoClient(uri, serverSelectionTimeoutMS=5000)
    try:
        _db = _client.get_default_database(default="llm_forensic")
    except Exception:
        _db = _client["llm_forensic"]

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
        db.command("ping")
        return True
    except Exception:
        return False

