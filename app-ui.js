// ===== app-ui.js =====
// UI制御、ボタン状態、トースト通知、モーダルなどの描画・演出を担当します


let toastTimeoutId = null;
const BACKGROUNDS = {
  'title': 'asset/bg_title.png',   // スタート（タイトル）画面
  'select': 'asset/bg_select.png', // 問題選択（マップ）画面
  'stage': 'asset/bg_stage.png'    // 問題（パズル）画面
};

function updateSubmitButtonState() {
  const submitBtn = document.getElementById('btn-submit');
  if (!submitBtn) return;
  const isProofStepPresent = workspace && workspace.getTopBlocks(false).some((block) => block.type === 'proof_step');
  submitBtn.disabled = !isProofStepPresent;
  submitBtn.style.opacity = isProofStepPresent ? '1' : '0.5';
  submitBtn.style.pointerEvents = isProofStepPresent ? 'auto' : 'none';
}

function updateOverwritePermissionButton() {
  const btn = document.getElementById('btn-overwrite-permission');
  if (!btn) return;
  const mode = getProofScaffoldMode();
  if (mode === 'guided') {
    btn.textContent = 'ガイド機能: ON';
    btn.classList.remove('off');
    btn.classList.add('on');
  } else {
    btn.textContent = 'ガイド機能: OFF';
    btn.classList.remove('on');
    btn.classList.add('off');
  }
}

function showToast(message, isHTML = false) {
  const toast = document.getElementById('toast-message');
  if (!toast) return;
  toast.innerHTML = isHTML ? message : '';
  if (!isHTML) toast.textContent = message;
  toast.classList.remove('hidden');

  if (toastTimeoutId) clearTimeout(toastTimeoutId);
  toastTimeoutId = setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

function getErrorMessage(errorCode, stepIndex, suggestions) {
  const stepText = typeof stepIndex === 'number' && stepIndex >= 0 ? `(操作 ${stepIndex + 1} つ目)` : '';
  const sugText = suggestions && suggestions.length > 0 ? `（ヒント: ${suggestions.join('、')}）` : '';

  switch (errorCode) {
    case 'MISSING_CONCLUSION':
      return '最後に「よって〇〇となる」ブロックがありません。証明の結論を置いてください。';
    case 'CONCLUSION_MISMATCH':
      return '「よって〇〇となる」で導かれた結論が、問題文で求められているゴールと一致していません。もう一度式を見直しましょう。';
    case 'INVALID_STARTING_EXPRESSION':
      return '最初の置き換え式が間違っています。問題文の左辺から出発してください。';
    case 'INVALID_REPLACEMENT':
      return `数式の置き換え（変形）に誤りがあります${stepText}。公式の使い方や計算が合っているか確認しましょう。${sugText}`;
    case 'INVALID_COMMON_DENOMINATOR':
      return `通分の計算に誤りがあります${stepText}。分母と分子が正しく計算されているか確認しましょう。${sugText}`;
    case 'OPERATION_ERROR':
    default:
      return `証明の途中に不正な操作があります${stepText}。ブロックの組み合わせを見直してください。${sugText}`;
  }
}

function updateStreakCounter(animate = false) {
  const counter = document.getElementById('streak-counter');
  if (!counter) return;
  if (currentStreak >= 2) {
    counter.textContent = `🔥 ${currentStreak} 連勝`;
    counter.style.display = 'inline-block';
    if (animate) {
      counter.classList.remove('streak-bounce');
      void counter.offsetWidth;
      counter.classList.add('streak-bounce');
    }
  } else {
    counter.style.display = 'none';
  }
}

function setAppBackgroundByKey(bgKey) {
  const bgPath = BACKGROUNDS[bgKey] || BACKGROUNDS['select'];
  document.body.style.backgroundImage = `url('${bgPath}')`;
}

function showGameEntrance() {
  const entrance = document.getElementById('game-entrance');
  if (!entrance) return;
  entrance.classList.remove('hidden');
  setAppBackgroundByKey('select');
}

function openGameEntrance() {
  const entrance = document.getElementById('game-entrance');
  if (entrance) {
    entrance.classList.remove('hidden', 'show-choices');
    document.getElementById('btn-entry-start').style.display = 'block';
  }
  setAppBackgroundByKey('title');
}

function closeGameEntrance() {
  const entrance = document.getElementById('game-entrance');
  if (entrance) {
    entrance.classList.add('hidden');
  }
}

function showGoalHintForStage() {
  const hintText = generateGoalHint(currentProblemData);
  if (!hintText) {
    showToast('この問題にはヒントがありません');
    return;
  }
  goalHintActive = true;
  document.getElementById('btn-hint').classList.add('active');
  const banner = document.getElementById('tutorial-banner');
  if (banner) {
    banner.innerHTML = `<span style="font-size: 1.1em;">💡 ヒント:</span> ${hintText}`;
    banner.classList.add('visible');
  }
}

function hideGoalHintForStage() {
  goalHintActive = false;
  document.getElementById('btn-hint').classList.remove('active');
  const banner = document.getElementById('tutorial-banner');
  if (banner) {
    banner.classList.remove('visible');
    banner.innerHTML = '';
  }
}