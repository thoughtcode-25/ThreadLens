# Thread Lens

Thread Lens is an LLM-powered security operations dashboard for log forensic
investigation, threat detection, live monitoring, AI analysis, and incident
reporting.

> **Status:** In testing phase. Features, integrations, and data handling may
> change before the first stable release.
>
> ## Author

**Piyush Raj Singh**
Contact email: [businessthought.code@gmail.com](mailto:businessthought.code@gmail.com)

## Technology

- Frontend: React, TypeScript, Vite, Tailwind CSS, React Router
- Backend: FastAPI, Python, Uvicorn
- Database: MongoDB with a local persistent fallback under `backend/data/`
- AI: Groq API
- Authentication: JWT tokens and optional email verification

## Requirements

- Node.js 20 or newer
- Python 3.12 recommended. Python 3.14 also works with the current requirements.
- npm
- MongoDB, optional for local testing because the application can use its local
	persistent fallback
- Groq API key, required for live AI responses
- Gmail SMTP credentials, optional for sending verification emails

## Installation

From the repository root:

```powershell
npm install --legacy-peer-deps
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend\requirements.txt
```

VS Code is configured to use `.venv` automatically. After opening a new
terminal, confirm the interpreter if needed:

```powershell
python -c "import sys; print(sys.executable)"
```

The path should end with `.venv\Scripts\python.exe`.

## Environment Configuration

Copy `.env.example` to `.env` if `.env` does not exist. Never commit `.env` or
place real credentials in `.env.example`.

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | Recommended | MongoDB connection string. The default uses local MongoDB at `mongodb://localhost:27017/llm_forensic`. |
| `GROQ_API_KEY` | For AI | API key from [Groq Console](https://console.groq.com/keys). |
| `GROQ_MODEL` | No | Groq model name. The default is `openai/gpt-oss-120b`. |
| `JWT_SECRET` | Yes | Long random secret used to sign authentication tokens. |
| `PORT` | No | Backend port. The default is `8000`. |
| `SMTP_EMAIL` | No | Gmail address used for verification emails. |
| `SMTP_PASSWORD` | No | Gmail app password, not the normal account password. |
| `SMTP_HOST` | No | SMTP server. The default is `smtp.gmail.com`. |
| `SMTP_PORT` | No | SMTP port. Use `465` with SSL or `587` with STARTTLS. |
| `SMTP_USE_SSL` | No | Set to `true` for port `465`. |

Example local configuration:

```env
MONGODB_URI=mongodb://localhost:27017/llm_forensic
GROQ_API_KEY=your-groq-api-key
GROQ_MODEL=openai/gpt-oss-120b
JWT_SECRET=replace-with-a-long-random-secret
PORT=8000
SMTP_EMAIL=
SMTP_PASSWORD=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USE_SSL=true
```

Without MongoDB, the backend falls back to JSON-backed local storage. Without
SMTP credentials, verification codes are printed in the backend terminal.

## Start the Application

Run the backend and frontend in separate terminals.

### Backend

From the repository root:

```powershell
cd backend
python main.py
```

The backend runs at `http://localhost:8000`.

If VS Code has not activated the environment, use the direct interpreter:

```powershell
..\.venv\Scripts\python.exe main.py
```

### Frontend

From the repository root, in a second terminal:

```powershell
npm run dev
```

Open `http://localhost:5000`. Vite proxies frontend `/api` requests to the
backend at `http://localhost:8000`.

## Health Check

With the backend running, open or request:

```text
http://localhost:8000/api/health
```

A healthy response looks like:

```json
{"status":"ok","db_connected":true,"ai_configured":true}
```

## Webhook Testing

The live monitoring webhook endpoint is:

```text
http://localhost:8000/api/webhook/logs
```

Send a `POST` request with JSON:

```powershell
Invoke-RestMethod `
	-Uri http://localhost:8000/api/webhook/logs `
	-Method Post `
	-ContentType "application/json" `
	-Body '{"ip":"192.168.1.10","event":"Failed login attempt","level":"warning","status":"failed","risk":"medium","suspicious":true}'
```

For external services, `localhost` is not publicly reachable. Use a secure
tunnel such as ngrok and protect the exposed endpoint before production use.

## Main API Routes

- `GET /api/health` - service and database health
- `POST /api/auth/signup` - create an account
- `POST /api/auth/verify-email` - verify an email code
- `POST /api/auth/login` - sign in
- `GET /api/auth/me` - get the current user
- `POST /api/upload` - upload logs for analysis
- `GET /api/upload/status/{job_id}` - check upload progress
- `GET /api/logs` - list analyzed logs
- `GET /api/alerts` - list alerts
- `GET /api/stats` - dashboard statistics
- `GET /api/live-logs` - simulated or stored live logs
- `POST /api/webhook/logs` - receive external logs
- `POST /api/analyze` - analyze one security event
- `POST /api/investigate` - investigate a sequence of events
- `POST /api/chat` - ask the security assistant
- `GET /api/sessions` - list upload sessions
- `GET /api/chat/sessions` - list AI chat sessions
- `GET /api/export` - export logs or alerts
- `POST /api/block-ip` - block an IP address
- `GET /api/blocked-ips` - list blocked IP addresses
- `POST /api/demo/simulate` - generate demo attack data
- `POST /api/tools/ioc-extract` - extract indicators of compromise
- `POST /api/tools/ip-lookup` - inspect an IP address
- `POST /api/tools/decode` - decode supported encoded values
- `POST /api/tools/anonymize` - anonymize data
- `POST /api/tools/hash` - generate hashes

## Useful Commands

```powershell
npm run dev       # Start Vite development server
npm run build     # Create production frontend bundle
npm run preview   # Preview the production bundle
npm run lint      # Run ESLint
npm test          # Run Vitest tests
```

## Docker and Deployment

The root `Dockerfile` builds the frontend and starts the FastAPI backend on
port `8000`. `render.yaml` contains the Render service configuration, and
`vercel.json` configures the Python API deployment on Vercel.

For any deployment, configure secrets through the hosting provider rather than
committing them to the repository. Set `GROQ_API_KEY`, `MONGODB_URI`,
`JWT_SECRET`, and SMTP variables as needed.

## Project Structure

```text
src/                  React frontend
src/pages/            Application pages and routes
src/components/       Shared UI and dashboard components
src/lib/              API, OCR, and report export helpers
backend/main.py       FastAPI application and routes
backend/auth.py       Authentication and email verification
backend/database.py   MongoDB and local fallback storage
backend/detector.py   Threat detection logic
backend/parser.py     Log parsing logic
backend/llm.py        Groq integration
backend/data/         Local persistent JSON data
api/index.py          Vercel Python entry point
```

## Security Notes

- Keep `.env` private and use `.env.example` only for empty placeholders.
- Revoke any credential that has ever been committed to Git.
- Use a long random `JWT_SECRET` outside local development.
- Use Gmail app passwords for SMTP.
- Do not expose the local webhook endpoint publicly without authentication and
	request validation.
