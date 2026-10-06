// ===== tutorial-complete.js =====
// チュートリアル（0-1〜0-8）を最後まで終えたときに出す「チュートリアル完了」画面。
// 以前は最後のチュートリアルをクリアすると、何の区切りもなく本編ステージ1が始まっていた。
//
// 使い方: window.showTutorialCompleteScreen({ onStart, onMap })
//   onStart … 「本編を始める」を押したとき（ステージ1へ）
//   onMap   … 「ステージマップを見る」を押したとき
// 次へ進む処理（app.js の自動遷移・「次の問題へ」ボタン）から呼ばれる。

(function () {
  function build() {
    const t = document.createElement('template');
    t.innerHTML = `
      <div id="tutorial-complete-screen" class="overlay-screen hidden" role="dialog" aria-modal="true" aria-labelledby="tutorial-complete-title">
        <div class="tutorial-complete-card">
          <div class="tutorial-complete-portraits">
            <img src="asset/喜び周りなし.webp" alt="有葉フリエ" class="tc-furie">
            <img src="asset/ヒッパルコス 喜び.webp" alt="パル" class="tc-pal">
          </div>
          <p class="tutorial-complete-eyebrow">TUTORIAL COMPLETE</p>
          <h2 id="tutorial-complete-title">チュートリアル完了！</h2>
          <p class="tutorial-complete-lead">おつかれさま！ブロックを使った証明の進め方は、これでひととおり覚えたね。</p>
          <ul class="tutorial-complete-list">
            <li>「置き換え」… 公式を使って式を書き換える</li>
            <li>「計算」… 公式を使わずに約分や整理をする</li>
            <li>「通分」… 分数を1つにまとめる</li>
            <li>困ったら右下のパルから「ヒント」「ガイド」「三角関数の解説」</li>
          </ul>
          <p class="tutorial-complete-next">ここからは本編。全22ステージに挑戦しよう！</p>
          <div class="tutorial-complete-actions">
            <button id="btn-tc-map" class="action-btn btn-secondary" type="button">ステージマップを見る</button>
            <button id="btn-tc-start" class="action-btn btn-primary" type="button">本編を始める ▶</button>
          </div>
        </div>
      </div>`;
    const el = t.content.firstElementChild;
    document.body.appendChild(el);
    return el;
  }

  let screen = null;

  window.showTutorialCompleteScreen = function ({ onStart, onMap } = {}) {
    screen = screen || build();
    const close = () => screen.classList.add('hidden');
    const start = screen.querySelector('#btn-tc-start');
    const map = screen.querySelector('#btn-tc-map');
    start.onclick = () => { close(); if (typeof onStart === 'function') onStart(); };
    map.onclick = () => { close(); if (typeof onMap === 'function') onMap(); };
    screen.classList.remove('hidden');
    setTimeout(() => start.focus(), 50);
  };

  // 「チュートリアルの最後 → 本編」に進む場面かどうか
  window.isLeavingTutorial = function (currentId, nextId) {
    return typeof window.isTutorialStageId === 'function'
      && window.isTutorialStageId(currentId)
      && nextId != null
      && !window.isTutorialStageId(nextId);
  };
})();
