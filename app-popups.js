// ===== app-popups.js =====
// ステージ開始時の特殊説明ポップアップおよび初期値制御を一括管理するモジュール

(function () {
  'use strict';

  // 1. ステージごとの初期値（ガイド・ヒント）の制御
  window.initializeStageFeaturesDefault = function (stageNumber) {
    const isTutorial = typeof window.isTutorialStageId === 'function' && window.isTutorialStageId(stageNumber);
    const btnOverwrite = document.getElementById('btn-overwrite-permission');
    
    if (isTutorial) {
      // チュートリアル：初期値ON
      if (btnOverwrite) {
        btnOverwrite.classList.remove('off');
        btnOverwrite.classList.add('on');
        btnOverwrite.textContent = 'ガイド機能: ON';
      }
      if (typeof window.updateTutorialHighlightUI === 'function') window.updateTutorialHighlightUI(stageNumber);
    } else {
      // 普通のステージ：初期値OFF
      if (btnOverwrite) {
        btnOverwrite.classList.remove('on');
        btnOverwrite.classList.add('off');
        btnOverwrite.textContent = 'ガイド機能: OFF';
      }
      if (typeof window.hideGoalHintForStage === 'function') window.hideGoalHintForStage();
    }
  };

  // 2. 特殊説明ポップアップの動的生成と表示
  window.checkAndShowStagePopup = function (stageNumber) {
    // 普通のステージ 1 のときのみ実行
    if (String(stageNumber) !== '1') return;
    
    // すでに表示済みの場合はスキップ
    if (localStorage.getItem('popup_seen_1_1') === 'true') return;

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
          本編領域へようこそ。円滑な証明介入のために、2つの支援機能が利用可能である。
        </p>
        
        <div style="background: rgba(6, 26, 58, 0.5); padding: 14px; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.2); margin-bottom: 16px;">
          <h3 style="color: #fbbf24; margin: 0 0 6px 0; font-size: 1.1rem;">① ヒント機能（画面下部ボタン）</h3>
          <p style="margin: 0; font-size: 0.9rem; color: #e6f0ff; line-height: 1.5;">
            構築に行き詰まった際、展開すべき公式のヒントを**段階的**にテキスト表示する。<br>
            本編での初期値は <span style="color: #fb7185; font-weight: 900;">OFF</span> となっているため、必要に応じて起動せよ。
          </p>
        </div>

        <div style="background: rgba(6, 26, 58, 0.5); padding: 14px; border-radius: 12px; border: 1px solid rgba(56, 189, 248, 0.2); margin-bottom: 20px;">
          <h3 style="color: #22c55e; margin: 0 0 6px 0; font-size: 1.1rem;">② ガイド機能（上部トグルボタン）</h3>
          <p style="margin: 0; font-size: 0.9rem; color: #e6f0ff; line-height: 1.5;">
            ONにすると、証明ステップに必要な基本スキャフォールド（置き換えブロックなど）が**ワークスペースに自動配置**され、介入を強力にサポートする。
          </p>
        </div>

        <p style="font-size: 0.85rem; color: rgba(203, 213, 225, 0.6); text-align: center; margin-bottom: 20px;">
          ※これらの機能は、いつでも自由にON/OFFを切り替えることができる。
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
        localStorage.setItem('popup_seen_1_1', 'true');
      };
    }
  };

})();