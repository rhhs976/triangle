import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FILES_DIR = path.resolve(__dirname, '../files');
const JSON_PATH = path.join(FILES_DIR, 'historical_events_rag_seed.json');
const DB_PATH = path.join(FILES_DIR, 'historical_events_dictionary.db');

const moreEvents = [
  {
    era: "Classical Antiquity & Ancient Empires",
    id: "colosseum_construction_80",
    title: "Inauguration of the Roman Colosseum",
    year: 80,
    exact_date: "80 AD",
    summary: "In 80 AD, Emperor Titus officially inaugurated the Flavian Amphitheatre, known today worldwide as the Colosseum, with one hundred consecutive days of lavish imperial games, gladiatorial combats, and simulated naval battles in the heart of Rome. Commissioned by Emperor Vespasian on the site of Nero's reviled Golden House palace, the monumental freestanding concrete and travertine amphitheater could accommodate an estimated fifty thousand to eighty thousand spectators sheltered beneath a massive retractable canvas awning known as the velarium. Its four-tiered exterior showcased superimposed Doric, Ionic, and Corinthian classical architectural columns, while an intricate subterranean network of tunnels, cages, and mechanical elevators called the hypogeum operated below the wooden arena floor. Standing for nearly two millennia through earthquakes and stone scavenging, the Colosseum endures as the ultimate architectural symbol of ancient Roman imperial engineering and urban spectacle.",
    keywords: ["Colosseum", "Flavian Amphitheatre", "Titus", "Vespasian", "Gladiators", "Rome", "Architecture", "80 AD"]
  },
  {
    era: "Classical Antiquity & Ancient Empires",
    id: "cai_lun_paper_105",
    title: "Invention of Papermaking by Cai Lun",
    year: 105,
    exact_date: "105 AD",
    summary: "In 105 AD, Chinese court official Cai Lun presented a revolutionary method for manufacturing lightweight, flexible writing paper to Emperor He of the Eastern Han Dynasty. By mashing mulberry tree bark, hemp fishing nets, old rags, and plant fibers into a wet pulp and pressing it through fine wooden screens to dry in the sun, Cai Lun produced a durable writing surface that was far cheaper and more portable than traditional cumbersome bamboo slats or luxurious silk scrolls. The breakthrough dramatically accelerated administrative communication, record-keeping, and the preservation of literary classics across imperial China. Papermaking gradually spread along the Silk Road into the Islamic world following the Battle of Talas in 751, eventually reaching medieval Europe to lay the essential material foundation for the printing revolution and universal literacy.",
    keywords: ["Cai Lun", "Papermaking", "Paper", "Han Dynasty", "China", "Writing Material", "Silk Road", "105 AD"]
  },
  {
    era: "Revolutions, Rights & Modern Transformations",
    id: "boston_tea_party_1773",
    title: "The Boston Tea Party",
    year: 1773,
    exact_date: "16 December 1773",
    summary: "On the chilly night of December 16, 1773, a group of American colonial activists known as the Sons of Liberty, loosely disguised as Native American Mohawk warriors and led by Samuel Adams, boarded three British merchant ships docked in Boston Harbor. Protesting the British Tea Act and the principle of taxation without parliamentary representation, the demonstrators smashed open three hundred and forty-two chests of British East India Company tea and dumped the entire cargo into the ocean waters. The coordinated act of commercial defiance infuriated the British government, which retaliated by passing the punitive Coercive Acts, commonly known in the colonies as the Intolerable Acts, closing Boston Harbor and suspending colonial self-governance in Massachusetts. The confrontation galvanized inter-colonial resistance across North America, prompting the meeting of the First Continental Congress and directly escalating the crisis into the American Revolutionary War.",
    keywords: ["Boston Tea Party", "Sons of Liberty", "Samuel Adams", "Tea Act", "Taxation without representation", "American Revolution", "1773"]
  },
  {
    era: "The 20th Century & The Digital Age",
    id: "sputnik_launch_1957",
    title: "Launch of Sputnik 1 and Beginning of the Space Age",
    year: 1957,
    exact_date: "4 October 1957",
    summary: "On the evening of October 4, 1957, the Soviet Union launched Sputnik 1 from the Baikonur Cosmodrome in Kazakhstan aboard an R-7 intercontinental ballistic rocket, placing humanity's first artificial satellite into low Earth orbit. Weighing eighty-three kilograms and resembling a polished aluminum sphere with four trailing radio whip antennas, the satellite circled the globe once every ninety-six minutes at eighteen thousand miles per hour, transmitting a steady, audible radio beep that was picked up by amateur radio operators and military tracking stations across the planet. The achievement caught the Western world by complete surprise, triggering the Sputnik Crisis in the United States and directly igniting the Cold War Space Race. The event spurred the rapid expansion of American science education funding, the creation of NASA in 1958, and humanity's permanent leap into the modern space era.",
    keywords: ["Sputnik 1", "Sputnik", "Space Age", "Soviet Union", "Space Race", "NASA", "4 October 1957", "Satellite"]
  },
  {
    era: "Revolutions, Rights & Modern Transformations",
    id: "good_friday_agreement_1998",
    title: "Signing of the Good Friday Agreement",
    year: 1998,
    exact_date: "10 April 1998",
    summary: "On April 10, 1998, British Prime Minister Tony Blair, Irish Taoiseach Bertie Ahern, and leaders of the major political parties in Northern Ireland signed the Belfast Agreement, commonly celebrated as the Good Friday Agreement, bringing an end to three decades of sectarian conflict known as the Troubles. Brokered through intense multilateral negotiations chaired by former United States Senator George Mitchell, the historic peace accord established a power-sharing devolved Northern Ireland Assembly and mandatory cross-community executive governance between unionist and nationalist parties. The agreement also mandated the decommissioning of paramilitary weapons, major reform of civil policing, and the constitutional recognition that Northern Ireland remains part of the United Kingdom unless a majority of its citizens vote otherwise in a future border poll. The Good Friday Agreement transformed Northern Ireland from a zone of violent political strife into a framework of peaceful democratic power-sharing and regional stability.",
    keywords: ["Good Friday Agreement", "Belfast Agreement", "Northern Ireland", "The Troubles", "Tony Blair", "Bertie Ahern", "George Mitchell", "Peace Accord"]
  },
  {
    era: "Landmarks of Science & Technological Innovation",
    id: "penicillin_mass_production_1943",
    title: "Mass Production of Penicillin During World War II",
    year: 1943,
    exact_date: "1943 - 1944",
    summary: "Between 1943 and 1944, a collaborative effort among Oxford University scientists Howard Florey and Ernst Chain, American agricultural researchers in Peoria, Illinois, and commercial pharmaceutical manufacturers successfully developed deep-tank aerobic fermentation techniques to mass-produce penicillin. While Alexander Fleming had discovered the antimicrobial mold Penicillium in 1928, it remained a laboratory curiosity because researchers could only isolate microscopic amounts in flat laboratory bottles. By utilizing corn steep liquor as a nutrient broth and cultivating a hyper-productive mold strain discovered on a Peoria market cantaloupe, production exploded from just ounces to billions of doses in time for the Allied D-Day invasion of Normandy in June 1944. Mass-produced penicillin eliminated bacterial wound infections and gangrene among battlefield casualties, fundamentally launching the global commercial pharmaceutical industry and transforming modern clinical medicine.",
    keywords: ["Penicillin", "Mass Production", "Howard Florey", "Ernst Chain", "Alexander Fleming", "World War II", "Antibiotics", "Medicine"]
  }
];

const raw = fs.readFileSync(JSON_PATH, 'utf-8');
const seed = JSON.parse(raw);

for (const ev of moreEvents) {
  let era = seed.historical_eras.find(e => e.era === ev.era);
  if (!era) {
    era = { era: ev.era, events: [] };
    seed.historical_eras.push(era);
  }
  if (!era.events.some(e => e.id === ev.id)) {
    era.events.push(ev);
  }
}

fs.writeFileSync(JSON_PATH, JSON.stringify(seed, null, 4), 'utf-8');

const db = new DatabaseSync(DB_PATH);
const stmt = db.prepare('INSERT OR REPLACE INTO history_dictionary (entity_id, entity_name, exact_date, verified_fact) VALUES (?, ?, ?, ?)');

let count = 0;
for (const era of seed.historical_eras) {
  for (const ev of era.events) {
    stmt.run(ev.id, ev.title, ev.exact_date, ev.summary);
    count++;
  }
}

console.log(`Total Milestone Records now in SQLite and JSON seed: ${count}`);
