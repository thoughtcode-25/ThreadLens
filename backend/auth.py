import os
import random
import string
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env in backend directory or parent directories
load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

import bcrypt as _bcrypt
from jose import JWTError, jwt

JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days


def get_jwt_secret() -> str:
    return os.environ.get("JWT_SECRET") or os.environ.get("SESSION_SECRET") or "dev-insecure-jwt-secret-key-12345"


def get_smtp_credentials():
    email = os.environ.get("SMTP_EMAIL", "").strip()
    password = os.environ.get("SMTP_PASSWORD", "").replace(" ", "").strip()
    host = os.environ.get("SMTP_HOST", "smtp.gmail.com").strip()
    port_val = os.environ.get("SMTP_PORT", "").strip()
    port = int(port_val) if port_val.isdigit() else (465 if "gmail" in host.lower() else 587)
    use_ssl = os.environ.get("SMTP_USE_SSL", "true" if port == 465 else "false").lower() in ("true", "1", "yes")
    return email, password, host, port, use_ssl


def hash_password(password: str) -> str:
    return _bcrypt.hashpw(password.encode("utf-8"), _bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    return _bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=JWT_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
    except Exception:
        return None



def generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


def send_verification_email(to_email: str, otp: str, name: str = "") -> bool:
    smtp_email, smtp_password, smtp_host, smtp_port, use_ssl = get_smtp_credentials()
    if not smtp_email or not smtp_password:
        print("[AUTH] SMTP not configured — OTP:", otp)
        return False

    subject = "Thread Lens — Your Verification Code"
    display_name = name or to_email.split("@")[0]

    html = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background: #080a14; color: #e2e8f0; padding: 40px; max-width: 520px; margin: auto; border-radius: 16px; border: 1px solid #1e2942;">
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="display: inline-block; background: rgba(124,58,237,0.15); border-radius: 12px; padding: 16px 20px; margin-bottom: 16px;">
          <span style="font-size: 28px;">🔐</span>
        </div>
        <h1 style="color: #c4b5fd; font-size: 22px; margin: 0;">Thread Lens</h1>
        <p style="color: #64748b; font-size: 14px; margin-top: 6px;">Security Dashboard</p>
      </div>
      <p style="color: #94a3b8; font-size: 15px; margin-bottom: 8px;">Hi <strong style="color: #e2e8f0;">{display_name}</strong>,</p>
      <p style="color: #94a3b8; font-size: 15px; margin-bottom: 24px;">Use the code below to verify your email address. It expires in <strong>10 minutes</strong>.</p>
      <div style="background: rgba(124,58,237,0.1); border: 2px solid rgba(124,58,237,0.4); border-radius: 12px; text-align: center; padding: 24px; margin-bottom: 24px;">
        <p style="color: #7c3aed; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin: 0 0 8px;">Verification Code</p>
        <p style="color: #c4b5fd; font-size: 42px; font-weight: 700; letter-spacing: 10px; margin: 0; font-family: monospace;">{otp}</p>
      </div>
      <p style="color: #475569; font-size: 13px; text-align: center;">If you didn't request this, you can safely ignore this email.</p>
    </div>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"Thread Lens <{smtp_email}>"
        msg["To"] = to_email
        msg.attach(MIMEText(html, "html"))

        if use_ssl:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=10) as server:
                server.login(smtp_email, smtp_password)
                server.sendmail(smtp_email, to_email, msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.starttls()
                server.login(smtp_email, smtp_password)
                server.sendmail(smtp_email, to_email, msg.as_string())
        print(f"[AUTH] Verification email successfully sent to {to_email}")
        return True
    except Exception as e:
        print(f"[AUTH] Email send failed via {smtp_host}:{smtp_port}: {e}")
        return False

