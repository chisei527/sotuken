// ===== app-unlock.js =====
// 公式の段階的アンロック機能。
// ステージの requiredFormulas に初めて遭遇したとき、画像つきモーダルで「新しい公式」を
// 紹介してからアンロックする。アンロック状態は localStorage に保存される。

(function () {
  'use strict';

  function getKnownFormulaIds() {
    if (typeof FORMULA_BLOCK_DEFS !== 'undefined' && Array.isArray(FORMULA_BLOCK_DEFS)) {
      return FORMULA_BLOCK_DEFS.map((entry) => entry[0]);
    }
    return Array.from({ length: 16 }, (_, i) => `formula_${i + 1}`);
  }

  function sanitizeUnlockedFormulas(formulaIds) {
    const known = new Set(getKnownFormulaIds());
    const raw = Array.isArray(formulaIds) ? formulaIds : [];
    return Array.from(new Set(raw.map((id) => String(id)))).filter((id) => known.has(id));
  }

  function getUnlockedFormulaIds() {
    const current = Array.isArray(window.unlockedFormulas) ? window.unlockedFormulas : [];
    const sanitized = sanitizeUnlockedFormulas(current);
    if (sanitized.length !== current.length) {
      window.unlockedFormulas = sanitized;
      if (typeof saveUnlockedFormulasToStorage === 'function') {
        saveUnlockedFormulasToStorage(sanitized);
      }
    }
    return sanitized;
  }

  function unlockFormulaIds(formulaIds) {
    const current = getUnlockedFormulaIds();
    const incoming = sanitizeUnlockedFormulas(formulaIds);
    const merged = sanitizeUnlockedFormulas([...current, ...incoming]);
    window.unlockedFormulas = merged;
    if (typeof saveUnlockedFormulasToStorage === 'function') {
      saveUnlockedFormulasToStorage(merged);
    }
  }

  // ★修正1: チュートリアルステージの公式もアンロック対象として認識させる
  function getRequiredFormulasFromProblem(problemData) {
    let formulas = [];
    if (problemData && Array.isArray(problemData.requiredFormulas)) {
      formulas = problemData.requiredFormulas.map(id => String(id));
    }
    // チュートリアルの場合は、tutorial.js で定義されたブロック制限から公式を拾う
    if (typeof window.currentStageNumber !== 'undefined' && typeof window.isTutorialStageId === 'function') {
      if (window.isTutorialStageId(window.currentStageNumber)) {
        if (typeof window.getTutorialAllowedBlockTypes === 'function') {
          const restriction = window.getTutorialAllowedBlockTypes(window.currentStageNumber);
          if (restriction && Array.isArray(restriction.formulaBlocks)) {
             formulas = formulas.concat(restriction.formulaBlocks);
          }
        }
      }
    }
    return Array.from(new Set(formulas)).filter(Boolean);
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

  // ★修正2: デッドロックを回避し、シャッターが完全に開いてからモーダルを出す
  async function ensureFormulasUnlockedForProblem(problemData) {
    const required = sanitizeUnlockedFormulas(getRequiredFormulasFromProblem(problemData))
      .filter((id) => (typeof window.isSupportedFormulaId === 'function' ? window.isSupportedFormulaId(id) : true));

    if (required.length === 0) return [];

    const unlocked = new Set(getUnlockedFormulaIds());
    const newlyFound = required.filter((id) => !unlocked.has(id));
    if (newlyFound.length === 0) return [];

    // まず裏側でアンロック状態にしておく
    unlockFormulaIds(newlyFound);

    // シャッターが開くのを独立して監視する
    const waitShutterAndShow = () => {
      const transitionLayer = document.getElementById('cyber-transition');
      if (transitionLayer && (transitionLayer.classList.contains('active') || transitionLayer.classList.contains('booting'))) {
        setTimeout(waitShutterAndShow, 100);
      } else {
        // シャッターが開いたあと、0.4秒の余韻のあとにモーダルを手前に出す
        setTimeout(() => {
          showFormulaUnlockModal(newlyFound);
        }, 400);
      }
    };
    waitShutterAndShow();

    // ロード処理自体はストップさせずにすぐ終わらせて、シャッターを開ける処理へ進ませる
    return newlyFound;
  }

  window.getKnownFormulaIds = getKnownFormulaIds;
  window.sanitizeUnlockedFormulas = sanitizeUnlockedFormulas;
  window.getUnlockedFormulaIds = getUnlockedFormulaIds;
  window.unlockFormulaIds = unlockFormulaIds;
  window.getRequiredFormulasFromProblem = getRequiredFormulasFromProblem;
  window.showFormulaUnlockModal = showFormulaUnlockModal;
  window.ensureFormulasUnlockedForProblem = ensureFormulasUnlockedForProblem;

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