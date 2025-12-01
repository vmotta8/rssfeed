import Parser from 'rss-parser';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const parser = new Parser({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  }
});

const sourcesData = JSON.parse(readFileSync(join(rootDir, 'sources.json'), 'utf-8'));
const allSources = sourcesData.sources;

let config;
if (existsSync(join(rootDir, 'config.yml'))) {
  config = yaml.load(readFileSync(join(rootDir, 'config.yml'), 'utf-8'));
} else {
  console.log('No config.yml found, using config.example.yml');
  config = yaml.load(readFileSync(join(rootDir, 'config.example.yml'), 'utf-8'));
}

const bridges = {
  gatesnotes: () => import('./bridges/gatesnotes.js').then(m => m.fetchGatesNotes())
};

async function fetchRssFeed(id, source) {
  try {
    console.log(`Fetching ${source.name}...`);
    const result = await parser.parseURL(source.url);
    return result.items.map(item => ({
      title: item.title || 'Untitled',
      link: item.link || '#',
      date: item.isoDate || item.pubDate || null,
      sourceId: id,
      source: source.name,
      description: item.contentSnippet || item.content || ''
    }));
  } catch (error) {
    console.error(`Failed to fetch ${source.name}: ${error.message}`);
    return [];
  }
}

async function fetchSource(id) {
  const source = allSources[id];
  if (!source) {
    console.error(`Unknown source: ${id}`);
    return [];
  }

  if (source.type === 'bridge') {
    if (bridges[id]) {
      try {
        console.log(`Fetching ${source.name} (bridge)...`);
        const articles = await bridges[id]();
        return articles.map(a => ({ ...a, sourceId: id }));
      } catch (error) {
        console.error(`Failed to fetch ${source.name}: ${error.message}`);
        return [];
      }
    } else {
      console.error(`No bridge found for: ${id}`);
      return [];
    }
  }

  return fetchRssFeed(id, source);
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(text, maxLength = 200) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown date';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function generateHtml(articles, groups, sourceNames) {
  const groupNames = Object.keys(groups);
  const firstGroup = groupNames[0] || 'All';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RSS Feed</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #e5e5e5;
      line-height: 1.6;
      padding: 2rem;
      max-width: 900px;
      margin: 0 auto;
    }

    header {
      margin-bottom: 2rem;
    }

    .group-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid #333;
    }

    .source-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      padding-top: 1rem;
    }

    .tab {
      background: #1a1a1a;
      border: 1px solid #333;
      color: #e5e5e5;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .tab:hover {
      background: #252525;
      border-color: #444;
    }

    .tab.active {
      background: #333;
      border-color: #60a5fa;
      color: #fff;
    }

    .tab.saved-tab {
      margin-left: auto;
    }

    .filter-btn {
      background: #1a1a1a;
      border: 1px solid #282828;
      color: #999;
      padding: 0.3rem 0.7rem;
      border-radius: 3px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
    }

    .filter-btn:hover {
      background: #222;
      color: #ccc;
    }

    .filter-btn.active {
      background: #2a2a2a;
      border-color: #60a5fa;
      color: #fff;
    }

    .article {
      padding: 1.5rem 0;
      border-bottom: 1px solid #222;
      position: relative;
    }

    .article:last-child {
      border-bottom: none;
    }

    .article.hidden {
      display: none;
    }

    .article-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .article-content {
      flex: 1;
    }

    .meta {
      display: flex;
      gap: 1rem;
      font-size: 0.85rem;
      color: #888;
      margin-bottom: 0.5rem;
    }

    .source {
      color: #60a5fa;
    }

    .title {
      font-size: 1.1rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
    }

    .title a {
      color: #fff;
      text-decoration: none;
    }

    .title a:hover {
      color: #60a5fa;
    }

    .description {
      font-size: 0.9rem;
      color: #a3a3a3;
    }

    .save-btn {
      background: none;
      border: 1px solid #333;
      color: #666;
      padding: 0.4rem 0.6rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .save-btn:hover {
      border-color: #60a5fa;
      color: #60a5fa;
    }

    .save-btn.saved {
      background: #1e3a5f;
      border-color: #60a5fa;
      color: #60a5fa;
    }

    #savedArticles {
      display: none;
    }

    #savedArticles.active {
      display: block;
    }

    #feedArticles.hidden {
      display: none;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #666;
    }
  </style>
</head>
<body>
  <header>
    <div class="group-tabs">
      ${groupNames.map((name, i) =>
        `<button class="tab${i === 0 ? ' active' : ''}" data-group="${escapeHtml(name)}">${escapeHtml(name)}</button>`
      ).join('\n      ')}
      <button class="tab saved-tab" data-group="__saved__">Saved</button>
    </div>
    <div class="source-filters" id="sourceFilters"></div>
  </header>

  <main id="feedArticles">
    ${articles.map(article => `
    <article class="article" data-source="${escapeHtml(article.sourceId)}" data-link="${escapeHtml(article.link)}">
      <div class="article-header">
        <div class="article-content">
          <div class="meta">
            <span class="source">${escapeHtml(article.source)}</span>
            <span class="date">${formatDate(article.date)}</span>
          </div>
          <h2 class="title">
            <a href="${escapeHtml(article.link)}" target="_blank" rel="noopener">${escapeHtml(article.title)}</a>
          </h2>
          ${article.description ? `<p class="description">${escapeHtml(truncate(article.description))}</p>` : ''}
        </div>
        <button class="save-btn" data-link="${escapeHtml(article.link)}" data-title="${escapeHtml(article.title)}" data-source="${escapeHtml(article.source)}" data-source-id="${escapeHtml(article.sourceId)}" data-date="${article.date || ''}" data-description="${escapeHtml(truncate(article.description || ''))}">Save</button>
      </div>
    </article>`).join('')}
  </main>

  <main id="savedArticles">
    <div class="empty-state" id="emptyState">No saved articles yet</div>
  </main>

  <script>
    const groups = ${JSON.stringify(groups)};
    const sourceNames = ${JSON.stringify(sourceNames)};

    let currentGroup = '${escapeHtml(firstGroup)}';
    let currentSource = 'all';
    let savedLinks = new Set();

    // Format date helper
    function formatDate(dateStr) {
      if (!dateStr) return 'Unknown date';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Unknown date';
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    // Load saved articles state
    async function loadSavedState() {
      try {
        const links = Array.from(document.querySelectorAll('.save-btn')).map(btn => btn.dataset.link);
        const res = await fetch('/api/saved/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ links })
        });
        const data = await res.json();
        savedLinks = new Set(data.saved);
        updateSaveButtons();
      } catch (e) {
        console.error('Failed to load saved state:', e);
      }
    }

    function updateSaveButtons() {
      document.querySelectorAll('.save-btn').forEach(btn => {
        if (savedLinks.has(btn.dataset.link)) {
          btn.classList.add('saved');
          btn.textContent = 'Saved';
        } else {
          btn.classList.remove('saved');
          btn.textContent = 'Save';
        }
      });
    }

    // Save/unsave article
    async function toggleSave(btn) {
      const link = btn.dataset.link;
      const isSaved = savedLinks.has(link);

      try {
        if (isSaved) {
          await fetch('/api/save', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ link })
          });
          savedLinks.delete(link);
        } else {
          await fetch('/api/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              link,
              title: btn.dataset.title,
              source: btn.dataset.source,
              sourceId: btn.dataset.sourceId,
              date: btn.dataset.date || null,
              description: btn.dataset.description
            })
          });
          savedLinks.add(link);
        }
        updateSaveButtons();
      } catch (e) {
        console.error('Failed to toggle save:', e);
      }
    }

    // Load and render saved articles
    async function loadSavedArticles() {
      try {
        const res = await fetch('/api/saved');
        const articles = await res.json();
        const container = document.getElementById('savedArticles');
        const emptyState = document.getElementById('emptyState');

        if (articles.length === 0) {
          emptyState.style.display = 'block';
          container.querySelectorAll('.article').forEach(el => el.remove());
          return;
        }

        emptyState.style.display = 'none';
        container.querySelectorAll('.article').forEach(el => el.remove());

        articles.forEach(article => {
          const el = document.createElement('article');
          el.className = 'article';
          el.innerHTML = \`
            <div class="article-header">
              <div class="article-content">
                <div class="meta">
                  <span class="source">\${article.source || ''}</span>
                  <span class="date">\${formatDate(article.date)}</span>
                </div>
                <h2 class="title">
                  <a href="\${article.link}" target="_blank" rel="noopener">\${article.title}</a>
                </h2>
                \${article.description ? \`<p class="description">\${article.description}</p>\` : ''}
              </div>
              <button class="save-btn saved" data-link="\${article.link}">Saved</button>
            </div>
          \`;
          el.querySelector('.save-btn').addEventListener('click', async (e) => {
            await fetch('/api/save', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ link: article.link })
            });
            savedLinks.delete(article.link);
            updateSaveButtons();
            loadSavedArticles();
          });
          container.appendChild(el);
        });
      } catch (e) {
        console.error('Failed to load saved articles:', e);
      }
    }

    function filterArticles() {
      if (currentGroup === '__saved__') return;

      const groupSources = groups[currentGroup] || [];
      document.querySelectorAll('#feedArticles .article').forEach(article => {
        const sourceId = article.dataset.source;
        const inGroup = groupSources.includes(sourceId);
        const matchesSource = currentSource === 'all' || sourceId === currentSource;

        if (inGroup && matchesSource) {
          article.classList.remove('hidden');
        } else {
          article.classList.add('hidden');
        }
      });
    }

    function renderSourceFilters() {
      const container = document.getElementById('sourceFilters');

      if (currentGroup === '__saved__') {
        container.innerHTML = '';
        return;
      }

      const sources = groups[currentGroup] || [];

      let html = '<button class="filter-btn active" data-source="all">All</button>';
      sources.forEach(id => {
        const name = sourceNames[id] || id;
        html += \`<button class="filter-btn" data-source="\${id}">\${name}</button>\`;
      });

      container.innerHTML = html;

      container.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          currentSource = btn.dataset.source;
          filterArticles();
        });
      });
    }

    function switchToGroup(groupName) {
      currentGroup = groupName;
      currentSource = 'all';

      const feedArticles = document.getElementById('feedArticles');
      const savedArticles = document.getElementById('savedArticles');

      if (groupName === '__saved__') {
        feedArticles.classList.add('hidden');
        savedArticles.classList.add('active');
        loadSavedArticles();
      } else {
        feedArticles.classList.remove('hidden');
        savedArticles.classList.remove('active');
      }

      renderSourceFilters();
      filterArticles();
    }

    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        switchToGroup(tab.dataset.group);
      });
    });

    document.querySelectorAll('.save-btn').forEach(btn => {
      btn.addEventListener('click', () => toggleSave(btn));
    });

    // Initial render
    loadSavedState();
    renderSourceFilters();
    filterArticles();
  </script>
</body>
</html>`;
}

async function main() {
  const groups = config.groups || {};

  const allSourceIds = [...new Set(Object.values(groups).flat())];

  const sourceNames = {};
  for (const id of allSourceIds) {
    if (allSources[id]) {
      sourceNames[id] = allSources[id].name;
    }
  }

  console.log(`Fetching ${allSourceIds.length} sources...\n`);

  const results = await Promise.all(allSourceIds.map(fetchSource));
  const allArticles = results.flat();

  allArticles.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  console.log(`\nTotal articles: ${allArticles.length}`);

  const html = generateHtml(allArticles, groups, sourceNames);
  writeFileSync(join(rootDir, 'index.html'), html);

  console.log('Generated index.html');
}

main().then(() => process.exit(0));
