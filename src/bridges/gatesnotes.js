const API_URL = 'https://content.gatesnotes.com/12514eb8-7b51-008e-41a9-512542cf683b/items?system.type=article&depth=0&limit=30&order=elements.date[desc]';

const headers = {
  'Accept': 'application/json, text/plain, */*',
  'Origin': 'https://www.gatesnotes.com',
  'Referer': 'https://www.gatesnotes.com/',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
  'sec-ch-ua': '"Not_A Brand";v="99", "Chromium";v="142"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"macOS"',
};

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

export async function fetchGatesNotes() {
  try {
    console.log('Fetching Gates Notes (bridge)...');

    const response = await fetch(API_URL, { headers });

    if (!response.ok) {
      throw new Error(`Status code ${response.status}`);
    }

    const data = await response.json();
    const articles = [];

    if (data && data.items) {
      for (const item of data.items) {
        const elements = item.elements || {};
        const system = item.system || {};

        const title = elements.article_title?.value || system.name || '';
        const date = elements.date?.value || null;
        const subtitle = stripHtml(elements.article_subtitle?.value || '');
        const codename = system.codename || '';

        if (title && codename) {
          const slug = codename.replace(/_/g, '-');
          const link = `https://www.gatesnotes.com/${slug}`;

          articles.push({
            title,
            link,
            date,
            source: 'Gates Notes',
            description: subtitle
          });
        }
      }
    }

    return articles;
  } catch (error) {
    console.error(`Failed to fetch Gates Notes: ${error.message}`);
    return [];
  }
}
