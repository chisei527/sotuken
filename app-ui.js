// ===== app-ui.js =====
// 画面切り替え、トースト表示、カウンター更新、背景変更など、HTML/CSSの「見た目」の変更を一手に引き受けます

// 1. 画面の表示・非表示を切り替える最重要関数
window.switchScreen = function(screenId) {
  // すべての画面（クラス名 .a）を一度非表示にする
  document.querySelectorAll('.a').forEach(screen => screen.classList.remove('b'));
  
  // 目的の画面（ID指定）だけをフレックス表示（.b）にして出現させる
  const target = document.getElementById(screenId);
  if (target) target.classList.add('b');
  
  // 画面ごとの個別連動処理
  if (screenId !== 'p' && typeof window.hideTutorialOverlay === 'function') {
    window.hideTutorialOverlay();
  }
  if (screenId === 'p' && typeof window.forceWorkspaceLayoutSync === 'function') {
    requestAnimationFrame(() => window.forceWorkspaceLayoutSync());
  }
  if (screenId === 'stage-map-screen' && typeof window.centerMapCameraOnCurrentStage === 'function') {
    requestAnimationFrame(() => window.centerMapCameraOnCurrentStage(true));
  }

  // パル常駐マスコット: プレイ画面 (#p) 表示中だけ見える
  if (screenId === 'p') {
    if (typeof window.showCharacterMascot === 'function') window.showCharacterMascot();
  } else {
    if (typeof window.hideCharacterMascot === 'function') window.hideCharacterMascot();
  }
  
  // 画面に合わせた背景画像の切り替え
  window.setAppBackgroundByKey(screenId === 'p' ? 'stage' : (screenId === 'stage-map-screen' || screenId === 'c' ? 'select' : 'title'));
};

// 2. 画面遷移の背景画像を制御する関数
window.setAppBackgroundByKey = function(key) {
  // ※アセットフォルダ内の画像ファイル名（bg_stage.png等）が異なる場合は、実際のファイル名に合わせて変更してください
  let url = '';
  if (key === 'stage') url = 'url("asset/bg_stage.png")'; 
  else if (key === 'select') url = 'url("asset/bg_select.png")';
  else url = 'url("asset/bg_title.png")';
  document.body.style.backgroundImage = url;
};

// 3. ゲーム開始時のエントランス画面を閉じる
window.closeGameEntrance = function() {
  const entrance = document.getElementById('game-entrance');
  if (entrance) entrance.classList.add('hidden');
};

// 4. エントランス画面を再び開く
window.openGameEntrance = function() {
  const entrance = document.getElementById('game-entrance');
  if (entrance) entrance.classList.remove('hidden', 'show-choices');
  if (typeof window.hideTutorialOverlay === 'function') window.hideTutorialOverlay();
  window.setAppBackgroundByKey('title');
  // キャラダイアログ版のモード選択も同時に開く
  // (タイトルタップで show-choices を付けるハンドラは通らないため、明示的に呼ぶ)
  if (typeof window.openModeSelectWithCharacter === 'function') {
    entrance?.classList.add('show-choices');
    window.openModeSelectWithCharacter();
  }
};

// 5. 画面下部に通知メッセージ（トースト）を出す
window.showToast = function(htmlContent, isAutoClose = true) {
  const toastElement = document.getElementById('toast-message');
  if (toastElement) {
      toastElement.innerHTML = htmlContent;
      toastElement.classList.remove('hidden');
      if (isAutoClose) setTimeout(() => toastElement.classList.add('hidden'), 3000);
  }
};

// 6. 炎の連動正解カウンターをアニメーション付きで更新する
window.updateStreakCounter = function(shouldAnimate = false) {
  const counter = document.getElementById('streak-counter');
  if (!counter) return;
  counter.textContent = `🔥 ${window.currentStreak || 0}`;
  counter.classList.remove('streak-bounce');
  if (shouldAnimate) {
    requestAnimationFrame(() => requestAnimationFrame(() => counter.classList.add('streak-bounce')));
  }
};

// 7. スキップチャレンジのポップアップを閉じる
window.closeSkipChallengeModal = function() {
  const skipModal = document.getElementById('skip-challenge-modal');
  if (skipModal) skipModal.classList.add('hidden');
};