# Vaidya — Plagiarism Detector for Ayurvedic Research

Semantic plagiarism detection built specifically for Ayurvedic research content.
Understands transliteration variants, classical text references, and paraphrasing patterns.

## Deploy to Vercel (3 minutes)

### 1. Push to GitHub
```bash
git init
git add .
git commit -m "initial commit"
# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/ayurveda-detector.git
git push -u origin main
```

### 2. Deploy on Vercel
1. Go to https://vercel.com → New Project
2. Import your GitHub repo
3. Vercel auto-detects Vite — click **Deploy**

### 3. Add your API key
In Vercel → Project Settings → Environment Variables, add:
```
ANTHROPIC_API_KEY = sk-ant-...
```
Get your key from https://console.anthropic.com

Then **Redeploy** (Deployments tab → Redeploy).

### 4. Done
Your live URL will be: `https://your-project.vercel.app`

## Local development
```bash
npm install
# create .env.local with: ANTHROPIC_API_KEY=sk-ant-...
npm run dev
```

## How it works
- Frontend: React + Vite
- Backend: Vercel serverless function (`/api/analyze.js`) proxies to Anthropic API
- Accepts text input or URL (server-side fetches the page content)
- Returns risk score, flagged findings with confidence levels, possible sources, and action items
