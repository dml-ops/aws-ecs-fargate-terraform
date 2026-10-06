const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { nanoid } = require('nanoid');

const PORT = process.env.PORT || 5000;
const APP_BASE_URL = process.env.APP_BASE_URL || '';

// Reserved path segments that must never be treated as short codes.
const RESERVED = new Set(['api', 'config.js', 'favicon.ico']);

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.PGHOST,
        port: process.env.PGPORT || 5432,
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
      }
);

async function ensureSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS links (
      id SERIAL PRIMARY KEY,
      code VARCHAR(10) UNIQUE NOT NULL,
      target_url TEXT NOT NULL,
      clicks INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function buildShortUrl(req, code) {
  if (APP_BASE_URL) return `${APP_BASE_URL.replace(/\/$/, '')}/${code}`;
  return `${req.protocol}://${req.get('host')}/${code}`;
}

const app = express();
app.use(cors());
app.use(express.json());

// Health check: verifies the process is up AND the DB connection works.
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (err) {
    res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

// Create a short link.
app.post('/api/shorten', async (req, res) => {
  const { url } = req.body || {};

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Please provide a valid http(s) URL.' });
  }

  try {
    let code;
    let attempts = 0;
    // Extremely unlikely to collide, but retry a couple of times just in case.
    while (attempts < 5) {
      code = nanoid(7);
      const existing = await pool.query('SELECT 1 FROM links WHERE code = $1', [code]);
      if (existing.rowCount === 0) break;
      attempts += 1;
    }

    const result = await pool.query(
      'INSERT INTO links (code, target_url) VALUES ($1, $2) RETURNING code, target_url, clicks, created_at',
      [code, url]
    );

    const row = result.rows[0];
    res.status(201).json({
      code: row.code,
      shortUrl: buildShortUrl(req, row.code),
      targetUrl: row.target_url,
      clicks: row.clicks,
      createdAt: row.created_at,
    });
  } catch (err) {
    console.error('Error creating short link:', err.message);
    res.status(500).json({ error: 'Could not create short link.' });
  }
});

// List all links (for the stats view).
app.get('/api/links', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT code, target_url, clicks, created_at FROM links ORDER BY created_at DESC LIMIT 100'
    );
    res.status(200).json(
      result.rows.map((row) => ({
        code: row.code,
        shortUrl: buildShortUrl(req, row.code),
        targetUrl: row.target_url,
        clicks: row.clicks,
        createdAt: row.created_at,
      }))
    );
  } catch (err) {
    console.error('Error listing links:', err.message);
    res.status(500).json({ error: 'Could not list links.' });
  }
});

// Redirect handler. Nginx routes short-code-shaped paths here.
app.get('/:code', async (req, res) => {
  const { code } = req.params;

  if (RESERVED.has(code)) {
    return res.status(404).json({ error: 'Not found.' });
  }

  try {
    const result = await pool.query(
      'UPDATE links SET clicks = clicks + 1 WHERE code = $1 RETURNING target_url',
      [code]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Short link not found.' });
    }

    res.redirect(302, result.rows[0].target_url);
  } catch (err) {
    console.error('Error resolving short link:', err.message);
    res.status(500).json({ error: 'Could not resolve short link.' });
  }
});

ensureSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`Backend listening on port ${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to initialize database schema:', err.message);
    process.exit(1);
  });
