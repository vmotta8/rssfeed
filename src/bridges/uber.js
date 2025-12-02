const RSS_URL = 'https://www.uber.com/blog/engineering/rss/';

const headers = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  'sec-ch-ua': '"Not_A Brand";v="99", "Chromium";v="142"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1'
};

function parseXml(xml) {
  const articles = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];

    const title = (item.match(/<title>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/title>/) || [])[1]?.trim() || '';
    const link = (item.match(/<link>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/link>/) || [])[1]?.trim() || '';
    const pubDate = (item.match(/<pubDate>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/pubDate>/) || [])[1]?.trim() || '';
    const description = (item.match(/<description>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/description>/) || [])[1]?.trim() || '';

    const cleanDescription = description.replace(/<[^>]*>/g, '').trim();

    if (title && link) {
      articles.push({
        title,
        link,
        date: pubDate ? new Date(pubDate).toISOString() : null,
        source: 'Uber',
        description: cleanDescription
      });
    }
  }

  return articles;
}

export async function fetchUber() {
  try {
    console.log('Fetching Uber (bridge)...');

    const response = await fetch(RSS_URL, { headers });

    if (!response.ok) {
      throw new Error(`Status code ${response.status}`);
    }

    const xml = await response.text();
    return parseXml(xml);
  } catch (error) {
    console.error(`Failed to fetch Uber: ${error.message}`);
    return [];
  }
}
