import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdirSync, existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const dataDir = join(rootDir, 'data');
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

const db = new Database(join(dataDir, 'cache.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS source_cache (
    source_id TEXT PRIMARY KEY,
    articles TEXT NOT NULL,
    fetched_at INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'success'
  )
`);

const CACHE_TTL = 30 * 60 * 1000;

export function getCachedArticles(sourceId, allowExpired = false) {
  const row = db.prepare('SELECT * FROM source_cache WHERE source_id = ?').get(sourceId);

  if (!row) return null;

  const age = Date.now() - row.fetched_at;
  const isExpired = age > CACHE_TTL;
  const isFailed = row.status === 'failed';

  if (!allowExpired && (isExpired || isFailed)) return null;

  try {
    const articles = JSON.parse(row.articles);
    if (allowExpired && articles.length === 0) return null;
    return articles;
  } catch {
    return null;
  }
}

export function setCachedArticles(sourceId, articles, status = 'success') {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO source_cache (source_id, articles, fetched_at, status)
    VALUES (?, ?, ?, ?)
  `);
  stmt.run(sourceId, JSON.stringify(articles), Date.now(), status);
}

export function getCacheStatus() {
  const rows = db.prepare('SELECT source_id, fetched_at, status FROM source_cache').all();
  return rows.map(row => ({
    sourceId: row.source_id,
    age: Math.round((Date.now() - row.fetched_at) / 1000 / 60),
    status: row.status
  }));
}

export function clearCache(sourceId = null) {
  if (sourceId) {
    db.prepare('DELETE FROM source_cache WHERE source_id = ?').run(sourceId);
  } else {
    db.prepare('DELETE FROM source_cache').run();
  }
}
