const fs = require('fs');
const path = require('path');

const problemsDir = path.join(__dirname, '..', 'problems');

const baseSet = JSON.parse(String.raw`[
  { "id": "1", "mathText": "\\[ \\frac{\\sin^2\\theta + \\cos^2\\theta}{\\cos^2\\theta} = \\frac{1}{\\cos^2\\theta} \\]", "requiredFormulas": ["formula_1"] },
  { "id": "2", "mathText": "\\[ \\frac{\\sin^2\\theta + \\cos^2\\theta}{\\sin^2\\theta} = \\frac{1}{\\sin^2\\theta} \\]", "requiredFormulas": ["formula_1"] },
  { "id": "3", "mathText": "\\[ \\frac{1}{1 - \\sin\\theta} + \\frac{1}{1 + \\sin\\theta} = \\frac{2}{\\cos^2\\theta} \\]", "requiredFormulas": ["formula_1"] },
  { "id": "4", "mathText": "\\[ \\frac{\\sin\\theta}{1 + \\cos\\theta} + \\frac{1 + \\cos\\theta}{\\sin\\theta} = \\frac{2}{\\sin\\theta} \\]", "requiredFormulas": ["formula_1"] },
  { "id": "5", "mathText": "\\[ \\frac{\\sin\\theta + \\cos\\theta - 1}{\\sin\\theta - \\cos\\theta + 1} = \\frac{\\sin\\theta}{1 + \\cos\\theta} \\]", "requiredFormulas": ["formula_1"] },

  { "id": "6", "mathText": "\\[ \\cos\\theta \\times \\tan\\theta = \\sin\\theta \\]", "requiredFormulas": ["formula_2"] },
  { "id": "7", "mathText": "\\[ \\frac{\\tan\\theta}{\\sin\\theta} = \\frac{1}{\\cos\\theta} \\]", "requiredFormulas": ["formula_2"] },
  { "id": "8", "mathText": "\\[ \\frac{\\sin\\theta}{\\tan\\theta} = \\cos\\theta \\]", "requiredFormulas": ["formula_2"] },
  { "id": "9", "mathText": "\\[ \\sin\\theta \\times \\frac{1}{\\tan\\theta} = \\cos\\theta \\]", "requiredFormulas": ["formula_2"] },
  { "id": "10", "mathText": "\\[ \\tan\\theta \\times \\frac{\\cos\\theta}{\\sin\\theta} = 1 \\]", "requiredFormulas": ["formula_2"] },

  { "id": "11", "mathText": "\\[ \\cos^2\\theta \\times (1 + \\tan^2\\theta) = 1 \\]", "requiredFormulas": ["formula_3"] },
  { "id": "12", "mathText": "\\[ \\frac{1}{1 + \\tan^2\\theta} = \\cos^2\\theta \\]", "requiredFormulas": ["formula_3"] },
  { "id": "13", "mathText": "\\[ \\frac{1}{\\cos^2\\theta} - \\tan^2\\theta = 1 \\]", "requiredFormulas": ["formula_3"] },
  { "id": "14", "mathText": "\\[ \\frac{1}{\\cos^2\\theta} - 1 = \\tan^2\\theta \\]", "requiredFormulas": ["formula_3"] },
  { "id": "15", "mathText": "\\[ (1 + \\tan^2\\theta) - \\frac{1}{\\cos^2\\theta} = 0 \\]", "requiredFormulas": ["formula_3"] },

  { "id": "16", "mathText": "\\[ \\tan\\theta + \\frac{1}{\\tan\\theta} = \\frac{1}{\\sin\\theta\\cos\\theta} \\]", "requiredFormulas": ["formula_1", "formula_2"] },
  { "id": "17", "mathText": "\\[ \\sin^2\\theta \\times (1 + \\frac{1}{\\tan^2\\theta}) = 1 \\]", "requiredFormulas": ["formula_1", "formula_2"] },
  { "id": "18", "mathText": "\\[ \\tan^2\\theta - \\sin^2\\theta = \\tan^2\\theta\\sin^2\\theta \\]", "requiredFormulas": ["formula_1", "formula_2"] },

  { "id": "19", "mathText": "\\[ \\sin^2\\theta + \\cos^2\\theta + \\tan^2\\theta = \\frac{1}{\\cos^2\\theta} \\]", "requiredFormulas": ["formula_1", "formula_3"] },
  { "id": "20", "mathText": "\\[ \\frac{1}{\\cos^2\\theta} - (\\sin^2\\theta + \\cos^2\\theta) = \\tan^2\\theta \\]", "requiredFormulas": ["formula_1", "formula_3"] },
  { "id": "21", "mathText": "\\[ (1 + \\tan^2\\theta) + \\sin^2\\theta + \\cos^2\\theta = \\frac{1}{\\cos^2\\theta} + 1 \\]", "requiredFormulas": ["formula_1", "formula_3"] },

  { "id": "22", "mathText": "\\[ \\sin^2\\theta (1 + \\tan^2\\theta) = \\tan^2\\theta \\]", "requiredFormulas": ["formula_2", "formula_3"] },
  { "id": "23", "mathText": "\\[ \\frac{\\tan^2\\theta}{1 + \\tan^2\\theta} = \\sin^2\\theta \\]", "requiredFormulas": ["formula_2", "formula_3"] },
  { "id": "24", "mathText": "\\[ \\frac{1}{\\cos^2\\theta} - \\frac{\\sin^2\\theta}{\\cos^2\\theta} = 1 \\]", "requiredFormulas": ["formula_2", "formula_3"] },

  { "id": "25", "mathText": "\\[ \\sin^2\\theta + \\cos^2\\theta + \\frac{\\sin^2\\theta}{\\cos^2\\theta} = \\frac{1}{\\cos^2\\theta} \\]", "requiredFormulas": ["formula_1", "formula_2", "formula_3"] },

  { "id": "26", "mathText": "\\[ \\sin^2(\\frac{\\pi}{3}) + \\cos^2(\\frac{\\pi}{3}) = 1 \\]", "requiredFormulas": ["formula_1"] },
  { "id": "27", "mathText": "\\[ \\sin^2(\\frac{\\pi}{4}) + \\cos^2(\\frac{\\pi}{4}) = 1 \\]", "requiredFormulas": ["formula_1"] },
  { "id": "28", "mathText": "\\[ \\sin^2(\\frac{\\pi}{6}) + \\cos^2(\\frac{\\pi}{6}) = 1 \\]", "requiredFormulas": ["formula_1"] },

  { "id": "29", "mathText": "\\[ \\tan(\\frac{\\pi}{6}) = \\frac{\\sin(\\frac{\\pi}{6})}{\\cos(\\frac{\\pi}{6})} \\]", "requiredFormulas": ["formula_2"] },
  { "id": "30", "mathText": "\\[ \\tan(\\frac{\\pi}{4}) = \\frac{\\sin(\\frac{\\pi}{4})}{\\cos(\\frac{\\pi}{4})} \\]", "requiredFormulas": ["formula_2"] },
  { "id": "31", "mathText": "\\[ \\tan(\\frac{\\pi}{3}) = \\frac{\\sin(\\frac{\\pi}{3})}{\\cos(\\frac{\\pi}{3})} \\]", "requiredFormulas": ["formula_2"] },

  { "id": "32", "mathText": "\\[ 1 + \\tan^2(\\frac{\\pi}{6}) = \\frac{1}{\\cos^2(\\frac{\\pi}{6})} \\]", "requiredFormulas": ["formula_3"] },
  { "id": "33", "mathText": "\\[ 1 + \\tan^2(\\frac{\\pi}{4}) = \\frac{1}{\\cos^2(\\frac{\\pi}{4})} \\]", "requiredFormulas": ["formula_3"] },
  { "id": "34", "mathText": "\\[ 1 + \\tan^2(\\frac{\\pi}{3}) = \\frac{1}{\\cos^2(\\frac{\\pi}{3})} \\]", "requiredFormulas": ["formula_3"] },

  { "id": "35", "mathText": "\\[ \\tan(\\frac{\\pi}{4}) + \\frac{1}{\\tan(\\frac{\\pi}{4})} = \\frac{1}{\\sin(\\frac{\\pi}{4})\\cos(\\frac{\\pi}{4})} \\]", "requiredFormulas": ["formula_1", "formula_2"] },
  { "id": "36", "mathText": "\\[ \\sin^2(\\frac{\\pi}{6}) (1 + \\frac{1}{\\tan^2(\\frac{\\pi}{6})}) = 1 \\]", "requiredFormulas": ["formula_1", "formula_2"] },
  { "id": "37", "mathText": "\\[ \\tan^2(\\frac{\\pi}{3}) - \\sin^2(\\frac{\\pi}{3}) = \\tan^2(\\frac{\\pi}{3})\\sin^2(\\frac{\\pi}{3}) \\]", "requiredFormulas": ["formula_1", "formula_2"] },

  { "id": "38", "mathText": "\\[ \\sin^2(\\frac{\\pi}{4}) + \\cos^2(\\frac{\\pi}{4}) + \\tan^2(\\frac{\\pi}{4}) = \\frac{1}{\\cos^2(\\frac{\\pi}{4})} \\]", "requiredFormulas": ["formula_1", "formula_3"] },
  { "id": "39", "mathText": "\\[ \\frac{1}{\\cos^2(\\frac{\\pi}{6})} - (\\sin^2(\\frac{\\pi}{6}) + \\cos^2(\\frac{\\pi}{6})) = \\tan^2(\\frac{\\pi}{6}) \\]", "requiredFormulas": ["formula_1", "formula_3"] },

  { "id": "40", "mathText": "\\[ \\sin^2(\\frac{\\pi}{3}) (1 + \\tan^2(\\frac{\\pi}{3})) = \\tan^2(\\frac{\\pi}{3}) \\]", "requiredFormulas": ["formula_2", "formula_3"] },
  { "id": "41", "mathText": "\\[ \\frac{\\tan^2(\\frac{\\pi}{4})}{1 + \\tan^2(\\frac{\\pi}{4})} = \\sin^2(\\frac{\\pi}{4}) \\]", "requiredFormulas": ["formula_2", "formula_3"] },

  { "id": "42", "mathText": "\\[ \\sin^2(\\frac{\\pi}{6}) + \\cos^2(\\frac{\\pi}{6}) + \\frac{\\sin^2(\\frac{\\pi}{6})}{\\cos^2(\\frac{\\pi}{6})} = \\frac{1}{\\cos^2(\\frac{\\pi}{6})} \\]", "requiredFormulas": ["formula_1", "formula_2", "formula_3"] },
  { "id": "43", "mathText": "\\[ \\sin^2(\\frac{\\pi}{4}) + \\cos^2(\\frac{\\pi}{4}) + \\frac{\\sin^2(\\frac{\\pi}{4})}{\\cos^2(\\frac{\\pi}{4})} = \\frac{1}{\\cos^2(\\frac{\\pi}{4})} \\]", "requiredFormulas": ["formula_1", "formula_2", "formula_3"] }
]`);

const doubleAngleSet = JSON.parse(String.raw`[
  { "id": "101", "mathText": "\\[ \\frac{\\sin 2\\theta}{2\\sin\\theta} = \\cos\\theta \\]", "requiredFormulas": ["formula_4"] },
  { "id": "102", "mathText": "\\[ (\\sin\\theta + \\cos\\theta)^2 = 1 + \\sin 2\\theta \\]", "requiredFormulas": ["formula_1", "formula_4"] },
  { "id": "103", "mathText": "\\[ \\frac{\\sin 2\\theta}{1 + \\cos 2\\theta} = \\tan\\theta \\]", "requiredFormulas": ["formula_4", "formula_5", "formula_2"] },

  { "id": "104", "mathText": "\\[ \\frac{1 + \\cos 2\\theta}{2} = \\cos^2\\theta \\]", "requiredFormulas": ["formula_5"] },
  { "id": "105", "mathText": "\\[ 2\\cos^2\\theta - \\cos 2\\theta = 1 \\]", "requiredFormulas": ["formula_5"] },
  { "id": "106", "mathText": "\\[ \\frac{\\cos 2\\theta + 1}{2\\cos\\theta} = \\cos\\theta \\]", "requiredFormulas": ["formula_5"] },

  { "id": "107", "mathText": "\\[ \\frac{1 - \\cos 2\\theta}{2} = \\sin^2\\theta \\]", "requiredFormulas": ["formula_6"] },
  { "id": "108", "mathText": "\\[ 1 - 2\\sin^2\\theta - \\cos 2\\theta = 0 \\]", "requiredFormulas": ["formula_6"] },
  { "id": "109", "mathText": "\\[ \\frac{1 - \\cos 2\\theta}{\\sin 2\\theta} = \\tan\\theta \\]", "requiredFormulas": ["formula_6", "formula_4", "formula_2"] },

  { "id": "110", "mathText": "\\[ \\tan 2\\theta (1 - \\tan^2\\theta) = 2\\tan\\theta \\]", "requiredFormulas": ["formula_16"] },
  { "id": "111", "mathText": "\\[ \\frac{2\\tan\\theta}{\\tan 2\\theta} = 1 - \\tan^2\\theta \\]", "requiredFormulas": ["formula_16"] },
  { "id": "112", "mathText": "\\[ \\frac{1}{\\tan 2\\theta} = \\frac{1 - \\tan^2\\theta}{2\\tan\\theta} \\]", "requiredFormulas": ["formula_16"] },

  { "id": "113", "mathText": "\\[ \\sin(\\theta + \\frac{\\pi}{2}) = \\cos\\theta \\]", "requiredFormulas": ["formula_addition_sin"] },
  { "id": "114", "mathText": "\\[ \\sin(\\theta + \\frac{\\pi}{4}) = \\frac{\\sqrt{2}}{2}(\\sin\\theta + \\cos\\theta) \\]", "requiredFormulas": ["formula_addition_sin"] },
  { "id": "115", "mathText": "\\[ \\sin(\\theta + \\frac{\\pi}{6}) + \\sin(\\theta - \\frac{\\pi}{6}) = \\sqrt{3}\\sin\\theta \\]", "requiredFormulas": ["formula_addition_sin"] },

  { "id": "116", "mathText": "\\[ \\cos(\\theta - \\frac{\\pi}{2}) = \\sin\\theta \\]", "requiredFormulas": ["formula_addition_cos"] },
  { "id": "117", "mathText": "\\[ \\cos(\\theta + \\frac{\\pi}{4}) = \\frac{\\sqrt{2}}{2}(\\cos\\theta - \\sin\\theta) \\]", "requiredFormulas": ["formula_addition_cos"] },
  { "id": "118", "mathText": "\\[ \\cos(\\theta + \\frac{\\pi}{3}) + \\cos(\\theta - \\frac{\\pi}{3}) = \\cos\\theta \\]", "requiredFormulas": ["formula_addition_cos"] },

  { "id": "119", "mathText": "\\[ \\tan(\\theta + \\frac{\\pi}{4}) = \\frac{1 + \\tan\\theta}{1 - \\tan\\theta} \\]", "requiredFormulas": ["formula_addition_tan"] },
  { "id": "120", "mathText": "\\[ \\tan(\\theta - \\frac{\\pi}{4}) = \\frac{\\tan\\theta - 1}{1 + \\tan\\theta} \\]", "requiredFormulas": ["formula_addition_tan"] },
  { "id": "121", "mathText": "\\[ \\tan(\\theta + \\pi) = \\tan\\theta \\]", "requiredFormulas": ["formula_addition_tan"] }
]`);

const fractionSet = JSON.parse(String.raw`[
  { "id": "122", "mathText": "\\[ \\frac{1}{1 - \\sin\\theta} + \\frac{1}{1 + \\sin\\theta} = \\frac{2}{\\cos^2\\theta} \\\\]", "requiredFormulas": ["formula_1"] },
  { "id": "123", "mathText": "\\[ \\frac{\\sin\\theta}{1 + \\cos\\theta} + \\frac{1 + \\cos\\theta}{\\sin\\theta} = \\frac{2}{\\sin\\theta} \\\\]", "requiredFormulas": ["formula_1"] },
  { "id": "124", "mathText": "\\[ \\frac{\\cos\\theta}{1 - \\sin\\theta} = \\frac{1 + \\sin\\theta}{\\cos\\theta} \\\\]", "requiredFormulas": ["formula_1"] },

  { "id": "125", "mathText": "\\[ \\frac{1 - \\tan\\theta}{1 + \\tan\\theta} = \\frac{\\cos\\theta - \\sin\\theta}{\\cos\\theta + \\sin\\theta} \\\\]", "requiredFormulas": ["formula_2"] },
  { "id": "126", "mathText": "\\[ \\frac{\\frac{1}{\\sin\\theta} - \\frac{1}{\\tan\\theta}}{\\frac{1}{\\sin\\theta} + \\frac{1}{\\tan\\theta}} = \\frac{1 - \\cos\\theta}{1 + \\cos\\theta} \\\\]", "requiredFormulas": ["formula_2"] },

  { "id": "127", "mathText": "\\[ \\frac{1}{1 + \\tan^2\\theta} + \\frac{\\tan^2\\theta}{1 + \\tan^2\\theta} = 1 \\\\]", "requiredFormulas": ["formula_3"] },
  { "id": "128", "mathText": "\\[ \\frac{1}{\\cos^2\\theta} - \\frac{1}{1 + \\tan^2\\theta} = \\tan^2\\theta \\\\]", "requiredFormulas": ["formula_3"] },

  { "id": "129", "mathText": "\\[ \\frac{1}{\\tan\\theta} + \\tan\\theta = \\frac{1}{\\sin\\theta\\cos\\theta} \\\\]", "requiredFormulas": ["formula_1", "formula_2"] },
  { "id": "130", "mathText": "\\[ \\frac{1 + \\sin\\theta}{\\cos\\theta} + \\frac{\\cos\\theta}{1 + \\sin\\theta} = \\frac{2}{\\cos\\theta} \\\\]", "requiredFormulas": ["formula_1", "formula_2"] },
  { "id": "131", "mathText": "\\[ \\frac{\\sin\\theta}{1 - \\cos\\theta} - \\frac{1}{\\tan\\theta} = \\frac{1}{\\sin\\theta} \\\\]", "requiredFormulas": ["formula_1", "formula_2"] },

  { "id": "132", "mathText": "\\[ \\frac{1}{1-\\sin\\theta} + \\frac{1}{1+\\sin\\theta} = 2(1+\\tan^2\\theta) \\\\]", "requiredFormulas": ["formula_1", "formula_3"] },
  { "id": "133", "mathText": "\\[ (1 - \\sin^2\\theta)(1 + \\tan^2\\theta) = 1 \\\\]", "requiredFormulas": ["formula_1", "formula_3"] },

  { "id": "134", "mathText": "\\[ \\frac{1 - \\tan^2\\theta}{1 + \\tan^2\\theta} = \\cos^2\\theta - \\sin^2\\theta \\\\]", "requiredFormulas": ["formula_2", "formula_3"] },
  { "id": "135", "mathText": "\\[ \\frac{\\tan\\theta + \\frac{1}{\\tan\\theta}}{1 + \\tan^2\\theta} = \\frac{1}{\\tan\\theta} \\\\]", "requiredFormulas": ["formula_2", "formula_3"] },

  { "id": "136", "mathText": "\\[ \\frac{\\sin\\theta + \\tan\\theta}{1 + \\cos\\theta} = \\tan\\theta \\\\]", "requiredFormulas": ["formula_1", "formula_2", "formula_3"] },
  { "id": "137", "mathText": "\\[ \\frac{1}{\\cos^2\\theta} - \\frac{\\sin^2\\theta}{\\cos^2\\theta} - \\tan^2\\theta(1-\\sin^2\\theta) = 0 \\\\]", "requiredFormulas": ["formula_1", "formula_2", "formula_3"] },

  { "id": "138", "mathText": "\\[ \\frac{1}{1 - \\sin(\\frac{\\pi}{6})} + \\frac{1}{1 + \\sin(\\frac{\\pi}{6})} = \\frac{2}{\\cos^2(\\frac{\\pi}{6})} \\\\]", "requiredFormulas": ["formula_1"] },
  { "id": "139", "mathText": "\\[ \\frac{1 - \\tan(\\frac{\\pi}{3})}{1 + \\tan(\\frac{\\pi}{3})} = \\frac{\\cos(\\frac{\\pi}{3}) - \\sin(\\frac{\\pi}{3})}{\\cos(\\frac{\\pi}{3}) + \\sin(\\frac{\\pi}{3})} \\\\]", "requiredFormulas": ["formula_2"] },
  { "id": "140", "mathText": "\\[ \\frac{1}{\\tan(\\frac{\\pi}{4})} + \\tan(\\frac{\\pi}{4}) = \\frac{1}{\\sin(\\frac{\\pi}{4})\\cos(\\frac{\\pi}{4})} \\\\]", "requiredFormulas": ["formula_1", "formula_2"] },
  { "id": "141", "mathText": "\\[ \\frac{1}{1-\\sin(\\frac{\\pi}{4})} + \\frac{1}{1+\\sin(\\frac{\\pi}{4})} = 2(1+\\tan^2(\\frac{\\pi}{4})) \\\\]", "requiredFormulas": ["formula_1", "formula_3"] }
]`);

const REQUIRED_BLOCKS = [
  '"type":"replace_operation"',
  '"type":"common_denominator_operation"',
  '"type":"conclusion_operation"',
];

const FORMULA_DEMO = {
  formula_1: {
    before: '\\sin^2\\theta + \\cos^2\\theta',
    after: '1',
  },
  formula_2: {
    before: '\\tan\\theta',
    after: '\\frac{\\sin\\theta}{\\cos\\theta}',
  },
  formula_3: {
    before: '1 + \\tan^2\\theta',
    after: '\\frac{1}{\\cos^2\\theta}',
  },
  formula_4: {
    before: '\\sin 2\\theta',
    after: '2\\sin\\theta\\cos\\theta',
  },
  formula_5: {
    before: '\\sin^2\\theta',
    after: '\\frac{1 - \\cos 2\\theta}{2}',
  },
  formula_6: {
    before: '\\cos^2\\theta',
    after: '\\frac{1 + \\cos 2\\theta}{2}',
  },
  formula_7: {
    before: '\\tan\\theta',
    after: '\\frac{\\sin 2\\theta}{1 + \\cos 2\\theta}',
  },
  formula_8: {
    before: '\\tan^2\\theta',
    after: '\\frac{1 - \\cos 2\\theta}{1 + \\cos 2\\theta}',
  },
  formula_9: {
    before: '(\\sin\\theta + \\cos\\theta)^2',
    after: '\\sin^2\\theta + 2\\sin\\theta\\cos\\theta + \\cos^2\\theta',
  },
  formula_10: {
    before: '\\sin^4\\theta + \\cos^4\\theta + 2\\sin^2\\theta\\cos^2\\theta',
    after: '(\\sin^2\\theta + \\cos^2\\theta)^2',
  },
  formula_11: {
    before: '\\sin^6\\theta + \\cos^6\\theta',
    after: '(\\sin^2\\theta + \\cos^2\\theta)(\\sin^4\\theta - \\sin^2\\theta\\cos^2\\theta + \\cos^4\\theta)',
  },
  formula_12: {
    before: '\\sin 3\\theta',
    after: '3\\sin\\theta - 4\\sin^3\\theta',
  },
  formula_13: {
    before: '\\cos 3\\theta',
    after: '4\\cos^3\\theta - 3\\cos\\theta',
  },
  formula_14: {
    before: '\\sin(\\theta + \\frac{\\pi}{6}) + \\sin(\\theta - \\frac{\\pi}{6})',
    after: '2\\sin\\theta\\cos(\\frac{\\pi}{6})',
  },
  formula_15: {
    before: '\\sin\\theta\\cos(\\frac{\\pi}{6})',
    after: '\\frac{\\sin(\\theta + \\frac{\\pi}{6}) + \\sin(\\theta - \\frac{\\pi}{6})}{2}',
  },
  formula_16: {
    before: '\\tan 2\\theta',
    after: '\\frac{2\\tan\\theta}{1 - \\tan^2\\theta}',
  },
  formula_addition_sin: {
    before: '\\sin(\\theta + \\frac{\\pi}{4})',
    after: '\\sin\\theta\\cos(\\frac{\\pi}{4}) + \\cos\\theta\\sin(\\frac{\\pi}{4})',
  },
  formula_addition_cos: {
    before: '\\cos(\\theta + \\frac{\\pi}{4})',
    after: '\\cos\\theta\\cos(\\frac{\\pi}{4}) - \\sin\\theta\\sin(\\frac{\\pi}{4})',
  },
  formula_addition_tan: {
    before: '\\tan(\\theta + \\frac{\\pi}{4})',
    after: '\\frac{\\tan\\theta + 1}{1 - \\tan\\theta}',
  },
};

const clone = (obj) => JSON.parse(JSON.stringify(obj));

function stripMathDelimiters(text) {
  let cleaned = String(text || '').trim();
  cleaned = cleaned.replace(/^\\\[\s*/, '').replace(/\s*\\\]$/, '');
  cleaned = cleaned.replace(/\\\\+$/g, '').trim();
  return cleaned;
}

function extractSides(mathText) {
  const cleaned = stripMathDelimiters(mathText);
  const eqIndex = cleaned.indexOf('=');
  if (eqIndex === -1) {
    return { left: cleaned.replace(/\\+$/g, '').trim(), right: '' };
  }
  return {
    left: cleaned.slice(0, eqIndex).replace(/\\+$/g, '').trim(),
    right: cleaned.slice(eqIndex + 1).replace(/\\+$/g, '').trim(),
  };
}

function parseGroup(input, startIndex) {
  let i = startIndex;
  if (input[i] !== '{') return null;
  let depth = 0;
  let content = '';
  while (i < input.length) {
    const ch = input[i];
    if (ch === '{') {
      depth += 1;
      if (depth > 1) content += ch;
    } else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return { content, endIndex: i + 1 };
      }
      content += ch;
    } else {
      content += ch;
    }
    i += 1;
  }
  return null;
}

function replaceFrac(input) {
  let out = '';
  let i = 0;
  while (i < input.length) {
    if (input.startsWith('\\frac', i)) {
      i += 5;
      const numGroup = parseGroup(input, i);
      if (!numGroup) {
        out += '\\frac';
        continue;
      }
      i = numGroup.endIndex;
      const denGroup = parseGroup(input, i);
      if (!denGroup) {
        out += `(${replaceFrac(numGroup.content)})/`;
        continue;
      }
      i = denGroup.endIndex;
      const numerator = replaceFrac(numGroup.content);
      const denominator = replaceFrac(denGroup.content);
      out += `(${numerator})/(${denominator})`;
      continue;
    }
    out += input[i];
    i += 1;
  }
  return out;
}

function latexToExpression(latex) {
  let expr = stripMathDelimiters(latex);
  expr = expr.replace(/\\left/g, '').replace(/\\right/g, '');
  expr = replaceFrac(expr);
  expr = expr.replace(/\\times/g, '*').replace(/\\cdot/g, '*');
  expr = expr.replace(/\\sqrt\{2\}/g, 'sqrt2').replace(/\\sqrt\{3\}/g, 'sqrt3');
  expr = expr.replace(/\\sin/g, 'sin').replace(/\\cos/g, 'cos').replace(/\\tan/g, 'tan');
  expr = expr.replace(/\\theta/g, 'theta').replace(/\\pi/g, 'pi');
  expr = expr.replace(/\\/g, '');
  expr = expr.replace(/{/g, '(').replace(/}/g, ')');
  expr = expr.replace(/\s+/g, '');

  expr = expr.replace(/sin\^2\(([^)]+)\)/g, 'sin($1)^2');
  expr = expr.replace(/cos\^2\(([^)]+)\)/g, 'cos($1)^2');
  expr = expr.replace(/tan\^2\(([^)]+)\)/g, 'tan($1)^2');
  expr = expr.replace(/sin\^2theta/g, 'sin(theta)^2');
  expr = expr.replace(/cos\^2theta/g, 'cos(theta)^2');
  expr = expr.replace(/tan\^2theta/g, 'tan(theta)^2');

  expr = expr.replace(/sin(\d+)theta/g, 'sin($1*theta)');
  expr = expr.replace(/cos(\d+)theta/g, 'cos($1*theta)');
  expr = expr.replace(/tan(\d+)theta/g, 'tan($1*theta)');

  expr = expr.replace(/sintheta/g, 'sin(theta)');
  expr = expr.replace(/costheta/g, 'cos(theta)');
  expr = expr.replace(/tantheta/g, 'tan(theta)');

  expr = expr.replace(/\(sqrt2\)\/2/g, 'sqrt2_half');
  expr = expr.replace(/\(sqrt3\)\/2/g, 'sqrt3_half');
  expr = expr.replace(/sqrt2\/2/g, 'sqrt2_half');
  expr = expr.replace(/sqrt3\/2/g, 'sqrt3_half');
  expr = expr.replace(/sqrt2(?!_half)/g, '(2*sqrt2_half)');
  expr = expr.replace(/sqrt3(?!_half)/g, '(2*sqrt3_half)');

  return expr;
}

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (ch === ' ' || ch === '\t' || ch === '\n') {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let num = ch;
      i += 1;
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        num += expr[i];
        i += 1;
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let id = ch;
      i += 1;
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        id += expr[i];
        i += 1;
      }
      tokens.push({ type: 'id', value: id });
      continue;
    }
    if ('+-*/^()'.includes(ch)) {
      tokens.push({ type: 'op', value: ch });
      i += 1;
      continue;
    }
    throw new Error(`Unexpected token: ${ch}`);
  }
  return tokens;
}

function parseExpression(tokens) {
  let index = 0;

  const peek = () => tokens[index] || null;
  const consume = () => tokens[index++] || null;

  const isPrimaryStart = (token) => {
    if (!token) return false;
    if (token.type === 'number') return true;
    if (token.type === 'id') return true;
    return token.type === 'op' && token.value === '(';
  };

  const parsePrimary = () => {
    const token = consume();
    if (!token) throw new Error('Unexpected end of input');
    if (token.type === 'number') {
      return { type: 'number', value: Number(token.value) };
    }
    if (token.type === 'id') {
      if (['sin', 'cos', 'tan'].includes(token.value)) {
        const next = consume();
        if (!next || next.type !== 'op' || next.value !== '(') {
          throw new Error(`Expected '(' after ${token.value}`);
        }
        const inner = parseAddSub();
        const closing = consume();
        if (!closing || closing.type !== 'op' || closing.value !== ')') {
          throw new Error(`Expected ')' after ${token.value}`);
        }
        return { type: 'func', name: token.value, arg: inner };
      }
      return { type: 'symbol', name: token.value };
    }
    if (token.type === 'op' && token.value === '(') {
      const inner = parseAddSub();
      const closing = consume();
      if (!closing || closing.type !== 'op' || closing.value !== ')') {
        throw new Error('Expected )');
      }
      return inner;
    }
    throw new Error(`Unexpected token: ${token.value}`);
  };

  const parseUnary = () => {
    const token = peek();
    if (token && token.type === 'op' && token.value === '-') {
      consume();
      return { type: 'neg', value: parseUnary() };
    }
    return parsePrimary();
  };

  const parsePower = () => {
    let node = parseUnary();
    const token = peek();
    if (token && token.type === 'op' && token.value === '^') {
      consume();
      const right = parsePower();
      node = { type: 'pow', base: node, exp: right };
    }
    return node;
  };

  const parseMulDiv = () => {
    let node = parsePower();
    while (true) {
      const token = peek();
      if (token && token.type === 'op' && (token.value === '*' || token.value === '/')) {
        const op = token.value;
        consume();
        const right = parsePower();
        node = { type: op === '*' ? 'mul' : 'div', left: node, right };
        continue;
      }
      if (isPrimaryStart(token)) {
        const right = parsePower();
        node = { type: 'mul', left: node, right };
        continue;
      }
      break;
    }
    return node;
  };

  const parseAddSub = () => {
    let node = parseMulDiv();
    while (true) {
      const token = peek();
      if (token && token.type === 'op' && (token.value === '+' || token.value === '-')) {
        const op = token.value;
        consume();
        const right = parseMulDiv();
        node = { type: op === '+' ? 'add' : 'sub', left: node, right };
        continue;
      }
      break;
    }
    return node;
  };

  const result = parseAddSub();
  if (index < tokens.length) {
    throw new Error(`Unexpected token: ${tokens[index].value}`);
  }
  return result;
}

const block = (type, extra) => Object.assign({ type }, extra || {});
const numBlock = (value) => block('custom_number', { fields: { NUM: value } });
const termBlock = (type) => block(type);

const addBlock = (a, b) => block('math_add', { inputs: { A: { block: a }, B: { block: b } } });
const negBlock = (a) => block('math_negate', { inputs: { A: { block: a } } });
const mulBlock = (a, b) => block('math_multiply', { inputs: { A: { block: a }, B: { block: b } } });
const divBlock = (a, b) => block('math_fraction', { inputs: { NUMERATOR: { block: a }, DENOMINATOR: { block: b } } });
const squareBlock = (a) => block('math_square', { inputs: { A: { block: a } } });

function buildPower(base, exp) {
  const expValue = Number(exp);
  if (!Number.isFinite(expValue)) return squareBlock(base);
  if (expValue === 2) return squareBlock(base);
  if (expValue === 3) return mulBlock(clone(base), squareBlock(clone(base)));
  if (expValue === 4) return squareBlock(squareBlock(clone(base)));
  if (expValue === 5) return mulBlock(clone(base), squareBlock(squareBlock(clone(base))));
  if (expValue === 6) return mulBlock(squareBlock(clone(base)), squareBlock(squareBlock(clone(base))));
  return squareBlock(base);
}

function buildBlockFromAst(node) {
  if (!node) return numBlock(0);
  switch (node.type) {
    case 'number':
      if (node.value === 0.5) return termBlock('term_half_value');
      return numBlock(node.value);
    case 'symbol':
      if (node.name === 'theta') return termBlock('term_theta');
      if (node.name === 'pi') return termBlock('term_pi');
      if (node.name === 'sqrt2_half') return termBlock('term_sqrt2_half');
      if (node.name === 'sqrt3_half') return termBlock('term_sqrt3_half');
      return numBlock(0);
    case 'func': {
      const argBlock = buildBlockFromAst(node.arg);
      if (node.name === 'sin') {
        return block('term_sin_of', { inputs: { ANGLE: { block: argBlock } } });
      }
      if (node.name === 'cos') {
        return block('term_cos_of', { inputs: { ANGLE: { block: argBlock } } });
      }
      if (node.name === 'tan') {
        return block('term_tan_of', { inputs: { ANGLE: { block: argBlock } } });
      }
      return numBlock(0);
    }
    case 'add':
      return addBlock(buildBlockFromAst(node.left), buildBlockFromAst(node.right));
    case 'sub':
      return addBlock(buildBlockFromAst(node.left), negBlock(buildBlockFromAst(node.right)));
    case 'mul':
      return mulBlock(buildBlockFromAst(node.left), buildBlockFromAst(node.right));
    case 'div':
      return divBlock(buildBlockFromAst(node.left), buildBlockFromAst(node.right));
    case 'pow': {
      const baseBlock = buildBlockFromAst(node.base);
      if (node.exp && node.exp.type === 'number') {
        return buildPower(baseBlock, node.exp.value);
      }
      return squareBlock(baseBlock);
    }
    case 'neg':
      return negBlock(buildBlockFromAst(node.value));
    default:
      return numBlock(0);
  }
}

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

function buildAnswerState(leftBlock, rightBlock, requiredFormulas) {
  const ops = [];
  let lastAfter = null;

  (requiredFormulas || []).forEach((formulaId) => {
    const demo = FORMULA_DEMO[formulaId];
    if (!demo) return;
    const beforeBlock = buildExpressionBlock(demo.before);
    const afterBlock = buildExpressionBlock(demo.after);
    const opBlock = {
      type: 'replace_operation',
      inputs: {
        VALUE: { block: beforeBlock },
        FORMULA: { block: { type: formulaId } },
        REPLACEMENT: { block: afterBlock },
      },
    };
    ops.push(opBlock);
    lastAfter = afterBlock;
  });

  const fallbackAfter = lastAfter ? clone(lastAfter) : clone(leftBlock);
  const commonOp = {
    type: 'common_denominator_operation',
    inputs: {
      VALUE: { block: clone(fallbackAfter) },
      REPLACEMENT: { block: clone(fallbackAfter) },
    },
  };
  ops.push(commonOp);

  const conclusionOp = {
    type: 'conclusion_operation',
    inputs: {
      VALUE: { block: clone(rightBlock) },
    },
  };

  for (let i = 0; i < ops.length - 1; i += 1) {
    ops[i].next = { block: ops[i + 1] };
  }
  ops[ops.length - 1].next = { block: conclusionOp };

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
            OPERATIONS: { block: ops[0] },
          },
        },
      ],
    },
  };
}

function buildExpressionBlock(latexExpr) {
  const expr = latexToExpression(latexExpr);
  const tokens = tokenize(expr);
  const ast = parseExpression(tokens);
  return buildBlockFromAst(ast);
}

function updateProblemFile(entry) {
  const id = Number(entry.id);
  const filePath = path.join(problemsDir, `${id}.json`);
  const { left, right } = extractSides(entry.mathText);

  let leftBlock = null;
  let rightBlock = null;
  try {
    leftBlock = buildExpressionBlock(left);
    rightBlock = buildExpressionBlock(right);
  } catch (error) {
    console.warn(`[WARN] Failed to parse problem ${id}: ${error.message}`);
    leftBlock = numBlock(0);
    rightBlock = numBlock(0);
  }

  const data = {
    id,
    title: `問題 ${id}`,
    description: '数式を証明せよ。',
    startExpression: left,
    goalExpression: right,
    mathText: entry.mathText,
    requiredBlocks: REQUIRED_BLOCKS,
    requiredFormulas: entry.requiredFormulas || [],
    initialState: buildInitialState(leftBlock, rightBlock),
    answerState: buildAnswerState(leftBlock, rightBlock, entry.requiredFormulas || []),
  };

  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

const allEntries = [...baseSet, ...doubleAngleSet, ...fractionSet];
allEntries.forEach((entry) => updateProblemFile(entry));

console.log(`Rebuilt ${allEntries.length} problem files.`);
