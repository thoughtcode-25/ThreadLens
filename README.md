# Thread Lens

Thread Lens is an LLM-powered log forensic investigation dashboard with a React
frontend and a FastAPI backend.

## Requirements

- Node.js 20+
- Python 3.12+
- MongoDB (required for accounts, stored logs, alerts, and sessions)
- Groq API access (required for AI analysis and chat)

## Run locally in VS Code

Install dependencies from the repository root:

```bash
npm install
python -m pip install -r backend/requirements.txt
```

Set the backend environment variables in your terminal or a local `.env`
loader:

```text
MONGODB_URI=your-mongodb-connection-string
GROQ_API_KEY=your-groq-api-key
JWT_SECRET=replace-with-a-long-random-value
```

`SMTP_EMAIL` and `SMTP_PASSWORD` are optional. Without them, sign-up
verification codes are printed by the backend for local development.

Run the frontend and backend in separate terminals:

```bash
npm run dev
cd backend
python main.py
```

Open http://localhost:5000. The Vite development server proxies `/api`
requests to the backend at http://localhost:8000.

## Run on Replit

The project includes two workflows:

- **Start application** — Vite frontend on port 5000
- **Backend API** — FastAPI backend on port 8000

Add `MONGODB_URI`, `GROQ_API_KEY`, and `JWT_SECRET` as Replit Secrets before
using persistent data or AI features. The frontend and backend can still start
without those services; the Settings page will show which dependencies are
unavailable.

## Checks these

```bash
npm run build
npm run lint
npm test
```
