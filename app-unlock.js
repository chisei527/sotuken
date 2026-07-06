// ===== app-unlock.js =====
// 公式の段階的アンロック機能。
// ステージの requiredFormulas に初めて遭遇したとき、画像つきモーダルで「新しい公式」を
// 紹介してからアンロックする。アンロック状態は localStorage に保存される。
//
// 依存:
//   - window.formulaIdToLabel / window.isSupportedFormulaId / window.FORMULA_REGISTRY (math-logic.js)
//   - window.unlockedFormulas / saveUnlockedFormulasToStorage (app-state.js)
//   - FORMULA_BLOCK_DEFS (blocks.js)
//   - HTML: #formula-unlock-modal ほか（index.html に既存）

(function () {
  'use strict';

  // 既知の公式ID一覧（blocks.js の FORMULA_BLOCK_DEFS 由来）
  function getKnownFormulaIds() {
    if (typeof FORMULA_BLOCK_DEFS !== 'undefined' && Array.isArray(FORMULA_BLOCK_DEFS)) {
      return FORMULA_BLOCK_DEFS.map((entry) => entry[0]);
    }
    // フォールバック: formula_1 〜 formula_16
    return Array.from({ length: 16 }, (_, i) => `formula_${i + 1}`);
  }

  function sanitizeUnlockedFormulas(formulaIds) {
    const known = new Set(getKnownFormulaIds());
    const raw = Array.isArray(formulaIds) ? formulaIds : [];
    return Array.from(new Set(raw.map((id) => String(id)))).filter((id) => known.has(id));
  }

  // 現在アンロック済みの公式IDを取得（壊れた値があれば掃除して保存）
  function getUnlockedFormulaIds() {
    const current = Array.isArray(window.unlockedFormulas) ? window.unlockedFormulas : [];
    const sanitized = sanitizeUnlockedFormulas(current);
    if (sanitized.length !== current.length) {
      window.unlockedFormulas = sanitized;
      if (typeof window.saveUnlockedFormulasToStorage === 'function') {
        window.saveUnlockedFormulasToStorage(sanitized);
      }
    }
    return sanitized;
  }

  // 公式をアンロックして保存
  function unlockFormulaIds(formulaIds) {
    const current = getUnlockedFormulaIds();
    const incoming = sanitizeUnlockedFormulas(formulaIds);
    const merged = sanitizeUnlockedFormulas([...current, ...incoming]);
    window.unlockedFormulas = merged;
    if (typeof window.saveUnlockedFormulasToStorage === 'function') {
      window.saveUnlockedFormulasToStorage(merged);
    }
  }

  function getRequiredFormulasFromProblem(problemData) {
    const required = problemData?.requiredFormulas;
    if (!Array.isArray(required)) return [];
    return required.map((id) => String(id)).filter(Boolean);
  }

  function getFormulaUnlockModalNodes() {
    return {
      modal: document.getElementById('formula-unlock-modal'),
      title: document.getElementById('formula-unlock-title'),
      meta: document.getElementById('formula-unlock-meta'),
      image: document.getElementById('formula-unlock-image'),
      fallback: document.getElementById('formula-unlock-fallback'),
      closeButton: document.getElementById('btn-formula-unlock-close'),
    };
  }

  // 新しい公式を1つずつキャラダイアログで紹介する
  // 旧: formula-unlock-modal による自動再生方式
  // 新: character-dialog + character-scenes を経由してフリエちゃんが喋る
  async function showFormulaUnlockModal(formulaIds) {
    const ids = Array.from(new Set((Array.isArray(formulaIds) ? formulaIds : []).map((id) => String(id)).filter(Boolean)));
    if (ids.length === 0) return;

    // キャラダイアログが未ロードのときは何もせず抜ける (安全策)
    if (typeof window.openFormulaUnlockedScene !== 'function') return;

    for (const formulaId of ids) {
      // 表示用の公式名を作る (番号 + 数式)
      const fallbackLabel = typeof window.formulaIdToLabel === 'function' ? window.formulaIdToLabel(formulaId) : formulaId;
      let displayNumber = '';
      let displayFormula = '';
      if (typeof FORMULA_BLOCK_DEFS !== 'undefined' && Array.isArray(FORMULA_BLOCK_DEFS)) {
        const entry = FORMULA_BLOCK_DEFS.find((e) => e && e[0] === formulaId);
        if (entry) {
          displayNumber = entry[1] || '';
          displayFormula = entry[2] || '';
        }
      }
      const label = (displayNumber && displayFormula) ? `${displayNumber} ${displayFormula}` : fallbackLabel;

      // 1公式ごとにダイアログを開いて、確認ボタン押下まで待つ
      await new Promise((resolve) => {
        // アクションを一時的に差し替えて、閉じたときに次公式に進めるようにする
        const originalClose = window.CHARACTER_SCENE_ACTIONS.close_dialog;
        window.CHARACTER_SCENE_ACTIONS.close_dialog = function() {
          window.closeCharacterDialog();
          window.CHARACTER_SCENE_ACTIONS.close_dialog = originalClose;
          resolve();
        };
        window.openFormulaUnlockedScene({ formulaLabel: label });
      });
    }
  }

// ステージの問題データを見て、初遭遇の公式があればモーダルを出してアンロック
  async function ensureFormulasUnlockedForProblem(problemData) {
    const required = sanitizeUnlockedFormulas(getRequiredFormulasFromProblem(problemData))
      .filter((id) => (typeof window.isSupportedFormulaId === 'function' ? window.isSupportedFormulaId(id) : true));

    if (required.length === 0) return [];

    const unlocked = new Set(getUnlockedFormulaIds());
    const newlyFound = required.filter((id) => !unlocked.has(id));
    if (newlyFound.length === 0) return [];

    // ★ 修正1: ロードを止めないよう、先に裏側でアンロック状態をセーブしてしまう
    unlockFormulaIds(newlyFound);

    // 基礎チュートリアル中はアンロック演出を保留する。
    // 基礎チュートリアル完了時に flushPendingFormulaUnlock() が発火する。
    if (window._basicsTutorialActive) {
      window._pendingUnlockFormulaIds = (window._pendingUnlockFormulaIds || []).concat(newlyFound);
      console.log('[app-unlock] 基礎チュートリアル中のため公式アンロック演出を保留:', newlyFound);
      return newlyFound;
    }

    // ★ 修正2: ここで「await」を使うとシャッターが一生開かなくなるため、独立した監視処理を走らせる
    waitShutterThen(() => showFormulaUnlockModal(newlyFound));

    // ★ 修正3: 関数自体はすぐに終了させて、ロード処理とシャッターを開ける動作を先に進ませる！
    return newlyFound;
  }

  // シャッター (cyber-transition) が完全に開き終わってから callback を実行するヘルパ。
  // シャッターが開いていなければ 100ms 単位で polling、開き終わった後 400ms の余韻を持たせる。
  function waitShutterThen(callback) {
    const check = () => {
      const transitionLayer = document.getElementById('cyber-transition');
      if (transitionLayer && (transitionLayer.classList.contains('active') || transitionLayer.classList.contains('booting'))) {
        setTimeout(check, 100);
      } else {
        setTimeout(callback, 400);
      }
    };
    check();
  }

  // 基礎チュートリアル完了時に、保留されていた公式アンロック演出を発火する。
  // character-scenes.js の exec_tutorial_start の onComplete から呼ばれる。
  // シャッター演出が続いている間は待って、開き終わってから実行する。
  window.flushPendingFormulaUnlock = function() {
    const pending = window._pendingUnlockFormulaIds || [];
    if (pending.length === 0) return;
    window._pendingUnlockFormulaIds = [];
    console.log('[app-unlock] 保留されていた公式アンロックを発火 (シャッター待ち):', pending);
    waitShutterThen(() => showFormulaUnlockModal(pending));
  };

  // シャッター待ちヘルパを外部に公開 (basics-tutorial などから使えるように)
  window.waitShutterThen = waitShutterThen;
  // window へ公開
  window.getKnownFormulaIds = getKnownFormulaIds;
  window.sanitizeUnlockedFormulas = sanitizeUnlockedFormulas;
  window.getUnlockedFormulaIds = getUnlockedFormulaIds;
  window.unlockFormulaIds = unlockFormulaIds;
  window.getRequiredFormulasFromProblem = getRequiredFormulasFromProblem;
  window.showFormulaUnlockModal = showFormulaUnlockModal;
  window.ensureFormulasUnlockedForProblem = ensureFormulasUnlockedForProblem;

  // ====== チュートリアル最初の説明動画 ======
  function showTutorialIntroModal() {
    const modal = document.getElementById('tutorial-intro-modal');
    if (!modal) return false;
    modal.classList.remove('hidden');
    const introVideo = document.getElementById('tutorial-intro-video');
    if (introVideo) {
      try {
        introVideo.currentTime = 0;
        const p = introVideo.play();
        if (p && typeof p.catch === 'function') p.catch((e) => console.log('動画の自動再生がブロックされました', e));
      } catch (e) {
        console.log('動画再生エラー', e);
      }
    }
    return true;
  }

  function hideTutorialIntroModal() {
    const modal = document.getElementById('tutorial-intro-modal');
    if (modal) modal.classList.add('hidden');
    const introVideo = document.getElementById('tutorial-intro-video');
    if (introVideo && typeof introVideo.pause === 'function') introVideo.pause();
  }

  window.showTutorialIntroModal = showTutorialIntroModal;
  window.hideTutorialIntroModal = hideTutorialIntroModal;
})();