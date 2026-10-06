# AI TrustLens – Vercel Deployment

> **Next.js 14 frontend + FastAPI Python backend deployed as Vercel serverless functions.**

---

## Architecture

```
vercel-deploy/
├── api/
│   ├── index.py          # FastAPI backend (Vercel Python serverless)
│   └── requirements.txt  # fastapi + pydantic only
├── app/                  # Next.js 14 App Router
│   ├── layout.tsx
│   ├── page.tsx          # Home page
│   ├── audit/page.tsx    # Audit pipeline
│   ├── dashboard/page.tsx
│   └── report/page.tsx
├── components/
│   ├── Sidebar.tsx
│   └── ClaimCard.tsx
├── lib/
│   ├── api.ts            # Typed API client
│   └── storage.ts        # SessionStorage helpers
├── types/index.ts        # Shared TypeScript types
├── vercel.json           # Route config
├── next.config.mjs
└── package.json
```

---

## Deploy to Vercel (Step-by-Step)

### Prerequisites
- [Node.js 18+](https://nodejs.org) installed
- [Vercel CLI](https://vercel.com/cli): `npm i -g vercel`
- A [Vercel account](https://vercel.com) (free)
- Your project pushed to **GitHub / GitLab / Bitbucket**

---

### Step 1 — Push to GitHub

```bash
# From workspace root
git init
git add vercel-deploy/
git commit -m "feat: add Vercel deployment (Next.js + FastAPI)"
git remote add origin https://github.com/YOUR_USERNAME/ai-trustlens.git
git push -u origin main
```

> **Tip:** You can also push only the `vercel-deploy/` folder as its own repo:
> ```bash
> cd vercel-deploy
> git init
> git add .
> git commit -m "initial vercel deploy"
> git remote add origin https://github.com/YOUR_USERNAME/ai-trustlens-vercel.git
> git push -u origin main
> ```

---

### Step 2 — Install dependencies locally (for testing)

```bash
cd vercel-deploy
npm install
```

---

### Step 3 — Run locally (test before deploying)

**Terminal 1 — FastAPI backend:**
```bash
cd vercel-deploy
pip install fastapi pydantic uvicorn
uvicorn api.index:app --reload --port 8000
```

**Terminal 2 — Next.js frontend:**
```bash
cd vercel-deploy
cp .env.example .env.local    # sets NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open: **http://localhost:3000**

---

### Step 4 — Deploy to Vercel

**Option A: Via Vercel Dashboard (recommended)**

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **Import Git Repository**
3. Select your `ai-trustlens-vercel` repository
4. Set **Root Directory** to `vercel-deploy/` (if you pushed the whole workspace)
   - OR leave blank if you pushed only `vercel-deploy/` as the repo root
5. **Framework Preset**: Next.js (auto-detected)
6. **Build Command**: `npm run build` (default)
7. **Output Directory**: `.next` (default)
8. Click **Deploy**

**Option B: Via Vercel CLI**
```bash
cd vercel-deploy
vercel                  # follow prompts, select Next.js
vercel --prod           # deploy to production
```

---

### Step 5 — Verify deployment

After deploy, Vercel gives you a URL like `https://ai-trustlens-abc123.vercel.app`.

Test the API:
```
GET  https://your-app.vercel.app/api/health
POST https://your-app.vercel.app/api/audit
     Body: {"text": "Metformin treats type 2 diabetes."}
```

---

## Environment Variables on Vercel

In the Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_API_URL` | *(leave blank)* | On Vercel, API calls use relative paths |

No other env vars are required — the backend is fully self-contained.

---

## Limitations on Vercel Free Tier

| Constraint | Free Tier | Impact |
|-----------|-----------|--------|
| Serverless timeout | **10 seconds** | Auditing >10 claims may timeout → use ≤8 claims |
| Function size | 50 MB | ✅ OK — our API has no heavy deps |
| Invocations/month | 100,000 | ✅ Fine for project demo |
| Cold start | ~1-2s | First request after inactivity is slower |

> **Pro tip:** On Vercel **Pro** plan, timeout extends to **60 seconds** — enough for any audit.

---

## Upgrading Features

### Add sentence-transformers (semantic NER)
The free Vercel Python runtime supports only pure-Python packages.
To use HuggingFace models, deploy the FastAPI backend separately on:
- [Render](https://render.com) (free tier, 512MB RAM)
- [Railway](https://railway.app)
- [Hugging Face Spaces](https://huggingface.co/spaces) (free GPU!)

Then set `NEXT_PUBLIC_API_URL=https://your-backend.render.com` in Vercel env vars.

### Add Neo4j
Use [Neo4j Aura Free](https://neo4j.com/cloud/platform/aura-graph-database/) (free 50MB graph).
Add to `api/index.py`:
```python
import os
from neo4j import GraphDatabase
NEO4J_URI = os.environ.get("NEO4J_URI")
NEO4J_PASSWORD = os.environ.get("NEO4J_PASSWORD")
```
Add env vars in Vercel Dashboard.

---

## File Reference

| File | Purpose |
|------|---------|
| [`api/index.py`](api/index.py) | Complete FastAPI pipeline (NER, retrieval, 4-class verification) |
| [`api/requirements.txt`](api/requirements.txt) | `fastapi`, `pydantic` only |
| [`vercel.json`](vercel.json) | Routes `/api/*` → Python, everything else → Next.js |
| [`app/audit/page.tsx`](app/audit/page.tsx) | Main audit interface |
| [`app/dashboard/page.tsx`](app/dashboard/page.tsx) | Charts and metrics |
| [`app/report/page.tsx`](app/report/page.tsx) | Downloadable full report |
| [`lib/api.ts`](lib/api.ts) | Typed API client |
| [`types/index.ts`](types/index.ts) | Shared TypeScript types |

---

*AI TrustLens – Academic Research Prototype | Not for clinical use*
