// ===== main.js =====
// ステージの遷移、問題JSONファイルの読み込み、ガイド機能の初期配置、マップの生成を担当します

// ⚠️ TUTORIAL_STAGE_IDS / isTutorialStageId / getTutorialStageIndex は
//    app-state.js が唯一の定義。以前ここで 0-7 までの7件に上書きしていたため
//    ステージ 0-8 が「チュートリアルではない」と判定され、problems/0-8.json を
//    取りに行って読み込み失敗していた。重複定義を削除済み。

// ====== 画面遷移とルーティング ======
window.routeToTarget = function() {
  const targetStage = window.getCurrentMapFocusStage();
  if (typeof window.switchScreen === 'function') window.switchScreen('stage-map-screen');
  window.renderStageMap();
  if (typeof window.centerMapCameraOnStage === 'function') window.centerMapCameraOnStage(targetStage, false);
};

window.transitionToStage = async function(stageNumber) {
  if (window.isTutorialStageId(stageNumber)) window.currentStageNumber = String(stageNumber);
  else window.currentStageNumber = Math.max(1, Number(stageNumber) || 1);
  
  if (typeof window.switchScreen === 'function') window.switchScreen('p');
  await window.loadStage(window.currentStageNumber);
};

// ====== 前後ステージナビゲーション ======
// 本編の総問題数は問題ファイルの存在チェックで動的に決定する。
// 起動時に detectMainStageTotal() を呼んで window.MAIN_STAGE_TOTAL に保存。
window.MAIN_STAGE_TOTAL = 1; // 検出前のフォールバック値。実際には initApp 起動時に上書きされる

/**
 * problems/N.json を1から順に HEAD で叩き、最初に存在しない番号の前までを総問題数とする。
 * キャップは MAX_DETECT_LIMIT。
 */
window.stageFileExists = async function(stageNumber) {
  const url = `problems/${stageNumber}.json`;
  // HEAD を受け付けない静的サーバーがあるため、失敗したら GET で確かめる
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) return true;
    if (res.status === 405 || res.status === 501) {
      const getRes = await fetch(url);
      return getRes.ok;
    }
    return false;
  } catch (_) {
    try {
      const getRes = await fetch(url);
      return getRes.ok;
    } catch (__) {
      return false;
    }
  }
};

window.detectMainStageTotal = async function() {
  // ① まずマニフェスト(problems/index.json)を読む。1リクエストで済む。
  //    tools/generate-manifest.py で生成する。問題を足したら再生成すること。
  try {
    const res = await fetch('problems/index.json');
    if (res.ok) {
      const manifest = await res.json();
      const total = Number(manifest && manifest.mainStageTotal);
      if (Number.isFinite(total) && total >= 1) {
        window.MAIN_STAGE_TOTAL = total;
        if (Array.isArray(manifest.tutorialStageIds) && manifest.tutorialStageIds.length > 0) {
          window.TUTORIAL_STAGE_IDS = manifest.tutorialStageIds.map(String);
        }
        console.log('[detectMainStageTotal] マニフェストから取得:', total, '問');
        return window.MAIN_STAGE_TOTAL;
      }
    }
  } catch (_) {
    // マニフェストが無い/壊れている場合は②へ
  }

  // ② フォールバック: 1問ずつ存在を確かめる。
  //    マニフェストの再生成を忘れても動くようにするための保険だが、
  //    問題数ぶんの往復が発生するので通常は①で終わらせたい。
  console.warn('[detectMainStageTotal] problems/index.json が読めないため逐次探索にフォールバックします。'
    + ' tools/generate-manifest.py を実行してください。');
  const MAX_DETECT_LIMIT = 500; // 安全策。これ以上は試さない
  let lastFound = 0;
  for (let n = 1; n <= MAX_DETECT_LIMIT; n++) {
    // eslint-disable-next-line no-await-in-loop
    const exists = await window.stageFileExists(n);
    if (!exists) break;
    lastFound = n;
  }
  window.MAIN_STAGE_TOTAL = Math.max(1, lastFound);
  console.log('[detectMainStageTotal] 逐次探索の結果:', window.MAIN_STAGE_TOTAL, '問');
  return window.MAIN_STAGE_TOTAL;
};

/**
 * MAIN_STAGE_TOTAL の検出を「1回だけ」保証する。
 *
 * ⚠️ ここが重要:
 *   以前は detectMainStageTotal() を renderStageMap() からしか呼んでいなかったため、
 *   「数式領域への直接介入」やチュートリアル経由で始めるとマップを一度も描画せず、
 *   MAIN_STAGE_TOTAL がフォールバック値 1 のままだった。
 *   その結果 getNextStageId(1) が「もう最後」と判断して null を返し、
 *   正解しても次のステージへ自動遷移しなくなっていた。
 *
 *   同時実行されても検出が二重に走らないよう、Promise 自体をキャッシュする。
 */
window._mainStageTotalPromise = null;
window.ensureMainStageTotal = function() {
  if (window._mainStageTotalDetected) return Promise.resolve(window.MAIN_STAGE_TOTAL);
  if (!window._mainStageTotalPromise) {
    window._mainStageTotalPromise = window.detectMainStageTotal()
      .then((total) => {
        window._mainStageTotalDetected = true;
        // 検出が終わったのでナビボタンの活性状態を正しい値で引き直す
        if (typeof window.updateStageNavButtons === 'function') window.updateStageNavButtons();
        return total;
      })
      .catch((err) => {
        console.warn('[ensureMainStageTotal] 検出に失敗:', err);
        window._mainStageTotalPromise = null; // 次回リトライできるようにする
        return window.MAIN_STAGE_TOTAL;
      });
  }
  return window._mainStageTotalPromise;
};

// 現在のステージから「前」のステージIDを返す（存在しない場合は null）
// チュートリアル中は チュートリアル内で前へ。本編は数値の N-1 へ。
// チュートリアル最初(0-1) と 本編最初(1) は null（ボタン無効化）。
window.getPrevStageId = function(currentId) {
  if (window.isTutorialStageId(currentId)) {
    const idx = window.getTutorialStageIndex(currentId);
    if (idx <= 0) return null;
    return window.TUTORIAL_STAGE_IDS[idx - 1];
  }
  const num = Number(currentId);
  if (!Number.isFinite(num) || num <= 1) return null;
  return num - 1;
};

// 現在のステージから「次」のステージIDを返す（存在しない場合は null）
// チュートリアル中の最後(0-8) は 本編1 へ進む。本編最後は null。
window.getNextStageId = function(currentId) {
  if (window.isTutorialStageId(currentId)) {
    const idx = window.getTutorialStageIndex(currentId);
    if (idx < 0) return null;
    if (idx < window.TUTORIAL_STAGE_IDS.length - 1) {
      return window.TUTORIAL_STAGE_IDS[idx + 1];
    }
    return 1; // チュートリアル最後の次は本編1
  }
  const num = Number(currentId);
  if (!Number.isFinite(num)) return null;
  // 総問題数がまだ検出できていない間は「最後かどうか」を判断できない。
  // ここで null を返すと自動遷移が止まってしまうので、楽観的に次を返す
  // （存在しなければ loadStage 側がエラーを出して止まる）。
  if (!window._mainStageTotalDetected) return num + 1;
  if (num >= window.MAIN_STAGE_TOTAL) return null;
  return num + 1;
};

// ステージが「進行済み」か（自力クリア または ギブアップ済み）を判定する。
// 進行の解放判定にはこちらを使う。マップの ✓ 表示など「クリアの誇り」に関わる
// 見た目には clearedStages（自力クリアのみ）を使い分ける。
window.isStageCompleted = function(stageId) {
  const num = Number(stageId);
  if (!Number.isFinite(num)) return false;
  return (window.clearedStages || []).includes(num) || (window.giveUppedStages || []).includes(num);
};

// ステージがアンロックされているかを判定するヘルパー。
// - unlockAll (全解放モード) なら常に true
// - チュートリアルステージは順序に依らず自由 (true)
// - 本編ステージは: 番号 1, 既にクリア済み, 前のステージがクリア済み のいずれかで true
window.isStageUnlocked = function(stageId) {
  if (window.unlockAll) return true;
  if (typeof window.isTutorialStageId === 'function' && window.isTutorialStageId(stageId)) return true;
  const num = Number(stageId);
  if (!Number.isFinite(num)) return false;
  if (num === 1) return true;
  if (window.isStageCompleted(num)) return true;
  if (window.isStageCompleted(num - 1)) return true;
  return false;
};

// 前へ/次へボタンの活性状態を現在ステージに合わせて更新する
window.updateStageNavButtons = function() {
  const prevBtn = document.getElementById('btn-prev-stage');
  const nextBtn = document.getElementById('btn-next-stage');
  const prev = window.getPrevStageId(window.currentStageNumber);
  const next = window.getNextStageId(window.currentStageNumber);
  if (prevBtn) prevBtn.disabled = (prev === null);
  // 次ステージが未解放なら無効化 (ロックされた場所には進めない)
  if (nextBtn) nextBtn.disabled = (next === null) || !window.isStageUnlocked(next);
};


// ====== マップ関連（本編問題数は window.MAIN_STAGE_TOTAL に従う） ======
window.getCurrentMapFocusStage = function() {
  const maxStage = window.MAIN_STAGE_TOTAL || 1;
  const progressed = [...(window.clearedStages || []), ...(window.giveUppedStages || [])]
      .filter((n) => Number.isFinite(Number(n)));
  const unlockedLimit = progressed.length > 0 ? Math.max(1, ...progressed) + 1 : 1;
  return Math.max(1, Math.min(maxStage, unlockedLimit));
};

window.centerMapCameraOnStage = function(stageNumber, animate = true) {
  const targetNode = document.querySelector(`#map-nodes .map-node[data-stage="${stageNumber}"]`);
  if (targetNode) targetNode.scrollIntoView({ behavior: animate ? 'smooth' : 'auto', block: 'nearest', inline: 'center' });
};

window.centerMapCameraOnCurrentStage = function(animate = true) {
  window.centerMapCameraOnStage(window.getCurrentMapFocusStage(), animate);
};

window.renderStageMap = async function() {
  const nodeRoot = document.getElementById('map-nodes');
  const progressLabel = document.getElementById('map-progress');
  if (!nodeRoot) return;

  // 本編問題数を未検出なら検出してから描画する（ensureMainStageTotal が1回だけを保証）
  if (typeof window.ensureMainStageTotal === 'function') {
    await window.ensureMainStageTotal();
  }

  nodeRoot.innerHTML = '';

  const totalStages = window.MAIN_STAGE_TOTAL || 1;
  const stageIds = Array.from({length: totalStages}, (_, i) => i + 1);
  const focusStage = window.getCurrentMapFocusStage();

  // ✨ 背景の動的データパーティクルをJSで無限生成（初回のみ）
  if (!document.getElementById('cyber-particle-container')) {
    const pContainer = document.createElement('div');
    pContainer.id = 'cyber-particle-container';
    pContainer.style.position = 'absolute';
    pContainer.style.inset = '0';
    pContainer.style.overflow = 'hidden';
    pContainer.style.pointerEvents = 'none';
    pContainer.style.zIndex = '0';
    // パーティクル数。以前は固定60個だったが、端末性能と画面幅に応じて減らす。
    // 「動きを減らす」OS設定を有効にしている人には出さない（アクセシビリティ配慮）。
    const prefersReducedMotion = window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isLowPowerDevice = (navigator.hardwareConcurrency || 4) <= 4 || window.innerWidth < 900;
    const particleCount = prefersReducedMotion ? 0 : (isLowPowerDevice ? 14 : 28);

    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement('div');
      p.className = 'cyber-bg-particle';
      p.style.left = `${Math.random() * 100}%`;
      p.style.top = `${Math.random() * 100}%`;
      p.style.animationDuration = `${8 + Math.random() * 15}s`;
      p.style.animationDelay = `-${Math.random() * 15}s`;
      if (Math.random() > 0.7) {
        // 緑の粒。box-shadow ではなく背景グラデーションで表現する
        p.style.background = 'radial-gradient(circle, #4ade80 0%, rgba(74,222,128,0.45) 35%, rgba(134,239,172,0) 70%)';
      }
      pContainer.appendChild(p);
    }
    const viewport = document.getElementById('map-viewport');
    if (viewport) viewport.appendChild(pContainer);
  }

  // 📍 配置計算用定数
  const NODE_SPACING_X = 240;
  const AMPLITUDE = 140;
  // 末尾に「未開放」ノードを1個追加するため、レイアウト総ノード数 = 実問題数 + 1
  const totalLayoutNodes = totalStages + 1;

  // スクロール領域の確保
  nodeRoot.style.width = `${totalLayoutNodes * NODE_SPACING_X + 500}px`;

  // 通常ステージのノードを描画
  stageIds.forEach((stage, index) => {
      const isCleared = (window.clearedStages || []).includes(stage);         // 自力クリア
      const isGaveUp  = (window.giveUppedStages || []).includes(stage);        // あきらめて解説を見た
      const isFirst = index === 0;
      const isPrevDone = !isFirst && window.isStageCompleted(stageIds[index - 1]);
      const isUnlocked = window.unlockAll || isFirst || isCleared || isGaveUp || isPrevDone;
      const isFocus = stage === focusStage;

      const node = document.createElement('button');
      node.className = `map-node ${isCleared ? 'cleared' : isUnlocked ? 'unlocked' : 'locked'}${isGaveUp && !isCleared ? ' gave-up' : ''}${isFocus ? ' current' : ''}`;
      node.dataset.stage = String(stage);
      const world = Math.floor((stage - 1) / 10) + 1;
      const subStage = ((stage - 1) % 10) + 1;
      
      let statusText = 'LOCKED';
      if (isFocus) statusText = 'ACTIVE';
      else if (isCleared) statusText = 'SYNCED';
      else if (isGaveUp) statusText = 'REVIEWED';   // 解説だけ見た状態。再挑戦で SYNCED に昇格する
      else if (isUnlocked) statusText = 'READY';

      node.innerHTML = `
        <div class="map-node-number">${world}-${subStage}</div>
        <div class="map-node-label">SECTOR ${String(stage).padStart(3, '0')}</div>
        <div class="node-status-tag">${statusText}</div>
      `;
      
      if (isUnlocked) node.onclick = () => window.transitionToStage(stage);
      else node.disabled = true;

      // 📍 座標計算（サイン波でうねらせる）
      const x = index * NODE_SPACING_X + 200;
      const yOffset = Math.sin(index * 0.75) * AMPLITUDE;
      
      node.style.left = `${x}px`;
      node.style.top = `calc(50% + ${yOffset}px)`;
      node.style.transform = `translate(-50%, -50%)`;
      
      nodeRoot.appendChild(node);

      // ⚡ 次のノードへの接続線（角度を計算して繋ぐ）
      // 最後の実ステージからは、末尾の「未開放」ノードへ繋ぐ
      const isLastReal = (index === stageIds.length - 1);
      const nextStageIndex = index + 1; // サイン波のインデックスは続けて伸ばす
      const nextX = nextStageIndex * NODE_SPACING_X + 200;
      const nextYOffset = Math.sin(nextStageIndex * 0.75) * AMPLITUDE;

      const dx = nextX - x;
      const dy = nextYOffset - yOffset;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      // 道の状態を決定
      let roadClass;
      if (isLastReal) {
        // 末尾ロックノードへの接続は常にロック表示
        roadClass = 'locked';
      } else {
        const nextStage = stageIds[index + 1];
        const isNextDone = window.isStageCompleted(nextStage);
        roadClass = (window.isStageCompleted(stage) && isNextDone) ? 'cleared' : (isUnlocked ? 'unlocked' : 'locked');
      }

      const road = document.createElement('div');
      road.className = `map-road ${roadClass}`;
      road.style.width = `${distance}px`;
      road.style.left = `${x}px`;
      road.style.top = `calc(50% + ${yOffset}px)`;
      road.style.transform = `translateY(-50%) rotate(${angle}deg)`;
      nodeRoot.appendChild(road);
  });

  // 末尾に「未開放」ノードを1個追加（押せない）
  {
    const index = stageIds.length; // 末尾のサイン波インデックス
    const x = index * NODE_SPACING_X + 200;
    const yOffset = Math.sin(index * 0.75) * AMPLITUDE;

    const lockedNode = document.createElement('button');
    lockedNode.className = 'map-node locked next-locked';
    lockedNode.disabled = true;
    lockedNode.innerHTML = `
      <div class="map-node-number">?</div>
      <div class="map-node-label">UNDISCOVERED</div>
      <div class="node-status-tag">LOCKED</div>
    `;
    lockedNode.style.left = `${x}px`;
    lockedNode.style.top = `calc(50% + ${yOffset}px)`;
    lockedNode.style.transform = `translate(-50%, -50%)`;
    nodeRoot.appendChild(lockedNode);
  }

  const clearCount = window.clearedStages ? window.clearedStages.filter(s => s >= 1 && s <= totalStages).length : 0;
  if (progressLabel) progressLabel.textContent = `${clearCount} / ${totalStages} CLEAR`;

  if (typeof window.centerMapCameraOnCurrentStage === 'function') {
    requestAnimationFrame(() => window.centerMapCameraOnCurrentStage(false));
  }
};

// ====== ステージロードとブロック初期配置 ======
window.loadStage = async function(stageNumber) {
  try {
      const isTutorialStage = window.isTutorialStageId(stageNumber);
      const stageFile = isTutorialStage ? `problems/tutorial/${stageNumber}.json` : `problems/${stageNumber}.json`;
      
      const response = await fetch(stageFile);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      let parsedData = JSON.parse((await response.text()).replace(/^\uFEFF/, '').trim());
      
      if (parsedData && !parsedData.mathText) {
          if (parsedData[stageNumber]) parsedData = parsedData[stageNumber];
          else if (parsedData.stages && parsedData.stages[stageNumber]) parsedData = parsedData.stages[stageNumber];
      }
      
      window.currentProblemData = parsedData;
      window.AppLog?.stageStart(stageNumber);

      console.log('[loadStage]', stageNumber, '要求公式:', parsedData?.requiredFormulas, '現在のアンロック:', window.unlockedFormulas);

      if (typeof window.ensureFormulasUnlockedForProblem === 'function') {
        await window.ensureFormulasUnlockedForProblem(window.currentProblemData);
      }

      console.log('[loadStage]', stageNumber, 'アンロック処理後:', window.unlockedFormulas);

      window.currentStageSolved = false;
      if (typeof window.updateStreakCounter === 'function') window.updateStreakCounter(false);

      const stageText = document.getElementById('r');
      const problemText = document.getElementById('s');
      if (stageText) stageText.innerText = isTutorialStage ? `TUTORIAL ${window.getTutorialStageIndex(stageNumber) + 1}/${window.TUTORIAL_STAGE_IDS.length}` : `STAGE ${stageNumber}`;
      if (problemText) problemText.innerText = window.currentProblemData?.mathText || '';

      // btn-back のラベルを状況に合わせて切り替える
      // 0-1, 0-2 はキャラチュートリアルが必ず出るので「チュートリアルをやめる」で強制終了させる
      // 0-3 以降はチュートリアルなしなので「ステージ選択」でモード選択に戻る
      const btnBack = document.getElementById('btn-back');
      if (btnBack) {
        const sid = String(stageNumber);
        if (sid === '0-1' || sid === '0-2') {
          btnBack.textContent = 'チュートリアルをやめる';
        } else {
          btnBack.textContent = 'ステージ選択';
        }
      }

      // 引数なしの typesetPromise() はページ全体を走査するので使わない。
      // 問題文の要素だけを対象にする（ステージ移動のたびに全DOM走査していた）。
      // 問題文に数式記法($...$)が含まれるときだけ MathJax を動かす。
      // 大半の問題は素のテキストなので、これで組版処理そのものが不要になる。
      if (problemText && /[$\\]/.test(problemText.innerText) && typeof window.typesetMath === 'function') {
        if (window.MathJax && typeof window.MathJax.typesetClear === 'function') {
          try { window.MathJax.typesetClear([problemText]); } catch (_) { /* 未組版なら無視 */ }
        }
        window.typesetMath(problemText);
      }

      if (window.workspace) {
          if (typeof buildToolboxConfig === 'function') window.workspace.updateToolbox(buildToolboxConfig(window.currentProblemData));
          window.workspace.clear();
          
          if (window.currentProblemData?.initialState) {
              Blockly.serialization.workspaces.load(window.currentProblemData.initialState, window.workspace);
          }
          
          if (typeof window.applyConditionalInitialStateGeneration === 'function') {
            try {
              window.applyConditionalInitialStateGeneration(window.workspace);
            } catch (genError) {
              console.warn('[InitialStateGeneration] スキップしました:', genError);
            }
          }
          
          if (typeof forceWorkspaceLayoutSync === 'function') forceWorkspaceLayoutSync();
          if (typeof arrangeBlocks === 'function') arrangeBlocks();
      }

      // チュートリアル中のブロック制限をワークスペース変更のたびに再適用する。
      // bindTutorialWorkspaceAutoAdvance() は定義だけあって呼ばれておらず、
      // 制限がロード時1回しか効いていなかった（内部で二重バインドは防いでいる）。
      if (typeof window.bindTutorialWorkspaceAutoAdvance === 'function') {
        window.bindTutorialWorkspaceAutoAdvance();
      }

      // チュートリアル進捗バーの更新（本編なら自動で非表示になる）
      if (typeof window.updateTutorialProgressBar === 'function') {
        window.updateTutorialProgressBar(stageNumber);
      }

      // ヒントの段階は問題ごとにリセットする（前の問題のヒントが残らないように）
      if (typeof window.resetHintLevel === 'function') window.resetHintLevel();

      if (isTutorialStage) {
          requestAnimationFrame(() => { if (typeof applyTutorialBlockRestrictions === 'function') applyTutorialBlockRestrictions(); });
          window.tutorialModeActive = true;
          // 旧: updateTutorialBanner()（未定義の関数だったため無言で何も起きていなかった）
          if (typeof window.updateTutorialHighlightUI === 'function') window.updateTutorialHighlightUI(stageNumber);
      } else {
          if (window.workspace) {
              const toolboxElement = window.workspace.getToolbox();
              if (toolboxElement) {
                  const categories = typeof toolboxElement.getCategories === 'function' ? toolboxElement.getCategories() : [];
                  categories.forEach(category => {
                      const blocks = typeof category.getContents === 'function' ? category.getContents() : [];
                      blocks.forEach(block => { if (block && typeof block.setDisabled === 'function') block.setDisabled(false); });
                  });
              }
          }
          window.tutorialModeActive = false;
          if (typeof window.hideGoalHintForStage === 'function') window.hideGoalHintForStage();
      }

      const submitBtn = document.getElementById('btn-submit');
      const nextBtn = document.getElementById('btn-next');
      if (submitBtn) submitBtn.style.display = 'inline-block';
      if (nextBtn) nextBtn.style.display = 'none';

      if (typeof window.updateStageNavButtons === 'function') window.updateStageNavButtons();

      // ==================================
      // ステージ進入時のパルチュートリアル起動フック
      // 各ステージには PAL_TUTORIAL_SCRIPTS[stageId] で台本が定義されている場合があり、
      // そのステージに初めて入ったときだけパルチュートリアルを起動する。
      // チュートリアル(0-*)だけでなく本編ステージでも動く（加法定理の導入など、
      // 新しい考え方が出てくるステージで説明を入れられるようにするため）。
      // 例外: 0-1 は character-scenes.js の exec_tutorial_start から起動されるためスキップ
      //
      // 「もう見た」の記録:
      //   チュートリアル(0-*) … これまで通りメモリだけ（読み込みし直すとまた流れる）
      //   本編ステージ        … 端末に保存して、二度目以降は流さない（AppStorage.KEYS.DEVICE）
      // ==================================
      if (String(stageNumber) !== '0-1'
          && typeof window.startPalTutorial === 'function'
          && window.PAL_TUTORIAL_SCRIPTS && window.PAL_TUTORIAL_SCRIPTS[String(stageNumber)]) {
        window._palTutorialStageSeen = window._palTutorialStageSeen || {};
        const seenKey = window.AppStorage?.KEYS?.DEVICE?.PAL_TUTORIAL_SEEN;
        const seenStored = (!isTutorialStage && seenKey && window.AppStorage)
          ? (window.AppStorage.getJSON(seenKey, []) || [])
          : [];
        const alreadySeen = window._palTutorialStageSeen[String(stageNumber)]
          || (Array.isArray(seenStored) && seenStored.includes(String(stageNumber)));
        if (!alreadySeen) {
          window._palTutorialStageSeen[String(stageNumber)] = true;
          if (!isTutorialStage && seenKey && window.AppStorage) {
            window.AppStorage.setJSON(seenKey, Array.from(new Set([...seenStored, String(stageNumber)])));
          }

          // 起動条件を全て満たしてから開始する:
          //   1. シャッター (cyber-transition) が開き終わっている
          //   2. 公式アンロック演出 (character-dialog) が表示されていない
          //   3. 保留中の公式アンロック (_pendingUnlockFormulaIds) が全て解決されている
          // これらを 200ms 間隔で polling する (シャッター判定は waitShutterThen が担当)。
          const isCharacterDialogVisible = () => {
            const host = document.getElementById('character-dialog-host');
            return host && !host.classList.contains('hidden');
          };
          const hasPendingUnlock = () => (window._pendingUnlockFormulaIds || []).length > 0
            || window._formulaUnlockSceneActive === true;

          const waitAllConditionsThenStart = () => {
            if (isCharacterDialogVisible() || hasPendingUnlock()) {
              setTimeout(waitAllConditionsThenStart, 200);
              return;
            }
            // すべての条件を満たしたので、余韻として 600ms 待ってから起動
            setTimeout(() => {
              console.log(`[loadStage] パルチュートリアル起動 (stageId=${stageNumber})`);
              window.startPalTutorial(String(stageNumber), function () {
                console.log(`[loadStage] パルチュートリアル完了 (stageId=${stageNumber})`);
              });
            }, 600);
          };

          // まずシャッターが開き終わるのを待つ、次に公式アンロック演出の終了を待つ
          if (typeof window.waitShutterThen === 'function') {
            window.waitShutterThen(waitAllConditionsThenStart);
          } else {
            setTimeout(waitAllConditionsThenStart, 500);
          }
        }
      }
  } catch (error) {
      console.error('[StageLoadError]', error);
      if (typeof window.showToast === 'function') {
        window.showToast(`<span style='color:red'>問題の読み込みに失敗しました (${stageNumber})</span>`, false);
      }
  }
};

window.applyConditionalInitialStateGeneration = function(targetWorkspace) {
  if (!targetWorkspace) return;
  const overwriteButton = document.getElementById('btn-overwrite-permission');
  const isOverwriteOn = !!overwriteButton && !overwriteButton.classList.contains('off');
  
  let proofStep = targetWorkspace.getTopBlocks(false).find(b => b.type === 'proof_step');
  if (!proofStep) {
      proofStep = targetWorkspace.newBlock('proof_step');
      proofStep.initSvg(); proofStep.render();
  }

  const operationInputConnection = proofStep.getInput('OPERATIONS')?.connection;
  if (!operationInputConnection) return;

  // 左辺・右辺の候補は「式」のブロックだけ。公式ブロック（formula_N）も出力を持つため、
  // 以前は盤面のいちばん下に公式が置かれていると「よって〔公式③〕となる」になっていた。
  const mathBlocks = targetWorkspace.getTopBlocks(false)
      .filter(block => block && block.outputConnection
        && !/^formula_/.test(block.type)
        && !['proof_step', 'replace_operation', 'common_denominator_operation', 'simplify_operation', 'conclusion_operation'].includes(block.type))
      .sort((a, b) => a.getRelativeToSurfaceXY().y - b.getRelativeToSurfaceXY().y);
      
  const leftExpressionBlock = mathBlocks[0] || null;
  const rightExpressionBlock = mathBlocks.length >= 2 ? mathBlocks[mathBlocks.length - 1] : mathBlocks[0] || null;

  const operations = [];
  let currentOp = proofStep.getInputTargetBlock('OPERATIONS');
  while (currentOp) { operations.push(currentOp); currentOp = currentOp.getNextBlock(); }

  let conclusionOp = operations.find(op => op.type === 'conclusion_operation') || null;
  if (!conclusionOp) {
      conclusionOp = targetWorkspace.newBlock('conclusion_operation');
      conclusionOp.initSvg(); conclusionOp.render();
  }

  if (isOverwriteOn) {
      let replaceOp = operations.find(op => op.type === 'replace_operation') || null;
      if (!replaceOp) {
          replaceOp = targetWorkspace.newBlock('replace_operation');
          replaceOp.initSvg(); replaceOp.render();
      }
      
      if (operationInputConnection.targetBlock() !== replaceOp) {
          if (operationInputConnection.targetBlock()) operationInputConnection.targetBlock().unplug(true);
          operationInputConnection.connect(replaceOp.previousConnection);
      }
      if (replaceOp.nextConnection && replaceOp.nextConnection.targetBlock() !== conclusionOp) {
          if (replaceOp.nextConnection.targetBlock()) replaceOp.nextConnection.targetBlock().unplug(true);
          replaceOp.nextConnection.connect(conclusionOp.previousConnection);
      }
      
      if (leftExpressionBlock && replaceOp.getInput('VALUE')?.connection && !replaceOp.getInput('VALUE').connection.targetBlock()) {
          replaceOp.getInput('VALUE').connection.connect(leftExpressionBlock.outputConnection);
      }
  } else {
      if (operationInputConnection.targetBlock() !== conclusionOp) {
          if (operationInputConnection.targetBlock()) operationInputConnection.targetBlock().unplug(true);
          operationInputConnection.connect(conclusionOp.previousConnection);
      }
      operations.forEach(op => { if (op !== conclusionOp) op.dispose(true); });
      if (conclusionOp.nextConnection?.targetBlock()) conclusionOp.nextConnection.targetBlock().unplug(true);
  }

  if (rightExpressionBlock && conclusionOp.getInput('VALUE')?.connection && !conclusionOp.getInput('VALUE').connection.targetBlock()) {
      conclusionOp.getInput('VALUE').connection.connect(rightExpressionBlock.outputConnection);
  }
};