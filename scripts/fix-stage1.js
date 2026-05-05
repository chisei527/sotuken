const fs = require('fs');
const path = require('path');

const baseDir = 'c:/Users/hasec/Downloads/sotuken/problems';
const stage1Text = '\\[ \\tan\\theta + \\frac{1}{\\tan\\theta} = \\frac{1}{\\sin\\theta\\cos\\theta} \\]';

const num = (n) => ({ type: 'custom_number', fields: { NUM: n } });
const sin = () => ({ type: 'term_sin' });
const cos = () => ({ type: 'term_cos' });
const tan = () => ({ type: 'term_tan' });
const square = (a) => ({ type: 'math_square', inputs: { A: { block: a } } });
const add = (a, b) => ({ type: 'math_add', inputs: { A: { block: a }, B: { block: b } } });
const mult = (a, b) => ({ type: 'math_multiply', inputs: { A: { block: a }, B: { block: b } } });
const frac = (n, d) => ({ type: 'math_fraction', inputs: { NUMERATOR: { block: n }, DENOMINATOR: { block: d } } });

const buildOperations = () => {
  const sinOverCos = frac(sin(), cos());
  const cosOverSin = frac(cos(), sin());
  const oneOverTan = frac(num(1), tan());
  const sinCos = mult(sin(), cos());
  const sin2PlusCos2 = add(square(sin()), square(cos()));
  const fracSin2Cos2 = frac(sin2PlusCos2, sinCos);
  const oneOverSinCos = frac(num(1), sinCos);

  return {
    type: 'replace_operation',
    inputs: {
      VALUE: { block: tan() },
      FORMULA: { block: { type: 'formula_2' } },
      REPLACEMENT: { block: sinOverCos },
    },
    next: {
      block: {
        type: 'replace_operation',
        inputs: {
          VALUE: { block: oneOverTan },
          FORMULA: { block: { type: 'formula_2' } },
          REPLACEMENT: { block: cosOverSin },
        },
        next: {
          block: {
            type: 'common_denominator_operation',
            inputs: {
              VALUE: { block: add(sinOverCos, cosOverSin) },
              REPLACEMENT: { block: fracSin2Cos2 },
            },
            next: {
              block: {
                type: 'replace_operation',
                inputs: {
                  VALUE: { block: fracSin2Cos2 },
                  FORMULA: { block: { type: 'formula_1' } },
                  REPLACEMENT: { block: oneOverSinCos },
                },
                next: {
                  block: {
                    type: 'conclusion_operation',
                    inputs: {
                      VALUE: { block: oneOverSinCos },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };
};

const newHints = [
  'まずは tanθ を公式②で sinθ/cosθ に置き換える。',
  '1/tanθ も公式②を使って cosθ/sinθ に変形する。',
  '通分して (sin^2θ + cos^2θ)/(sinθ cosθ) を作る。',
  '分子に公式①を適用して 1/(sinθ cosθ) にする。',
];

const files = fs.readdirSync(baseDir).filter((name) => /^[0-9]+\.json$/.test(name));
let updated = 0;

files.forEach((name) => {
  const filePath = path.join(baseDir, name);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (data.mathText !== stage1Text) return;
  const blocks = data?.answerState?.blocks?.blocks;
  if (!Array.isArray(blocks)) return;
  const proofBlock = blocks.find((b) => b && b.type === 'proof_step');
  if (!proofBlock) return;
  proofBlock.inputs = proofBlock.inputs || {};
  proofBlock.inputs.OPERATIONS = { block: buildOperations() };
  data.hints = newHints.slice();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  updated += 1;
});

console.log(`updated ${updated}`);
