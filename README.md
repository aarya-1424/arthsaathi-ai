# ArthSaathi

AI-powered personal finance companion and financial literacy platform for India.
*Arth* (money) + *Saathi* (companion).

> ArthSaathi is an educational and planning tool. It is not a registered financial advisor, CA, bank, or government body.

## Project layout

| Folder | What it holds |
|---|---|
| `backend/` | Python + FastAPI server (APIs, calculations, AI calls) |
| `frontend/` | React + TypeScript + Tailwind website |
| `docs/` | Decisions and plans |

## Run it on your computer

Backend (needs Python 3.12):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements-dev.txt
.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

Frontend (needs Node 20+), in a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Copy `.env.example` to `backend/.env` for settings. Never commit real keys.

## Tests

```powershell
cd backend; .\.venv\Scripts\python -m pytest
cd frontend; npm test
```

See `docs/DECISIONS.md` for the main design choices and `docs/PROJECT_STATUS.md` for everything built so far.
