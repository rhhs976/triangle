import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_FILE = path.resolve(__dirname, '../data/my_dictionary.db');

const db = new DatabaseSync(DB_FILE);
const insertStmt = db.prepare(`
  INSERT OR REPLACE INTO my_dictionary (word, heading, explanation, usage, raw_entry, created_at)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// 200 curated, rich, modern B-words definitions following the EXACT format:
// **Word**
// Explanation:
// ...
// Usage:
// 1. ...
// 2. ...

const B_WORDS_DATA = [
  {
    word: "baby",
    explanation: "A very young child, especially one from birth until the stage of walking; the earliest developmental phase of human life characterized by rapid physical, cognitive, and emotional development, requiring comprehensive nurturing, protection, and care.",
    usage: "1. The newborn baby slept peacefully in the crib while soft lullaby music played in the nursery.\n2. Doctors track the baby's developmental milestones carefully throughout the first year of life."
  },
  {
    word: "bachelor",
    explanation: "A man who is unmarried, or historically, a person who has achieved a first university degree (a Bachelor's degree) upon completion of undergraduate studies in arts, science, or another academic discipline.",
    usage: "1. He enjoyed his life as an independent bachelor living in his downtown apartment.\n2. After four years of study, she graduated with a Bachelor of Science in computer engineering."
  },
  {
    word: "back",
    explanation: "The posterior or rear surface of the human body extending from the neck to the pelvis, or the side or area that is opposite to the front or main portion of an object, vehicle, or structure.",
    usage: "1. Good ergonomic chairs provide lumbar support to reduce tension and pain in the lower back.\n2. We walked around to the back of the house to enter through the garden gate."
  },
  {
    word: "background",
    explanation: "The area, scenery, or visual space situated behind the primary subject of focus, or the collection of historical circumstances, family upbringing, and past experiences that shape an individual or event.",
    usage: "1. The portrait featured soft blue mountains visible in the distant background.\n2. Her extensive background in data analytics made her an ideal candidate for the engineering role."
  },
  {
    word: "backyard",
    explanation: "An enclosed area of land, garden, or yard situated immediately behind a residential dwelling, commonly utilized for domestic recreation, gardening, social gatherings, and relaxation.",
    usage: "1. The children spent the sunny afternoon kicking a ball across the green lawn in the backyard.\n2. They planted a row of tomato vines and fresh herbs along the backyard fence."
  },
  {
    word: "bacon",
    explanation: "Cured meat prepared from the side, back, or belly of a pig, typically sliced thin and fried or baked until crisp, widely consumed across global cuisines as a breakfast staple or savory flavoring ingredient.",
    usage: "1. The enticing aroma of crispy bacon and warm pancakes filled the morning kitchen.\n2. Chefs frequently crumble cooked bacon over roasted vegetables to add smoky richness."
  },
  {
    word: "bacteria",
    explanation: "Microscopic, single-celled prokaryotic microorganisms lacking a membrane-bound nucleus, found ubiquitously throughout Earth's ecosystems and fulfilling essential biological roles in nutrient cycling, fermentation, digestion, and disease pathology.",
    usage: "1. Beneficial probiotic bacteria in the digestive tract play an essential role in gut health and immunity.\n2. Hand sanitizers with high alcohol concentrations effectively eliminate harmful bacteria from surfaces."
  },
  {
    word: "badge",
    explanation: "A distinctive emblem, pin, token, or insignia worn on clothing or displayed digitally to indicate rank, authority, membership in an organization, or verified accomplishment.",
    usage: "1. The security officer presented his official identification badge before entering the restricted facility.\n2. Upon completing the programming course, learners receive a verified digital badge on their profile."
  },
  {
    word: "badminton",
    explanation: "A racket sport played on a marked indoor or outdoor court between two opposing players or pairs, where participants hit a feathered shuttlecock across a high net without allowing it to contact the floor.",
    usage: "1. They organized a friendly badminton tournament at the community sports center over the weekend.\n2. Fast reflexes and agile footwork are essential skills for competitive badminton athletes."
  },
  {
    word: "bag",
    explanation: "A flexible container made of fabric, leather, paper, or synthetic polymer, designed with an opening at the top and utilized for holding, transporting, or storing diverse items and personal belongings.",
    usage: "1. Shoppers are increasingly bringing reusable canvas bags to grocery stores to minimize plastic waste.\n2. She packed her laptop, notebook, and water bottle into her leather shoulder bag."
  },
  {
    word: "bagel",
    explanation: "A dense, ring-shaped yeast bread roll originating in Central European Jewish communities, boiled briefly in water prior to baking to produce a characteristically chewy interior and glossy crust.",
    usage: "1. He ordered a toasted sesame bagel generously spread with cream cheese and topped with smoked salmon.\n2. Freshly baked bagels from traditional bakeries possess a distinct, satisfying chewiness."
  },
  {
    word: "baggage",
    explanation: "Suitcases, trunks, backpacks, and personal gear belonging to a traveler for conveyance during a trip, or metaphorically, unresolved emotional baggage and past burdens carried into new relationships.",
    usage: "1. Airline passengers waited at the terminal carousel to collect their checked baggage.\n2. Through counseling, he learned to process the emotional baggage accumulated from earlier hardships."
  },
  {
    word: "bake",
    explanation: "To cook food using dry indirect heat within an enclosed oven or hot surface, causing chemical transformations such as starch gelatinization, caramelization, and crust formation.",
    usage: "1. She decided to bake a batch of homemade sourdough bread for the Sunday family dinner.\n2. Precise oven temperature regulation is crucial when you bake delicate pastries and souffles."
  },
  {
    word: "baker",
    explanation: "A skilled culinary artisan or trade professional who prepares, bakes, and sells bread, rolls, pastries, pies, and cakes using flour, yeast, and other ingredients.",
    usage: "1. The neighborhood baker begins work before dawn so warm, crusty loaves are ready for morning customers.\n2. A skilled artisan baker understands the subtle chemistry governing fermentation and dough hydration."
  },
  {
    word: "bakery",
    explanation: "A commercial establishment, workshop, or retail shop where flour-based foodstuffs such as bread, cakes, pastries, and biscuits are prepared, baked, and sold to the public.",
    usage: "1. Customers lined up outside the French bakery to purchase flaky croissants and fresh baguettes.\n2. The sweet scent of vanilla and melted chocolate drifted into the street from the corner bakery."
  },
  {
    word: "balance",
    explanation: "An even distribution of weight, force, or influence enabling an object or person to remain steady and upright, or a harmonious proportion among conflicting elements such as work and personal life.",
    usage: "1. Gymnasts dedicate years of rigorous training to develop supreme core strength and flawless physical balance.\n2. Maintaining a sustainable work-life balance is crucial for preserving mental well-being and long-term career productivity."
  },
  {
    word: "balcony",
    explanation: "An elevated platform projecting from the exterior wall of a building above ground level, enclosed by a protective railing or balustrade and accessed through an upper-story door or window.",
    usage: "1. From the hotel room balcony, guests enjoyed a magnificent panoramic view across the ocean bay.\n2. She placed several potted ferns and flowering geraniums along the sunny balcony railing."
  },
  {
    word: "bald",
    explanation: "Having little or no hair on the scalp or head, or having lost natural surface covering, foliage, or ornamentation, presenting an unadorned or exposed appearance.",
    usage: "1. The professor smiled warmly, adjusting his spectacles above his smooth bald forehead.\n2. The tires were dangerously worn down and virtually bald, requiring immediate replacement."
  },
  {
    word: "ball",
    explanation: "A spherical or rounded body used extensively in recreational and competitive games and sports, or a formal gathering and social party featuring ballroom dancing and festive attire.",
    usage: "1. The striker struck the soccer ball cleanly with his right boot, driving it into the top corner of the net.\n2. Guests dressed in elegant evening gowns and tuxedos gathered for the annual charity ball."
  },
  {
    word: "ballad",
    explanation: "A lyrical narrative poem or song characterized by short stanzas that recount a dramatic, romantic, or historical story, often passed down through oral tradition or composed in contemporary folk music.",
    usage: "1. The minstrel sang an evocative ballad chronicling the tragic courage of ancient Celtic heroes.\n2. The band concluded the concert with a poignant acoustic ballad that resonated deeply with the audience."
  },
  {
    word: "ballet",
    explanation: "A classical theatrical dance form originating during the Italian Renaissance, characterized by formal formalized steps, precise techniques, flowing gestures, and expressive musical storytelling.",
    usage: "1. Dancers train rigorously from an early age to master the graceful pirouettes demanded in classical ballet.\n2. The company received standing ovations for their breathtaking production of Tchaikovsky's Swan Lake ballet."
  },
  {
    word: "balloon",
    explanation: "A flexible, inflatable rubber or synthetic pouch that expands when filled with air, helium, or light gases, used in celebrations, scientific atmospheric research, or recreational flight.",
    usage: "1. Colorful balloons and streamers decorated the room for the child's fifth birthday celebration.\n2. Meteorologists released a high-altitude weather balloon to collect temperature and pressure readings aloft."
  },
  {
    word: "ballot",
    explanation: "A secure process or physical/digital medium by which citizens or members cast their votes in an election, ensuring confidential and democratic determination of leaders and policies.",
    usage: "1. Eligible voters marked their candidate selections on the paper ballot before slipping it into the sealed box.\n2. The civic referendum appeared on the autumn ballot, allowing communities to decide school funding."
  },
  {
    word: "bamboo",
    explanation: "A fast-growing perennial woody grass belonging to the family Poaceae, renowned for its strong, hollow stems used extensively across architecture, paper manufacture, furniture, and culinary crafts.",
    usage: "1. Environmental builders favor bamboo flooring because it is remarkably durable and rapidly renewable.\n2. Giant pandas feed almost exclusively on fresh green bamboo shoots and stems in montane forests."
  },
  {
    word: "banana",
    explanation: "An elongated, edible tropical fruit produced by large herbaceous plants of the genus Musa, featuring a thick yellow peel enclosing sweet, potassium-rich creamy pulp.",
    usage: "1. Athletes frequently eat a ripe banana before endurance workouts to replenish natural carbohydrates and potassium.\n2. He sliced fresh bananas over his morning oatmeal and drizzled it with a spoonful of pure honey."
  },
  {
    word: "band",
    explanation: "A cohesive musical ensemble of performers playing instruments together, or a continuous strip of material utilized for binding, encircling, or securing objects.",
    usage: "1. The jazz band performed an energetic improvisation set at the waterfront music festival.\n2. She wrapped a sturdy elastic band around the bundle of invoices to keep the papers orderly."
  },
  {
    word: "bandage",
    explanation: "A strip of woven cloth, gauze, or adhesive material applied to dress, protect, compress, or support an injured limb, wound, or surgical incision.",
    usage: "1. The paramedic applied antiseptic cream and wrapped a sterile gauze bandage securely around the scrape.\n2. He wore an elastic compression bandage around his sprained ankle while walking during rehabilitation."
  },
  {
    word: "bandwidth",
    explanation: "The maximum transmission capacity or data transfer rate of a communications channel or digital network per unit of time, or informally, a person's mental capacity to handle tasks.",
    usage: "1. High-speed fiber connections provide exceptional bandwidth for 4K video streaming and real-time gaming.\n2. She apologized to her colleague, explaining she lacked the cognitive bandwidth to take on extra projects this week."
  },
  {
    word: "bank",
    explanation: "A financial institution licensed to accept monetary deposits, manage accounts, issue loans, and facilitate wealth transfers, or the sloping land bordering a body of water.",
    usage: "1. Commercial banks play an essential financial intermediary role by lending capital to local entrepreneurs.\n2. Families picnicked pleasantly along the grassy green bank of the winding river."
  },
  {
    word: "banker",
    explanation: "An officer, manager, or executive of a bank or financial institution involved in managing financial accounts, underwriting credit facilities, or investing corporate capital.",
    usage: "1. The investment banker advised the company's executive board on the international corporate merger.\n2. She consulted with her local personal banker to evaluate attractive mortgage options for purchasing a home."
  },
  {
    word: "bankruptcy",
    explanation: "A legally recognized status of an individual or business unable to satisfy outstanding debt obligations, triggering court-supervised liquidation or debt restructuring to resolve liabilities.",
    usage: "1. Rising debt and declining revenues forced the retail enterprise to file for Chapter 11 bankruptcy.\n2. Sound financial planning and prudent debt management help individuals avoid the hardship of bankruptcy."
  },
  {
    word: "banner",
    explanation: "A broad piece of cloth, plastic, or digital display bearing a slogan, heraldic design, or advertisement, suspended publicly or integrated into website headers.",
    usage: "1. Students unfurled a colorful welcome banner across the entrance of the campus auditorium.\n2. The website redesign featured a clean promotional banner highlighting free shipping on all orders."
  },
  {
    word: "bar",
    explanation: "A rigid elongated piece of metal, wood, or other solid material, or a counter or commercial establishment serving beverages, or an obstacle preventing passage.",
    usage: "1. Structural steel reinforcement bars are embedded in concrete to withstand strong tensile stresses.\n2. Friends gathered at the quiet corner bar to converse and celebrate the end of a demanding workweek."
  },
  {
    word: "barbecue",
    explanation: "A culinary technique and social gathering involving the slow grilling or smoking of meats, poultry, or vegetables over charcoal, wood embers, or gas burners.",
    usage: "1. Neighbors gathered in the sunny garden for a delightful summer barbecue featuring smoked ribs and corn.\n2. Slow-cooked Texas barbecue relies on indirect hickory wood smoke and hours of patient cooking."
  },
  {
    word: "barber",
    explanation: "A professional tradesperson whose occupation entails cutting, trimming, styling, and grooming hair and shaving or trimming beards and mustaches.",
    usage: "1. He visits the local neighborhood barber every three weeks for a clean fade haircut and beard trim.\n2. The traditional vintage barber shop featured classic leather swivel chairs and warm lather shaves."
  },
  {
    word: "bare",
    explanation: "Uncovered, naked, or exposed without clothing, foliage, or furnishings; stripped down to essential elements without surplus embellishment.",
    usage: "1. Walking barefoot across the cool, damp morning grass connected him directly with the natural earth.\n2. The winter trees stood with bare branches silhouetted starkly against the gray evening sky."
  },
  {
    word: "bargain",
    explanation: "An agreement or contract between parties settling mutual terms and prices, or a purchase acquired at an exceptionally favorable price well below standard market value.",
    usage: "1. She negotiated a fair bargain with the merchant at the lively open-air weekend market.\n2. At half price, the vintage hardcover encyclopedia was an undeniable bargain for the young student."
  },
  {
    word: "bark",
    explanation: "The tough, protective outermost layer covering the trunk and branches of woody trees, or the sharp, explosive vocal sound emitted by dogs and canine animals.",
    usage: "1. Thick cork bark insulates tree trunks against insect pests, microbial infections, and harsh winter frosts.\n2. The watchdog sounded a fierce, alerting bark as an unfamiliar delivery vehicle pulled into the driveway."
  },
  {
    word: "barley",
    explanation: "A major cereal grain derived from the annual grass Hordeum vulgare, cultivated widely for animal feed, human culinary consumption, and as a primary malt source in brewing.",
    usage: "1. The hearty winter soup contained tender chunks of roasted beef, root carrots, and simmered pearl barley.\n2. Craft brewers carefully germinate and kilned select barley grains to produce flavorful brewing malts."
  },
  {
    word: "barn",
    explanation: "A large agricultural outbuilding utilized on farms for housing livestock, storing harvested crops and hay, and sheltering heavy machinery and farming equipment.",
    usage: "1. Swallows nested inside the high wooden rafters of the historic red dairy barn.\n2. Farmers stacked hundred of dry golden hay bales inside the barn before the autumn rain arrived."
  },
  {
    word: "barrel",
    explanation: "A cylindrical bulging container traditionally constructed from curved wooden staves bound with iron hoops, or a standard volumetric measurement unit commonly applied to crude petroleum.",
    usage: "1. Winemakers aged the vintage red wine in toasted French oak barrels for eighteen months to impart vanilla notes.\n2. Global financial markets closely monitor changes in the price per barrel of benchmark crude oil."
  },
  {
    word: "barrier",
    explanation: "A physical structure, fence, or obstacle that impedes movement or prevents access, or an abstract condition that hinders communication, progress, or integration.",
    usage: "1. Steel highway safety barriers prevent vehicles from veering off roads into opposing traffic lanes.\n2. Developing international language exchange programs helps dismantle cultural barriers and foster mutual trust."
  },
  {
    word: "base",
    explanation: "The lowest part, bottom foundation, or support upon which an object or structure rests, or the fundamental starting point or underlying principle of an argument or operation.",
    usage: "1. Engineers reinforced the stone foundation base to ensure the skyscraper would resist seismic tremors.\n2. Scientific models utilize empirical observations as the evidential base for constructing broader theories."
  },
  {
    word: "baseball",
    explanation: "A popular team bat-and-ball game played on a diamond-shaped field between two nine-player teams taking turns batting and fielding across nine innings.",
    usage: "1. Fans cheered enthusiastically as the home team hitter launched a baseball deep into the centerfield bleachers.\n2. Little league baseball teaches young athletes teamwork, discipline, hand-eye coordination, and sportsmanship."
  },
  {
    word: "basement",
    explanation: "The lowest story of a building or residential house, situated wholly or partly below natural ground level, frequently utilized for utilities, storage, or finished living spaces.",
    usage: "1. They transformed their cool basement into a cozy home entertainment theater and library.\n2. The water heater, electrical circuit breaker panel, and laundry machines were installed in the basement."
  },
  {
    word: "basic",
    explanation: "Forming an essential foundation or fundamental starting point; simple, elementary, and necessary before progressing to complex or advanced stages.",
    usage: "1. Mastering basic arithmetic and logical reasoning is essential before attempting calculus and advanced mathematics.\n2. The training seminar provided employees with a basic orientation regarding digital privacy protocols."
  },
  {
    word: "basin",
    explanation: "A broad, open circular or bowl-shaped vessel for holding liquids, or a natural depression in Earth's surface drained by a river system or containing a sea.",
    usage: "1. She filled the ceramic wash basin with warm water and botanical lavender soap.\n2. The Amazon river basin spans millions of square kilometers, sustaining the planet's largest tropical rainforest."
  },
  {
    word: "basket",
    explanation: "A container woven from interwoven flexible twigs, reeds, cane, or fibers, or constructed from metal or plastic, used for carrying, gathering, or storing items.",
    usage: "1. She carried a woven wicker basket overflowing with fresh crisp apples harvested from the orchard.\n2. The laundry basket was stacked neatly with folded cotton towels and clean linens."
  },
  {
    word: "basketball",
    explanation: "A dynamic fast-paced team court sport where two teams of five players compete to score points by shooting an inflated ball through an elevated hoop and net.",
    usage: "1. The point guard executed a quick crossover dribble before driving toward the basket for a layup.\n2. Playing pickup basketball at the community recreation court offers excellent cardiovascular exercise."
  },
  {
    word: "battery",
    explanation: "A portable electrochemical cell or group of interconnected cells that convert stored chemical energy into electrical energy to power portable electronic devices, vehicles, and systems.",
    usage: "1. Modern lithium-ion batteries provide the high energy density required for extended electric vehicle driving ranges.\n2. Remember to recharge your smartphone battery before leaving on a full-day cross-country flight."
  },
  {
    word: "battle",
    explanation: "A sustained combat encounter between opposing military forces during warfare, or an intense competitive struggle or determined effort to overcome adversity or disease.",
    usage: "1. Historians studied the strategic tactics deployed during the pivotal naval battle of Midway.\n2. The brave community waged a courageous collective battle to rebuild their village after the storm."
  },
  {
    word: "beach",
    explanation: "A gently sloping coastal shore along a body of water such as an ocean, lake, or river, covered with deposited sand, pebbles, or marine shells.",
    usage: "1. Families enjoyed strolling along the sandy beach while cool ocean waves lapped against the shoreline.\n2. Seagulls soared gracefully above the beach as the warm summer sun rose over the horizon."
  },
  {
    word: "beacon",
    explanation: "An intentional conspicuous signal, light, or station situated on a prominent height or coast to warn navigators, guide ships and aircraft, or symbolize inspiring hope.",
    usage: "1. The historic coastal lighthouse served as a vital navigation beacon for ships navigating foggy rocky waters.\n2. Her exemplary leadership was recognized as an inspiring beacon of integrity during institutional challenges."
  },
  {
    word: "beam",
    explanation: "A long, sturdy horizontal structural timber or steel girder used to support roof and floor loads, or a concentrated ray of radiant light, particles, or energy traveling in a straight line.",
    usage: "1. Solid oak ceiling beams imparted rustic warmth and authentic historic character to the renovated cottage.\n2. A bright beam of morning sunlight cut through the parted curtains, illuminating dust motes in the quiet room."
  },
  {
    word: "bean",
    explanation: "The edible seed or kidney-shaped pod of various leguminous climbing plants, widely cultivated across the globe as an affordable, high-protein staple food.",
    usage: "1. Adding black beans and chickpeas to a garden salad provides substantial dietary fiber and plant protein.\n2. The hearty Mexican chili was packed with tender pinto beans, roasted peppers, and fragrant cumin."
  },
  {
    word: "bear",
    explanation: "A large, powerful omnivorous mammal of the family Ursidae possessing thick fur, nonretractable claws, and a stocky build, or as a verb, to endure, support, or carry weight.",
    usage: "1. A mother grizzly bear led her playful cubs along the pristine riverbank in search of spawning salmon.\n2. The concrete columns were carefully engineered to bear the immense structural weight of the overpass."
  },
  {
    word: "beard",
    explanation: "The growth of facial hair that naturally develops on the chin, cheeks, jawline, and upper neck of human males after puberty.",
    usage: "1. He trimmed his full brown beard neatly and applied cedarwood conditioning oil each morning.\n2. The philosopher was depicted in marble sculptures with a flowing, dignified beard symbolizing wisdom."
  },
  {
    word: "beast",
    explanation: "Any non-human animal, especially a large, wild four-footed quadruped, or metaphorically, a person exhibiting cruel, uncivilized, or formidable characteristics.",
    usage: "1. Explorers respected the untamed wilderness where formidable wild beasts roamed free.\n2. The powerful off-road vehicle proved to be an absolute beast when conquering rocky mountain trails."
  },
  {
    word: "beat",
    explanation: "To strike repeatedly with force, to defeat an opponent in competition, or in music, the steady regular pulse or rhythmic unit that structures tempo and musical progression.",
    usage: "1. The drummer established a driving rhythmic beat that inspired everyone in the hall to begin dancing.\n2. Our basketball team fought resiliently in the final quarter to beat their rivals by three points."
  },
  {
    word: "beautiful",
    explanation: "Possessing qualities that delight the senses or appeal profoundly to the mind and spirit; visually or aesthetically pleasing, harmonious, and inspiring.",
    usage: "1. The travelers paused on the mountain overlook to admire a breathtakingly beautiful pink sunset.\n2. She composed a deeply moving, beautiful piano melody that evoked memories of childhood summers."
  },
  {
    word: "beauty",
    explanation: "A combination of aesthetic qualities, harmony, and proportion that pleases the senses or intellect, or an outstanding exemplar of elegance, goodness, and grace.",
    usage: "1. Artists across human history have sought to capture the fleeting beauty of the natural natural world.\n2. The restored vintage roadster was recognized as a true mechanical beauty by car enthusiasts."
  },
  {
    word: "beaver",
    explanation: "A large semiaquatic rodent of the genus Castor, noted for its broad flat scaly tail, webbed feet, and extraordinary capability to fell trees and construct complex dams and lodges.",
    usage: "1. Environmental scientists regard the beaver as a keystone species because its dams create rich wetland habitats.\n2. The busy beaver used its sharp orange incisors to fell a young aspen tree beside the creek."
  },
  {
    word: "become",
    explanation: "To develop into, transition toward, or begin to be a specified state, condition, or identity over the course of time or transformation.",
    usage: "1. Through dedicated practice and patience, the apprentice will eventually become a master craftsman.\n2. As temperatures plummeted past midnight, the wet mountain roads began to become treacherous with black ice."
  },
  {
    word: "bed",
    explanation: "A piece of residential furniture designed and utilized for sleeping, resting, and reclining, typically consisting of a mattress supported upon a frame, or a prepared plot of soil for plants.",
    usage: "1. After an exhausting cross-country journey, slipping into a comfortable warm bed was pure bliss.\n2. In early spring, the gardener turned the soil to prepare a raised flower bed for tulips and daffodils."
  },
  {
    word: "bee",
    explanation: "A winged, flower-visiting insect of the order Hymenoptera, celebrated for its indispensable role as a primary plant pollinator and for producing sweet honey and natural beeswax.",
    usage: "1. The worker honey bee visited hundreds of lavender blossoms to gather rich nectar for the hive.\n2. Agricultural crops rely extensively on native bee populations to pollinate fruits, nuts, and vegetables."
  },
  {
    word: "beef",
    explanation: "The culinary meat obtained from adult domestic cattle (Bos taurus), prepared into various cuts such as steaks, roasts, and ground mince enjoyed in cuisines worldwide.",
    usage: "1. The chef seared a succulent cut of prime beef in a hot cast-iron skillet with rosemary and butter.\n2. Traditional beef stew simmers slowly with root vegetables and red wine to develop deep savory richness."
  },
  {
    word: "beer",
    explanation: "An alcoholic beverage produced by brewing and fermenting malted cereal grains—most commonly barley—flavored with aromatic hops and water, representing one of humanity's oldest prepared drinks.",
    usage: "1. The microbrewery served an artisanal craft beer featuring crisp citrus notes and balanced hop bitterness.\n2. Friends toasted with cold glasses of golden lager beer after finishing a long hiking expedition."
  },
  {
    word: "beetle",
    explanation: "An insect belonging to the order Coleoptera, distinguished by hardened, protective front wings called elytra that fold over the back to shield delicate membranous flight wings beneath.",
    usage: "1. The shiny emerald scarab beetle crawled purposefully across the mossy forest floor.\n2. With over 400,000 documented species, beetles comprise the largest single order of living organisms."
  },
  {
    word: "before",
    explanation: "Preceding in time, space, order, or priority; situated ahead of or earlier than an event, action, or reference point.",
    usage: "1. Make sure to review your travel documents and itinerary carefully before departing for the airport.\n2. The diplomat bowed respectfully before the assembly before presenting the international treaty proposal."
  },
  {
    word: "begin",
    explanation: "To start, commence, or perform the first action or phase of an event, journey, endeavor, or span of time.",
    usage: "1. The orchestra conductor raised his baton, signaling the musicians to begin the symphony's opening overture.\n2. Every great master was once a hesitant novice who simply dared to begin learning."
  },
  {
    word: "beginner",
    explanation: "A person who is starting to learn a skill, language, craft, or subject, possessing little or no prior experience or advanced competence.",
    usage: "1. The community language center offers a beginner conversation course for people new to Spanish.\n2. A patient coach knows how to encourage beginner swimmers as they build water confidence."
  },
  {
    word: "beginning",
    explanation: "The initial point, commencement, origin, or opening section of a process, narrative, event, or developmental stage.",
    usage: "1. The opening chapter marked the gripping beginning of a thrilling mystery novel.\n2. The birth of the new year represents a fresh symbolic beginning filled with optimism and personal goals."
  },
  {
    word: "behave",
    explanation: "To conduct oneself, act, or manage one's actions, particularly in accordance with established rules of decorum, courtesy, and social expectations.",
    usage: "1. Parents reminded the excited children to behave politely during their visit to the historic museum.\n2. Physicists study how elementary subatomic particles behave under intense electromagnetic fields."
  },
  {
    word: "behavior",
    explanation: "The manner in which an individual, organism, or system conducts itself, acts, or responds to internal stimuli and external environmental conditions.",
    usage: "1. Animal psychologists study the cooperative foraging behavior of chimpanzees in tropical canopies.\n2. Consistent, ethical leadership behavior builds deep mutual trust between executives and employees."
  },
  {
    word: "behind",
    explanation: "At or toward the rear or back part of something; situated later in time, lagging in progress, or acting as the hidden cause of an outcome.",
    usage: "1. The young child peeked out playfully from behind the living room curtain.\n2. Economic researchers investigated the fundamental monetary factors behind the sudden market recovery."
  },
  {
    word: "belief",
    explanation: "An acceptance that a proposition, statement, or doctrine is true or real, held with conviction even in the absence of absolute empirical proof.",
    usage: "1. Her unwavering belief in human kindness inspired her lifelong commitment to community humanitarian work.\n2. Scientific methodology relies on verifiable experimental evidence rather than subjective dogmatic belief."
  },
  {
    word: "bell",
    explanation: "A hollow, typically metallic cup-shaped percussion instrument that resonates with a clear ringing tone when struck by an internal clapper or external hammer.",
    usage: "1. The ancient brass church bell tolled across the quiet valley, signaling the arrival of noon.\n2. The school bell rang sharply, prompting eager students to pack their books and head to recess."
  },
  {
    word: "belong",
    explanation: "To be rightly placed or classified in a specified location or category, or to feel accepted, valued, and naturally at home within a community or social group.",
    usage: "1. These rare botanical specimens belong in the university's permanent herbarium archive.\n2. The inclusive club made every new member feel that they truly belong and are appreciated."
  },
  {
    word: "beloved",
    explanation: "Dearly loved, cherished, and held in deep affection by someone; regarded with intense warmth, fondness, and enduring devotion.",
    usage: "1. Family members gathered to honor the memory and legacy of their beloved grandmother.\n2. The poet dedicated his most moving collection of verses to his beloved childhood home."
  },
  {
    word: "below",
    explanation: "At or to a lower position, level, rank, or degree than something else; underneath or beneath a specified standard or surface.",
    usage: "1. From the mountain summit, the entire river valley stretched out peacefully below the hikers.\n2. Winter temperatures in the arctic tundra frequently dip well below freezing for months on end."
  },
  {
    word: "belt",
    explanation: "A flexible strip of leather, webbing, or fabric worn around the waist to support garments, or an endless looped band transmitting mechanical power between rotating pulleys.",
    usage: "1. He fastened his brown leather belt before adjusting his suit jacket for the formal interview.\n2. The engine's serpentine timing belt synchronizes the rotation of the camshaft and crankshaft."
  },
  {
    word: "bench",
    explanation: "A long, sturdy seat made of wood, stone, or metal accommodating multiple persons, or a sturdy work table used by carpenters and laboratory scientists, or the seat of a judge.",
    usage: "1. Older residents sat comfortably on the park bench, feeding pigeons and enjoying the warm sunshine.\n2. The woodworker secured a block of maple onto his workbench to begin chiseling a joint."
  },
  {
    word: "bend",
    explanation: "To curve, flex, or force a straight object into an angle, or to change direction gracefully; or metaphorically, to yield or submit to authority or influence.",
    usage: "1. Blacksmiths heat steel bars until glowing red so they can easily bend the metal into horseshoe shapes.\n2. The scenic country road takes a sharp, gentle bend around the edge of the sparkling lake."
  },
  {
    word: "beneath",
    explanation: "Directly under, underneath, or below something; covered by or lower than a surface, or unworthy of someone's dignity or status.",
    usage: "1. The treasure was buried deep beneath layers of sandy soil and ancient cobblestone foundations.\n2. She considered dishonest shortcuts to be beneath her professional ethical standards."
  },
  {
    word: "benefit",
    explanation: "An advantageous result, helpful gain, or favorable assistance derived from something, or a payment or entitlement provided by insurance or public welfare.",
    usage: "1. Regular cardiovascular exercise yields immense long-term benefits for heart health and cognitive vigor.\n2. The employer offered comprehensive health coverage as an attractive employee benefit."
  },
  {
    word: "berry",
    explanation: "A small, juicy, flesh-filled fruit lacking a stony pit, typically bearing seeds embedded within the pulp, such as blueberries, cranberries, and raspberries.",
    usage: "1. We spent the bright Saturday morning picking sweet wild berries along the edge of the woodland trail.\n2. Berries are packed with potent antioxidants and vitamins that promote cellular longevity."
  },
  {
    word: "beside",
    explanation: "At the side of; immediately adjacent to or alongside someone or something in physical space or comparison.",
    usage: "1. The loyal golden retriever sat quietly beside her owner's armchair all evening.\n2. Beside the towering oak tree, the newly planted sapling appeared remarkably delicate and small."
  },
  {
    word: "best",
    explanation: "Of the highest excellence, superior quality, or greatest effectiveness; surpassing all others in a specified category, contest, or endeavor.",
    usage: "1. The athlete trained relentlessly every morning to deliver the best performance of her athletic career.\n2. Honest open communication is universally recognized as the best foundation for enduring friendships."
  },
  {
    word: "bet",
    explanation: "An agreement to risk money or valuable property on the outcome of an uncertain event, game, or contest; or as an expression of strong confidence.",
    usage: "1. Spectators placed a friendly bet on which sailboat would round the harbor buoy first.\n2. With her tireless work ethic and brilliant ideas, it is a safe bet that she will succeed in law school."
  },
  {
    word: "betray",
    explanation: "To be disloyal to a friend, country, or cause by breaking trust or aiding an adversary, or to unintentionally reveal a secret or hidden emotion.",
    usage: "1. A true confidant would never betray a close friend's vulnerable secrets to gain personal advantage.\n2. A slight nervous tremor in his voice threatened to betray his inner anxiety during the presentation."
  },
  {
    word: "better",
    explanation: "Possessing greater excellence, usefulness, or quality than another; more suitable, desirable, or recovered in health.",
    usage: "1. Developing renewable clean energy infrastructure is far better for the planet's atmospheric health.\n2. After two days of restful sleep and hydration, the patient felt significantly better."
  },
  {
    word: "between",
    explanation: "In the intermediate space, time, or relationship separating two points, persons, objects, or alternatives.",
    usage: "1. The narrow mountain footpath wound gently between two towering granite boulders.\n2. The historic peace summit established mutual diplomatic cooperation between the neighboring nations."
  },
  {
    word: "beyond",
    explanation: "At or to the further side of; farther along than a boundary, or surpassing the reach, understanding, or capability of someone or something.",
    usage: "1. The vast ocean horizon stretched out endlessly beyond the coastal lighthouse.\n2. The theoretical mathematics involved in quantum string physics was beyond the grasp of the introductory class."
  },
  {
    word: "bias",
    explanation: "A disproportionate inclination, prejudice, or systematic preference for or against an idea, group, or outcome, frequently leading to unfair judgment.",
    usage: "1. Scientific peer review processes are specifically designed to eliminate personal bias from research conclusions.\n2. Media literacy enables readers to identify subtle political bias in news commentary."
  },
  {
    word: "bicycle",
    explanation: "A human-powered, pedal-driven vehicle featuring two tandem wheels attached to a rigid frame, steered with handlebars and driven by a linked chain.",
    usage: "1. Commuting to work on a lightweight road bicycle is both environmentally friendly and excellent exercise.\n2. The city constructed separated bike lanes to ensure cyclists on bicycles could travel safely."
  },
  {
    word: "big",
    explanation: "Of considerable size, mass, extent, or intensity; large in physical dimensions or significant in importance and impact.",
    usage: "1. The company announced a big investment in green solar technology across all manufacturing plants.\n2. A big gentle Newfoundland dog greeted visitors with a wagging tail at the farmhouse gate."
  },
  {
    word: "bike",
    explanation: "An informal abbreviation for a bicycle or motorcycle, designating a two-wheeled vehicle steered with handlebars.",
    usage: "1. He grabbed his helmet and rode his mountain bike down the scenic dirt trail.\n2. Thousands of urban residents commute on shared electric bikes during morning rush hours."
  },
  {
    word: "bill",
    explanation: "A statement of fees or money owed for goods or services delivered, or a piece of paper currency, or a draft of proposed legislation submitted to a parliament.",
    usage: "1. The restaurant server brought the dinner bill placed neatly inside a leather folder.\n2. Parliament debated the environmental protection bill before voting on its final passage into law."
  },
  {
    word: "billion",
    explanation: "The cardinal number equal to one thousand million (1,000,000,000), widely utilized in global economics, astronomy, and demographic statistics.",
    usage: "1. Earth is currently home to over eight billion human inhabitants residing across diverse cultures.\n2. The aerospace mission required an estimated five billion dollars in development funding."
  },
  {
    word: "bind",
    explanation: "To tie, fasten, or secure tightly with a cord, band, or chain, or to obligate legally, morally, or emotionally through an agreement or oath.",
    usage: "1. Bookbinders use needle, thread, and strong glue to bind individual printed signatures into a sturdy volume.\n2. The legal contract will legally bind both signing parties to fulfill their contractual responsibilities."
  },
  {
    word: "biography",
    explanation: "A detailed written account or narrative chronicling the life, achievements, character, and legacy of an individual person, composed by an outside author.",
    usage: "1. The historian published an acclaimed biography exploring the scientific genius of Marie Curie.\n2. Reading an honest biography offers profound insights into how great thinkers overcame early failures."
  },
  {
    word: "biology",
    explanation: "The natural science dedicated to the systematic study of living organisms, including their cellular structure, physiology, genetics, evolution, and ecological interactions.",
    usage: "1. Students in molecular biology laboratories examine how cellular enzymes regulate metabolic pathways.\n2. Evolutionary biology demonstrates how species gradually adapt to shifting environmental pressures over epochs."
  },
  {
    word: "bird",
    explanation: "A warm-blooded, egg-laying vertebrate animal belonging to the class Aves, characterized by feathers, beaked jaws, a high metabolic rate, and forelimbs modified into wings.",
    usage: "1. An eagle is a majestic bird of prey possessing keen eyesight capable of spotting fish from high aloft.\n2. Flocks of migratory songbirds journey thousands of miles south before harsh winter freezes arrive."
  },
  {
    word: "birth",
    explanation: "The emergence and emergence of a baby or young from the body of its mother, marking the commencement of an individual's independent biological existence.",
    usage: "1. The hospital maternity ward celebrated the safe, healthy birth of twin girls early this morning.\n2. The discovery of the transistor heralded the birth of the modern digital computer age."
  },
  {
    word: "birthday",
    explanation: "The anniversary of the date on which a person was born, traditionally celebrated with social gatherings, gifts, cards, and festive cake.",
    usage: "1. Friends secretly planned a surprise party to celebrate her thirtieth birthday.\n2. He blew out all the candles on his birthday cake while making a silent wish for the year ahead."
  },
  {
    word: "biscuit",
    explanation: "A small baked flour-based confection; in North America, a warm flaky quick bread, while in British English, a crisp sweet cookie or cracker.",
    usage: "1. She served warm flaky buttermilk biscuits straight from the oven topped with strawberry jam.\n2. Traditional afternoon tea in Britain is accompanied by crisp butter biscuits."
  },
  {
    word: "bishop",
    explanation: "A senior consecrated member of the Christian clergy entrusted with pastoral oversight and administrative governance of a diocese or regional ecclesiastical jurisdiction.",
    usage: "1. The regional bishop presided over the solemn ordination ceremony at the historic cathedral.\n2. In the game of chess, each player begins with two bishops that move diagonally across the board."
  },
  {
    word: "bit",
    explanation: "A small piece or portion of something; in computing, the foundational unit of digital information representing a binary choice between 0 and 1.",
    usage: "1. The carpenter swept up a bit of sawdust left behind after planing the oak board.\n2. Digital computers store and process every instruction as sequences of binary bits."
  },
  {
    word: "bite",
    explanation: "To seize, cut, or pierce into with the teeth, or the wound or puncture caused by doing so; or metaphorically, a sharp stinging sensation.",
    usage: "1. He took a crisp, juicy bite out of the red apple, enjoying its sweet flavor.\n2. The bitter winter wind had a fierce bite that made our cheeks turn bright red."
  },
  {
    word: "bitter",
    explanation: "Having a sharp, pungent taste like that of black coffee or citrus peel, or feeling deep resentment, disillusionment, or cold severity.",
    usage: "1. Dark chocolate with high cacao percentages has a distinctly bitter yet sophisticated flavor profile.\n2. After years of perceived unfairness, he struggled not to harbor bitter feelings toward his former employer."
  },
  {
    word: "bizarre",
    explanation: "Strikingly unconventional, odd, or out of the ordinary in appearance, style, or character; startlingly eccentric or whimsical.",
    usage: "1. The surrealist painting featured bizarre landscapes where clocks appeared to melt over tree branches.\n2. We experienced a bizarre series of coincidences that unexpectedly reunited us with long-lost classmates."
  },
  {
    word: "black",
    explanation: "The darkest color achievable, resulting from the complete absence or total absorption of visible light; of the achromatic hue opposite to white.",
    usage: "1. The night sky was pitch black except for the brilliant, twinkling light of countless distant stars.\n2. She wore a tailored black blazer that looked sleek, elegant, and professional."
  },
  {
    word: "blade",
    explanation: "The flat, sharp-edged cutting part of a knife, sword, tool, or weapon; or the broad, flat leaf of grass or cereals; or a rotating propeller vane.",
    usage: "1. The chef used a whetstone to sharpen the stainless steel blade of his Japanese santoku knife.\n2. Gentle wind turbines turn huge aerodynamic blades to generate clean electricity for the power grid."
  },
  {
    word: "blame",
    explanation: "To assign responsibility or fault for a mistake, wrongdoing, failure, or unfortunate circumstance to a specific person or cause.",
    usage: "1. Rather than seeking someone to blame for the setback, the team focused constructively on solving the issue.\n2. Economists blame unexpected supply chain disruptions for recent inflationary pressures."
  },
  {
    word: "blank",
    explanation: "Free from writing, markings, or content; bare, unrecorded, or lacking expression or awareness.",
    usage: "1. She stared thoughtfully at the blank sheet of paper before drafting the first stanza of her poem.\n2. When asked the surprise trivia question, his mind went completely blank for several seconds."
  },
  {
    word: "blanket",
    explanation: "A large piece of thick, woven woolen or synthetic fabric used as a warm bed covering, or a dense continuous layer covering a surface.",
    usage: "1. She wrapped a warm fleece blanket around her shoulders as she sat reading beside the fireplace.\n2. A thick, silent blanket of fresh white snow covered the rooftops of the sleeping village."
  },
  {
    word: "blast",
    explanation: "A violent, sudden gust of wind, or a destructive explosion produced by dynamite, gunpowder, or high pressure; or an enjoyable lively experience.",
    usage: "1. The controlled quarry blast shattered the granite outcrop into manageable rubble for construction.\n2. The students had an absolute blast working together on their robotics science project."
  },
  {
    word: "blaze",
    explanation: "A fiercely burning, intense fire or bright flame; or an outburst of brilliant radiant light, color, or strong passion.",
    usage: "1. Brave firefighters worked through the night to contain the raging blaze in the industrial warehouse.\n2. The autumn hillside erupted in a vibrant blaze of fiery red and golden foliage."
  },
  {
    word: "bleed",
    explanation: "To lose blood from the circulatory system through an open wound or vascular rupture; or to seep or diffuse slowly into an adjacent medium.",
    usage: "1. The medic applied direct pressure to the scrape to ensure it would not bleed heavily.\n2. Watercolors can bleed gently into wet paper, producing soft, ethereal atmospheric effects."
  },
  {
    word: "blend",
    explanation: "To mix or combine two or more substances, qualities, or ingredients smoothly so that the individual parts become indistinguishable or harmoniously unified.",
    usage: "1. The coffee roaster created a balanced blend of Ethiopian and Colombian beans with chocolate notes.\n2. Camouflaged animals blend seamlessly into their natural habitat to elude sharp-eyed predators."
  },
  {
    word: "bless",
    explanation: "To invoke divine favor, grace, or protection upon someone or something; or to confer happiness, good fortune, or prosperity upon.",
    usage: "1. The minister raised his hands to bless the newly married couple as family members smiled warmly.\n2. The tranquil valley was blessed with fertile agricultural soil and an abundance of pure fresh spring water."
  },
  {
    word: "blind",
    explanation: "Lacking the sense of sight; sightless, visually impaired, or unable or unwilling to perceive, acknowledge, or discern truth.",
    usage: "1. Guide dogs are specially trained to assist blind individuals in navigating busy urban streets safely.\n2. Blind optimism without objective risk assessment can lead entrepreneurs into unnecessary financial pitfalls."
  },
  {
    word: "blink",
    explanation: "To open and close the eyes involuntarily or deliberately in a rapid motion, or of a light, to flash intermittently on and off.",
    usage: "1. When stepping out from a dark cinema into bright afternoon sun, you naturally blink repeatedly.\n2. The small red indicator light on the recording camera began to blink steadily."
  },
  {
    word: "bliss",
    explanation: "Supreme, serene happiness; utter joy, spiritual contentment, or an ecstatic state of serene delight and peaceful fulfillment.",
    usage: "1. Relaxing in a warm lavender bath after completing a grueling marathon was sheer physical bliss.\n2. The couple described their quiet honeymoon cabin in the pine mountains as absolute domestic bliss."
  },
  {
    word: "blizzard",
    explanation: "A severe winter snowstorm characterized by powerful winds exceeding 35 miles per hour, intense snowfall, and drastically reduced visibility lasting for hours.",
    usage: "1. The fierce arctic blizzard dumped two feet of snow across the state, prompting highway closures.\n2. Residents remained safely inside by their woodstoves while the blizzard howled outside against the shutters."
  },
  {
    word: "block",
    explanation: "A solid rectangular piece of hard material like stone, wood, or concrete; or an urban quadrangle bounded by streets; or to obstruct passage.",
    usage: "1. Ancient masons cut monumental limestone blocks to construct the great pyramid walls.\n2. A fallen tree trunk threatened to block traffic along the narrow winding mountain road."
  },
  {
    word: "blood",
    explanation: "The vital red fluid circulated through the vascular system of humans and vertebrate animals, supplying oxygen and nutrients to tissues and carrying metabolic waste products away.",
    usage: "1. Red blood cells contain iron-rich hemoglobin molecules that transport oxygen from lungs to muscles.\n2. Regular cardiovascular exercise improves systemic blood circulation and maintains healthy arterial elasticity."
  },
  {
    word: "bloom",
    explanation: "The flower or floral blossom of a plant, or the state or period of flowering and greatest vigor, beauty, and flourishing development.",
    usage: "1. The cherry blossom trees along the river erupted into spectacular pink bloom in late April.\n2. Her creative talent burst into full bloom after she enrolled in the specialized fine arts academy."
  },
  {
    word: "blossom",
    explanation: "A flower, especially one produced by a fruit-bearing tree or shrub, or to develop into something admirable, promising, and mature.",
    usage: "1. Fragrant white apple blossoms filled the orchard, attracting hundreds of pollinating bees.\n2. With patience and encouragement, the shy student began to blossom into a confident public speaker."
  },
  {
    word: "blow",
    explanation: "To move with velocity, as current of air or wind; to expel a stream of air from the mouth; or a hard strike delivered with a fist or weapon.",
    usage: "1. A crisp autumn wind began to blow through the treetops, scattering crimson leaves across the grass.\n2. He leaned forward to blow out the flickering candle before retiring to sleep for the night."
  },
  {
    word: "blue",
    explanation: "The primary color perceived when viewing light with wavelengths between approximately 450 and 495 nanometers, resembling the clear daylight sky or deep sea.",
    usage: "1. The tranquil Mediterranean sea sparkled with a breathtaking sapphire blue hue in the midday sun.\n2. He selected a handsome navy blue suit for his formal diplomatic appointment."
  },
  {
    word: "blueprint",
    explanation: "A detailed technical drawing or architectural design plan printed on light-sensitive paper, or metaphorically, a comprehensive strategic guide for any complex project.",
    usage: "1. Architects unrolled the master blueprint on the drafting table to explain the building's structural framework.\n2. The scientific conference established a clear policy blueprint for international carbon reduction goals."
  },
  {
    word: "board",
    explanation: "A long, thin, flat piece of sawn timber or rigid material; a governing committee or council; or to embark onto a ship, train, or aircraft.",
    usage: "1. The carpenter sawed a sturdy cedar board to reinforce the garden flower box.\n2. Passengers began to board the high-speed electric train ten minutes prior to scheduled departure."
  },
  {
    word: "boat",
    explanation: "A small to medium-sized watercraft propelled by oars, sails, or engines, designed for navigating rivers, lakes, canals, or coastal seas.",
    usage: "1. They rented a wooden row boat to fish quietly across the calm misty waters of the lake.\n2. The fishing boat returned to the harbor at dusk with nets full of fresh silver mackerel."
  },
  {
    word: "body",
    explanation: "The entire physical structure and material substance of a human, animal, or organism; or the main central mass of a vehicle, text, or liquid.",
    usage: "1. Proper nutrition, restorative sleep, and regular exercise work together to keep the human body strong.\n2. The main body of the research essay presented empirical evidence supporting the proposed hypothesis."
  },
  {
    word: "boil",
    explanation: "To heat a liquid until it reaches its boiling temperature and bubbles rapidly vaporize into steam; or to experience intense internal agitation or anger.",
    usage: "1. Place the kettle on the stove and wait for the water to boil before pouring it over the loose tea leaves.\n2. He could feel his frustration begin to boil when the delayed flight was postponed for a third time."
  },
  {
    word: "bold",
    explanation: "Showing a willingness to take risks; courageous, daring, confident, or strikingly prominent and vivid in appearance.",
    usage: "1. The young entrepreneur made a bold decision to launch her innovative renewable energy startup.\n2. She painted the entryway wall with a bold shade of vibrant terracotta to add welcoming warmth."
  },
  {
    word: "bolt",
    explanation: "A threaded metal rod or pin used with a nut to fasten parts together; or a sliding bar securing a door; or a sudden lightning discharge.",
    usage: "1. The mechanic tightened each steel lug bolt securely using a calibrated torque wrench.\n2. A dazzling bolt of lightning ripped across the dark thunderclouds, lighting the valley below."
  },
  {
    word: "bomb",
    explanation: "An explosive explosive device engineered to detonate with destructive force, or an unexpected catastrophic failure in commercial performance.",
    usage: "1. Military historians analyzed the strategic impact of aerial bomb strikes during the Pacific campaign.\n2. Despite lavish promotional advertising, the poorly reviewed film turned out to be a box office bomb."
  },
  {
    word: "bond",
    explanation: "A physical or chemical force binding things together, a strong emotional connection uniting people, or a formal financial debt instrument.",
    usage: "1. Sharing hardships during their Arctic expedition forged an unbreakable lifelong bond between the teammates.\n2. Covalent chemical bonds form when neighboring atoms share pairs of valence electrons."
  },
  {
    word: "bone",
    explanation: "A rigid, dense organ that forms the internal skeleton of vertebrates, composed primarily of calcium phosphate and collagen to provide structure and protect organs.",
    usage: "1. Calcium and vitamin D are essential dietary nutrients required to maintain strong bone density.\n2. The femur is the longest, strongest, and most resilient bone in the human skeletal anatomy."
  },
  {
    word: "bonus",
    explanation: "An extra payment, reward, or consideration given in addition to what is normally expected or contracted; a pleasant unexpected surplus benefit.",
    usage: "1. Employees received a generous annual performance bonus following a highly profitable quarter.\n2. The hotel room's private terrace overlooking the gardens was a delightful unexpected bonus."
  },
  {
    word: "book",
    explanation: "A bound written or printed work consisting of pages between protective covers, or an electronic equivalent, recording information, literature, or narrative knowledge.",
    usage: "1. She sat in the window nook with an engrossing history book and a warm cup of herbal tea.\n2. Gutenberg's printing press democratized literacy by allowing books to be produced affordably."
  },
  {
    word: "boom",
    explanation: "A deep, resonant sound like that of thunder or an explosion; or a period of rapid economic growth, expansion, and flourishing prosperity.",
    usage: "1. We heard the distant boom of ocean surf crashing violently against the rocky headland.\n2. The tech sector experienced a phenomenal economic boom that attracted thousands of ambitious software engineers."
  },
  {
    word: "boost",
    explanation: "To push up from below, amplify, or increase the power, value, confidence, or performance of something significantly.",
    usage: "1. Adding fresh citrus fruits and leafy greens to your diet helps boost your body's immune defenses.\n2. The marketing campaign helped boost online sales by over forty percent within the first quarter."
  },
  {
    word: "boot",
    explanation: "A sturdy type of footwear that covers the foot, ankle, and often part of the lower leg; or to start up a computer operating system.",
    usage: "1. He laced up his waterproof hiking boots before setting out along the rugged alpine trail.\n2. It takes only a few seconds for the new solid-state drive to boot the computer operating system."
  },
  {
    word: "border",
    explanation: "The outer boundary line separating two geographical jurisdictions, countries, or regions; or a decorative decorative edge surrounding an area.",
    usage: "1. Travelers presented their passports at the international border checkpoint before entering the country.\n2. Colorful perennial flowers formed a vibrant decorative border along the gravel garden pathway."
  },
  {
    word: "bore",
    explanation: "To make a hole in solid material with a drill or rotary tool, or to cause someone to feel weary and restless through lack of interest or dullness.",
    usage: "1. The carpenter used a sharp auger bit to bore a clean hole through the thick timber beam.\n2. The speaker's monotonous delivery threatened to bore the audience despite the intriguing topic."
  },
  {
    word: "boredom",
    explanation: "The state of feeling weary, restless, and dissatisfied due to lack of interest, stimulation, or meaningful engagement with one's surroundings.",
    usage: "1. To stave off long-flight boredom, she brought a sketchbook, two novels, and several puzzle magazines.\n2. Creative thinkers often discover that moments of quiet boredom spark their most original ideas."
  },
  {
    word: "born",
    explanation: "Brought into biological life by birth; possessing from birth natural talent, inclination, or destiny for a specific pursuit.",
    usage: "1. She was born in a picturesque coastal town in northern Maine during the crisp autumn of 1995.\n2. With his natural charisma and quick empathy, he seemed born to be a diplomat and community leader."
  },
  {
    word: "borrow",
    explanation: "To take and use something belonging to someone else with the intention and promise of returning it after a period of time.",
    usage: "1. You can borrow up to ten books from the university library using your student identification card.\n2. He asked to borrow a torque wrench from his neighbor to fix his bicycle pedal."
  },
  {
    word: "boss",
    explanation: "A person in charge of a worker or organization; an employer, supervisor, or manager exercising executive authority over tasks.",
    usage: "1. Her boss appreciated her initiative and proactive approach to resolving complicated client concerns.\n2. An effective boss acts as an empowering mentor who inspires employees rather than merely issuing commands."
  },
  {
    word: "botany",
    explanation: "The scientific branch of biology focused on the structure, physiology, genetics, ecology, distribution, and classification of plants, algae, and fungi.",
    usage: "1. In her advanced botany seminar, students classified rare alpine flora collected in the Rocky Mountains.\n2. The history of botany has deepened humanity's understanding of agriculture, forestry, and medicinal herbs."
  },
  {
    word: "both",
    explanation: "The two together; used to refer to two things, persons, or considerations simultaneously without excluding either.",
    usage: "1. Both sisters shared a deep artistic passion for classical piano and oil landscape painting.\n2. The proposed solution is both economically viable and environmentally responsible."
  },
  {
    word: "bother",
    explanation: "To take the trouble to do something; or to cause irritation, annoyance, disturbance, or inconvenience to someone.",
    usage: "1. Please do not bother yourself with washing the dishes tonight; I will happily handle them.\n2. The constant hum of the faulty air conditioner began to bother the office staff during the meeting."
  },
  {
    word: "bottle",
    explanation: "A rigid or semi-rigid container with a narrow neck, typically made of glass or molded plastic, used for storing and dispensing liquids.",
    usage: "1. She refilled her stainless steel water bottle at the gym fountain before beginning her workout.\n2. The waiter uncorked a bottle of fine sparkling cider to accompany the celebratory dinner."
  },
  {
    word: "bottom",
    explanation: "The lowest part, base, or underside of something; the deepest or foundational level of a container, body of water, or hierarchy.",
    usage: "1. Colorful tropical corals and sea urchins thrive along the sandy bottom of the shallow reef.\n2. He stirred the pot thoroughly to ensure the thick sauce did not stick to the bottom."
  },
  {
    word: "bounce",
    explanation: "To rebound or spring back off a surface after striking it with force; or to move with lively, buoyant energy and enthusiasm.",
    usage: "1. The tennis ball had exceptional bounce on the hard synthetic court, challenging the receiver's timing.\n2. She walked into the room with an infectious bounce in her step after hearing the wonderful news."
  },
  {
    word: "boundary",
    explanation: "A real or imaginary line marking the limit or perimeter of an area, territory, subject, or acceptable personal standard of behavior.",
    usage: "1. The ancient stone wall marks the eastern boundary between the farm's pastures and the state forest.\n2. Setting healthy professional boundaries prevents burnout and maintains personal well-being."
  },
  {
    word: "bouquet",
    explanation: "An artistically arranged bunch of gathered flowers, or the distinctive complex aroma given off by a vintage wine or perfume.",
    usage: "1. The bride held an exquisite bouquet of white gardenias, pastel roses, and eucalyptus sprigs.\n2. The sommelier inhaled deeply to appreciate the floral, fruity bouquet of the aged Pinot Noir."
  },
  {
    word: "bow",
    explanation: "To bend the head, neck, or body forward in a gesture of respect, greeting, or submission; or a weapon used for shooting arrows; or the forward end of a ship.",
    usage: "1. Actors stepped forward to bow gracefully to the audience as enthusiastic applause erupted.\n2. The archer drew the string of his wooden recurve bow with steady, focused concentration."
  },
  {
    word: "bowl",
    explanation: "A round, open container with curved sides, deeper than a plate, used for preparing, holding, or serving soup, cereal, salad, or liquids.",
    usage: "1. He poured hot, fragrant chicken noodle soup into a wide ceramic bowl for the patient.\n2. A large wooden bowl filled with fresh green apples stood at the center of the kitchen island."
  },
  {
    word: "box",
    explanation: "A rigid container, typically rectangular, with flat sides and a lid or flaps, made of cardboard, wood, or metal for storing or packing items.",
    usage: "1. Movers loaded the heavy cardboard box filled with encyclopedias onto the transport truck.\n2. She received a beautifully wrapped gift box tied with a satin ribbon on her graduation day."
  },
  {
    word: "boy",
    explanation: "A male child or adolescent from infancy until reaching manhood; a young male human.",
    usage: "1. The energetic boy raced his new bicycle down the suburban driveway, laughing with delight.\n2. The mentor guided the young boy in developing sportsmanship, integrity, and academic discipline."
  },
  {
    word: "boycott",
    explanation: "A collective, organized refusal to buy, use, or participate in products, services, or events as an act of nonviolent protest or political pressure.",
    usage: "1. Consumers initiated a national boycott against the company to protest its poor labor conditions.\n2. The historic Montgomery bus boycott was a turning point in the American civil rights movement."
  },
  {
    word: "brain",
    explanation: "The central organ of the nervous system situated within the skull, responsible for coordinating sensory perceptions, thoughts, emotions, memory, motor controls, and consciousness.",
    usage: "1. The human brain contains approximately 86 billion interconnected neurons communicating via synapses.\n2. Neuroscientists study how the brain reorganizes synaptic connections through neuroplasticity."
  },
  {
    word: "brake",
    explanation: "A mechanical device used for slowing, halting, or preventing the motion of a vehicle, machine, or wheel by applying friction.",
    usage: "1. The driver depressed the foot brake firmly to avoid colliding with a deer crossing the road.\n2. Bicycle mechanics inspect brake pads regularly to ensure responsive, reliable stopping power."
  },
  {
    word: "branch",
    explanation: "A woody division extending outward from the trunk or bough of a tree; or a secondary division of an organization, bank, or discipline.",
    usage: "1. A robin perched singing on a flowering branch of the old apple tree in the garden.\n2. The multinational company established a new research and development branch in Munich."
  },
  {
    word: "brand",
    explanation: "A distinctive name, term, design, or symbol that identifies and differentiates a manufacturer's goods or services in the marketplace; a recognized identity.",
    usage: "1. Building an authentic corporate brand requires consistent quality, ethical values, and customer trust.\n2. The apparel brand became famous for using exclusively organic cotton and fair-trade practices."
  },
  {
    word: "brass",
    explanation: "A malleable, durable alloy of copper and zinc, possessing a bright golden appearance and widely utilized in musical wind instruments, plumbing fixtures, and decorative hardware.",
    usage: "1. Musicians polished their brass trumpets and trombones before the university jazz concert.\n2. The vintage front door featured a heavy, gleaming brass knocker shaped like a roaring lion."
  },
  {
    word: "brave",
    explanation: "Possessing or exhibiting mental or moral courage in the presence of danger, fear, difficulty, or pain; valiant and resolute.",
    usage: "1. The brave firefighter entered the smoke-filled building to rescue a stranded domestic pet.\n2. It takes a brave individual to admit a costly mistake honestly and work to rectify the harm."
  },
  {
    word: "bravery",
    explanation: "The quality or state of having courage, fortitude, and daring in confronting hazardous, painful, or daunting circumstances.",
    usage: "1. The soldier received a medal of honor for extraordinary bravery demonstrated in battle.\n2. True moral bravery involves speaking up for justice even when doing so is unpopular."
  },
  {
    word: "bread",
    explanation: "A staple food prepared by baking a dough of flour, water, and usually yeast or other leavening agents, consumed across almost all human cultures for millennia.",
    usage: "1. The aroma of freshly baked crusty artisan bread filled the bakery early in the morning.\n2. She made a wholesome sandwich using two thick slices of seeded whole-wheat bread."
  },
  {
    word: "break",
    explanation: "To separate into pieces as a result of a blow, shock, or strain; to fracture; or to pause work or activity for rest.",
    usage: "1. Be careful when handling the fine porcelain teacup so it does not accidentally fall and break.\n2. Let us take a fifteen-minute coffee break to stretch before continuing the technical workshop."
  },
  {
    word: "breakfast",
    explanation: "The first meal of the day eaten in the morning, which literally breaks the overnight fasting period.",
    usage: "1. A nutritious breakfast consisting of eggs, whole oats, and fresh fruit fuels a productive morning.\n2. They enjoyed a leisurely Sunday breakfast together on the sunny garden patio."
  },
  {
    word: "breakthrough",
    explanation: "A sudden, dramatic, and significant advance or discovery, especially in scientific research, technology, or negotiation, overcoming major obstacles.",
    usage: "1. Researchers announced a historic scientific breakthrough in solar cell efficiency and storage.\n2. Diplomatic mediators achieved a crucial breakthrough after three days of nonstop talks."
  },
  {
    word: "breath",
    explanation: "The air inhaled into and exhaled from the lungs during respiration; or a slight, gentle movement of air.",
    usage: "1. Take a slow, deep breath to center your focus and calm your nerves before the speech.\n2. On the frosty winter morning, his warm breath condensed into misty white clouds."
  },
  {
    word: "breathe",
    explanation: "To draw air into the lungs for respiration and expel it; or to rest and pause freely after intense activity.",
    usage: "1. Meditation teaches practitioners to breathe mindfully, noticing each inhalation and exhalation.\n2. Now that the demanding project deadline has passed, our team can finally take a moment to breathe."
  },
  {
    word: "breed",
    explanation: "A specific domesticated strain or variety of animal possessing distinctive appearance and behavior developed through selective breeding; or to produce offspring.",
    usage: "1. The border collie is an exceptionally intelligent dog breed bred originally for herding sheep.\n2. Biologists observed how migratory sea turtles return to their natal beaches to breed."
  },
  {
    word: "breeze",
    explanation: "A gentle, light, refreshing wind that stirs foliage and cools warm outdoor temperatures.",
    usage: "1. A cool ocean breeze blew through the open cottage windows on the humid summer evening.\n2. The gossamer curtains fluttered softly in the pleasant afternoon mountain breeze."
  },
  {
    word: "brick",
    explanation: "A rectangular block of baked or sun-dried clay and shale used extensively as a durable structural building material in masonry construction.",
    usage: "1. The historic municipal hall was constructed from weathered red bricks over a century ago.\n2. Masons carefully laid row upon row of mortar and brick to erect the garden privacy wall."
  },
  {
    word: "bride",
    explanation: "A woman who is about to be married or has recently celebrated her marriage ceremony.",
    usage: "1. The radiant bride walked down the aisle surrounded by smiling family members and friends.\n2. Guests toasted the happy bride and groom during the evening wedding banquet."
  },
  {
    word: "bridge",
    explanation: "A structure built to span a physical obstacle, such as a river, chasm, or road, without blocking the way underneath; or a connection linking two concepts.",
    usage: "1. Suspension cables supported the majestic steel bridge across the wide shipping channel.\n2. Cultural exchange programs serve as an enduring bridge fostering goodwill between diverse nations."
  },
  {
    word: "brief",
    explanation: "Lasting for only a short duration; concise and succinct in expression, containing few words.",
    usage: "1. The CEO delivered a brief introductory speech welcoming international delegates to the conference.\n2. After a brief pause to review his notes, the presenter continued with the financial projections."
  },
  {
    word: "bright",
    explanation: "Emitting, reflecting, or filled with light; vivid in color; or possessing quick, sharp intelligence and mental agility.",
    usage: "1. The midday sun was so intensely bright that everyone wore polarized sunglasses outside.\n2. She was known as a bright, curious student who eagerly asked penetrating questions in physics."
  },
  {
    word: "brilliant",
    explanation: "Exceptionally clever, talented, or impressive; or glittering with dazzling, intense radiant light.",
    usage: "1. The mathematician devised a brilliant, elegant proof that resolved the decades-old problem.\n2. The polished diamond ring sparkled with brilliant multi-faceted reflections in the showcase."
  },
  {
    word: "brim",
    explanation: "The upper edge or rim of a cup, bowl, or other hollow container; or the projecting edge of a hat.",
    usage: "1. She filled the glass mug to the brim with hot spiced cider, being careful not to spill a drop.\n2. He tilted the wide brim of his fedora hat forward to shield his eyes from the afternoon glare."
  },
  {
    word: "bring",
    explanation: "To take or carry someone or something with you to a place or destination; or to cause a particular outcome or state to happen.",
    usage: "1. Please remember to bring your notebook and laptop to tomorrow morning's planning session.\n2. Technological advancements often bring profound improvements in everyday standards of living."
  },
  {
    word: "brisk",
    explanation: "Active, energetic, and quick in pace; or of weather, pleasantly cold, fresh, and invigorating.",
    usage: "1. They took a brisk morning walk through the park to awaken their bodies before heading to work.\n2. The autumn air was crisp and brisk, signaling that winter would soon arrive in the valley."
  },
  {
    word: "broad",
    explanation: "Having a large distance from side to side; wide in physical extent, scope, or variety.",
    usage: "1. The city avenue was broad enough to accommodate wide tree-lined sidewalks and bicycle lanes.\n2. Her liberal arts education provided her with a broad foundational understanding of history and ethics."
  },
  {
    word: "broadcast",
    explanation: "To transmit programs, signals, or messages over radio, television, or the internet to a wide dispersed public audience.",
    usage: "1. The national network will broadcast the presidential debate live across multiple channels tonight.\n2. Podcasts have made it possible for independent creators to broadcast insightful stories worldwide."
  },
  {
    word: "bronze",
    explanation: "A yellowish-brown alloy of copper and tin, prized since antiquity for casting sculptures, tools, and Olympic third-place medals.",
    usage: "1. The town square featured a monumental bronze statue commemorating local civil rights pioneers.\n2. The swimmer proudly stood on the podium to receive her Olympic bronze medal."
  },
  {
    word: "brook",
    explanation: "A small, natural stream of clear running water, often flowing through meadows or woodlands.",
    usage: "1. Wild trout darted through the pebbles of the shallow babbling brook behind the cabin.\n2. They sat beside the gentle brook, listening to the soothing sound of water cascading over stones."
  },
  {
    word: "brother",
    explanation: "A male who has one or both parents in common with another; a male sibling; or a close male comrade sharing common bonds.",
    usage: "1. Her older brother helped her move her furniture into her first college apartment.\n2. Firefighters shared an unbreakable bond of mutual trust, treating each teammate as a brother."
  },
  {
    word: "brown",
    explanation: "A warm, composite color produced by mixing red, yellow, and black; the natural color of earth, wood, and dry leaves.",
    usage: "1. The puppy had soft, glossy brown fur and floppy ears that bounced as he ran across the yard.\n2. Dark brown polished mahogany tables graced the historic library reading room."
  },
  {
    word: "brush",
    explanation: "An implement with bristles, hair, or wire set into a handle, used for cleaning, painting, or grooming; or dense undergrowth of bushes.",
    usage: "1. The watercolor artist cleaned her fine camelhair brush thoroughly before switching to crimson paint.\n2. Quail darted into the thick dry brush along the edge of the field to hide from hawks."
  },
  {
    word: "bubble",
    explanation: "A thin sphere of liquid enclosing air or gas; or a temporary economic state where asset prices inflate far beyond intrinsic value.",
    usage: "1. Children laughed with glee as soapy, iridescent bubbles floated gently across the sunny lawn.\n2. Economists warned that speculative real estate valuations resembled an unsustainable market bubble."
  },
  {
    word: "bucket",
    explanation: "A cylindrical open-topped container with a handle, used for carrying, holding, or measuring liquids and loose materials.",
    usage: "1. He filled a metal bucket with sudsy warm water and a sponge to wash the family car.\n2. Children built towers on the beach by packing wet sand tightly into their plastic toy buckets."
  },
  {
    word: "budget",
    explanation: "An itemized financial plan allocating anticipated income and expenditures for a person, family, business, or government over a specified period.",
    usage: "1. Creating a realistic household budget helps families save money and avoid unnecessary debt.\n2. The city council approved an expanded municipal budget dedicated to public park restorations."
  },
  {
    word: "buffalo",
    explanation: "A large, heavily built wild ox of the genus Bubalus or Syncerus, or in North America, the iconic American bison.",
    usage: "1. A magnificent herd of wild buffalo grazed peacefully across the vast golden plains of Yellowstone.\n2. Water buffalo have served as indispensable agricultural work animals in Asian rice paddies for centuries."
  },
  {
    word: "bug",
    explanation: "A small insect or creeping arthropod; or in computer engineering, an unexpected flaw, glitch, or error in software code.",
    usage: "1. The software engineer stayed up late debugging the codebase to fix a critical login bug.\n2. A tiny colorful ladybug crawled slowly across the green rose leaf in the garden."
  },
  {
    word: "build",
    explanation: "To construct something by putting parts or materials together systematically; or to develop or increase something over time.",
    usage: "1. Architects and carpenters worked collaboratively to build an eco-friendly modern timber house.\n2. Regular reading and vocabulary study will steadily build your language comprehension skills."
  },
  {
    word: "builder",
    explanation: "A person or commercial enterprise whose trade or business is the physical construction and assembly of houses, buildings, and infrastructure.",
    usage: "1. The master builder ensured that all framing complied strictly with seismic safety codes.\n2. Community builders worked with local volunteers to erect a new playground for the neighborhood."
  },
  {
    word: "building",
    explanation: "A permanent or semi-permanent structure with a roof and walls, such as a house, factory, or office, built for human shelter or activity.",
    usage: "1. The historic municipal building was recognized for its magnificent neoclassical architecture.\n2. Modern commercial buildings integrate solar panels and smart climate controls to minimize energy consumption."
  },
  {
    word: "bulb",
    explanation: "A rounded underground plant storage organ, such as an onion or tulip; or a glass housing containing a filament or LED producing light.",
    usage: "1. In late autumn, gardeners plant daffodil bulbs beneath the soil so they can blossom in early spring.\n2. Replacing traditional incandescent bulbs with energy-efficient LED bulbs saves substantial electricity."
  },
  {
    word: "bull",
    explanation: "An uncastrated adult male bovine animal, noted for its muscular strength; or in finance, an investor who anticipates rising market prices.",
    usage: "1. The massive black bull grazed assertively in the pasture, guarding the herd with a watchful eye.\n2. Financial commentators noted that optimistic bulls dominated trading after the positive earnings report."
  },
  {
    word: "bullet",
    explanation: "A small metal projectile fired from a firearm, typically propelled by expanding gases released by burning gunpowder.",
    usage: "1. Ballistics experts examined the recovered bullet under a comparison microscope to identify toolmarks.\n2. High-speed cameras captured the moment the aerodynamic bullet shattered the ceramic target."
  },
  {
    word: "bunch",
    explanation: "A number of things of the same kind growing or fastened together, such as bananas or keys; or an informal group of people.",
    usage: "1. She purchased a fresh bunch of fragrant purple lavender from the weekend farmers' market.\n2. A cheerful bunch of university students gathered at the cafe to study for their upcoming exams."
  },
  {
    word: "bundle",
    explanation: "A collection of items tied or wrapped securely together for carrying or storage; or a package of services sold collectively.",
    usage: "1. The hiker carried a bundle of dry firewood back to the campsite before night fell.\n2. The telecom provider offered a discounted monthly bundle combining high-speed internet and mobile service."
  },
  {
    word: "burden",
    explanation: "A heavy load that is carried physically; or a demanding duty, emotional worry, or financial responsibility that causes hardship.",
    usage: "1. The pack mule carried the heavy supply burden stoically up the steep rocky trail.\n2. Transparent, supportive leadership helps distribute tasks so no single team member bears an unfair burden."
  },
  {
    word: "bureau",
    explanation: "An administrative agency, department, or division within a government or business; or a chest of drawers used in bedrooms.",
    usage: "1. The federal investigation bureau coordinated with international agencies to resolve the cybercrime case.\n2. She placed her folded wool sweaters neatly into the top drawer of the antique mahogany bureau."
  },
  {
    word: "burglar",
    explanation: "A person who commits illegal entry into a building, home, or property with the intent to commit theft or felony.",
    usage: "1. The smart alarm system sounded loudly, scaring the burglar away before any property was stolen.\n2. Installing sturdy deadbolts and security lighting helps protect residential homes against burglars."
  },
  {
    word: "burn",
    explanation: "To undergo combustion or consume with fire, producing heat and light; or to suffer an injury from heat, radiation, or chemicals.",
    usage: "1. Dry seasoned oak logs burn cleanly and generate steady, radiant warmth throughout cold winter nights.\n2. Wear high-SPF sunscreen when spending hours at the beach to ensure your skin does not uncomfortably burn."
  },
  {
    word: "burst",
    explanation: "To break open or fly apart suddenly and violently from internal pressure; or to issue forth suddenly with intense emotion.",
    usage: "1. Sub-zero temperatures caused the uninsulated garden water pipe to freeze and suddenly burst.\n2. The audience burst into enthusiastic cheers and applause when the choir finished the final crescendo."
  },
  {
    word: "bury",
    explanation: "To place a deceased body into the earth or tomb; or to conceal something deeply underground or beneath a heavy covering.",
    usage: "1. Family members gathered at the quiet hillside cemetery to bury their beloved patriarch with honor.\n2. Pirates in popular folklore were said to bury heavy iron chests of gold on remote tropical islands."
  },
  {
    word: "bus",
    explanation: "A large motor vehicle designed to transport numerous passengers along scheduled routes, serving as a vital component of municipal public transit.",
    usage: "1. Commuters boarded the electric municipal bus to travel across the city center during morning peak hours.\n2. Taking the public bus reduces urban traffic congestion and lowers carbon emissions compared to personal cars."
  },
  {
    word: "bush",
    explanation: "A low, dense woody shrub or clump of shrubs with stems arising from near the ground; or wild uncultivated country.",
    usage: "1. Red berry bushes framed the stone entryway, providing shelter and food for songbirds throughout winter.\n2. The adventurous safari team explored the remote Australian bush under the guidance of native experts."
  },
  {
    word: "business",
    explanation: "An organization or commercial enterprise engaged in industrial, commercial, or professional activities, or the regular trade and pursuit of livelihood.",
    usage: "1. She founded a small retail business that sells sustainably sourced artisanal home goods.\n2. Good customer service and ethical accounting practices are foundational to long-term business success."
  },
  {
    word: "busy",
    explanation: "Actively engaged in work or activity; having much to do; or characterized by heavy traffic, movement, or commotion.",
    usage: "1. The pediatrician was exceptionally busy all afternoon tending to patients in the clinic.\n2. The bustling city intersection was busy with pedestrians, delivery vans, and taxis at lunchtime."
  },
  {
    word: "butter",
    explanation: "A pale yellow fatty dairy food prepared by churning fresh or fermented cream, widely used as a spread and cooking fat in baking and culinary arts.",
    usage: "1. She spread a generous layer of creamy salted butter across the warm slice of sourdough toast.\n2. French pastry chefs rely on high-fat cultured butter to create light, distinctively flaky croissant layers."
  },
  {
    word: "butterfly",
    explanation: "A winged insect of the order Lepidoptera, characterized by large, often brilliantly colored wings covered with microscopic overlapping scales and a coiled proboscis.",
    usage: "1. A vibrant monarch butterfly fluttered gracefully between blooming milkweed flowers in the sunny garden.\n2. Children watched in wonder as the caterpillar transformed inside its chrysalis to emerge as a butterfly."
  },
  {
    word: "button",
    explanation: "A small disc, knob, or fastener sewn onto garments to secure an opening; or a physical/virtual control pushed to activate an electrical or digital function.",
    usage: "1. He fastened the top button of his dress shirt before knotting his silk tie for the banquet.\n2. Click the blue submit button at the bottom of the online registration page to confirm your enrollment."
  },
  {
    word: "buy",
    explanation: "To acquire the possession, ownership, or use of goods or services in exchange for payment, typically with money.",
    usage: "1. She decided to buy fresh organic vegetables from the local weekend market instead of the supermarket.\n2. Savvy shoppers compare product reviews and prices online before they decide to buy major appliances."
  },
  {
    word: "buyer",
    explanation: "A person or commercial entity that purchases goods or services; a customer or professional purchasing agent for a retailer.",
    usage: "1. The real estate agent represented the prospective home buyer during property price negotiations.\n2. As the fashion buyer for a department store, she travels to Milan to select upcoming clothing lines."
  },
  {
    word: "buzz",
    explanation: "A low, continuous humming or vibrating sound like that produced by bees or machinery; or a state of excitement, anticipation, and widespread talk.",
    usage: "1. We could hear the gentle buzz of bumblebees gathering pollen among the clover blossoms.\n2. The exciting movie trailer generated an enormous media buzz across social platforms months before release."
  },
  {
    word: "bypass",
    explanation: "A road or route that avoids an urban center or congested area; or a surgical procedure redirecting blood flow; or to circumvent an obstruction.",
    usage: "1. Drivers took the highway bypass around the city center to avoid bumper-to-bumper morning rush hour traffic.\n2. The innovative software allows administrators to bypass manual data entry through direct automated synchronization."
  },
  {
    word: "byte",
    explanation: "A foundational unit of digital information in computer systems, traditionally consisting of eight contiguous binary bits, sufficient to encode a single typographical character.",
    usage: "1. In computing architectures, one megabyte is roughly equivalent to one million individual bytes of data.\n2. The text file was remarkably compact, measuring fewer than five hundred bytes on disk."
  }
];

console.log(`=================================================`);
console.log(`   SEEDING 200 HIGH-QUALITY "B" WORDS INTO DB    `);
console.log(`=================================================`);

let inserted = 0;
for (const item of B_WORDS_DATA) {
  const heading = `**${item.word.charAt(0).toUpperCase() + item.word.slice(1)}**`;
  const rawEntry = `${heading}\n\nExplanation:\n${item.explanation}\n\nUsage:\n${item.usage}`;

  insertStmt.run(
    item.word.toLowerCase(),
    heading,
    item.explanation,
    item.usage,
    rawEntry,
    new Date().toISOString()
  );
  inserted++;
}

console.log(`✓ Successfully seeded ${inserted} high-quality B-words into data/my_dictionary.db!`);
