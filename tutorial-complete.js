// ===== tutorial-complete.js =====
// チュートリアル（0-1〜0-8）を最後まで終えたときに出す「チュートリアル完了」画面。
// 以前は最後のチュートリアルをクリアすると、何の区切りもなく本編ステージ1が始まっていた。
//
// ここは「見せ場」なので、作業画面と違って全画面で派手に祝う
// （CLAUDE.md「見せ場と作業場を分ける」）。紙吹雪・放射光・立ち絵・
// 覚えたブロックの絵・解放した公式を、順番に出す。
//
// 使い方: window.showTutorialCompleteScreen({ onStart, onMap, replay })
//   onStart … 「本編を始める」を押したとき（ステージ1へ）
//   onMap   … 「ステージマップを見る」を押したとき
//   replay  … 「使い方をもう一度」からのやり直しなら true。
//             この人はもう本編を進めているので、1問目へ送らずステージ選択へ戻す。
// 次へ進む処理（app.js の自動遷移・「次の問題へ」ボタン）から呼ばれる。

(function () {
  // 覚えた操作ブロック。絵は block-svg.js（盤面と同じ色が出る）。
  const LEARNED = [
    { art: 'replaceOperation',          name: '置き換え', desc: '公式を使って式を書き換える' },
    { art: 'simplifyOperation',         name: '計算',     desc: '公式を使わずに約分や整理をする' },
    { art: 'commonDenominatorOperation', name: '通分',    desc: '分数を1つにまとめる' },
  ];

  // 紙吹雪の色。ブロックの色づかいと揃える（青＝式／紫＝公式／金＝お祝い）。
  const CONFETTI_COLORS = ['#5B8CC8', '#7dd3fc', '#6D3FBF', '#fbbf24', '#58cc02', '#fef08a'];

  function blockArt(key) {
    const api = window.BlockSvg;
    return (api && typeof api[key] === 'function') ? api[key]() : '';
  }

  function build() {
    const cards = LEARNED.map((l) => `
      <div class="tc-card">
        <div class="tc-card-art">${blockArt(l.art)}</div>
        <div>
          <div class="tc-card-name">${l.name}</div>
          <p class="tc-card-desc">${l.desc}</p>
        </div>
      </div>`).join('');

    const t = document.createElement('template');
    t.innerHTML = `
      <div id="tutorial-complete-screen" class="overlay-screen hidden" role="dialog" aria-modal="true" aria-labelledby="tutorial-complete-title">
        <div class="tc-burst" aria-hidden="true"></div>
        <div class="tc-confetti" aria-hidden="true"></div>

        <div class="tc-stage">
          <img class="tc-furie" src="asset/喜び周りなし.webp" alt="有葉フリエ">
          <div class="tc-center">
            <p class="tc-eyebrow">TUTORIAL COMPLETE</p>
            <h2 id="tutorial-complete-title">チュートリアル完了！</h2>
            <p class="tc-lead">おつかれさま！<br>ブロックを使った証明の進め方は、これでひととおり覚えたね。</p>
          </div>
          <div class="tc-pal-frame">
            <img src="asset/ヒッパルコス 喜び.webp" alt="パル">
          </div>
        </div>

        <div class="tc-learned">
          <div class="tc-learned-title">覚えたこと</div>
          <div class="tc-cards">${cards}</div>
        </div>

        <div class="tc-formulas">
          <span class="tc-formulas-label">使えるようになった公式</span>
          <span class="tc-formulas-items"></span>
        </div>

        <p class="tc-next"></p>
        <div class="tutorial-complete-actions">
          <button id="btn-tc-map" class="action-btn btn-secondary" type="button">ステージマップを見る</button>
          <button id="btn-tc-start" class="action-btn btn-primary" type="button">本編を始める ▶</button>
        </div>
      </div>`;
    const el = t.content.firstElementChild;
    document.body.appendChild(el);
    return el;
  }

  // 紙吹雪を撒く。開いたときに1回降らせて、そのあとは静かにする
  // （ずっと降り続けると、読ませたい文字の邪魔になる）。
  function dropConfetti(host) {
    host.innerHTML = '';
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;   // 動きを減らす設定の人には出さない
    const count = window.innerWidth < 700 ? 28 : 56;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const piece = document.createElement('i');
      const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = color;
      piece.style.animationDuration = `${3.2 + Math.random() * 2.2}s`;
      piece.style.animationDelay = `${Math.random() * 2.2}s`;
      // 細長いもの・四角いものを混ぜると、紙吹雪らしく見える
      if (i % 3 === 0) { piece.style.width = '6px'; piece.style.height = '6px'; piece.style.borderRadius = '50%'; }
      else if (i % 3 === 1) { piece.style.height = '18px'; }
      frag.appendChild(piece);
    }
    host.appendChild(frag);
  }

  // 解放済みの公式を並べる。まだ無ければ、この行ごと隠す。
  function renderFormulas(screen) {
    const row = screen.querySelector('.tc-formulas');
    const items = screen.querySelector('.tc-formulas-items');
    if (!row || !items) return;
    const unlocked = (typeof window.getUnlockedFormulaIds === 'function')
      ? (window.getUnlockedFormulaIds() || []) : [];
    const svg = (id) => (window.BlockSvg && typeof window.BlockSvg.formula === 'function')
      ? window.BlockSvg.formula(id) : '';
    const html = unlocked.map(svg).filter(Boolean).join(' ');
    items.innerHTML = html;
    row.style.display = html ? '' : 'none';
  }

  let screen = null;

  window.showTutorialCompleteScreen = function ({ onStart, onMap, replay } = {}) {
    screen = screen || build();
    const close = () => screen.classList.add('hidden');
    const start = screen.querySelector('#btn-tc-start');
    const map = screen.querySelector('#btn-tc-map');
    const next = screen.querySelector('.tc-next');

    // やり直しのときは行き先がちがう。
    // すでに本編を進めている人なので、1問目に送らずステージ選択へ戻す。
    start.classList.toggle('hidden', !!replay);
    map.classList.toggle('btn-primary', !!replay);
    map.classList.toggle('btn-secondary', !replay);
    map.textContent = replay ? 'ステージ選択へ戻る ▶' : 'ステージマップを見る';
    if (next) {
      const total = window.MAIN_STAGE_TOTAL || 26;
      next.textContent = replay
        ? 'おさらいはここまで。ステージ選択に戻って、続きから挑戦しよう！'
        : `ここからは本編。全${total}ステージに挑戦しよう！`;
    }

    renderFormulas(screen);
    dropConfetti(screen.querySelector('.tc-confetti'));

    start.onclick = () => { close(); window._tutorialReplay = false; if (typeof onStart === 'function') onStart(); };
    map.onclick = () => { close(); window._tutorialReplay = false; if (typeof onMap === 'function') onMap(); };
    screen.classList.remove('hidden');
    setTimeout(() => (replay ? map : start).focus(), 50);
  };

  // 「チュートリアルの最後 → 本編」に進む場面かどうか
  window.isLeavingTutorial = function (currentId, nextId) {
    return typeof window.isTutorialStageId === 'function'
      && window.isTutorialStageId(currentId)
      && nextId != null
      && !window.isTutorialStageId(nextId);
  };
})();
