// Hum — song studio server (flat layout: index.html sits next to this file)
// Express + Postgres. Reads DATABASE_URL and PORT from the environment (Railway).

const express = require("express");
const path = require("path");
const { Pool } = require("pg");

const app = express();
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, "index.html");

// Railway's Postgres needs SSL. A local unix-socket connection does not.
const url = process.env.DATABASE_URL;
const needsSsl = url && !url.includes("host=/") && process.env.PGSSLMODE !== "disable";
const pool = url
  ? new Pool({
      connectionString: url,
      ssl: needsSsl ? { rejectUnauthorized: false } : false,
    })
  : null;

// --- Schema bootstrap -------------------------------------------------------
async function initDb() {
  if (!pool) {
    console.warn("No DATABASE_URL set — running without a database.");
    return;
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS songs (
      id             SERIAL PRIMARY KEY,
      title          TEXT NOT NULL,
      artist         TEXT DEFAULT '',
      song_key       TEXT DEFAULT '',
      bpm            INTEGER,
      time_signature TEXT DEFAULT '',
      status         TEXT DEFAULT 'idea',
      mood           TEXT DEFAULT '',
      lyrics         TEXT DEFAULT '',
      chords         TEXT DEFAULT '',
      notes          TEXT DEFAULT '',
      created_at     TIMESTAMPTZ DEFAULT now(),
      updated_at     TIMESTAMPTZ DEFAULT now()
    );
  `);
  // Migrations for the chord-chart workflow (safe on existing tables)
  await pool.query(`ALTER TABLE songs ADD COLUMN IF NOT EXISTS chart TEXT DEFAULT '';`);
  await pool.query(`ALTER TABLE songs ADD COLUMN IF NOT EXISTS capo TEXT DEFAULT '';`);
  console.log("Database ready.");
}

// --- Helpers ----------------------------------------------------------------
function clean(body) {
  const toInt = (v) => {
    if (v === "" || v === null || v === undefined) return null;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  };
  return {
    title: (body.title || "").trim() || "Untitled",
    artist: (body.artist || "").trim(),
    song_key: (body.song_key || "").trim(),
    bpm: toInt(body.bpm),
    time_signature: (body.time_signature || "").trim(),
    status: (body.status || "idea").trim(),
    mood: (body.mood || "").trim(),
    lyrics: body.lyrics || "",
    chords: body.chords || "",
    notes: body.notes || "",
    chart: body.chart || "",
    capo: (body.capo || "").trim(),
  };
}

function dbGuard(res) {
  if (!pool) {
    res.status(503).json({ error: "Database not connected. Add a Postgres service on Railway and reference its DATABASE_URL." });
    return false;
  }
  return true;
}

// --- Routes -----------------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({ ok: true, db: !!pool });
});

app.get("/api/songs", async (req, res) => {
  if (!dbGuard(res)) return;
  try {
    const { rows } = await pool.query("SELECT * FROM songs ORDER BY updated_at DESC");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not load songs." });
  }
});

app.post("/api/songs", async (req, res) => {
  if (!dbGuard(res)) return;
  const s = clean(req.body);
  try {
    const { rows } = await pool.query(
      `INSERT INTO songs (title, artist, song_key, bpm, time_signature, status, mood, lyrics, chords, notes, chart, capo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [s.title, s.artist, s.song_key, s.bpm, s.time_signature, s.status, s.mood, s.lyrics, s.chords, s.notes, s.chart, s.capo]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not save song." });
  }
});

app.put("/api/songs/:id", async (req, res) => {
  if (!dbGuard(res)) return;
  const s = clean(req.body);
  try {
    const { rows } = await pool.query(
      `UPDATE songs SET title=$1, artist=$2, song_key=$3, bpm=$4, time_signature=$5,
        status=$6, mood=$7, lyrics=$8, chords=$9, notes=$10, chart=$11, capo=$12, updated_at=now()
       WHERE id=$13 RETURNING *`,
      [s.title, s.artist, s.song_key, s.bpm, s.time_signature, s.status, s.mood, s.lyrics, s.chords, s.notes, s.chart, s.capo, req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: "Song not found." });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not update song." });
  }
});

app.delete("/api/songs/:id", async (req, res) => {
  if (!dbGuard(res)) return;
  try {
    const { rowCount } = await pool.query("DELETE FROM songs WHERE id=$1", [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: "Song not found." });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not delete song." });
  }
});

// Frontend — served directly from this folder (no public/ subfolder needed)
app.get("*", (req, res) => {
  res.sendFile(INDEX);
});

initDb()
  .catch((e) => console.error("DB init failed:", e))
  .finally(() => {
    app.listen(PORT, () => console.log(`Hum running on port ${PORT}`));
  });
