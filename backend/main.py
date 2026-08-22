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

from fastapi import FastAPI, UploadFile, File, Query, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel



def get_owner(request: Request) -> str:
    """Extract the user's email from the X-User-Email header to scope DB queries."""
    email = request.headers.get("X-User-Email", "").strip().lower()
    return email if email else "anonymous"

from database import get_db, ping_db
from parser import parse_logs, parse_line
from detector import detect_threats
from llm import analyze_event, investigate_sequence, chat_with_ai, ai_configured
from auth import (
    hash_password, verify_password, create_access_token,
    decode_token, generate_otp, send_verification_email
)
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError, ConnectionFailure

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

        "otp": otp,
        "otp_expires": otp_expires,
        "created_at": datetime.utcnow().isoformat(),
    }

    if existing and not existing.get("verified"):
        db["users"].update_one(
            {"email": email},
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

@app.post("/api/auth/verify-email")
def verify_email(req: VerifyEmailRequest):
    email = req.email.strip().lower()
    db = _safe_get_db()
    user = db["users"].find_one({"email": email})
    if not user:
        raise HTTPException(404, "No account found for this email")
    if user.get("verified"):
        raise HTTPException(400, "Email is already verified")



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
        raise HTTPException(400, "New password must be at least 8 characters")
    return {"success": True, "message": "Password updated successfully"}


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

# In-memory job tracker: job_id -> status dict
_upload_jobs: dict = {}
_jobs_lock = threading.Lock()


def _process_file_background(job_id: str, tmp_path: str, filename: str, file_size_bytes: int, owner: str = "anonymous"):
    """Runs in a background thread: parse + store the temp file, update job status."""
    ingested_at = datetime.utcnow().isoformat()
    start = datetime.utcnow()
    total_lines = 0
    total_stored = 0
    total_alerts = 0

    def _update(status, **kwargs):
        with _jobs_lock:
            _upload_jobs[job_id].update({"status": status, **kwargs})

    try:
        db = get_db()
        batch = []

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

                if len(batch) >= BATCH_SIZE:
                    db["logs"].insert_many(batch)
                    alerts = detect_threats(batch)
                    for a in alerts:
                        a["_id"] = str(uuid.uuid4())
                        a["created_at"] = ingested_at
                        a["owner"] = owner
                    if alerts:
                        db["alerts"].insert_many(alerts)
                        total_alerts += len(alerts)
                    batch = []
                    _update("processing", logs_stored=total_stored)

        # flush remaining
        if batch:
            db["logs"].insert_many(batch)
            alerts = detect_threats(batch)
            for a in alerts:
                a["_id"] = str(uuid.uuid4())
                a["created_at"] = ingested_at
                a["owner"] = owner
            if alerts:
                db["alerts"].insert_many(alerts)
                total_alerts += len(alerts)

        if total_stored == 0:
            _update("failed", error="No parseable log entries found in file")
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
        }
        db["sessions"].insert_one(session_doc)

        _update(
            "done",
            logs_parsed=total_stored,
            threats_detected=total_alerts,
            session_id=session_doc["_id"],
            file_size_mb=round(file_size_bytes / (1024 * 1024), 2),
            truncated=total_lines > MAX_STORED_LINES,
            logs_stored=total_stored,
        )
    except Exception as exc:
        _update("failed", error=str(exc))
    finally:
        try:
            os.unlink(tmp_path)
        except Exception:
            pass


@app.post("/api/upload")
async def upload_logs(request: Request, file: UploadFile = File(...)):
    owner = get_owner(request)
    if not file.filename:
        raise HTTPException(400, "No file provided")
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("txt", "log", "csv"):
        raise HTTPException(400, "Unsupported file type. Use .txt, .log, or .csv")

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
        args=(job_id, tmp_path, file.filename, total_bytes, owner),
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
def get_logs(limit: int = Query(100, le=500)):
    try:
        db = get_db()
        docs = list(db["logs"].find({}, {"_id": 1, "timestamp": 1, "ip": 1, "event": 1,
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
def live_logs(count: int = Query(10, le=50)):
    logs = [_gen_live_log() for _ in range(count)]
    # Also try to fetch real recent logs from DB if available
    try:
        db = get_db()
        real = list(db["logs"].find({}, {"_id": 1, "timestamp": 1, "ip": 1, "event": 1,
                                          "suspicious": 1, "level": 1, "status": 1, "risk": 1})
                    .sort("ingested_at", -1).limit(count))
        for d in real:
            d["id"] = d.pop("_id")
        if real:
            return {"logs": real}
    except Exception:
        pass
    return {"logs": logs}


# ─── Alerts ────────────────────────────────────────────────────────────────────

@app.get("/api/alerts")
def get_alerts():
    try:
        db = get_db()
        docs = list(db["alerts"].find({}, {"_id": 1, "type": 1, "ip": 1, "risk": 1,
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
    logs: list


@app.post("/api/investigate")
def investigate(req: InvestigateRequest):
    if not req.logs:
        raise HTTPException(400, "No logs provided")
    try:
        result = investigate_sequence(req.logs)
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(500, f"Investigation failed: {str(e)}")


# ─── Chat / Ask AI ─────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    history: Optional[list] = None
    session_id: Optional[str] = None


def _get_db_context() -> dict:
    """Fetch live database context to inject into the AI system prompt."""
    try:
        db = get_db()
        # Stats
        total_logs = db["logs"].count_documents({})
        total_alerts = db["alerts"].count_documents({})
        unresolved = db["alerts"].count_documents({"resolved": {"$ne": True}})
        high_risk = db["alerts"].count_documents({"risk": "high", "resolved": {"$ne": True}})
        last_alert = db["alerts"].find_one(sort=[("created_at", -1)])
        last_ts = last_alert.get("created_at") if last_alert else None

        stats = {
            "logs_analyzed": total_logs,
            "threats_detected": total_alerts,
            "unresolved_alerts": unresolved,
            "risk_level": "High" if high_risk > 0 else ("Medium" if unresolved > 0 else "Low"),
            "last_incident": last_ts,
        }

        # Recent alerts (sorted by risk)
        raw_alerts = list(db["alerts"].find(
            {},
            {"_id": 0, "title": 1, "type": 1, "risk": 1, "source": 1, "ip": 1,
             "timestamp": 1, "resolved": 1, "description": 1}
        ).sort([("created_at", -1)]).limit(30))

        # Recent logs — suspicious first
        recent_logs = list(db["logs"].find(
            {},
            {"_id": 0, "timestamp": 1, "ip": 1, "event": 1, "risk": 1,
             "status": 1, "suspicious": 1, "event_type": 1, "raw": 1}
        ).sort([("ingested_at", -1)]).limit(50))

        # Recent sessions
        sessions = list(db["sessions"].find(
            {},
            {"_id": 0, "date": 1, "logs_analyzed": 1, "threats_detected": 1,
             "source_file": 1, "status": 1}
        ).sort([("created_at", -1)]).limit(5))

        return {"stats": stats, "alerts": raw_alerts, "logs": recent_logs, "sessions": sessions}
    except Exception:
        return {}


@app.post("/api/chat")
def chat(req: ChatRequest):
    try:
        db_context = _get_db_context()
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

        # Persist to chat session if session_id provided
        if req.session_id:
            try:
                db = get_db()
                user_msg = {"role": "user", "content": req.message, "timestamp": timestamp}
                ai_msg = {"role": "ai", "content": response, "timestamp": timestamp}
                db["chat_sessions"].update_one(
                    {"_id": req.session_id},
                    {"$push": {"messages": {"$each": [user_msg, ai_msg]}},
                     "$set": {"updated_at": datetime.utcnow().isoformat()}},
                )
            except Exception:
                pass

        return {
            "success": True,
            "off_topic": False,
            "response": response,
            "timestamp": timestamp,
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
def create_chat_session(body: dict):
    db = _safe_get_db()
    title = body.get("title", "New Chat")[:80]
    doc = {
        "_id": str(uuid.uuid4()),
        "title": title,
        "messages": [],
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
    }
    db["chat_sessions"].insert_one(doc)
    return {"session_id": doc["_id"], "title": doc["title"], "created_at": doc["created_at"]}


@app.get("/api/chat/sessions")
def list_chat_sessions():
    try:
        db = get_db()
        docs = list(db["chat_sessions"].find(
            {},
            {"_id": 1, "title": 1, "created_at": 1, "updated_at": 1, "messages": {"$slice": -1}}
        ).sort("updated_at", -1).limit(50))
        sessions = []
        for d in docs:
            sessions.append({
                "id": d["_id"],
                "title": d.get("title", "Chat"),
                "created_at": d.get("created_at", ""),
                "updated_at": d.get("updated_at", ""),
                "message_count": 0,
            })
        return {"sessions": sessions}
    except Exception:
        return {"sessions": []}


@app.get("/api/chat/sessions/{session_id}")
def get_chat_session(session_id: str):
    try:
        db = get_db()
        doc = db["chat_sessions"].find_one({"_id": session_id})
        if not doc:
            raise HTTPException(404, "Session not found")
        return {
            "id": doc["_id"],
            "title": doc.get("title", "Chat"),
            "messages": doc.get("messages", []),
            "created_at": doc.get("created_at", ""),
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, str(e))


@app.delete("/api/chat/sessions/{session_id}")
def delete_chat_session(session_id: str):
    try:
        db = get_db()
        db["chat_sessions"].delete_one({"_id": session_id})
        return {"success": True}
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
def create_session(req: SessionRequest):
    db = _safe_get_db()
    doc = {
        "_id": str(uuid.uuid4()),
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
def get_sessions():
    try:
        db = get_db()
        docs = list(db["sessions"].find({}, {"_id": 1, "date": 1, "logs_analyzed": 1,
                                              "threats_detected": 1, "duration": 1, "status": 1})
                    .sort("created_at", -1).limit(50))
        for d in docs:
            d["id"] = d.pop("_id")
            d["logsAnalyzed"] = d.pop("logs_analyzed", 0)
            d["threatsDetected"] = d.pop("threats_detected", 0)
        return {"sessions": docs}
    except Exception:
        return {"sessions": []}


# ─── Export ────────────────────────────────────────────────────────────────────

@app.get("/api/export")
def export(format: str = Query("json", enum=["json", "csv"]), collection: str = Query("logs", enum=["logs", "alerts"])):
    db = _safe_get_db()
    docs = list(db[collection].find({}, {"_id": 0}).limit(1000))


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
def get_blocked_ips():
    try:
        db = get_db()
        docs = list(db["blocked_ips"].find({}, {"_id": 0}).sort("blocked_at", -1).limit(100))
        return {"blocked_ips": docs}
    except Exception:
        return {"blocked_ips": []}


# ─── Stats ─────────────────────────────────────────────────────────────────────

@app.get("/api/stats")
def stats():
    try:
        db = get_db()
        total_logs = db["logs"].count_documents({})
        total_alerts = db["alerts"].count_documents({})
        unresolved = db["alerts"].count_documents({"resolved": {"$ne": True}})
        high_risk = db["alerts"].count_documents({"risk": "high", "resolved": {"$ne": True}})
        last_alert = db["alerts"].find_one({}, sort=[("created_at", -1)])
        last_ts = last_alert.get("timestamp") if last_alert else None
        return {
            "logs_analyzed": total_logs,
            "threats_detected": total_alerts,
            "unresolved_alerts": unresolved,
            "high_risk_alerts": high_risk,
            "risk_level": "High" if high_risk > 0 else ("Medium" if unresolved > 0 else "Low"),
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
def demo_simulate():
    db = _safe_get_db()
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
        }
        logs.append(log)

    db["logs"].insert_many(logs)

    suspicious_logs = [l for l in logs if l["suspicious"]]
    alerts = detect_threats(suspicious_logs)
    for a in alerts:
        a["_id"] = str(uuid.uuid4())
        a["created_at"] = ingested_at
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
    }
    db["sessions"].insert_one(session_doc)

    return {
        "success": True,
        "logs_inserted": len(logs),
        "alerts_inserted": len(alerts),
        "session_id": session_doc["_id"],
    }


@app.delete("/api/admin/clear-all-data")
def clear_all_data():
    db = _safe_get_db()
    results = {}
    for col in ["logs", "alerts", "sessions", "chat_sessions"]:
        r = db[col].delete_many({})
        results[col] = r.deleted_count
    return {"success": True, "deleted": results}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("BACKEND_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)

