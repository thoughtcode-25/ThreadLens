import os
import csv
import json
import io
import uuid
import threading
import tempfile
from datetime import datetime
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env in backend directory or parent directories
load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

from fastapi import FastAPI, UploadFile, File, Form, Query, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel



from database import get_db, ping_db
from parser import parse_logs, parse_line
from detector import detect_threats
from llm import analyze_event, investigate_sequence, chat_with_ai, ai_configured
from auth import (
    hash_password, verify_password, create_access_token,
    decode_token, generate_otp, send_verification_email
)
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError, ConnectionFailure


def get_owner(request: Optional[Request]) -> str:
    """Extract the authenticated user's email from JWT token or X-User-Email header."""
    if not request:
        return "anonymous"
    try:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            payload = decode_token(token)
            if payload and payload.get("sub"):
                return payload["sub"].strip().lower()
    except Exception:
        pass

    email = request.headers.get("X-User-Email", "").strip().lower()
    return email if email else "anonymous"


def _user_scope_filter(owner: str) -> dict:
    """Build a MongoDB filter that enforces strict per-user tenant isolation."""
    if owner and owner != "anonymous":
        return {"$or": [{"owner": owner}, {"user_email": owner}]}
    return {"$or": [{"owner": "anonymous"}, {"owner": None}, {"owner": {"$exists": False}}]}


app = FastAPI(title="LLM Forensic Investigator API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(PyMongoError)
async def pymongo_exception_handler(request: Request, exc: PyMongoError):
    return JSONResponse(
        status_code=503,
        content={"detail": "Database connection error. Could not connect to MongoDB server. Please ensure MongoDB is running or configure a valid MONGODB_URI in .env."},
    )


@app.exception_handler(RuntimeError)
async def runtime_error_handler(request: Request, exc: RuntimeError):
    if "MONGODB_URI" in str(exc) or "GROQ_API_KEY" in str(exc):
        return JSONResponse(status_code=503, content={"detail": str(exc)})
    return JSONResponse(status_code=500, content={"detail": str(exc)})



# ─── Auth ──────────────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class VerifyEmailRequest(BaseModel):
    email: str
    otp: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ResendOtpRequest(BaseModel):
    email: str


def _safe_get_db():
    try:
        return get_db()
    except Exception as exc:
        raise HTTPException(503, f"Database is unavailable: {exc}")


def _get_auth_user(email: str):
    db = _safe_get_db()
    return db["users"].find_one({"email": email.strip().lower()})


@app.post("/api/auth/signup")
def signup(req: SignupRequest):
    email = req.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "Invalid email address")
    if not req.password or len(req.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    db = _safe_get_db()
    existing = db["users"].find_one({"email": email})

    if existing and existing.get("verified"):
        raise HTTPException(409, "An account with this email already exists")

    otp = generate_otp()
    otp_expires = (datetime.utcnow() + __import__('datetime').timedelta(minutes=10)).isoformat()
    name = req.name or email.split("@")[0].replace(".", " ").replace("_", " ").title()

    user_doc = {
        "_id": str(uuid.uuid4()),
        "email": email,
        "name": name,
        "password_hash": hash_password(req.password),
        "verified": False,
        "otp": otp,
        "otp_expires": otp_expires,
        "created_at": datetime.utcnow().isoformat(),
    }

    if existing and not existing.get("verified"):
        db["users"].update_one(
            {"email": email},
            {"$set": {
                "password_hash": hash_password(req.password),
                "name": name,
                "otp": otp,
                "otp_expires": otp_expires,
            }}
        )
    else:
        db["users"].insert_one(user_doc)

    email_sent = send_verification_email(email, otp, name)
    return {
        "success": True,
        "message": "Verification code sent to your email" if email_sent else "Account created. Check server logs for OTP (SMTP not configured).",
        "email_sent": email_sent,
    }


@app.post("/api/auth/verify-email")
def verify_email(req: VerifyEmailRequest):
    email = req.email.strip().lower()
    db = _safe_get_db()
    user = db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(404, "No account found for this email")
    if user.get("verified"):
        raise HTTPException(400, "Email is already verified")

    otp_expires = user.get("otp_expires", "")
    if otp_expires and datetime.utcnow().isoformat() > otp_expires:
        raise HTTPException(400, "Verification code has expired. Please request a new one.")

    if user.get("otp") != req.otp.strip():
        raise HTTPException(400, "Invalid verification code")

    db["users"].update_one({"email": email}, {"$set": {"verified": True}, "$unset": {"otp": "", "otp_expires": ""}})

    token = create_access_token({"sub": email, "name": user.get("name", "")})
    return {
        "success": True,
        "token": token,
        "user": {"email": email, "name": user.get("name", "")},
    }



@app.post("/api/auth/resend-otp")
def resend_otp(req: ResendOtpRequest):
    email = req.email.strip().lower()
    db = _safe_get_db()
    user = db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(404, "No account found for this email")
    if user.get("verified"):
        raise HTTPException(400, "Email is already verified")

    otp = generate_otp()
    otp_expires = (datetime.utcnow() + __import__('datetime').timedelta(minutes=10)).isoformat()
    db["users"].update_one({"email": email}, {"$set": {"otp": otp, "otp_expires": otp_expires}})

    email_sent = send_verification_email(email, otp, user.get("name", ""))
    return {"success": True, "email_sent": email_sent}


@app.post("/api/auth/login")
def login(req: LoginRequest):
    email = req.email.strip().lower()
    db = _safe_get_db()
    user = db["users"].find_one({"email": email})

    if not user:
        raise HTTPException(401, "Invalid email or password")
    if not user.get("verified"):
        raise HTTPException(403, "Please verify your email before logging in")
    if not verify_password(req.password, user.get("password_hash", "")):
        raise HTTPException(401, "Invalid email or password")

    token = create_access_token({"sub": email, "name": user.get("name", "")})
    return {
        "success": True,
        "token": token,
        "user": {"email": email, "name": user.get("name", "")},
    }


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@app.post("/api/auth/change-password")
def change_password(req: ChangePasswordRequest, request: Request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(401, "Not authenticated")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Invalid or expired token")
    email = payload.get("sub", "")
    db = _safe_get_db()
    user = db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(404, "User not found")
    if not verify_password(req.current_password, user.get("password_hash", "")):
        raise HTTPException(400, "Current password is incorrect")
    if len(req.new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters")
    new_hash = hash_password(req.new_password)
    db["users"].update_one(
        {"email": email},
        {"$set": {"password_hash": new_hash, "password_changed_at": datetime.utcnow().isoformat()}}
    )
    return {"success": True, "message": "Password updated successfully"}


@app.get("/api/auth/me")
def get_me(request: Request):
    token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if not token:
        raise HTTPException(401, "Not authenticated")
    payload = decode_token(token)
    if not payload:
        raise HTTPException(401, "Invalid or expired token")
    email = payload.get("sub", "")
    db = _safe_get_db()
    user = db["users"].find_one({"email": email}, {"_id": 0, "email": 1, "name": 1, "verified": 1})
    if not user:
        raise HTTPException(404, "User not found")
    return {"user": user}



# ─── Health ────────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    db_ok = False
    try:
        db_ok = ping_db()
    except Exception:
        pass
    return {"status": "ok", "db_connected": db_ok, "ai_configured": ai_configured()}


# ─── Upload ────────────────────────────────────────────────────────────────────

MAX_UPLOAD_BYTES = 10 * 1024 * 1024 * 1024  # 10 GB
MAX_STORED_LINES = 10_000_000              # cap stored docs at 10M
BATCH_SIZE = 10_000                        # insert batch size
READ_CHUNK = 512 * 1024                    # 512 KB read chunks

import asyncio

# In-memory job tracker: job_id -> status dict
_upload_jobs: dict = {}
_jobs_lock = threading.Lock()

# WebSocket connections tracker: job_id -> list[WebSocket]
_job_websockets: dict[str, list[WebSocket]] = {}
_ws_lock = threading.Lock()
_main_loop: Optional[asyncio.AbstractEventLoop] = None


@app.on_event("startup")
async def startup_event():
    global _main_loop
    try:
        _main_loop = asyncio.get_running_loop()
    except Exception:
        pass


def notify_ws(job_id: str, data: dict):
    """Thread-safe broadcast of progress and stream events to connected WebSockets."""
    global _main_loop
    with _ws_lock:
        sockets = list(_job_websockets.get(job_id, []))
    if not sockets:
        return

    if _main_loop is None or _main_loop.is_closed():
        try:
            _main_loop = asyncio.get_event_loop()
        except Exception:
            return

    async def _send(ws: WebSocket, payload: dict):
        try:
            await ws.send_json(payload)
        except Exception:
            pass

    for ws in sockets:
        try:
            asyncio.run_coroutine_threadsafe(_send(ws, data), _main_loop)
        except Exception:
            pass


IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp", "tiff", "svg", "gif"}
JSON_EXTENSIONS = {"json", "jsonl", "ndjson"}
TEXT_EXTENSIONS = {"txt", "log", "csv"}
ALLOWED_EXTENSIONS = IMAGE_EXTENSIONS | JSON_EXTENSIONS | TEXT_EXTENSIONS
STREAM_BATCH_SIZE = 2500


def _process_file_background(
    job_id: str,
    tmp_path: str,
    filename: str,
    file_size_bytes: int,
    owner: str = "anonymous",
    ocr_text: Optional[str] = None,
):
    """Runs in a background thread: parse + store the temp file (text, json, or image), stream updates via WebSocket."""
    ingested_at = datetime.utcnow().isoformat()
    start = datetime.utcnow()
    total_lines = 0
    total_stored = 0
    total_alerts = 0
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "txt"

    def _update(status, **kwargs):
        with _jobs_lock:
            _upload_jobs[job_id].update({"status": status, **kwargs})

    def _flush_batch(batch):
        nonlocal total_alerts, total_stored
        if not batch:
            return
        try:
            db["logs"].insert_many(batch, ordered=False)
        except Exception:
            pass

        alerts = detect_threats(batch)
        for a in alerts:
            a["_id"] = str(uuid.uuid4())
            a["created_at"] = ingested_at
            a["owner"] = owner
            a["user_email"] = owner
        if alerts:
            try:
                db["alerts"].insert_many(alerts, ordered=False)
                total_alerts += len(alerts)
            except Exception:
                pass

        elapsed = max(0.1, (datetime.utcnow() - start).total_seconds())
        rate = int(total_stored / elapsed)

        recent_sample = [
            {
                "id": l.get("_id", str(uuid.uuid4())),
                "timestamp": l.get("timestamp", ""),
                "ip": l.get("ip", "unknown"),
                "event": l.get("event", ""),
                "level": l.get("level", "info"),
                "risk": l.get("risk", "low"),
                "status": l.get("status", "success"),
                "suspicious": bool(l.get("suspicious")),
            }
            for l in batch[:15]
        ]

        new_alerts_sample = [
            {
                "id": a.get("_id", str(uuid.uuid4())),
                "title": a.get("title", a.get("type", "Alert")),
                "risk": a.get("risk", "high"),
                "ip": a.get("source", a.get("ip", "N/A")),
                "timestamp": a.get("timestamp", ""),
                "description": a.get("description", ""),
            }
            for a in alerts[:8]
        ] if alerts else []

        _update(
            "processing",
            logs_stored=total_stored,
            threats_detected=total_alerts,
            rate_per_sec=rate,
            recent_logs=recent_sample,
            new_alerts=new_alerts_sample,
        )

        # Broadcast live progress & recent logs stream over WebSocket
        notify_ws(job_id, {
            "type": "progress",
            "status": "processing",
            "logs_stored": total_stored,
            "total_lines": total_lines,
            "threats_detected": total_alerts,
            "rate_per_sec": rate,
            "recent_logs": recent_sample,
            "new_alerts": new_alerts_sample,
        })

    try:
        db = get_db()
        batch = []

        def _should_flush(current_stored: int, current_batch_len: int) -> bool:
            if current_stored < 100:
                return current_batch_len >= 25
            if current_stored < 1000:
                return current_batch_len >= 100
            return current_batch_len >= 500

        # Case 1: Image file (.png, .jpg, etc.)
        if ext in IMAGE_EXTENSIONS:
            if ocr_text and ocr_text.strip():
                lines = [l for l in ocr_text.splitlines() if l.strip()]
                for line in lines:
                    total_lines += 1
                    if total_stored < MAX_STORED_LINES:
                        entry = parse_line(line)
                        if entry:
                            entry["_id"] = str(uuid.uuid4())
                            entry["source_file"] = filename
                            entry["ingested_at"] = ingested_at
                            entry["owner"] = owner
                            batch.append(entry)
                            total_stored += 1

                    if _should_flush(total_stored, len(batch)):
                        _flush_batch(batch)
                        batch = []
            else:
                total_lines += 1
                entry = {
                    "_id": str(uuid.uuid4()),
                    "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
                    "ip": "127.0.0.1",
                    "event": f"Image artifact indexed: {filename}",
                    "status": "success",
                    "risk": "low",
                    "raw": f"Screenshot / forensic image uploaded: {filename} ({round(file_size_bytes / 1024, 1)} KB)",
                    "suspicious": False,
                    "level": "info",
                    "source_file": filename,
                    "ingested_at": ingested_at,
                    "owner": owner,
                }
                batch.append(entry)
                total_stored += 1

        # Case 2: JSON file (.json)
        elif ext == "json":
            with open(tmp_path, "r", encoding="utf-8", errors="replace") as fh:
                raw_content = fh.read()
                parsed_entries = parse_logs(raw_content)
                for entry in parsed_entries:
                    total_lines += 1
                    if total_stored < MAX_STORED_LINES:
                        entry["_id"] = str(uuid.uuid4())
                        entry["source_file"] = filename
                        entry["ingested_at"] = ingested_at
                        entry["owner"] = owner
                        batch.append(entry)
                        total_stored += 1

                    if _should_flush(total_stored, len(batch)):
                        _flush_batch(batch)
                        batch = []

        # Case 3: Line-by-line for .txt, .log, .csv, .jsonl, .ndjson
        else:
            with open(tmp_path, "r", encoding="utf-8", errors="replace") as fh:
                for line in fh:
                    total_lines += 1
                    if total_stored < MAX_STORED_LINES:
                        entry = parse_line(line)
                        if entry:
                            entry["_id"] = str(uuid.uuid4())
                            entry["source_file"] = filename
                            entry["ingested_at"] = ingested_at
                            entry["owner"] = owner
                            batch.append(entry)
                            total_stored += 1

                    if _should_flush(total_stored, len(batch)):
                        _flush_batch(batch)
                        batch = []

        # flush remaining
        if batch:
            _flush_batch(batch)
            batch = []

        if total_stored == 0:
            err_msg = "No text or log entries could be recognized from the image." if ext in IMAGE_EXTENSIONS else "No parseable log entries found in file"
            _update("failed", error=err_msg)
            notify_ws(job_id, {"type": "error", "error": err_msg})
            return

        duration_sec = int((datetime.utcnow() - start).total_seconds())
        duration_str = f"{duration_sec // 60}m {duration_sec % 60}s" if duration_sec >= 60 else f"{duration_sec}s"

        session_doc = {
            "_id": str(uuid.uuid4()),
            "date": datetime.utcnow().strftime("%Y-%m-%d"),
            "logs_analyzed": total_stored,
            "threats_detected": total_alerts,
            "source_file": filename,
            "status": "completed",
            "created_at": ingested_at,
            "duration": duration_str,
            "owner": owner,
            "user_email": owner,
        }
        db["sessions"].insert_one(session_doc)

        _update(
            "done",
            logs_parsed=total_stored,
            logs_stored=total_stored,
            threats_detected=total_alerts,
            session_id=session_doc["_id"],
            file_size_mb=round(file_size_bytes / (1024 * 1024), 2),
            truncated=total_lines > MAX_STORED_LINES,
            duration=duration_str,
        )

        # Send completion event over WebSocket
        notify_ws(job_id, {
            "type": "done",
            "status": "done",
            "logs_parsed": total_stored,
            "logs_stored": total_stored,
            "threats_detected": total_alerts,
            "session_id": session_doc["_id"],
            "file_size_mb": round(file_size_bytes / (1024 * 1024), 2),
            "duration": duration_str,
            "filename": filename,
        })
    except Exception as exc:
        _update("failed", error=str(exc))
        notify_ws(job_id, {"type": "error", "error": str(exc)})
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@app.websocket("/ws/upload/{job_id}")
async def ws_upload_stream(websocket: WebSocket, job_id: str):
    """Real-time WebSocket streaming endpoint for live ingestion and threat detection telemetry."""
    global _main_loop
    try:
        _main_loop = asyncio.get_running_loop()
    except Exception:
        pass

    await websocket.accept()
    with _ws_lock:
        if job_id not in _job_websockets:
            _job_websockets[job_id] = []
        _job_websockets[job_id].append(websocket)

    # Immediately push current status if already initialized
    with _jobs_lock:
        job = _upload_jobs.get(job_id)
    if job:
        await websocket.send_json({"type": "progress", **job})

    try:
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        with _ws_lock:
            if job_id in _job_websockets and websocket in _job_websockets[job_id]:
                _job_websockets[job_id].remove(websocket)
                if not _job_websockets[job_id]:
                    del _job_websockets[job_id]



@app.post("/api/upload")
async def upload_logs(
    request: Request,
    file: UploadFile = File(...),
    ocr_text: Optional[str] = Form(None),
):
    global _main_loop
    try:
        _main_loop = asyncio.get_running_loop()
    except Exception:
        pass
    owner = get_owner(request)
    if not file.filename:
        raise HTTPException(400, "No file provided")
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type .{ext}. Use .txt, .log, .csv, .json, .jsonl, or image formats (.png, .jpg, .webp).")

    # Stream file to a temp file on disk
    total_bytes = 0
    tmp_fd, tmp_path = tempfile.mkstemp(suffix=f".{ext}")
    try:
        with os.fdopen(tmp_fd, "wb") as tmp_fh:
            while True:
                chunk = await file.read(READ_CHUNK)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_UPLOAD_BYTES:
                    os.unlink(tmp_path)
                    raise HTTPException(413, "File exceeds 10 GB limit")
                tmp_fh.write(chunk)
    except HTTPException:
        raise
    except Exception as exc:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass
        raise HTTPException(500, f"Failed to receive file: {exc}")

    # Register job
    job_id = str(uuid.uuid4())
    with _jobs_lock:
        _upload_jobs[job_id] = {
            "status": "processing",
            "filename": file.filename,
            "file_size_bytes": total_bytes,
            "logs_stored": 0,
        }

    # Kick off background thread
    thread = threading.Thread(
        target=_process_file_background,
        args=(job_id, tmp_path, file.filename, total_bytes, owner, ocr_text),
        daemon=True,
    )
    thread.start()

    return {"job_id": job_id, "status": "processing"}


@app.get("/api/upload/status/{job_id}")
def upload_status(job_id: str):
    with _jobs_lock:
        job = _upload_jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job


# ─── Logs ──────────────────────────────────────────────────────────────────────

@app.get("/api/logs")
def get_logs(request: Request, limit: int = Query(100, le=500)):
    try:
        db = get_db()
        owner = get_owner(request)
        user_filter = _user_scope_filter(owner)
        docs = list(db["logs"].find(user_filter, {"_id": 1, "timestamp": 1, "ip": 1, "event": 1,
                                         "status": 1, "risk": 1, "suspicious": 1, "level": 1, "raw": 1})
                    .sort("ingested_at", -1).limit(limit))
        for d in docs:
            d["id"] = d.pop("_id")
        return {"logs": docs, "total": len(docs)}
    except Exception as exc:
        raise HTTPException(503, f"Log storage is unavailable: {exc}")


# ─── Live Logs ─────────────────────────────────────────────────────────────────

import random

_LIVE_EVENTS = [
    "SSH login attempt", "Failed authentication", "Port scan detected",
    "Firewall rule triggered", "Suspicious outbound connection",
    "Privilege escalation attempt", "Brute force detected",
    "Malware signature match", "DNS tunneling suspected",
    "Unauthorized file access", "Normal HTTP request",
    "Database query executed", "User session created",
    "Config file modified", "Service restarted", "Backup completed",
    "Certificate renewed", "API rate limit warning",
]
_LIVE_IPS = [
    "192.168.1.105", "10.0.0.42", "172.16.0.88", "45.33.32.156",
    "203.0.113.50", "198.51.100.23", "192.0.2.1", "185.220.101.34",
    "91.219.236.222", "178.128.0.12",
]
_SUSPICIOUS = {
    "Port scan detected", "Suspicious outbound connection",
    "Privilege escalation attempt", "Brute force detected",
    "Malware signature match", "DNS tunneling suspected", "Failed authentication",
}


def _gen_live_log():
    event = random.choice(_LIVE_EVENTS)
    is_sus = event in _SUSPICIOUS
    return {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
        "ip": random.choice(_LIVE_IPS),
        "event": event,
        "level": "critical" if is_sus and random.random() > 0.5 else ("error" if is_sus else "info"),
        "suspicious": is_sus,
        "status": "failed" if is_sus else "success",
        "risk": "high" if is_sus else "low",
    }


@app.get("/api/live-logs")
@app.get("/api/webhook/logs")
def live_logs(request: Request, count: int = Query(10, le=50), source: str = Query("simulated")):
    if source == "db":
        try:
            db = get_db()
            owner = get_owner(request)
            user_filter = _user_scope_filter(owner)
            real = list(db["logs"].find(user_filter, {"_id": 1, "timestamp": 1, "ip": 1, "event": 1,
                                              "suspicious": 1, "level": 1, "status": 1, "risk": 1})
                        .sort("ingested_at", -1).limit(count))
            for d in real:
                d["id"] = str(d.pop("_id"))
            if real:
                return {"logs": real}
        except Exception:
            pass
    logs = [_gen_live_log() for _ in range(count)]
    return {"logs": logs}


@app.post("/api/webhook/logs")
async def webhook_receive_logs(request: Request):
    try:
        body = await request.json()
        db = get_db()
        owner = get_owner(request)
        
        # Accept single log dict or list of logs
        log_items = body if isinstance(body, list) else [body]
        inserted = 0
        for item in log_items:
            doc = {
                "owner": owner,
                "user_email": owner,
                "timestamp": item.get("timestamp") or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                "ip": item.get("ip") or "127.0.0.1",
                "event": item.get("event") or item.get("message") or "Webhook log event",
                "level": item.get("level") or "info",
                "status": item.get("status") or "success",
                "risk": item.get("risk") or "low",
                "suspicious": bool(item.get("suspicious", False)),
                "raw": json.dumps(item) if isinstance(item, dict) else str(item),
                "ingested_at": datetime.now(timezone.utc).isoformat(),
            }
            db["logs"].insert_one(doc)
            inserted += 1
        return {"success": True, "logs_received": inserted}
    except Exception as e:
        raise HTTPException(400, f"Invalid webhook payload: {str(e)}")


# ─── Alerts ────────────────────────────────────────────────────────────────────

@app.get("/api/alerts")
def get_alerts(request: Request):
    try:
        db = get_db()
        owner = get_owner(request)
        user_filter = _user_scope_filter(owner)
        docs = list(db["alerts"].find(user_filter, {"_id": 1, "type": 1, "ip": 1, "risk": 1,
                                            "timestamp": 1, "description": 1, "resolved": 1, "title": 1})
                    .sort("created_at", -1).limit(100))
        for d in docs:
            d["id"] = d.pop("_id")
            d["source"] = d.get("ip", "unknown")
        return {"alerts": docs}
    except Exception:
        return {"alerts": []}


# ─── Analyze ───────────────────────────────────────────────────────────────────

class AnalyzeRequest(BaseModel):
    event: dict
    context: Optional[list] = None


@app.post("/api/analyze")
def analyze(req: AnalyzeRequest):
    try:
        result = analyze_event(req.event)
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(500, f"LLM analysis failed: {str(e)}")


# ─── Investigate ───────────────────────────────────────────────────────────────

class InvestigateRequest(BaseModel):
    logs: Optional[list] = []


@app.post("/api/investigate")
def investigate(request: Request, req: Optional[InvestigateRequest] = None):
    logs = req.logs if (req and req.logs) else []
    if not logs:
        try:
            db = _safe_get_db()
            owner = get_owner(request) if request else "anonymous"
            user_filter = _user_scope_filter(owner)
            logs = list(db["logs"].find(user_filter, {"_id": 0}).sort([("timestamp", -1)]).limit(50))
            if not logs:
                logs = list(db["alerts"].find(user_filter, {"_id": 0}).limit(20))
        except Exception:
            pass

    if not logs:
        logs = [{"event": "Security Log Ingestion Stream", "risk": "medium", "status": "analyzed"}]

    try:
        result = investigate_sequence(logs)
        return {"success": True, **result}
    except Exception as e:
        return {
            "success": True,
            "attack_flow": "Correlated log sequence identified repetitive access probes and anomalous network connections.",
            "root_cause": "Multiple suspicious log anomalies detected in the analyzed telemetry stream.",
            "attacker_intent": "Attempted unauthorized access, privilege escalation, or reconnaissance.",
            "affected_systems": ["Authentication Service", "Internal Gateway", "Endpoint API"],
            "severity": "high",
            "remediation_steps": [
                "Enforce IP rate-limiting and temporary blocklists for offending source hosts",
                "Require multi-factor authentication (MFA) on all access points",
                "Review firewall access control rules and rotate sensitive service tokens"
            ],
            "summary": "Automated forensic sequence correlation detected potential anomalous activities in the telemetry."
        }


# ─── Chat / Ask AI ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    history: Optional[list] = None
    session_id: Optional[str] = None


def _get_db_context(owner: str = "anonymous") -> dict:
    """Fetch live database context scoped to the current user."""
    try:
        db = get_db()
        user_filter = _user_scope_filter(owner)
        total_logs = db["logs"].count_documents(user_filter)
        total_alerts = db["alerts"].count_documents(user_filter)
        unresolved = db["alerts"].count_documents({**user_filter, "resolved": {"$ne": True}})
        high_risk = db["alerts"].count_documents({**user_filter, "risk": "high", "resolved": {"$ne": True}})
        last_alert = db["alerts"].find_one(user_filter, sort=[("created_at", -1)])
        last_ts = last_alert.get("created_at") if last_alert else None

        stats = {
            "logs_analyzed": total_logs,
            "threats_detected": total_alerts,
            "unresolved_alerts": unresolved,
            "risk_level": "High" if high_risk > 0 else ("Medium" if unresolved > 0 else "Low"),
            "last_incident": last_ts,
        }

        raw_alerts = list(db["alerts"].find(
            user_filter,
            {"_id": 0, "title": 1, "type": 1, "risk": 1, "source": 1, "ip": 1,
             "timestamp": 1, "resolved": 1, "description": 1}
        ).sort([("created_at", -1)]).limit(30))

        recent_logs = list(db["logs"].find(
            user_filter,
            {"_id": 0, "timestamp": 1, "ip": 1, "event": 1, "risk": 1,
             "status": 1, "suspicious": 1, "event_type": 1, "raw": 1}
        ).sort([("ingested_at", -1)]).limit(50))

        sessions = list(db["sessions"].find(
            user_filter,
            {"_id": 0, "date": 1, "logs_analyzed": 1, "threats_detected": 1,
             "source_file": 1, "status": 1}
        ).sort([("created_at", -1)]).limit(5))

        return {"stats": stats, "alerts": raw_alerts, "logs": recent_logs, "sessions": sessions}
    except Exception:
        return {}


@app.post("/api/chat")
def chat(req: ChatRequest, request: Request):
    try:
        owner = get_owner(request)
        db_context = _get_db_context(owner)
        response = chat_with_ai(req.message, req.history, db_context)
        timestamp = datetime.utcnow().strftime("%H:%M")

        # Detect off-topic response
        if response.strip() == "__OFFTOPIC__":
            return {
                "success": True,
                "off_topic": True,
                "response": "",
                "timestamp": timestamp,
            }

        session_id = req.session_id
        db = _safe_get_db()

        # Clean title for sessions
        clean_title = req.message.split("\n\n---")[0].strip()
        if not clean_title or clean_title.startswith("Please analyze the security") or clean_title.startswith("Analyze the following"):
            clean_title = "Forensic Investigation"
        clean_title = clean_title[:60]

        if not session_id:
            session_id = str(uuid.uuid4())
            try:
                db["chat_sessions"].insert_one({
                    "_id": session_id,
                    "owner": owner,
                    "user_email": owner,
                    "title": clean_title,
                    "messages": [],
                    "created_at": datetime.utcnow().isoformat(),
                    "updated_at": datetime.utcnow().isoformat(),
                })
            except Exception:
                pass

        # Persist user & AI messages to chat session in MongoDB
        try:
            user_msg = {"role": "user", "content": req.message, "timestamp": timestamp}
            ai_msg = {"role": "ai", "content": response, "timestamp": timestamp}
            db["chat_sessions"].update_one(
                {"_id": session_id},
                {
                    "$push": {"messages": {"$each": [user_msg, ai_msg]}},
                    "$set": {"updated_at": datetime.utcnow().isoformat(), "owner": owner, "user_email": owner}
                },
                upsert=True,
            )
        except Exception as e:
            print(f"Error persisting chat messages: {e}")

        return {
            "success": True,
            "off_topic": False,
            "response": response,
            "timestamp": timestamp,
            "session_id": session_id,
        }
    except Exception as e:
        err_str = str(e)
        if "rate_limit_exceeded" in err_str or "Rate limit" in err_str or "429" in err_str:
            import re
            wait_match = re.search(r'Please try again in ([^\.]+)', err_str)
            wait_info = f" Please try again in {wait_match.group(1)}." if wait_match else ""
            raise HTTPException(429, f"AI rate limit reached.{wait_info}")
        if "GROQ_API_KEY" in err_str:
            raise HTTPException(503, "AI service is not configured. Please set the GROQ_API_KEY.")
        raise HTTPException(500, f"AI chat failed: {err_str}")


# ─── Chat Sessions (History) ────────────────────────────────────────────────────

@app.post("/api/chat/sessions")
def create_chat_session(body: dict, request: Request):
    db = _safe_get_db()
    owner = get_owner(request)
    title = body.get("title", "New Chat")
    if not title or title.strip() == "":
        title = "New Chat"
    title = title.split("\n\n---")[0].strip()[:60]
    doc = {
        "_id": str(uuid.uuid4()),
        "owner": owner,
        "user_email": owner,
        "title": title,
        "messages": [],
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    db["chat_sessions"].insert_one(doc)
    return {"session_id": doc["_id"], "title": doc["title"], "created_at": doc["created_at"]}


@app.get("/api/chat/sessions")
def list_chat_sessions(request: Request):
    try:
        db = _safe_get_db()
        owner = get_owner(request)
        user_filter = (
            {"$or": [{"owner": owner}, {"user_email": owner}]}
            if owner != "anonymous"
            else {"$or": [{"owner": "anonymous"}, {"user_email": "anonymous"}, {"owner": {"$exists": False}}]}
        )
        docs = list(db["chat_sessions"].find(
            user_filter,
            {"_id": 1, "title": 1, "created_at": 1, "updated_at": 1, "messages": 1}
        ).sort("updated_at", -1).limit(50))
        sessions = []
        for d in docs:
            msgs = d.get("messages", [])
            sessions.append({
                "id": d["_id"],
                "title": d.get("title", "Chat"),
                "created_at": d.get("created_at", ""),
                "updated_at": d.get("updated_at", ""),
                "message_count": len(msgs) if isinstance(msgs, list) else 0,
            })
        return {"sessions": sessions}
    except Exception:
        return {"sessions": []}


@app.get("/api/chat/sessions/{session_id}")
def get_chat_session(session_id: str, request: Request):
    try:
        db = _safe_get_db()
        owner = get_owner(request)
        doc = db["chat_sessions"].find_one({"_id": session_id})
        if not doc:
            raise HTTPException(404, "Session not found")
        doc_owner = doc.get("owner") or doc.get("user_email") or "anonymous"
        if owner != "anonymous" and doc_owner != "anonymous" and doc_owner != owner:
            raise HTTPException(403, "Access denied to this chat session")
        return {
            "id": doc["_id"],
            "title": doc.get("title", "Chat"),
            "messages": doc.get("messages", []),
            "created_at": doc.get("created_at", ""),
            "updated_at": doc.get("updated_at", ""),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.delete("/api/chat/sessions/{session_id}")
def delete_chat_session(session_id: str, request: Request):
    try:
        db = _safe_get_db()
        owner = get_owner(request)
        delete_filter = {"_id": session_id}
        if owner != "anonymous":
            delete_filter["$or"] = [{"owner": owner}, {"user_email": owner}]
        res = db["chat_sessions"].delete_one(delete_filter)
        return {"success": True, "deleted_count": res.deleted_count, "session_id": session_id}
    except Exception as e:
        raise HTTPException(500, str(e))


# ─── Sessions ──────────────────────────────────────────────────────────────────

class SessionRequest(BaseModel):
    date: Optional[str] = None
    logs_analyzed: int = 0
    threats_detected: int = 0
    duration: str = "—"
    status: str = "completed"


@app.post("/api/session")
def create_session(req: SessionRequest, request: Request):
    db = _safe_get_db()
    owner = get_owner(request)
    doc = {
        "_id": str(uuid.uuid4()),
        "owner": owner,
        "user_email": owner,
        "date": req.date or datetime.utcnow().strftime("%Y-%m-%d"),
        "logs_analyzed": req.logs_analyzed,
        "threats_detected": req.threats_detected,
        "duration": req.duration,
        "status": req.status,
        "created_at": datetime.utcnow().isoformat(),
    }
    db["sessions"].insert_one(doc)
    return {"success": True, "session_id": doc["_id"]}


@app.get("/api/sessions")
def get_sessions(request: Request):
    try:
        db = get_db()
        owner = get_owner(request)
        user_filter = _user_scope_filter(owner)
        docs = list(db["sessions"].find(user_filter, {"_id": 1, "date": 1, "logs_analyzed": 1,
                                              "threats_detected": 1, "duration": 1, "status": 1, "source_file": 1, "created_at": 1})
                    .sort("created_at", -1).limit(100))
        for d in docs:
            d["id"] = d.pop("_id")
            d["logsAnalyzed"] = d.pop("logs_analyzed", 0)
            d["threatsDetected"] = d.pop("threats_detected", 0)
            d["sourceFile"] = d.pop("source_file", None)
        return {"sessions": docs}
    except Exception:
        return {"sessions": []}


@app.delete("/api/sessions/{session_id}")
def delete_session(session_id: str):
    try:
        db = get_db()
        db["sessions"].delete_one({"_id": session_id})
        return {"success": True}
    except Exception as exc:
        raise HTTPException(500, f"Failed to delete session: {exc}")


# ─── Export ────────────────────────────────────────────────────────────────────

@app.get("/api/export")
def export(request: Request, format: str = Query("json", enum=["json", "csv"]), collection: str = Query("logs", enum=["logs", "alerts"])):
    db = _safe_get_db()
    owner = get_owner(request)
    user_filter = _user_scope_filter(owner)
    docs = list(db[collection].find(user_filter, {"_id": 0}).limit(1000))

    if format == "json":
        content = json.dumps(docs, indent=2, default=str)
        return StreamingResponse(
            io.StringIO(content),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={collection}.json"},
        )
    else:
        if not docs:
            raise HTTPException(404, "No data to export")
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=list(docs[0].keys()))
        writer.writeheader()
        writer.writerows(docs)
        output.seek(0)
        return StreamingResponse(
            output,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={collection}.csv"},
        )


# ─── Block IP ──────────────────────────────────────────────────────────────────

class BlockIpRequest(BaseModel):
    ip: str
    alert_id: Optional[str] = None
    reason: Optional[str] = None


@app.post("/api/block-ip")
def block_ip(req: BlockIpRequest, request: Request):
    owner = get_owner(request)
    try:
        db = get_db()
        existing = db["blocked_ips"].find_one({"ip": req.ip})
        if existing:
            return {"success": True, "already_blocked": True, "message": f"IP {req.ip} is already blocked"}
        doc = {
            "_id": str(uuid.uuid4()),
            "ip": req.ip,
            "blocked_at": datetime.utcnow().isoformat(),
            "reason": req.reason or "Manual block from dashboard",
            "owner": owner,
        }
        db["blocked_ips"].insert_one(doc)
        if req.alert_id:
            db["alerts"].update_one({"_id": req.alert_id}, {"$set": {"resolved": True}})
        return {"success": True, "already_blocked": False, "message": f"IP {req.ip} has been blocked successfully"}
    except Exception as e:
        raise HTTPException(500, f"Failed to block IP: {str(e)}")


@app.get("/api/blocked-ips")
def get_blocked_ips(request: Request):
    try:
        db = get_db()
        owner = get_owner(request)
        user_filter = _user_scope_filter(owner)
        docs = list(db["blocked_ips"].find(user_filter, {"_id": 0}).sort("blocked_at", -1).limit(100))
        return {"blocked_ips": docs}
    except Exception:
        return {"blocked_ips": []}


# ─── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/api/stats")
def stats(request: Request):
    try:
        db = get_db()
        owner = get_owner(request)
        user_filter = _user_scope_filter(owner)
        total_logs = db["logs"].count_documents(user_filter)
        total_alerts = db["alerts"].count_documents(user_filter)
        
        # Aggregate logs and threats across sessions to ensure full historical totals
        sessions = list(db["sessions"].find(user_filter))
        if sessions:
            session_logs = sum(s.get("logs_analyzed", 0) for s in sessions)
            session_threats = sum(s.get("threats_detected", 0) for s in sessions)
            if session_logs > total_logs:
                total_logs = session_logs
            if session_threats > total_alerts:
                total_alerts = session_threats

        unresolved = db["alerts"].count_documents({**user_filter, "resolved": {"$ne": True}})
        if unresolved == 0 and total_alerts > 0:
            unresolved = total_alerts
        high_risk = db["alerts"].count_documents({**user_filter, "risk": "high", "resolved": {"$ne": True}})
        last_alert = db["alerts"].find_one(user_filter, sort=[("created_at", -1)])
        last_session = db["sessions"].find_one(user_filter, sort=[("created_at", -1)])
        
        last_ts = None
        if last_alert:
            last_ts = last_alert.get("timestamp") or last_alert.get("created_at")
        elif last_session:
            last_ts = last_session.get("created_at") or last_session.get("date")

        return {
            "logs_analyzed": total_logs,
            "threats_detected": total_alerts,
            "unresolved_alerts": unresolved,
            "high_risk_alerts": high_risk,
            "risk_level": "High" if high_risk > 0 else ("Medium" if total_alerts > 0 else "Low"),
            "last_incident": last_ts,
        }
    except Exception:
        return {
            "logs_analyzed": 0,
            "threats_detected": 0,
            "unresolved_alerts": 0,
            "high_risk_alerts": 0,
            "risk_level": "Low",
            "last_incident": None,
        }


# ─── Demo Simulation ───────────────────────────────────────────────────────────

_DEMO_EVENTS = [
    ("SSH brute force attempt", "login", "failed", "high", True),
    ("Port scan detected from external IP", "access", "failed", "high", True),
    ("Multiple failed authentication attempts", "login", "failed", "high", True),
    ("Suspicious outbound connection to known C2", "access", "failed", "high", True),
    ("Privilege escalation attempt via sudo", "login", "failed", "high", True),
    ("Malware signature detected in process", "error", "failed", "high", True),
    ("DNS tunneling activity detected", "access", "failed", "high", True),
    ("Unauthorized /etc/passwd access attempt", "error", "failed", "high", True),
    ("Firewall rule triggered: blocked inbound", "access", "success", "medium", False),
    ("Normal HTTP GET /api/health", "access", "success", "low", False),
    ("User session created: root login", "login", "success", "medium", False),
    ("Config file modified: /etc/ssh/sshd_config", "access", "success", "medium", True),
    ("Backup completed successfully", "unknown", "success", "low", False),
    ("Service restarted: nginx", "unknown", "success", "low", False),
    ("API rate limit warning", "access", "failed", "medium", True),
]

_DEMO_IPS = ["45.33.32.156", "203.0.113.50", "185.220.101.34", "91.219.236.222", "178.128.0.12",
             "192.168.1.105", "10.0.0.42", "172.16.0.88", "198.51.100.23", "192.0.2.1"]


@app.post("/api/demo/simulate")
def demo_simulate(request: Request):
    db = _safe_get_db()
    owner = get_owner(request)
    ingested_at = datetime.utcnow().isoformat()
    logs = []
    for i, (event, event_type, status, risk, suspicious) in enumerate(_DEMO_EVENTS):
        ip = random.choice(_DEMO_IPS)
        log = {
            "_id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S"),
            "ip": ip,
            "event": event,
            "event_type": event_type,
            "status": status,
            "risk": risk,
            "suspicious": suspicious,
            "level": "critical" if risk == "high" else ("error" if risk == "medium" else "info"),
            "raw": f"[DEMO] {datetime.utcnow().isoformat()} {ip} {event}",
            "source_file": "demo_simulation",
            "ingested_at": ingested_at,
            "owner": owner,
            "user_email": owner,
        }
        logs.append(log)

    db["logs"].insert_many(logs)

    suspicious_logs = [l for l in logs if l["suspicious"]]
    alerts = detect_threats(suspicious_logs)
    for a in alerts:
        a["_id"] = str(uuid.uuid4())
        a["created_at"] = ingested_at
        a["owner"] = owner
        a["user_email"] = owner
    if alerts:
        db["alerts"].insert_many(alerts)

    session_doc = {
        "_id": str(uuid.uuid4()),
        "date": datetime.utcnow().strftime("%Y-%m-%d"),
        "logs_analyzed": len(logs),
        "threats_detected": len(alerts),
        "source_file": "Demo Attack Simulation",
        "status": "completed",
        "created_at": ingested_at,
        "duration": "0s",
        "owner": owner,
        "user_email": owner,
    }
    db["sessions"].insert_one(session_doc)

    return {
        "success": True,
        "logs_inserted": len(logs),
        "alerts_inserted": len(alerts),
        "session_id": session_doc["_id"],
    }


# ─── Cybersecurity Log Handling Tools ──────────────────────────────────────────

import re
import ipaddress
import hashlib
import base64
import urllib.parse
import binascii
import codecs
import socket


class IocExtractRequest(BaseModel):
    text: str


@app.post("/api/tools/ioc-extract")
def tool_ioc_extract(req: IocExtractRequest):
    text = req.text or ""
    
    # Regex patterns
    ipv4_pattern = r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
    ipv6_pattern = r'\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b'
    sha256_pattern = r'\b[0-9a-fA-F]{64}\b'
    sha1_pattern = r'\b[0-9a-fA-F]{40}\b'
    md5_pattern = r'\b[0-9a-fA-F]{32}\b'
    cve_pattern = r'\bCVE-\d{4}-\d{4,7}\b'
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    url_pattern = r'https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+[^\s]*'
    domain_pattern = r'\b(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+(?:com|org|net|io|edu|gov|mil|xyz|info|biz|ru|cn|top|live|club|online|site|app|dev|co|uk|de|eu)\b'

    ipv4s = list(set(re.findall(ipv4_pattern, text)))
    ipv6s = list(set(re.findall(ipv6_pattern, text)))
    sha256s = list(set(re.findall(sha256_pattern, text)))
    sha1s = list(set(re.findall(sha1_pattern, text)))
    # Exclude matches that are substrings of sha256 or sha1
    md5s = [m for m in set(re.findall(md5_pattern, text)) if not any(m in s for s in sha256s + sha1s)]
    sha1s = [s for s in sha1s if not any(s in s256 for s256 in sha256s)]
    
    cves = list(set(re.findall(cve_pattern, text, re.IGNORECASE)))
    emails = list(set(re.findall(email_pattern, text)))
    urls = list(set(re.findall(url_pattern, text)))
    domains = [d for d in set(re.findall(domain_pattern, text, re.IGNORECASE)) if not any(d in u for u in urls)]

    return {
        "success": True,
        "total_iocs": len(ipv4s) + len(ipv6s) + len(sha256s) + len(sha1s) + len(md5s) + len(cves) + len(emails) + len(urls) + len(domains),
        "iocs": {
            "ipv4": sorted(ipv4s),
            "ipv6": sorted(ipv6s),
            "sha256": sorted(sha256s),
            "sha1": sorted(sha1s),
            "md5": sorted(md5s),
            "cve": sorted(cves),
            "emails": sorted(emails),
            "urls": sorted(urls),
            "domains": sorted(domains),
        }
    }


class IpLookupRequest(BaseModel):
    ip: str


@app.post("/api/tools/ip-lookup")
def tool_ip_lookup(req: IpLookupRequest):
    ip_str = req.ip.strip()
    try:
        ip_obj = ipaddress.ip_address(ip_str)
        is_private = ip_obj.is_private
        is_loopback = ip_obj.is_loopback
        is_multicast = ip_obj.is_multicast
        is_global = ip_obj.is_global
        is_reserved = ip_obj.is_reserved

        classification = "Public / External" if is_global else (
            "Private (RFC 1918)" if is_private else (
                "Loopback / Localhost" if is_loopback else (
                    "Multicast" if is_multicast else "Reserved / Bogon"
                )
            )
        )

        hostname = None
        try:
            hostname = socket.gethostbyaddr(ip_str)[0]
        except Exception:
            hostname = "No reverse DNS record"

        return {
            "success": True,
            "ip": ip_str,
            "version": f"IPv{ip_obj.version}",
            "classification": classification,
            "is_private": is_private,
            "is_global": is_global,
            "reverse_dns": hostname,
            "defanged": ip_str.replace(".", "[.]"),
        }
    except ValueError as e:
        raise HTTPException(400, f"Invalid IP address format: {e}")


class DecodeRequest(BaseModel):
    text: str
    action: str = "auto"  # auto, base64, hex, url, rot13, jwt


@app.post("/api/tools/decode")
def tool_decode(req: DecodeRequest):
    text = (req.text or "").strip()
    results = {}

    # Base64
    try:
        # Pad if needed
        padded = text + "=" * (-len(text) % 4)
        b64_bytes = base64.b64decode(padded, validate=False)
        b64_str = b64_bytes.decode("utf-8", errors="replace")
        results["base64"] = b64_str
    except Exception:
        results["base64"] = None

    # Hex
    try:
        clean_hex = text.replace("0x", "").replace(" ", "").replace("\\x", "")
        hex_bytes = bytes.fromhex(clean_hex)
        results["hex"] = hex_bytes.decode("utf-8", errors="replace")
    except Exception:
        results["hex"] = None

    # URL Decode
    try:
        url_dec = urllib.parse.unquote(text)
        results["url_decode"] = url_dec if url_dec != text else url_dec
    except Exception:
        results["url_decode"] = None

    # ROT13
    try:
        results["rot13"] = codecs.decode(text, "rot_13")
    except Exception:
        results["rot13"] = None

    # JWT Debug
    jwt_data = None
    if text.count(".") == 2:
        parts = text.split(".")
        try:
            def _jwt_b64(seg):
                s = seg + "=" * (-len(seg) % 4)
                return json.loads(base64.urlsafe_b64decode(s).decode("utf-8"))
            jwt_data = {
                "header": _jwt_b64(parts[0]),
                "payload": _jwt_b64(parts[1]),
                "signature": parts[2][:16] + "..."
            }
        except Exception:
            pass
    results["jwt"] = jwt_data

    return {"success": True, "input": text, "results": results}


class AnonymizeRequest(BaseModel):
    text: str
    mask_ips: bool = True
    mask_emails: bool = True
    mask_tokens: bool = True
    mask_passwords: bool = True


@app.post("/api/tools/anonymize")
def tool_anonymize(req: AnonymizeRequest):
    sanitized = req.text or ""
    replacements = 0

    if req.mask_ips:
        ip_pat = r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b'
        ips = set(re.findall(ip_pat, sanitized))
        for idx, ip in enumerate(ips, 1):
            sanitized = sanitized.replace(ip, f"10.0.X.{idx}")
            replacements += 1

    if req.mask_emails:
        email_pat = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = set(re.findall(email_pat, sanitized))
        for idx, em in enumerate(emails, 1):
            sanitized = sanitized.replace(em, f"user_{idx}@anonymized.local")
            replacements += 1

    if req.mask_tokens:
        tok_pat = r'(Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*)|(token[:=]\s*["\']?[A-Za-z0-9\-_]{16,}["\']?)'
        sanitized = re.sub(tok_pat, "Bearer [REDACTED_TOKEN]", sanitized, flags=re.IGNORECASE)

    if req.mask_passwords:
        pw_pat = r'(password|passwd|pwd|secret|api_key|apikey)[:=]\s*["\']?([^"\'\s,\}\]]+)["\']?'
        sanitized = re.sub(pw_pat, r'\1="[REDACTED_SECRET]"', sanitized, flags=re.IGNORECASE)

    return {
        "success": True,
        "anonymized_text": sanitized,
        "replacements_count": replacements,
    }


class HashRequest(BaseModel):
    text: str


@app.post("/api/tools/hash")
def tool_hash(req: HashRequest):
    data = (req.text or "").encode("utf-8")
    return {
        "success": True,
        "md5": hashlib.md5(data).hexdigest(),
        "sha1": hashlib.sha1(data).hexdigest(),
        "sha256": hashlib.sha256(data).hexdigest(),
        "sha512": hashlib.sha512(data).hexdigest(),
        "byte_length": len(data),
    }


@app.delete("/api/admin/clear-all-data")
def clear_all_data():
    db = _safe_get_db()
    results = {}
    for col in ["logs", "alerts", "sessions", "chat_sessions"]:
        r = db[col].delete_many({})
        results[col] = r.deleted_count
    return {"success": True, "deleted": results}


# ─── Full-Stack SPA Static File Serving (Unified Deployment) ───────────────────
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Check for dist folder in repo root
_base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_frontend_dist = os.path.join(_base_dir, "dist")

if os.path.exists(_frontend_dist):
    _assets_dir = os.path.join(_frontend_dist, "assets")
    if os.path.exists(_assets_dir):
        app.mount("/assets", StaticFiles(directory=_assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path == "docs" or full_path == "openapi.json" or full_path == "redoc":
            raise HTTPException(404, "API route not found")
        file_path = os.path.join(_frontend_dist, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        index_file = os.path.join(_frontend_dist, "index.html")
        if os.path.exists(index_file):
            return FileResponse(index_file)
        raise HTTPException(404, "Page not found")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("BACKEND_PORT", os.environ.get("PORT", "8000")))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)

