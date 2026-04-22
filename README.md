# LeadRadar — Next.js app

Minimal, production-ready MVP shell for LeadRadar. One public page (`/login`),
one protected page (`/`), stateless password auth, no database, no third-party
auth provider. Deploys to Vercel in about two minutes.

## Folder structure

```
leadradar-app/
├─ app/
│  ├─ api/
│  │  ├─ login/route.ts       # POST: validates password, sets signed cookie
│  │  └─ logout/route.ts      # GET/POST: clears cookie, 303 → /login
│  ├─ login/page.tsx          # Public password form
│  ├─ globals.css             # Design tokens + component styles (Tailwind base)
│  ├─ landing.html            # Verbatim marketing page body + inline demo JS
│  ├─ layout.tsx              # Root layout, Inter font, metadata, theme color
│  └─ page.tsx                # Protected home — renders landing.html via SSR
├─ lib/
│  └─ auth.ts                 # Shared HMAC + constant-time-equal helpers
├─ middleware.ts              # Edge gate: redirect to /login unless cookie valid
├─ next.config.mjs            # Includes landing.html in server file trace
├─ next-env.d.ts
├─ package.json
├─ postcss.config.mjs
├─ tailwind.config.ts
├─ tsconfig.json
├─ .env.example               # Required env vars for local dev & Vercel
└─ .gitignore
```

## How the password gate works

1. `middleware.ts` runs at the edge on every request except `/login`,
   `/api/login`, `/api/logout`, and Next internals.
2. It reads the `lr_auth` cookie and compares it to
   `HMAC-SHA256(APP_PASSWORD, APP_SECRET)` (hex, lowercase).
3. If the cookie is missing or wrong, it 303-redirects to
   `/login?from=<original path>`.
4. `/login` POSTs to `/api/login`, which validates the password (constant-time
   compare), signs the cookie, and redirects to the original path.
5. `/api/logout` wipes the cookie and returns the user to `/login`.

No database. No session store. Sessions are stateless and last 7 days.

## Local setup

```bash
# 1. Install deps
cd leadradar-app
npm install

# 2. Create .env.local (git-ignored)
cp .env.example .env.local

# 3. Pick a strong password for APP_PASSWORD
#    Generate a random 32-byte hex secret for APP_SECRET:
openssl rand -hex 32

# 4. Paste both values into .env.local, then:
npm run dev
# → http://localhost:3000
```

Required environment variables:

| Name           | Purpose                                           | Example                                         |
| -------------- | ------------------------------------------------- | ----------------------------------------------- |
| `APP_PASSWORD` | The shared password users type at `/login`        | `oak-river-tempo-47`                            |
| `APP_SECRET`   | HMAC key used to sign the auth cookie (min 32 hex chars) | output of `openssl rand -hex 32`          |

If either env is missing, the login page shows a "Server is misconfigured"
banner instead of letting anyone in.

## Deploy to Vercel

### Option A — via the Vercel dashboard (recommended)

1. Push this repo (or just the `leadradar-app/` folder at the repo root) to
   GitHub, GitLab, or Bitbucket.
2. Go to <https://vercel.com/new>, pick the repo, accept defaults.
   Framework preset will auto-detect as **Next.js**.
   - If `leadradar-app/` is nested inside a bigger repo, set **Root Directory**
     to `leadradar-app` in the project settings.
3. Before the first deploy, add the two environment variables:
   - Project → Settings → Environment Variables
   - `APP_PASSWORD` → your chosen password, scope: Production + Preview + Development
   - `APP_SECRET`   → output of `openssl rand -hex 32`, same scope
4. Click **Deploy**. First build takes ~60 seconds.
5. Visit the production URL — it should immediately redirect to `/login`.
   Paste the password, confirm you land on the marketing page, scan a domain
   in the demo to sanity-check the inline JS.

### Option B — via the Vercel CLI

```bash
npm i -g vercel
cd leadradar-app
vercel login
vercel link       # create / link a project
vercel env add APP_PASSWORD production
vercel env add APP_SECRET   production
vercel env add APP_PASSWORD preview
vercel env add APP_SECRET   preview
vercel --prod
```

## Rotating the password

Changing `APP_PASSWORD` or `APP_SECRET` invalidates every existing cookie
(because the HMAC no longer matches), so all users will have to log in again —
which is exactly what you want after sharing the old password too widely.

1. Update the env vars in Vercel → Settings → Environment Variables.
2. **Redeploy** so the new values reach the edge runtime:
   `vercel --prod` or click **Redeploy** in the dashboard.

## Gotchas

- **Cookie is `Secure` only in production.** In local dev it's sent over HTTP.
  This is handled automatically via `process.env.NODE_ENV === 'production'`.
- **`landing.html` is SSR'd.** If you edit the file, you need to restart
  `next dev` (or re-deploy) because the contents are cached at module scope.
- **Inline `<script>` runs once**, on the first parse of the HTML. Don't try
  to hydrate or re-render it — just keep it a one-shot document.
- **`robots: noindex`** is set in `layout.tsx` so search engines don't crawl
  the MVP. Remove it from `app/layout.tsx` metadata when you're ready to launch.
