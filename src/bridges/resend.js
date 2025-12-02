import * as cheerio from 'cheerio';

const BLOG_URL = 'https://resend.com/blog';

const headers = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
};

export async function fetchResend() {
  try {
    console.log('Fetching Resend (bridge)...');

    const response = await fetch(BLOG_URL, { headers });

    if (!response.ok) {
      throw new Error(`Status code ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const articles = [];
    const seen = new Set();

    $('li').each((i, el) => {
      const $li = $(el);
      const $link = $li.find('a[href^="/blog/"]').first();
      const href = $link.attr('href');

      if (!href || href === '/blog' || seen.has(href)) return;
      seen.add(href);

      const link = `https://resend.com${href}`;

      const $time = $li.find('time[dateTime]');
      const date = $time.attr('datetime') || null;

      let title = $li.find('h2, h3').first().text().trim();
      if (!title) {
        const $img = $link.find('img');
        title = $img.attr('alt') || '';
      }

      if (!title || title.length < 5) return;

      articles.push({
        title,
        link,
        date: date ? new Date(date).toISOString() : null,
        source: 'Resend',
        description: ''
      });
    });

    return articles;
  } catch (error) {
    console.error(`Failed to fetch Resend: ${error.message}`);
    return [];
  }
}
