import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILES_DIR = path.resolve(__dirname, '../files');
const JSON_PATH = path.join(FILES_DIR, 'historical_events_rag_seed.json');
const DB_PATH = path.join(FILES_DIR, 'historical_events_dictionary.db');

export const ADDITIONAL_WORLD_HISTORY_EVENTS = [
  // Era: Classical Antiquity & Ancient Empires
  {
    era: "Classical Antiquity & Ancient Empires",
    events: [
      {
        id: "battle_thermopylae_480bc",
        title: "The Battle of Thermopylae",
        year: -480,
        exact_date: "August 480 BC",
        summary: "In August 480 BC, King Leonidas I of Sparta led an allied Greek force of roughly seven thousand soldiers, including his legendary three hundred Spartan royal bodyguard, to block the narrow coastal pass of Thermopylae against a massive invading Persian army commanded by King Xerxes I. For three intense days, the heavily armored Greek hoplites utilized their dense phalanx formation and the narrow terrain to repel repeated assaults by Persian infantry and elite Immortals. When a local resident named Ephialtes betrayed the Greeks by revealing a secret mountain pathway around the pass, Leonidas dismissed the majority of the army and fought a heroic rearguard defense to the death alongside his Spartans and Thespians. Although the battle ended in tactical Persian victory, the sacrifice delayed the Persian advance, rallied Greek morale, and paved the way for decisive naval victory at Salamis.",
        keywords: ["Battle of Thermopylae", "Leonidas", "Sparta", "Xerxes", "Persian Wars", "Hoplite", "Salamis"]
      },
      {
        id: "alexander_gaugamela_331bc",
        title: "Alexander the Great and the Battle of Gaugamela",
        year: -331,
        exact_date: "1 October 331 BC",
        summary: "On October 1, 331 BC, young Macedonian king Alexander the Great confronted King Darius III of Persia on the open plains of Gaugamela in modern-day northern Iraq. Outnumbered by the Persian imperial host and facing scythed chariots and war elephants, Alexander executed a brilliant angled cavalry charge that drew Persian defenses outward, creating a critical gap in their center through which he led his elite Companion cavalry straight toward Darius. Darius fled the battlefield in panic, collapsing Persian command cohesion and resulting in a decisive rout that dismantled the Achaemenid Persian Empire. Following the triumph, Alexander was proclaimed King of Asia, conquered the historic capitals of Babylon and Persepolis, and expanded Macedonian rule all the way to India. His conquests initiated the Hellenistic period, spreading Greek language, architecture, and scientific philosophy across the Mediterranean and Near East.",
        keywords: ["Alexander the Great", "Battle of Gaugamela", "Darius III", "Macedonia", "Persian Empire", "Hellenistic", "Cavalry"]
      },
      {
        id: "ashoka_edicts_268bc",
        title: "Reign and Edicts of Ashoka the Great",
        year: -268,
        exact_date: "c. 268 - 232 BC",
        summary: "Reigning over the Indian subcontinent's Mauryan Empire from roughly 268 to 232 BC, Emperor Ashoka the Great experienced a profound spiritual transformation following his bloody conquest of the coastal kingdom of Kalinga, which resulted in more than one hundred thousand deaths. Overcome by grief and moral remorse at the carnage of war, Ashoka embraced Buddhism and renounced aggressive military conquest in favor of Dhamma, a moral philosophy founded on non-violence, social welfare, and religious tolerance. To communicate his royal principles directly to subjects across his vast empire, he erected towering stone pillars and carved thirty-three major Rock Edicts in regional languages from modern Afghanistan to southern India. Ashoka funded free medical clinics for humans and animals, planted shade trees along trade routes, and dispatched Buddhist missionary monks across Asia and the Mediterranean, establishing Buddhism as a major world religion.",
        keywords: ["Ashoka the Great", "Mauryan Empire", "Kalinga", "Buddhism", "Edicts of Ashoka", "Rock Edicts", "India"]
      },
      {
        id: "fall_of_carthage_146bc",
        title: "Destruction of Carthage in the Third Punic War",
        year: -146,
        exact_date: "Spring 146 BC",
        summary: "In the spring of 146 BC, Roman legions commanded by Scipio Aemilianus breached the formidable defensive fortifications of Carthage, concluding a bitter three-year siege and bringing a catastrophic end to the Third Punic War. For over a century, the maritime Phoenician commercial empire of Carthage had contested Rome for supremacy across the Mediterranean, led by brilliant commanders such as Hannibal Barca. After six days of relentless street-to-street urban combat, Roman forces captured the citadel of Byrsa, burned the ancient metropolis to the ground, and sold roughly fifty thousand surviving inhabitants into slavery. The complete destruction of Carthage eliminated Rome's greatest geopolitical rival, transforming the western Mediterranean into a Roman lake and paving the way for Rome's undisputed dominance over the classical world.",
        keywords: ["Carthage", "Third Punic War", "Scipio Aemilianus", "Hannibal", "Roman Republic", "Mediterranean", "Siege"]
      },
      {
        id: "pompeii_vesuvius_79",
        title: "Eruption of Mount Vesuvius and Destruction of Pompeii",
        year: 79,
        exact_date: "October 79 AD",
        summary: "In the autumn of 79 AD, Mount Vesuvius erupted violently in the Bay of Naples, burying the thriving Roman resort cities of Pompeii and Herculaneum beneath thick layers of pumice, volcanic ash, and lethal pyroclastic surges. The catastrophic eruption, famously recorded in eyewitness letters written by Pliny the Younger, caught thousands of residents unprepared, encasing homes, vibrant wall frescoes, bakeries, and public baths in an airtight volcanic tomb. Over roughly two days, the mountain released hundreds of thousands of tons of molten rock per second, obliterating coastal towns and claiming thousands of lives. Forgotten for more than fifteen centuries until accidental rediscoveries in the eighteenth century, the preserved ruins provided historians with an unprecedented snapshot of everyday ancient Roman life, architecture, and urban culture.",
        keywords: ["Pompeii", "Mount Vesuvius", "Herculaneum", "Pliny the Younger", "Roman Empire", "Volcano", "Archaeology"]
      },
      {
        id: "council_nicaea_325",
        title: "The First Council of Nicaea",
        year: 325,
        exact_date: "May - August 325 AD",
        summary: "Between May and August 325 AD, Roman Emperor Constantine I convened the First Council of Nicaea in the city of Nicaea, located in modern-day Iznik, Turkey, marking Christianity's first ecumenical gathering of bishops. Seeking theological unity to stabilize his newly unified empire, Constantine brought together approximately three hundred bishops from across the Mediterranean to resolve the divisive Arian controversy regarding the divine nature of Jesus Christ. Led by theologians like Athanasius of Alexandria, the council rejected the teachings of Arius and formulated the Nicene Creed, affirming that the Son is of the same divine substance as the Father. The council also standardized the date of Easter celebration and established twenty fundamental canons of ecclesiastical administration, defining Christian theological orthodoxy for centuries to come.",
        keywords: ["Council of Nicaea", "Constantine", "Nicene Creed", "Arianism", "Athanasius", "Christianity", "Church History"]
      }
    ]
  },

  // Era: Medieval Golden Ages & Global Dynasties
  {
    era: "The Medieval Era & Global Dynasties",
    events: [
      {
        id: "justinian_code_534",
        title: "Promulgation of the Justinian Code",
        year: 534,
        exact_date: "534 AD",
        summary: "In 534 AD, Byzantine Emperor Justinian I completed the comprehensive compilation of Roman statutory law known as the Corpus Juris Civilis, directed by his brilliant legal jurist Tribonian. Over six centuries of sprawling, contradictory imperial edicts, classical legal opinions, and judicial precedents were systematically organized, harmonized, and edited into four coherent works: the Code, the Digest, the Institutes, and the Novellae. By extracting rational legal principles and discarding obsolete decrees, the Justinian Code established systematic legal concepts including contract enforceability, property rights, civil liability, and family law. Rediscovered in Bologna in the late eleventh century, the Justinian Code became the foundational cornerstone of civil law legal systems adopted across continental Europe, Latin America, and much of the modern world.",
        keywords: ["Justinian Code", "Corpus Juris Civilis", "Tribonian", "Byzantine", "Roman Law", "Legal History", "Jurisprudence"]
      },
      {
        id: "islamic_hijra_622",
        title: "The Hijra of Muhammad from Mecca to Medina",
        year: 622,
        exact_date: "September 622 AD",
        summary: "In September 622 AD, the Islamic prophet Muhammad and his early followers fled intensifying religious persecution and economic boycotts in Mecca to the northern oasis city of Yathrib, later renamed Medina. Known as the Hijra or migration, the journey was completed following negotiations with Medinan clan leaders who invited Muhammad to serve as an impartial arbiter to resolve bitter tribal feuds. In Medina, Muhammad drafted the Constitution of Medina, establishing a mutual defense pact and civic framework uniting Muslims, non-Muslim Arabs, and Jewish communities under a single civic umbrella. The Hijra marked the pivotal transition of Islam from an oppressed local minority into a self-governing political and spiritual community, and was later designated by Caliph Umar as the foundational starting point (Year 1 AH) of the Islamic lunar calendar.",
        keywords: ["The Hijra", "Muhammad", "Mecca", "Medina", "Islamic Calendar", "Constitution of Medina", "Islam"]
      },
      {
        id: "lindisfarne_viking_793",
        title: "Viking Raid on Lindisfarne",
        year: 793,
        exact_date: "8 June 793",
        summary: "On June 8, 793, a fleet of Norse longships made a surprise landfall on the holy tidal island of Lindisfarne off the coast of Northumbria in northeastern England, brutally sacking the venerable Christian monastery of Saint Cuthbert. The raiders slaughtered monks, desecrated church sanctuaries, and looted precious gold-leaf illuminated manuscripts, silver chalices, and jeweled relics before sailing away across the North Sea. The unprecedented assault on an unarmed spiritual sanctuary sent shockwaves through Christian Europe, with Northumbrian scholar Alcuin famously writing in lamentation that such terror had never before appeared in Britain. The sack of Lindisfarne formally marked the beginning of the Viking Age, initiating three centuries of Scandinavian maritime raids, trading expeditions, and permanent colonial settlements across Britain, Ireland, Normandy, and Russia.",
        keywords: ["Lindisfarne", "Viking Raid", "793 AD", "Saint Cuthbert", "Northumbria", "Viking Age", "Norse Longships"]
      },
      {
        id: "great_schism_1054",
        title: "The East-West Schism of 1054",
        year: 1054,
        exact_date: "July 1054",
        summary: "In July 1054 in Constantinople, deep-seated theological, liturgical, and political tensions culminated in the East-West Schism, which permanently divided the Christian Church into the Roman Catholic Church in the West and the Eastern Orthodox Church in the East. Cardinal Humbert of Silva Candida, acting on behalf of Pope Leo IX, marched into the cathedral of Hagia Sophia and placed a bull of excommunication upon the high altar against Ecumenical Patriarch Michael I Cerularius, who promptly responded with a retaliatory counter-excommunication. The historic fracture was fueled by long-standing disputes over papal jurisdictional authority over eastern patriarchates, the insertion of the Filioque clause into the Nicene Creed, and liturgical differences such as the use of unleavened bread. The Great Schism split medieval European Christendom along enduring cultural and geographic lines that persist into the modern era.",
        keywords: ["Great Schism", "1054", "Eastern Orthodox", "Roman Catholic", "Hagia Sophia", "Michael Cerularius", "Filioque"]
      },
      {
        id: "first_crusade_jerusalem_1099",
        title: "Capture of Jerusalem in the First Crusade",
        year: 1099,
        exact_date: "15 July 1099",
        summary: "On July 15, 1099, Western European Christian crusaders commanded by Godfrey of Bouillon and Raymond IV of Toulouse breached the fortified stone walls of Jerusalem, culminating the First Crusade called four years earlier by Pope Urban II at the Council of Clermont. After an arduous three-year expedition across Anatolia and Syria and a difficult month-long siege utilizing mobile wooden siege towers, the crusaders captured the Holy City from its Fatimid garrison. The victorious forces unleashed a devastating sack of the city, slaughtering thousands of Muslim and Jewish defenders and inhabitants inside the Al-Aqsa Mosque and local synagogues. The triumph led to the establishment of the Crusader States, including the Kingdom of Jerusalem, and set in motion two centuries of intense military and religious conflict between Christian Europe and the Islamic world.",
        keywords: ["First Crusade", "Jerusalem", "1099", "Godfrey of Bouillon", "Pope Urban II", "Crusader States", "Holy Land"]
      },
      {
        id: "genghis_khan_mongol_1206",
        title: "Unification of the Mongol Tribes by Genghis Khan",
        year: 1206,
        exact_date: "1206",
        summary: "In 1206, at a general assembly of nomadic chieftains along the Onon River known as the Kurultai, charismatic warrior Temüjin united the warring nomadic pastoral confederations of the Mongolian steppe, receiving the supreme title of Genghis Khan, or Universal Ruler. Reorganizing steppe society along meritocratic decimal military units rather than traditional aristocratic clans, Genghis Khan combined rapid horse archery, psychological warfare, and sophisticated mobility to launch sweeping campaigns across Eurasia. Over subsequent decades, the Mongol Empire expanded relentlessly, conquering northern China, Central Asia, Persia, and the Kievan Rus to become the largest contiguous land empire in human history. Under the subsequent Pax Mongolica, trade, diplomatic missions, and technological exchanges flourished safely along the revitalized Silk Road between Europe and East Asia.",
        keywords: ["Genghis Khan", "Mongol Empire", "1206", "Temujin", "Kurultai", "Pax Mongolica", "Silk Road", "Nomads"]
      },
      {
        id: "mansa_musa_hajj_1324",
        title: "Mansa Musa's Famous Pilgrimage to Mecca",
        year: 1324,
        exact_date: "1324",
        summary: "In 1324, Mansa Musa, the devout Muslim ruler of the prosperous Mali Empire in West Africa, embarked upon a legendary pilgrimage to Mecca accompanied by an entourage of tens of thousands of soldiers, officials, and merchants, alongside camels carrying tons of pure gold bullion. Traveling across the Sahara Desert through Cairo, Musa distributed gold so lavishly to charities, citizens, and royal courts that he caused severe currency inflation across Egypt and the Mediterranean that lasted for over a decade. His breathtaking display of African wealth placed Mali prominently on European maps, including the renowned Catalan Atlas of 1375 which depicted Musa holding a golden orb upon a royal throne. Upon his return, Musa used his imperial wealth to build magnificent mosques and universities in Timbuktu and Djenné, transforming Mali into a renowned international center of Islamic scholarship and trade.",
        keywords: ["Mansa Musa", "Mali Empire", "Pilgrimage to Mecca", "Timbuktu", "Gold", "West Africa", "1324", "Catalan Atlas"]
      },
      {
        id: "joan_of_arc_orleans_1429",
        title: "Joan of Arc Relieves the Siege of Orléans",
        year: 1429,
        exact_date: "8 May 1429",
        summary: "On May 8, 1429, a seventeen-year-old French peasant girl named Joan of Arc, claiming divine inspiration from the Archangel Michael and Saint Catherine, led French royal forces to lift the grueling seven-month English siege of Orléans during the Hundred Years' War. Donning full white armor and carrying a sacred banner, Joan inspired demoralized French troops to launch aggressive counterattacks against surrounding English redoubts and fortresses, driving the English army into retreat within days of her arrival. Her stunning victory broke the myth of English military invincibility, reopened the Loire Valley, and enabled the coronation of Charles VII as King of France in Reims Cathedral shortly thereafter. Captured in 1430 and executed at the stake in Rouen following a politically motivated heresy trial, Joan became an enduring national heroine and saint of France.",
        keywords: ["Joan of Arc", "Siege of Orleans", "1429", "Hundred Years War", "Charles VII", "France", "Battle of Orleans"]
      }
    ]
  },

  // Era: Age of Discovery & Global Contact
  {
    era: "Age of Discovery & Global Encounters",
    events: [
      {
        id: "reconquista_granada_1492",
        title: "Fall of Granada and Completion of the Reconquista",
        year: 1492,
        exact_date: "2 January 1492",
        summary: "On January 2, 1492, Catholic Monarchs Isabella I of Castile and Ferdinand II of Aragon received the ceremonial keys to the Alhambra palace from Muhammad XII, known as Boabdil, concluding the ten-year Granada War and ending nearly eight centuries of Islamic rule on the Iberian Peninsula. The surrender of the Emirate of Granada completed the long medieval Reconquista, politically unifying Spain under a centralized Catholic crown. Shortly after the triumph, Isabella and Ferdinand issued the Alhambra Decree ordering the expulsion of all practicing Jewish populations from Spain, while also granting royal authorization and financial sponsorship to Christopher Columbus for his transatlantic voyage of exploration. The fall of Granada signaled Spain's emergence as an aggressive global maritime superpower poised to establish vast colonial realms across the Americas.",
        keywords: ["Fall of Granada", "Reconquista", "Alhambra", "Ferdinand and Isabella", "Boabdil", "Spain", "1492"]
      },
      {
        id: "treaty_tordesillas_1494",
        title: "Signing of the Treaty of Tordesillas",
        year: 1494,
        exact_date: "7 June 1494",
        summary: "On June 7, 1494, in the Castilian town of Tordesillas, representatives of the Spanish Crown and King John II of Portugal signed the Treaty of Tordesillas, formally dividing newly discovered lands outside Europe between the two Iberian maritime powers. Brokered through papal mediation by Pope Alexander VI, the treaty established a meridian line of demarcation three hundred and seventy leagues west of the Cape Verde islands, awarding all newly discovered lands to the west of the line to Spain and all lands to the east to Portugal. This compromise preserved Portuguese trade supremacy along African sea routes to India while accidentally granting Portugal future legal title to eastern South America, modern-day Brazil, discovered by Pedro Álvares Cabral six years later. The treaty represented an unprecedented early effort to partition global colonial territories between European sovereign powers.",
        keywords: ["Treaty of Tordesillas", "Spain", "Portugal", "Pope Alexander VI", "Line of Demarcation", "Brazil", "Age of Discovery"]
      },
      {
        id: "vasco_da_gama_india_1498",
        title: "Vasco da Gama Reaches India by Sea",
        year: 1498,
        exact_date: "20 May 1498",
        summary: "On May 20, 1498, Portuguese explorer Vasco da Gama dropped anchor off the Malabar Coast near the bustling trading port of Calicut, modern Kozhikode, in southwestern India, completing humanity's first direct ocean voyage from Western Europe to the Indian subcontinent. Sailing around Africa's stormy Cape of Good Hope with four caravels and guided by an experienced Arab pilot across the Arabian Sea, da Gama spent nearly a year at sea to bypass land-based Venetian and Ottoman monopolies on the lucrative Asian spice trade. Although initial trade negotiations with the Zamorin of Calicut were contentious, da Gama returned safely to Lisbon with valuable cargoes of black pepper and cinnamon. His voyage opened the Cape Route, establishing the Portuguese Estado da Índia and inaugurating five centuries of European commercial and colonial dominance across maritime Asia.",
        keywords: ["Vasco da Gama", "Calicut", "India", "Cape of Good Hope", "Spice Trade", "Portugal", "1498"]
      },
      {
        id: "fall_aztec_empire_1521",
        title: "Fall of the Aztec Empire to Hernán Cortés",
        year: 1521,
        exact_date: "13 August 1521",
        summary: "On August 13, 1521, following a brutal ninety-three-day amphibious siege, Spanish conquistador Hernán Cortés and hundreds of thousands of indigenous allies, primarily from the rival city of Tlaxcala, captured the Aztec island capital of Tenochtitlan, capturing Emperor Cuauhtémoc. Combining European steel armor, cannons, and brigantine warboats on Lake Texcoco with devastating outbreaks of smallpox that wiped out nearly half the defending population, the invaders systematically leveled the majestic temple metropolis. Cortés claimed the immense territories of the Aztec Empire for the Spanish Crown, constructing Mexico City atop the smoking ruins of Tenochtitlan as the colonial seat of the Viceroyalty of New Spain. The conquest opened Central America to Spanish colonization, silver mining, and the profound demographic transformation of the indigenous Americas.",
        keywords: ["Hernan Cortes", "Fall of Tenochtitlan", "Aztec Empire", "Cuauhtemoc", "Tlaxcala", "Conquistadors", "Mexico City", "1521"]
      },
      {
        id: "fall_inca_empire_1533",
        title: "Conquest of the Inca Empire by Francisco Pizarro",
        year: 1533,
        exact_date: "1532 - 1533",
        summary: "In November 1532, Spanish conquistador Francisco Pizarro and a small force of one hundred and sixty-eight men ambushed and captured Inca Emperor Atahualpa in the Andean highland plaza of Cajamarca following a bitter civil war that had weakened the Inca Empire. Despite Atahualpa fulfilling a legendary promise to fill a large stone room once with gold and twice with silver as a royal ransom, Pizarro executed the emperor in July 1533 and marched victoriously into the imperial capital of Cusco later that year. The collapse of the Inca administration allowed the Spanish Crown to establish the Viceroyalty of Peru, gaining control over vast mountain networks, royal treasuries, and the fabulous silver deposits of Potosí. The conquest resulted in the rapid collapse of Andean administrative autonomy and the integration of western South America into the Spanish Empire.",
        keywords: ["Francisco Pizarro", "Inca Empire", "Atahualpa", "Cajamarca", "Cusco", "Potosi", "Peru", "Conquest"]
      },
      {
        id: "spanish_armada_1588",
        title: "Defeat of the Spanish Armada",
        year: 1588,
        exact_date: "August 1588",
        summary: "In August 1588, King Philip II of Spain dispatched the Great and Most Fortunate Navy, known commonly as the Spanish Armada—comprising one hundred and thirty galleons and roughly thirty thousand men—to overthrow Protestant Queen Elizabeth I and end English privateering in the Atlantic. Commanded by the Duke of Medina Sidonia, the fleet intended to rendezvous with a veteran Spanish invasion army in Flanders, but was disrupted by aggressive English naval tactics, long-range naval artillery, and nocturnal fireship attacks off the port of Gravelines. Broken from their tight crescent defensive formation and battered by fierce northern gales known as the Protestant Wind, the surviving Spanish ships were forced to circumnavigate Scotland and Ireland, where dozens of vessels were wrecked upon rocky reefs. The defeat preserved English national sovereignty, secured the Protestant Reformation in Britain, and marked a turning point in European naval power.",
        keywords: ["Spanish Armada", "1588", "Queen Elizabeth I", "Philip II", "Francis Drake", "Gravelines", "Protestant Wind", "Naval Battle"]
      },
      {
        id: "dutch_east_india_1602",
        title: "Founding of the Dutch East India Company",
        year: 1602,
        exact_date: "20 March 1602",
        summary: "On March 20, 1602, the States General of the Dutch Republic chartered the Vereenigde Oostindische Compagnie (VOC), or Dutch East India Company, creating the world's first publicly traded corporation and the first company to issue shares of stock to the general public. Granted an exclusive national monopoly on Dutch maritime trade eastward past the Cape of Good Hope, the VOC possessed quasi-governmental powers to maintain private armies, establish overseas forts, negotiate treaties, and mint its own coinage. Operating from its fortified headquarters in Batavia, modern Jakarta, the company dominated the lucrative Southeast Asian spice trade in nutmeg, cloves, and cinnamon throughout the seventeenth century. The VOC pioneered modern corporate governance, institutional joint-stock financing, and the world's first modern stock exchange in Amsterdam, providing the commercial blueprint for global multinational capitalism.",
        keywords: ["Dutch East India Company", "VOC", "1602", "Amsterdam", "Joint-Stock Company", "Stock Market", "Spice Trade", "Batavia"]
      },
      {
        id: "peace_westphalia_1648",
        title: "Signing of the Peace of Westphalia",
        year: 1648,
        exact_date: "October 1648",
        summary: "In October 1648, diplomatic delegates from across Europe signed treaties in the Westphalian cities of Münster and Osnabrück, bringing a negotiated conclusion to the devastating Thirty Years' War in Germany and the Eighty Years' War between Spain and the Netherlands. Having claimed an estimated four to eight million lives through combat, famine, and typhus epidemics, the conflict shattered the political and religious cohesion of Central Europe. The treaties recognized the independence of the Swiss Confederacy and the Dutch Republic, granted legal recognition to Calvinism alongside Lutheranism and Catholicism, and established the foundational doctrine of Westphalian sovereignty, which asserts that sovereign nation-states possess exclusive domestic authority over their territories free from outside religious intervention. The Peace of Westphalia established the structural template for modern international law and diplomatic statecraft.",
        keywords: ["Peace of Westphalia", "1648", "Thirty Years War", "Westphalian Sovereignty", "Nation-State", "International Law", "Munster"]
      }
    ]
  },

  // Era: Revolutions & Modern Transformations
  {
    era: "Revolutions, Rights & Modern Transformations",
    events: [
      {
        id: "glorious_revolution_1688",
        title: "The Glorious Revolution and English Bill of Rights",
        year: 1688,
        exact_date: "1688 - 1689",
        summary: "In late 1688, a coalition of English parliamentarians invited Dutch stadtholder William of Orange and his English wife Mary Stuart to depose Catholic King James II in the largely bloodless political transfer known as the Glorious Revolution. Following James's flight to France, Parliament enacted the 1689 English Bill of Rights, which permanently established constitutional monarchy by subordinating royal authority to regular parliamentary consent. The document prohibited royal suspension of laws without parliament, abolished cruel and unusual punishments, safeguarded free parliamentary elections and debate, and guaranteed petition rights for citizens. The Glorious Revolution permanently shifted the balance of power from autocratic monarchy to representative parliament in Britain, profoundly influencing John Locke's political philosophy and the United States Constitution.",
        keywords: ["Glorious Revolution", "1688", "Bill of Rights", "William and Mary", "James II", "Constitutional Monarchy", "Parliament"]
      },
      {
        id: "rights_of_man_1789",
        title: "Declaration of the Rights of Man and of the Citizen",
        year: 1789,
        exact_date: "26 August 1789",
        summary: "On August 26, 1789, in Paris, the National Constituent Assembly of Revolutionary France formally adopted the Declaration of the Rights of Man and of the Citizen, drafted by the Marquis de Lafayette in consultation with Thomas Jefferson. Inspired by Enlightenment ideals of natural rights and Jean-Jacques Rousseau's social contract theory, the seventeen-article manifesto proclaimed as universal and inalienable that all men are born free and remain equal in rights. The declaration asserted the core civic principles of liberty, private property, security, resistance to oppression, equality before the law, freedom of speech, and popular sovereignty, asserting that authority resides fundamentally in the nation rather than the royal person of the king. The document dismantled the feudal social order of the Ancien Régime and established the philosophical foundation for modern universal human rights law.",
        keywords: ["Rights of Man", "French Revolution", "1789", "Lafayette", "Thomas Jefferson", "Human Rights", "Liberty Equality Fraternity"]
      },
      {
        id: "haitian_revolution_1791",
        title: "The Haitian Revolution Led by Toussaint Louverture",
        year: 1791,
        exact_date: "1791 - 1804",
        summary: "Beginning in August 1791 with a coordinated uprising across northern plantations in the French Caribbean colony of Saint-Domingue, the Haitian Revolution stands as history's only successful slave revolt that established an independent sovereign nation. Led by formerly enslaved general Toussaint Louverture and later Jean-Jacques Dessalines, Haitian revolutionary forces fought and decisively defeated British, Spanish, and elite French expeditionary armies dispatched by Napoleon Bonaparte. On January 1, 1804, Dessalines proclaimed the independence of Haiti, restoring the island's indigenous Taíno name and creating the world's first Black republic and the second independent nation in the Western Hemisphere. The revolution fundamentally challenged global racial hierarchies, dealt a catastrophic blow to Atlantic plantation slavery, and forced Napoleon to abandon his North American colonial ambitions, leading directly to the 1803 Louisiana Purchase.",
        keywords: ["Haitian Revolution", "Toussaint Louverture", "Jean-Jacques Dessalines", "Saint-Domingue", "Abolition", "Haiti", "1804"]
      },
      {
        id: "battle_waterloo_1815",
        title: "The Battle of Waterloo",
        year: 1815,
        exact_date: "18 June 1815",
        summary: "On June 18, 1815, near the Belgian village of Waterloo, an allied Seventh Coalition army commanded by the British Duke of Wellington and Prussian Field Marshal Gebhard Leberecht von Blücher decisively defeated Emperor Napoleon Bonaparte, ending the Napoleonic Wars. Napoleon had escaped exile on the island of Elba in March 1815 to reclaim the French imperial throne during his dramatic Hundred Days, seeking to divide and destroy allied armies in Belgium before they could unite. Wellington's disciplined British and allied infantry held firm in defensive squares against repeated French heavy cavalry charges and artillery bombardments throughout the afternoon, until Prussian troops arrived on Napoleon's right flank to shatter the French lines. Napoleon abdicated four days later and was exiled permanently to the remote South Atlantic island of Saint Helena, restoring the Bourbon monarchy and inaugurating decades of peace under the Concert of Europe.",
        keywords: ["Battle of Waterloo", "Napoleon", "Duke of Wellington", "Blucher", "1815", "Napoleonic Wars", "Saint Helena"]
      },
      {
        id: "simon_bolivar_1819",
        title: "Simón Bolívar and the Liberation of South America",
        year: 1819,
        exact_date: "1819 - 1824",
        summary: "Between 1819 and 1824, Venezuelan military leader and statesman Simón Bolívar, celebrated throughout South America as El Libertador, led revolutionary armies across rugged Andean peaks and plains to liberate northern South America from Spanish colonial rule. Following his daring winter crossing of the freezing Andes mountains in 1819, Bolívar triumphed at the pivotal Battle of Boyacá, freeing modern Colombia and establishing the republic of Gran Colombia, serving as its first president. Coordinating with general Antonio José de Sucre, Bolívar went on to secure the definitive independence of Venezuela at Carabobo, Ecuador at Pichincha, and Peru and Bolivia at the landmark Battle of Ayacucho in 1824. Bolívar envisioned a unified South American federation capable of resisting foreign imperialism, and his military campaigns permanently ended three centuries of Spanish imperial dominion on the continent.",
        keywords: ["Simon Bolivar", "El Libertador", "Gran Colombia", "Battle of Boyaca", "Ayacucho", "South American Independence", "Venezuela"]
      },
      {
        id: "meiji_restoration_1868",
        title: "The Meiji Restoration in Japan",
        year: 1868,
        exact_date: "1868",
        summary: "In 1868, a political revolution orchestrated by reformist samurai and imperial court nobles overthrew the two-hundred-and-fifty-year-old Tokugawa military shogunate, officially restoring practical imperial governance to sixteen-year-old Emperor Meiji. Galvanized by the sudden arrival of Western gunboats led by Commodore Matthew Perry in 1853 and alarmed by unequal treaties imposed upon neighboring China, Japan launched one of the most rapid and comprehensive modernization programs in world history under the slogan 'Enrich the Country, Strengthen the Armed Forces'. The new government dismantled feudal samurai class privileges, constructed modern telegraph and railway networks, established universal public schooling, and adopted a Western-style constitutional monarchy with a national parliament. Within four decades, Japan transformed from an isolated agrarian society into an industrialized global military and economic powerhouse.",
        keywords: ["Meiji Restoration", "Japan", "Emperor Meiji", "Tokugawa Shogunate", "Samurai", "Modernization", "1868"]
      },
      {
        id: "suez_canal_1869",
        title: "Opening of the Suez Canal",
        year: 1869,
        exact_date: "17 November 1869",
        summary: "On November 17, 1869, following a lavish opening ceremony attended by international royalty, the Suez Canal was officially opened to international commercial navigation, connecting the Mediterranean Sea to the Red Sea across the Isthmus of Suez in Egypt. Masterminded by French diplomat and developer Ferdinand de Lesseps and constructed over ten grueling years by hundreds of thousands of forced Egyptian laborers, the hundred-mile artificial sea-level waterway eliminated the arduous five-thousand-mile voyage around the southern tip of Africa. The canal collapsed global shipping times between Europe and Asia by weeks, transforming international maritime trade, naval strategy, and imperial communications. Because of its supreme geopolitical importance, control of the canal became a focal point of British imperial policy and remained central to Middle Eastern geopolitical conflicts throughout the twentieth century.",
        keywords: ["Suez Canal", "Ferdinand de Lesseps", "Egypt", "Red Sea", "Mediterranean", "1869", "Maritime Trade"]
      },
      {
        id: "titanic_sinking_1912",
        title: "Sinking of the RMS Titanic",
        year: 1912,
        exact_date: "15 April 1912",
        summary: "In the early morning hours of April 15, 1912, the British luxury passenger ocean liner RMS Titanic sank in the icy waters of the North Atlantic Ocean roughly four days into its maiden voyage from Southampton to New York City after striking an iceberg. Regarded prior to its voyage as virtually unsinkable due to sixteen watertight compartments with automatic doors, the massive vessel carried insufficient lifeboats for the more than two thousand two hundred passengers and crew aboard. More than one thousand five hundred people perished in the freezing ocean, including prominent international industrialists, artists, and hundreds of emigrant families traveling in third-class steerage. The tragedy shocked the global public and prompted sweeping international maritime safety reforms, leading to the 1914 International Convention for the Safety of Life at Sea (SOLAS), mandatory 24-hour shipboard radio watches, and the International Ice Patrol.",
        keywords: ["Titanic", "RMS Titanic", "15 April 1912", "Iceberg", "North Atlantic", "SOLAS", "Maritime Safety"]
      },
      {
        id: "outbreak_ww1_1914",
        title: "Assassination of Franz Ferdinand and Outbreak of World War I",
        year: 1914,
        exact_date: "28 June 1914",
        summary: "On June 28, 1914, in the Bosnian city of Sarajevo, nineteen-year-old Serbian nationalist Gavrilo Princip, a member of the Black Hand secret society, assassinated Archduke Franz Ferdinand, heir to the Austro-Hungarian throne, and his wife Sophie. The political killing ignited the volatile July Crisis, as Austria-Hungary issued an uncompromising ultimatum to Serbia, triggering a catastrophic chain reaction among Europe's interlocking military alliance treaties. Within weeks, Russia mobilized to protect Serbia, leading Germany to declare war on Russia and France, while the German invasion of neutral Belgium prompted Great Britain to enter the conflict. The ensuing World War I lasted four devastating years, introduced industrialized trench warfare, claimed over twenty million military and civilian lives, and toppled four centuries-old European imperial dynasties: the Russian, German, Austro-Hungarian, and Ottoman empires.",
        keywords: ["World War I", "Franz Ferdinand", "Gavrilo Princip", "Sarajevo", "1914", "Black Hand", "Alliances", "July Crisis"]
      },
      {
        id: "october_revolution_1917",
        title: "The Russian October Revolution",
        year: 1917,
        exact_date: "7 November 1917",
        summary: "On the night of November 7, 1917 (October 25 on the Julian calendar), Bolshevik Red Guards commanded by Vladimir Lenin and Leon Trotsky stormed the Winter Palace in Petrograd, modern Saint Petersburg, deposing the provisional government and seizing state power in Russia. Exploiting widespread public exhaustion with Russia's devastating participation in World War I, runaway food inflation, and land inequality, the Bolsheviks rallied urban workers and soldier soviets under the resonant slogans 'Peace, Land, and Bread' and 'All Power to the Soviets'. Lenin immediately signed the Treaty of Brest-Litovsk to withdraw Russia from World War I and nationalized land, banking, and heavy industry. The revolution ignited a brutal five-year Russian Civil War, brought an end to centuries of Tsarist imperial rule, and established the Soviet Union as the world's first communist state, fundamentally reshaping twentieth-century global geopolitics.",
        keywords: ["October Revolution", "Bolsheviks", "Vladimir Lenin", "Leon Trotsky", "Petrograd", "Winter Palace", "Soviet Union", "1917"]
      },
      {
        id: "womens_suffrage_1920",
        title: "Ratification of the 19th Amendment (Women's Suffrage)",
        year: 1920,
        exact_date: "18 August 1920",
        summary: "On August 18, 1920, the United States Constitution's Nineteenth Amendment was officially ratified when Tennessee became the thirty-sixth state to approve the measure, forever prohibiting the federal government and individual states from denying the right to vote on the basis of sex. The landmark victory was achieved following more than seven decades of relentless public activism by the women's suffrage movement, initiated nationally at the 1848 Seneca Falls Convention and spearheaded by visionary leaders including Susan B. Anthony, Elizabeth Cady Stanton, Sojourner Truth, and Alice Paul. Suffragists organized nationwide protest marches, silent pickets outside the White House, and hunger strikes in prison to demand equal democratic participation. The amendment enfranchised over twenty-six million American women in time for the 1920 presidential election, standing as one of the greatest civil rights milestones in democratic history.",
        keywords: ["Womens Suffrage", "19th Amendment", "1920", "Susan B Anthony", "Alice Paul", "Seneca Falls", "Voting Rights"]
      },
      {
        id: "wall_street_crash_1929",
        title: "The Wall Street Crash of 1929",
        year: 1929,
        exact_date: "29 October 1929",
        summary: "On October 29, 1929, a day remembered as Black Tuesday, the New York Stock Exchange collapsed in a catastrophic wave of panic selling, with investors dumping a record sixteen million shares in a single trading session and wiping out billions of dollars in market valuation. Triggered by years of speculative margin borrowing, industrial overproduction, and weak agricultural commodity prices during the Roaring Twenties, the crash triggered nationwide bank runs, commercial bankruptcies, and massive factory closures. The financial panic directly ignited the Great Depression, the most severe economic crisis in modern industrial history, causing global unemployment to surge past twenty-five percent and slashing international trade by half. The crisis prompted the election of President Franklin D. Roosevelt, the enactment of the New Deal, and the establishment of regulatory bodies like the Securities and Exchange Commission (SEC) to oversee financial markets.",
        keywords: ["Wall Street Crash", "Black Tuesday", "1929", "Great Depression", "Stock Market", "New Deal", "Franklin D Roosevelt"]
      },
      {
        id: "indian_independence_1947",
        title: "Indian Independence and Partition",
        year: 1947,
        exact_date: "15 August 1947",
        summary: "At the stroke of midnight on August 15, 1947, British colonial rule on the Indian subcontinent officially came to an end after nearly two centuries, as Prime Minister Jawaharlal Nehru delivered his celebrated 'Tryst with Destiny' address proclaiming the birth of independent India. The historic achievement followed decades of mass non-violent resistance and civil disobedience campaigns led by Mahatma Gandhi and the Indian National Congress. Concurrently, the British partition plan divided the subcontinent along religious lines into the sovereign states of India and Pakistan, triggering the mass displacement of more than fourteen million Hindus, Muslims, and Sikhs across hastily drawn borders and resulting in tragic communal violence that claimed hundreds of thousands of lives. Indian independence dismantled the cornerstone of the British Empire and inspired anti-colonial liberation movements across Africa and Asia.",
        keywords: ["Indian Independence", "Mahatma Gandhi", "Jawaharlal Nehru", "Partition", "15 August 1947", "British Raj", "Pakistan"]
      },
      {
        id: "mlk_i_have_a_dream_1963",
        title: "Martin Luther King Jr.'s 'I Have a Dream' Speech",
        year: 1963,
        exact_date: "28 August 1963",
        summary: "On August 28, 1963, speaking from the marble steps of the Lincoln Memorial to an integrated gathering of more than two hundred and fifty thousand demonstrators during the March on Washington for Jobs and Freedom, Dr. Martin Luther King Jr. delivered his immortal 'I Have a Dream' speech. King articulated an impassioned moral vision of racial harmony, civil equality, and economic justice, declaring his dream that his four young children would one day live in a nation where they would not be judged by the color of their skin but by the content of their character. Combining prophetic biblical cadence with references to the US Declaration of Independence and the Emancipation Proclamation, King's soaring rhetoric mobilized nationwide public conscience against racial segregation. The historic address created decisive political momentum that pressured the United States Congress to enact the Civil Rights Act of 1964 and the Voting Rights Act of 1965.",
        keywords: ["Martin Luther King Jr", "I Have a Dream", "March on Washington", "1963", "Civil Rights Movement", "Lincoln Memorial", "Equality"]
      },
      {
        id: "mandela_freedom_1990",
        title: "Release of Nelson Mandela and the End of Apartheid",
        year: 1990,
        exact_date: "11 February 1990",
        summary: "On February 11, 1990, South African anti-apartheid leader Nelson Mandela walked out of Victor Verster Prison near Cape Town as a free man after twenty-seven years of political imprisonment, greeted by ecstatic crowds and televised live to hundreds of millions worldwide. Following decades of internal strikes, international economic sanctions, and escalating civil unrest, South African State President F.W. de Klerk unbanned the African National Congress and initiated bilateral negotiations with Mandela to dismantle the institutionalized racial segregation system known as apartheid. Working together through intense national tensions, Mandela and de Klerk guided South Africa through a peaceful transition toward inclusive non-racial democracy, jointly receiving the 1993 Nobel Peace Prize. In April 1994, South Africa held its first fully democratic multiracial elections, and Nelson Mandela was inaugurated as the country's first Black president.",
        keywords: ["Nelson Mandela", "Apartheid", "South Africa", "11 February 1990", "FW de Klerk", "African National Congress", "Human Rights"]
      }
    ]
  }
];

export function expandHistoricalDatabase() {
  console.log("==================================================================");
  console.log("   EXPANDING WORLD HISTORY RAG TO OVER 100+ MILESTONES            ");
  console.log("==================================================================");

  // 1. Read existing JSON seed
  const raw = fs.readFileSync(JSON_PATH, 'utf-8');
  const seed = JSON.parse(raw);

  // Append new eras & events
  for (const newEra of ADDITIONAL_WORLD_HISTORY_EVENTS) {
    let existingEra = seed.historical_eras.find(e => e.era === newEra.era);
    if (!existingEra) {
      existingEra = { era: newEra.era, events: [] };
      seed.historical_eras.push(existingEra);
    }

    for (const ev of newEra.events) {
      if (!existingEra.events.some(e => e.id === ev.id)) {
        existingEra.events.push(ev);
      }
    }
  }

  fs.writeFileSync(JSON_PATH, JSON.stringify(seed, null, 4), 'utf-8');
  console.log(`Updated JSON RAG seed with additional milestones: ${JSON_PATH}`);

  // 2. Insert into SQLite Database
  const db = new DatabaseSync(DB_PATH);
  const insertOrReplace = db.prepare(`
    INSERT OR REPLACE INTO history_dictionary (entity_id, entity_name, exact_date, verified_fact)
    VALUES (?, ?, ?, ?)
  `);

  let count = 0;
  for (const era of seed.historical_eras) {
    for (const ev of era.events) {
      insertOrReplace.run(ev.id, ev.title, ev.exact_date, ev.summary);
      count++;
    }
  }

  console.log(`✓ Synchronized ${count} total landmark milestones into 'history_dictionary' SQLite!`);
  console.log("==================================================================\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  expandHistoricalDatabase();
}
