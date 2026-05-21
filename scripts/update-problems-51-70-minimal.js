const fs = require('fs');
const path = require('path');

const problemsDir = path.join(__dirname, '..', 'problems');

const clone = (obj) => JSON.parse(JSON.stringify(obj));

const block = (type, extra) => Object.assign({ type }, extra || {});
const num = (value) => block('custom_number', { fields: { NUM: value } });
const term = (type) => block(type);

const theta = () => term('term_theta');
const twoTheta = () => term('term_two_theta');
const threeTheta = () => term('term_three_theta');
const fourTheta = () => term('term_four_theta');
const fiveTheta = () => term('term_five_theta');
const piQuarter = () => term('term_pi_quarter');

const sin = () => term('term_sin');
const cos = () => term('term_cos');
const tan = () => term('term_tan');

const sinOf = (angle) => block('term_sin_of', { inputs: { ANGLE: { block: angle } } });
const cosOf = (angle) => block('term_cos_of', { inputs: { ANGLE: { block: angle } } });
const tanOf = (angle) => block('term_tan_of', { inputs: { ANGLE: { block: angle } } });

const add = (a, b) => block('math_add', { inputs: { A: { block: a }, B: { block: b } } });
const neg = (a) => block('math_negate', { inputs: { A: { block: a } } });
const mul = (a, b) => block('math_multiply', { inputs: { A: { block: a }, B: { block: b } } });
const frac = (numerator, denominator) => block('math_fraction', {
  inputs: { NUMERATOR: { block: numerator }, DENOMINATOR: { block: denominator } },
});
const sq = (a) => block('math_square', { inputs: { A: { block: a } } });

const sin2 = () => sq(sin());
const cos2 = () => sq(cos());
const tan2 = () => sq(tan());
const sin4 = () => sq(sin2());
const cos4 = () => sq(cos2());
const sin6 = () => mul(sin2(), mul(sin2(), sin2()));
const cos6 = () => mul(cos2(), mul(cos2(), cos2()));
const sin3 = () => mul(sin(), sin2());
const cos3 = () => mul(cos(), cos2());

const sin2theta = () => sinOf(twoTheta());
const cos2theta = () => cosOf(twoTheta());
const sin3theta = () => sinOf(threeTheta());
const cos3theta = () => cosOf(threeTheta());
const sin4theta = () => sinOf(fourTheta());
const sin5theta = () => sinOf(fiveTheta());

const leftRightById = {
  51: {
    left: add(add(sin4(), neg(cos4())), mul(num(2), cos2())),
    right: num(1),
  },
  52: {
    left: add(sq(add(sin(), cos())), sq(add(sin(), neg(cos())))),
    right: num(2),
  },
  53: {
    left: add(add(sin4(), cos4()), mul(num(2), mul(sin2(), cos2()))),
    right: num(1),
  },
  54: {
    left: add(tan2(), neg(sin2())),
    right: mul(tan2(), sin2()),
  },
  55: {
    left: frac(add(num(1), neg(cos2theta())), sin2theta()),
    right: tan(),
  },
  56: {
    left: add(mul(num(2), cos2()), neg(cos2theta())),
    right: num(1),
  },
  57: {
    left: frac(add(num(1), neg(cos2theta())), add(num(1), cos2theta())),
    right: tan2(),
  },
  58: {
    left: mul(num(4), mul(sin(), mul(cos(), cos2theta()))),
    right: sin4theta(),
  },
  59: {
    left: add(frac(sin3theta(), sin()), neg(frac(cos3theta(), cos()))),
    right: num(2),
  },
  60: {
    left: add(cos3theta(), mul(num(3), cos())),
    right: mul(num(4), cos3()),
  },
  61: {
    left: add(sin5theta(), sin()),
    right: mul(num(2), mul(sin3theta(), cos2theta())),
  },
  62: {
    left: add(mul(num(2), mul(sin3theta(), cos())), neg(sin4theta())),
    right: sin2theta(),
  },
  63: {
    left: add(
      frac(num(1), add(num(1), neg(sin()))),
      frac(num(1), add(num(1), sin())),
    ),
    right: frac(num(2), cos2()),
  },
  64: {
    left: add(frac(num(1), tan()), tan()),
    right: frac(num(2), sin2theta()),
  },
  65: {
    left: add(
      frac(sin(), add(num(1), cos())),
      frac(add(num(1), cos()), sin()),
    ),
    right: frac(num(2), sin()),
  },
  66: {
    left: frac(sin2theta(), add(num(1), cos2theta())),
    right: tan(),
  },
  67: {
    left: frac(
      add(add(sin(), cos()), neg(num(1))),
      add(add(sin(), neg(cos())), num(1)),
    ),
    right: frac(sin(), add(num(1), cos())),
  },
  68: {
    left: add(add(sin6(), cos6()), mul(num(3), mul(sin2(), cos2()))),
    right: num(1),
  },
  69: {
    left: frac(add(num(1), tan()), add(num(1), neg(tan()))),
    right: tanOf(add(theta(), piQuarter())),
  },
  70: {
    left: add(
      frac(add(cos3(), neg(cos3theta())), cos()),
      frac(add(sin3(), sin3theta()), sin()),
    ),
    right: num(3),
  },
};

function placeTop(blockData, x, y) {
  const placed = clone(blockData);
  placed.x = x;
  placed.y = y;
  return placed;
}

function buildInitialState(leftBlock, rightBlock) {
  return {
    blocks: {
      languageVersion: 0,
      blocks: [
        placeTop(leftBlock, 50, 50),
        placeTop(rightBlock, 600, 50),
        { type: 'proof_step', x: 50, y: 150 },
      ],
    },
  };
}

function buildAnswerState(leftBlock, rightBlock) {
  const conclusion = {
    type: 'conclusion_operation',
    inputs: {
      VALUE: { block: clone(rightBlock) },
    },
  };

  return {
    blocks: {
      languageVersion: 0,
      blocks: [
        placeTop(leftBlock, 50, 50),
        placeTop(rightBlock, 600, 50),
        {
          type: 'proof_step',
          x: 50,
          y: 150,
          inputs: {
            OPERATIONS: { block: conclusion },
          },
        },
      ],
    },
  };
}

function updateProblemFile(id, leftBlock, rightBlock) {
  const filePath = path.join(problemsDir, `${id}.json`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  data.initialState = buildInitialState(leftBlock, rightBlock);
  data.answerState = buildAnswerState(leftBlock, rightBlock);

  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

Object.entries(leftRightById).forEach(([id, payload]) => {
  updateProblemFile(Number(id), payload.left, payload.right);
});

console.log('Updated problems 51-70 with minimal states.');
