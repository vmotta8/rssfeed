import * as cheerio from 'cheerio';

const ARTICLES_URL = 'https://paulgraham.com/articles.html';

const headers = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
};

export async function fetchPaulGraham() {
  try {
    console.log('Fetching Paul Graham (bridge)...');

    const response = await fetch(ARTICLES_URL, { headers });

    if (!response.ok) {
      throw new Error(`Status code ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const articles = [];
    const seen = new Set();

    $('a[href$=".html"]').each((i, el) => {
      const $el = $(el);
      const href = $el.attr('href');
      const title = $el.text().trim();

      if (!href || !title) return;
      if (href.includes('index.html') || href.includes('articles.html')) return;
      if (href.includes('books.html') || href.includes('arc.html')) return;
      if (href.includes('bel.html') || href.includes('lisp.html')) return;
      if (href.includes('antispam.html') || href.includes('faq.html')) return;
      if (href.includes('raq.html') || href.includes('quo.html')) return;
      if (href.includes('rss.html') || href.includes('bio.html')) return;
      if (href.includes('kedrosky.html')) return;
      if (href.startsWith('http')) return;
      if (seen.has(href)) return;
      if (title.length < 3 || title.length > 150) return;

      seen.add(href);

      const link = `https://paulgraham.com/${href}`;

      articles.push({
        title,
        link,
        source: 'Paul Graham',
        description: ''
      });
    });

    const now = new Date();
    return articles.slice(0, 30).map((article, i) => {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      return { ...article, date: date.toISOString() };
    });
  } catch (error) {
    console.error(`Failed to fetch Paul Graham: ${error.message}`);
    return [];
  }
}
