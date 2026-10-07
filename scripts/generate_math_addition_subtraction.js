import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../data');
const OUTPUT_FILE = path.join(DATA_DIR, 'math_addition_subtraction.jsonl');
const JSON_SUMMARY_FILE = path.join(DATA_DIR, 'math_addition_subtraction.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Format numbers with commas (e.g., 1,000,000,000)
function formatNum(n) {
  return BigInt(n).toLocaleString('en-US');
}

// Generate random BigInt within [min, max]
function randomBigInt(min, max) {
  const range = max - min + 1n;
  const bits = range.toString(2).length;
  let rand;
  do {
    let randStr = '';
    for (let i = 0; i < bits; i++) {
      randStr += Math.random() < 0.5 ? '0' : '1';
    }
    rand = BigInt('0b' + randStr);
  } while (rand >= range);
  return min + rand;
}

// Pattern 1: Column-by-column Addition with Regrouping / Carrying
function generateAdditionWithCarrying(id, rangeType) {
  let min, max;
  if (rangeType === 'small') {
    min = 1n; max = 9999n;
  } else if (rangeType === 'medium') {
    min = 10000n; max = 9999999n;
  } else {
    min = 10000000n; max = 999999999n;
  }

  const a = randomBigInt(min, max);
  const b = randomBigInt(min, max);
  const sum = a + b;

  const aStr = a.toString();
  const bStr = b.toString();
  const maxLen = Math.max(aStr.length, bStr.length);
  const padA = aStr.padStart(maxLen, '0');
  const padB = bStr.padStart(maxLen, '0');

  let carries = 0;
  let carry = 0;
  for (let i = maxLen - 1; i >= 0; i--) {
    const digitSum = parseInt(padA[i], 10) + parseInt(padB[i], 10) + carry;
    if (digitSum >= 10) {
      carries++;
      carry = 1;
    } else {
      carry = 0;
    }
  }

  return {
    id,
    sub_subject: "Addition (1 to 1 Billion)",
    pattern_name: carries > 0 ? "Column-by-Column Regrouping / Carrying" : "Direct Place-Value Addition (No Carrying)",
    pattern_rule: "Base-10 Place-Value Alignment: Align numbers by place value (units, tens, hundreds, thousands, millions). Sum digits from right to left; if a place-value sum >= 10, carry 1 to the next left column.",
    question: `Calculate: ${formatNum(a)} + ${formatNum(b)}`,
    num1: a.toString(),
    num2: b.toString(),
    operation: "+",
    step_by_step_derivation: `1. Align ${formatNum(a)} and ${formatNum(b)} by place value.\n2. Add column-by-column starting from the units place.\n3. Observed ${carries} regrouping/carrying operation(s).\n4. Total sum = ${formatNum(sum)}.`,
    final_answer: sum.toString(),
    formatted_answer: formatNum(sum)
  };
}

// Pattern 2: Subtraction with Borrowing / Decomposition
function generateSubtractionWithBorrowing(id, rangeType) {
  let min, max;
  if (rangeType === 'small') {
    min = 1n; max = 9999n;
  } else if (rangeType === 'medium') {
    min = 10000n; max = 9999999n;
  } else {
    min = 10000000n; max = 999999999n;
  }

  let n1 = randomBigInt(min, max);
  let n2 = randomBigInt(min, max);
  if (n1 < n2) {
    const temp = n1; n1 = n2; n2 = temp;
  }

  const diff = n1 - n2;
  const s1 = n1.toString();
  const s2 = n2.toString().padStart(s1.length, '0');
  let borrows = 0;
  for (let i = s1.length - 1; i >= 0; i--) {
    if (parseInt(s1[i], 10) < parseInt(s2[i], 10)) {
      borrows++;
    }
  }

  return {
    id,
    sub_subject: "Subtraction (1 to 1 Billion)",
    pattern_name: borrows > 0 ? "Place-Value Decomposition (Borrowing across Columns)" : "Direct Place-Value Subtraction",
    pattern_rule: "Base-10 Decomposition Law: When the top digit is smaller than the bottom digit in column k, borrow 1 from column k+1 (which adds 10 to column k) and reduce column k+1 by 1.",
    question: `Calculate: ${formatNum(n1)} - ${formatNum(n2)}`,
    num1: n1.toString(),
    num2: n2.toString(),
    operation: "-",
    step_by_step_derivation: `1. Align ${formatNum(n1)} (minuend) over ${formatNum(n2)} (subtrahend).\n2. Subtract right to left, decomposing/borrowing 10 units whenever the top digit is smaller than the bottom.\n3. Decompositions required: ${borrows} column(s).\n4. Resulting difference = ${formatNum(diff)}.`,
    final_answer: diff.toString(),
    formatted_answer: formatNum(diff)
  };
}

// Pattern 3: Subtraction from Round Billions / Millions (Borrowing Across Zeroes)
function generateBorrowingAcrossZeroes(id) {
  const bases = [10000n, 100000n, 1000000n, 10000000n, 100000000n, 1000000000n];
  const roundBase = bases[Math.floor(Math.random() * bases.length)];
  const subtrahend = randomBigInt(1n, roundBase - 1n);
  const diff = roundBase - subtrahend;

  return {
    id,
    sub_subject: "Subtraction Across Zeroes (1 to 1 Billion)",
    pattern_name: "Borrowing Across Consecutive Zeroes (Nine-Complement Pattern)",
    pattern_rule: "All from 9 and the last from 10: When subtracting any number from a power of 10 (like 1,000,000,000), every intermediate zero decomposes into a 9, and the final non-zero unit decomposes into 10.",
    question: `Calculate: ${formatNum(roundBase)} - ${formatNum(subtrahend)}`,
    num1: roundBase.toString(),
    num2: subtrahend.toString(),
    operation: "-",
    step_by_step_derivation: `1. Notice the minuend is a pure power of 10 (${formatNum(roundBase)}).\n2. Cascade borrowing across all zeroes: the highest 1 becomes 0, each intermediate 0 becomes 9, and the lowest units place becomes 10.\n3. Subtract each digit of ${formatNum(subtrahend)} from 9, and the last digit from 10.\n4. Result = ${formatNum(diff)}.`,
    final_answer: diff.toString(),
    formatted_answer: formatNum(diff)
  };
}

// Pattern 4: Mental Math Compensation Pattern (Near-Round Numbers)
function generateCompensationPattern(id) {
  const roundPowers = [1000n, 10000n, 100000n, 1000000n, 10000000n, 100000000n];
  const basePower = roundPowers[Math.floor(Math.random() * roundPowers.length)];
  const offset = BigInt(Math.floor(Math.random() * 5) + 1); // 1, 2, 3, 4, or 5
  const nearRound = basePower - offset; // e.g. 999, 999,999, etc.
  const baseNum = randomBigInt(basePower, basePower * 10n);

  const isAdd = Math.random() < 0.5;
  if (isAdd) {
    const sum = baseNum + nearRound;
    return {
      id,
      sub_subject: "Mental Arithmetic Patterns",
      pattern_name: "Addition by Compensation (Rounding to Nearest Power of 10)",
      pattern_rule: "Algebraic Compensation Identity: A + (B - k) = (A + B) - k. To add a number near a round power of 10, add the round power first and then subtract the small offset.",
      question: `Calculate: ${formatNum(baseNum)} + ${formatNum(nearRound)}`,
      num1: baseNum.toString(),
      num2: nearRound.toString(),
      operation: "+",
      step_by_step_derivation: `1. Identify pattern: ${formatNum(nearRound)} = ${formatNum(basePower)} - ${offset}.\n2. Add the clean round power first: ${formatNum(baseNum)} + ${formatNum(basePower)} = ${formatNum(baseNum + basePower)}.\n3. Compensate by subtracting ${offset}: ${formatNum(baseNum + basePower)} - ${offset} = ${formatNum(sum)}.\n4. Final sum = ${formatNum(sum)}.`,
      final_answer: sum.toString(),
      formatted_answer: formatNum(sum)
    };
  } else {
    const diff = baseNum - nearRound;
    return {
      id,
      sub_subject: "Mental Arithmetic Patterns",
      pattern_name: "Subtraction by Compensation (Adding the Complement)",
      pattern_rule: "Algebraic Subtraction Identity: A - (B - k) = (A - B) + k. To subtract a number near a round power of 10, subtract the round power first and then add back the offset.",
      question: `Calculate: ${formatNum(baseNum)} - ${formatNum(nearRound)}`,
      num1: baseNum.toString(),
      num2: nearRound.toString(),
      operation: "-",
      step_by_step_derivation: `1. Identify pattern: ${formatNum(nearRound)} = ${formatNum(basePower)} - ${offset}.\n2. Subtract the round power first: ${formatNum(baseNum)} - ${formatNum(basePower)} = ${formatNum(baseNum - basePower)}.\n3. Compensate by adding back ${offset}: ${formatNum(baseNum - basePower)} + ${offset} = ${formatNum(diff)}.\n4. Final difference = ${formatNum(diff)}.`,
      final_answer: diff.toString(),
      formatted_answer: formatNum(diff)
    };
  }
}

// Pattern 5: Real-World Word Problems (Astronomical distances, World population, Budgets)
function generateWordProblem(id) {
  const problemTemplates = [
    {
      topic: "Space & Astronomy",
      make: () => {
        const d1 = randomBigInt(50000000n, 400000000n);
        const d2 = randomBigInt(10000000n, 150000000n);
        const total = d1 + d2;
        return {
          question: `A spacecraft travels ${formatNum(d1)} kilometers to its first planetary waypoint, then continues an additional ${formatNum(d2)} kilometers to reach its final orbital destination. What is the total distance traveled in kilometers?`,
          derivation: `1. Understand the problem: Total distance is the sum of both journey legs.\n2. Operation: ${formatNum(d1)} km + ${formatNum(d2)} km.\n3. Align place values and sum columns.\n4. Total distance = ${formatNum(total)} kilometers.`,
          answer: total.toString()
        };
      }
    },
    {
      topic: "Population & Demographics",
      make: () => {
        const popInitial = randomBigInt(500000000n, 950000000n);
        const popSub = randomBigInt(50000000n, 200000000n);
        const diff = popInitial - popSub;
        return {
          question: `A continent has a total recorded population of ${formatNum(popInitial)} people. If ${formatNum(popSub)} people live in rural coastal regions, how many people live in inland urban centers?`,
          derivation: `1. Understand the problem: Inland population = Total population - Coastal population.\n2. Operation: ${formatNum(popInitial)} - ${formatNum(popSub)}.\n3. Subtract column-by-column with place-value decomposition.\n4. Inland population = ${formatNum(diff)} people.`,
          answer: diff.toString()
        };
      }
    },
    {
      topic: "Financial Budgets & Infrastructure",
      make: () => {
        const budget = randomBigInt(200000000n, 900000000n);
        const spent = randomBigInt(50000000n, budget - 10000000n);
        const remaining = budget - spent;
        return {
          question: `A national high-speed transit project was allocated a budget of $${formatNum(budget)}. If $${formatNum(spent)} has been expended on tunneling and rail materials, how much budget remains unspent?`,
          derivation: `1. Formula: Remaining Budget = Total Allocation - Expenses.\n2. Operation: $${formatNum(budget)} - $${formatNum(spent)}.\n3. Subtract with borrowing across place values.\n4. Remaining budget = $${formatNum(remaining)}.`,
          answer: remaining.toString()
        };
      }
    }
  ];

  const t = problemTemplates[Math.floor(Math.random() * problemTemplates.length)];
  const p = t.make();

  return {
    id,
    sub_subject: `Applied Contextual Word Problems (${t.topic})`,
    pattern_name: "Real-World Context Translation & Place-Value Arithmetic",
    pattern_rule: "Translate linguistic descriptions ('total', 'increased by' -> Addition; 'difference', 'remaining', 'decreased by' -> Subtraction) into rigorous place-value equations.",
    question: p.question,
    step_by_step_derivation: p.derivation,
    final_answer: p.answer,
    formatted_answer: formatNum(p.answer)
  };
}

export function generateDataset(targetCount = 1000) {
  console.log(`================================================================`);
  console.log(`   GENERATING ${targetCount} PATTERN-BASED MATH Q&As (1 to 1 Billion)   `);
  console.log(`================================================================`);

  if (fs.existsSync(OUTPUT_FILE)) {
    fs.unlinkSync(OUTPUT_FILE);
  }

  const allRecords = [];

  for (let i = 1; i <= targetCount; i++) {
    let record;
    const patternSelector = i % 5;

    if (patternSelector === 1) {
      // Small to medium addition
      record = generateAdditionWithCarrying(i, i % 2 === 0 ? 'small' : 'medium');
    } else if (patternSelector === 2) {
      // Subtraction with borrowing (medium to large)
      record = generateSubtractionWithBorrowing(i, i % 2 === 0 ? 'medium' : 'large');
    } else if (patternSelector === 3) {
      // Subtraction from powers of 10 (Borrowing across zeroes up to 1 Billion)
      record = generateBorrowingAcrossZeroes(i);
    } else if (patternSelector === 4) {
      // Compensation patterns (near round numbers)
      record = generateCompensationPattern(i);
    } else {
      // Large-scale BigInt addition (up to 1 Billion)
      record = generateAdditionWithCarrying(i, 'large');
    }

    fs.appendFileSync(OUTPUT_FILE, JSON.stringify(record) + '\n', 'utf-8');
    allRecords.push(record);

    if (i % 250 === 0 || i === targetCount) {
      console.log(`  Progress: ${i}/${targetCount} problems generated...`);
    }
  }

  fs.writeFileSync(JSON_SUMMARY_FILE, JSON.stringify(allRecords, null, 2), 'utf-8');

  console.log(`\n================================================================`);
  console.log(`Successfully generated ${allRecords.length} Pattern-Based Math Q&As!`);
  console.log(`Saved JSONL: ${OUTPUT_FILE}`);
  console.log(`Saved JSON:  ${JSON_SUMMARY_FILE}`);
  console.log(`================================================================`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const target = process.argv[2] ? parseInt(process.argv[2], 10) : 1000;
  generateDataset(target);
}
