import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { levenshteinDistance } from './spell_checker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, '../data/disambiguation_senses.db');

// Qualifier synonyms and category mapping
const QUALIFIER_GROUPS = {
  movie: ['movie', 'film', 'cinema', 'animated', 'animation', 'cartoon', 'motion picture', 'feature', 'flick', 'sequel', 'dreamworks', 'pixar', 'disney'],
  geography: ['island', 'country', 'nation', 'state', 'city', 'place', 'geography', 'land', 'location', 'region', 'continent', 'republic'],
  fruit: ['fruit', 'tree', 'plant', 'produce', 'orchard', 'food', 'edible', 'crop'],
  food: ['food', 'dish', 'recipe', 'meal', 'cuisine', 'stew', 'soup', 'snack'],
  company: ['company', 'tech', 'technology', 'corporation', 'corp', 'brand', 'business', 'enterprise', 'manufacturer', 'inc'],
  animal: ['animal', 'snake', 'mammal', 'reptile', 'bird', 'fish', 'creature', 'beast', 'predator', 'cat', 'wildlife', 'fauna'],
  programming: ['language', 'programming', 'code', 'coding', 'software', 'programming language', 'script', 'scripting', 'dev', 'developer'],
  planet: ['planet', 'astronomy', 'solar system', 'celestial', 'orbit', 'space'],
  element: ['element', 'metal', 'chemistry', 'chemical', 'quicksilver', 'periodic table'],
  ship: ['ship', 'boat', 'vessel', 'ocean liner', 'liner', 'wreck', 'maritime', 'cruiser'],
  car: ['car', 'automobile', 'vehicle', 'motor', 'automotive', 'marque'],
  sport: ['sport', 'sports', 'equipment', 'baseball', 'cricket', 'game', 'club', 'gear'],
  math: ['math', 'mathematics', 'linear algebra', 'algebra', 'array', 'grid'],
  book: ['book', 'novel', 'literature', 'author', 'reading', 'paperback', 'hardcover'],
  comic: ['comic', 'superhero', 'marvel', 'dc', 'hero', 'villain', 'avenger']
};

export class DisambiguationEngine {
  constructor() {
    this.initDb();
    this.seedDefaultSenses();
  }

  initDb() {
    this.db = new DatabaseSync(DB_FILE);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS disambiguation_senses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity TEXT NOT NULL,
        sense_key TEXT NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        heading TEXT NOT NULL,
        explanation TEXT NOT NULL,
        usage TEXT NOT NULL,
        site1_name TEXT NOT NULL,
        site1_url TEXT NOT NULL,
        site1_desc TEXT NOT NULL,
        site1_logo TEXT NOT NULL,
        site2_name TEXT NOT NULL,
        site2_url TEXT NOT NULL,
        site2_desc TEXT NOT NULL,
        site2_logo TEXT NOT NULL,
        keywords TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_disam_entity ON disambiguation_senses(entity);
      CREATE INDEX IF NOT EXISTS idx_disam_sense ON disambiguation_senses(sense_key);
    `);

    this.selectStmt = this.db.prepare(`
      SELECT * FROM disambiguation_senses WHERE entity = ?
    `);
    this.allEntitiesStmt = this.db.prepare(`
      SELECT DISTINCT entity FROM disambiguation_senses
    `);
  }

  // Get all senses for a given entity (for alternate suggestions)
  getSenses(rawEntity) {
    if (!rawEntity) return [];
    const clean = rawEntity.toLowerCase().trim();
    return this.selectStmt.all(clean);
  }

  seedDefaultSenses() {
    const countRow = this.db.prepare('SELECT count(*) as count FROM disambiguation_senses').get();
    if (countRow && countRow.count > 0) {
      return; // Already seeded
    }

    const insert = this.db.prepare(`
      INSERT INTO disambiguation_senses (
        entity, sense_key, category, title, heading, explanation, usage,
        site1_name, site1_url, site1_desc, site1_logo,
        site2_name, site2_url, site2_desc, site2_logo, keywords
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const SENSES = [
      // MADAGASCAR
      {
        entity: 'madagascar',
        sense_key: 'movie',
        category: 'Movie / Animation',
        title: 'Madagascar (2005 Animated Film)',
        heading: '**Madagascar (2005 Film)**',
        explanation: 'Madagascar is a 2005 American computer-animated adventure comedy film produced by DreamWorks Animation and directed by Eric Darnell and Tom McGrath. The film follows four pampered animals from New York City\'s Central Park Zoo—Alex the lion (voiced by Ben Stiller), Marty the zebra (Chris Rock), Melman the giraffe (David Schwimmer), and Gloria the hippopotamus (Jada Pinkett Smith)—who unexpectedly find themselves shipped to Kenya and subsequently shipwrecked on the wild island of Madagascar. There, the domesticated New Yorkers must learn to survive in nature while encountering a colony of eccentric lemurs led by King Julien XIII (Sacha Baron Cohen) and military-minded penguins. The film was an enormous worldwide box office success grossing over $532 million, establishing a major animated franchise with sequels, television spin-offs, and holiday specials.',
        usage: '1. The animated comedy film Madagascar introduced the iconic rendition of "I Like to Move It" sung by King Julien.\n2. Children around the world loved Madagascar for the comical escapades of the penguins and Alex the lion.',
        site1_name: 'IMDb',
        site1_url: 'https://www.imdb.com/title/tt0351283/',
        site1_desc: 'Full cast, plot summary, reviews, trivia, and box office details for Madagascar (2005) on IMDb.',
        site1_logo: 'https://m.media-amazon.com/images/G/01/imdb/images/plugins/imdb_46x22-2264473254._CB485930416_.png',
        site2_name: 'Wikipedia',
        site2_url: 'https://en.wikipedia.org/wiki/Madagascar_(2005_film)',
        site2_desc: 'Production history, voice cast, musical soundtrack, and cultural reception of the DreamWorks animated feature.',
        site2_logo: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
        keywords: 'movie film cinema animation animated dreamworks 2005 alex lion marty zebra julien penguins cartoon comedy'
      },
      {
        entity: 'madagascar',
        sense_key: 'geography',
        category: 'Geography / Nation',
        title: 'Madagascar (Island Country)',
        heading: '**Madagascar (Country)**',
        explanation: 'Madagascar is an island country situated in the Indian Ocean approximately 400 kilometers (250 miles) off the coast of East Africa across the Mozambique Channel. Spanning 587,041 square kilometers, it is the world\'s fourth-largest island and an exceptional ecological biodiversity hotspot; having split from the Indian subcontinent roughly 88 million years ago, over 90% of its native flora and fauna—including all wild lemur species, the fossa, and colorful baobab trees—exist nowhere else on Earth. The sovereign nation of Madagascar has its capital at Antananarivo and is home to the Malagasy people, who speak the Austronesian Malagasy language alongside French. The country is renowned globally for its natural reserves, rainforests, and unique geological formations such as the limestone karst Tsingy de Bemaraha.',
        usage: '1. Conservation biologists travel to Madagascar to study rare species of lemurs found exclusively in its tropical rainforests.\n2. Madagascar gained its full independence from France in 1960 and established Antananarivo as its capital.',
        site1_name: 'Encyclopædia Britannica',
        site1_url: 'https://www.britannica.com/place/Madagascar',
        site1_desc: 'Authoritative encyclopedia profile of Madagascar covering its geography, history, Malagasy culture, and wildlife.',
        site1_logo: 'https://www.britannica.com/favicon.ico',
        site2_name: 'National Geographic',
        site2_url: 'https://www.nationalgeographic.com/environment/article/madagascar',
        site2_desc: 'Exploration of Madagascar’s unique endemic wildlife, endemic lemurs, and urgent rainforest conservation initiatives.',
        site2_logo: 'https://www.nationalgeographic.com/favicon.ico',
        keywords: 'island country nation africa geography ocean antananarivo lemur wildlife indian ocean state mozambique'
      },

      // APPLE
      {
        entity: 'apple',
        sense_key: 'company',
        category: 'Technology / Corporation',
        title: 'Apple Inc. (Technology Company)',
        heading: '**Apple Inc. (Company)**',
        explanation: 'Apple Inc. is an American multinational corporation and technology giant headquartered in Cupertino, California. Founded on April 1, 1976, by Steve Jobs, Steve Wozniak, and Ronald Wayne to develop and sell the Apple I personal computer, Apple has grown to become the world\'s most valuable public technology company. The corporation designs, manufactures, and markets consumer electronics, software, and digital services, most notably the iPhone smartphone, iPad tablet, Mac computers, Apple Watch, AirPods, and iOS operating system. Renowned for its industrial design philosophy, privacy focus, and integrated hardware-software ecosystem, Apple generates hundreds of billions of dollars in annual revenue through global hardware sales and subscription platforms like the App Store, iCloud, and Apple Music.',
        usage: '1. Investors closely monitored Apple Inc. after the technology company unveiled its newest generation of silicon processors.\n2. Steve Jobs co-founded Apple in a garage in 1976 before revolutionizing mobile communications with the iPhone in 2007.',
        site1_name: 'Apple Official',
        site1_url: 'https://www.apple.com',
        site1_desc: 'Official home of Apple Inc., featuring the iPhone, Mac, iPad, Apple Watch, services, and corporate innovations.',
        site1_logo: 'https://www.apple.com/favicon.ico',
        site2_name: 'Wikipedia',
        site2_url: 'https://en.wikipedia.org/wiki/Apple_Inc.',
        site2_desc: 'History of Apple Inc., from the Apple II to modern corporate leadership under Tim Cook.',
        site2_logo: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
        keywords: 'company tech technology corporation iphone mac ipad steve jobs tim cook cupertino hardware software brand inc'
      },
      {
        entity: 'apple',
        sense_key: 'fruit',
        category: 'Botany / Fruit',
        title: 'Apple (Edible Fruit)',
        heading: '**Apple (Fruit)**',
        explanation: 'The apple is an edible round pomaceous fruit produced by the domesticated apple tree (Malus domestica), belonging to the rose family (Rosaceae). Originating in Central Asia from its wild ancestor Malus sieversii in the mountains of southern Kazakhstan, apples have been cultivated for thousands of years throughout Asia and Europe before being brought to North America by European colonists. Cultivated in over 7,500 known varieties worldwide—such as Honeycrisp, Gala, Granny Smith, and Fuji—apples vary widely in color from bright crimson red to golden yellow and tart green. They are rich in dietary fiber, vitamin C, and polyphenolic antioxidants, consumed widely both fresh and processed into apple cider, applesauce, vinegar, and baked pastries.',
        usage: '1. An apple provides essential dietary fiber and antioxidants when eaten fresh as a healthy daily snack.\n2. Orchard growers harvest crisp Honeycrisp apples in early autumn across the northern hemisphere.',
        site1_name: 'Encyclopædia Britannica',
        site1_url: 'https://www.britannica.com/plant/apple-fruit-and-tree',
        site1_desc: 'Detailed botanical facts on Malus domestica, tree cultivation methods, global varieties, and nutritional composition.',
        site1_logo: 'https://www.britannica.com/favicon.ico',
        site2_name: 'USDA FoodData',
        site2_url: 'https://fdc.nal.usda.gov/',
        site2_desc: 'Official USDA nutritional profile and vitamin breakdown for fresh raw apples.',
        site2_logo: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
        keywords: 'fruit tree plant food malus domestica orchard red green crisp food sweet rosaceae pomaceous'
      },

      // PYTHON
      {
        entity: 'python',
        sense_key: 'programming',
        category: 'Computing / Programming Language',
        title: 'Python (Programming Language)',
        heading: '**Python (Programming Language)**',
        explanation: 'Python is a high-level, general-purpose, interpreted programming language created by Dutch programmer Guido van Rossum and first released in 1991. Designed with an explicit emphasis on code readability, Python uses clean indentation (off-side rule) rather than curly braces or keywords to define code blocks. Supporting multiple programming paradigms including object-oriented, functional, and procedural styles, Python has become the dominant language worldwide for artificial intelligence, machine learning, data science, web development, and scientific computing. Its popularity is propelled by an enormous ecosystem of open-source packages—such as NumPy, PyTorch, TensorFlow, and Pandas—managed via the Python Package Index (PyPI).',
        usage: '1. Machine learning researchers commonly choose Python because of its expressive syntax and rich library support.\n2. Guido van Rossum released Python in 1991, naming it after the British comedy troupe Monty Python.',
        site1_name: 'Python Official',
        site1_url: 'https://www.python.org',
        site1_desc: 'Official documentation, downloads, and developer guides for the Python programming language.',
        site1_logo: 'https://www.python.org/static/favicon.ico',
        site2_name: 'Wikipedia',
        site2_url: 'https://en.wikipedia.org/wiki/Python_(programming_language)',
        site2_desc: 'Syntax characteristics, development history, design philosophy, and community governance of Python.',
        site2_logo: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
        keywords: 'programming language code coding software guido van rossum script developer machine learning data science ai'
      },
      {
        entity: 'python',
        sense_key: 'animal',
        category: 'Zoology / Reptile',
        title: 'Python (Constrictor Snake)',
        heading: '**Python (Snake)**',
        explanation: 'A python is a large, non-venomous constrictor snake belonging to the family Pythonidae, native to tropical and subtropical regions of Africa, Asia, and Australia. Pythons are among the largest snakes in the world; species such as the reticulated python (Malayopython reticulatus) can exceed 6 meters (20 feet) in length. As ambush predators, pythons utilize heat-sensing labial pits along their lips to detect warm-blooded prey in darkness. Rather than relying on venom, they seize their quarry with recurved backward-pointing teeth and rapidly coil their powerful muscular bodies around the prey, constricting tightly with each exhale to induce circulatory arrest before swallowing the animal whole. Unlike booid relatives which give live birth, pythons are oviparous, laying clutches of eggs that females actively brood and insulate.',
        usage: '1. The reticulated python is native to Southeast Asian rainforests and is recognized as the longest snake in the world.\n2. Pythons subdue their prey through muscular constriction rather than venomous bites.',
        site1_name: 'National Geographic',
        site1_url: 'https://www.nationalgeographic.com/animals/reptiles/facts/python',
        site1_desc: 'Habitat profiles, hunting adaptations, constrictor mechanics, and biological traits of python species.',
        site1_logo: 'https://www.nationalgeographic.com/favicon.ico',
        site2_name: 'Encyclopædia Britannica',
        site2_url: 'https://www.britannica.com/animal/python-snake-group',
        site2_desc: 'Zoological taxonomy, egg-laying behavior, and geographical distribution of family Pythonidae.',
        site2_logo: 'https://www.britannica.com/favicon.ico',
        keywords: 'snake reptile animal constrictor predator serpent pythonidae scales reticulated burmese'
      },

      // MERCURY
      {
        entity: 'mercury',
        sense_key: 'planet',
        category: 'Astronomy / Planet',
        title: 'Mercury (First Planet from the Sun)',
        heading: '**Mercury (Planet)**',
        explanation: 'Mercury is the smallest planet in the Solar System and the closest planet to the Sun, orbiting at an average distance of approximately 57.9 million kilometers (36 million miles). Having no substantial atmosphere to retain heat, Mercury experiences the most extreme temperature swings in the Solar System, plunging from a scorching 430°C (800°F) in direct sunlight down to a frigid -180°C (-290°F) on its dark nighttime side. Its heavily cratered, airless surface strongly resembles Earth\'s Moon and possesses a disproportionately massive metallic iron core that accounts for roughly 85% of the planet\'s radius. Mercury completes a rapid orbit around the Sun in just 88 Earth days, exhibiting a unique 3:2 spin-orbit resonance where it rotates three times on its axis for every two solar orbits.',
        usage: '1. NASA’s MESSENGER spacecraft orbited Mercury between 2011 and 2015, capturing comprehensive maps of its cratered surface.\n2. Mercury is the fastest-orbiting planet in the Solar System, completing a full solar circuit in 88 days.',
        site1_name: 'NASA Solar System Exploration',
        site1_url: 'https://science.nasa.gov/mercury/',
        site1_desc: 'Official NASA guide to Mercury, featuring planetary stats, orbital characteristics, and robotic spacecraft missions.',
        site1_logo: 'https://www.nasa.gov/favicon.ico',
        site2_name: 'Encyclopædia Britannica',
        site2_url: 'https://www.britannica.com/place/Mercury-planet',
        site2_desc: 'Astronomical analysis of Mercury\'s iron core, magnetic field, craters, and rotational dynamics.',
        site2_logo: 'https://www.britannica.com/favicon.ico',
        keywords: 'planet astronomy solar system sun orbit messenger crater closest smallest celestial'
      },
      {
        entity: 'mercury',
        sense_key: 'element',
        category: 'Chemistry / Metal',
        title: 'Mercury (Chemical Element Hg)',
        heading: '**Mercury (Chemical Element)**',
        explanation: 'Mercury is a chemical element with the symbol Hg (from the Greek hydrargyrum, meaning "liquid silver") and atomic number 80. Commonly known as quicksilver, it is the only metallic element that remains in liquid form at standard conditions for temperature and pressure, freezing at -38.83°C and boiling at 356.73°C. Mercury is a heavy, silvery-white transition metal found naturally primarily in the red sulfide mineral cinnabar (HgS). Historically used in mercury thermometers, barometers, fluorescent lighting, and dental amalgams, its industrial applications have been heavily phased out globally due to its severe toxicity; mercury readily forms organic compounds such as methylmercury that bioaccumulate in marine life and cause irreversible neurological damage in humans.',
        usage: '1. Due to high toxicity, old mercury thermometers have been largely replaced with digital electronic sensors.\n2. Mercury is unique among metals because it remains in a liquid state at room temperature.',
        site1_name: 'Royal Society of Chemistry',
        site1_url: 'https://www.rsc.org/periodic-table/element/80/mercury',
        site1_desc: 'Periodic table profile for element 80 Mercury, detailing atomic weight, chemical properties, and history.',
        site1_logo: 'https://www.rsc.org/favicon.ico',
        site2_name: 'PubChem (NIH)',
        site2_url: 'https://pubchem.ncbi.nlm.nih.gov/element/Mercury',
        site2_desc: 'Chemical and physical data on elemental mercury, toxicity warnings, and occupational hazard limits.',
        site2_logo: 'https://pubchem.ncbi.nlm.nih.gov/favicon.ico',
        keywords: 'element metal chemistry chemical hg 80 quicksilver liquid toxic transition cinnabar periodic'
      },

      // TITANIC
      {
        entity: 'titanic',
        sense_key: 'ship',
        category: 'Maritime History / Ship',
        title: 'RMS Titanic (Historic Ocean Liner)',
        heading: '**RMS Titanic (Ship)**',
        explanation: 'RMS Titanic was a British luxury passenger liner operated by the White Star Line that sank in the North Atlantic Ocean on April 15, 1912, after striking an iceberg during her maiden voyage from Southampton to New York City. Built at the Harland and Wolff shipyard in Belfast and deemed virtually unsinkable due to her state-of-the-art watertight bulkheads, Titanic was the largest and most opulent ocean liner afloat at the time. Of the estimated 2,224 passengers and crew aboard, more than 1,500 perished, making it one of the deadliest peacetime commercial maritime disasters in history. The tragedy led to fundamental reforms in international maritime safety regulations, including mandatory lifeboat capacity for all passengers and the creation of the International Ice Patrol.',
        usage: '1. The sinking of the RMS Titanic in 1912 transformed international maritime safety and lifeboat standards.\n2. Oceanographer Robert Ballard discovered the deep-sea shipwreck of the Titanic in 1985 resting 12,500 feet below the surface.',
        site1_name: 'Encyclopædia Britannica',
        site1_url: 'https://www.britannica.com/topic/Titanic',
        site1_desc: 'Comprehensive historical chronicle of Titanic\'s construction, maiden voyage, sinking, and salvage expeditions.',
        site1_logo: 'https://www.britannica.com/favicon.ico',
        site2_name: 'National Geographic',
        site2_url: 'https://www.nationalgeographic.com/history/article/titanic',
        site2_desc: 'Deep-sea exploration, archival photography, and archaeology of the Titanic shipwreck on the ocean floor.',
        site2_logo: 'https://www.nationalgeographic.com/favicon.ico',
        keywords: 'ship boat liner ocean rms 1912 iceberg sinking maiden voyage white star belfast disaster maritime'
      },
      {
        entity: 'titanic',
        sense_key: 'movie',
        category: 'Cinema / Film',
        title: 'Titanic (1997 James Cameron Film)',
        heading: '**Titanic (1997 Film)**',
        explanation: 'Titanic is a 1997 American epic romantic disaster film written, directed, co-produced, and co-edited by James Cameron. Incorporating both historical and fictionalized aspects, the film stars Leonardo DiCaprio and Kate Winslet as Jack Dawson and Rose DeWitt Bukater, two members of different social classes who fall passionately in love aboard the ill-fated maiden voyage of the RMS Titanic. Upon its theatrical release, Titanic became an unprecedented global cultural phenomenon, earning over $2.1 billion at the box office and holding the record as the highest-grossing film of all time for over a decade. The movie was nominated for 14 Academy Awards and won 11, including Best Picture, Best Director, and Best Original Song for Celine Dion\'s anthem "My Heart Will Go On".',
        usage: '1. James Cameron\'s 1997 film Titanic tied the record for the most Academy Award wins in Oscar history with eleven Oscars.\n2. The cinematic romance between Jack and Rose aboard the Titanic captured audiences worldwide.',
        site1_name: 'IMDb',
        site1_url: 'https://www.imdb.com/title/tt0120338/',
        site1_desc: 'Full cast list, awards, box office data, user reviews, and trivia for Titanic (1997) directed by James Cameron.',
        site1_logo: 'https://m.media-amazon.com/images/G/01/imdb/images/plugins/imdb_46x22-2264473254._CB485930416_.png',
        site2_name: 'Wikipedia',
        site2_url: 'https://en.wikipedia.org/wiki/Titanic_(1997_film)',
        site2_desc: 'Production, massive scale sets, visual effects, and cultural legacy of James Cameron\'s Titanic.',
        site2_logo: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
        keywords: 'movie film cinema 1997 james cameron leonardo dicaprio kate winslet oscar romance jack rose'
      },

      // AVATAR
      {
        entity: 'avatar',
        sense_key: 'movie',
        category: 'Cinema / Sci-Fi Film',
        title: 'Avatar (2009 James Cameron Film)',
        heading: '**Avatar (2009 Film)**',
        explanation: 'Avatar is a 2009 groundbreaking American epic science fiction film directed, written, produced, and co-edited by James Cameron. Set in the mid-22nd century on the lush habitable alien moon of Pandora, the story centers on paraplegic Marine Jake Sully (Sam Worthington), who operates a genetically engineered Na\'vi-human hybrid body called an "avatar". Sent to assist a human mining consortium in displacing the indigenous Na\'vi tribe to extract valuable unobtanium, Jake falls in love with the Na\'vi warrior Neytiri (Zoe Saldana) and leads the native clans in a desperate battle to save Pandora\'s biosphere. Praised for pioneering stereoscopic 3D projection and motion-capture visual effects, Avatar grossed nearly $2.9 billion worldwide, standing as the highest-grossing film of all time.',
        usage: '1. James Cameron spent years developing stereoscopic 3D cameras before filming the sci-fi spectacle Avatar.\n2. Avatar set the all-time global box office record with its immersive depiction of the moon Pandora.',
        site1_name: 'IMDb',
        site1_url: 'https://www.imdb.com/title/tt0499549/',
        site1_desc: 'Cast credits, visual effects documentation, box office totals, and ratings for Avatar (2009).',
        site1_logo: 'https://m.media-amazon.com/images/G/01/imdb/images/plugins/imdb_46x22-2264473254._CB485930416_.png',
        site2_name: 'Wikipedia',
        site2_url: 'https://en.wikipedia.org/wiki/Avatar_(2009_film)',
        site2_desc: 'Comprehensive history of James Cameron\'s Avatar, Na\'vi language creation, and technological breakthroughs.',
        site2_logo: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
        keywords: 'movie film cinema 2009 james cameron pandora na\'vi jake sully sci-fi 3d blockbuster'
      },

      // JAGUAR
      {
        entity: 'jaguar',
        sense_key: 'car',
        category: 'Automotive / Brand',
        title: 'Jaguar (Luxury Automobile Marque)',
        heading: '**Jaguar (Automobile Marque)**',
        explanation: 'Jaguar is a British luxury and sports car brand headquartered in Whitley, Coventry, England, and operated as part of the Jaguar Land Rover group, a subsidiary of India\'s Tata Motors. Founded in 1922 as the Swallow Sidecar Company by Sir William Lyons, the marque transitioned to building sleek sports vehicles and adopted the Jaguar name in 1945. Renowned for combining elegant styling with high performance, Jaguar produced legendary racing and sports models including the XK120, the Le Mans-winning C-Type and D-Type, and the iconic 1961 E-Type, celebrated by Enzo Ferrari as one of the most beautiful cars ever made. Today, Jaguar manufactures luxury sedans, sports coupés, and electric SUVs such as the I-Pace.',
        usage: '1. British automotive manufacturer Jaguar gained fame on racing circuits with its classic E-Type sports cars.\n2. Jaguar announced a comprehensive transition toward an all-electric luxury automotive lineup.',
        site1_name: 'Jaguar Official',
        site1_url: 'https://www.jaguar.com',
        site1_desc: 'Official website of Jaguar, showcasing luxury vehicles, sports sedans, electric models, and heritage.',
        site1_logo: 'https://www.jaguar.com/favicon.ico',
        site2_name: 'Wikipedia',
        site2_url: 'https://en.wikipedia.org/wiki/Jaguar_Cars',
        site2_desc: 'Corporate timeline of Jaguar Cars, motorsport achievements at Le Mans, and manufacturing history.',
        site2_logo: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
        keywords: 'car automobile vehicle brand luxury british automotive motor jaguar land rover e-type'
      },
      {
        entity: 'jaguar',
        sense_key: 'animal',
        category: 'Zoology / Mammal',
        title: 'Jaguar (Panthera onca Big Cat)',
        heading: '**Jaguar (Big Cat)**',
        explanation: 'The jaguar (Panthera onca) is the largest feline species in the Americas and the third-largest big cat in the world, surpassed only by the tiger and the lion. Native to a range extending from northern Mexico and the southwestern United States down to northern Argentina, jaguars thrive in dense tropical rainforests such as the Amazon basin. Visually distinguished by its compact, muscular build and tawny coat marked with dark rosettes featuring inner spots, the jaguar possesses an exceptionally powerful bite force relative to its body mass. Unlike most felids that dispatch prey via a throat bite, the jaguar frequently employs an unusual killing technique by biting directly through the temporal bones of the skull, enabling it to pierce the armored shells of turtles and caimans.',
        usage: '1. In the Amazonian jungle, the jaguar reigns as an apex predator capable of swimming across broad rivers to hunt caimans.\n2. The jaguar is easily distinguished from the leopard by its stockier build and rosette patterns with internal spots.',
        site1_name: 'National Geographic',
        site1_url: 'https://www.nationalgeographic.com/animals/mammals/facts/jaguar',
        site1_desc: 'Habitat information, apex predator adaptations, bite force measurements, and conservation of the jaguar.',
        site1_logo: 'https://www.nationalgeographic.com/favicon.ico',
        site2_name: 'World Wildlife Fund',
        site2_url: 'https://www.worldwildlife.org/species/jaguar',
        site2_desc: 'WWF jaguar conservation initiatives across South and Central American rainforest corridors.',
        site2_logo: 'https://www.worldwildlife.org/favicon.ico',
        keywords: 'animal cat big cat feline panthera onca predator mammal amazon wild carnivore spots'
      },

      // BAT
      {
        entity: 'bat',
        sense_key: 'animal',
        category: 'Zoology / Mammal',
        title: 'Bat (Flying Mammal Chiroptera)',
        heading: '**Bat (Mammal)**',
        explanation: 'A bat is a mammal in the order Chiroptera, possessing forelimbs adapted as wings and representing the only mammalian group capable of true and sustained flight. With over 1,400 recognized species worldwide, bats make up roughly 20 percent of all classified mammalian biodiversity. Most insectivorous bat species navigate and forage in darkness using echolocation, emitting ultrasonic vocalizations and analyzing returning echoes to construct high-resolution spatial maps of their environment. Bats fulfill critical ecological roles across terrestrial ecosystems as voracious consumers of crop pests, keystone pollinators of desert and tropical plants (including agaves and bananas), and dispersers of rainforest seeds.',
        usage: '1. Bats use sophisticated ultrasonic echolocation to intercept nocturnal insects in complete darkness.\n2. Many tropical plant species rely exclusively on nectar-feeding bats for pollination.',
        site1_name: 'National Geographic',
        site1_url: 'https://www.nationalgeographic.com/animals/mammals/facts/bats',
        site1_desc: 'Anatomy, echolocation mechanics, flight physiology, and roosting habits of bats.',
        site1_logo: 'https://www.nationalgeographic.com/favicon.ico',
        site2_name: 'Encyclopædia Britannica',
        site2_url: 'https://www.britannica.com/animal/bat-mammal',
        site2_desc: 'Chiropteran taxonomy, biological adaptations, wing bone structure, and global ecological importance.',
        site2_logo: 'https://www.britannica.com/favicon.ico',
        keywords: 'animal mammal chiroptera flight wing nocturnal echolocation creature wildlife cave'
      },
      {
        entity: 'bat',
        sense_key: 'sport',
        category: 'Sports / Equipment',
        title: 'Bat (Baseball / Cricket Sporting Club)',
        heading: '**Bat (Sports Equipment)**',
        explanation: 'In sports, a bat is a smooth wooden or metal club used by a batter to hit a thrown or bowled ball in games such as baseball, cricket, softball, and rounders. In baseball, regulations mandate that bats be crafted from a single solid piece of wood (typically Northern white ash, maple, or birch) in professional leagues like Major League Baseball, while amateur and youth leagues commonly permit hollow aluminum or carbon-fiber composite bats for increased exit velocity. In cricket, the bat features a cane handle attached to a flat-fronted willow wood blade designed to drive, cut, or defend bowled leather cricket balls along a 22-yard pitch.',
        usage: '1. Major League Baseball rules mandate that players use solid wooden bats made of maple or ash.\n2. In cricket, players use a flat-bladed willow bat to score runs across the oval pitch.',
        site1_name: 'Major League Baseball',
        site1_url: 'https://www.mlb.com',
        site1_desc: 'Official baseball rules, bat specifications, maple wood regulations, and batting statistics.',
        site1_logo: 'https://www.mlb.com/favicon.ico',
        site2_name: 'Encyclopædia Britannica',
        site2_url: 'https://www.britannica.com/sports/baseball-bat',
        site2_desc: 'Historical evolution of the baseball and cricket bat, material science, and manufacturing.',
        site2_logo: 'https://www.britannica.com/favicon.ico',
        keywords: 'sport sports baseball cricket softball equipment wood hit club player game willow maple'
      },

      // AMAZON
      {
        entity: 'amazon',
        sense_key: 'company',
        category: 'Business / Technology',
        title: 'Amazon.com, Inc. (Technology & E-Commerce)',
        heading: '**Amazon (Company)**',
        explanation: 'Amazon.com, Inc. is an American multinational technology company headquartered in Seattle, Washington, and Arlington, Virginia. Founded by Jeff Bezos on July 5, 1994, initially as an online bookstore, Amazon has expanded into the world\'s largest online retailer, cloud computing infrastructure provider (Amazon Web Services / AWS), digital streaming entertainment service (Prime Video), and artificial intelligence developer (Alexa). Recognized as one of the Big Five American tech conglomerates alongside Google, Apple, Microsoft, and Meta, Amazon operates vast automated fulfillment networks globally and generates hundreds of billions in annual revenue powering much of modern internet infrastructure through AWS.',
        usage: '1. Amazon launched in 1994 as an online bookseller before expanding into cloud computing and global e-commerce.\n2. Millions of websites and enterprise applications run on Amazon Web Services cloud infrastructure.',
        site1_name: 'Amazon Official',
        site1_url: 'https://www.amazon.com',
        site1_desc: 'Global online shopping platform, cloud computing solutions (AWS), devices, and Prime entertainment.',
        site1_logo: 'https://www.amazon.com/favicon.ico',
        site2_name: 'Wikipedia',
        site2_url: 'https://en.wikipedia.org/wiki/Amazon_(company)',
        site2_desc: 'Corporate expansion of Amazon, logistics systems, AWS architecture, and leadership.',
        site2_logo: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
        keywords: 'company tech technology e-commerce retail jeff bezos seattle aws prime cloud business'
      },
      {
        entity: 'amazon',
        sense_key: 'geography',
        category: 'Geography / Nature',
        title: 'Amazon Rainforest & River Basin',
        heading: '**Amazon (Rainforest & River)**',
        explanation: 'The Amazon is the world\'s largest tropical rainforest and river drainage basin, spanning over 6.7 million square kilometers (2.6 million square miles) across nine South American nations, with approximately 60% located within Brazil. The Amazon River is the largest river by discharge volume in the world, emptying roughly 209,000 cubic meters of fresh water per second into the Atlantic Ocean—more than the next seven largest rivers combined. Harboring an estimated 10% of the world\'s known biodiversity, the Amazon basin contains billions of trees, thousands of fish and bird species, and plays an indispensable planetary role as a carbon sink and regulator of global atmospheric weather systems.',
        usage: '1. The Amazon rainforest produces immense quantities of moisture that influence weather patterns across South America.\n2. Scientists regard the Amazon basin as the planet\'s most biologically diverse tropical ecosystem.',
        site1_name: 'World Wildlife Fund',
        site1_url: 'https://www.worldwildlife.org/places/amazon',
        site1_desc: 'Ecological importance of the Amazon rainforest basin, indigenous territories, and deforestation tracking.',
        site1_logo: 'https://www.worldwildlife.org/favicon.ico',
        site2_name: 'Encyclopædia Britannica',
        site2_url: 'https://www.britannica.com/place/Amazon-River',
        site2_desc: 'Geographical hydrology, tributaries, biodiversity, and indigenous human history of the Amazon basin.',
        site2_logo: 'https://www.britannica.com/favicon.ico',
        keywords: 'rainforest river basin brazil south america jungle trees nature tropical ecology'
      },

      // MATRIX
      {
        entity: 'matrix',
        sense_key: 'movie',
        category: 'Cinema / Sci-Fi Film',
        title: 'The Matrix (1999 Sci-Fi Action Film)',
        heading: '**The Matrix (1999 Film)**',
        explanation: 'The Matrix is a landmark 1999 science fiction action film written and directed by the Wachowskis. Starring Keanu Reeves as Thomas Anderson, a computer programmer and hacker known as Neo, the film reveals that human perception of everyday reality is actually a simulated construct called "the Matrix", engineered by sentient artificial intelligence machines to pacify humanity while harvesting their bioelectric energy. Rescued by freedom fighter Morpheus (Laurence Fishburne) and Trinity (Carrie-Anne Moss), Neo discovers he may be "the One" destined to liberate humanity. Acclaimed for its philosophical cyberpunk themes, martial arts choreography by Yuen Woo-ping, and groundbreaking visual effects like "bullet time", The Matrix won four Academy Awards and profoundly influenced modern cinema.',
        usage: '1. The Matrix popularized the revolutionary "bullet time" slow-motion visual effect across action cinema in 1999.\n2. Keanu Reeves starred as Neo in the philosophical sci-fi masterpiece The Matrix.',
        site1_name: 'IMDb',
        site1_url: 'https://www.imdb.com/title/tt0133093/',
        site1_desc: 'Cast credits, Wachowski directing background, trivia, quotes, and ratings for The Matrix (1999).',
        site1_logo: 'https://m.media-amazon.com/images/G/01/imdb/images/plugins/imdb_46x22-2264473254._CB485930416_.png',
        site2_name: 'Wikipedia',
        site2_url: 'https://en.wikipedia.org/wiki/The_Matrix',
        site2_desc: 'Philosophical influences, cyberpunk aesthetics, filming techniques, and legacy of The Matrix.',
        site2_logo: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
        keywords: 'movie film cinema 1999 wachowski keanu reeves neo morpheus sci-fi cyberpunk bullet time simulation'
      },
      {
        entity: 'matrix',
        sense_key: 'math',
        category: 'Mathematics / Linear Algebra',
        title: 'Matrix (Linear Algebra Array)',
        heading: '**Matrix (Mathematics)**',
        explanation: 'In mathematics, a matrix is a rectangular array or table of numbers, symbols, or mathematical expressions arranged in horizontal rows and vertical columns. Defined formally by its dimensions m × n (having m rows and n columns), matrices are foundational to linear algebra and serve as essential computational instruments for representing and solving systems of simultaneous linear equations. Operations on matrices include addition, scalar multiplication, matrix multiplication, transposition, and inversion (when the determinant is non-zero). Matrices are ubiquitous throughout modern science and engineering, forming the mathematical backbone of 3D computer graphics transformations, quantum mechanical wavefunctions, statistics, and neural network weight layers in artificial intelligence.',
        usage: '1. In linear algebra, a matrix multiplication calculates linear transformations between vector spaces.\n2. Deep learning models rely heavily on matrix operations to compute neural network layer weights.',
        site1_name: 'Khan Academy',
        site1_url: 'https://www.khanacademy.org/math/linear-algebra/matrix-transformations',
        site1_desc: 'Visual tutorials on matrix operations, determinants, eigenvalues, and linear transformations.',
        site1_logo: 'https://www.khanacademy.org/favicon.ico',
        site2_name: 'Wolfram MathWorld',
        site2_url: 'https://mathworld.wolfram.com/Matrix.html',
        site2_desc: 'Rigorous mathematical definitions, properties, matrix identities, and linear algebraic proofs.',
        site2_logo: 'https://mathworld.wolfram.com/favicon.ico',
        keywords: 'math mathematics linear algebra array rows columns determinant vector transformation calculation'
      },

      // RATATOUILLE
      {
        entity: 'ratatouille',
        sense_key: 'movie',
        category: 'Movie / Pixar Animation',
        title: 'Ratatouille (2007 Pixar Animated Film)',
        heading: '**Ratatouille (2007 Film)**',
        explanation: 'Ratatouille is a 2007 American computer-animated comedy-drama film produced by Pixar Animation Studios and directed by Brad Bird. The film tells the story of Remy (voiced by Patton Oswalt), an ambitious rat with an extraordinary sense of taste and smell who dreams of becoming a gourmet chef in Paris. Remy forms an unlikely partnership with Alfredo Linguini, a clumsy kitchen garbage boy at the prestigious restaurant Gusteau\'s, secretly guiding Linguini\'s cooking movements from beneath his chef\'s toque. Acclaimed for its exquisite visual rendering of French culinary dishes, poignant themes of artistic passion, and Michael Giacchino\'s musical score, Ratatouille won the Academy Award for Best Animated Feature and grossed over $620 million worldwide.',
        usage: '1. Brad Bird\'s animated film Ratatouille celebrated French culinary art through the eyes of Remy the rat chef.\n2. Ratatouille earned the Academy Award for Best Animated Feature in 2008 for its brilliant storytelling.',
        site1_name: 'IMDb',
        site1_url: 'https://www.imdb.com/title/tt0382932/',
        site1_desc: 'Cast credits, Brad Bird direction, awards, and reviews for Pixar\'s Ratatouille (2007).',
        site1_logo: 'https://m.media-amazon.com/images/G/01/imdb/images/plugins/imdb_46x22-2264473254._CB485930416_.png',
        site2_name: 'Pixar Animation Studios',
        site2_url: 'https://www.pixar.com/feature-films/ratatouille',
        site2_desc: 'Behind the scenes artwork, character design, and production history of Ratatouille at Pixar.',
        site2_logo: 'https://www.pixar.com/favicon.ico',
        keywords: 'movie film cinema pixar animation remy rat chef paris gusteau cooking 2007 animated'
      },
      {
        entity: 'ratatouille',
        sense_key: 'food',
        category: 'Culinary / French Cuisine',
        title: 'Ratatouille (Provençal Vegetable Stew)',
        heading: '**Ratatouille (French Dish)**',
        explanation: 'Ratatouille is a traditional French Provençal stewed vegetable dish originating from the city of Nice along the Mediterranean coast. Its classic preparation features fresh summer vegetables including zucchini (courgettes), eggplant (aubergines), bell peppers, ripe tomatoes, onions, and garlic, seasoned with olive oil and aromatic herbs de Provence (thyme, basil, bay leaf, and rosemary). The vegetables can be gently stewed together in a heavy pot or layered thinly in an accordion-style spiral baking dish (confit byaldi). Renowned for its vibrant flavors and nutritional richness, ratatouille is served both warm and chilled, either as a hearty vegetarian main course or as an accompaniment to grilled meats and crusty French baguettes.',
        usage: '1. Traditional Provençal ratatouille highlights fresh summer produce like eggplant, zucchini, and ripe tomatoes.\n2. Chefs slow-cook ratatouille with olive oil and herbs de Provence until the vegetables become tender and fragrant.',
        site1_name: 'Encyclopædia Britannica',
        site1_url: 'https://www.britannica.com/topic/ratatouille',
        site1_desc: 'Culinary origins of ratatouille in Nice, traditional regional recipes, and French gastronomic history.',
        site1_logo: 'https://www.britannica.com/favicon.ico',
        site2_name: 'Larousse Gastronomique',
        site2_url: 'https://en.wikipedia.org/wiki/Ratatouille',
        site2_desc: 'Classic preparation techniques and historical evolution of Provençal vegetable stew.',
        site2_logo: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
        keywords: 'food dish vegetable stew french provence nice recipe cooking culinary zucchini eggplant'
      },

      // DUNE
      {
        entity: 'dune',
        sense_key: 'movie',
        category: 'Cinema / Sci-Fi Film',
        title: 'Dune (Denis Villeneuve Epic Film)',
        heading: '**Dune (Film)**',
        explanation: 'Dune is an epic science fiction film adaptation directed by Denis Villeneuve based on Frank Herbert\'s legendary 1965 novel, released in two acclaimed installments: Dune: Part One (2021) and Dune: Part Two (2024). Starring Timothée Chalamet as Paul Atreides alongside Zendaya, Rebecca Ferguson, and Oscar Isaac, the story chronicles the noble House Atreides as they are thrust into a deadly planetary conspiracy on the hostile desert world of Arrakis (Dune), the galaxy\'s sole source of the invaluable spice melange. Praised for its monumental practical cinematography by Greig Fraser, Hans Zimmer\'s resonant score, and faithful narrative worldbuilding, the cinematic adaptation earned widespread critical acclaim and multiple Academy Awards.',
        usage: '1. Denis Villeneuve\'s film adaptation of Dune captured the vast scale and political intrigue of Arrakis.\n2. Dune: Part One earned six Academy Awards in 2022 for its visual effects, cinematography, and score.',
        site1_name: 'IMDb',
        site1_url: 'https://www.imdb.com/title/tt1160419/',
        site1_desc: 'Full cast list, Denis Villeneuve directing, awards, and box office stats for Dune.',
        site1_logo: 'https://m.media-amazon.com/images/G/01/imdb/images/plugins/imdb_46x22-2264473254._CB485930416_.png',
        site2_name: 'Wikipedia',
        site2_url: 'https://en.wikipedia.org/wiki/Dune_(2021_film)',
        site2_desc: 'Production history of Villeneuve\'s Dune, desert filming in Jordan and Abu Dhabi, and reception.',
        site2_logo: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
        keywords: 'movie film cinema denis villeneuve timothee chalamet arrakis paul atreides sci-fi desert spice 2021'
      },
      {
        entity: 'dune',
        sense_key: 'book',
        category: 'Literature / Sci-Fi Novel',
        title: 'Dune (1965 Frank Herbert Novel)',
        heading: '**Dune (1965 Novel)**',
        explanation: 'Dune is a landmark 1965 science fiction novel by American author Frank Herbert, widely regarded as one of the greatest and bestselling sci-fi novels in literary history. Set in a distant feudal interstellar empire, the narrative explores the hazardous desert planet Arrakis, home to giant sandworms and the spice melange, which prolongs human life and enables faster-than-light interstellar navigation. When young Paul Atreides and his family are betrayed, Paul joins the native desert Fremen to fulfill a messianic prophecy. Dune won both the inaugural Nebula Award for Best Novel and the Hugo Award, celebrated for its intricate examination of ecology, religion, politics, imperialism, and the perils of charismatic leadership.',
        usage: '1. Frank Herbert\'s 1965 novel Dune won both the Hugo and Nebula Awards for its groundbreaking ecological sci-fi world.\n2. Readers explore complex themes of political power, religion, and spice economics in the classic book Dune.',
        site1_name: 'Encyclopædia Britannica',
        site1_url: 'https://www.britannica.com/topic/Dune-novel-by-Herbert',
        site1_desc: 'Literary analysis of Frank Herbert\'s Dune, thematic exploration of ecology and political religion.',
        site1_logo: 'https://www.britannica.com/favicon.ico',
        site2_name: 'Wikipedia',
        site2_url: 'https://en.wikipedia.org/wiki/Dune_(novel)',
        site2_desc: 'Publishing history, serialized origins in Analog magazine, and literary influence of Frank Herbert\'s masterpiece.',
        site2_logo: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
        keywords: 'book novel frank herbert literature 1965 sci-fi science fiction author hugo nebula fremen spice'
      },

      // CARS
      {
        entity: 'cars',
        sense_key: 'movie',
        category: 'Movie / Pixar Animation',
        title: 'Cars (2006 Pixar Animated Film)',
        heading: '**Cars (2006 Film)**',
        explanation: 'Cars is a 2006 American computer-animated sports comedy film produced by Pixar Animation Studios and directed by John Lasseter. Set in a colorful world populated entirely by anthropomorphic vehicles, the film centers on cocky rookie racecar Lightning McQueen (voiced by Owen Wilson), who gets stranded in the faded desert town of Radiator Springs along historic Route 66 on his way to the prestigious Piston Cup championship. Through friendships with tow truck Mater (Larry the Cable Guy) and former racing champion Doc Hudson (Paul Newman), McQueen learns that winning trophies is meaningless without humility and camaraderie. Cars was a commercial triumph, generating a multi-billion dollar merchandising franchise and two theatrical sequels.',
        usage: '1. Pixar\'s animated film Cars introduced iconic characters like Lightning McQueen and Mater along Route 66.\n2. Owen Wilson voiced the ambitious rookie racecar Lightning McQueen in the 2006 movie Cars.',
        site1_name: 'IMDb',
        site1_url: 'https://www.imdb.com/title/tt0317219/',
        site1_desc: 'Full credits, voice cast, and ratings for Pixar\'s Cars (2006) on IMDb.',
        site1_logo: 'https://m.media-amazon.com/images/G/01/imdb/images/plugins/imdb_46x22-2264473254._CB485930416_.png',
        site2_name: 'Wikipedia',
        site2_url: 'https://en.wikipedia.org/wiki/Cars_(film)',
        site2_desc: 'Production, Route 66 inspiration, automotive designs, and box office legacy of Pixar\'s Cars.',
        site2_logo: 'https://en.wikipedia.org/static/favicon/wikipedia.ico',
        keywords: 'movie film cinema pixar animation 2006 lightning mcqueen mater route 66 racecar cartoon'
      },

      // CASABLANCA
      {
        entity: 'casablanca',
        sense_key: 'movie',
        category: 'Cinema / Classic Film',
        title: 'Casablanca (1942 Classic Film)',
        heading: '**Casablanca (1942 Film)**',
        explanation: 'Casablanca is a 1942 classic American romantic drama film directed by Michael Curtiz, celebrated as one of the greatest masterpieces in cinematic history. Set during World War II in the Vichy-controlled Moroccan port city of Casablanca, the film stars Humphrey Bogart as cynical American expatriate Rick Blaine, proprietor of an upscale nightclub and gambling den. When his former lover Ilsa Lund (Ingrid Bergman) unexpectedly walks into his cafe alongside her heroic Czech Resistance leader husband Victor Laszlo, Rick is torn between his lingering love and helping Laszlo escape to continue fighting the Nazis. Casablanca won three Academy Awards—Best Picture, Best Director, and Best Adapted Screenplay—and produced iconic quotes like "Here\'s looking at you, kid".',
        usage: '1. Casablanca is celebrated by film historians as one of the greatest romantic dramas ever produced in Hollywood.\n2. Humphrey Bogart and Ingrid Bergman delivered legendary performances in the 1942 classic movie Casablanca.',
        site1_name: 'AFI (American Film Institute)',
        site1_url: 'https://www.afi.com/afis-100-years-100-movies/',
        site1_desc: 'AFI ranking Casablanca among the top cinematic masterpieces in American history.',
        site1_logo: 'https://www.afi.com/favicon.ico',
        site2_name: 'IMDb',
        site2_url: 'https://www.imdb.com/title/tt0034583/',
        site2_desc: 'Full cast list, Oscar awards, quotes, and user reviews for Casablanca (1942).',
        site2_logo: 'https://m.media-amazon.com/images/G/01/imdb/images/plugins/imdb_46x22-2264473254._CB485930416_.png',
        keywords: 'movie film cinema 1942 humphrey bogart ingrid bergman classic romance war oscar rick'
      },
      {
        entity: 'casablanca',
        sense_key: 'geography',
        category: 'Geography / City',
        title: 'Casablanca (Moroccan Port City)',
        heading: '**Casablanca (City in Morocco)**',
        explanation: 'Casablanca (Arabic: Dar al-Baida) is the largest city in Morocco and the economic and business capital of the kingdom, located on the Atlantic coast of North Africa. With an urban population exceeding 3.7 million residents, Casablanca serves as Morocco\'s chief port and one of the largest financial and commercial hubs on the African continent. The city is renowned for its blend of French colonial Mauresque architecture, sprawling coastal boulevards, and the monumental Hassan II Mosque, the second-largest functioning mosque in Africa, featuring a 210-meter minaret towering directly over the Atlantic Ocean waves. Casablanca drives roughly half of Morocco\'s industrial production and banking operations.',
        usage: '1. Casablanca is the bustling commercial and financial engine of Morocco, situated on the Atlantic coastline.\n2. Visitors in Casablanca marvel at the Hassan II Mosque, one of the world\'s largest architectural wonders.',
        site1_name: 'Encyclopædia Britannica',
        site1_url: 'https://www.britannica.com/place/Casablanca-Morocco',
        site1_desc: 'Historical and geographical overview of Casablanca\'s port development, culture, and economy.',
        site1_logo: 'https://www.britannica.com/favicon.ico',
        site2_name: 'Morocco Tourism',
        site2_url: 'https://www.visitmorocco.com/en/travel/casablanca',
        site2_desc: 'Official travel guide to Casablanca, Hassan II Mosque, the Corniche, and city landmarks.',
        site2_logo: 'https://www.visitmorocco.com/favicon.ico',
        keywords: 'city morocco port africa geography atlantic ocean hassan ii economic commercial dar al-baida'
      }
    ];

    for (const s of SENSES) {
      insert.run(
        s.entity, s.sense_key, s.category, s.title, s.heading,
        s.explanation, s.usage,
        s.site1_name, s.site1_url, s.site1_desc, s.site1_logo,
        s.site2_name, s.site2_url, s.site2_desc, s.site2_logo,
        s.keywords
      );
    }
  }

  // Parse a user query and determine if they are specifying a particular meaning
  // Works for: "movie madagascar", "madagascar movie", "the movie madagascar",
  // "movie madacasgar" (with typo), "madagascar the film", "apple company", "python snake"
  resolveQuery(rawQuery) {
    if (!rawQuery) return null;
    const clean = rawQuery.toLowerCase().trim().replace(/[?!.,;]/g, '');

    // Stopwords that don't add semantic disambiguation value
    const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'in', 'called', 'named', 'about', 'as', 'for', 'is', 'what', 'define']);
    const rawTokens = clean.split(/\s+/).filter(Boolean);
    const tokens = rawTokens.filter(t => !STOPWORDS.has(t));

    if (tokens.length === 0) return null;

    // 1. Identify which qualifier group (if any) was used
    let matchedSenseKey = null;
    let qualifierToken = null;

    for (const t of tokens) {
      for (const [groupKey, keywords] of Object.entries(QUALIFIER_GROUPS)) {
        if (keywords.includes(t)) {
          matchedSenseKey = groupKey;
          qualifierToken = t;
          break;
        }
      }
      if (matchedSenseKey) break;
    }

    // 2. Identify candidate entity tokens
    const remainingTokens = tokens.filter(t => t !== qualifierToken);
    let candidateEntity = remainingTokens.join(' ').trim();

    // If no qualifier was explicitly recognized, check if candidate itself matches an entity directly
    // e.g. "madagascar"
    if (!matchedSenseKey && remainingTokens.length === 0 && tokens.length === 1) {
      candidateEntity = tokens[0];
    }

    // Get all known entities from DB
    const allEntities = this.allEntitiesStmt.all().map(r => r.entity);

    // 3. Entity resolution with fuzzy / typo matching (e.g. "madacasgar" -> "madagascar")
    let resolvedEntity = null;

    if (allEntities.includes(candidateEntity)) {
      resolvedEntity = candidateEntity;
    } else {
      // Check candidateEntity against known entities
      let bestDist = 3;
      for (const known of allEntities) {
        if (candidateEntity === known) {
          resolvedEntity = known;
          break;
        }
        const dist = levenshteinDistance(candidateEntity, known);
        if (dist <= 2 && dist < bestDist) {
          bestDist = dist;
          resolvedEntity = known;
        }
      }

      // If still not resolved, check each individual token
      if (!resolvedEntity) {
        for (const tok of remainingTokens) {
          if (allEntities.includes(tok)) {
            resolvedEntity = tok;
            break;
          }
          for (const known of allEntities) {
            const dist = levenshteinDistance(tok, known);
            if (dist <= 2 && dist < bestDist) {
              bestDist = dist;
              resolvedEntity = known;
            }
          }
        }
      }
    }

    if (!resolvedEntity) {
      return null; // Not an entity tracked in disambiguation
    }

    // Retrieve all senses for this resolved entity
    const rows = this.selectStmt.all(resolvedEntity);
    if (!rows || rows.length === 0) return null;

    // 4. Select the specific sense requested by the user
    let chosenSense = null;

    if (matchedSenseKey) {
      // Find row matching the qualifier category or sense_key
      chosenSense = rows.find(r => r.sense_key === matchedSenseKey);
      if (!chosenSense) {
        // Fallback: check keywords
        chosenSense = rows.find(r => r.keywords.includes(qualifierToken));
      }
    }

    // If no qualifier was provided (e.g. user just typed "madagascar"),
    // do not hijack ordinary dictionary lookup unless explicit qualifier was present!
    if (!matchedSenseKey) {
      return null;
    }

    if (!chosenSense) {
      chosenSense = rows[0];
    }

    // Collect alternate senses for suggested queries
    const alternates = rows
      .filter(r => r.id !== chosenSense.id)
      .map(r => ({
        title: r.title,
        sense: r.sense_key,
        suggestedQuery: `${r.sense_key} ${resolvedEntity}`
      }));

    let site1Domain = '';
    let site2Domain = '';
    try { site1Domain = new URL(chosenSense.site1_url).hostname; } catch (_) {}
    try { site2Domain = new URL(chosenSense.site2_url).hostname; } catch (_) {}

    return {
      found: true,
      query: rawQuery,
      category: `Disambiguation`,
      title: chosenSense.title,
      heading: chosenSense.heading,
      explanation: chosenSense.explanation,
      usage: chosenSense.usage,
      raw_entry: `${chosenSense.heading}\n\nExplanation:\n${chosenSense.explanation}\n\nUsage:\n${chosenSense.usage}`,
      snippet: chosenSense.explanation,
      details: {
        word: resolvedEntity,
        heading: chosenSense.heading,
        explanation: chosenSense.explanation,
        usage: chosenSense.usage,
        category: chosenSense.category
      },
      alternates,
      sources: [
        {
          siteName: chosenSense.site1_name,
          domain: site1Domain,
          url: chosenSense.site1_url,
          title: chosenSense.title,
          description: chosenSense.site1_desc,
          logo: chosenSense.site1_logo,
          image: null
        },
        {
          siteName: chosenSense.site2_name,
          domain: site2Domain,
          url: chosenSense.site2_url,
          title: chosenSense.title,
          description: chosenSense.site2_desc,
          logo: chosenSense.site2_logo,
          image: null
        }
      ],
      isLocalDisambiguation: true
    };
  }
}
