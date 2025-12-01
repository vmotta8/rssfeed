import express from 'express';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Database(join(rootDir, 'data', 'articles.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS saved_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    link TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    source TEXT,
    source_id TEXT,
    date TEXT,
    description TEXT,
    saved_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);

app.use(express.json());
app.use(express.static(rootDir));

app.get('/api/saved', (req, res) => {
  const articles = db.prepare('SELECT * FROM saved_articles ORDER BY saved_at DESC').all();
  res.json(articles);
});

app.post('/api/save', (req, res) => {
  const { link, title, source, sourceId, date, description } = req.body;

  if (!link || !title) {
    return res.status(400).json({ error: 'link and title are required' });
  }

  try {
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO saved_articles (link, title, source, source_id, date, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(link, title, source, sourceId, date, description);

    if (result.changes > 0) {
      res.json({ success: true, message: 'Article saved' });
    } else {
      res.json({ success: true, message: 'Article already saved' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/save', (req, res) => {
  const { link } = req.body;

  if (!link) {
    return res.status(400).json({ error: 'link is required' });
  }

  try {
    const stmt = db.prepare('DELETE FROM saved_articles WHERE link = ?');
    stmt.run(link);
    res.json({ success: true, message: 'Article removed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/saved/check', (req, res) => {
  const { links } = req.body;

  if (!links || !Array.isArray(links)) {
    return res.status(400).json({ error: 'links array is required' });
  }

  const placeholders = links.map(() => '?').join(',');
  const stmt = db.prepare(`SELECT link FROM saved_articles WHERE link IN (${placeholders})`);
  const saved = stmt.all(...links).map(row => row.link);

  res.json({ saved });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
