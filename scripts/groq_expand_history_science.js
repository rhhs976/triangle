import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILES_DIR = path.resolve(__dirname, '../files');
const JSON_PATH = path.join(FILES_DIR, 'historical_events_rag_seed.json');
const DB_PATH = path.join(FILES_DIR, 'historical_events_dictionary.db');
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

const MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b'
];

const TOPICS = [
  // Science & Technological Breakthroughs
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "How the Apollo 11 Mission Flew to the Moon and Landed",
    detail: "Explain the exact chronological sequence of Apollo 11's lunar journey: Saturn V launch, Earth orbit, Trans-Lunar Injection (TLI), Command Module Columbia and Lunar Module Eagle separation, lunar descent, and touchdown at the Sea of Tranquility on July 20, 1969."
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "The Apollo 11 Astronauts and Their Life Status",
    detail: "Explain who the three Apollo 11 astronauts were (Neil Armstrong, Michael Collins, Buzz Aldrin), their specific flight roles, Armstrong's death in 2012, Collins' death in 2021, and that Buzz Aldrin is the sole surviving crew member alive today."
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "Discovery of the DNA Double Helix",
    detail: "James Watson, Francis Crick, Rosalind Franklin's Photo 51, Maurice Wilkins, April 25, 1953 Nature paper, Cavendish Laboratory, antiparallel double helix structure, nucleotide base pairing (A-T, C-G)."
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "Einstein's Theories of Special and General Relativity",
    detail: "Albert Einstein, 1905 Annus Mirabilis (speed of light constancy, E=mc²), 1915 General Relativity (spacetime curvature by mass/energy, bending of starlight verified during 1919 solar eclipse by Arthur Eddington)."
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "Founding of Quantum Mechanics and the Copenhagen Interpretation",
    detail: "Max Planck 1900 energy quanta, Niels Bohr atomic model, Louis de Broglie wave-particle duality, Werner Heisenberg uncertainty principle 1927, Erwin Schrödinger wave equation."
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "Discovery of Radioactivity and Radium by Marie and Pierre Curie",
    detail: "Henri Becquerel 1896 uranium discovery, Marie and Pierre Curie isolating polonium and radium from pitchblende in 1898, spontaneous decay of unstable atomic nuclei, first woman to win Nobel Prize."
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "Publication of Mendeleev's Periodic Table of Elements",
    detail: "Dmitri Mendeleev, March 6, 1869 presentation to Russian Chemical Society, organizing elements by atomic mass and recurring periodic valence properties, famously predicting undiscovered elements like gallium and germanium."
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "The Big Bang Theory and Discovery of Cosmic Microwave Background",
    detail: "Georges Lemaître 1927 expanding universe hypothesis, Edwin Hubble 1929 galactic redshift measurements, Arno Penzias and Robert Wilson 1964 Holmdel Horn Antenna detecting 2.7 Kelvin cosmic microwave background radiation."
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "Discovery of Nuclear Fission",
    detail: "December 1938, Otto Hahn and Fritz Strassmann bombarding uranium with neutrons in Berlin, Lise Meitner and Otto Frisch theoretically explaining nuclear splitting of uranium into barium with enormous energy release."
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "Invention of the Point-Contact and Junction Transistor",
    detail: "December 16, 1947, John Bardeen, Walter Brattain, and William Shockley at Bell Labs creating the germanium transistor, replacing bulky vacuum tubes, igniting modern solid-state microelectronics and digital computers."
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "Discovery of the Electron by J.J. Thomson",
    detail: "April 30, 1897, J.J. Thomson at Cavendish Laboratory Cambridge using cathode ray tubes to measure the charge-to-mass ratio of corpuscles, proving subatomic particles smaller than atoms exist."
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "Formulation of the Germ Theory of Disease",
    detail: "1860s to 1880s, Louis Pasteur disproving spontaneous generation and inventing pasteurization, Robert Koch identifying specific bacterial pathogens for anthrax and tuberculosis, establishing modern aseptic medicine."
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "Theory of Continental Drift and Plate Tectonics",
    detail: "Alfred Wegener 1912 proposing Pangaea and continental drift, confirmed in the 1960s through seafloor spreading, magnetic striping, and subduction zones explaining earthquakes and mountain building."
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "Completion of the Human Genome Project",
    detail: "October 1990 to April 2003, international public consortium led by Francis Collins and Craig Venter's Celera Genomics sequencing 3 billion DNA base pairs of the complete human genetic code."
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "CRISPR-Cas9 Bacterial Immunity and Precision Gene Editing",
    detail: "June 2012, Jennifer Doudna and Emmanuelle Charpentier engineering the Streptococcus pyogenes Cas9 endonuclease and guide RNA into molecular scissors for precise programmable genome editing."
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "First Direct Detection of Gravitational Waves by LIGO",
    detail: "September 14, 2015, Laser Interferometer Gravitational-Wave Observatory (LIGO) detecting GW150914, ripples in spacetime caused by two colliding black holes 1.3 billion light-years away, confirming Einstein's 1915 prediction."
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "Invention of the Working Laser by Theodore Maiman",
    detail: "May 16, 1960, Theodore Maiman at Hughes Research Laboratories producing coherent optical radiation using a synthetic ruby crystal pulsed by a xenon flash lamp, pioneering laser optics in surgery and telecommunications."
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "Launch and Discoveries of the Hubble Space Telescope",
    detail: "April 24, 1990, Space Shuttle Discovery deploying the Hubble Space Telescope above atmospheric distortion, capturing the Hubble Deep Field in 1995 and determining the precise rate of cosmic expansion."
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    topic: "Discovery of the Higgs Boson at the Large Hadron Collider",
    detail: "July 4, 2012, CERN's ATLAS and CMS experiments at the Large Hadron Collider in Geneva announcing the observation of the Higgs boson, confirming the Brout-Englert-Higgs field providing mass to fundamental particles."
  },
  // Additional Landmark World History
  {
    era: "Classical Antiquity & Ancient Empires",
    topic: "The Peloponnesian War Between Athens and Sparta",
    detail: "431 to 404 BC, protracted conflict between the Delian League led by democratic Athens and the Peloponnesian League led by militaristic Sparta, recorded by Thucydides, ending in Athenian defeat and the collapse of the Athenian Golden Age."
  },
  {
    era: "Classical Antiquity & Ancient Empires",
    topic: "The Fall of the Western Roman Empire",
    detail: "September 4, 476 AD, Germanic chieftain Odoacer deposing sixteen-year-old Western Roman Emperor Romulus Augustulus in Ravenna, sending the imperial insignia to Constantinople and inaugurating the early medieval era in Western Europe."
  },
  {
    era: "The Medieval Era & Global Dynasties",
    topic: "Coronation of Charlemagne as Holy Roman Emperor",
    detail: "December 25, 800 AD, Pope Leo III crowning King Charlemagne of the Franks as Emperor of the Romans in Old Saint Peter's Basilica in Rome, establishing the Holy Roman Empire and uniting Western Europe."
  },
  {
    era: "The Medieval Era & Global Dynasties",
    topic: "The Black Death Pandemic in Europe",
    detail: "1347 to 1351, the devastating bubonic plague pandemic caused by Yersinia pestis carried by fleas on black rats arriving via Genoese trade ships, killing an estimated one-third to half of Europe's population and transforming feudal economics."
  },
  {
    era: "The Medieval Era & Global Dynasties",
    topic: "Fall of Constantinople to the Ottoman Empire",
    detail: "May 29, 1453, twenty-one-year-old Ottoman Sultan Mehmed II capturing the Byzantine capital after a 53-day siege utilizing massive bronze bombard cannons, ending the 1,100-year Roman Empire and dispersing Greek scholars to Renaissance Italy."
  },
  {
    era: "Revolutions, Rights & Modern Transformations",
    topic: "The Protestant Reformation and Luther's 95 Theses",
    detail: "October 31, 1517, Catholic monk Martin Luther nailing his Ninety-Five Theses to the All Saints' Church door in Wittenberg, protesting church indulgences and sparking the Protestant Reformation across Europe."
  },
  {
    era: "Revolutions, Rights & Modern Transformations",
    topic: "The American Civil War and the Emancipation Proclamation",
    detail: "1861 to 1865, conflict between the United States Union and eleven seceding Confederate states over slavery, President Abraham Lincoln issuing the Emancipation Proclamation on January 1, 1863, and the passage of the 13th Amendment abolishing slavery."
  },
  {
    era: "The 20th Century & The Digital Age",
    topic: "The Manhattan Project and the Trinity Nuclear Test",
    detail: "July 16, 1945, secret US-led research project directed by J. Robert Oppenheimer and General Leslie Groves detonating the world's first atomic bomb, code-named Gadget, in the New Mexico desert, inaugurating the Nuclear Age."
  },
  {
    era: "The 20th Century & The Digital Age",
    topic: "Founding of the United Nations",
    detail: "October 24, 1945, ratification of the United Nations Charter in San Francisco by 50 nations following the devastation of World War II, replacing the League of Nations to preserve global peace, security, and international cooperation."
  },
  {
    era: "The 20th Century & The Digital Age",
    topic: "The Fall of the Berlin Wall",
    detail: "November 9, 1989, East German official Günter Schabowski accidentally announcing immediate border opening, prompting ecstatic citizens to breach checkpoints and physically dismantle the Berlin Wall, symbolizing the end of the Cold War."
  }
];

function callGroqApi(model, payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ ...payload, model });
    const req = https.request('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 25000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) {
            reject({ isApiError: true, error: parsed.error });
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse Groq response: ${e.message}\nRaw: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Groq request timed out'));
    });
    req.write(postData);
    req.end();
  });
}

function cleanText(text) {
  return text
    .replace(/\[\d+\]/g, '')
    .replace(/\[citation needed\]/gi, '')
    .replace(/^["']|["']$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchWithModelRotation(payload) {
  let lastError = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    for (const model of MODELS) {
      try {
        const result = await callGroqApi(model, payload);
        return result;
      } catch (err) {
        if (err.isApiError && err.error?.message?.includes('Rate limit reached')) {
          // Extract sleep seconds if available
          const match = err.error.message.match(/try again in ([\d\.]+)s/);
          const waitSec = match ? Math.ceil(parseFloat(match[1])) : 15;
          console.log(`    ↳ Model ${model} rate limited. Rotating to next model...`);
          lastError = { waitSec, message: err.error.message };
          continue;
        }
        lastError = err;
      }
    }

    // If all models hit limits, wait the required duration
    const sleepTime = lastError?.waitSec ? Math.min(lastError.waitSec, 25) : 15;
    console.log(`    ⏳ All models temporarily rate limited. Cooling down for ${sleepTime}s...`);
    await new Promise(r => setTimeout(r, sleepTime * 1000));
  }

  throw new Error(lastError?.message || 'Exceeded retry attempts across all models');
}

export async function runGroqHistoryExpander() {
  console.log('======================================================================');
  console.log('   GROQ WORLD HISTORY & SCIENCE EXPANDER (1-PARAGRAPH HIGH QUALITY)   ');
  console.log('======================================================================');

  const rawSeed = fs.readFileSync(JSON_PATH, 'utf-8');
  const seed = JSON.parse(rawSeed);

  const db = new DatabaseSync(DB_PATH);
  const insertStmt = db.prepare(`
    INSERT OR REPLACE INTO history_dictionary (entity_id, entity_name, exact_date, verified_fact)
    VALUES (?, ?, ?, ?)
  `);

  const existsStmt = db.prepare('SELECT 1 FROM history_dictionary WHERE entity_id = ? OR entity_name = ?');

  let addedCount = 0;

  for (let i = 0; i < TOPICS.length; i++) {
    const item = TOPICS[i];
    const generatedId = item.topic.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 50);

    // Skip if already in database
    const alreadyExists = existsStmt.get(generatedId, item.topic);
    if (alreadyExists) {
      console.log(`[${i + 1}/${TOPICS.length}] Already recorded: ${item.topic} (skipping)`);
      continue;
    }

    console.log(`[${i + 1}/${TOPICS.length}] Generating: ${item.topic}...`);

    const prompt = `You are an elite scientific and historical scholar.
Generate a verified entry for the following topic:
Topic: "${item.topic}"
Target details: ${item.detail}

CRITICAL RULES:
1. Provide EXACTLY ONE rich, authoritative, educational paragraph (5 to 6 sentences).
2. Start directly with the narrative facts. NO introductory filler (NEVER write "Here is...", "In summary...", "Sure!").
3. Include exact dates, key people, and factual significance.
4. ABSOLUTELY NO bracket citations like [1], [2], or [citation needed].
5. NO copyright notices or robotic commentary.
6. Return your output strictly as a JSON object with:
   - "id": a unique snake_case string (e.g. "apollo_11_moon_flight_1969")
   - "title": a polished formal title (e.g. "The Apollo 11 Lunar Flight Profile and Landing")
   - "year": integer year (e.g. 1969 or -431 for BC)
   - "exact_date": string with exact date (e.g. "20 July 1969")
   - "summary": the full 1-paragraph text (5 to 6 sentences)
   - "keywords": an array of 6 to 8 exact search terms/names`;

    try {
      const response = await fetchWithModelRotation({
        messages: [
          { role: 'system', content: 'You are an expert encyclopedia editor. Output ONLY valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        console.warn(`  ! Empty response for ${item.topic}`);
        continue;
      }

      const parsed = JSON.parse(content);
      const cleanedSummary = cleanText(parsed.summary);
      const cleanedTitle = cleanText(parsed.title);
      const cleanedDate = cleanText(parsed.exact_date);
      const entityId = parsed.id || generatedId;

      let eraGroup = seed.historical_eras.find(e => e.era === item.era);
      if (!eraGroup) {
        eraGroup = { era: item.era, events: [] };
        seed.historical_eras.push(eraGroup);
      }

      const existingIndex = eraGroup.events.findIndex(e => e.id === entityId || e.title === cleanedTitle);
      const eventData = {
        id: entityId,
        title: cleanedTitle,
        year: parsed.year || 0,
        exact_date: cleanedDate,
        summary: cleanedSummary,
        keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [cleanedTitle]
      };

      if (existingIndex >= 0) {
        eraGroup.events[existingIndex] = eventData;
      } else {
        eraGroup.events.push(eventData);
      }

      insertStmt.run(entityId, cleanedTitle, cleanedDate, cleanedSummary);
      addedCount++;
      console.log(`  ✓ Generated: "${cleanedTitle}" (${cleanedDate})`);

      // Gentle pause to stay well below rate limit
      await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
      console.error(`  ✗ Error generating ${item.topic}:`, err.message);
    }
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(seed, null, 4), 'utf-8');
  console.log(`\n✓ Synchronized JSON RAG seed and SQLite database! Total new entries processed: ${addedCount}`);

  const countRow = db.prepare('SELECT COUNT(*) as total FROM history_dictionary').get();
  console.log(`✓ Total Verified Historical & Scientific Milestones in SQLite: ${countRow.total}`);
  console.log('======================================================================\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runGroqHistoryExpander().catch(console.error);
}
