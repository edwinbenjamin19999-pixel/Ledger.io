/**
 * Safe formula evaluator for report rows.
 * Supports `[row.code]` references, numeric literals, +, -, *, /, parentheses,
 * unary minus. NO eval/Function — hand-written recursive-descent parser.
 *
 * Topological sort over row formulas detects cycles and evaluates dependencies
 * in correct order.
 */

export class MissingRowError extends Error {
  constructor(public readonly missingCode: string, public readonly inFormula: string) {
    super(`Formula references missing row code [${missingCode}] in: ${inFormula}`);
    this.name = "MissingRowError";
  }
}

export class FormulaCycleError extends Error {
  constructor(public readonly cycle: string[]) {
    super(`Formula dependency cycle: ${cycle.join(" → ")}`);
    this.name = "FormulaCycleError";
  }
}

export class FormulaSyntaxError extends Error {
  constructor(message: string, public readonly formula: string) {
    super(`Formula syntax error: ${message} in "${formula}"`);
    this.name = "FormulaSyntaxError";
  }
}

type Token =
  | { type: "num"; value: number }
  | { type: "ref"; code: string }
  | { type: "op"; op: "+" | "-" | "*" | "/" }
  | { type: "lparen" }
  | { type: "rparen" };

function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < formula.length) {
    const c = formula[i];
    if (c === " " || c === "\t" || c === "\n") {
      i++;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/") {
      tokens.push({ type: "op", op: c });
      i++;
      continue;
    }
    if (c === "(") { tokens.push({ type: "lparen" }); i++; continue; }
    if (c === ")") { tokens.push({ type: "rparen" }); i++; continue; }
    if (c === "[") {
      const end = formula.indexOf("]", i);
      if (end < 0) throw new FormulaSyntaxError("unmatched '['", formula);
      tokens.push({ type: "ref", code: formula.slice(i + 1, end).trim() });
      i = end + 1;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < formula.length && /[0-9.]/.test(formula[j])) j++;
      const num = parseFloat(formula.slice(i, j));
      if (!isFinite(num)) throw new FormulaSyntaxError(`invalid number "${formula.slice(i, j)}"`, formula);
      tokens.push({ type: "num", value: num });
      i = j;
      continue;
    }
    throw new FormulaSyntaxError(`unexpected character "${c}"`, formula);
  }
  return tokens;
}

/** Pratt-style recursive-descent parser. */
function parse(tokens: Token[], formula: string, values: Map<string, number>): number {
  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpr(): number {
    let left = parseTerm();
    while (pos < tokens.length) {
      const t = peek();
      if (t.type === "op" && (t.op === "+" || t.op === "-")) {
        consume();
        const right = parseTerm();
        left = t.op === "+" ? left + right : left - right;
      } else break;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parseFactor();
    while (pos < tokens.length) {
      const t = peek();
      if (t.type === "op" && (t.op === "*" || t.op === "/")) {
        consume();
        const right = parseFactor();
        left = t.op === "*" ? left * right : right === 0 ? 0 : left / right;
      } else break;
    }
    return left;
  }

  function parseFactor(): number {
    const t = peek();
    if (!t) throw new FormulaSyntaxError("unexpected end of expression", formula);
    if (t.type === "op" && t.op === "-") {
      consume();
      return -parseFactor();
    }
    if (t.type === "op" && t.op === "+") {
      consume();
      return parseFactor();
    }
    if (t.type === "num") {
      consume();
      return t.value;
    }
    if (t.type === "ref") {
      consume();
      if (!values.has(t.code)) throw new MissingRowError(t.code, formula);
      return values.get(t.code) ?? 0;
    }
    if (t.type === "lparen") {
      consume();
      const v = parseExpr();
      const close = consume();
      if (!close || close.type !== "rparen") throw new FormulaSyntaxError("expected ')'", formula);
      return v;
    }
    throw new FormulaSyntaxError(`unexpected token ${JSON.stringify(t)}`, formula);
  }

  const result = parseExpr();
  if (pos !== tokens.length) throw new FormulaSyntaxError("trailing tokens", formula);
  return result;
}

/** Evaluate a single formula against a values map. */
export function evaluateFormula(formula: string, values: Map<string, number>): number {
  return parse(tokenize(formula), formula, values);
}

/** Extract the [code] references from a formula. */
export function extractRefs(formula: string): string[] {
  const refs: string[] = [];
  const re = /\[([^\]]+)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(formula))) refs.push(m[1].trim());
  return refs;
}

/**
 * Resolve all formulas in dependency order.
 * `seedValues` should contain pre-computed row totals (account-aggregated sums).
 * `formulas` maps row code → formula expression.
 * Returns a map with both seed values and resolved formula values.
 */
export function resolveFormulas(
  seedValues: Map<string, number>,
  formulas: Map<string, string>,
): Map<string, number> {
  const out = new Map(seedValues);
  const visiting = new Set<string>();
  const stack: string[] = [];

  function resolve(code: string): number {
    if (out.has(code)) return out.get(code)!;
    const formula = formulas.get(code);
    if (!formula) {
      // No formula and no seed value → 0 (leaf with no data).
      out.set(code, 0);
      return 0;
    }
    if (visiting.has(code)) {
      const cycle = [...stack.slice(stack.indexOf(code)), code];
      throw new FormulaCycleError(cycle);
    }
    visiting.add(code);
    stack.push(code);

    // Resolve all referenced codes first.
    for (const ref of extractRefs(formula)) {
      if (!out.has(ref)) resolve(ref);
    }

    const value = evaluateFormula(formula, out);
    out.set(code, value);
    visiting.delete(code);
    stack.pop();
    return value;
  }

  for (const code of formulas.keys()) resolve(code);
  return out;
}
