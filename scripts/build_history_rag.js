import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILES_DIR = path.resolve(__dirname, '../files');
const JSON_PATH = path.join(FILES_DIR, 'historical_events_rag_seed.json');
const DB_PATH = path.join(FILES_DIR, 'historical_events_dictionary.db');

export const COMPREHENSIVE_HISTORY_CORPUS = [
  // ==========================================
  // ERA 1: ANCIENT CIVILIZATIONS & ANTIQUITY
  // ==========================================
  {
    era: "Ancient Civilizations & Antiquity",
    events: [
      {
        id: "cuneiform_writing_3400bc",
        title: "Invention of Cuneiform Writing",
        year: -3400,
        exact_date: "c. 3400 BC",
        summary: "In the fertile plains of southern Mesopotamia around 3400 BC, the ancient Sumerians developed cuneiform, which stands as humanity's earliest known writing system. Originating in the ancient city of Uruk as a simple pictographic method for tracking temple grain inventories, sheep livestock, and trade transactions, scribes soon refined the system by using blunt reed styluses to impress wedge-shaped marks into wet clay tablets. Over centuries, these marks evolved from literal picture drawings into sophisticated phonetic signs capable of recording abstract grammar, legal decrees, and literary epics like the Epic of Gilgamesh. The invention of cuneiform marked humanity's permanent transition from prehistory into recorded history, enabling complex administrative states and preserving human thoughts across thousands of years.",
        keywords: ["Cuneiform", "Sumerians", "Mesopotamia", "Clay Tablets", "Writing", "Uruk", "Gilgamesh"]
      },
      {
        id: "giza_pyramid_2560bc",
        title: "Construction of the Great Pyramid of Giza",
        year: -2560,
        exact_date: "c. 2560 BC",
        summary: "The Great Pyramid of Giza was constructed on the rocky Giza plateau in ancient Egypt during the Fourth Dynasty as a monumental tomb for Pharaoh Khufu. Overseen by royal architect Hemiunu, the massive undertaking required tens of thousands of skilled workers and roughly two decades to complete, utilizing more than two million limestone and granite blocks. Originally standing at nearly four hundred and eighty-one feet tall, it was covered in polished white casing stones that reflected the desert sunlight and symbolized the Pharaoh's divine ascension. For over three thousand eight hundred years, it remained the tallest man-made structure in human civilization and endures today as the sole surviving wonder of the original Seven Wonders of the Ancient World.",
        keywords: ["Great Pyramid", "Giza", "Khufu", "Pharaoh", "Ancient Egypt", "Seven Wonders", "Limestone"]
      },
      {
        id: "code_ur_nammu_2100bc",
        title: "Promulgation of the Code of Ur-Nammu",
        year: -2100,
        exact_date: "c. 2100 BC",
        summary: "Around 2100 BC in southern Mesopotamia, King Ur-Nammu of the Third Dynasty of Ur issued what is recognized by modern historians as humanity's earliest surviving written law code. Written in the Sumerian language on clay tablets, the code opened with a royal prologue declaring the king's mandate to establish equity in the land and protect the vulnerable from exploitation. Unlike later harsh penal traditions, the Code of Ur-Nammu was remarkably progressive, establishing financial monetary fines and compensatory restitutions for bodily injuries rather than physical retaliatory mutilation. By formally codifying civic rights and judicial procedures, Ur-Nammu established the foundational legal concept that societal order should rest upon written civic law rather than arbitrary monarchical decree.",
        keywords: ["Code of Ur-Nammu", "Sumer", "Ur", "Mesopotamia", "Earliest Law", "Legal Code", "Justice"]
      },
      {
        id: "code_hammurabi_1754bc",
        title: "Enactment of the Code of Hammurabi",
        year: -1754,
        exact_date: "c. 1754 BC",
        summary: "Around 1754 BC, King Hammurabi of the First Babylonian Dynasty enacted one of humanity's earliest and most complete written legal codes. Inscribed in the Akkadian language using cuneiform script onto a massive seven-foot-tall black basalt stele, the code contained two hundred and eighty-two distinct laws governing criminal justice, contracts, agriculture, and domestic life. By carving the laws onto a public monument, Hammurabi established the revolutionary precedent that the law was fixed and public rather than subject to the arbitrary whims of an individual ruler. The code introduced the celebrated principle of reciprocal justice, famously summarized as an eye for an eye, while also codifying early legal ideas such as the presumption of innocence and sworn evidence.",
        keywords: ["Hammurabi", "Babylon", "Legal Code", "Stele", "Justice", "Eye for an eye", "Cuneiform"]
      },
      {
        id: "cyrus_cylinder_539bc",
        title: "Decree of the Cyrus Cylinder",
        year: -539,
        exact_date: "539 BC",
        summary: "Following his conquest of Babylon in 539 BC, Cyrus the Great, founder of the Persian Achaemenid Empire, issued a sweeping royal declaration inscribed in Akkadian cuneiform upon a baked clay cylinder. The inscription recorded Cyrus's benevolent policy of religious tolerance, authorizing displaced captive peoples, including the Jewish population exiled under Nebuchadnezzar, to return peacefully to their ancestral homelands and rebuild their revered sanctuaries. Rather than imposing religious uniformity by military force, Cyrus recognized regional customs, reformed local temples, and abolished forced labor systems throughout his vast multi-ethnic realm. Modern historians frequently cite the Cyrus Cylinder as one of humanity's earliest declarations of human rights, religious freedom, and pluralistic governance.",
        keywords: ["Cyrus Cylinder", "Cyrus the Great", "Persia", "Babylon", "Religious Freedom", "Human Rights", "Achaemenid"]
      },
      {
        id: "battle_marathon_490bc",
        title: "The Battle of Marathon",
        year: -490,
        exact_date: "September 490 BC",
        summary: "In September 490 BC, a heavily outnumbered Athenian army led by general Miltiades confronted an invading Persian expeditionary force on the coastal plain of Marathon in eastern Attica. Employing an ingenious tactical maneuver that reinforced his flanks while deliberately thinning his center, Miltiades ordered the Greek hoplite phalanx to charge across open ground, successfully encircling and routing the Persian lines. According to enduring Greek tradition, the herald Pheidippides ran the entire distance from the battlefield to Athens to deliver news of the triumph before collapsing, inspiring the modern marathon footrace. The victory proved that the seemingly invincible Persian Empire could be defeated, safeguarding the burgeoning democratic institutions of classical Athens and inspiring the subsequent Golden Age of Greece.",
        keywords: ["Battle of Marathon", "Athens", "Miltiades", "Persian Wars", "Pheidippides", "Hoplite", "Democracy"]
      },
      {
        id: "parthenon_construction_447bc",
        title: "Construction of the Parthenon in Athens",
        year: -447,
        exact_date: "447 - 432 BC",
        summary: "Beginning in 447 BC during the political ascendancy of statesman Pericles, the city-state of Athens commenced construction of the magnificent Parthenon atop the rocky Acropolis, dedicated to the city's patron goddess Athena Parthenos. Designed by architects Ictinus and Callicrates with monumental sculptures directed by Phidias, the Doric temple incorporated sophisticated optical refinements, including subtle convex curves in the columns known as entasis to create the visual impression of perfect geometric symmetry. Financed in part through the treasury of the Delian League, the sanctuary celebrated Athenian cultural preeminence, military victory, and civic pride following the Persian Wars. The Parthenon remains the quintessential architectural icon of classical Greek civilization, embodying the enduring Western ideals of proportion, harmony, and democratic grandeur.",
        keywords: ["Parthenon", "Athens", "Pericles", "Acropolis", "Athena", "Phidias", "Classical Architecture"]
      },
      {
        id: "library_alexandria_300bc",
        title: "Founding of the Library of Alexandria",
        year: -300,
        exact_date: "c. 3rd Century BC",
        summary: "Founded in northern Egypt during the early third century BC under the rule of Ptolemy I Soter and expanded by his son Ptolemy II, the Library of Alexandria was the ancient world's most ambitious intellectual center. Conceived as part of the royal research institution known as the Mouseion, the library sought to collect a copy of every written book in existence, eventually amassing hundreds of thousands of papyrus scrolls in Greek, Egyptian, Hebrew, and Persian. Renowned scholars from across the Mediterranean gathered there to map the stars, calculate the circumference of the Earth, edit classical literature, and catalog biological species. Although centuries of budget decline, urban warfare, and fires gradually destroyed its collections, the library remains history's enduring symbol of human curiosity and universal knowledge.",
        keywords: ["Library of Alexandria", "Ptolemy", "Egypt", "Mouseion", "Papyrus", "Scholars", "Ancient World"]
      },
      {
        id: "qin_unification_221bc",
        title: "Unification of China by Qin Shi Huang",
        year: -221,
        exact_date: "221 BC",
        summary: "In 221 BC, the ambitious ruler of the state of Qin conquered the last rival realm of the Warring States period, unifying China under a single centralized authority and proclaiming himself Qin Shi Huang, the First Emperor. To bind the diverse regional provinces together, the emperor established a centralized administrative bureaucracy, connected defensive border walls into the earliest Great Wall of China, and enforced strict standardization of Chinese script characters, currency coins, cart axle widths, and measurement weights. The emperor's reign was characterized by rigid Legalist state philosophy, which suppressed dissent through the burning of philosophical books and the burial of critical scholars, yet laid the enduring structural foundation of Chinese imperial governance for the next two millennia.",
        keywords: ["Qin Shi Huang", "Qin Dynasty", "China Unification", "Great Wall", "Standardization", "Terracotta Army"]
      },
      {
        id: "silk_road_130bc",
        title: "Establishment of the Silk Road",
        year: -130,
        exact_date: "c. 130 BC",
        summary: "During China's Han Dynasty around 130 BC, Emperor Wu dispatched imperial envoy Zhang Qian on diplomatic and commercial missions into Central Asia, formally inaugurating the vast network of trade routes known as the Silk Road. Spanning thousands of miles through mountain passes, fertile oases, and deserts, the network linked dynamic commercial hubs from Chang'an to Antioch, Rome, and Alexandria. Beyond transporting precious Chinese silk, Roman glassware, and fragrant Asian spices, the Silk Road served as a grand conduit for civilizational exchange, allowing mathematical discoveries, medical traditions, paper manufacturing, and world religions like Buddhism and Islam to cross continental borders. The routes created the earliest blueprint for global economic interdependence, enriching cultures from the Pacific to the Mediterranean.",
        keywords: ["Silk Road", "Han Dynasty", "Zhang Qian", "China", "Trade", "Central Asia", "Mediterranean"]
      },
      {
        id: "roman_republic_44bc",
        title: "Assassination of Julius Caesar",
        year: -44,
        exact_date: "15 March 44 BC",
        summary: "On the Ides of March in 44 BC, Julius Caesar entered the Senate chamber in the Theatre of Pompey, where a conspiracy of roughly sixty Roman senators ambushed him. Led by Marcus Junius Brutus and Gaius Cassius Longinus, the conspirators believed eliminating the newly appointed dictator in perpetuity would restore the traditional governance of the Roman Republic. Instead of restoring civic liberty, Caesar's violent death triggered widespread outrage among the Roman populace and ignited a destructive series of civil wars. The ensuing power struggle ultimately brought down the centuries-old Republic, paving the way for Caesar's adopted heir, Octavian, to consolidate power and establish the Roman Empire as its first emperor, Augustus.",
        keywords: ["Julius Caesar", "Rome", "Ides of March", "Brutus", "Cassius", "Roman Senate", "Roman Republic", "Augustus"]
      },
      {
        id: "pax_romana_27bc",
        title: "Inauguration of the Pax Romana",
        year: -27,
        exact_date: "27 BC - 180 AD",
        summary: "In 27 BC, following the defeat of Mark Antony and Cleopatra, the Roman Senate bestowed the title of Augustus upon Octavian, marking the transition from civil war into the celebrated two-century epoch known as the Pax Romana, or Roman Peace. Spanning from Augustus until the death of Emperor Marcus Aurelius in 180 AD, this era witnessed unprecedented political stability, economic prosperity, and urban expansion across three continents bordering the Mediterranean Sea. The empire constructed tens of thousands of miles of paved stone highways, stone aqueducts delivering fresh mountain water to bustling cities, and monumental amphitheaters while protecting maritime trade routes from piracy. Under the Pax Romana, Roman civil law, Latin and Greek culture, and widespread trade networks flourished across Europe, North Africa, and the Near East.",
        keywords: ["Pax Romana", "Augustus", "Roman Peace", "Roman Empire", "Marcus Aurelius", "Aqueducts", "Roads"]
      },
      {
        id: "edict_milan_313",
        title: "Issuance of the Edict of Milan",
        year: 313,
        exact_date: "February 313 AD",
        summary: "In February 313 AD, Roman Emperors Constantine the Great ruling in the West and Licinius ruling in the East met in the Italian city of Mediolanum, modern Milan, and issued the historic Edict of Milan. The proclamation granted total religious tolerance throughout the Roman Empire, establishing the legal right for all citizens to practice Christianity and other faiths openly without threat of persecution or arrest. Crucially, the decree also ordered the immediate return of all confiscated church properties, meeting houses, and cemeteries without requiring financial compensation from the Christian congregations. The Edict of Milan ended centuries of sporadic Roman imperial persecutions, fundamentally transforming Christianity from an outlawed underground movement into an authorized religion that would shape the institutional fabric of Europe.",
        keywords: ["Edict of Milan", "Constantine the Great", "Licinius", "Religious Tolerance", "Christianity", "Roman Empire"]
      },
      {
        id: "fall_western_rome_476",
        title: "Fall of the Western Roman Empire",
        year: 476,
        exact_date: "4 September 476 AD",
        summary: "On September 4, 476 AD, Germanic chieftain and Roman federated commander Odoacer deposed the sixteen-year-old Western Roman Emperor Romulus Augustulus in Ravenna, sending the imperial regalia eastward to Emperor Zeno in Constantinople. Weakened by severe economic inflation, relentless political assassinations, demographic contraction, and devastating migrations of Visigoths, Vandals, and Huns, the western half of the empire could no longer sustain centralized military defense or administrative cohesion. Odoacer assumed the title of King of Italy, effectively ending more than five centuries of Western Roman imperial rule. While the Eastern Roman or Byzantine Empire endured for nearly another millennium, the fall of the Western Empire inaugurated the Middle Ages and fragmented Western Europe into decentralized feudal kingdoms.",
        keywords: ["Fall of Rome", "476 AD", "Odoacer", "Romulus Augustulus", "Ravenna", "Middle Ages", "Byzantine"]
      }
    ]
  },

  // ==========================================
  // ERA 2: MEDIEVAL & ISLAMIC GOLDEN AGES
  // ==========================================
  {
    era: "The Middle Ages & The Islamic Golden Age",
    events: [
      {
        id: "hagia_sophia_537",
        title: "Dedication of the Hagia Sophia",
        year: 537,
        exact_date: "27 December 537 AD",
        summary: "On December 27, 537 AD, Byzantine Emperor Justinian I presided over the ceremonial dedication of the Hagia Sophia, or Church of Holy Wisdom, in Constantinople. Designed by mathematical physicist Isidore of Miletus and architect Anthemius of Tralles, the cathedral was constructed in less than six years following the destruction of the earlier church during the Nika Riots. The structure featured a soaring central pendentive dome that appeared to hover without support over a cavernous interior illuminated by rings of arched windows, establishing the pinnacle of Byzantine architectural ingenuity. For nearly a thousand years, it stood as the world's largest cathedral, serving as the spiritual heart of Eastern Orthodox Christianity before its later conversion into a historic imperial mosque under the Ottoman Empire.",
        keywords: ["Hagia Sophia", "Justinian", "Constantinople", "Byzantine", "Architecture", "Pendentive Dome", "Cathedral"]
      },
      {
        id: "battle_tours_732",
        title: "The Battle of Tours",
        year: 732,
        exact_date: "October 732 AD",
        summary: "In October 732 AD, Frankish military leader Charles Martel led an army of seasoned Frankish infantry against an invading Umayyad cavalry force commanded by Abdul Rahman Al Ghafiqi between Tours and Poitiers in western central France. Positioning his disciplined troops on a wooded hill in a dense, solid square phalanx, Martel successfully repelled repeated cavalry assaults without breaking formation until the Umayyad commander was killed in the fray. The decisive Frankish victory halted the northward military expansion of the Umayyad Caliphate from the Iberian Peninsula into Western Europe. The battle cemented Charles Martel's political authority, paved the way for the rise of the Carolingian dynasty, and shaped the medieval religious and political boundaries of Western Europe.",
        keywords: ["Battle of Tours", "Charles Martel", "Franks", "Umayyad", "Poitiers", "Carolingian", "Medieval Europe"]
      },
      {
        id: "house_of_wisdom_800",
        title: "Founding of the House of Wisdom in Baghdad",
        year: 800,
        exact_date: "c. 8th Century",
        summary: "Founded in Baghdad during the eighth century under the Abbasid Caliph Harun al-Rashid and reaching its zenith under Caliph al-Ma'mun, the House of Wisdom was the intellectual heart of the Islamic Golden Age. Operating as a royal library, translation bureau, and academy, it brought together Muslim, Christian, Jewish, and Persian scholars who painstakingly translated the scientific and philosophical heritage of ancient Greece, India, and Persia into Arabic. Rather than simply preserving classical learning, scholars at the House of Wisdom performed original research that transformed mathematics, optics, astronomy, and medicine. It was here that Muhammad ibn Musa al-Khwarizmi formulated algebra and introduced the Hindu-Arabic numeral system to the West, establishing Baghdad as the foremost beacon of enlightenment during the medieval era.",
        keywords: ["House of Wisdom", "Baghdad", "Islamic Golden Age", "Abbasid", "Al-Khwarizmi", "Algebra", "Translation"]
      },
      {
        id: "coronation_charlemagne_800",
        title: "Coronation of Charlemagne as Holy Roman Emperor",
        year: 800,
        exact_date: "25 December 800 AD",
        summary: "On Christmas Day in the year 800 AD, King Charlemagne of the Franks knelt in prayer inside Old Saint Peter's Basilica in Rome, where Pope Leo III placed a golden crown upon his head and proclaimed him Emperor of the Romans. The historic coronation revived the imperial title in Western Europe for the first time since the fall of Ravenna in 476, cementing a crucial political and religious alliance between the papacy and the Frankish monarchy. Charlemagne used his vast realm, stretching from modern France to Germany and northern Italy, to sponsor the Carolingian Renaissance, building monastic schools, standardizing Latin literacy, and promoting clear Carolingian miniscule handwriting script. The event established the precedent for the Holy Roman Empire, which would shape European politics and religious authority for over a millennium.",
        keywords: ["Charlemagne", "Holy Roman Empire", "Pope Leo III", "Coronation", "Carolingian", "Franks", "Rome"]
      },
      {
        id: "battle_hastings_1066",
        title: "The Battle of Hastings",
        year: 1066,
        exact_date: "14 October 1066",
        summary: "On October 14, 1066, Duke William of Normandy confronted King Harold Godwinson of England on a hill near Hastings in East Sussex following the disputed succession to the English throne. The Anglo-Saxon shield wall held firm through hours of fierce close-quarters combat until the Norman cavalry executed deceptive feigned retreats that drew English defenders out of their defensive formation, culminating in King Harold being struck by an arrow and killed. Crowned King of England on Christmas Day, William the Conqueror replaced the native Anglo-Saxon nobility with French-speaking Norman barons, compiled the comprehensive Domesday Book land survey, and transformed English culture, law, and vocabulary by infusing Norman French into Old English. The conquest permanently oriented England toward continental European affairs.",
        keywords: ["Battle of Hastings", "William the Conqueror", "Harold Godwinson", "1066", "Normans", "Domesday Book", "Anglo-Saxons"]
      },
      {
        id: "magna_carta_1215",
        title: "Signing of the Magna Carta",
        year: 1215,
        exact_date: "15 June 1215",
        summary: "On June 15, 1215, King John of England met a faction of armed rebel barons in the meadow of Runnymede along the River Thames to seal the Magna Carta, or Great Charter. Frustrated by the monarch's heavy taxation, arbitrary royal land seizures, and judicial abuses, the barons forced John to agree to sixty-three clauses restricting royal authority. The document established the revolutionary constitutional principle that even the monarch is subordinate to the law of the land, safeguarding subjects from arbitrary imprisonment without lawful trial by peers. Although King John quickly sought papal annulment of the charter, the Magna Carta was repeatedly reissued in subsequent reigns, ultimately serving as the legal bedrock for the English Bill of Rights, the United States Constitution, and the Universal Declaration of Human Rights.",
        keywords: ["Magna Carta", "King John", "Runnymede", "Barons", "Rule of Law", "Constitution", "Habeas Corpus"]
      },
      {
        id: "black_death_1347",
        title: "The Black Death Pandemic",
        year: 1347,
        exact_date: "1347 - 1351",
        summary: "Arriving on Genoese merchant ships from the Black Sea into Mediterranean ports in 1347, the Black Death bubonic plague tore through Europe, North Africa, and the Middle East in four devastating years. Caused by the bacterium Yersinia pestis carried by fleas living on black rats, the disease killed between seventy-five and two hundred million people, wiping out an estimated thirty to sixty percent of Europe's entire population. The staggering death toll shattered the medieval feudal order, creating an acute labor shortage that allowed surviving peasants to demand wages, purchase land, and break free from bondage to aristocratic estates. By undermining the unquestioned authority of established medieval institutions, the pandemic inadvertently accelerated the social, economic, and intellectual shifts that gave rise to the Renaissance.",
        keywords: ["Black Death", "Bubonic Plague", "1347", "Yersinia pestis", "Feudalism", "Medieval Europe", "Peasant Labor"]
      },
      {
        id: "fall_constantinople_1453",
        title: "Fall of Constantinople to the Ottoman Empire",
        year: 1453,
        exact_date: "29 May 1453",
        summary: "On May 29, 1453, following an intense fifty-three-day siege, the Ottoman army commanded by twenty-one-year-old Sultan Mehmed II breached the legendary fifth-century Theodosian walls of Constantinople, bringing a decisive end to the Byzantine Empire. Utilizing massive gunpowder siege cannons engineered by the Hungarian founder Urban, Mehmed overwhelmed the defending forces of the last Byzantine Emperor, Constantine XI Palaiologos, who died fighting at the city gates. Renaming the city Kostantiniyye, or Istanbul, Mehmed established it as the thriving imperial capital of the expanding Ottoman Empire at the strategic crossroads of Europe and Asia. The fall of the city prompted waves of Greek scholars and classical manuscripts to flee westward to Italy, directly fueling the intellectual fires of the Italian Renaissance while forcing Western European powers to seek maritime sea routes to Asia.",
        keywords: ["Fall of Constantinople", "Mehmed II", "Byzantine Empire", "1453", "Ottoman Empire", "Cannons", "Renaissance"]
      }
    ]
  },

  // ==========================================
  // ERA 3: RENAISSANCE & SCIENTIFIC REVOLUTION
  // ==========================================
  {
    era: "The Renaissance & Scientific Revolution",
    events: [
      {
        id: "printing_press_1440",
        title: "Invention of the Movable-Type Printing Press",
        year: 1440,
        exact_date: "c. 1440",
        summary: "Around 1440 in Mainz, Germany, goldsmith Johannes Gutenberg perfected the movable-type mechanical printing press, creating one of the most transformative inventions in human history. By combining durable lead-alloy metal letters, a screw-based wooden press adapted from wine presses, and a newly formulated oil-based ink, Gutenberg made it possible to replicate entire pages of text rapidly and uniformly. His masterwork, the forty-two-line Gutenberg Bible printed in the 1450s, demonstrated that mechanically produced books could rival the finest hand-copied manuscripts at a fraction of the cost. Within decades, printing shops proliferated across European cities, democratizing literacy, undermining ecclesiastical monopolies on information, and directly sparking the Protestant Reformation, the Renaissance, and the Scientific Revolution.",
        keywords: ["Johannes Gutenberg", "Printing Press", "Movable Type", "Mainz", "Gutenberg Bible", "Renaissance", "Literacy"]
      },
      {
        id: "columbus_voyage_1492",
        title: "Christopher Columbus Reaches the Americas",
        year: 1492,
        exact_date: "12 October 1492",
        summary: "On the morning of October 12, 1492, Genoese navigator Christopher Columbus, sailing under the royal sponsorship of Queen Isabella I and King Ferdinand II of Spain, made landfall on an island in the Bahamas that he named San Salvador. Commanding three ships—the Santa María, the Pinta, and the Niña—Columbus had embarked westward across the Atlantic Ocean aiming to establish a direct maritime trade passage to the prosperous spice markets of Asia. His historic arrival initiated permanent, continuous transatlantic contact between the Eastern and Western Hemispheres, launching the profound biological, agricultural, and demographic transfer known as the Columbian Exchange. While the voyage opened the Americas to Spanish exploration and global trade networks, it also brought devastating epidemic diseases and colonization to indigenous populations.",
        keywords: ["Christopher Columbus", "1492", "San Salvador", "Columbian Exchange", "Transatlantic", "Spain", "Age of Exploration"]
      },
      {
        id: "mona_lisa_1503",
        title: "Painting of the Mona Lisa",
        year: 1503,
        exact_date: "c. 1503",
        summary: "Around 1503 in the vibrant Renaissance city of Florence, master painter and polymath Leonardo da Vinci began work on the portrait of Lisa Gherardini, the wife of wealthy silk merchant Francesco del Giocondo, widely known today as the Mona Lisa. Painted in thin oil glazes on a poplar wood panel, the portrait showcases Leonardo's groundbreaking mastery of sfumato, a subtle blending technique that softens sharp edges and creates atmospheric depth without visible brushstrokes. The subject's enigmatic smile, expressive eyes that seem to track the viewer, and the imaginary landscape background transformed Renaissance portraiture from rigid profile poses into dynamic, living psychology. Acquired by King Francis I of France after Leonardo's death, the masterpiece now hangs in the Louvre Museum in Paris as the world's most famous painting.",
        keywords: ["Mona Lisa", "Leonardo da Vinci", "Florence", "Sfumato", "Louvre Museum", "Renaissance Art", "Portrait"]
      },
      {
        id: "sistine_chapel_1512",
        title: "Completion of the Sistine Chapel Ceiling",
        year: 1512,
        exact_date: "October 1512",
        summary: "In October 1512 in Rome, High Renaissance sculptor and painter Michelangelo Buonarroti completed his monumental fresco cycle across the curved vaulted ceiling of the Vatican's Sistine Chapel, commissioned by Pope Julius II. Working for four grueling years atop towering wooden scaffolding, Michelangelo single-handedly painted over five thousand square feet of plaster with more than three hundred dynamic figures depicting scenes from the Book of Genesis, culminating in the iconic Creation of Adam. Michelangelo's radical mastery of human anatomy, vibrant coloration, and monumental emotional expressiveness redefined European fine art and established a standard of artistic virtuosity that influenced generations of painters and sculptors.",
        keywords: ["Michelangelo", "Sistine Chapel", "Vatican", "Creation of Adam", "Pope Julius II", "Frescoes", "High Renaissance"]
      },
      {
        id: "protestant_reformation_1517",
        title: "Martin Luther Posts the Ninety-Five Theses",
        year: 1517,
        exact_date: "31 October 1517",
        summary: "On October 31, 1517, German monk and university theology professor Martin Luther nailed his Ninety-Five Theses to the heavy wooden door of All Saints' Church in Wittenberg, Saxony, sparking the Protestant Reformation. Luther vehemently protested clerical corruption and the lucrative sale of papal indulgences, which falsely promised purchasers remission of sins in exchange for financial contributions toward the reconstruction of Saint Peter's Basilica. Rapidly translated into German and duplicated across Europe via Gutenberg's printing presses, Luther's writings asserted the radical theological doctrines of salvation by faith alone and the ultimate authority of the Bible over papal decree. The ensuing Reformation fractured Western Christendom, reshaped European political alliances, and spurred decades of theological debates and religious conflicts.",
        keywords: ["Martin Luther", "Ninety-Five Theses", "Wittenberg", "Protestant Reformation", "Indulgences", "Faith Alone", "Reformation"]
      },
      {
        id: "first_circumnavigation_1519",
        title: "First Global Circumnavigation",
        year: 1519,
        exact_date: "1519 - 1522",
        summary: "In September 1519, Portuguese explorer Ferdinand Magellan set sail from Sanlúcar de Barrameda with five ships and roughly two hundred and seventy men under the Spanish Crown to find a western sea route to the wealthy Spice Islands of Indonesia. After navigating the treacherous strait at the southern tip of South America that now bears Magellan's name and enduring months crossing the vast Pacific Ocean, Magellan was killed in a skirmish in the Philippines in 1521. Spanish navigator Juan Sebastián Elcano assumed command of the sole surviving vessel, the Victoria, and guided eighteen surviving crew members safely across the Indian Ocean and around Africa back to Spain in September 1522. The arduous three-year expedition completed humanity's first full circumnavigation of the globe, definitively proving that the planet's oceans formed a continuous body of water.",
        keywords: ["Ferdinand Magellan", "Juan Sebastian Elcano", "Circumnavigation", "Victoria", "Spice Islands", "Strait of Magellan", "Globe"]
      },
      {
        id: "galileo_telescope_1609",
        title: "Galileo Observes the Moons of Jupiter",
        year: 1609,
        exact_date: "January 1610",
        summary: "In late 1609, Italian astronomer Galileo Galilei built an improved refracting telescope with roughly twenty-times magnification and directed it toward the nighttime heavens, transforming observational astronomy forever. In January 1610, while observing Jupiter, he discovered four tiny celestial bodies orbiting the giant planet, now recognized as the Galilean moons: Io, Europa, Ganymede, and Callisto. This landmark discovery delivered conclusive optical proof that not all heavenly bodies circled the Earth, shattering the ancient Aristotelian and Ptolemaic earth-centered model of the universe. Galileo published his findings in his 1610 treatise Sidereus Nuncius, providing critical observational evidence in favor of Nicolaus Copernicus's heliocentric model, which positioned the Sun at the center of the solar system.",
        keywords: ["Galileo Galilei", "Telescope", "Jupiter", "Galilean Moons", "Astronomy", "Heliocentrism", "Copernicus"]
      },
      {
        id: "newton_principia_1687",
        title: "Publication of Newton's Principia Mathematica",
        year: 1687,
        exact_date: "5 July 1687",
        summary: "On July 5, 1687, English mathematician and physicist Sir Isaac Newton published his landmark masterpiece, Philosophiæ Naturalis Principia Mathematica, fundamentally reshaping the scientific understanding of the physical universe. Written with the encouragement and financial backing of astronomer Edmond Halley, the work established the three universal laws of motion: inertia, force proportional to mass and acceleration, and action-reaction. Newton synthesized these mechanical laws with his groundbreaking law of universal gravitation, demonstrating with rigorous mathematical precision that the exact same gravitational force pulling an apple to Earth also holds planets in their elliptical orbits around the Sun. Principia united terrestrial and celestial physics under a single mathematical framework, laying the foundational cornerstone of classical mechanics for over two centuries.",
        keywords: ["Isaac Newton", "Principia Mathematica", "Laws of Motion", "Universal Gravitation", "Classical Physics", "Calculus"]
      }
    ]
  },

  // ==========================================
  // ERA 4: ENLIGHTENMENT, REVOLUTIONS & INDUSTRY
  // ==========================================
  {
    era: "Enlightenment, Revolutions & Industry",
    events: [
      {
        id: "declaration_independence_1776",
        title: "Adoption of the US Declaration of Independence",
        year: 1776,
        exact_date: "4 July 1776",
        summary: "On July 4, 1776, the Second Continental Congress meeting in the Pennsylvania State House in Philadelphia formally adopted the Declaration of Independence, drafted principally by thirty-three-year-old delegate Thomas Jefferson. The document articulated the moral and philosophical grounds for the thirteen North American colonies to dissolve their political allegiances to King George III and Great Britain. Grounded in Enlightenment concepts of natural rights popularized by philosopher John Locke, the preamble declared as self-evident truths that all individuals are created equal and endowed with inalienable rights to life, liberty, and the pursuit of happiness. By proclaiming that legitimate government derives its just authority solely from the consent of the governed, the Declaration established the democratic foundation of the United States and inspired national independence movements around the globe.",
        keywords: ["Declaration of Independence", "Thomas Jefferson", "Philadelphia", "July 4 1776", "Natural Rights", "Democracy", "Colonies"]
      },
      {
        id: "watt_steam_engine_1776",
        title: "Commercialization of James Watt's Steam Engine",
        year: 1776,
        exact_date: "1776",
        summary: "In 1776, Scottish instrument maker and mechanical engineer James Watt, working in commercial partnership with industrialist Matthew Boulton in Birmingham, delivered the first successful commercial steam engines featuring his patented separate condenser. Recognizing that older Newcomen atmospheric engines wasted enormous energy by repeatedly heating and cooling the main cylinder, Watt introduced a dedicated cooling chamber that preserved cylinder heat and reduced coal consumption by more than seventy-five percent. Soon adapted from vertical pumping into smooth rotary motion, the Watt engine liberated factories from relying upon swift-flowing rivers or animal power, allowing textile mills, iron foundries, and manufacturing plants to operate continuously anywhere coal was available. The invention served as the vital mechanical workhorse that powered the Industrial Revolution and transformed global society from agrarian handcraft into modern mechanized industry.",
        keywords: ["James Watt", "Steam Engine", "Separate Condenser", "Matthew Boulton", "Industrial Revolution", "Coal Power", "Factories"]
      },
      {
        id: "storming_bastille_1789",
        title: "Storming of the Bastille",
        year: 1789,
        exact_date: "14 July 1789",
        summary: "On the morning of July 14, 1789, an enraged crowd of Parisian citizens marched upon the Bastille, a formidable medieval stone fortress and prison that stood as a hated symbol of royal tyranny and absolute monarchy in the heart of Paris. Alarmed by the buildup of royal troops around Paris and the dismissal of popular reformist minister Jacques Necker, the insurgents sought the massive stores of gunpowder housed within the fortress walls. After hours of intense fighting, the garrison surrendered, and the crowd seized the stronghold, subsequently tearing down its massive stones by hand as a declaration of popular sovereignty. The storming of the Bastille directly ignited the French Revolution, forced King Louis XVI to recognize the newly formed National Assembly, and catalyzed the abolition of feudal aristocracy in France.",
        keywords: ["Bastille", "French Revolution", "Paris", "July 14 1789", "Louis XVI", "Liberty", "National Assembly"]
      },
      {
        id: "rosetta_stone_1799",
        title: "Discovery of the Rosetta Stone",
        year: 1799,
        exact_date: "15 July 1799",
        summary: "On July 15, 1799, French engineering officer Pierre-François Bouchard discovered a large black granodiorite slab while directing fortification excavations near the port town of Rashid, known to Europeans as Rosetta, in the Nile Delta during Napoleon's Egyptian expedition. Carved in 196 BC during the reign of King Ptolemy V, the stele bore a single royal decree inscribed in three distinct scripts: ancient Egyptian hieroglyphs, Egyptian Demotic script, and ancient Greek. Because scholars could read ancient Greek, the stone provided the essential linguistic decipherment key, enabling French polymath Jean-François Champollion in 1822 to crack the phonetic grammar of ancient Egyptian hieroglyphs. The breakthrough unlocked thousands of years of recorded Egyptian history, monumental temple inscriptions, and literature that had remained unreadable for over fourteen centuries.",
        keywords: ["Rosetta Stone", "Hieroglyphs", "Champollion", "Napoleon", "Egypt", "Decipherment", "Ptolemy"]
      },
      {
        id: "stephenson_rocket_1829",
        title: "The Rainhill Trials and Stephenson's Rocket",
        year: 1829,
        exact_date: "October 1829",
        summary: "In October 1829, English mechanical engineers George and Robert Stephenson entered their advanced steam locomotive, named Rocket, into the Rainhill Trials, an open competition organized to select the best motive power for the emerging Liverpool and Manchester Railway. Featuring innovative multi-tubular boilers that vastly accelerated steam generation and separate connecting rods driving the front wheels directly, Rocket reached astonishing speeds of twenty-nine miles per hour while demonstrating flawless mechanical reliability. Stephenson's triumphant design proved definitively that steam locomotives were far superior to stationary cable engines for transporting freight and passengers over steel rails. Rocket established the global engineering template for nineteenth-century steam railway locomotives, launching the railway age and accelerating industrial transportation across the globe.",
        keywords: ["Stephenson Rocket", "Steam Locomotive", "Rainhill Trials", "Railways", "Industrial Transportation", "Steam Engine"]
      },
      {
        id: "morse_telegraph_1844",
        title: "First Commercial Electric Telegraph Message",
        year: 1844,
        exact_date: "24 May 1844",
        summary: "On May 24, 1844, American inventor Samuel F.B. Morse sat in the Supreme Court chamber of the United States Capitol in Washington, D.C., and transmitted the historic message 'What hath God wrought' across forty miles of copper wire to his assistant Alfred Vail in Baltimore, Maryland. Using an electromagnet to make rhythmic indentations on paper tape according to a system of dots and dashes now known worldwide as Morse Code, Morse demonstrated that instantaneous electronic telecommunication over vast physical distances was commercially practical. Within a few decades, vast networks of telegraph poles lined railway tracks and underwater cables spanned the Atlantic Ocean, collapsing global communication times from weeks of physical transport to fractions of a second. The electric telegraph marked the birth of the telecommunications industry and laid the earliest technical foundation for the interconnected modern communications age.",
        keywords: ["Samuel Morse", "Electric Telegraph", "Morse Code", "May 24 1844", "Washington to Baltimore", "Telecommunications"]
      },
      {
        id: "emancipation_proclamation_1863",
        title: "Issuance of the Emancipation Proclamation",
        year: 1863,
        exact_date: "1 January 1863",
        summary: "On January 1, 1863, amid the bitter turmoil of the American Civil War, President Abraham Lincoln issued the Emancipation Proclamation using his constitutional authority as Commander-in-Chief of the armed forces. The executive order declared that all persons held as slaves within rebellious Confederate territories were and henceforward shall be free, immediately applying to more than three million enslaved men, women, and children. Crucially, the proclamation also authorized the enlistment of African American soldiers into the Union army and navy, resulting in nearly two hundred thousand Black troops joining the Union cause and altering the military balance of the conflict. By transforming the Civil War from a narrow struggle to preserve the Union into an uncompromising moral crusade for human freedom, the proclamation paved the direct path for the 1865 ratification of the Thirteenth Amendment, which forever abolished slavery across the entire United States.",
        keywords: ["Abraham Lincoln", "Emancipation Proclamation", "Civil War", "January 1 1863", "Abolition of Slavery", "13th Amendment", "Union"]
      },
      {
        id: "bell_telephone_1876",
        title: "Invention of the Commercial Telephone",
        year: 1876,
        exact_date: "10 March 1876",
        summary: "On March 10, 1876, in his Boston workshop, Scottish-born inventor and speech educator Alexander Graham Bell spoke the first intelligible words over an electrical telephone line to his assistant Thomas Watson in the next room: 'Mr. Watson, come here, I want to see you.' Bell's breakthrough utilized a liquid transmitter and electromagnetic diaphragm that converted acoustic air pressure vibrations of human speech into corresponding fluctuating electrical currents transmitted along a wire and reconstituted back into sound. Granted United States Patent 174,465 just days earlier, Bell demonstrated the device at the 1876 Centennial Exposition in Philadelphia, astonishing international scientists and commercial financiers alike. The telephone replaced coded telegraph dots with direct two-way voice communication, revolutionizing commerce, emergency services, and human social connection.",
        keywords: ["Alexander Graham Bell", "Telephone", "Thomas Watson", "1876", "Acoustics", "Telecommunications", "Invention"]
      },
      {
        id: "edison_light_bulb_1879",
        title: "Development of the Practical Incandescent Light Bulb",
        year: 1879,
        exact_date: "21 October 1879",
        summary: "On October 21, 1879, at his Menlo Park industrial research laboratory in New Jersey, American inventor Thomas Alva Edison and his team achieved a continuous forty-hour burn of an incandescent lamp utilizing a carbonized cotton thread filament sealed in a high-vacuum glass bulb. Recognizing that electric lighting required an integrated infrastructure to succeed commercially, Edison did not merely create a bulb, but engineered an entire centralized electrical distribution system including dynamos, underground wiring, safety fuses, and light sockets. When Edison threw the switch at the Pearl Street generating station in lower Manhattan in September 1882, electric light illuminated entire financial districts and residential buildings. The invention banished darkness from homes and factories, extending productive working hours and transforming modern urban civilization.",
        keywords: ["Thomas Edison", "Incandescent Light Bulb", "Menlo Park", "1879", "Electricity", "Pearl Street", "Filament"]
      }
    ]
  },

  // ==========================================
  // ERA 5: 20TH CENTURY & MODERN DIGITAL AGE
  // ==========================================
  {
    era: "The 20th Century & The Digital Age",
    events: [
      {
        id: "wright_brothers_flight_1903",
        title: "First Powered Airplane Flight",
        year: 1903,
        exact_date: "17 December 1903",
        summary: "On the morning of December 17, 1903, on the sandy dunes of Kill Devil Hills near Kitty Hawk, North Carolina, bicycle mechanics Orville and Wilbur Wright accomplished humanity's first controlled, sustained, and powered heavier-than-air airplane flight. Piloting the custom-built Wright Flyer—constructed with spruce wood, muslin cloth, a lightweight twelve-horsepower aluminum engine, and twin counter-rotating propellers—Orville achieved twelve seconds of sustained flight over a distance of one hundred and twenty feet into a stiff winter headwind. Across four progressive test flights that day, Wilbur extended the distance to eight hundred and fifty-two feet in fifty-nine seconds, proving that their revolutionary three-axis aerodynamic control system based on wing-warping, elevator pitch, and rudder yaw solved the fundamental problem of flight stability. Their historic triumph opened the skies to global transportation, transformed commercial trade, and launched modern aviation.",
        keywords: ["Wright Brothers", "First Flight", "Kitty Hawk", "Wright Flyer", "Orville Wright", "Wilbur Wright", "Aviation", "1903"]
      },
      {
        id: "einstein_relativity_1905",
        title: "Albert Einstein's Annus Mirabilis and Special Relativity",
        year: 1905,
        exact_date: "1905",
        summary: "In 1905, while working as a humble third-class examiner in the Swiss patent office in Bern, twenty-six-year-old physicist Albert Einstein published four revolutionary papers in the German journal Annalen der Physik, a feat celebrated today as the Annus Mirabilis or Miracle Year. His papers explained the photoelectric effect through light quanta, provided empirical proof of atoms through Brownian motion, and introduced the theory of Special Relativity, which abolished the Newtonian concept of absolute space and time. Demonstrating that the speed of light is constant in all inertial frames of reference, Einstein revealed that time dilates and lengths contract at high velocities, culminating in his famous mass-energy equivalence formula E = mc². Einstein's visionary insights dismantled classical physics and created the foundations of modern quantum theory and astrophysics.",
        keywords: ["Albert Einstein", "Special Relativity", "1905", "Annus Mirabilis", "Photoelectric Effect", "Mass-Energy Equivalence", "Physics"]
      },
      {
        id: "penicillin_discovery_1928",
        title: "Discovery of Penicillin",
        year: 1928,
        exact_date: "September 1928",
        summary: "In September 1928, Scottish physician and microbiologist Alexander Fleming returned from a family vacation to his laboratory at St. Mary's Hospital in London to find that a petri dish containing Staphylococcus bacteria had become contaminated with an airborne blue-green mold. Observing the culture under a microscope, Fleming noted with astonishment that the bacterial colonies surrounding the mold had dissolved, while those farther away remained intact. Identifying the fungus as Penicillium notatum, he recognized that the mold produced a potent natural substance capable of killing dangerous infectious bacteria without harming human tissue, which he named penicillin. Although over a decade passed before researchers Howard Florey and Ernst Chain at Oxford University successfully stabilized and mass-produced the drug during World War II, Fleming's serendipitous discovery introduced the antibiotic era, saving hundreds of millions of lives from previously fatal bacterial infections.",
        keywords: ["Alexander Fleming", "Penicillin", "Antibiotic", "St Marys Hospital", "Howard Florey", "Medicine", "Bacteria", "1928"]
      },
      {
        id: "d_day_normandy_1944",
        title: "Operation Overlord and the D-Day Landings",
        year: 1944,
        exact_date: "6 June 1944",
        summary: "On the dawn of June 6, 1944, Allied forces launched Operation Overlord, the largest amphibious invasion in military history, landing more than one hundred and fifty-six thousand American, British, and Canadian troops along fifty miles of heavily fortified beaches in Normandy, France. Under the supreme command of General Dwight D. Eisenhower and preceded by thousands of paratroopers dropped behind enemy lines and extensive naval bombardments, Allied infantry stormed code-named beaches: Utah, Omaha, Gold, Juno, and Sword. Despite fierce German machine-gun and artillery resistance, particularly at Omaha Beach, the Allied soldiers established a permanent continental beachhead, fracturing Nazi Germany's western defenses. D-Day opened a decisive second front in Europe, leading to the liberation of Paris two months later and accelerating the final collapse of the Third Reich.",
        keywords: ["D-Day", "Operation Overlord", "Normandy", "June 6 1944", "Eisenhower", "World War II", "Allies"]
      },
      {
        id: "united_nations_1945",
        title: "Founding of the United Nations",
        year: 1945,
        exact_date: "24 October 1945",
        summary: "On October 24, 1945, the United Nations officially came into existence when its founding Charter was ratified by the five permanent members of the Security Council—the United States, Great Britain, the Soviet Union, France, and China—and a majority of other signatory nations. Drafted during the San Francisco Conference in the closing months of World War II by delegates representing fifty nations, the Charter established a global international forum designed to prevent catastrophic future world conflicts through collective security, peaceful diplomacy, and international law. Unlike the earlier League of Nations, the UN established an executive Security Council with enforcement authority and specialized humanitarian agencies dedicated to human rights, public health, and refugee relief. The organization remains the central arena for international diplomacy and multilateral crisis resolution.",
        keywords: ["United Nations", "UN Charter", "October 24 1945", "San Francisco Conference", "Peace", "Security Council", "Diplomacy"]
      },
      {
        id: "dna_double_helix_1953",
        title: "Discovery of the DNA Double Helix",
        year: 1953,
        exact_date: "25 April 1953",
        summary: "On April 25, 1953, young American biologist James Watson and British physicist Francis Crick published a groundbreaking nine-hundred-word paper in the scientific journal Nature revealing the double-helix molecular structure of deoxyribonucleic acid, or DNA. Drawing fundamentally upon high-resolution X-ray diffraction photographs captured by chemist Rosalind Franklin and biophysicist Maurice Wilkins at King's College London, Watson and Crick constructed a physical three-dimensional model featuring two antiparallel sugar-phosphate helical backbones joined by complementary adenine-thymine and guanine-cytosine nucleotide base pairs. The structural model famously explained how genetic material stores biological information and accurately replicates during cellular division. The discovery revolutionized modern biology, giving rise to molecular genetics, forensic DNA profiling, biotechnology, and personalized genomic medicine.",
        keywords: ["DNA", "Double Helix", "Watson and Crick", "Rosalind Franklin", "Genetics", "Nature 1953", "Molecular Biology"]
      },
      {
        id: "salk_polio_vaccine_1955",
        title: "Success of the Salk Inactivated Polio Vaccine",
        year: 1955,
        exact_date: "12 April 1955",
        summary: "On April 12, 1955, at the University of Michigan, epidemiologist Dr. Thomas Francis Jr. announced to an anxious international public that Dr. Jonas Salk's inactivated poliovirus vaccine had been proven safe, potent, and remarkably effective in massive clinical trials involving nearly two million schoolchildren. Polio had terrified twentieth-century families for decades, causing sudden infantile paralysis, iron-lung confinement, and death in thousands of children each summer. Rejecting private patent profits and asserting that the vaccine belonged to the public, Salk famously declared when asked who owned the patent: 'There is no patent. Could you patent the sun?' The nationwide deployment of Salk's vaccine and Albert Sabin's later oral vaccine eradicated paralytic polio from most of the globe, standing as one of public health's greatest triumphs.",
        keywords: ["Jonas Salk", "Polio Vaccine", "April 12 1955", "Medicine", "Public Health", "Immunization", "Eradication"]
      },
      {
        id: "gagarin_space_flight_1961",
        title: "Yuri Gagarin Becomes the First Human in Space",
        year: 1961,
        exact_date: "12 April 1961",
        summary: "On the morning of April 12, 1961, twenty-seven-year-old Soviet cosmonaut Yuri Gagarin launched aboard the Vostok 1 spacecraft from the Baikonur Cosmodrome in Kazakhstan, becoming the first human being to journey into outer space and complete a full orbit of planet Earth. Reaching a maximum altitude of two hundred and three miles and traveling at speeds exceeding seventeen thousand miles per hour during his one-hundred-and-eight-minute flight, Gagarin gazed down through the spacecraft porthole and exclaimed his famous joyful assessment of Earth's curved blue horizon. His triumphant re-entry and parachute landing in rural Russia marked an astonishing milestone in human exploration and intensified the Cold War Space Race between the Soviet Union and the United States. Gagarin's flight proved that humans could survive microgravity and paved the way for planetary space exploration.",
        keywords: ["Yuri Gagarin", "Vostok 1", "First Human in Space", "April 12 1961", "Cosmonaut", "Space Race", "Orbit"]
      },
      {
        id: "apollo_11_moon_landing_1969",
        title: "Apollo 11 Moon Landing",
        year: 1969,
        exact_date: "20 July 1969",
        summary: "On July 20, 1969, American astronauts Neil Armstrong and Edwin 'Buzz' Aldrin successfully piloted the Apollo 11 Lunar Module Eagle to a touchdown on the basaltic plain of the Moon's Sea of Tranquility, while Command Module Pilot Michael Collins orbited overhead. Broadcast live to an estimated global television audience of more than six hundred million people, Armstrong opened the hatch and stepped onto the lunar surface, uttering the immortal words: 'That's one small step for man, one giant leap for mankind.' Over two and a half hours outside the spacecraft, the astronauts collected twenty-one kilograms of lunar rocks, planted the United States flag, and deployed scientific equipment, fulfilling President John F. Kennedy's 1961 challenge to land a human on the Moon before the end of the decade. The mission stood as one of the supreme technical achievements of human history, proving that humanity could reach beyond its home planet.",
        keywords: ["Apollo 11", "Neil Armstrong", "Buzz Aldrin", "Moon Landing", "NASA", "Sea of Tranquility", "July 20 1969", "Space Exploration"]
      },
      {
        id: "berlin_wall_fall_1989",
        title: "Fall of the Berlin Wall",
        year: 1989,
        exact_date: "9 November 1989",
        summary: "On the evening of November 9, 1989, the Berlin Wall—a heavily fortified concrete barrier that had physically and ideologically divided the city of Berlin into East and West for twenty-eight years—was opened following weeks of escalating popular protests across East Germany. When an East German official prematurely announced during a televised press conference that travel restrictions to the West were being lifted immediately, tens of thousands of jubilant citizens gathered at checkpoint crossings, overwhelming border guards who finally stood aside and opened the gates without firing a shot. People from both sides clambered atop the wall with sledgehammers and pickaxes, celebrating in tearful reunions beneath the Brandenburg Gate in an ecstatic display of peaceful revolution. The sudden opening of the wall heralded the collapse of communist regimes across Eastern Europe, precipitated the end of the Cold War, and paved the rapid path for the official reunification of Germany in October 1990.",
        keywords: ["Berlin Wall", "Fall of Berlin Wall", "East Germany", "West Germany", "Cold War", "November 9 1989", "Brandenburg Gate", "Reunification"]
      },
      {
        id: "world_wide_web_1989",
        title: "Invention of the World Wide Web",
        year: 1989,
        exact_date: "March 1989",
        summary: "In March 1989, British computer scientist Tim Berners-Lee, working at the European Organization for Nuclear Research (CERN) in Geneva, Switzerland, submitted a visionary proposal titled 'Information Management: A Proposal' to solve the problem of sharing research documents among global scientists. By integrating emerging concepts of hypertext with the existing global Internet network, Berners-Lee developed the three foundational building blocks of the modern web: HTML (HyperText Markup Language) for structuring documents, HTTP (HyperText Transfer Protocol) for transmitting data, and URI/URL addressing for locating resources. Working alongside Belgian engineer Robert Cailliau, he also designed the world's first web browser and web server. In a monumental decision in April 1993, CERN released the underlying Web source code into the public domain royalty-free, democratizing global access to knowledge and igniting the interconnected digital information era.",
        keywords: ["Tim Berners-Lee", "World Wide Web", "CERN", "HTML", "HTTP", "Internet", "March 1989", "Hypertext", "Digital Age"]
      },
      {
        id: "human_genome_project_2003",
        title: "Completion of the Human Genome Project",
        year: 2003,
        exact_date: "April 2003",
        summary: "In April 2003, an international consortium of academic research institutions and commercial scientists announced the successful completion of the Human Genome Project, having sequenced more than ninety-nine percent of the three billion chemical base pairs comprising human DNA. Spanning thirteen years of coordinated research across the United States, the United Kingdom, Japan, France, Germany, and China, the landmark effort generated the first high-accuracy genetic blueprint of our species. The project cataloged approximately twenty thousand to twenty-five thousand human protein-coding genes and made all sequence data freely accessible to global researchers in public databases without patent restrictions. The complete human genome revolutionized modern medicine, enabling rapid gene-editing tools, targeted cancer therapies, and advanced diagnostics for hereditary genetic diseases.",
        keywords: ["Human Genome Project", "DNA Sequencing", "Genomics", "April 2003", "Genetics", "Biotechnology", "Base Pairs"]
      }
    ]
  },

  // ==========================================
  // ERA 6: SCIENTIFIC REVOLUTION & MODERN DISCOVERY
  // ==========================================
  {
    era: "Landmarks of Science & Technological Innovation",
    events: [
      {
        id: "copernican_heliocentrism_1543",
        title: "Publication of Copernicus's Heliocentric Model",
        year: 1543,
        exact_date: "May 1543",
        summary: "In 1543, Polish astronomer Nicolaus Copernicus published his monumental treatise De revolutionibus orbium coelestium on his deathbed, proposing that the Earth and other planets revolve around the Sun rather than the Earth sitting stationary at the center of the universe. Copernicus introduced mathematical calculations demonstrating that planetary retrograde motion was an optical perspective effect resulting from Earth's own orbital motion around the Sun. His revolutionary heliocentric model fundamentally challenged the millennia-old Aristotelian-Ptolemaic geocentric cosmology endorsed by religious and academic authorities across Europe. The work sparked the Copernican Revolution, laying the foundation for modern observational astronomy and inspiring subsequent breakthroughs by Johannes Kepler and Galileo Galilei.",
        keywords: ["Copernicus", "Heliocentrism", "De revolutionibus", "Astronomy", "Solar System", "Planetary Motion", "Copernican Revolution"]
      },
      {
        id: "lavoisier_oxygen_conservation_1777",
        title: "Discovery of Oxygen and Conservation of Mass",
        year: 1777,
        exact_date: "1777",
        summary: "In 1777 in Paris, French chemist Antoine Lavoisier performed meticulous quantitative experiments showing that combustion and respiration require a specific gas component of air, which he named oxygen. By measuring the masses of reacting substances and gaseous products inside sealed glass vessels, Lavoisier decisively dismantled the long-standing phlogiston theory and established the foundational law of conservation of mass, proving that matter is neither created nor destroyed in chemical transformations. Lavoisier also co-authored a standardized chemical nomenclature system that replaced confusing medieval alchemical names with systematic descriptive terms. His rigorous quantitative methods transformed chemistry from an empirical art into an exact modern physical science, earning him recognition as the father of modern chemistry.",
        keywords: ["Antoine Lavoisier", "Oxygen", "Conservation of Mass", "Chemistry", "Combustion", "Chemical Nomenclature", "Phlogiston"]
      },
      {
        id: "darwin_origin_species_1859",
        title: "Publication of Darwin's On the Origin of Species",
        year: 1859,
        exact_date: "24 November 1859",
        summary: "On November 24, 1859, English naturalist Charles Darwin published his groundbreaking book On the Origin of Species by Means of Natural Selection, forever transforming the biological sciences. Drawing upon five years of observational fieldwork aboard HMS Beagle in the Galápagos Islands and decades of subsequent selective breeding research, Darwin demonstrated that all living species evolved from common ancestors through gradual natural selection. Organisms with heritable variations better suited to their environments are more likely to survive, reproduce, and pass those favorable traits to future generations. The theory unified the disparate fields of botany, zoology, and paleontology into a cohesive scientific framework and remains the central organizing principle of modern evolutionary biology.",
        keywords: ["Charles Darwin", "Origin of Species", "Natural Selection", "Evolution", "HMS Beagle", "Galapagos", "Biology"]
      },
      {
        id: "mendeleev_periodic_table_1869",
        title: "Formulation of the Periodic Table by Dmitri Mendeleev",
        year: 1869,
        exact_date: "March 1869",
        summary: "In March 1869, Russian chemist Dmitri Mendeleev presented his Periodic Table of the Elements to the Russian Chemical Society, organizing the sixty-three known elements by increasing atomic weight and recurring chemical properties. Mendeleev discovered that elements with similar valency and reactive behaviors appeared at regular repeating intervals, allowing him to arrange them into intuitive columns and rows. Crucially, Mendeleev left strategic empty gaps in his table for undiscovered elements, predicting the exact atomic masses, densities, and chemical properties of gallium, scandium, and germanium with astonishing accuracy before their physical discovery. His periodic system revealed the underlying fundamental order of the chemical elements and became the indispensable foundational blueprint of modern chemistry.",
        keywords: ["Dmitri Mendeleev", "Periodic Table", "Chemical Elements", "Atomic Weight", "Chemistry", "Periodic Law", "Valency"]
      },
      {
        id: "maxwell_electromagnetism_1865",
        title: "Formulation of Maxwell's Equations of Electromagnetism",
        year: 1865,
        exact_date: "1865",
        summary: "In 1865, Scottish mathematical physicist James Clerk Maxwell published his landmark paper A Dynamical Theory of the Electromagnetic Field, unifying the previously separate phenomena of electricity, magnetism, and optics into a single comprehensive mathematical framework. Maxwell synthesized empirical laws established by Coulomb, Gauss, Ampère, and Faraday into four elegant differential equations, introducing the revolutionary concept of the electromagnetic field propagating through space. His equations revealed that oscillating electric and magnetic fields generate waves traveling at the speed of light, leading Maxwell to the profound insight that visible light is itself an electromagnetic wave. Maxwell's electromagnetic theory paved the direct technological path for radio telecommunications, radar, and electric power generation, while inspiring Albert Einstein's development of special relativity.",
        keywords: ["James Clerk Maxwell", "Maxwell Equations", "Electromagnetism", "Light Waves", "Electromagnetic Field", "Physics", "Optics"]
      },
      {
        id: "curie_radioactivity_1898",
        title: "Discovery of Polonium and Radium by Marie Curie",
        year: 1898,
        exact_date: "1898",
        summary: "In 1898 in Paris, Polish-French scientist Marie Curie and her husband Pierre Curie discovered two previously unknown chemical elements, polonium and radium, extracted through exhausting chemical separations from tons of pitchblende uranium ore. Marie Curie coined the term radioactivity to describe the spontaneous emission of penetrating rays from unstable atomic nuclei, demonstrating that the radiation was an intrinsic property of the individual atoms rather than molecular interaction. Her pioneering research fundamentally altered atomic theory, proving that atoms are divisible and contain internal dynamic energy structures. Curie became the first woman to win a Nobel Prize and remains the only person to receive Nobel Prizes in two distinct scientific disciplines, Physics in 1903 and Chemistry in 1911, establishing the foundations of nuclear physics and radiotherapy.",
        keywords: ["Marie Curie", "Radioactivity", "Polonium", "Radium", "Pierre Curie", "Nobel Prize", "Nuclear Physics", "Pitchblende"]
      },
      {
        id: "bell_labs_transistor_1947",
        title: "Invention of the Transistor at Bell Labs",
        year: 1947,
        exact_date: "23 December 1947",
        summary: "On December 23, 1947, at Bell Telephone Laboratories in Murray Hill, New Jersey, American physicists John Bardeen, Walter Brattain, and William Shockley successfully created the point-contact transistor, triggering the electronic revolution. Constructed from a crystalline germanium semiconductor with closely spaced gold-foil contacts, the miniature solid-state device amplified electrical signals and acted as a high-speed electronic switch without requiring fragile, hot vacuum tubes. Shockley soon perfected the junction transistor, making affordable mass production on silicon wafers possible. The transistor enabled modern electronic miniaturization, serving as the foundational building block for microchips, personal computers, smartphones, and the entire global digital infrastructure.",
        keywords: ["Transistor", "Bell Labs", "John Bardeen", "Walter Brattain", "William Shockley", "Semiconductor", "Microprocessor", "Electronics"]
      },
      {
        id: "ligo_gravitational_waves_2015",
        title: "First Direct Detection of Gravitational Waves",
        year: 2015,
        exact_date: "14 September 2015",
        summary: "On September 14, 2015, the Laser Interferometer Gravitational-Wave Observatory (LIGO) facilities in Washington state and Louisiana made humanity's first direct observation of gravitational waves, confirming a landmark prediction Albert Einstein made in his 1916 General Theory of Relativity. The historic signal, designated GW150914, originated from the violent merger of two stellar-mass black holes roughly one point three billion light-years from Earth. As the spacetime ripples swept through Earth, LIGO's twin four-kilometer laser interferometers measured a distortion smaller than one ten-thousandth the diameter of a subatomic proton. The monumental discovery inaugurated the era of gravitational-wave astronomy, allowing astrophysicists to observe dark cosmic collisions that emit no optical light.",
        keywords: ["LIGO", "Gravitational Waves", "Albert Einstein", "Black Holes", "General Relativity", "Astrophysics", "Interferometer"]
      },
      {
        id: "crispr_cas9_gene_editing_2012",
        title: "Development of CRISPR-Cas9 Gene Editing",
        year: 2012,
        exact_date: "17 August 2012",
        summary: "On August 17, 2012, biochemists Jennifer Doudna and Emmanuelle Charpentier published a landmark study in the journal Science demonstrating that the bacterial adaptive immune system CRISPR-Cas9 could be reprogrammed into a programmable molecular tool for targeted genome editing. By engineering a synthetic single-guide RNA molecule, the Cas9 endonuclease could be directed to make precise double-strand DNA cuts at exact genomic loci in any living organism. The method transformed molecular genetics by making gene modification fast, affordable, and extraordinarily accurate compared to earlier complex technologies. Awarded the 2020 Nobel Prize in Chemistry, CRISPR-Cas9 has revolutionized biomedical research, gene therapies for hereditary diseases, and agricultural biotechnology worldwide.",
        keywords: ["CRISPR", "Cas9", "Jennifer Doudna", "Emmanuelle Charpentier", "Gene Editing", "Biotechnology", "Genomics", "Nobel Prize"]
      },
      {
        id: "jwst_first_deep_field_2022",
        title: "James Webb Space Telescope Unveils First Deep Field",
        year: 2022,
        exact_date: "11 July 2022",
        summary: "On July 11, 2022, NASA and its international partners revealed the first operational science image captured by the James Webb Space Telescope (JWST), titled Webb's First Deep Field, displaying the galaxy cluster SMACS 0723 in unprecedented infrared detail. Stationed one million miles from Earth at the Second Lagrange Point (L2), the observatory uses a twenty-one-foot gold-coated beryllium mirror and cryogenically cooled infrared detectors to look back more than thirteen billion years toward the cosmic dawn. The image revealed thousands of distant primordial galaxies, including gravitationally lensed background galaxies that formed just a few hundred million years following the Big Bang. JWST continues to rewrite astrophysics textbooks, characterizing exoplanet atmospheres and imaging the earliest stars and black holes in cosmic history.",
        keywords: ["James Webb Space Telescope", "JWST", "Deep Field", "NASA", "Infrared Astronomy", "Galaxies", "SMACS 0723", "Big Bang"]
      }
    ]
  }
];

export function buildHistoricalRAGParagraphs() {
  console.log("==================================================================");
  console.log("   UPDATING HISTORICAL EVENTS RAG WITH FULL-PARAGRAPH ANSWERS   ");
  console.log("==================================================================");

  // 1. Write the updated JSON seed structure with rich 1-paragraph summaries
  const jsonOutput = {
    historical_eras: COMPREHENSIVE_HISTORY_CORPUS.map(eraObj => ({
      era: eraObj.era,
      events: eraObj.events.map(ev => ({
        id: ev.id,
        title: ev.title,
        year: ev.year,
        exact_date: ev.exact_date,
        summary: ev.summary,
        keywords: ev.keywords
      }))
    }))
  };

  fs.writeFileSync(JSON_PATH, JSON.stringify(jsonOutput, null, 4), 'utf-8');
  console.log(`Updated JSON RAG seed: ${JSON_PATH}`);

  // 2. Update SQLite Database with 1-paragraph verified facts in history_dictionary table
  const db = new DatabaseSync(DB_PATH);

  db.exec(`
    CREATE TABLE IF NOT EXISTS history_dictionary (
      entity_id TEXT PRIMARY KEY,
      entity_name TEXT NOT NULL,
      exact_date TEXT,
      verified_fact TEXT NOT NULL
    );
  `);

  const insertOrReplace = db.prepare(`
    INSERT OR REPLACE INTO history_dictionary (entity_id, entity_name, exact_date, verified_fact)
    VALUES (?, ?, ?, ?)
  `);

  let count = 0;
  for (const eraObj of COMPREHENSIVE_HISTORY_CORPUS) {
    for (const ev of eraObj.events) {
      insertOrReplace.run(ev.id, ev.title, ev.exact_date, ev.summary);
      count++;
    }
  }

  console.log(`Synchronized ${count} world events with authoritative 1-paragraph answers into 'history_dictionary'!`);
  console.log(`Database Location: ${DB_PATH}`);
  console.log("==================================================================\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildHistoricalRAGParagraphs();
}
