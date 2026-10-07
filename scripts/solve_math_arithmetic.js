import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

function formatNum(n) {
  if (typeof n === 'bigint') return n.toLocaleString('en-US');
  if (typeof n === 'number') {
    if (Number.isInteger(n)) return BigInt(n).toLocaleString('en-US');
    return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
  }
  return n.toString();
}

export function solveArithmetic(query) {
  const cleaned = query
    .replace(/,/g, '')
    .toLowerCase()
    .replace(/[?!.]/g, '')
    .trim();

  // 1. Check for multiplication phrases
  // e.g. "7 times 8", "7 * 8", "7 x 8", "multiply 7 by 8", "what is 7 multiplied by 8", "product of 7 and 8"
  let mulMatch = cleaned.match(/(-?\d+)\s*(?:\*|x|×|\btimes\b|\bmultiplied by\b)\s*(-?\d+)/);
  if (!mulMatch) {
    mulMatch = cleaned.match(/(?:multiply|product of)\s+(-?\d+)\s+(?:by|and|\*)\s+(-?\d+)/);
  }
  if (mulMatch) {
    const n1 = BigInt(mulMatch[1]);
    const n2 = BigInt(mulMatch[2]);
    const product = n1 * n2;
    const working = `${formatNum(n1)} × ${formatNum(n2)} = ${formatNum(product)}`;

    return {
      success: true,
      operation: "Multiplication",
      expression: `${formatNum(n1)} × ${formatNum(n2)}`,
      pattern: "Distributive Partial Products",
      derivation: `• Multiply: ${formatNum(n1)} × ${formatNum(n2)}\n• Computed value: ${formatNum(product)}.`,
      answer: formatNum(product),
      rawAnswer: product.toString()
    };
  }

  // 2. Check for division phrases
  // e.g. "96 / 12", "96 divided by 12", "divide 96 by 12", "96 over 12"
  let divMatch = cleaned.match(/(-?\d+)\s*(?:\/|÷|\bdivided by\b|\bover\b)\s*(-?\d+)/);
  if (!divMatch) {
    divMatch = cleaned.match(/(?:divide|quotient of)\s+(-?\d+)\s+(?:by|and|\/)\s+(-?\d+)/);
  }
  if (divMatch) {
    const n1 = BigInt(divMatch[1]);
    const n2 = BigInt(divMatch[2]);
    if (n2 === 0n) {
      return {
        success: false,
        message: "Division by zero is undefined."
      };
    }
    const quotient = n1 / n2;
    const remainder = n1 % n2;
    const remStr = remainder === 0n ? "" : ` with remainder ${formatNum(remainder)}`;

    return {
      success: true,
      operation: "Division",
      expression: `${formatNum(n1)} ÷ ${formatNum(n2)}`,
      pattern: "Long Division & Quotient Decomposition",
      derivation: `• Divide ${formatNum(n1)} by ${formatNum(n2)}: quotient is ${formatNum(quotient)}${remStr}.\n• Verification: (${formatNum(quotient)} × ${formatNum(n2)}) + ${formatNum(remainder)} = ${formatNum(n1)}.`,
      answer: remainder === 0n ? formatNum(quotient) : `${formatNum(quotient)} R ${formatNum(remainder)}`,
      rawAnswer: quotient.toString()
    };
  }

  // 3. Addition phrases
  // e.g. "A + B", "add A and B", "what is A plus B", "sum of A and B"
  let addMatch = cleaned.match(/(-?\d+)\s*(?:\+|\bplus\b|\band\b)\s*(-?\d+)/);
  if (!addMatch) {
    addMatch = cleaned.match(/(?:add|sum of|calculate)\s+(-?\d+)\s+(?:and|\+)\s+(-?\d+)/);
  }
  if (addMatch && !cleaned.includes('minus') && !cleaned.includes('subtract')) {
    const n1 = BigInt(addMatch[1]);
    const n2 = BigInt(addMatch[2]);
    const sum = n1 + n2;

    const isCompensation = (n2 % 1000n === 999n || n2 % 10000n === 9999n);
    let derivation = "";
    let pattern = "";

    if (isCompensation) {
      pattern = "Algebraic Compensation Identity: A + (B - 1) = (A + B) - 1";
      const roundB = n2 + 1n;
      derivation = `• Pattern: Notice that ${formatNum(n2)} is 1 away from ${formatNum(roundB)}.\n• Step 1: Add the round number: ${formatNum(n1)} + ${formatNum(roundB)} = ${formatNum(n1 + roundB)}.\n• Step 2: Compensate by subtracting 1: ${formatNum(n1 + roundB)} - 1 = ${formatNum(sum)}.`;
    } else {
      pattern = "Base-10 Column-by-Column Regrouping / Carrying";
      derivation = `• Place Value: Align ${formatNum(n1)} and ${formatNum(n2)} by units, tens, hundreds, thousands, and millions.\n• Column Addition: Add right-to-left. When any column sum >= 10, carry 1 to the next left column.\n• Final Sum: ${formatNum(sum)}.`;
    }

    return {
      success: true,
      operation: "Addition",
      expression: `${formatNum(n1)} + ${formatNum(n2)}`,
      pattern: pattern,
      derivation: derivation,
      answer: formatNum(sum),
      rawAnswer: sum.toString()
    };
  }

  // 4. Subtraction phrases
  // e.g. "A - B", "A minus B", "subtract B from A", "difference between A and B"
  let subMatch = cleaned.match(/(-?\d+)\s*(?:\-|\bminus\b)\s*(-?\d+)/);
  if (!subMatch) {
    subMatch = cleaned.match(/(?:subtract|take away)\s+(-?\d+)\s+(?:from)\s+(-?\d+)/);
    if (subMatch) subMatch = [subMatch[0], subMatch[2], subMatch[1]]; // invert order for "subtract A from B" -> B - A
  }
  if (!subMatch) {
    subMatch = cleaned.match(/(?:difference between)\s+(-?\d+)\s+(?:and)\s+(-?\d+)/);
  }

  if (subMatch) {
    const n1 = BigInt(subMatch[1]);
    const n2 = BigInt(subMatch[2]);
    const diff = n1 - n2;

    const isNineComplement = (n1.toString().startsWith("1") && /^10+$/.test(n1.toString()));
    let derivation = "";
    let pattern = "";

    if (isNineComplement) {
      pattern = "Nine-Complement Borrowing Across Zeroes (All from 9 and last from 10)";
      derivation = `• Pattern: ${formatNum(n1)} is a power of 10. Decompose across all zeroes: intermediate 0s become 9, and the final unit becomes 10.\n• Column Subtraction: Subtract each digit of ${formatNum(n2)} from 9, and the units digit from 10.\n• Final Difference: ${formatNum(diff)}.`;
    } else {
      pattern = "Base-10 Decomposition Law (Borrowing Across Columns)";
      derivation = `• Place Value: Align minuend ${formatNum(n1)} over subtrahend ${formatNum(n2)}.\n• Column Subtraction: Subtract right-to-left. When the top digit < bottom digit, decompose 1 from the next column (+10).\n• Final Difference: ${formatNum(diff)}.`;
    }

    return {
      success: true,
      operation: "Subtraction",
      expression: `${formatNum(n1)} - ${formatNum(n2)}`,
      pattern: pattern,
      derivation: derivation,
      answer: formatNum(diff),
      rawAnswer: diff.toString()
    };
  }

  return {
    success: false,
    message: "Could not identify arithmetic expression."
  };
}
