// ===== app-popups.js =====
// ステージ開始時の特殊説明ポップアップおよび初期値制御を一括管理するモジュール

(function () {
  'use strict';

  // 1. ステージごとのヒントの初期値（どのステージでも「出ていない」状態から始める）
  //    段階的ヒントになったので、旧「ガイド機能」のON/OFFはここでは扱わない。
  window.initializeStageFeaturesDefault = function () {
    if (typeof window.resetHintLevel === 'function') window.resetHintLevel();
  };

  // 2. 特殊説明ポップアップの動的生成と表示
  window.checkAndShowStagePopup = function (stageNumber) {
    // 普通のステージ 1 のときのみ実行
    if (String(stageNumber) !== '1') return;
    
    // すでに表示済みの場合はスキップ
    if (window.AppStorage.getRaw('popup_seen_1_1') === 'true') return;

    // サイバーパンク風モーダルのHTML要素を動的に作成
    const overlay = document.createElement('div');
    overlay.className = 'overlay-screen';
    overlay.id = 'explanation-popup-modal';
    overlay.style.zIndex = '20000'; // シャッターより手前

    overlay.innerHTML = `
      <div class="formula-unlock-card" style="max-width: 560px; text-align: left;">
        <h2 style="color: #38bdf8; text-shadow: 0 0 10px rgba(56, 189, 248, 0.6); text-align: center; margin-top: 0;">
          💡 アシストプロトコルの解説
        </h2>
        <p style="color: #a5f3fc; font-weight: 700; margin-bottom: 20px; text-align: center;">
          本編領域へようこそ。行き詰まったときは、画面の下の「ヒント」ボタンを押すとよい。<br>
          ヒントは3段階。押すたびに1段ずつ強くなる。
        </p>

        <div style="background: rgba(6, 26, 58, 0.5); padding: 14px; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.2); margin-bottom: 16px;">
          <h3 style="color: #fbbf24; margin: 0 0 6px 0; font-size: 1.1rem;">1回目 … 進め方のヒント</h3>
          <p style="margin: 0; font-size: 0.9rem; color: #e6f0ff; line-height: 1.5;">
            この問題をどう崩していくかの方針が、作業エリアの右上にカードで出る。
          </p>
        </div>

        <div style="background: rgba(6, 26, 58, 0.5); padding: 14px; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.2); margin-bottom: 16px;">
          <h3 style="color: #38bdf8; margin: 0 0 6px 0; font-size: 1.1rem;">2回目 … 次に埋める穴が光る</h3>
          <p style="margin: 0; font-size: 0.9rem; color: #e6f0ff; line-height: 1.5;">
            ヒントがもう1つ増え、いま手をつけるべき穴が光る。
          </p>
        </div>

        <div style="background: rgba(6, 26, 58, 0.5); padding: 14px; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.2); margin-bottom: 20px;">
          <h3 style="color: #22c55e; margin: 0 0 6px 0; font-size: 1.1rem;">3回目 … ブロックを置いてもらう</h3>
          <p style="margin: 0; font-size: 0.9rem; color: #e6f0ff; line-height: 1.5;">
            「置き換え」ブロックが証明の中に置かれ、左の穴に問題の左辺が入った状態になる。
          </p>
        </div>

        <p style="font-size: 0.85rem; color: rgba(203, 213, 225, 0.6); text-align: center; margin-bottom: 20px;">
          ※ もう一度押すとヒントは消える。自力で解けたときほど力がつくので、まずは自分で考えてみること。
        </p>

        <div style="text-align: center;">
          <button id="btn-explanation-close" class="action-btn btn-primary" style="padding: 10px 32px;">了解した</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector('#btn-explanation-close');
    if (closeBtn) {
      closeBtn.onclick = function () {
        overlay.classList.add('hidden');
        setTimeout(() => overlay.remove(), 300);
        // 一度見たら保存して二度と出さない
        window.AppStorage.setRaw('popup_seen_1_1', 'true');
      };
    }
  };

})();