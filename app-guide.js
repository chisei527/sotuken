// ===== app-guide.js =====
// ヒント機能、チュートリアルの案内テキスト、次に埋めるべき穴のハイライト（光る枠）を担当します

// goalHintActive / currentHighlightTargetNode / highlightTrackingFrameId の
// 初期化は app-state.js が担当（ここで再代入すると読み込み順で値が巻き戻る）。

// ====== 1. ブロックの解析・目標設定 ======
// 穴が「本当に埋まっているか」。見本（shadow）ブロックは未入力として扱う。
window.getFilledInputBlock = function(block, inputName) {
  const target = block && typeof block.getInputTargetBlock === 'function' ? block.getInputTargetBlock(inputName) : null;
  if (!target) return null;
  if (typeof target.isShadow === 'function' && target.isShadow()) return null;
  return target;
};

window.parseRequiredBlockTypes = function(requiredBlocks) {
  if (!Array.isArray(requiredBlocks)) return [];
  return requiredBlocks.map((entry) => {
    if (typeof entry !== 'string') return null;
    const match = entry.match(/type\"?\s*:\s*\"([a-zA-Z0-9_]+)\"/);
    if (match && match[1]) return match[1];
    const plain = entry.match(/^[a-zA-Z0-9_]+$/);
    return plain ? entry : null;
  }).filter(Boolean);
};

window.isProofOrOperationBlockType = function(blockType) {
  // ⚠️ simplify_operation を忘れないこと。11問（4,5,7,10,13,14,15,19,20,22,0-6）で使われており、
  //    以前ここから漏れていたため extractOperationTypesFromAnswerState が
  //    該当ステップを取りこぼし、ヒントが実際より少ない手数を案内していた。
  return [
    'proof_step',
    'replace_operation',
    'common_denominator_operation',
    'simplify_operation',
    'conclusion_operation',
  ].includes(blockType);
};

window.getTutorialOperationLabel = function(type) {
  if (type === 'replace_operation') return '置き換え';
  if (type === 'common_denominator_operation') return '通分';
  if (type === 'simplify_operation') return '計算';
  if (type === 'conclusion_operation') return 'よって';
  return type || '操作';
};

window.getTutorialOperationMissingHole = function(type, block) {
  if (!block) return null;
  if (type === 'replace_operation') {
    if (!window.getFilledInputBlock(block, 'VALUE')) return { key: 'fill-replace-value', text: '【目標】『置き換え』ブロックの「式」の穴を埋めましょう。' };
    if (!window.getFilledInputBlock(block, 'FORMULA')) return { key: 'fill-replace-formula', text: '【目標】『置き換え』ブロックの「公式」の穴を埋めましょう。' };
    if (!window.getFilledInputBlock(block, 'REPLACEMENT')) return { key: 'fill-replace-result', text: '【目標】『置き換え』ブロックの「結果」の穴を埋めましょう。' };
  }
  if (type === 'common_denominator_operation') {
    if (!window.getFilledInputBlock(block, 'VALUE') || !window.getFilledInputBlock(block, 'REPLACEMENT')) return { key: 'fill-common', text: '【目標】『通分』ブロックの空いている穴を埋めましょう。' };
  }
  if (type === 'simplify_operation') {
    if (!window.getFilledInputBlock(block, 'VALUE')) return { key: 'fill-simplify-value', text: '【目標】『計算』ブロックの「式」の穴を埋めましょう。' };
    if (!window.getFilledInputBlock(block, 'REPLACEMENT')) return { key: 'fill-simplify-result', text: '【目標】『計算』ブロックの「結果」の穴を埋めましょう。' };
  }
  if (type === 'conclusion_operation') {
    if (!window.getFilledInputBlock(block, 'VALUE')) return { key: 'fill-conclusion-value', text: '【目標】『よって〜となる』ブロックの空いている穴を埋めましょう。' };
  }
  return null;
};

window.sortBlocksByPosition = function(blocks) {
  return (blocks || []).slice().sort((first, second) => {
    const firstPos = first?.getRelativeToSurfaceXY?.() || { x: 0, y: 0 };
    const secondPos = second?.getRelativeToSurfaceXY?.() || { x: 0, y: 0 };
    if (firstPos.y !== secondPos.y) return firstPos.y - secondPos.y;
    return firstPos.x - secondPos.x;
  });
};

// answerState (問題JSONの解答例) から操作ブロックのタイプ列を抽出する。
// 本編の問題JSONは requiredBlocks を持たないので、解答例のブロック連鎖から
// 「何のブロックが何個必要か」を推測してヒント自動生成に使う (フォールバック)。
// 例: replace → replace → conclusion なら
//     ['replace_operation', 'replace_operation', 'conclusion_operation']
window.extractOperationTypesFromAnswerState = function(problemData) {
  const proofBlock = problemData?.answerState?.blocks?.blocks?.find((block) => block?.type === 'proof_step');
  let current = proofBlock?.inputs?.OPERATIONS?.block || null;
  const types = [];
  while (current) {
    if (typeof current.type === 'string' && window.isProofOrOperationBlockType(current.type) && current.type !== 'proof_step') {
      types.push(current.type);
    }
    current = current?.next?.block || null;
  }
  return types;
};

window.getTutorialTargetOperationState = function(stageId) {
  if (!window.workspace || !window.currentProblemData) return null;

  // requiredBlocks が明示されていればそれを使う (チュートリアル)。
  // 空・未設定なら answerState から自動抽出する (本編用フォールバック)。
  let requiredTypes = window.parseRequiredBlockTypes(window.currentProblemData.requiredBlocks || []);
  if (requiredTypes.length === 0) {
    requiredTypes = window.extractOperationTypesFromAnswerState(window.currentProblemData);
  }
  if (requiredTypes.length === 0) return { isComplete: true, requiredTypes: [] };

  const blocksByType = Object.create(null);
  requiredTypes.forEach((type) => {
    if (!blocksByType[type]) {
      blocksByType[type] = window.sortBlocksByPosition(window.workspace.getBlocksByType(type, false));
    }
  });

  const usedCounts = Object.create(null);
  for (const type of requiredTypes) {
    const index = usedCounts[type] || 0;
    const block = (blocksByType[type] || [])[index] || null;
    if (!block) return { isComplete: false, type, block: null, isMissing: true };

    const missingHole = window.getTutorialOperationMissingHole(type, block);
    if (missingHole) return { isComplete: false, type, block, isMissing: false };

    usedCounts[type] = index + 1;
  }
  return { isComplete: true, requiredTypes };
};

window.getTutorialGoalState = function(stageId) {
  const targetState = window.getTutorialTargetOperationState(stageId);
  if (!targetState || targetState.isComplete) {
    return { key: 'ready-check', text: '【目標】必要な穴が埋まったら、「正解をチェック」ボタンを押しましょう。' };
  }

  const targetType = targetState.type;
  const targetLabel = window.getTutorialOperationLabel(targetType);
  const targetBlock = targetState.block;

  if (targetState.isMissing || !targetBlock) {
    const key = targetType === 'replace_operation' ? 'pull-replace'
      : targetType === 'common_denominator_operation' ? 'pull-common'
      : targetType === 'simplify_operation' ? 'pull-simplify'
      : 'pull-conclusion';
    return { key, text: `【目標】左のメニューから『${targetLabel}』ブロックを引き出しましょう。` };
  }

  const missingHole = window.getTutorialOperationMissingHole(targetType, targetBlock);
  const isFormulaHole = targetType === 'replace_operation' && missingHole && missingHole.key === 'fill-replace-formula';

  const hasFloatingMath = window.workspace.getTopBlocks(false).some((block) =>
    !window.isProofOrOperationBlockType(block.type) && !String(block.type || '').startsWith('formula_')
  );

  if (missingHole && !hasFloatingMath && !isFormulaHole) {
    if (targetType === 'conclusion_operation') {
      return { key: 'pull-math-conclusion', text: '【目標】左のメニューから、よってに入る「数式」ブロックを引き出しましょう。' };
    }
    return { key: 'pull-math-parts', text: '【目標】左のメニューから、穴を埋めるための「数式」ブロックを引き出しましょう。' };
  }
  if (missingHole) return missingHole;

  return { key: 'ready-check', text: '【目標】必要な穴が埋まったら、「正解をチェック」ボタンを押しましょう。' };
};

window.getTutorialBannerText = function(stageId) {
  // 本編・チュートリアル共通: 現在のブロック配置状況から次にやるべきことを自動生成する。
  // 以前は本編用に problems/N.json の hints 配列を参照していたが、
  // チュートリアルと同じ自動生成方式に統一した (旧 hints フィールドは無視される)。
  const state = window.getTutorialGoalState(stageId);
  return state ? state.text : '';
};


// ====== 2. 次の行動を示すハイライト（光る枠）機能 ======
window.getTutorialToolboxCategoryLabel = function(labelText) {
  // カテゴリラベル要素 (テキスト) より、親の TreeRow を返す方が rect が大きく光らせやすい
  const labels = Array.from(document.querySelectorAll('.blocklyTreeLabel'));
  const label = labels.find((node) => node.textContent?.includes(labelText));
  if (!label) return null;
  // 親をたどって TreeRow が見つかればそれを返す、無ければ label 自身
  const row = label.closest('.blocklyTreeRow');
  return row || label;
};
window.getTutorialToolboxElement = function() {
  return document.querySelector('.blocklyToolboxDiv');
};

window.getInputConnectionRect = function(block, inputName) {
  if (!block || typeof block.getInput !== 'function') return null;
  const input = block.getInput(inputName);
  const connection = input?.connection;
  if (!connection) return null;

  // 接続点のワークスペース座標を取得
  let wsCoords = null;
  if (typeof connection.getOffsetInPixels === 'function') {
    // 古いAPI (Blockly < 10): getOffsetInPixels() はワークスペース原点からのピクセル座標
    wsCoords = connection.getOffsetInPixels();
  } else if (connection.x_ !== undefined && connection.y_ !== undefined) {
    // 新APIの互換: 直接プロパティを見る (scale 掛ける前の値)
    const scale = window.workspace?.scale || 1;
    wsCoords = { x: connection.x_ * scale, y: connection.y_ * scale };
  }
  if (!wsCoords) return null;

  // Blocklyワークスペースをホストする div の画面上の位置を取得
  const wsDiv = document.querySelector('.blocklyWorkspace') || document.getElementById('l');
  const wsRect = wsDiv ? wsDiv.getBoundingClientRect() : { left: 0, top: 0 };

  // scroll を加味 (workspace.scrollX/Y はブロックがドラッグでスクロールされた時の値)
  const scrollX = window.workspace?.scrollX || 0;
  const scrollY = window.workspace?.scrollY || 0;

  const size = { width: 42, height: 28 };
  return {
    left: wsRect.left + wsCoords.x + scrollX - size.width / 2,
    top: wsRect.top + wsCoords.y + scrollY - size.height / 2,
    width: size.width,
    height: size.height,
  };
};

window.getTutorialHighlightTargets = function(stageId) {
  const goal = window.getTutorialGoalState(stageId);
  const goalKey = goal?.key || '';
  const toolboxLabel = window.getTutorialToolboxCategoryLabel('証明') || window.getTutorialToolboxElement();

  if (goalKey.startsWith('pull-math-')) return { target: window.getTutorialToolboxCategoryLabel('基本') || toolboxLabel };
  if (goalKey === 'pull-formula') return { target: window.getTutorialToolboxCategoryLabel('公式') || toolboxLabel };
  if (goalKey.startsWith('pull-')) return { target: toolboxLabel };

  const operations = window.workspace?.getTopBlocks(false)?.find(b => b.type === 'proof_step')?.getInputTargetBlock('OPERATIONS');
  let currentOp = operations;
  while(currentOp) {
    const missingHole = window.getTutorialOperationMissingHole(currentOp.type, currentOp);
    if (missingHole && missingHole.key === goalKey) {
      if (goalKey === 'fill-replace-value') return { target: window.getInputConnectionRect(currentOp, 'VALUE') || toolboxLabel };
      if (goalKey === 'fill-replace-formula') return { target: window.getInputConnectionRect(currentOp, 'FORMULA') || toolboxLabel };
      if (goalKey === 'fill-replace-result') return { target: window.getInputConnectionRect(currentOp, 'REPLACEMENT') || toolboxLabel };
      if (goalKey === 'fill-common' && !window.getFilledInputBlock(currentOp, 'VALUE')) return { target: window.getInputConnectionRect(currentOp, 'VALUE') || toolboxLabel };
      if (goalKey === 'fill-common' && !window.getFilledInputBlock(currentOp, 'REPLACEMENT')) return { target: window.getInputConnectionRect(currentOp, 'REPLACEMENT') || toolboxLabel };
      if (goalKey === 'fill-simplify-value') return { target: window.getInputConnectionRect(currentOp, 'VALUE') || toolboxLabel };
      if (goalKey === 'fill-simplify-result') return { target: window.getInputConnectionRect(currentOp, 'REPLACEMENT') || toolboxLabel };
      if (goalKey === 'fill-conclusion-value') return { target: window.getInputConnectionRect(currentOp, 'VALUE') || toolboxLabel };
    }
    currentOp = currentOp.getNextBlock();
  }

  if (goalKey === 'ready-check') {
    const submitBtn = document.getElementById('btn-submit');
    if (submitBtn) return { target: submitBtn };
  }
  return { target: toolboxLabel };
};

window.stopHighlightTracking = function() {
  if (window.highlightTrackingFrameId) cancelAnimationFrame(window.highlightTrackingFrameId);
  window.highlightTrackingFrameId = 0;
};

window.startHighlightTracking = function() {
  window.stopHighlightTracking();
  // ヒントOFFのときは追従ループを回さない。
  // 以前は無条件に requestAnimationFrame を回し続けていて、
  // ヒントを消した後もずっと毎フレーム DOM を触っていた。
  if (!window.isHighlightLevel()) return;
  function track() {
    if (!window.isHighlightLevel()) { window.highlightTrackingFrameId = 0; return; }
    const pulseElement = document.getElementById('tutorial-highlight-target');
    if (pulseElement && window.currentHighlightTargetNode && !pulseElement.classList.contains('hidden')) {
      const rect = typeof window.currentHighlightTargetNode.getBoundingClientRect === 'function' ? window.currentHighlightTargetNode.getBoundingClientRect() : window.currentHighlightTargetNode;
      if (rect.width > 0 && rect.height > 0) {
        pulseElement.style.left = rect.left + 'px';
        pulseElement.style.top = rect.top + 'px';
        pulseElement.style.width = rect.width + 'px';
        pulseElement.style.height = rect.height + 'px';
      }
    }
    window.highlightTrackingFrameId = requestAnimationFrame(track);
  }
  track();
};


// ====== 3. ヒント表示UIの制御 ======
window.updateTutorialHighlightUI = function(stageNumber) {
  if (!window.workspace || !window.currentProblemData) return;
  const targetPulse = document.getElementById('tutorial-highlight-target');
  const banner = document.getElementById('tutorial-banner');
  const underProblem = document.getElementById('tutorial-next-under-problem');

  if (targetPulse) targetPulse.classList.add('hidden');

  let goalText = '';
  let highlightTargets = null;
  try {
    goalText = window.getTutorialBannerText(stageNumber) || '';
    highlightTargets = window.getTutorialHighlightTargets(stageNumber);
  } catch (err) {
    console.warn('[Guide] ハイライト計算をスキップ:', err);
  }

  window.currentHighlightTargetNode = null;

  if (highlightTargets?.target) {
    window.currentHighlightTargetNode = highlightTargets.target;
    // ヒントONの間だけ枠を光らせる
    if (window.isHighlightLevel() && targetPulse) {
      // 最初のフレームで rect を確定させて hidden を外す
      const rect = typeof highlightTargets.target.getBoundingClientRect === 'function'
        ? highlightTargets.target.getBoundingClientRect()
        : highlightTargets.target;
      if (rect && rect.width > 0 && rect.height > 0) {
        targetPulse.style.left = rect.left + 'px';
        targetPulse.style.top = rect.top + 'px';
        targetPulse.style.width = rect.width + 'px';
        targetPulse.style.height = rect.height + 'px';
        targetPulse.classList.remove('hidden');
        console.log('[Guide] ハイライト表示:', rect);
      } else {
        console.log('[Guide] ハイライト対象の rect が 0:', highlightTargets.target);
      }
    }
  }

  window.startHighlightTracking();

  // 目標テキストは浮かぶヒントカードに出す。
  // 以前は問題文の下の「帯」(#tutorial-next-under-problem / #tutorial-banner) に出していたが、
  // ONにするたびに作業エリアが下へずれてしまうのでやめた。DOM は他から参照されるので残し、中身だけ空にする。
  [banner, underProblem].forEach((el) => {
    if (!el) return;
    el.innerHTML = '';
    el.classList.remove('visible', 'pulse');
    if (el === banner) el.style.display = 'none';
  });

  window.renderHintCard(goalText);
};

window.hideTutorialHighlights = function() {
  const target = document.getElementById('tutorial-highlight-target');
  if (target) target.classList.add('hidden');
};

// ====== 3b. 段階的ヒント ======
// ヒントは3段階。ボタンを押すごとに1段ずつ上がり、最後まで行くと消える。
//   1 … 問題ごとのヒント文（problems/*.json の hints）を1つ目から
//   2 … ＋ 次に埋める穴を光らせる／【目標】を出す（ヒント文も1つ増える）
//   3 … ＋ 「置き換え」ブロックを置く（旧「ガイド機能」。ヒント文も1つ増える）
// 以前はこの3つが「ガイド機能」ボタン（ヘッダー）と「ヒント」ボタンに分かれていた。
window.HINT_MAX_LEVEL = 3;

// 光らせる・【目標】を出すのはレベル2から
window.isHighlightLevel = function() {
  return (window.hintLevel || 0) >= 2;
};

window.getProblemHints = function() {
  const hints = window.currentProblemData?.hints;
  return Array.isArray(hints) ? hints.filter((h) => typeof h === 'string' && h.trim()) : [];
};

// 「置き換え」ブロックを1つ置いて、左の穴に問題の左辺を入れる（レベル3）。
// ⚠️ 旧ガイド機能は盤面をいったん全部消して作り直していたので、
//    途中まで組んだブロックが消えてしまった。ここでは消さずに足すだけにする。
//    すでに自分で操作ブロックを置いているときは、何もしない。
window.applyHintScaffold = function() {
  const ws = window.workspace;
  if (!ws) return false;
  const proof = ws.getTopBlocks(false).find((b) => b.type === 'proof_step');
  if (!proof) return false;
  const opConn = proof.getInput('OPERATIONS')?.connection;
  if (!opConn) return false;

  const first = opConn.targetBlock();
  // 「よって」以外がすでに入っている = 自分で組み始めている → 触らない
  if (first && first.type !== 'conclusion_operation') return false;

  let replaceOp;
  try {
    replaceOp = ws.newBlock('replace_operation');
    replaceOp.initSvg();
    replaceOp.render();
  } catch (err) {
    console.warn('[Hint] 置き換えブロックを作れませんでした:', err);
    return false;
  }

  if (first && first.previousConnection) {
    first.previousConnection.disconnect();
    if (replaceOp.nextConnection) replaceOp.nextConnection.connect(first.previousConnection);
  }
  opConn.connect(replaceOp.previousConnection);

  // 盤面に余っている左辺のブロックがあれば「式」の穴に入れる
  const valueConn = replaceOp.getInput('VALUE')?.connection;
  if (valueConn && !valueConn.targetBlock()) {
    const leftBlock = ws.getTopBlocks(false)
      .filter((b) => b && b.outputConnection && !/^formula_/.test(b.type)
        && !window.isProofOrOperationBlockType(b.type))
      .sort((a, b) => a.getRelativeToSurfaceXY().y - b.getRelativeToSurfaceXY().y)[0];
    if (leftBlock) valueConn.connect(leftBlock.outputConnection);
  }

  if (typeof window.forceWorkspaceLayoutSync === 'function') window.forceWorkspaceLayoutSync();
  return true;
};

window.updateHintButton = function() {
  const btn = document.getElementById('btn-hint');
  if (!btn) return;
  const level = window.hintLevel || 0;
  const max = window.HINT_MAX_LEVEL;
  // ボタンの文字は短くする。狭い画面で折り返して2行になってしまうため。
  // 「もう一度押すと何が起きるか」はヒントカードの下に書いてある。
  btn.textContent = level === 0 ? 'ヒント' : (level >= max ? 'ヒントを消す' : `ヒント ${level}/${max}`);
  btn.classList.toggle('hint-on', level > 0);
};

window.setHintLevel = function(nextLevel) {
  const max = window.HINT_MAX_LEVEL;
  const before = window.hintLevel || 0;
  const level = Math.max(0, Math.min(max, Number(nextLevel) || 0));
  window.hintLevel = level;
  window.goalHintActive = level > 0;

  // レベル3に上がった瞬間だけ盤面に置き換えブロックを置く（毎回置くと増えてしまう）
  let scaffolded = false;
  if (level >= max && before < max) scaffolded = window.applyHintScaffold();

  window.updateHintButton();
  window.updateTutorialHighlightUI(window.currentStageNumber);
  if (level === 0) window.hideTutorialHighlights();

  if (scaffolded && typeof window.showToast === 'function') {
    window.showToast('「置き換え」ブロックを置いたよ。左の穴には問題の左辺が入っているよ');
  }
  return level;
};

// ボタンを押したときの進み方: 0 → 1 → 2 → 3 → 0
window.advanceHintLevel = function() {
  const level = window.hintLevel || 0;
  return window.setHintLevel(level >= window.HINT_MAX_LEVEL ? 0 : level + 1);
};

// ステージを読み込んだときに段階をリセットする
window.resetHintLevel = function() {
  window.hintLevel = 0;
  window.goalHintActive = false;
  window.updateHintButton();
  window.renderHintCard('');
  window.hideTutorialHighlights();
};

// 旧API（他のファイルやパルのチュートリアルから呼ばれる）
window.showGoalHintForStage = function() {
  if ((window.hintLevel || 0) === 0) window.setHintLevel(1);
};

window.hideGoalHintForStage = function() {
  window.setHintLevel(0);
};

// ====== 3c. ヒントカード（作業エリアの右上に浮かべる） ======
window.ensureHintCard = function() {
  let card = document.getElementById('hint-card');
  if (card) return card;
  card = document.createElement('div');
  card.id = 'hint-card';
  card.className = 'hidden';
  card.innerHTML = `
    <div class="hint-card-head">
      <span class="hint-card-title">💡 ヒント <span id="hint-card-level">1/3</span></span>
      <button id="hint-card-fold" type="button" aria-label="ヒントをたたむ" title="たたむ（ヒントは消えません）">▾</button>
      <button id="hint-card-close" type="button" aria-label="ヒントを消す" title="ヒントを消す">×</button>
    </div>
    <ol class="hint-card-list" id="hint-card-list"></ol>
    <div class="hint-card-goal" id="hint-card-goal"></div>
    <div class="hint-card-next" id="hint-card-next"></div>`;
  document.body.appendChild(card);
  card.querySelector('#hint-card-close').addEventListener('click', () => window.setHintLevel(0));
  // たたむ/開く。ブロックに重なって読みにくいときのため。段階はそのまま残す。
  card.querySelector('#hint-card-fold').addEventListener('click', () => {
    const folded = card.classList.toggle('collapsed');
    const btn = card.querySelector('#hint-card-fold');
    btn.textContent = folded ? '▸' : '▾';
    btn.title = folded ? '開く' : 'たたむ（ヒントは消えません）';
    window.positionHintCard();
  });
  window.addEventListener('resize', () => window.positionHintCard());
  return card;
};

// 作業エリア(#l)の右上に合わせて置く。position:fixed なので盤面のレイアウトがずれない。
// 右端はゴミ箱のぶんだけ空けておく。
window.positionHintCard = function() {
  const card = document.getElementById('hint-card');
  const area = document.getElementById('l');
  if (!card || !area || card.classList.contains('hidden')) return;
  const rect = area.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const TRASH_GUTTER = 84;
  const top = Math.round(rect.top + 12);
  card.style.top = `${top}px`;
  card.style.right = `${Math.round(window.innerWidth - rect.right + TRASH_GUTTER)}px`;

  // 下は「リセット／あきらめる／…」のボタン列の手前で止める。
  // 画面が低いときにカードがボタンの裏まで伸びてしまうのを防ぐ。
  const actionBar = document.querySelector('.action-bar-container');
  const barRect = actionBar ? actionBar.getBoundingClientRect() : null;
  const bottomLimit = (barRect && barRect.height > 0) ? barRect.top : rect.bottom;
  card.style.maxHeight = `${Math.max(120, Math.round(bottomLimit - top - 16))}px`;
};

window.renderHintCard = function(goalText) {
  const level = window.hintLevel || 0;
  const card = level > 0 ? window.ensureHintCard() : document.getElementById('hint-card');
  if (!card) return;

  if (level === 0) {
    card.classList.add('hidden');
    window._hintCardShownLevel = 0;
    return;
  }

  const max = window.HINT_MAX_LEVEL;
  const hints = window.getProblemHints();
  const list = card.querySelector('#hint-card-list');
  const goal = card.querySelector('#hint-card-goal');
  const next = card.querySelector('#hint-card-next');
  const levelLabel = card.querySelector('#hint-card-level');

  if (levelLabel) levelLabel.textContent = `${level}/${max}`;

  // レベルの数だけヒント文を出す（ヒント文が無い問題では【目標】だけになる）
  if (list) {
    const shown = hints.slice(0, level);
    list.innerHTML = shown.map((h) => `<li>${h}</li>`).join('');
    list.style.display = shown.length ? 'block' : 'none';
  }

  if (goal) {
    const text = level >= 2 ? (goalText || '') : '';
    goal.innerHTML = text;
    goal.style.display = text ? 'block' : 'none';
  }

  if (next) {
    let message = '';
    if (level === 1) message = 'もう一度押すと、次に埋める穴が光るよ';
    else if (level === 2) message = 'もう一度押すと、「置き換え」ブロックを置くよ';
    else message = 'ここまでがヒントの全部。もう一度押すと消えるよ';
    next.textContent = message;
  }

  card.classList.remove('hidden');
  // 段階が上がったときは、たたんであっても開いて新しいヒントを見せる
  if (level !== window._hintCardShownLevel) {
    card.classList.remove('collapsed');
    const foldBtn = card.querySelector('#hint-card-fold');
    if (foldBtn) { foldBtn.textContent = '▾'; foldBtn.title = 'たたむ（ヒントは消えません）'; }
    window._hintCardShownLevel = level;
  }
  window.positionHintCard();
  // 画面の切り替え直後は #l の大きさが確定していないので、次のフレームでもう一度合わせる
  requestAnimationFrame(() => window.positionHintCard());
};

// ====== 4. ブロック変化の監視とボタン初期化 ======
window.bindGuideWorkspaceListener = function() {
  if (window.guideWorkspaceListenerBound) return;
  if (!window.workspace || typeof window.workspace.addChangeListener !== 'function') return;
  window.guideWorkspaceListenerBound = true;
  window.workspace.addChangeListener(function(event) {
    if (!window.goalHintActive) return;
    if (event && event.isUiEvent) return;
    window.updateTutorialHighlightUI(window.currentStageNumber);
  });
};

// ⚠️ 初期化のスケジュールはファイル末尾で1回だけ行う。
//    以前はここで setTimeout(window.initGuideFeature, 0) を呼んでおり、
//    その時点の「setupGuideButton を含まない旧版」が予約されてしまっていた
//    （defer スクリプトでは readyState が 'interactive' なので else 側に入る）。

// ====== 5. ヒントボタンのクリック制御 ======
window.setupGuideButton = function () {
  const btn = document.getElementById('btn-hint');
  if (!btn || btn.dataset.guideBound === '1') return;
  btn.dataset.guideBound = '1';
  
  btn.addEventListener('click', function () {
    const level = window.advanceHintLevel();
    // ログには「何段目まで見たか」を残す（研究用: どれだけ助けを借りたかの指標になる）
    window.AppLog?.hint(level > 0, level);
  });
};

// ====== 6. 初期化 ======
// ワークスペース監視 + ヒントボタンのバインドをまとめて行う。
// 定義はここ1箇所だけ（以前は同名関数を2回定義して片方を握り潰していた）。
window.initGuideFeature = function() {
  if (typeof window.bindGuideWorkspaceListener === 'function') window.bindGuideWorkspaceListener();
  if (typeof window.setupGuideButton === 'function') window.setupGuideButton();
  if (typeof window.updateHintButton === 'function') window.updateHintButton();
};

// 初期化のスケジュールはここ1箇所だけ。
// defer スクリプトなので readyState は通常 'interactive'（= else 側）になる。
// 関数参照ではなくアロー関数で包むことで、「呼ばれる瞬間の最新版」が実行される。
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => window.initGuideFeature(), 0));
} else {
  setTimeout(() => window.initGuideFeature(), 0);
}