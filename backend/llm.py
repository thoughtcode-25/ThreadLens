import os
import re
import json
from dotenv import load_dotenv
from groq import Groq

# Load environment variables from .env in backend directory or parent directories
load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

_client = None


def get_model_name() -> str:
    return os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b").strip()



def get_groq_api_key() -> str:
    return os.environ.get("GROQ_API_KEY", "").strip()


def ai_configured() -> bool:
    return bool(get_groq_api_key())


BASE_SYSTEM_PROMPT = (
    "You are an AI cybersecurity analyst assistant integrated into an LLM-Powered "
    "Log Forensic Investigator dashboard. You ONLY answer questions strictly related to: "
    "cybersecurity, log analysis, threat detection, incident response, network security, "
    "malware, intrusion detection, firewalls, SIEM, forensic investigation, vulnerabilities, "
    "security events, IP analysis, brute force attacks, or any other security/IT-security topic. "
    "Always remember and reference prior messages in the conversation to give contextually "
    "accurate, coherent responses. "
    "IMPORTANT: If the user asks anything NOT related to cybersecurity or security analysis "
    "(such as general knowledge, personal chat, weather, food, vehicles, casual conversation, "
    "or any non-security topic), you MUST respond with EXACTLY this text and nothing else: "
    "__OFFTOPIC__"
)


def _build_system_prompt(db_context: dict | None = None) -> str:
    """Build a system prompt that includes real database context when available."""
    if not db_context:
        return BASE_SYSTEM_PROMPT

    stats = db_context.get("stats", {})
    alerts = db_context.get("alerts", [])
    logs = db_context.get("logs", [])
    sessions = db_context.get("sessions", [])

    context_lines = [BASE_SYSTEM_PROMPT, "\n\n=== LIVE SYSTEM DATA (use this to answer user questions) ===\n"]

    # Stats block
    context_lines.append(
        f"CURRENT SYSTEM STATS:\n"
        f"  - Total logs analyzed: {stats.get('logs_analyzed', 0):,}\n"
        f"  - Threats detected: {stats.get('threats_detected', 0)}\n"
        f"  - Unresolved alerts: {stats.get('unresolved_alerts', 0)}\n"
        f"  - Overall risk level: {stats.get('risk_level', 'Unknown')}\n"
        f"  - Last incident timestamp: {stats.get('last_incident') or 'None'}\n"
    )

    # Sessions block
    if sessions:
        context_lines.append("\nRECENT UPLOAD SESSIONS:")
        for s in sessions[:5]:
            context_lines.append(
                f"  - File: {s.get('source_file', 'unknown')} | Date: {s.get('date', '')} | "
                f"Logs: {s.get('logsAnalyzed', s.get('logs_analyzed', 0)):,} | "
                f"Threats: {s.get('threatsDetected', s.get('threats_detected', 0))}"
            )

    # Alerts block
    if alerts:
        context_lines.append(f"\nACTIVE ALERTS ({len(alerts)} shown, sorted by severity):")
        for a in alerts[:20]:
            context_lines.append(
                f"  [{a.get('risk', 'unknown').upper()}] {a.get('title', a.get('type', 'Alert'))} "
                f"| IP: {a.get('source', a.get('ip', 'N/A'))} "
                f"| Time: {a.get('timestamp', 'N/A')} "
                f"| Resolved: {a.get('resolved', False)}"
            )
    else:
        context_lines.append("\nACTIVE ALERTS: None detected yet.")

    # Logs block (most recent suspicious ones first)
    if logs:
        suspicious = [l for l in logs if l.get("suspicious")]
        normal = [l for l in logs if not l.get("suspicious")]
        shown_logs = suspicious[:15] + normal[:5]
        context_lines.append(f"\nRECENT LOG ENTRIES ({len(shown_logs)} shown, suspicious first):")
        for l in shown_logs:
            flag = "⚠ SUSPICIOUS" if l.get("suspicious") else "  normal"
            context_lines.append(
                f"  {flag} | {l.get('timestamp', '')} | IP: {l.get('ip', 'N/A')} | "
                f"Event: {l.get('event', l.get('raw', '')[:120])} | "
                f"Risk: {l.get('risk', 'N/A')} | Status: {l.get('status', 'N/A')}"
            )

    context_lines.append(
        "\nWhen the user asks about logs, threats, alerts, or their security posture, "
        "always reference the data above. Give specific numbers, IPs, timestamps, and event names from this data. "
        "Do NOT say you don't have access to the data — this data is your live context."
    )

    return "\n".join(context_lines)


def _get_client():
    global _client
    if _client is not None:
        return _client
    api_key = get_groq_api_key()
    if not api_key:
        raise RuntimeError("GROQ_API_KEY environment variable is not set. Please set GROQ_API_KEY in your .env file.")
    _client = Groq(api_key=api_key)
    return _client


def _chat(prompt: str, db_context: dict | None = None) -> str:
    client = _get_client()
    system_prompt = _build_system_prompt(db_context)
    response = client.chat.completions.create(
        model=get_model_name(),
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
        max_tokens=1500,
    )
    return response.choices[0].message.content.strip()


def _chat_with_history(question: str, history: list[dict], db_context: dict | None = None) -> str:
    """Send a message with full conversation history + live DB context for accurate responses."""
    client = _get_client()
    system_prompt = _build_system_prompt(db_context)

    messages = [{"role": "system", "content": system_prompt}]

    for msg in history:
        role = msg.get("role", "")
        content = msg.get("content", "")
        if role == "user":
            messages.append({"role": "user", "content": content})
        elif role in ("ai", "assistant"):
            messages.append({"role": "assistant", "content": content})

    messages.append({"role": "user", "content": question})

    response = client.chat.completions.create(
        model=get_model_name(),
        messages=messages,
        temperature=0.7,
        max_tokens=1500,
    )
    return response.choices[0].message.content.strip()



def _extract_json(text: str) -> dict:
    """Extract and parse JSON object from text, even if wrapped in markdown code blocks or surrounding text."""
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    try:
        return json.loads(text)
    except Exception:
        # Try finding the first '{' and matching '}'
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group())
        raise


def analyze_event(event_data: dict) -> dict:
    prompt = f"""You are a cybersecurity expert. Analyze the following security event:

{json.dumps(event_data, indent=2)}

Respond ONLY with a JSON object (no markdown, no code blocks) with exactly these fields:
{{
  "explanation": "<detailed explanation of what happened>",
  "attack_type": "<name of attack type>",
  "risk_level": "<low|medium|high|critical>",
  "why_dangerous": "<why this is dangerous>",
  "recommended_actions": ["<action 1>", "<action 2>", "<action 3>"]
}}"""

    text = _chat(prompt)
    try:
        return _extract_json(text)
    except Exception:
        return {
            "explanation": text[:300],
            "attack_type": event_data.get("event", "Suspicious Activity"),
            "risk_level": event_data.get("risk", "medium"),
            "why_dangerous": "Potential unauthorized system access or reconnaissance activity.",
            "recommended_actions": ["Monitor source IP", "Verify credentials", "Review firewall logs"],
        }


def investigate_sequence(logs: list[dict]) -> dict:
    sample = logs[:50] if len(logs) > 50 else logs
    prompt = f"""You are a cybersecurity forensic expert. Analyze the following sequence of security log events:

{json.dumps(sample, indent=2)}

Identify the attack flow, root cause, and attacker intent.
Respond ONLY with a JSON object (no markdown, no code blocks) with exactly these fields:
{{
  "attack_flow": "<step-by-step description of the attack>",
  "root_cause": "<root cause of the incident>",
  "attacker_intent": "<what the attacker was trying to achieve>",
  "affected_systems": ["<system 1>", "<system 2>"],
  "severity": "<low|medium|high|critical>",
  "remediation_steps": ["<step 1>", "<step 2>", "<step 3>"],
  "summary": "<one paragraph summary>"
}}"""

    text = _chat(prompt)
    try:
        return _extract_json(text)
    except Exception:
        return {
            "attack_flow": text[:300],
            "root_cause": "Multiple suspicious log anomalies detected in the log stream.",
            "attacker_intent": "Attempted unauthorized access or reconnaissance.",
            "affected_systems": ["Internal Network", "Authentication Service"],
            "severity": "medium",
            "remediation_steps": ["Isolate suspicious IP addresses", "Enforce MFA", "Review access permissions"],
            "summary": "Forensic automated scan identified potential anomalous activities in the sequence.",
        }


def chat_with_ai(question: str, history: list[dict] = None, db_context: dict | None = None) -> str:
    if history:
        return _chat_with_history(question, history, db_context)
    return _chat(question, db_context)

