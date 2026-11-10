#!/usr/bin/env node
/**
 * app-spec.js — reads the app's own design values so the Penpot prototype
 * cannot claim anything the app does not ship.
 *
 * OWNERS
 *   colours      src/theme/tokens.ts        (export const lightColors)
 *   typography   src/theme/tokens.ts        (export const typography)
 *   families     src/constants/fontFamily.ts (export const FONT_FAMILY)
 *
 * HOW IT READS THEM
 *   The values are taken from the TypeScript AST (the app's own compiler),
 *   NOT from a regex over the source text. A regex can silently mis-read a
 *   value or miss a nested key; the AST cannot. Anything the evaluator
 *   cannot resolve is reported as `null` and listed by `unsupported`,
 *   so a gap is visible instead of quietly wrong.
 *
 * The login screen's own lockup styles are NOT here: they live in
 * src/screens/Login/components/LoginScreen.tsx and are read by
 * build-login-design.js, which this prototype reuses.
 *
 * The brand STRINGS are here (`BRAND`): the wordmark and the tagline are
 * one fact with one owner (`src/constants/brand.ts`), so a board that
 * draws the lockup reads them from there and never types them out.
 *
 * USAGE
 *   const spec = require('./app-spec');
 *   spec.colors.background.primary     // '#F5F0E8'
 *   spec.variant('body1')              // {family, weight, fontSize, lineHeight, letterSpacing}
 */

'use strict';

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const APP = path.resolve(__dirname, '..', '..');

// ─── AST evaluation ────────────────────────────────────────────────

/** Every value the evaluator could not resolve, with where it was seen. */
const unsupported = [];

/** Unwrap `x as const`, `x satisfies T`, and parentheses. */
function unwrap(node) {
  let n = node;
  for (;;) {
    if (
      ts.isAsExpression(n) ||
      ts.isSatisfiesExpression(n) ||
      ts.isParenthesizedExpression(n) ||
      ts.isTypeAssertionExpression(n)
    ) {
      n = n.expression;
      continue;
    }
    return n;
  }
}

/** Read a dotted path (e.g. `inter.semibold`) out of a plain object. */
function readPath(root, dotted) {
  let cur = root;
  for (const part of dotted.split('.')) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[part];
  }
  return cur;
}

/**
 * Evaluate an expression to a plain JS value.
 * `env` holds already-evaluated exported consts (e.g. FONT_FAMILY).
 */
function evaluate(node, env, where) {
  const n = unwrap(node);

  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
  if (ts.isNumericLiteral(n)) return Number(n.text);
  if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (n.kind === ts.SyntaxKind.NullKeyword) return null;

  if (ts.isPrefixUnaryExpression(n) && ts.isNumericLiteral(n.operand)) {
    return n.operator === ts.SyntaxKind.MinusToken ? -Number(n.operand.text) : Number(n.operand.text);
  }

  if (ts.isArrayLiteralExpression(n)) {
    return n.elements.map((el, i) => evaluate(el, env, where + '[' + i + ']'));
  }

  if (ts.isObjectLiteralExpression(n)) {
    const out = {};
    for (const prop of n.properties) {
      if (!ts.isPropertyAssignment(prop)) {
        unsupported.push(where + ': unsupported property kind ' + ts.SyntaxKind[prop.kind]);
        continue;
      }
      const name = ts.isIdentifier(prop.name)
        ? prop.name.text
        : ts.isStringLiteral(prop.name)
          ? prop.name.text
          : null;
      if (name == null) {
        unsupported.push(where + ': unsupported property name');
        continue;
      }
      out[name] = evaluate(prop.initializer, env, where + '.' + name);
    }
    return out;
  }

  if (ts.isPropertyAccessExpression(n)) {
    const base = evaluate(n.expression, env, where);
    if (base == null) {
      unsupported.push(where + ': unresolved base of .' + n.name.text);
      return null;
    }
    const value = base[n.name.text];
    if (value === undefined) {
      unsupported.push(where + ': missing key .' + n.name.text);
      return null;
    }
    return value;
  }

  if (ts.isIdentifier(n)) {
    if (Object.prototype.hasOwnProperty.call(env, n.text)) return env[n.text];
    unsupported.push(where + ': unresolved identifier ' + n.text);
    return null;
  }

  unsupported.push(where + ': unsupported expression ' + ts.SyntaxKind[n.kind]);
  return null;
}

/** Parse a file and return its exported consts, as AST nodes. */
function parseFile(absPath) {
  const text = fs.readFileSync(absPath, 'utf8');
  const sf = ts.createSourceFile(
    absPath,
    text,
    ts.ScriptTarget.ESNext,
    /* setParentNodes */ true,
    ts.ScriptKind.TS,
  );
  const exported = new Map();
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    const isExport = stmt.modifiers
      ? stmt.modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
      : false;
    if (!isExport) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (ts.isIdentifier(decl.name)) exported.set(decl.name.text, decl.initializer);
    }
  }
  return exported;
}

/** Evaluate one exported const from a file, resolving references to `env`. */
function evalExport(absPath, exportName, env) {
  const exported = parseFile(absPath);
  const init = exported.get(exportName);
  if (!init) throw new Error(exportName + ' not exported by ' + absPath);
  return evaluate(init, env, exportName);
}

// ─── The app's design values ───────────────────────────────────────

const TOKENS = path.join(APP, 'src/theme/tokens.ts');
const FONT_FAMILY_FILE = path.join(APP, 'src/constants/fontFamily.ts');
const BRAND_FILE = path.join(APP, 'src/constants/brand.ts');

/** FONT_FAMILY first — the typography tokens reference it. */
const families = evalExport(FONT_FAMILY_FILE, 'FONT_FAMILY', {});

const env = { FONT_FAMILY: families };
const colors = evalExport(TOKENS, 'lightColors', env);
const darkColors = evalExport(TOKENS, 'darkColors', env);
const typography = evalExport(TOKENS, 'typography', env);

/** The brand strings — the wordmark and the tagline (`src/constants/brand.ts`). */
const brand = evalExport(BRAND_FILE, 'BRAND', env);

/** The flat family map (dotted keys -> the family string RN resolves). */
function flattenFamilies(node, prefix, out) {
  for (const [key, value] of Object.entries(node)) {
    const dotted = prefix ? prefix + '.' + key : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      flattenFamilies(value, dotted, out);
    } else {
      out[dotted] = value;
    }
  }
  return out;
}

const familyMap = flattenFamilies(families, '', {});

/** The family string a FONT_FAMILY key resolves to. */
function family(key) {
  const value = familyMap[key];
  if (!value) {
    throw new Error(
      'unknown family key ' + key + ' (known: ' + Object.keys(familyMap).join(', ') + ')',
    );
  }
  return value;
}

/** A typography variant, resolved to the family string it uses. */
function variant(name) {
  const tok = typography[name];
  if (!tok) throw new Error('unknown typography variant ' + name);
  return {
    family: tok.fontFamily,
    familyKey: null, // the token already holds the resolved family string
    weight: tok.fontWeight == null ? 400 : Number(tok.fontWeight),
    fontSize: tok.fontSize == null ? null : Number(tok.fontSize),
    lineHeight: tok.lineHeight == null ? null : Number(tok.lineHeight),
    letterSpacing: tok.letterSpacing == null ? 0 : Number(tok.letterSpacing),
  };
}

/** Look up a dotted colour path, e.g. 'background.primary'. */
function color(path) {
  const value = readPath(colors, path);
  if (value == null) throw new Error('unknown colour path ' + path);
  return value;
}

module.exports = {
  colors,
  darkColors,
  typography,
  families,
  brand,
  familyMap,
  family,
  variant,
  color,
  unsupported,
  APP,
};

if (require.main === module) {
  console.log(
    JSON.stringify(
      { colors, typography, families, unsupported },
      null,
      2,
    ),
  );
}
