// Deterministic Unit and Currency Converter
// Zero Groq tokens, executes in < 1ms with exact arithmetic precision.

const LENGTH_FACTORS = {
  // Base unit: meter (m)
  m: 1, meter: 1, meters: 1, metre: 1, metres: 1,
  km: 1000, kilometer: 1000, kilometers: 1000, kilometre: 1000, kilometres: 1000,
  cm: 0.01, centimeter: 0.01, centimeters: 0.01, centimetre: 0.01, centimetres: 0.01,
  mm: 0.001, millimeter: 0.001, millimeters: 0.001, millimetre: 0.001, millimetres: 0.001,
  mi: 1609.344, mile: 1609.344, miles: 1609.344,
  yd: 0.9144, yard: 0.9144, yards: 0.9144,
  ft: 0.3048, foot: 0.3048, feet: 0.3048,
  in: 0.0254, inch: 0.0254, inches: 0.0254
};

const MASS_FACTORS = {
  // Base unit: kilogram (kg)
  kg: 1, kilogram: 1, kilograms: 1,
  g: 0.001, gram: 0.001, grams: 0.001,
  mg: 0.000001, milligram: 0.000001, milligrams: 0.000001,
  lb: 0.45359237, lbs: 0.45359237, pound: 0.45359237, pounds: 0.45359237,
  oz: 0.028349523125, ounce: 0.028349523125, ounces: 0.028349523125,
  ton: 907.18474, tons: 907.18474, tonne: 1000, tonnes: 1000, 'metric ton': 1000, 'metric tons': 1000
};

const SPEED_FACTORS = {
  // Base unit: m/s
  'm/s': 1, 'mps': 1, 'meter per second': 1, 'meters per second': 1,
  'km/h': 0.27777777777778, 'kph': 0.27777777777778, 'kilometer per hour': 0.27777777777778, 'kilometers per hour': 0.27777777777778,
  'mph': 0.44704, 'mile per hour': 0.44704, 'miles per hour': 0.44704,
  'knot': 0.514444, 'knots': 0.514444
};

const VOLUME_FACTORS = {
  // Base unit: liter (L)
  l: 1, liter: 1, liters: 1, litre: 1, litres: 1,
  ml: 0.001, milliliter: 0.001, milliliters: 0.001, millilitre: 0.001, millilitres: 0.001,
  gal: 3.785411784, gallon: 3.785411784, gallons: 3.785411784,
  cup: 0.2365882365, cups: 0.2365882365,
  pt: 0.473176, pint: 0.473176, pints: 0.473176,
  qt: 0.946353, quart: 0.946353, quarts: 0.946353,
  floz: 0.0295735, 'fl oz': 0.0295735, 'fluid ounce': 0.0295735, 'fluid ounces': 0.0295735
};

const DATA_FACTORS = {
  // Base unit: bytes (B)
  b: 1, byte: 1, bytes: 1,
  kb: 1024, kilobyte: 1024, kilobytes: 1024,
  mb: 1024 * 1024, megabyte: 1024 * 1024, megabytes: 1024 * 1024,
  gb: 1024 * 1024 * 1024, gigabyte: 1024 * 1024 * 1024, gigabytes: 1024 * 1024 * 1024,
  tb: 1024 * 1024 * 1024 * 1024, terabyte: 1024 * 1024 * 1024 * 1024, terabytes: 1024 * 1024 * 1024 * 1024
};

// Benchmark reference exchange rates against USD (base = 1 USD)
const CURRENCY_RATES = {
  usd: 1.0,
  eur: 0.92,
  gbp: 0.78,
  jpy: 153.2,
  aud: 1.52,
  cad: 1.38,
  nzd: 1.66,
  chf: 0.88,
  cny: 7.23,
  inr: 83.9,
  sgd: 1.34,
  hkd: 7.79
};

const CURRENCY_SYMBOLS = {
  usd: '$', eur: '€', gbp: '£', jpy: '¥', aud: 'A$', cad: 'C$', nzd: 'NZ$', chf: 'CHF', cny: '¥', inr: '₹', sgd: 'S$', hkd: 'HK$'
};

const CURRENCY_NAMES = {
  usd: 'US Dollar', eur: 'Euro', gbp: 'British Pound', jpy: 'Japanese Yen',
  aud: 'Australian Dollar', cad: 'Canadian Dollar', nzd: 'New Zealand Dollar',
  chf: 'Swiss Franc', cny: 'Chinese Yuan', inr: 'Indian Rupee', sgd: 'Singapore Dollar', hkd: 'Hong Kong Dollar'
};

function cleanUnit(str) {
  return str.toLowerCase().replace(/[^a-z0-9\/\s]/g, '').trim();
}

function formatNumber(num) {
  if (Math.abs(num) >= 1000) {
    return Number(num.toFixed(2)).toLocaleString();
  }
  if (Math.abs(num) < 0.0001 && num !== 0) {
    return num.toExponential(4);
  }
  return Number(num.toFixed(4)).toString();
}

/**
 * Parses queries like:
 * "50 miles to km", "32 f to c", "100 usd to eur", "5 feet 11 inches to cm"
 */
export function convertUnit(rawQuery) {
  if (!rawQuery) return null;
  const q = rawQuery.toLowerCase().trim();

  // Pattern A: "X feet Y inches to [unit]" (e.g. 5 ft 10 in to cm)
  const compoundMatch = q.match(/^(\d+(?:\.\d+)?)\s*(?:ft|feet|foot)\s*(\d+(?:\.\d+)?)\s*(?:in|inch|inches)\s+(?:to|in|into)\s+([a-z]+)$/i);
  if (compoundMatch) {
    const feet = parseFloat(compoundMatch[1]);
    const inches = parseFloat(compoundMatch[2]);
    const targetUnit = cleanUnit(compoundMatch[3]);
    const targetFactor = LENGTH_FACTORS[targetUnit];
    if (targetFactor) {
      const totalMeters = (feet * LENGTH_FACTORS['ft']) + (inches * LENGTH_FACTORS['in']);
      const converted = totalMeters / targetFactor;
      const direct = `${feet} ft ${inches} in = ${formatNumber(converted)} ${targetUnit}`;
      return {
        found: true,
        category: 'Unit Conversion',
        title: `**${feet} ft ${inches} in = ${formatNumber(converted)} ${targetUnit}**`,
        directAnswer: direct,
        fullExplanation: `${feet} feet and ${inches} inches is equivalent to ${formatNumber(converted)} ${targetUnit}. Length conversions utilize standard SI dimensional equivalence where 1 foot equals 0.3048 meters and 1 inch equals 0.0254 meters.`,
        snippet: direct,
        details: {
          fromValue: `${feet} ft ${inches} in`,
          toValue: formatNumber(converted),
          targetUnit,
          type: 'Length'
        }
      };
    }
  }

  // Pattern B: Standard "[value] [unit1] to/in/into [unit2]" or "convert [value] [unit1] to [unit2]"
  const match = q.match(/^(?:convert\s+)?(\d+(?:\.\d+)?)\s*([a-z°\/\s]+?)\s+(?:to|in|into)\s+([a-z°\/\s]+)$/i);
  if (!match) return null;

  const value = parseFloat(match[1]);
  if (isNaN(value)) return null;

  const u1 = cleanUnit(match[2]);
  const u2 = cleanUnit(match[3]);

  // 1. Temperature conversion (C, F, K)
  const isTemp1 = /^(c|celsius|centigrade)$/.test(u1);
  const isTemp2 = /^(c|celsius|centigrade)$/.test(u2);
  const isFahr1 = /^(f|fahrenheit)$/.test(u1);
  const isFahr2 = /^(f|fahrenheit)$/.test(u2);
  const isKelv1 = /^(k|kelvin)$/.test(u1);
  const isKelv2 = /^(k|kelvin)$/.test(u2);

  if ((isTemp1 || isFahr1 || isKelv1) && (isTemp2 || isFahr2 || isKelv2)) {
    let result = null;
    let formula = '';
    let fromLabel = isTemp1 ? '°C' : (isFahr1 ? '°F' : 'K');
    let toLabel = isTemp2 ? '°C' : (isFahr2 ? '°F' : 'K');

    if (isTemp1 && isFahr2) {
      result = (value * 9 / 5) + 32;
      formula = `(${value} °C × 9/5) + 32 = ${formatNumber(result)} °F`;
    } else if (isFahr1 && isTemp2) {
      result = (value - 32) * 5 / 9;
      formula = `(${value} °F - 32) × 5/9 = ${formatNumber(result)} °C`;
    } else if (isTemp1 && isKelv2) {
      result = value + 273.15;
      formula = `${value} °C + 273.15 = ${formatNumber(result)} K`;
    } else if (isKelv1 && isTemp2) {
      result = value - 273.15;
      formula = `${value} K - 273.15 = ${formatNumber(result)} °C`;
    } else if (isFahr1 && isKelv2) {
      result = ((value - 32) * 5 / 9) + 273.15;
      formula = `((${value} °F - 32) × 5/9) + 273.15 = ${formatNumber(result)} K`;
    } else if (isKelv1 && isFahr2) {
      result = ((value - 273.15) * 9 / 5) + 32;
      formula = `((${value} K - 273.15) × 9/5) + 32 = ${formatNumber(result)} °F`;
    } else if (u1 === u2) {
      result = value;
      formula = `${value} ${fromLabel} = ${value} ${toLabel}`;
    }

    if (result !== null) {
      const direct = `${value} ${fromLabel} = ${formatNumber(result)} ${toLabel}`;
      return {
        found: true,
        category: 'Unit Conversion',
        title: `**${value} ${fromLabel} = ${formatNumber(result)} ${toLabel}**`,
        directAnswer: direct,
        fullExplanation: `${formula}. Temperature calculations represent thermodynamic scale conversions using fixed physical boiling and freezing constants.`,
        snippet: direct,
        details: {
          fromValue: `${value} ${fromLabel}`,
          toValue: `${formatNumber(result)} ${toLabel}`,
          formula,
          type: 'Temperature'
        }
      };
    }
  }

  // 2. Length Conversion
  if (LENGTH_FACTORS[u1] && LENGTH_FACTORS[u2]) {
    const meters = value * LENGTH_FACTORS[u1];
    const converted = meters / LENGTH_FACTORS[u2];
    const direct = `${value} ${u1} = ${formatNumber(converted)} ${u2}`;
    return {
      found: true,
      category: 'Unit Conversion',
      title: `**${value} ${u1} = ${formatNumber(converted)} ${u2}**`,
      directAnswer: direct,
      fullExplanation: `${value} ${u1} is equivalent to ${formatNumber(converted)} ${u2}. This conversion relies on standard SI dimensional ratios where base distance is calibrated to the international meter.`,
      snippet: direct,
      details: {
        fromValue: `${value} ${u1}`,
        toValue: `${formatNumber(converted)} ${u2}`,
        type: 'Length'
      }
    };
  }

  // 3. Mass / Weight Conversion
  if (MASS_FACTORS[u1] && MASS_FACTORS[u2]) {
    const kg = value * MASS_FACTORS[u1];
    const converted = kg / MASS_FACTORS[u2];
    const direct = `${value} ${u1} = ${formatNumber(converted)} ${u2}`;
    return {
      found: true,
      category: 'Unit Conversion',
      title: `**${value} ${u1} = ${formatNumber(converted)} ${u2}**`,
      directAnswer: direct,
      fullExplanation: `${value} ${u1} equals ${formatNumber(converted)} ${u2}. Mass and weight metrics follow international avoirdupois and metric standards calibrated to the standard kilogram.`,
      snippet: direct,
      details: {
        fromValue: `${value} ${u1}`,
        toValue: `${formatNumber(converted)} ${u2}`,
        type: 'Weight'
      }
    };
  }

  // 4. Speed Conversion
  if (SPEED_FACTORS[u1] && SPEED_FACTORS[u2]) {
    const mps = value * SPEED_FACTORS[u1];
    const converted = mps / SPEED_FACTORS[u2];
    const direct = `${value} ${u1} = ${formatNumber(converted)} ${u2}`;
    return {
      found: true,
      category: 'Unit Conversion',
      title: `**${value} ${u1} = ${formatNumber(converted)} ${u2}**`,
      directAnswer: direct,
      fullExplanation: `${value} ${u1} equals ${formatNumber(converted)} ${u2}. Velocity metrics represent kinematic rates of displacement calibrated to meters per second.`,
      snippet: direct,
      details: {
        fromValue: `${value} ${u1}`,
        toValue: `${formatNumber(converted)} ${u2}`,
        type: 'Speed'
      }
    };
  }

  // 5. Volume Conversion
  if (VOLUME_FACTORS[u1] && VOLUME_FACTORS[u2]) {
    const liters = value * VOLUME_FACTORS[u1];
    const converted = liters / VOLUME_FACTORS[u2];
    const direct = `${value} ${u1} = ${formatNumber(converted)} ${u2}`;
    return {
      found: true,
      category: 'Unit Conversion',
      title: `**${value} ${u1} = ${formatNumber(converted)} ${u2}**`,
      directAnswer: direct,
      fullExplanation: `${value} ${u1} is equivalent to ${formatNumber(converted)} ${u2}. Fluid capacity measurements correspond to volumetric displacement standardized to the liter.`,
      snippet: direct,
      details: {
        fromValue: `${value} ${u1}`,
        toValue: `${formatNumber(converted)} ${u2}`,
        type: 'Volume'
      }
    };
  }

  // 6. Digital Data Storage Conversion
  if (DATA_FACTORS[u1] && DATA_FACTORS[u2]) {
    const bytes = value * DATA_FACTORS[u1];
    const converted = bytes / DATA_FACTORS[u2];
    const direct = `${value} ${u1.toUpperCase()} = ${formatNumber(converted)} ${u2.toUpperCase()}`;
    return {
      found: true,
      category: 'Unit Conversion',
      title: `**${value} ${u1.toUpperCase()} = ${formatNumber(converted)} ${u2.toUpperCase()}**`,
      directAnswer: direct,
      fullExplanation: `${value} ${u1.toUpperCase()} equals ${formatNumber(converted)} ${u2.toUpperCase()}. Digital storage is computed via binary binary-multiple factors where 1 Kilobyte equals 1,024 bytes.`,
      snippet: direct,
      details: {
        fromValue: `${value} ${u1.toUpperCase()}`,
        toValue: `${formatNumber(converted)} ${u2.toUpperCase()}`,
        type: 'Data'
      }
    };
  }

  // 7. Currency Conversion
  if (CURRENCY_RATES[u1] && CURRENCY_RATES[u2]) {
    const usd = value / CURRENCY_RATES[u1];
    const converted = usd * CURRENCY_RATES[u2];
    const sym1 = CURRENCY_SYMBOLS[u1] || '';
    const sym2 = CURRENCY_SYMBOLS[u2] || '';
    const name1 = CURRENCY_NAMES[u1] || u1.toUpperCase();
    const name2 = CURRENCY_NAMES[u2] || u2.toUpperCase();
    const direct = `${sym1}${formatNumber(value)} ${u1.toUpperCase()} = ${sym2}${formatNumber(converted)} ${u2.toUpperCase()}`;
    return {
      found: true,
      category: 'Currency Conversion',
      title: `**${direct}**`,
      directAnswer: direct,
      fullExplanation: `${formatNumber(value)} ${name1} (${u1.toUpperCase()}) is approximately ${sym2}${formatNumber(converted)} ${name2} (${u2.toUpperCase()}). Currency estimates utilize interbank benchmark foreign exchange reference rates.`,
      snippet: direct,
      details: {
        fromValue: `${sym1}${formatNumber(value)} ${u1.toUpperCase()}`,
        toValue: `${sym2}${formatNumber(converted)} ${u2.toUpperCase()}`,
        type: 'Currency'
      }
    };
  }

  return null;
}
