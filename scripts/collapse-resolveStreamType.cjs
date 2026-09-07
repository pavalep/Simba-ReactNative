// V16 Phase 70: collapse the `resolveStreamType(resolveStreamType(X))` and
// `resolveStreamType(resolveStreamType(resolveStreamType(X)))` double/triple-
// nesting noise. The function is idempotent: calling it twice or three
// times on a string literal produces the same value as calling it once.
//
// Strategy: match the exact pattern, capture the innermost expression,
// and verify the capture does NOT contain `(` (defensive: if it does,
// the pattern is more complex than a literal/identifier and we leave it
// alone for manual review).
//
// Apply triple-nest collapse FIRST, then double-nest, so a triple gets
// collapsed to a double in the first pass and then to a single in the
// second.

const fs = require('fs');
const path = require('path');

const TRIPLE = /resolveStreamType\(resolveStreamType\(resolveStreamType\(([^()]+)\)\)\)/g;
const DOUBLE = /resolveStreamType\(resolveStreamType\(([^()]+)\)\)/g;

function collapse(content) {
  let prev = content;
  let iter = 0;
  let triple = 0;
  let dbl = 0;

  do {
    prev = content;
    content = content.replace(TRIPLE, (_, inner) => {
      triple++;
      return `resolveStreamType(${inner})`;
    });
    content = content.replace(DOUBLE, (_, inner) => {
      dbl++;
      return `resolveStreamType(${inner})`;
    });
    iter++;
  } while (content !== prev);

  return {content, triple, dbl, iter};
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node collapse-resolveStreamType.cjs <file> [<file> ...]');
  process.exit(2);
}

let totalTriple = 0;
let totalDouble = 0;

for (const f of files) {
  if (!fs.existsSync(f)) {
    console.error('skip (missing): ' + f);
    continue;
  }
  const before = fs.readFileSync(f, 'utf8');
  const {content, triple, dbl, iter} = collapse(before);
  if (content !== before) {
    fs.writeFileSync(f, content, 'utf8');
    console.log(`${path.basename(f)}: ${triple} triple + ${dbl} double collapsed in ${iter} iter(s)`);
    totalTriple += triple;
    totalDouble += dbl;
  } else {
    console.log(`${path.basename(f)}: no change`);
  }
}

console.log(`\nTotal: ${totalTriple} triple + ${totalDouble} double collapsed across ${files.length} file(s)`);
