import re
import json
from datetime import datetime
from typing import Optional, Any

IP_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")
TS_PATTERNS = [
    re.compile(r"\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}"),
    re.compile(r"\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}"),
    re.compile(r"\d{2}/\w{3}/\d{4}:\d{2}:\d{2}:\d{2}"),
    re.compile(r"\d{2}/\d{2}/\d{4}\s+\d{2}:\d{2}:\d{2}"),
]

LOGIN_RE = re.compile(r"(login|ssh|auth|sshd|logon)", re.I)
ACCESS_RE = re.compile(r"(access|GET|POST|PUT|DELETE|request|http)", re.I)
ERROR_RE = re.compile(r"(error|fail|denied|reject|invalid|bad|wrong|timeout)", re.I)
FAILED_RE = re.compile(r"(fail|denied|reject|invalid|error|wrong|bad password|unauthorized|blocked)", re.I)
SUCCESS_RE = re.compile(r"(success|accept|ok|opened|granted|logged in|authenticated|allowed)", re.I)
SUSPICIOUS_KEYWORDS = [
    "brute force", "port scan", "malware", "exploit", "injection", "dns tunnel",
    "privilege escalation", "suspicious", "unauthorized", "backdoor", "rootkit",
    "ransomware", "reverse shell", "c2 beacon", "xss", "directory traversal",
    "syn flood", "trojan", "stealer",
]
ADMIN_RE = re.compile(r"(/admin|/root|/etc/passwd|/etc/shadow|\.env|id_rsa|\.htaccess)", re.I)


def extract_ip(line: str) -> Optional[str]:
    m = IP_RE.search(line)
    return m.group() if m else None


def extract_timestamp(line: str) -> str:
    for pat in TS_PATTERNS:
        m = pat.search(line)
        if m:
            return m.group()
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")


def extract_event_type(line: str) -> str:
    if LOGIN_RE.search(line):
        return "login"
    if ACCESS_RE.search(line):
        return "access"
    if ERROR_RE.search(line):
        return "error"
    return "unknown"


def extract_status(line: str) -> str:
    if FAILED_RE.search(line):
        return "failed"
    if SUCCESS_RE.search(line):
        return "success"
    return "unknown"


def assess_initial_risk(line: str, status: str, event: str) -> str:
    lower = line.lower()
    if any(kw in lower for kw in SUSPICIOUS_KEYWORDS):
        return "high"
    if ADMIN_RE.search(line):
        return "high"
    if status == "failed" and (event == "login" or "auth" in event.lower()):
        return "medium"
    if status == "failed":
        return "medium"
    return "low"


def parse_json_entry(obj: dict) -> Optional[dict]:
    """Parse a structured JSON object (CloudTrail, Azure, Splunk, Zeek, or generic log)."""
    if not isinstance(obj, dict):
        return None

    raw_text = json.dumps(obj)

    # 1. IP Extraction
    ip = None
    for ip_key in (
        "ip", "src_ip", "source_ip", "src", "sourceIPAddress", "client_ip", "clientIp",
        "host", "remote_addr", "c_ip", "dest_ip", "destination_ip", "dst_ip", "ip_address"
    ):
        val = obj.get(ip_key)
        if val and isinstance(val, str) and IP_RE.search(val):
            ip = IP_RE.search(val).group()
            break

    if not ip:
        m = IP_RE.search(raw_text)
        ip = m.group() if m else "unknown"

    # 2. Timestamp Extraction
    ts = None
    for ts_key in ("timestamp", "@timestamp", "time", "eventTime", "datetime", "date", "created_at", "inserted_at", "ts"):
        val = obj.get(ts_key)
        if val and isinstance(val, str):
            for pat in TS_PATTERNS:
                m = pat.search(val)
                if m:
                    ts = m.group()
                    break
            if ts:
                break
            if len(val) >= 10:
                ts = val[:19].replace("T", " ")
                break

    if not ts:
        ts = extract_timestamp(raw_text)

    # 3. Event Extraction
    event = None
    for ev_key in ("event", "eventName", "message", "msg", "action", "description", "title", "summary", "activity", "log", "reason"):
        val = obj.get(ev_key)
        if val and isinstance(val, str) and val.strip():
            event = val.strip()
            break

    if not event:
        ev_type = extract_event_type(raw_text)
        event = f"Structured Log Event ({ev_type})" if ev_type != "unknown" else "System activity recorded"

    # 4. Status Extraction
    status = "unknown"
    for st_key in ("status", "responseCode", "result", "outcome", "success", "statusCode"):
        val = obj.get(st_key)
        if val is not None:
            if isinstance(val, bool):
                status = "success" if val else "failed"
                break
            s_val = str(val).lower()
            if any(w in s_val for w in ("success", "ok", "200", "allow", "pass", "granted", "opened")):
                status = "success"
                break
            elif any(w in s_val for w in ("fail", "error", "deny", "block", "reject", "401", "403", "500", "unauthorized")):
                status = "failed"
                break

    if status == "unknown":
        status = extract_status(raw_text)

    # 5. Level & Risk
    level = "info"
    for lvl_key in ("level", "severity", "log_level", "priority"):
        val = obj.get(lvl_key)
        if val and isinstance(val, str):
            l_val = val.lower()
            if "crit" in l_val or "fatal" in l_val or "emergency" in l_val:
                level = "critical"
            elif "err" in l_val or "fail" in l_val:
                level = "error"
            elif "warn" in l_val:
                level = "warning"
            elif "info" in l_val:
                level = "info"
            break

    risk = assess_initial_risk(f"{event} {raw_text}", status, event)
    is_sus = risk in ("high", "medium") or level in ("critical", "error")

    if is_sus and level == "info":
        level = "critical" if risk == "high" else "error"

    return {
        "timestamp": ts,
        "ip": ip,
        "event": event,
        "status": status,
        "risk": risk,
        "raw": raw_text,
        "suspicious": is_sus,
        "level": level,
    }


def parse_line(line: str) -> Optional[dict]:
    line = line.strip()
    if not line:
        return None

    # Check if line is a JSON object
    if (line.startswith("{") and line.endswith("}")) or (line.startswith("[") and line.endswith("]")):
        try:
            parsed_json = json.loads(line)
            if isinstance(parsed_json, dict):
                return parse_json_entry(parsed_json)
            elif isinstance(parsed_json, list) and len(parsed_json) > 0 and isinstance(parsed_json[0], dict):
                return parse_json_entry(parsed_json[0])
        except Exception:
            pass

    ip = extract_ip(line)
    timestamp = extract_timestamp(line)
    event = extract_event_type(line)
    status = extract_status(line)
    risk = assess_initial_risk(line, status, event)
    is_sus = risk in ("high", "medium")
    return {
        "timestamp": timestamp,
        "ip": ip or "unknown",
        "event": line if len(line) <= 120 else (event if event != "unknown" else line[:120] + "..."),
        "status": status,
        "risk": risk,
        "raw": line,
        "suspicious": is_sus,
        "level": "critical" if risk == "high" else ("error" if status == "failed" else "info"),
    }


def parse_logs(content: str) -> list[dict]:
    content = content.strip()
    if not content:
        return []

    # Check if whole content is a JSON Array or wrapper object
    if content.startswith("[") or content.startswith("{"):
        try:
            data = json.loads(content)
            results = []
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        parsed = parse_json_entry(item)
                        if parsed:
                            results.append(parsed)
                    elif isinstance(item, str):
                        parsed = parse_line(item)
                        if parsed:
                            results.append(parsed)
                if results:
                    return results

            elif isinstance(data, dict):
                # Search for log list inside wrapper objects like Records, events, logs, items, value
                for key in ("Records", "records", "events", "logs", "items", "value", "data"):
                    if key in data and isinstance(data[key], list):
                        for item in data[key]:
                            if isinstance(item, dict):
                                parsed = parse_json_entry(item)
                                if parsed:
                                    results.append(parsed)
                        if results:
                            return results

                # Single log object
                single = parse_json_entry(data)
                if single:
                    return [single]
        except Exception:
            pass

    lines = content.splitlines()
    results = []
    for line in lines:
        parsed = parse_line(line)
        if parsed:
            results.append(parsed)
    return results
