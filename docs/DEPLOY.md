# Deploying ArthSaathi

Website on **Vercel**, server on **Render**, database and login on **Supabase**. All on free plans.
No secrets are stored in the code: every value below is typed into the hosting dashboards.

## 1. Server on Render

1. Sign in to render.com with GitHub.
2. **New > Blueprint**, pick the `arthsaathi-ai` repository. Render reads `render.yaml`.
3. When asked, fill in:
   - `SUPABASE_URL`: your Supabase project URL
   - `SUPABASE_PUBLISHABLE_KEY`: Supabase > Project Settings > API keys > publishable key (public, not secret)
   - `CORS_ORIGINS`: the Vercel website address from step 2 (fill in later if you don't have it yet)
4. Deploy. Check `https://<your-service>.onrender.com/api/health` shows `{"status":"ok", ...}`.

Free plan note: the server sleeps after about 15 minutes without visits. The first visit after that takes 30 to 60 seconds; the app shows "Waking up the server" meanwhile.

## 2. Website on Vercel

1. Sign in to vercel.com with GitHub. **Add New > Project**, import `arthsaathi-ai`.
2. **Root Directory: `frontend`**. Framework: Vite (detected). Build and output come from `frontend/vercel.json`.
3. Environment variables (all public values):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_API_URL`: the Render address, e.g. `https://arthsaathi-api.onrender.com`
   - `VITE_CONTACT_EMAIL` (optional): a public contact email, shown in the footer and legal pages
4. Deploy. Note the address, e.g. `https://arthsaathi.vercel.app`.

## 3. Connect them

1. Render > arthsaathi-api > Environment: set `CORS_ORIGINS` to the Vercel address (no trailing slash). Save (it redeploys).
2. Supabase > Authentication > URL Configuration:
   - Site URL: the Vercel address
   - Redirect URLs: add the Vercel address and `http://localhost:5173`

## 4. Check

- Open the Vercel address, sign up, finish onboarding, add an entry in My Money.
- Both services redeploy automatically when `main` changes on GitHub.

## Security built in

- `frontend/vercel.json` sends security headers: a Content Security Policy (only our own files, Supabase and Render are allowed), no framing, no MIME sniffing, a strict referrer policy, and camera/mic/location/payment turned off.
- The server hides its `/docs` page in production and only accepts calls from `CORS_ORIGINS`.
