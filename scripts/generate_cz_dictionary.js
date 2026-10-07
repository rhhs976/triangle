import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, '../data/my_dictionary.db');

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA busy_timeout = 5000;');

const checkStmt = db.prepare('SELECT word FROM my_dictionary WHERE word = ? LIMIT 1');
const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO my_dictionary (word, heading, explanation, usage, raw_entry, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// High-quality C through Z foundational dictionary database
const CZ_ENTRIES = [
  // C
  {
    word: "calendar",
    explanation: "A system of organizing days, weeks, months, and years for social, religious, commercial, or administrative purposes, typically keyed to astronomical cycles such as Earth's orbit around the Sun or the lunar phases.",
    usage: "1. She marked the project deadlines and family birthdays carefully across her digital calendar.\n2. The Gregorian calendar is the internationally accepted civil calendar used across modern civilization."
  },
  {
    word: "camera",
    explanation: "An optical instrument used for capturing visual images, either as still photographs or sequences of moving video, by focusing light through a lens onto photosensitive film or an electronic sensor array.",
    usage: "1. The wildlife photographer adjusted the shutter speed on her digital camera to capture the eagle in flight.\n2. Modern smartphones integrate sophisticated multi-lens camera systems with computational image processing."
  },
  {
    word: "campaign",
    explanation: "A planned, coordinated series of actions and operations conducted over a period of time to achieve a specific political, commercial, military, or social objective.",
    usage: "1. The public health organization launched a nationwide campaign to raise awareness about cardiovascular health.\n2. Volunteers rallied across the district to support the candidate's grassroots political campaign."
  },
  {
    word: "candidate",
    explanation: "A person who seeks or is nominated for an office, honor, employment position, or degree, undergoing assessment or competitive election.",
    usage: "1. The hiring committee interviewed three outstanding candidates for the lead software architect position.\n2. Each mayoral candidate presented a comprehensive economic development plan during the public debate."
  },
  {
    word: "candle",
    explanation: "A cylinder or block of solid wax with an embedded central wick that is ignited to produce steady ambient light, and historically heat, often infused with fragrant essential oils.",
    usage: "1. When the storm knocked out the electricity, they lit scented soy candles to illuminate the dining room.\n2. The warm flickering glow of the candle created a tranquil and peaceful atmosphere in the study."
  },
  {
    word: "capacity",
    explanation: "The maximum amount, volume, or number that a container, facility, or system can hold, absorb, or produce; or an individual's innate mental or physical ability to perform a task.",
    usage: "1. The newly constructed civic stadium has a seating capacity of over sixty thousand spectators.\n2. Her exceptional capacity for empathetic active listening made her a revered counselor and mentor."
  },
  {
    word: "capital",
    explanation: "Wealth in the form of money or financial assets possessed by an organization or person for production or investment; or the city that functions as the official administrative seat of government.",
    usage: "1. Entrepreneurs secured early venture capital to accelerate research and market development for their product.\n2. Paris is the historic capital and cultural heart of France, attracting millions of international travelers."
  },
  {
    word: "carbon",
    explanation: "A nonmetallic chemical element of atomic number 6 (symbol C) that forms the chemical basis of all known organic life due to its unique capability to form four stable covalent bonds.",
    usage: "1. The diverse chemistry of carbon compounds enables the complex molecular structures found in DNA and proteins.\n2. Climate scientists emphasize the urgent necessity of reducing atmospheric carbon emissions worldwide."
  },
  {
    word: "castle",
    explanation: "A large fortified building or complex of buildings constructed in Europe and Asia during the Middle Ages, primarily serving as a fortified defensive stronghold and noble residence.",
    usage: "1. The medieval stone castle towered majestically on the steep cliff overlooking the winding river valley.\n2. Visitors crossed the historic wooden drawbridge to explore the castle's vaulted banquet halls."
  },
  {
    word: "category",
    explanation: "A distinct class or division of people, items, or concepts regarded as having particular shared characteristics, qualities, or functions within a classification system.",
    usage: "1. The museum cataloged its rare artifacts into categories based on historical epoch and geographic origin.\n2. Modern e-commerce platforms allow shoppers to filter thousands of products by category and customer rating."
  },
  {
    word: "caution",
    explanation: "Care taken to avoid danger, mistakes, risk, or harm; prudent forethought in speech or action; or an advisory warning delivered to prevent mishap.",
    usage: "1. Mountain hikers exercised extreme caution when navigating the icy footpath along the ridge.\n2. Financial advisors urged caution before investing heavily in volatile speculative assets."
  },
  {
    word: "celebrate",
    explanation: "To acknowledge a significant day, event, or accomplishment with social festivities, ceremonies, or joyful public gatherings; or to honor and praise publicly.",
    usage: "1. The community gathered in the town square to celebrate the anniversary of their historic founding.\n2. Family and friends organized a surprise dinner party to celebrate her promotion to senior partner."
  },
  {
    word: "cell",
    explanation: "The basic structural, functional, and biological unit of all known living organisms, often called the building block of life; or a small enclosed compartment or battery unit.",
    usage: "1. Human stem cells possess the remarkable ability to differentiate into specialized cell types in the body.\n2. Solar photovoltaic cells convert absorbed sunlight directly into usable clean electricity."
  },
  {
    word: "century",
    explanation: "A period of one hundred consecutive years, often counted starting from a year ending in 01; an era marking profound cultural and technological shifts.",
    usage: "1. The twentieth century witnessed monumental advances in aviation, telecommunications, and medicine.\n2. The ancient cathedral has stood firm on the hill for more than seven centuries."
  },
  {
    word: "ceremony",
    explanation: "A formal religious, public, or social act or series of acts performed on an occasion of solemnity, commemoration, or ritual significance.",
    usage: "1. University graduates in academic regalia marched proudly across the stage during the commencement ceremony.\n2. The Olympic opening ceremony presented a dazzling cultural showcase honoring global unity and athletic excellence."
  },
  {
    word: "champion",
    explanation: "A person or team that has defeated all rivals in a competition or tournament; or an advocate who vigorously defends, fights for, or supports a cause.",
    usage: "1. The chess grandmaster retained her world champion title after an intense twelve-game championship match.\n2. Throughout her career, she served as an unwavering champion for educational access and civil equality."
  },
  {
    word: "chaos",
    explanation: "A state of complete disorder, confusion, and unpredictable turmoil; in physics and mathematics, dynamic systems exhibiting extreme sensitivity to initial conditions.",
    usage: "1. The sudden transit strike plunged the metropolitan morning commute into temporary chaos.\n2. Chaos theory mathematically explores how minuscule atmospheric fluctuations can alter distant weather patterns."
  },
  {
    word: "character",
    explanation: "The mental and moral qualities distinctive to an individual, representing moral integrity and fortitude; or a fictional persona depicted in literature, film, or theatre.",
    usage: "1. A person's true character is revealed not during moments of comfort, but when facing intense adversity.\n2. The novelist created a complex, deeply empathetic protagonist character whose choices drove the plot."
  },
  {
    word: "charity",
    explanation: "The voluntary giving of financial help, goods, or practical assistance to those in need; an organized philanthropic nonprofit entity; or benevolent goodwill and compassion.",
    usage: "1. The local charity distributed warm winter coats and hot meals to vulnerable community families.\n2. Generosity and altruistic charity remain universal virtues celebrated across diverse philosophical traditions."
  },
  {
    word: "chemistry",
    explanation: "The branch of physical natural science dealing with the identification of the substances of which matter is composed, investigating their properties, composition, and transformations.",
    usage: "1. Synthetic organic chemistry has developed lifesaving pharmaceutical compounds that cure infectious diseases.\n2. In high school chemistry lab, students combined acid and base solutions to observe neutralization reactions."
  },
  {
    word: "child",
    explanation: "A young human being below the age of physical and legal maturity, typically developing through infancy, toddlerhood, and childhood under parental or guardian care.",
    usage: "1. Outdoor unstructured play encourages a child to develop creativity, social cooperation, and physical agility.\n2. The pediatrician carefully monitored the child's developmental milestones and nutritional health."
  },
  {
    word: "choice",
    explanation: "An act of selecting or making a decision between two or more possibilities, alternatives, or courses of action; or the range of available options.",
    usage: "1. Every individual faces the daily choice of acting with compassion and integrity toward their peers.\n2. Consumers in the modern marketplace enjoy a vast choice of sustainably sourced grocery products."
  },
  {
    word: "circle",
    explanation: "A closed plane curve consisting of all points equidistant from a central fixed point; or an enclosed group of people bound by common interests, friendship, or trade.",
    usage: "1. The geometry student used a compass to draw a perfect circle on the graph paper.\n2. The distinguished scientist belongs to an elite international circle of theoretical physicists."
  },
  {
    word: "citizen",
    explanation: "A legally recognized subject or national of a state or commonwealth, either native or naturalized, possessing sovereign rights and civic responsibilities.",
    usage: "1. Every active citizen has the constitutional right and civic responsibility to vote in democratic elections.\n2. The naturalization ceremony welcomed hundreds of immigrants as new citizens of the nation."
  },
  {
    word: "city",
    explanation: "A large, permanent, and densely populated human settlement characterized by administrative, economic, educational, cultural, and legal institutions and infrastructure.",
    usage: "1. Tokyo is a vibrant global city renowned for its efficient transit, cultural history, and culinary excellence.\n2. Urban planners strive to design green, sustainable cities with expansive public parks and pedestrian pathways."
  },
  {
    word: "civilization",
    explanation: "An advanced stage of human social, cultural, and technological development and organization, marked by urban settlements, agriculture, labor specialization, science, and governance.",
    usage: "1. Ancient Mesopotamian civilization introduced foundational innovations including written law codes and the wheel.\n2. The preservation of historical artifacts allows future generations to understand the roots of human civilization."
  },
  {
    word: "clarity",
    explanation: "The quality of being clear, easily understood, transparent, and free from ambiguity, obscurity, or distortion in thought, expression, vision, or sound.",
    usage: "1. The professor explained the complex quantum mechanics principles with remarkable simplicity and clarity.\n2. Clear mountain spring water possesses exceptional optical clarity, revealing smooth pebbles on the riverbed."
  },
  {
    word: "climate",
    explanation: "The long-term regional or global pattern of atmospheric weather conditions—including temperature, humidity, wind, and precipitation—measured over decades.",
    usage: "1. The Mediterranean climate features warm, dry summers balanced by mild, wet winter months.\n2. Global climate change poses profound challenges for sea level regulation and agricultural food systems."
  },
  {
    word: "clock",
    explanation: "A mechanical or electronic instrument for measuring, indicating, and recording time, typically displaying hours, minutes, and seconds via hands or digital numerals.",
    usage: "1. The antique grandfather clock in the foyer chimed softly every hour with reassuring predictability.\n2. Modern atomic clocks measure vibrations of cesium atoms to maintain ultra-precise international time standards."
  },
  {
    word: "cloud",
    explanation: "A visible mass of condensed microscopic water droplets or ice crystals suspended in the atmosphere above Earth's surface; or in computing, shared remote servers and storage.",
    usage: "1. White fluffy cumulus clouds drifted lazily across the azure summer sky during the afternoon.\n2. Enterprise businesses migrate their digital databases to the cloud to enhance scalability and disaster recovery."
  },
  {
    word: "code",
    explanation: "A system of symbols, words, or letters used for communication or secrecy; or in computing, instructions written in a programming language executed by a computer.",
    usage: "1. Software developers write clean, modular source code that adheres to industry engineering standards.\n2. The cryptographic code was successfully decrypted by intelligence mathematicians using statistical analysis."
  },
  {
    word: "coffee",
    explanation: "A brewed beverage prepared from the roasted and ground seeds (beans) of the tropical Coffea plant, widely enjoyed for its rich aroma, complex flavors, and stimulating caffeine.",
    usage: "1. She started her morning with a warm mug of dark roast coffee while reading the daily newspaper.\n2. Coffee shops serve as vital modern community spaces for social connection, study, and creative work."
  },
  {
    word: "coin",
    explanation: "A flat, typically round piece of stamped metal or alloy issued by governmental authority as legal tender currency, or to invent or devise a new word or phrase.",
    usage: "1. The archaeologist uncovered a well-preserved silver coin bearing the portrait of Roman Emperor Augustus.\n2. Writers frequently coin memorable terms to describe novel cultural and technological phenomena."
  },
  {
    word: "cold",
    explanation: "Having a relatively low temperature, especially in comparison with the human body; lacking heat, warmth, or emotional affection.",
    usage: "1. The brisk winter wind made the morning air feel bitterly cold, prompting people to wear heavy coats.\n2. He was greeted with a polite but distant cold demeanor by the skeptical board members."
  },
  {
    word: "color",
    explanation: "The visual perceptual property corresponding in humans to the categories called red, yellow, blue, and others, derived from the spectrum of light interacting with photoreceptor cells.",
    usage: "1. Autumn transforms the forest foliage into a breathtaking panorama of vibrant crimson, orange, and gold color.\n2. Artists study optical color theory to understand how complementary hues harmonize on canvas."
  },
  {
    word: "comfort",
    explanation: "A state of physical ease and freedom from pain, constraint, or hardship; or consolation, encouragement, and emotional relief offered during times of sorrow.",
    usage: "1. The plush armchair and warm hearth provided extraordinary physical comfort after a long snowy trek.\n2. Compassionate words from trusted friends brought genuine comfort during their time of bereavement."
  },
  {
    word: "commerce",
    explanation: "The activity of buying and selling goods, services, and commodities on a large scale, encompassing wholesale, retail, transport, and international trade exchange.",
    usage: "1. The historic seaport became a bustling international center of maritime commerce and cultural exchange.\n2. E-commerce platforms have fundamentally transformed modern retail shopping and consumer logistics."
  },
  {
    word: "community",
    explanation: "A social group of living organisms or people sharing a common location, heritage, interests, cultural norms, or mutual responsibilities and support.",
    usage: "1. Neighbors organized a volunteer weekend to plant flowering trees and clean up their local community park.\n2. Online open-source communities collaborate globally to build and maintain essential software tools."
  },
  {
    word: "compass",
    explanation: "An instrument containing a magnetized pointer that indicates the direction of magnetic north, used for navigation and geographic orientation.",
    usage: "1. The wilderness backpacker used a topographic map and magnetic compass to navigate through the dense forest.\n2. A person's inner moral compass guides their ethical decisions when facing challenging dilemmas."
  },
  {
    word: "compassion",
    explanation: "Deep awareness of and sympathy for the suffering or misfortune of another, accompanied by a strong active desire to alleviate that distress through caring action.",
    usage: "1. Healthcare professionals approach vulnerable patients with boundless patience, clinical skill, and genuine compassion.\n2. Practicing daily compassion toward others creates a more connected, supportive, and understanding society."
  },
  {
    word: "concept",
    explanation: "An abstract idea, generalized notion, or mental representation conceived in the mind, serving as the foundational building block of thought, theory, and science.",
    usage: "1. The teacher introduced the mathematical concept of fractions using colorful visual diagrams and models.\n2. Architectural firms design innovative concept buildings that push the boundaries of sustainable engineering."
  },
  {
    word: "confidence",
    explanation: "A feeling of self-assurance arising from one's appreciation of one's own abilities or qualities; or full trust and reliance placed in a person, system, or outcome.",
    usage: "1. Through dedicated rehearsal, the pianist stepped onto the concert stage with poise and calm confidence.\n2. Transparent corporate governance maintains public and investor confidence in financial institutions."
  },
  {
    word: "conflict",
    explanation: "A serious disagreement, argument, or clash between opposing ideas, interests, or military forces; or an internal psychological struggle between incompatible impulses.",
    usage: "1. Skilled diplomatic mediators worked tirelessly to de-escalate the international border conflict.\n2. He experienced an intense internal conflict between pursuing financial security and following his creative artistic passions."
  },
  {
    word: "connection",
    explanation: "A relationship, association, or link in which a person, thing, or idea is linked or associated with something else; or a physical or digital communications link.",
    usage: "1. Meaningful social connection is widely recognized by psychologists as vital for emotional health and longevity.\n2. High-speed internet connections allow colleagues across different continents to collaborate seamlessly in real time."
  },
  {
    word: "conscience",
    explanation: "An inner feeling or voice viewed as acting as a guide to the rightness or wrongness of one's behavior, urging ethical integrity and evoking remorse upon transgression.",
    usage: "1. His moral conscience would not allow him to remain silent while observing an unfair practice.\n2. She made restitution for the unintended error, feeling a profound sense of peace and a clear conscience."
  },
  {
    word: "courage",
    explanation: "The mental or moral strength to venture, persevere, and withstand danger, fear, or difficulty; the quality of acting righteously despite apprehension.",
    usage: "1. It takes immense personal courage to stand up for an unpopular truth in front of a critical audience.\n2. The firefighters demonstrated extraordinary courage when entering the burning structure to rescue trapped residents."
  },
  {
    word: "culture",
    explanation: "The collective social behavior, institutions, and norms found in human societies, as well as the knowledge, beliefs, arts, laws, customs, and habits of individuals in these groups.",
    usage: "1. Exploring international culinary traditions offers a delicious gateway into understanding another nation's culture.\n2. The company cultivated an organizational culture centered on transparent communication, mutual respect, and innovation."
  },

  // D
  {
    word: "dance",
    explanation: "A performing art form consisting of purposefully selected sequences of human movement, possessing aesthetic, symbolic, and rhythmic value and typically accompanied by music.",
    usage: "1. Traditional cultural dance forms celebrate historical folklore through energetic choreography and colorful costumes.\n2. The couple celebrated their wedding anniversary with a slow, graceful dance under the pavilion lights."
  },
  {
    word: "danger",
    explanation: "The possibility of suffering harm, injury, loss, or death; a perilous circumstance, hazard, or risk threatening safety or well-being.",
    usage: "1. Warning signs were posted along the coastal trail to alert hikers to the danger of steep, unstable cliffs.\n2. Experienced mountaineers assess avalanche danger carefully before embarking on winter alpine climbs."
  },
  {
    word: "dark",
    explanation: "Characterized by the absence, deficiency, or total lack of light; deep in shade or hue; or somber, mysterious, and hidden from view.",
    usage: "1. We stepped outside into the dark night to gaze at the spectacular celestial display of shooting stars.\n2. He chose a dark charcoal wool coat that looked sophisticated, timeless, and tailored."
  },
  {
    word: "database",
    explanation: "A structured, organized collection of data or digital information stored electronically in a computer system and managed via a Database Management System (DBMS).",
    usage: "1. The hospital maintains a secure electronic medical database to track patient histories and treatment regimens.\n2. Relational databases utilize SQL queries to retrieve, update, and analyze complex relational tables efficiently."
  },
  {
    word: "dawn",
    explanation: "The first appearance of light in the morning sky before sunrise; daybreak; or metaphorically, the beginning or initial development of an era or idea.",
    usage: "1. Fishermen prepared their boats at the harbor at the break of dawn, enjoying the quiet morning mist.\n2. The invention of movable-type printing marked the dawn of widespread literacy and modern scientific inquiry."
  },
  {
    word: "day",
    explanation: "The approximately 24-hour period of Earth's rotation on its axis, or specifically the interval of daylight between sunrise and sunset.",
    usage: "1. Sunlight warmed the garden throughout the long summer day, encouraging tomatoes and herbs to flourish.\n2. They spent the entire day hiking along the panoramic mountain ridge before setting up camp."
  },
  {
    word: "decision",
    explanation: "A conclusion, judgment, or resolution reached after thoughtful consideration, analysis of evidence, or debate among alternatives.",
    usage: "1. Making an informed career decision requires evaluating one's personal values, skills, and long-term aspirations.\n2. The Supreme Court issued a landmark judicial decision that upheld fundamental civil voting protections."
  },
  {
    word: "deep",
    explanation: "Extending far downward from the surface or top, far back from the front, or exhibiting profound intellectual, emotional, or acoustic resonance.",
    usage: "1. Oceanic trenches like the Mariana Trench reach depths of thousands of meters into the deep ocean floor.\n2. The philosopher shared deep insights on the nature of human consciousness during her keynote lecture."
  },
  {
    word: "definition",
    explanation: "A statement of the exact meaning of a word, phrase, or concept, especially as given in an authoritative dictionary; or the degree of distinctness and clarity in an image.",
    usage: "1. Consulting an authoritative modern dictionary provides the precise definition and contextual usage of vocabulary.\n2. High-definition television displays deliver stunning visual clarity with millions of crisp pixels."
  },
  {
    word: "degree",
    explanation: "A unit of measurement for angles or temperature; or a stage, extent, or intensity of a quality; or an academic title conferred by a college upon graduation.",
    usage: "1. The thermometer registered an unseasonably warm twenty-five degrees Celsius during the spring afternoon.\n2. After completing his rigorous thesis defense, he earned a Master of Science degree in biochemistry."
  },
  {
    word: "democracy",
    explanation: "A system of government where sovereign political power is vested in the people and exercised directly or through freely elected representatives under the rule of law.",
    usage: "1. Vibrant civic participation, an independent judiciary, and a free press are essential pillars of a healthy democracy.\n2. Citizens voted enthusiastically in the national referendum, exercising their democratic rights."
  },
  {
    word: "density",
    explanation: "The degree of compactness of a substance, defined quantitatively in physics as mass per unit volume; or the number of items or people in a given area.",
    usage: "1. Gold has an exceptionally high physical density, making a small bar feel surprisingly heavy in one's hand.\n2. Urban planners evaluate population density to ensure municipal transit systems meet residential needs."
  },
  {
    word: "desire",
    explanation: "A strong feeling of wanting to have something or wishing for something to happen; a conscious aspiration, passion, or longing.",
    usage: "1. Her lifelong desire to help underserved communities motivated her to pursue a career in public healthcare.\n2. Artists channel their deepest creative desires into expressive paintings, music, and poetry."
  },
  {
    word: "detail",
    explanation: "An individual fact, feature, item, or specific element of a larger whole; meticulous attention to small particulars in design, art, or analysis.",
    usage: "1. The architectural restoration preserved every intricate carved wood detail of the historic Victorian estate.\n2. When reviewing scientific research papers, peer reviewers examine experimental methodologies in meticulous detail."
  },
  {
    word: "dialogue",
    explanation: "A conversation between two or more people as a feature of a book, play, or movie; or a constructive diplomatic discussion aimed at resolving conflict.",
    usage: "1. Open diplomatic dialogue between international leaders is essential for preserving global peace and security.\n2. The screenplay was praised by critics for its witty, authentic dialogue and believable character interactions."
  },
  {
    word: "diamond",
    explanation: "A precious crystalline gemstone composed of pure carbon atoms arranged in an exceptionally rigid tetrahedral lattice, renowned as the hardest known natural mineral.",
    usage: "1. Because of its supreme hardness, industrial diamond is utilized extensively in heavy cutting and drilling equipment.\n2. The engagement ring featured a brilliantly cut diamond that captured light from every angle."
  },
  {
    word: "dignity",
    explanation: "The state or quality of being worthy of honor, respect, and self-worth; an inherent value possessed by every human being regardless of status.",
    usage: "1. Universal human rights charters affirm that every individual is born with inherent dignity and equal rights.\n2. She handled the professional disappointment with poise, grace, and unshakable personal dignity."
  },
  {
    word: "dimension",
    explanation: "A measurable extent of a physical space, such as length, width, height, or depth; or in theoretical physics, a coordinate axis characterizing spacetime.",
    usage: "1. Carpenters measured the precise dimensions of the doorway before ordering the custom solid wood door.\n2. Einstein's relativity unified the three spatial dimensions with time as a four-dimensional spacetime continuum."
  },
  {
    word: "direction",
    explanation: "The path or line along which a person or object moves, points, or faces; guidance, instructions, or management governing an endeavor.",
    usage: "1. The ship altered its navigational direction toward the south to avoid the impending tropical storm.\n2. Under the inspiring direction of their conductor, the youth symphony orchestra performed flawlessly."
  },
  {
    word: "discipline",
    explanation: "The practice of training oneself or others to obey rules, code of behavior, and rigorous habits; or a specialized branch of academic knowledge and learning.",
    usage: "1. Achieving mastery in classical violin demands years of patient daily discipline and focused practice.\n2. Mechanical engineering is a demanding academic discipline combining mathematics, physics, and material science."
  },
  {
    word: "discovery",
    explanation: "The act or process of finding, learning, or encountering something previously unknown, hidden, or unobserved; a breakthrough insight.",
    usage: "1. Alexander Fleming's accidental discovery of penicillin revolutionized medicine and saved millions of lives from bacterial infections.\n2. Scientific space telescopes facilitate the groundbreaking discovery of distant exoplanets across the Milky Way."
  },
  {
    word: "distance",
    explanation: "The amount of space between two points, objects, or locations, measured along a straight line or travel path; or an emotional detachment.",
    usage: "1. The marathon runners conquered a challenging distance of over forty-two kilometers through city streets.\n2. Advanced optical telescopes enable astronomers to measure the vast cosmological distance to remote galaxies."
  },
  {
    word: "diversity",
    explanation: "The state or quality of having many different forms, types, ideas, or elements; the inclusion of diverse cultural identities, perspectives, and backgrounds.",
    usage: "1. Biological diversity in coral reefs strengthens ecological resilience against shifting environmental stressors.\n2. Workplace diversity fosters innovation by bringing together individuals with varied life experiences and viewpoints."
  },
  {
    word: "dream",
    explanation: "A series of thoughts, images, sensations, and emotions occurring involuntarily in the mind during REM sleep; or a cherished cherished ambition or goal.",
    usage: "1. She woke up with vivid memories of a whimsical dream where she was flying over verdant mountains.\n2. His lifelong dream of founding a nonprofit wildlife animal sanctuary finally became a reality."
  },
  {
    word: "duty",
    explanation: "A moral, legal, or professional obligation that one is required to perform; a task or responsibility associated with a job, office, or citizenship.",
    usage: "1. Serving on a trial jury is considered an essential civic duty of citizens in democratic societies.\n2. Medical practitioners have a fundamental ethical duty to prioritize the welfare and dignity of their patients."
  },

  // E
  {
    word: "earth",
    explanation: "The third planet from the Sun in our Solar System, the densest and fifth-largest planet, and the only astronomical body known to harbor biological life.",
    usage: "1. Earth's protective atmosphere and liquid water oceans create the ideal conditions to sustain complex life.\n2. Sustainable conservation efforts aim to protect the Earth's natural ecosystems for generations to come."
  },
  {
    word: "echo",
    explanation: "A repetition or reflection of sound waves arriving at the listener's ear with a perceptible delay after bouncing off a solid surface; or an evocative reminder.",
    usage: "1. The hiker shouted into the granite canyon and heard a distinct echo bounce back seconds later.\n2. The candidate's passionate campaign speech found a strong, resonant echo among working-class voters."
  },
  {
    word: "eclipse",
    explanation: "An astronomical event occurring when one celestial body moves into the shadow of another body or passes directly between it and the observer.",
    usage: "1. Crowds gathered with protective eclipse glasses to witness the breathtaking totality of the solar eclipse.\n2. During a lunar eclipse, Earth passes between the Sun and Moon, casting a reddish shadow across the lunar surface."
  },
  {
    word: "ecology",
    explanation: "The scientific study of relationships, interactions, and energy flows between living organisms and their physical and biological environments.",
    usage: "1. Wetland ecology demonstrates how coastal marshlands purify runoff water and shelter migratory bird species.\n2. Understanding marine ecology is critical for preventing the collapse of global commercial fish stocks."
  },
  {
    word: "economy",
    explanation: "The comprehensive system of production, distribution, trade, consumption, and financial management of goods and services in a region or country.",
    usage: "1. Transitioning to renewable clean energy fuels innovation and creates high-skilled jobs across the national economy.\n2. Economists evaluate gross domestic product, inflation, and employment figures to gauge the strength of the economy."
  },
  {
    word: "education",
    explanation: "The systematic process of receiving or giving systematic instruction, knowledge, skills, values, and critical thinking capabilities, especially at school or university.",
    usage: "1. Investing in accessible public education empowers young people to reach their full personal and professional potential.\n2. Lifelong education through reading and inquiry fosters cognitive agility, empathy, and informed citizenship."
  },
  {
    word: "electricity",
    explanation: "A fundamental form of physical energy resulting from the existence and flow of charged subatomic particles such as electrons and protons.",
    usage: "1. Renewable wind turbines generate clean electricity that powers thousands of homes across the regional grid.\n2. Michael Faraday's experiments in electromagnetic induction laid the groundwork for modern electricity generation."
  },
  {
    word: "electron",
    explanation: "A stable subatomic particle with a negative elementary electric charge, orbiting atomic nuclei and serving as the primary carrier of electricity in solids.",
    usage: "1. The flow of valence electrons through a copper wire constitutes an electric current that powers appliances.\n2. Chemical bonds between atoms form primarily through the sharing or transfer of outer valence electrons."
  },
  {
    word: "elegance",
    explanation: "The quality of being graceful, stylish, and pleasing in appearance, demeanor, or design; or in science and mathematics, supreme simplicity and effectiveness.",
    usage: "1. The mathematician was admired for the conceptual elegance and simplicity of her analytical proof.\n2. The ballroom dancer moved across the floor with effortless elegance and refined posture."
  },
  {
    word: "element",
    explanation: "A pure chemical substance that cannot be broken down into simpler substances by chemical reactions, characterized by a specific atomic number; or an essential component.",
    usage: "1. Hydrogen and helium are the two most abundant chemical elements in the known physical universe.\n2. Mutual trust and honest communication are indispensable elements of an enduring friendship."
  },
  {
    word: "emotion",
    explanation: "A complex psychological and physiological state that involves subjective conscious experience, biological arousal, and expressive behavioral responses.",
    usage: "1. Music has the profound capacity to evoke intense emotions of joy, nostalgia, and empathy in listeners.\n2. Developing emotional intelligence helps individuals regulate strong emotions like anger and anxiety constructively."
  },
  {
    word: "empathy",
    explanation: "The cognitive and emotional capacity to understand, share, and vicariously experience the feelings, thoughts, and perspectives of another human being.",
    usage: "1. Demonstrating genuine empathy helps nurses connect warmly with patients experiencing difficult illnesses.\n2. Practicing empathy bridges cultural divides and fosters mutual respect between differing communities."
  },
  {
    word: "energy",
    explanation: "The fundamental quantitative physical property representing the capacity of a system to perform work, exert force, or produce heat and motion.",
    usage: "1. The universal law of conservation of energy states that energy can neither be created nor destroyed, only transformed.\n2. Solar photovoltaic panels harness radiant light energy from the sun to generate carbon-free electrical power."
  },
  {
    word: "engine",
    explanation: "A machine designed to convert one or more forms of energy—such as thermal, chemical, or electrical energy—into mechanical motion or force.",
    usage: "1. Engineers developed an ultra-efficient internal combustion engine with reduced carbon emissions.\n2. Search engines rely on algorithmic indexers to retrieve relevant web documents in milliseconds."
  },
  {
    word: "enthusiasm",
    explanation: "Intense and eager enjoyment, interest, passion, or approval for an activity, cause, or creative pursuit.",
    usage: "1. The teacher's infectious enthusiasm for science inspired her students to conduct independent research projects.\n2. Volunteers arrived at the wildlife sanctuary with tremendous enthusiasm and energy to restore the trails."
  },
  {
    word: "entropy",
    explanation: "A thermodynamic quantity representing the unavailability of a system's thermal energy for mechanical work, commonly interpreted as a measure of disorder or randomness.",
    usage: "1. The second law of thermodynamics establishes that the total entropy of an isolated universe continually increases.\n2. In information theory, entropy quantifies the fundamental amount of uncertainty and information density in a message."
  },
  {
    word: "environment",
    explanation: "The surrounding conditions, natural habitat, and physical forces in which an organism, animal, plant, or human society lives and interacts.",
    usage: "1. Conserving fragile ecosystems protects the natural environment and preserves planetary biodiversity.\n2. A supportive, collaborative classroom environment encourages students to ask questions and take intellectual risks."
  },
  {
    word: "equilibrium",
    explanation: "A state of physical, chemical, or emotional balance in which opposing forces, influences, or reactions are equal and counterbalanced.",
    usage: "1. In chemical equilibrium, the rate of the forward reaction precisely equals the rate of the reverse reaction.\n2. Inner emotional equilibrium allows individuals to navigate life's inevitable challenges with calm clarity."
  },
  {
    word: "era",
    explanation: "A major distinct division of time, history, or geological epoch marked by characteristic events, cultural shifts, or technological milestones.",
    usage: "1. The Renaissance was a transformative era of extraordinary artistic brilliance, humanism, and scientific awakening.\n2. The introduction of personal computing and the internet heralded the modern digital era."
  },
  {
    word: "ethics",
    explanation: "The philosophical branch dedicated to systematizing, defending, and recommending concepts of right and wrong behavior; moral principles governing conduct.",
    usage: "1. Bioethics committees examine the moral and human implications of genetic engineering and clinical trials.\n2. Maintaining uncompromising professional ethics is essential for earning the long-term trust of colleagues and clients."
  },
  {
    word: "evolution",
    explanation: "The continuous biological process by which populations of living organisms change and diversify over successive generations through inherited genetic modifications and natural selection.",
    usage: "1. Charles Darwin formulated the scientific theory of biological evolution by natural selection in On the Origin of Species.\n2. The evolution of modern antibiotic resistance in bacteria underscores the dynamic power of natural selection."
  },
  {
    word: "experience",
    explanation: "Practical contact with and observation of facts, events, or environments over time; or the knowledge and skill gained through involvement in activity.",
    usage: "1. Traveling through remote regions provided the young researcher with invaluable firsthand cultural experience.\n2. Senior engineers draw upon decades of practical problem-solving experience when troubleshooting complex systems."
  },

  // F through Z select foundational master words
  {
    word: "freedom",
    explanation: "The power, right, or state of acting, speaking, or thinking as one wants without hindrance, arbitrary restraint, or tyrannical oppression.",
    usage: "1. Constitutional democracies enshrine freedom of expression and assembly as fundamental human liberties.\n2. Retiring from decades of rigorous work gave him the wonderful freedom to travel and pursue landscape painting."
  },
  {
    word: "future",
    explanation: "The time or period that is yet to come, encompassing all potential events, developments, and possibilities that will occur after the present moment.",
    usage: "1. Investing in renewable energy and quality education is an investment in a prosperous, sustainable future.\n2. Scientists utilize predictive modeling to anticipate how climate shifts will impact future agricultural yields."
  },
  {
    word: "galaxy",
    explanation: "A massive, gravitationally bound system consisting of stars, stellar remnants, interstellar gas, cosmic dust, and mysterious dark matter.",
    usage: "1. Our home galaxy, the Milky Way, contains between one hundred and four hundred billion stars.\n2. The Hubble and James Webb space telescopes have imaged thousands of spiral and elliptical galaxies across deep space."
  },
  {
    word: "harmony",
    explanation: "The combination of simultaneously sounded musical notes to produce pleasing chords, or an agreeable, peaceful congruity of interests and feelings.",
    usage: "1. The choir's voices blended into exquisite, shimmering musical harmony during the cathedral performance.\n2. Ecological conservation promotes living in sustainable harmony with natural flora and fauna."
  },
  {
    word: "history",
    explanation: "The systematic study, documentation, and interpretation of past events, cultures, human societies, and milestones.",
    usage: "1. Studying world history teaches us how past decisions and societal movements shape contemporary international politics.\n2. The museum exhibits artifacts chronicling the fascinating social history of ancient Mediterranean civilizations."
  },
  {
    word: "intelligence",
    explanation: "The computational and cognitive capacity to acquire, understand, synthesize, and apply knowledge, reason logically, and adapt dynamically to novel challenges.",
    usage: "1. Emotional intelligence enables people to navigate complex interpersonal relationships with empathy and tact.\n2. Artificial intelligence research focuses on developing autonomous software capable of complex perception and problem solving."
  },
  {
    word: "journey",
    explanation: "An act of traveling from one place to another, especially over a considerable distance; or a transformative path of personal or intellectual growth.",
    usage: "1. The epic cross-country train journey offered breathtaking vistas of snowy mountain passes and prairie valleys.\n2. Earning a doctorate in theoretical physics was a demanding but profoundly rewarding intellectual journey."
  },
  {
    word: "knowledge",
    explanation: "Facts, information, skills, and theoretical insights acquired through experience, rigorous education, observation, or systematic scientific investigation.",
    usage: "1. Libraries and public archives serve as invaluable repositories preserving human collective knowledge.\n2. True scientific knowledge advances by testing hypotheses rigorously against empirical observational data."
  },
  {
    word: "light",
    explanation: "Electromagnetic radiation that can be perceived by the human eye, traveling at approximately 300,000 kilometers per second, behaving as both waves and photons.",
    usage: "1. Morning sunlight streamed through the tall stained-glass windows, casting vibrant colors across the floor.\n2. Photosynthesis relies on plants absorbing light energy from the sun to synthesize glucose and release oxygen."
  },
  {
    word: "memory",
    explanation: "The faculty of the brain by which data, experiences, skills, and emotional impressions are encoded, consolidated, stored, and subsequently retrieved.",
    usage: "1. Walking through his childhood neighborhood evoked vivid, heartwarming memories of youthful summer days.\n2. Neurobiologists study how the hippocampus coordinates synaptic plasticity to form long-term memory."
  },
  {
    word: "nature",
    explanation: "The physical world and all living phenomena collectively, including plants, animals, geology, weather, and the cosmos, as opposed to artificial human creation.",
    usage: "1. Spending quiet time walking in nature has been shown by medical studies to lower stress and elevate mood.\n2. Wildlife conservation preserves the pristine, untouched beauty of wild nature for future generations."
  },
  {
    word: "ocean",
    explanation: "The vast continuous body of salt water covering more than seventy percent of Earth's surface, divided geographically into principal oceanic basins.",
    usage: "1. Marine phytoplankton in the global ocean generate over half of the oxygen in Earth's atmosphere.\n2. The Pacific Ocean is the largest and deepest ocean basin on the planet, spanning vast marine ecosystems."
  },
  {
    word: "peace",
    explanation: "A state of tranquility, mutual security, and freedom from war, conflict, civil disturbance, or personal emotional turmoil.",
    usage: "1. Diplomatic leaders gathered at the peace summit to sign an accord ending years of regional military hostility.\n2. Sitting beside the quiet alpine lake at sunrise brought a profound sense of inner emotional peace."
  },
  {
    word: "quantum",
    explanation: "The minimum discrete unit or packet of any physical entity involved in an interaction; the branch of physics exploring subatomic particle behavior.",
    usage: "1. Max Planck revolutionized modern physics when he proposed that electromagnetic radiation is emitted in discrete quanta.\n2. Quantum computers leverage quantum superposition and entanglement to solve computational problems exponentially faster."
  },
  {
    word: "reason",
    explanation: "The capacity for rational, logical, and analytical thought; the power of the mind to draw inferences, evaluate arguments, and discern objective truth.",
    usage: "1. The Enlightenment elevated human reason and empirical evidence above unexamined dogmatic superstition.\n2. She presented her scientific arguments with calm logic, persuasive evidence, and articulate reason."
  },
  {
    word: "science",
    explanation: "A systematic enterprise that builds, organizes, and tests knowledge in the form of testable explanations and verifiable predictions about the universe.",
    usage: "1. Peer-reviewed research, reproducibility, and rigorous experimentation are foundational hallmarks of modern science.\n2. Advances in medical science have eradicated infectious diseases and dramatically lengthened human lifespans."
  },
  {
    word: "time",
    explanation: "The continuous, indefinite, and irreversible progression of existence and events that occur in an apparently irreversible succession from past through present to future.",
    usage: "1. Albert Einstein demonstrated that time is not absolute, but relative to the observer's velocity and gravitational field.\n2. The ancient grandfather clock marked the relentless passage of time with steady, rhythmic ticks."
  },
  {
    word: "universe",
    explanation: "All of space, time, matter, energy, physical laws, and constants that exist collectively; the totality of the physical cosmos.",
    usage: "1. Modern astrophysics estimates that the observable universe originated approximately 13.8 billion years ago in the Big Bang.\n2. Looking up into the clear night sky inspires awe at the vast, incomprehensible scale of the universe."
  },
  {
    word: "victory",
    explanation: "An act of defeating an adversary in a battle, competitive contest, or struggle; the triumph of a worthy cause or achievement.",
    usage: "1. The underdog football team secured a thrilling victory in the final seconds of the championship match.\n2. The successful eradication of smallpox represents one of the greatest global victories in public health history."
  },
  {
    word: "wisdom",
    explanation: "The quality of having experience, knowledge, good judgment, and deep insight; the practical capacity to apply understanding constructively.",
    usage: "1. Ancient philosophers taught that true wisdom begins with the humble acknowledgment of one's own ignorance.\n2. The community sought the counsel and mature wisdom of their elders when resolving sensitive disputes."
  },
  {
    word: "year",
    explanation: "The period of 365 or 366 days in the civil calendar, corresponding to the time taken by Earth to complete one full revolution around the Sun.",
    usage: "1. Families gathered on New Year's Eve to reflect on the past twelve months and celebrate the incoming year.\n2. Earth's seasonal cycles repeat with dependable consistency over the course of each solar year."
  },
  {
    word: "zenith",
    explanation: "The point in the celestial sphere directly overhead an observer; or metaphorically, the highest point or culminating apex of power, success, or accomplishment.",
    usage: "1. At high noon on the summer solstice, the sun approaches its highest astronomical zenith in the sky.\n2. During the fifth century BCE, Athens reached the zenith of its cultural, philosophical, and architectural influence."
  }
];

console.log("=================================================");
console.log("     SEEDING C THROUGH Z FOUNDATIONAL WORDS      ");
console.log("=================================================");

let added = 0;
let skipped = 0;

for (const entry of CZ_ENTRIES) {
  const cleanWord = entry.word.toLowerCase().trim();
  const existing = checkStmt.get(cleanWord);
  if (existing) {
    skipped++;
    continue;
  }

  const heading = `**${cleanWord.charAt(0).toUpperCase() + cleanWord.slice(1)}**`;
  const rawEntry = `${heading}\n\nExplanation:\n${entry.explanation}\n\nUsage:\n${entry.usage}`;

  insertStmt.run(
    cleanWord,
    heading,
    entry.explanation,
    entry.usage,
    rawEntry,
    new Date().toISOString()
  );
  added++;
}

console.log(`✓ Process complete: Added ${added} new entries, skipped ${skipped} already present.`);
