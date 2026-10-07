// Lemmatizer helper
export function getWordVariants(word) {
  const w = word.toLowerCase().trim();
  const variants = new Set([w]);

  // Plural to singular
  if (w.endsWith('ies') && w.length > 4) {
    variants.add(w.slice(0, -3) + 'y');
  } else if (w.endsWith('es') && w.length > 3) {
    variants.add(w.slice(0, -2));
    variants.add(w.slice(0, -1)); // e.g. apples -> apple
  } else if (w.endsWith('s') && w.length > 2 && !w.endsWith('ss')) {
    variants.add(w.slice(0, -1));
  }

  // Singular to plural
  if (w.endsWith('y') && w.length > 2) {
    variants.add(w.slice(0, -1) + 'ies');
  } else {
    variants.add(w + 's');
    variants.add(w + 'es');
  }

  return Array.from(variants);
}
