const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const problemsDir = path.join(root, 'problems');

const mapping = new Map([
  ['formula_sin2_cos2_1', 'formula_1'],
  ['formula_tan_sin_cos', 'formula_2'],
  ['formula_1_plus_tan2', 'formula_3'],
  ['formula_sin2theta', 'formula_4'],
  ['formula_cos2theta_cos', 'formula_5'],
  ['formula_cos2theta_sin', 'formula_6'],
  ['formula_half_angle_cos', 'formula_7'],
  ['formula_half_angle_sin', 'formula_7'],
  ['formula_addition_sin_diff', 'formula_8'],
  ['formula_addition_tan', 'formula_8'],
  ['formula_addition_cos', 'formula_8'],
  ['formula_factorization_diff_sq', 'formula_9'],
  ['formula_expansion_sq', 'formula_9'],
  ['formula_perfect_square', 'formula_10'],
  ['formula_factorization_cube', 'formula_11'],
  ['formula_cube_factorization', 'formula_11'],
  ['formula_sin3theta', 'formula_12'],
  ['formula_cos3theta', 'formula_13'],
  ['formula_sum_to_product_sin', 'formula_14'],
  ['formula_sum_to_product_cos', 'formula_14'],
  ['formula_product_to_sum_sin_cos', 'formula_15'],
  ['formula_product_to_sum_sin_sin', 'formula_15'],
  ['formula_tan2theta', 'formula_16'],
]);

const validFormulaIds = new Set(Array.from({ length: 16 }, (_, i) => `formula_${i + 1}`));

function mapRequiredFormulas(list) {
  if (!Array.isArray(list)) return list;
  const mapped = [];
  const seen = new Set();
  for (const entry of list) {
    const next = mapping.get(entry) || entry;
    if (!seen.has(next)) {
      mapped.push(next);
      seen.add(next);
    }
  }
  return mapped;
}

const targetIds = new Set(Array.from({ length: 20 }, (_, i) => String(i + 51)));

const files = fs.readdirSync(problemsDir)
  .filter((name) => name.endsWith('.json'))
  .filter((name) => targetIds.has(path.basename(name, '.json')));

const unresolved = [];

for (const file of files) {
  const filePath = path.join(problemsDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const before = data.requiredFormulas || [];
  const after = mapRequiredFormulas(before);
  data.requiredFormulas = after;

  for (const formula of after) {
    if (typeof formula === 'string' && formula.startsWith('formula_') && !validFormulaIds.has(formula)) {
      unresolved.push({ file: file, formula });
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

if (unresolved.length > 0) {
  const reportPath = path.join(root, 'scripts', 'map-required-formulas-unresolved.json');
  fs.writeFileSync(reportPath, JSON.stringify(unresolved, null, 2), 'utf8');
}
