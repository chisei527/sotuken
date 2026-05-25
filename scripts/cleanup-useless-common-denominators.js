/*
  Cleanup script: remove useless common_denominator_operation blocks from problem JSON.

  Criteria (heuristic):
  - common_denominator_operation whose VALUE/REPLACEMENT contains no fraction at all, OR
  - VALUE and REPLACEMENT are structurally identical, OR
  - both sides have <= 1 fraction and denominators are identical, OR
  - both sides have >= 1 fractions and the set of denominators is identical ("denominator didn't change").

  Also removes "common_denominator_operation" from requiredBlocks when no remaining common-denom ops exist.

  Usage:
    node scripts/cleanup-useless-common-denominators.js --write
    node scripts/cleanup-useless-common-denominators.js --dry
*/

const fs = require('fs');
const path = require('path');

const argv = new Set(process.argv.slice(2));
const WRITE = argv.has('--write');
const DRY = argv.has('--dry') || !WRITE;

const ROOT = path.join(__dirname, '..');
const PROBLEMS_DIR = path.join(ROOT, 'problems');

function listJsonFiles(dirPath) {
  const out = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      out.push(...listJsonFiles(full));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
      out.push(full);
    }
  }
  return out;
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const keys = Object.keys(value).sort();
  const items = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`);
  return `{${items.join(',')}}`;
}

function deepClone(obj) {
  return obj == null ? obj : JSON.parse(JSON.stringify(obj));
}

function stripPresentationFields(block) {
  if (!block || typeof block !== 'object') return;
  delete block.x;
  delete block.y;
  delete block.id;

  if (block.next && typeof block.next === 'object') {
    stripPresentationFields(block.next.block);
  }
  if (block.inputs && typeof block.inputs === 'object') {
    for (const input of Object.values(block.inputs)) {
      if (input && typeof input === 'object' && input.block) {
        stripPresentationFields(input.block);
      }
    }
  }
}

function normalizeBlockForCompare(block) {
  const cloned = deepClone(block);
  stripPresentationFields(cloned);
  return cloned;
}

function walkSerializedBlock(block, visitor) {
  if (!block || typeof block !== 'object') return;
  visitor(block);

  // value inputs
  if (block.inputs && typeof block.inputs === 'object') {
    for (const input of Object.values(block.inputs)) {
      if (input && typeof input === 'object' && input.block) {
        walkSerializedBlock(input.block, visitor);
      }
    }
  }

  // next statement chain
  if (block.next && typeof block.next === 'object' && block.next.block) {
    walkSerializedBlock(block.next.block, visitor);
  }
}

function collectFractionDenominatorBlocks(rootBlock) {
  const denominators = [];
  walkSerializedBlock(rootBlock, (node) => {
    if (!node || node.type !== 'math_fraction') return;
    const denom = node?.inputs?.DENOMINATOR?.block || null;
    if (denom) denominators.push(denom);
  });
  return denominators;
}

function denominatorsSignature(rootBlock) {
  const denoms = collectFractionDenominatorBlocks(rootBlock);
  const normalized = denoms.map((d) => stableStringify(normalizeBlockForCompare(d)));
  normalized.sort();
  return {
    countFractions: denoms.length,
    signature: normalized.join('|'),
  };
}

function isUselessCommonDenominatorOp(commonOp) {
  const valueBlock = commonOp?.inputs?.VALUE?.block || null;
  const replBlock = commonOp?.inputs?.REPLACEMENT?.block || null;
  if (!valueBlock || !replBlock) return false;

  const valueNorm = stableStringify(normalizeBlockForCompare(valueBlock));
  const replNorm = stableStringify(normalizeBlockForCompare(replBlock));
  if (valueNorm === replNorm) return true;

  const before = denominatorsSignature(valueBlock);
  const after = denominatorsSignature(replBlock);

  // 分数が全く無いのに通分している
  if (before.countFractions === 0 && after.countFractions === 0) return true;

  // 分母が変化していない（集合として同じ）
  if (before.signature && before.signature === after.signature) {
    // さらに「分数1つ以下」なら特に通分の意味が薄いので確実に除去
    if (before.countFractions <= 1 && after.countFractions <= 1) return true;

    // 複数分数でも分母が同一のままなら、通分必須にする理由が薄いので除去
    return true;
  }

  return false;
}

function rebuildOperationChain(headBlock) {
  const kept = [];
  const originalCount = countChainBlocks(headBlock);

  let current = headBlock;
  while (current) {
    const next = current?.next?.block || null;
    // detach next to avoid stale pointers
    delete current.next;

    if (current.type === 'common_denominator_operation' && isUselessCommonDenominatorOp(current)) {
      // drop
    } else {
      kept.push(current);
    }

    current = next;
  }

  for (let i = 0; i < kept.length - 1; i += 1) {
    kept[i].next = { block: kept[i + 1] };
  }

  return {
    newHead: kept[0] || null,
    removedCount: Math.max(0, originalCount - kept.length),
    keptCount: kept.length,
  };
}

function countChainBlocks(headBlock) {
  let count = 0;
  let cur = headBlock;
  while (cur) {
    count += 1;
    cur = cur?.next?.block || null;
  }
  return count;
}

function getProofStepFromAnswer(problemJson) {
  const blocks = problemJson?.answerState?.blocks?.blocks;
  if (!Array.isArray(blocks)) return null;
  return blocks.find((b) => b && b.type === 'proof_step') || null;
}

function hasAnyCommonDenominatorOp(problemJson) {
  const proofStep = getProofStepFromAnswer(problemJson);
  const head = proofStep?.inputs?.OPERATIONS?.block || null;
  let current = head;
  while (current) {
    if (current.type === 'common_denominator_operation') return true;
    current = current?.next?.block || null;
  }
  return false;
}

function removeCommonDenominatorFromRequiredBlocks(problemJson) {
  if (!Array.isArray(problemJson?.requiredBlocks)) return;
  problemJson.requiredBlocks = problemJson.requiredBlocks.filter(
    (entry) => !String(entry).includes('common_denominator_operation'),
  );
}

function cleanupFile(filepath) {
  const raw = fs.readFileSync(filepath, 'utf8');
  let json;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    return { filepath, changed: false, skipped: true, reason: 'invalid-json' };
  }

  const proofStep = getProofStepFromAnswer(json);
  const head = proofStep?.inputs?.OPERATIONS?.block || null;
  if (!proofStep || !head) {
    return { filepath, changed: false, skipped: true, reason: 'no-proof-chain' };
  }

  const originalNorm = stableStringify(json);

  const rebuilt = rebuildOperationChain(head);
  if (rebuilt.newHead) {
    proofStep.inputs.OPERATIONS.block = rebuilt.newHead;
  } else {
    // no operations left
    if (proofStep.inputs) {
      delete proofStep.inputs.OPERATIONS;
    }
  }

  // requiredBlocks 側も、「通分が残っていない」なら外す
  if (!hasAnyCommonDenominatorOp(json)) {
    removeCommonDenominatorFromRequiredBlocks(json);
  }

  const updatedNorm = stableStringify(json);
  const changed = originalNorm !== updatedNorm;

  if (changed && WRITE) {
    fs.writeFileSync(filepath, JSON.stringify(json, null, 2) + '\n', 'utf8');
  }

  return {
    filepath,
    changed,
    removedCount: rebuilt.removedCount,
    keptCount: rebuilt.keptCount,
  };
}

function main() {
  const targets = listJsonFiles(PROBLEMS_DIR);
  const results = targets.map(cleanupFile);

  const changed = results.filter((r) => r.changed);
  const removedTotal = changed.reduce((acc, r) => acc + (r.removedCount || 0), 0);

  console.log(`[cleanup] mode=${DRY ? 'dry' : 'write'}`);
  console.log(`[cleanup] scanned=${results.length}, changed=${changed.length}, removedCommonDenom=${removedTotal}`);

  const sample = changed.slice(0, 30);
  sample.forEach((r) => {
    console.log(` - ${path.relative(ROOT, r.filepath)} (removed=${r.removedCount || 0})`);
  });

  if (changed.length > sample.length) {
    console.log(` ... and ${changed.length - sample.length} more files.`);
  }

  if (DRY) {
    console.log('Run with --write to apply changes.');
  }
}

main();
