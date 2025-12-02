import * as cheerio from 'cheerio';

const RESEARCH_URL = 'https://www.anthropic.com/research';

const headers = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Cache-Control': 'no-cache',
};

const dateFormats = [
  /^([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})$/,
  /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/,
];

const months = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function parseDate(dateText) {
  if (!dateText) return null;

  const text = dateText.trim();

  const match1 = text.match(/^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/);
  if (match1) {
    const month = months[match1[1].toLowerCase()];
    if (month !== undefined) {
      return new Date(parseInt(match1[3]), month, parseInt(match1[2])).toISOString();
    }
  }

  const match2 = text.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (match2) {
    const month = months[match2[2].toLowerCase()];
    if (month !== undefined) {
      return new Date(parseInt(match2[3]), month, parseInt(match2[1])).toISOString();
    }
  }

  const parsed = new Date(text);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return null;
}

function extractTitle(element, $) {
  const selectors = ['h3', 'h2', 'h1', '[class*="headline"]', '[class*="title"]'];

  for (const selector of selectors) {
    const elem = $(element).find(selector).first();
    if (elem.length) {
      const title = elem.text().trim().replace(/\s+/g, ' ');
      if (title.length >= 5) {
        return title;
      }
    }
  }

  const text = $(element).text().trim().replace(/\s+/g, ' ');
  if (text.length >= 5 && text.length < 200) {
    return text;
  }

  return null;
}

function extractDate(element, $) {
  const selectors = [
    'p.detail-m',
    '.detail-m',
    'time',
    '[class*="timestamp"]',
    '[class*="date"]',
    '.text-label',
  ];

  const elementsToCheck = [element, $(element).parent(), $(element).parent().parent()];

  for (const el of elementsToCheck) {
    for (const selector of selectors) {
      const dateElem = $(el).find(selector).first();
      if (dateElem.length) {
        const dateText = dateElem.text().trim();
        const parsed = parseDate(dateText);
        if (parsed) return parsed;
      }
    }
  }

  return null;
}

export async function fetchAnthropic() {
  try {
    console.log('Fetching Anthropic Research (bridge)...');

    const response = await fetch(RESEARCH_URL, { headers });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const articles = [];
    const seenLinks = new Set();

    const researchLinks = $('a[href*="/research/"]');
    console.log(`Found ${researchLinks.length} potential research links`);

    researchLinks.each((_, link) => {
      try {
        const href = $(link).attr('href');
        if (!href) return;

        if (href === '/research' || href === '/research/') return;

        let fullUrl;
        if (href.startsWith('https://')) {
          fullUrl = href;
        } else if (href.startsWith('/')) {
          fullUrl = 'https://www.anthropic.com' + href;
        } else {
          return;
        }

        if (seenLinks.has(fullUrl)) return;
        seenLinks.add(fullUrl);

        const title = extractTitle(link, $);
        if (!title) return;

        const date = extractDate(link, $);
        if (!date) return;

        articles.push({
          title,
          link: fullUrl,
          date,
          source: 'Anthropic',
          description: '',
        });
      } catch (err) {
        // Skip this link on error
      }
    });

    console.log(`Parsed ${articles.length} Anthropic research articles`);
    return articles;

  } catch (error) {
    console.error(`Failed to fetch Anthropic Research: ${error.message}`);
    return [];
  }
}
