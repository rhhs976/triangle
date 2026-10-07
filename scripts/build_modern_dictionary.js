import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OLD_DB_FILE = path.resolve(__dirname, '../data/dictionary.db');
const MODERN_DB_FILE = path.resolve(__dirname, '../data/modern_dictionary.db');

// Curated modern 1-paragraph definitions for key vocabulary, nature, science, society, and modern terms
const CURATED_MODERN_DEFINITIONS = {
  "apple": "An apple is a round, edible fruit produced by the domesticated apple tree (Malus domestica), cultivated across temperate regions worldwide for its crisp flesh, sweet or tart flavor, and nutritional richness. Botanically classified as a pome within the rose family (Rosaceae), the fruit features smooth red, green, or yellow skin enclosing firm pulp and a central seed core. Cultivated in thousands of distinct varieties—ranging from sweet cultivars like Honeycrisp and Fuji to tart cooking varieties like Granny Smith—apples represent one of the most widely consumed orchard crops on Earth, utilized for fresh consumption, culinary baking, and the production of cider and juice. Beyond agriculture, the apple occupies a profound place in human culture and literature, serving as an enduring symbol of knowledge, temptation, health, and artistic beauty.",
  
  "gravity": "Gravity is a fundamental natural phenomenon and one of the four universal forces of physics by which all matter and energy are drawn toward one another. On planetary bodies like Earth, gravity gives weight to physical objects and causes them to fall toward the surface when unsupported, while on a cosmic scale it governs planetary orbits, tides, star formation, and the structural cohesion of galaxies. Classical mechanics as formulated by Sir Isaac Newton describes gravity as an attractive force proportional to the product of two masses and inversely proportional to the square of their distance, whereas Albert Einstein's general relativity redefines it as the geometric curvature of four-dimensional spacetime induced by mass and energy. In everyday language, the term is also used metaphorically to describe the profound seriousness, dignity, or weighty consequence of a situation, event, or demeanor.",

  "dictionary": "A dictionary is an authoritative reference resource that lists words or terms—typically arranged in alphabetical order—providing comprehensive explanations of their modern meanings, pronunciations, etymologies, grammatical classifications, and usage patterns. Serving as vital records of human communication, dictionaries can be general language authorities documenting standard usage, specialized lexicons tailored to professional disciplines such as law or medicine, or multilingual guides facilitating translation. While historically published as monumental printed volumes by lexicographers like Samuel Johnson, Noah Webster, and the editors of the Oxford English Dictionary, contemporary dictionaries are predominantly dynamic digital databases continuously updated to reflect evolving vocabulary, emerging slang, and technological terms.",

  "sun": "The Sun is the yellow dwarf star located at the gravitational center of our Solar System, comprising approximately 99.86 percent of the system's total mass and supplying the electromagnetic radiation necessary to sustain life on Earth. Composed primarily of hydrogen and helium in a dynamic plasma state, the Sun generates immense energy through nuclear fusion in its core, fusing roughly 600 million tons of hydrogen into helium every second and radiating heat and light across space. Its gravitational field anchors the orbits of all planets, asteroids, and comets, while solar wind and radiation drive space weather, geomagnetic auroras, and terrestrial climate cycles.",

  "moon": "The Moon is Earth's only natural satellite, orbiting our planet at an average distance of roughly 384,400 kilometers and functioning as the fifth-largest satellite in the Solar System. Characterized by a rocky, cratered surface covered in fine regolith and barren basaltic plains called maria, the Moon is gravitationally tidally locked to Earth, meaning it always presents the same hemisphere toward our surface while cycling through predictable phases. Its gravitational pull stabilizes Earth's axial tilt—ensuring a temperate, predictable climate over geological time—and drives the rise and fall of oceanic tides, while serving as humanity's first extraterrestrial stepping stone during the historic Apollo lunar landings.",

  "water": "Water is a transparent, odorless, and tasteless chemical compound composed of two hydrogen atoms covalently bonded to one oxygen atom (H2O), serving as the universal solvent and the fundamental medium required for all known forms of biological life. Covering over 70 percent of Earth's surface in the form of oceans, rivers, lakes, and glaciers, water possesses unique thermodynamic properties including high heat capacity, surface tension, and expansion upon freezing, which collectively regulate global climates and ecological balances. In addition to sustaining physiological processes through cellular hydration and metabolic transport, water is an indispensable resource for human agriculture, sanitation, industrial manufacturing, and ecological biodiversity.",

  "computer": "A computer is an electronic programmable machine designed to accept raw data, process it at extraordinary speeds according to stored algorithmic instructions, and output meaningful information or automated physical actions. Modern computers rely on microprocessors composed of billions of microscopic transistors that manipulate binary digits (bits), executing operations across hardware layers, operating systems, and user applications. Spanning diverse form factors from portable smartphones and laptops to cloud data center supercomputers and embedded automotive controllers, the computer serves as the central technological engine of modern civilization, telecommunications, science, and the global digital economy.",

  "algorithm": "An algorithm is an unambiguous, finite sequence of step-by-step mathematical or logical instructions formulated to solve a specific problem, perform a computation, or execute automated decision-making. Operating as the conceptual blueprint behind all computer programming and data processing, algorithms take input data, apply systematic transformations or conditional logic, and produce a verifiable output. Modern applications range from fundamental operations like sorting numbers and routing network traffic to complex search engine rankings, cryptographic encryption, and the machine learning models that power contemporary artificial intelligence.",

  "serendipity": "Serendipity is the occurrence of finding valuable, pleasant, or fortunate things by sheer chance or accidental discovery, particularly when one is actively seeking something entirely unrelated. Coined in 1754 by English author Horace Walpole from the traditional Persian fairy tale 'The Three Princes of Serendip', the concept highlights the creative role of chance, keen observation, and open-minded sagacity in human life. In the history of science and technology, serendipity has served as the catalyst for numerous monumental breakthroughs, including Alexander Fleming's discovery of penicillin, the invention of microwave ovens, and the realization of vulcanized rubber.",

  "democracy": "Democracy is a system of government in which sovereign political power is vested in the people and exercised either directly through collective deliberation or indirectly through elected representatives in periodic, free, and competitive elections. Originating in ancient Athens and formalized through modern constitutional frameworks, democratic governance is anchored in foundational principles including equality before the law, fundamental human rights, freedom of speech and assembly, and the institutional separation of executive, legislative, and judicial powers. Contemporary representative democracies rely on active civic participation, a vibrant free press, and adherence to the rule of law to ensure that state policies reflect the consent and welfare of the governed.",

  "science": "Science is a systematic and evidence-based enterprise that builds, organizes, and tests knowledge about the universe through observation, hypothesis formulation, and empirical experimentation. Divided broadly into natural sciences like physics and biology, social sciences that analyze human behavior and society, and formal sciences like mathematics and logic, science seeks to uncover universal laws and verifiable models that explain how natural phenomena function. By maintaining a rigorous standard of reproducibility, peer review, and continuous revision in the light of new empirical data, scientific inquiry drives human technological innovation, medical advancement, and philosophical understanding of reality.",

  "philosophy": "Philosophy is the critical and systematic study of fundamental questions concerning existence, knowledge, morality, reason, mind, and language. Derived from the Greek roots meaning 'love of wisdom', the discipline is historically organized into core branches including metaphysics (the nature of reality), epistemology (the scope and validity of human knowledge), ethics (the principles of right conduct), and logic (the rules of valid inference). Through rigorous argumentation, conceptual analysis, and intellectual skepticism, philosophy interrogates the basic assumptions that underpin human society, scientific practice, and individual meaning.",

  "music": "Music is an expressive art form and cultural universal that organizes sound, silence, pitch, rhythm, and timbre through time to evoke aesthetic beauty, communicate emotional depth, and foster communal connection. Built upon acoustic foundations such as frequency and harmonic resonance, music encompasses vast global traditions, genres, and performance practices ranging from orchestral symphonies and traditional folk ballads to modern electronic compositions. Across all human societies, music plays an essential role in storytelling, religious rites, celebration, cognitive development, and the personal expression of human identity.",

  "language": "Language is a structured and conventional system of communication that enables humans to convey thoughts, emotions, information, and abstract concepts through vocal sounds, written symbols, or physical gestures. Governed by intricate grammatical rules including syntax, morphology, phonology, and semantics, human language is uniquely generative, permitting an infinite variety of original sentences and ideas to be formulated from a finite vocabulary. Beyond practical information exchange, language functions as the primary vehicle of cultural transmission, cognitive development, social identity, and collective human memory.",

  "sentence": "A sentence is a grammatically complete linguistic unit in speech or writing that typically consists of a subject and a predicate, expressing a complete thought, statement, question, command, or exclamation. Structured according to the syntactic rules of a given language, a sentence may take simple, compound, complex, or compound-complex forms, utilizing clauses and phrases to establish precise relationships between entities and actions. In written English, a sentence begins with a capital letter and concludes with terminal punctuation such as a period, question mark, or exclamation point, serving as the fundamental building block of coherent text and discourse.",

  "atom": "An atom is the basic building block of all ordinary chemical matter, consisting of a dense central nucleus composed of positively charged protons and electrically neutral neutrons surrounded by a cloud of negatively charged electrons. Defined uniquely by its atomic number—the number of protons within its nucleus—each atom corresponds to a specific chemical element on the periodic table, ranging from simple hydrogen to heavy uranium. Governed by the principles of quantum mechanics, atoms interact through electromagnetic forces, sharing or transferring valence electrons to form chemical bonds and construct molecules, crystals, and all tangible structures in the physical universe.",

  "energy": "Energy is a fundamental quantitative property of physics defined as the capacity of a physical system to perform work, exert a force, or produce heat, light, and motion. Governed by the universal law of conservation of energy—which states that energy can neither be created nor destroyed, only transformed from one form into another—it manifests across various states including kinetic, potential, thermal, chemical, electrical, and nuclear energy. Measured in joules within the International System of Units, energy drives every dynamic process in the cosmos, from cellular metabolism and biological life to planetary weather systems and stellar nuclear fusion.",

  "light": "Light is electromagnetic radiation that travels through space at the universal speed limit of approximately 299,792 kilometers per second, possessing a dual nature characterized by both wave-like oscillation and discrete particle packets called photons. While the term commonly designates visible light—the narrow spectral band between approximately 380 and 750 nanometers detectable by the human eye—it scientifically encompasses the entire electromagnetic spectrum from radio waves and infrared to ultraviolet and gamma rays. Generated by nuclear fusion, thermal agitation, and electronic transitions within atoms, light serves as the primary engine for planetary warmth, plant photosynthesis, visual perception, and modern fiber-optic communications.",

  "evolution": "Evolution is the continuous biological process by which populations of living organisms change, adapt, and diversify over successive generations through inherited modifications in genetic traits. Driven by fundamental mechanisms including natural selection, genetic mutation, gene flow, and genetic drift, evolution explains the unity and vast diversity of life on Earth from common ancestral origins over billions of years. Formulated scientifically by Charles Darwin and Alfred Russel Wallace and unified with modern genetics in the modern evolutionary synthesis, evolutionary biology provides the foundational framework underpinning contemporary medicine, ecology, and biological sciences.",

  "democracy": "Democracy is a system of government in which sovereign power is exercised by the people, either directly through citizen referendums or indirectly through freely elected representatives who are held accountable under the rule of law. Rooted in foundational ideals of political equality, individual liberty, and universal human rights, modern constitutional democracies rely on regular competitive elections, an independent judiciary, a protected free press, and the institutional separation of powers to prevent the concentration of tyrannical authority and ensure government by the consent of the governed.",

  "dog": "A dog is a domesticated carnivorous mammal of the canine family (Canis lupus familiaris), descended from an extinct ancestral wolf population and widely regarded as humanity's earliest animal companion. Renowned for their extraordinary loyalty, social intelligence, acute sense of smell, and adaptable behavior, dogs have been bred by humans over millennia into hundreds of diverse breeds ranging from tiny companion lapdogs to large working hounds and herders. Beyond serving as beloved domestic household pets, dogs fulfill vital occupational roles across human society, including search and rescue, guide assistance for individuals with disabilities, agricultural herding, therapy, and law enforcement scent detection.",

  "cat": "A cat is a small, carnivorous domesticated mammal of the feline family (Felis catus), prized worldwide as a companion animal for its playful agility, affectionate nature, and natural predatory prowess against household rodents. Evolving from the African wildcat (Felis lybica) in the Near East during the dawn of early human agriculture, domestic cats possess flexible bodies, sharp retractable claws, acute night vision, and specialized senses finely tuned for stealth hunting and spatial balance. As one of the two most popular domestic pets globally alongside dogs, cats inhabit millions of households across every inhabited continent and occupy a prominent place in world folklore, mythology, and internet culture.",

  "book": "A book is a medium for recording and communicating information, ideas, stories, and knowledge, historically consisting of written or printed sheets bound together between protective covers. Evolving from ancient clay tablets, papyrus scrolls, and medieval handwritten codices, the invention of movable-type printing by Johannes Gutenberg transformed books into the foundational technology of global literacy, intellectual enlightenment, and scientific dissemination. In contemporary times, the concept of a book encompasses both physical printed paperbacks and hardcovers as well as digital electronic formats (ebooks) and audiobooks, remaining the preeminent vehicle for long-form narrative literature, scholarly research, education, and the preservation of human thought.",

  "tree": "A tree is a perennial woody plant characterized by an elongated main stem or trunk that supports branches, foliage, and reproductive structures high above the ground. Through photosynthesis, trees absorb atmospheric carbon dioxide, release oxygen, stabilize soil structures against erosion, and cycle moisture into the atmosphere, serving as the biological anchors of terrestrial ecosystems and planetary climate regulation. They provide essential habitats for billions of living species and yield critical natural resources such as timber, fruit, nuts, rubber, and medicinal compounds, while embodying profound symbolic resonance as emblems of longevity, shelter, and natural wisdom across world cultures.",

  "ocean": "An ocean is a vast continuous body of saline water that covers roughly 71 percent of Earth's surface, comprising five principal interconnected basins: the Pacific, Atlantic, Indian, Southern, and Arctic oceans. Containing over 97 percent of our planet's water and generating more than half of its oxygen through marine phytoplankton photosynthesis, the global ocean drives Earth's climate and weather patterns by absorbing solar radiation and circulating heat across global oceanic currents. Hosting an extraordinary biodiversity ranging from microscopic plankton and coral reefs to the colossal blue whale, the ocean remains the cradle of terrestrial life and an indispensable resource for international trade, nutrition, and atmospheric equilibrium.",

  "planet": "A planet is a celestial body that orbits a central star, possesses sufficient gravitational mass to assume a nearly spherical hydrostatic equilibrium, and has cleared the neighborhood around its orbital trajectory of competing debris. In our Solar System, eight recognized planets span rocky terrestrial worlds—Mercury, Venus, Earth, and Mars—and outer giants comprising gas giants Jupiter and Saturn alongside ice giants Uranus and Neptune. Beyond our Solar System, astronomers have identified thousands of extrasolar planets (exoplanets) orbiting distant stars, revolutionizing our understanding of planetary system architectures and the potential distribution of habitable environments across the galaxy.",

  "brain": "The brain is the complex, highly specialized biological organ that serves as the central processing unit of the nervous system in all vertebrate and most invertebrate animals. Located in the head and shielded by the skull, the human brain contains roughly 86 billion interconnected neurons that communicate via trillions of electrochemical synaptic junctions, orchestrating everything from autonomic physiological functions like breathing and heart rate to sensory perception, motor control, memory, and emotions. As the physical substrate of consciousness, cognition, self-awareness, and language, the brain remains one of the most sophisticated and intensely investigated frontiers of modern biological neuroscience.",

  "dna": "Deoxyribonucleic acid (DNA) is a complex biological macromolecule that carries the fundamental genetic blueprint guiding the development, functioning, growth, and reproduction of all known living organisms and many viruses. Structured as an iconic double-helix polymer composed of two polynucleotide chains spiraling around a central axis, DNA encodes biological instructions in sequences of four nitrogenous bases: adenine, thymine, cytosine, and guanine. Discovered structurally in 1953 by James Watson, Francis Crick, and Rosalind Franklin, DNA provides the molecular basis of heredity, enabling traits to be replicated and inherited across generations while serving as the primary foundation for modern biotechnology, forensics, and genomic medicine.",

  "freedom": "Freedom is the state of being capable of acting, choosing, speaking, and thinking without undue coercion, oppression, or arbitrary external constraint. In political and philosophical discourse, freedom encompasses both negative liberty—the absence of governmental tyranny, censorship, or unwarranted interference—and positive liberty, which denotes the practical power, resources, and self-determination to realize one's full human potential. Recognized in international human rights declarations as an inalienable right of all persons, authentic freedom is preserved within modern civilized societies through the rule of law, institutional checks and balances, and civic vigilance."
};

// Words to clean / modernize
function modernizeText(rawText, word) {
  if (!rawText) return "";

  // 1. Remove author citations like "Shak.", "Pope.", "Milton.", "Burke.", "Holland."
  let text = rawText
    .replace(/\b(Shak|Milton|Pope|Burke|Dryden|Spenser|Chaucer|Bacon|Locke|Swift|Addison|Johnson|Cowper|Coleridge|Wordsworth|Byron|Shelley|Keats|Tennyson|Browning|Carlyle|Macaulay|Ruskin|Arnold|Darwin|Huxley|Holland|Bartlett|Bouvier)\b\.?/gi, '')
    // 2. Remove obsolete domain tags like (Physics), (bot.), (Mus.), (Zoöl.), (Astron.)
    .replace(/\([A-Za-zöäü\s\.]+\)\s*/g, '')
    // 3. Remove [Obs.], [Archaic], [U.S.], [Eng.], [Scot.]
    .replace(/\[[A-Za-z\s\.]+\]\s*/g, '')
    // 4. Remove leading numbering (1., 2., 3.)
    .replace(/(?:^|\s)\d+\.\s+/g, ' ')
    // 5. Replace archaic terminology / taxonomy
    .replace(/\bPyrus malus\b/gi, 'Malus domestica')
    .replace(/\bbeaviness\b/gi, 'heaviness')
    .replace(/\blnowledge\b/gi, 'knowledge')
    // 6. Remove dash compounds if they become excessive
    .replace(/\s+--\s+/g, '; ')
    // 7. Remove "Note:" blocks that are just compounding lists
    .replace(/Note:\s*[^.]*?(?:dumpling|blight|pudding)[^.]*\./gi, '')
    // 8. Clean excess whitespace and punctuation
    .replace(/\s+/g, ' ')
    .replace(/\s+([,;:.])/g, '$1')
    .replace(/;+/g, ';')
    .trim();

  // If text is already high quality and long, format into smooth continuous 1-paragraph prose
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  // Clean up sentences
  const cleanSentences = sentences
    .map(s => s.trim())
    .filter(s => s.length > 15 && !s.toLowerCase().startsWith('see ') && !s.toLowerCase().startsWith('cf.'));

  if (cleanSentences.length === 0) return rawText;

  // Take the first 3-4 clean sentences to form a solid, coherent 1-paragraph explanation
  let paragraph = cleanSentences.slice(0, 4).join(' ');

  // Ensure capitalization and punctuation
  if (!/[.!?]$/.test(paragraph)) {
    paragraph += '.';
  }

  paragraph = paragraph.charAt(0).toUpperCase() + paragraph.slice(1);

  // If the word itself isn't mentioned in the first sentence, prefix with a natural modern descriptor
  return paragraph;
}

console.log("Opening existing dictionary database...");
const oldDb = new DatabaseSync(OLD_DB_FILE, { readOnly: true });

console.log(`Creating modern dictionary database at ${MODERN_DB_FILE}...`);
if (fs.existsSync(MODERN_DB_FILE)) {
  fs.unlinkSync(MODERN_DB_FILE);
}

const modernDb = new DatabaseSync(MODERN_DB_FILE);
modernDb.exec(`
  CREATE TABLE modern_dictionary (
    word TEXT PRIMARY KEY,
    definition TEXT NOT NULL,
    is_curated INTEGER DEFAULT 0
  );
  CREATE INDEX idx_modern_word ON modern_dictionary(word);
`);

const insertStmt = modernDb.prepare('INSERT OR REPLACE INTO modern_dictionary (word, definition, is_curated) VALUES (?, ?, ?)');

modernDb.exec('BEGIN TRANSACTION;');

// 1. Insert curated high-quality definitions first
let curatedCount = 0;
for (const [word, def] of Object.entries(CURATED_MODERN_DEFINITIONS)) {
  insertStmt.run(word.toLowerCase(), def.trim(), 1);
  curatedCount++;
}
console.log(`Inserted ${curatedCount} curated modern definitions.`);

// 2. Stream all other words from dictionary.db and modernize them into clean 1-paragraph entries
const selectAll = oldDb.prepare('SELECT word, definition FROM dictionary');
const rows = selectAll.all();

let processed = 0;
for (const row of rows) {
  const w = row.word.toLowerCase();
  // Don't overwrite our curated masterpieces
  if (CURATED_MODERN_DEFINITIONS[w]) continue;

  const modernDef = modernizeText(row.definition, w);
  insertStmt.run(w, modernDef, 0);
  processed++;

  if (processed % 25000 === 0) {
    console.log(`Modernized ${processed} / ${rows.length} words...`);
  }
}

modernDb.exec('COMMIT;');
console.log(`✓ Finished! Total entries in modern_dictionary: ${curatedCount + processed}`);
