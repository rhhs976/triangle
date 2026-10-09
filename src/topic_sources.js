// Topic sources provider: generates 2 authoritative website references for the searched topic
// Each half includes: link, logo, description, and an image (if available).

export function getTopicWebsites(topic, category, details = {}) {
  const cleanTopic = (topic || '').trim();
  const lower = cleanTopic.toLowerCase();

  // Logos as clean SVGs/Favicons
  const WIKIPEDIA_LOGO = 'https://en.wikipedia.org/static/favicon/wikipedia.ico';
  const BRITANNICA_LOGO = 'https://www.britannica.com/favicon.ico';
  const MERRIAM_LOGO = 'https://www.merriam-webster.com/favicon.ico';
  const NATGEO_LOGO = 'https://www.nationalgeographic.com/favicon.ico';
  const NASA_LOGO = 'https://www.nasa.gov/favicon.ico';
  const TRIANGLE_LOGO = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><polygon points="12,2 22,21 2,21" fill="%23000000"/></svg>';

  // Handle special custom user word
  if (lower === 'fargenegletasanduegomadhascarsgask') {
    return [
      {
        siteName: 'triangle Knowledge Registry',
        domain: 'triangle.local',
        url: `http://localhost:3000/?q=${encodeURIComponent(cleanTopic)}`,
        logo: TRIANGLE_LOGO,
        title: 'Fargenegletasanduegomadhascarsgask',
        description: 'Official user-coined declarative vow signifying an absolute refusal to fly or travel by airplane. Preserved in the triangle lexicon.',
        image: 'https://images.unsplash.com/photo-1542296332-2e4473faf563?w=500&auto=format&fit=crop&q=80' // Airplane on tarmac / grounded
      },
      {
        siteName: 'Wiktionary Neologisms',
        domain: 'en.wiktionary.org',
        url: `https://en.wiktionary.org/wiki/${encodeURIComponent(cleanTopic)}`,
        logo: 'https://en.wiktionary.org/static/favicon/wiktionary.ico',
        title: 'Neologism Entry: fargenegletasanduegomadhascarsgask',
        description: 'Contemporary expressive terminology expressing severe aerophobia and permanent commitment to ground transportation.',
        image: 'https://images.unsplash.com/photo-1519074069444-1ba4eae16e6e?w=500&auto=format&fit=crop&q=80' // Railway / road travel
      }
    ];
  }

  // Handle bird / animal topics (e.g. Shima Enaga)
  if (lower.includes('shima enaga') || lower.includes('tit') || lower.includes('bird')) {
    const queryTerm = lower.includes('shima enaga') ? 'Long-tailed tit' : cleanTopic;
    return [
      {
        siteName: 'Wikipedia',
        domain: 'en.wikipedia.org',
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(queryTerm)}`,
        logo: WIKIPEDIA_LOGO,
        title: `${cleanTopic} — Free Encyclopedia`,
        description: 'A comprehensive scientific overview detailing habitat, plumage characteristics, subspecific variations, and ecological behavior.',
        image: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/%D0%94%D0%BE%D0%BB%D0%B3%D0%BE%D1%85%D0%B2%D0%BE%D1%81%D1%82%D0%B0%D1%8F_%D1%81%D0%B8%D0%BD%D0%B8%D1%86%D0%B0_%28%D0%BE%D0%BF%D0%BE%D0%BB%D0%BE%D0%B2%D0%BD%D0%B8%D0%BA%29.jpg/320px-%D0%94%D0%BE%D0%BB%D0%B3%D0%BE%D1%85%D0%B2%D0%BE%D1%81%D1%82%D0%B0%D1%8F_%D1%81%D0%B8%D0%BD%D0%B8%D1%86%D0%B0_%28%D0%BE%D0%BF%D0%BE%D0%BB%D0%BE%D0%B2%D0%BD%D0%B8%D0%BA%29.jpg'
      },
      {
        siteName: 'National Geographic Animals',
        domain: 'nationalgeographic.com',
        url: `https://www.nationalgeographic.com/search?q=${encodeURIComponent(cleanTopic)}`,
        logo: NATGEO_LOGO,
        title: `${cleanTopic} | Wild Wildlife Profiles`,
        description: 'High-definition field photography, nesting habits, and vocalization patterns in natural subalpine habitats.',
        image: 'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=500&auto=format&fit=crop&q=80'
      }
    ];
  }

  // Handle space / physics topics
  if (lower.includes('apollo') || lower.includes('space') || lower.includes('moon') || lower.includes('telescope') || lower.includes('boson')) {
    return [
      {
        siteName: 'NASA Missions & Science',
        domain: 'nasa.gov',
        url: `https://www.nasa.gov/search/?q=${encodeURIComponent(cleanTopic)}`,
        logo: NASA_LOGO,
        title: `${cleanTopic} — NASA Exploration Archives`,
        description: 'Official historical documents, flight telemetry, mission photography, and astronomical observatory records.',
        image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=500&auto=format&fit=crop&q=80'
      },
      {
        siteName: 'Encyclopædia Britannica',
        domain: 'britannica.com',
        url: `https://www.britannica.com/topic/${encodeURIComponent(cleanTopic.replace(/\s+/g, '-'))}`,
        logo: BRITANNICA_LOGO,
        title: `${cleanTopic} | Britannica Academic`,
        description: 'Peer-reviewed scholarly analysis examining technological development, physical principles, and scientific significance.',
        image: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=500&auto=format&fit=crop&q=80'
      }
    ];
  }

  // Standard Dictionary & Topic Fallback (Wikipedia + Britannica / Merriam-Webster)
  return [
    {
      siteName: 'Wikipedia',
      domain: 'en.wikipedia.org',
      url: `https://en.wikipedia.org/wiki/${encodeURIComponent(cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1))}`,
      logo: WIKIPEDIA_LOGO,
      title: `${cleanTopic} — Wikipedia, the free encyclopedia`,
      description: details.explanation
        ? details.explanation.split('.')[0] + '.'
        : `Comprehensive overview, historical context, and classification of ${cleanTopic}.`,
      image: lower === 'apple' 
        ? 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Pink_lady_and_cross_section.jpg/330px-Pink_lady_and_cross_section.jpg'
        : lower === 'diamond'
        ? 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/87/Rough_Diamond.jpg/320px-Rough_Diamond.jpg'
        : null
    },
    {
      siteName: 'Encyclopædia Britannica',
      domain: 'britannica.com',
      url: `https://www.britannica.com/topic/${encodeURIComponent(cleanTopic.replace(/\s+/g, '-'))}`,
      logo: BRITANNICA_LOGO,
      title: `${cleanTopic} | Definition, History & Facts`,
      description: `In-depth exploration from Encyclopædia Britannica editors covering origin, structural properties, and global significance of ${cleanTopic}.`,
      image: null
    }
  ];
}

/**
 * Returns 3 clean, highly-relevant related search inquiries
 */
export function getRelatedQueries(query, category, title, details = {}) {
  const cleanQ = (query || '').trim();
  const lower = cleanQ.toLowerCase();

  // Unit / Currency conversion queries
  if (category === 'Unit Conversion' || category === 'Currency Conversion') {
    const d = details || {};
    if (d.type === 'Length') {
      return ['100 km to miles', '50 miles to km', 'how many feet in a mile'];
    }
    if (d.type === 'Temperature') {
      return ['0 celsius to fahrenheit', '100 celsius to fahrenheit', 'absolute zero in celsius'];
    }
    if (d.type === 'Weight') {
      return ['100 lbs to kg', '50 kg to lbs', 'how many grams in an ounce'];
    }
    if (d.type === 'Currency') {
      return ['100 usd to eur', '100 usd to gbp', '100 eur to usd'];
    }
    if (d.type === 'Data') {
      return ['1024 mb to gb', '1 tb to gb', 'how many bytes in a kilobyte'];
    }
    return ['100 km to miles', '32 f to c', '100 usd to eur'];
  }

  // Math queries
  if (category === 'Math') {
    return ['square root of 144', '15 percent of 200', '2 to the power of 10'];
  }

  // Dictionary entries
  if (category === 'Dictionary') {
    const word = (title || cleanQ).replace(/\*\*/g, '').trim();
    return [
      `synonyms of ${word}`,
      `antonyms of ${word}`,
      `how to use ${word} in a sentence`
    ];
  }

  // Specific political or entity inquiries
  const pmMatch = cleanQ.match(/^who\s+is\s+(?:the\s+)?prime\s+minister\s+of\s+(.+)$/i);
  if (pmMatch) {
    const country = pmMatch[1].replace(/\?/g, '').trim();
    return [`capital of ${country}`, `population of ${country}`, `parliament of ${country}`];
  }

  const presMatch = cleanQ.match(/^who\s+is\s+(?:the\s+)?president\s+of\s+(.+)$/i);
  if (presMatch) {
    const country = presMatch[1].replace(/\?/g, '').trim();
    return [`capital of ${country}`, `government of ${country}`, `history of ${country}`];
  }

  const ceoMatch = cleanQ.match(/^who\s+is\s+(?:the\s+)?ceo\s+of\s+(.+)$/i);
  if (ceoMatch) {
    const company = ceoMatch[1].replace(/\?/g, '').trim();
    return [`when was ${company} founded`, `headquarters of ${company}`, `revenue of ${company}`];
  }

  const capMatch = cleanQ.match(/^what\s+is\s+(?:the\s+)?capital\s+of\s+(.+)$/i);
  if (capMatch) {
    const country = capMatch[1].replace(/\?/g, '').trim();
    return [`population of ${country}`, `currency of ${country}`, `languages of ${country}`];
  }

  // Questions about fruits, animals, nature
  if (lower.includes('apple')) {
    return ['Why are apples red?', 'Are there naturally blue fruits?', 'Health benefits of apples'];
  }
  if (lower.includes('penguin')) {
    return ['Where do penguins live?', 'Can penguins swim?', 'How do penguins stay warm?'];
  }
  if (lower.includes('sky')) {
    return ['Why is the sunset red?', 'Why is space black?', 'What is Rayleigh scattering?'];
  }

  // Dynamic entity/topic decomposition
  const tokens = cleanQ.replace(/[?.,!]/g, '').split(/\s+/).filter(w => w.length > 3 && !['what', 'where', 'when', 'which', 'does', 'have', 'with', 'about'].includes(w.toLowerCase()));
  if (tokens.length >= 2) {
    const topic = tokens.slice(0, 2).join(' ');
    return [
      `what causes ${topic}`,
      `why is ${topic} important`,
      `history of ${topic}`
    ];
  } else if (tokens.length === 1) {
    return [
      `what is ${tokens[0]}`,
      `define ${tokens[0]}`,
      `facts about ${tokens[0]}`
    ];
  }

  return [
    'what is photosynthesis',
    'who is the ceo of microsoft',
    'why is the sky blue'
  ];
}

