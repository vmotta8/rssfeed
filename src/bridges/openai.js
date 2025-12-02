const RESEARCH_URL = 'https://openai.com/research/index/';

const headers = {
  'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'max-age=0',
  'sec-ch-ua': '"Chromium";v="142"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
  'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
};

export async function fetchOpenAI() {
  try {
    console.log('Fetching OpenAI Research (bridge)...');

    const response = await fetch(RESEARCH_URL, { headers });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();

    const articles = [];
    const seenSlugs = new Set();

    const pattern = /\\"id\\":\\"[^"\\]+\\",\\"slug\\":\\"(index\/[^"\\]+)\\",\\"categories\\":\[[^\]]*\],\\"title\\":\\"([^"\\]+)\\",\\"publicationDate\\":\\"([^"\\]+)\\"/g;

    const descriptions = {};
    const descPattern = /\\"slug\\":\\"(index\/[^"\\]+)\\"[\s\S]*?\\"seoFields\\":\{[^}]*\\"metaDescription\\":\\"([^"\\]+)\\"/g;

    let descMatch;
    while ((descMatch = descPattern.exec(html)) !== null) {
      const [, slug, desc] = descMatch;
      if (!descriptions[slug]) {
        descriptions[slug] = desc
          .replace(/\\u003e/g, '>')
          .replace(/\\u003c/g, '<')
          .replace(/\\"/g, '"');
      }
    }

    let match;
    while ((match = pattern.exec(html)) !== null) {
      const [, slug, title, pubDate] = match;

      if (seenSlugs.has(slug)) continue;
      seenSlugs.add(slug);

      let date = null;
      if (pubDate) {
        const parsed = new Date(pubDate);
        if (!isNaN(parsed.getTime())) {
          date = parsed.toISOString();
        }
      }

      const cleanTitle = title
        .replace(/\\u003e/g, '>')
        .replace(/\\u003c/g, '<')
        .replace(/\\"/g, '"');

      articles.push({
        title: cleanTitle,
        link: `https://openai.com/${slug}`,
        date,
        source: 'OpenAI',
        description: descriptions[slug] || cleanTitle,
      });
    }

    articles.sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      return new Date(b.date) - new Date(a.date);
    });

    console.log(`Parsed ${articles.length} OpenAI research articles`);
    return articles;

  } catch (error) {
    console.error(`Failed to fetch OpenAI Research: ${error.message}`);
    return [];
  }
}
