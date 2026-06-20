# Hum — your song studio

A private studio for capturing songs: lyrics, chords, key, BPM, time signature, mood/tags, status and notes. Express + Postgres, built to run on Railway.

---

## Deploy on Railway (dashboard + GitHub web UI only)

### 1. Put the code on GitHub
1. Go to **github.com → New repository**. Name it `hum` (keep it Private). Click **Create repository**.
2. On the new repo page, click **uploading an existing file**.
3. Drag in every file from this folder, keeping the structure:
   ```
   package.json
   server.js
   .gitignore
   README.md
   public/index.html      ← the public folder must come with index.html inside it
   ```
   (When uploading on the web, drag the `public` folder in too — GitHub keeps the folder path.)
4. Click **Commit changes**.

### 2. Create the project on Railway
1. Go to **railway.app → New Project → Deploy from GitHub repo**.
2. Pick your `hum` repo. Railway auto-detects Node and runs `npm start`.

### 3. Add the database
1. In the project canvas click **+ New → Database → Add PostgreSQL**.
2. Open your **app service → Variables → New Variable → Add Reference**, choose Postgres’ **`DATABASE_URL`**. (On most Railway setups the app already sees it; add the reference if it doesn’t.)
3. The app reads `DATABASE_URL` and creates the `songs` table on first boot — nothing else to run.

### 4. Go live
1. Open the **app service → Settings → Networking → Generate Domain**.
2. Visit the domain. Hit **New song** and start writing.

---

## How it works
- `server.js` serves the frontend from `public/` and exposes a small REST API.
- The `songs` table is created automatically when the server starts (`CREATE TABLE IF NOT EXISTS`).
- No build step, no terminal needed — push to GitHub and Railway redeploys.

## API (for reference)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/songs` | List all songs |
| POST | `/api/songs` | Create a song |
| PUT | `/api/songs/:id` | Update a song |
| DELETE | `/api/songs/:id` | Delete a song |
| GET | `/api/health` | Status + DB connection check |

## Shortcuts
- **Esc** — close the editor
- **Cmd/Ctrl + Enter** — save while editing
