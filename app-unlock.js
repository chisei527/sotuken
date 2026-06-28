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

  // 新しい公式を1つずつ画像つきで紹介するモーダル
  async function showFormulaUnlockModal(formulaIds) {
    const ids = Array.from(new Set((Array.isArray(formulaIds) ? formulaIds : []).map((id) => String(id)).filter(Boolean)));
    if (ids.length === 0) return;

    const { modal, title, meta, image, fallback, closeButton } = getFormulaUnlockModalNodes();
    if (!modal || !title || !meta || !image || !fallback || !closeButton) return;

    modal.classList.remove('hidden');

    await new Promise((resolve) => {
      let index = 0;

      const render = () => {
        const formulaId = ids[index];
        const label = typeof window.formulaIdToLabel === 'function' ? window.formulaIdToLabel(formulaId) : formulaId;
        title.textContent = '新しい公式を覚えよう！';
        meta.textContent = `UNLOCK: ${label}  (${index + 1} / ${ids.length})`;
        fallback.style.display = 'none';
        fallback.textContent = '';

        image.style.display = 'block';
        image.alt = label;
        image.onerror = () => {
          image.style.display = 'none';
          fallback.textContent = `画像が見つかりませんでした。\n\n${label}`;
          fallback.style.display = 'block';
        };
        // 画像は asset/ フォルダの formula_X.png を参照
        image.src = `asset/${formulaId}.png`;

        closeButton.textContent = index >= ids.length - 1 ? '確認して開始' : '次へ';
      };

      closeButton.onclick = () => {
        index += 1;
        if (index >= ids.length) {
          modal.classList.add('hidden');
          closeButton.onclick = null;
          resolve();
          return;
        }
        render();
      };

      render();
    });
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

    // ★ 修正2: ここで「await」を使うとシャッターが一生開かなくなるため、独立した監視処理を走らせる
    const waitShutterAndShow = () => {
      const transitionLayer = document.getElementById('cyber-transition');
      
      // シャッターが閉じている最中なら、100ミリ秒後にまた確認する（待ち続ける）
      if (transitionLayer && (transitionLayer.classList.contains('active') || transitionLayer.classList.contains('booting'))) {
        setTimeout(waitShutterAndShow, 100);
      } else {
        // シャッターが完全に開いた！ → 0.4秒の余韻のあとにモーダルを手前にバーンと出す
        setTimeout(() => {
          showFormulaUnlockModal(newlyFound);
        }, 400);
      }
    };
    waitShutterAndShow(); // 監視スタート

    // ★ 修正3: 関数自体はすぐに終了させて、ロード処理とシャッターを開ける動作を先に進ませる！
    return newlyFound;
  }
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