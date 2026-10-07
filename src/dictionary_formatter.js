/**
 * Formats Webster's Unabridged Dictionary entries into structured sections:
 * - Primary Definition
 * - Numbered Meanings (1., 2., 3., etc.)
 * - Idioms / Compound Phrases (prefixed by " -- ")
 * - Usage Notes ("Note: ...")
 * - Part of Speech classification
 */

import { classifyWord } from './pos_tagger.js';

export function formatDictionaryEntry(word, rawDefinition) {
  if (!rawDefinition) return null;

  const cleanRaw = rawDefinition.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim();

  // Extract POS from our 147k POS lexicon
  const posRecord = classifyWord(word.toLowerCase());
  const posName = posRecord ? posRecord.pos : 'Noun / Vocabulary Term';

  // 1. Separate Idioms & Compound Terms (split by " -- ")
  const parts = cleanRaw.split(/\s+--\s+/);
  const mainBody = parts[0].trim();
  const rawPhrases = parts.slice(1);

  // Parse phrases
  const phrases = rawPhrases.map(p => {
    const trimmed = p.trim();
    // usually "Term, definition" or "Term (context), definition"
    const commaIdx = trimmed.indexOf(',');
    if (commaIdx > 0 && commaIdx < 40) {
      return {
        term: trimmed.slice(0, commaIdx).trim(),
        meaning: trimmed.slice(commaIdx + 1).trim()
      };
    }
    return { term: '', meaning: trimmed };
  }).filter(p => p.meaning.length > 0);

  // 2. Separate Notes ("Note: ...")
  let noteText = '';
  let bodyWithoutNotes = mainBody;
  const noteMatch = mainBody.match(/\bNote:\s*(.*?)(?=\s+\d+\.|$)/i);
  if (noteMatch) {
    noteText = noteMatch[1].trim();
    bodyWithoutNotes = mainBody.replace(/\bNote:\s*.*?(?=\s+\d+\.|$)/i, '').trim();
  }

  // 3. Extract Numbered Senses (1., 2., 3., etc.)
  const senseMatches = [...bodyWithoutNotes.matchAll(/(?:^|\s)(\d+)\.\s+([\s\S]*?)(?=(?:\s\d+\.|$))/g)];
  
  const senses = [];
  if (senseMatches.length > 0) {
    for (const m of senseMatches) {
      const num = m[1];
      let defText = m[2].trim();
      // clean trailing semicolons or periods
      senses.push({
        number: parseInt(num, 10),
        definition: defText
      });
    }
  } else {
    // If no numbered senses, treat body as single sense
    senses.push({
      number: 1,
      definition: bodyWithoutNotes
    });
  }

  // Known etymologies / enriched notes for short modern terms if applicable
  const enrichedNotes = {
    serendipity: 'Coined by English author Horace Walpole in 1754, inspired by the Persian fairy tale "The Three Princes of Serendip," whose heroes were always making discoveries by accident and sagacity of things they were not in quest of.',
    computer: 'Originally referred in the 17th century to a person who carried out calculations. Re-applied in the mid-20th century to electronic programmable computing machines.',
    robot: 'Introduced by Czech writer Karel Čapek in his 1920 play "R.U.R." (Rossum\'s Universal Robots), derived from the Slavic word "robota", signifying forced labor or servitude.',
    entropy: 'Formulated in 1865 by German physicist Rudolf Clausius from the Greek word "trope" (transformation), measuring the amount of thermal energy unavailable to do work and the degree of disorder.'
  };

  const wordLower = word.toLowerCase();
  if (!noteText && enrichedNotes[wordLower]) {
    noteText = enrichedNotes[wordLower];
  }

  return {
    word: word,
    pos: posName,
    primarySense: senses[0] ? senses[0].definition : cleanRaw,
    senses: senses,
    notes: noteText,
    phrases: phrases.slice(0, 15), // Up to 15 key compound phrases
    fullRaw: cleanRaw
  };
}
