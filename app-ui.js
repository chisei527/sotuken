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
  // 旧 hideTutorialOverlay() は未定義のまま呼ばれていた残骸。実体は hideTutorialHighlights。
  if (screenId !== 'p' && typeof window.hideTutorialHighlights === 'function') {
    window.hideTutorialHighlights();
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
  window.setAppBackgroundByKey(screenId === 'p' ? 'stage' : (screenId === 'stage-map-screen' ? 'select' : 'title'));
};

// 2. 画面ごとの背景を切り替える
//
// プレイ画面（key === 'stage'）だけは絵を敷かない。
// 以前は作業エリアの後ろに SF のイラストを敷いていたため、
// 学習者が見るべきブロックより背景のほうが明るく、図と地が反転していた。
// プレイ中は styles/actions.css の方眼（#l の背景）だけにして、
// 画面でいちばん明るいものがブロックになるようにする。
// 絵はタイトルとマップ（＝見せ場）に残す。
window.setAppBackgroundByKey = function(key) {
  if (key === 'stage') {
    document.body.style.backgroundImage = 'none';
    return;
  }
  const url = key === 'select' ? 'url("asset/bg_select.webp")' : 'url("asset/bg_title.webp")';
  document.body.style.backgroundImage = url;
};

// 3. ゲーム開始時のエントランス画面を閉じる
window.closeGameEntrance = function() {
  const entrance = document.getElementById('game-entrance');
  if (entrance) entrance.classList.add('hidden');
};

// 4. 画面下部に通知メッセージ（トースト）を出す
window.showToast = function(htmlContent, isAutoClose = true) {
  const toastElement = document.getElementById('toast-message');
  if (toastElement) {
      toastElement.innerHTML = htmlContent;
      toastElement.classList.remove('hidden');
      if (isAutoClose) setTimeout(() => toastElement.classList.add('hidden'), 3000);
  }
};

// 5. 炎の連動正解カウンターをアニメーション付きで更新する
window.updateStreakCounter = function(shouldAnimate = false) {
  const counter = document.getElementById('streak-counter');
  if (!counter) return;
  const streak = window.currentStreak || 0;
  counter.textContent = `🔥 ${streak}`;
  // 0 のときは出さない（意味のない「0」でヘッダーがにぎやかになるのを防ぐ）
  counter.classList.toggle('is-zero', streak <= 0);
  counter.classList.remove('streak-bounce');
  if (shouldAnimate) {
    requestAnimationFrame(() => requestAnimationFrame(() => counter.classList.add('streak-bounce')));
  }
};

// ============================================================
// MathJax の遅延読み込み
//
// MathJax(tex-mml-chtml) は約 1MB あるが、使うのは「解説テキストの
// 数式組版」だけ。以前は index.html で常に読み込んでいたため、
// 解説を一度も開かないプレイヤーも 1MB 払わされていた。
// 初めて必要になった時点で読み込み、2回目以降は同じ Promise を返す。
// ============================================================
window._mathJaxPromise = null;

window.ensureMathJaxLoaded = function() {
  if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
    return Promise.resolve(window.MathJax);
  }
  if (window._mathJaxPromise) return window._mathJaxPromise;

  window._mathJaxPromise = new Promise((resolve, reject) => {
    // MathJax は読み込み前に設定オブジェクトを置いておく必要がある
    window.MathJax = {
      tex: { inlineMath: [['$', '$'], ['\\(', '\\)']] },
      svg: { fontCache: 'global' },
      startup: {
        typeset: false, // 読み込み直後に全ページを組版しない（重いので手動で呼ぶ）
        ready() {
          window.MathJax.startup.defaultReady();
          resolve(window.MathJax);
        },
      },
    };
    const script = document.createElement('script');
    script.id = 'MathJax-script';
    script.async = true;
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
    script.onerror = () => {
      window._mathJaxPromise = null; // 次回リトライできるように
      reject(new Error('MathJax の読み込みに失敗しました'));
    };
    document.head.appendChild(script);
  });

  return window._mathJaxPromise;
};

/**
 * 指定要素の中だけ数式を組版する。
 * 引数なしの MathJax.typesetPromise() はページ全体を走査するので使わないこと。
 * @param {HTMLElement} element 組版したい要素
 */
window.typesetMath = function(element) {
  if (!element) return Promise.resolve();
  return window.ensureMathJaxLoaded()
    .then((mj) => mj.typesetPromise([element]))
    .catch((err) => { console.warn('[typesetMath] 組版をスキップ:', err.message); });
};