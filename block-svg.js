// ============================================
// block-svg.js
// Blockly のブロック見た目を、インライン SVG として再現するライブラリ。
// ヒントバナーやキャラダイアログのセリフ内に埋め込んでビジュアル理解を助けるため。
//
// 使い方:
//   window.BlockSvg.number()          // "1" の白い数字ブロック
//   window.BlockSvg.number('n')       // 中身を "n" 等に変える
//   window.BlockSvg.add()             // 足し算ブロック
//   window.BlockSvg.replaceOperation() // 置き換えブロック (緑)
//   window.BlockSvg.simplifyOperation() // 計算式ブロック (緑)
//   window.BlockSvg.commonDenominatorOperation() // 通分ブロック (青)
//   window.BlockSvg.proofStep()        // よって〜となる (茶色)
//   window.BlockSvg.formula(1)         // 公式① (紫)
//   window.BlockSvg.formula(2)         // 公式② (紫)
//   window.BlockSvg.formula(3)         // 公式③ (紫)
//
// 全ての SVG は class="basics-tutorial-hint-block" を持ち、
// 高さは CSS で 1.6em (basics-tutorial-waiting-hint-text のスタイルに合わせる)。
// ============================================

(function blockSvgModule() {
  // 共通の SVG 属性
  const SVG_CLASS = 'basics-tutorial-hint-block';

  // 内部ユーティリティ: 中身のスロット (楕円) を作る
  // socketFill: 中の色 (typically 薄めの色や #d0c4b0)
  function _slot(x, y, w, h, socketFill, socketStroke) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h/2}" ry="${h/2}"
      fill="${socketFill}" stroke="${socketStroke}" stroke-width="1"/>`;
  }

  // 内部ユーティリティ: ラベル文字
  function _label(x, y, text, options = {}) {
    const {
      fontSize = 12,
      fontWeight = 700,
      fontFamily = 'sans-serif',
      fill = '#ffffff',
      anchor = 'middle',
    } = options;
    return `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="${fontFamily}"
      font-size="${fontSize}" font-weight="${fontWeight}" fill="${fill}">${text}</text>`;
  }

  window.BlockSvg = {
    // custom_number: 白い楕円形カプセルに数字
    number: function(value = '1') {
      const label = String(value);
      return `<svg class="${SVG_CLASS}" viewBox="0 0 58 34" xmlns="http://www.w3.org/2000/svg" aria-label="${label}のブロック">
        <rect x="1" y="1" width="56" height="32" rx="16" ry="16"
          fill="#ffffff" stroke="#94a3b8" stroke-width="1.5"/>
        ${_label(29, 23, label, { fontFamily: 'serif', fontStyle: 'italic', fontSize: 18, fontWeight: 700, fill: '#0f172a' })}
      </svg>`;
    },

    // math_add: 茶色の角丸長方形、左右にスロットと中央に "+"
    add: function() {
      return `<svg class="${SVG_CLASS}" viewBox="0 0 130 34" xmlns="http://www.w3.org/2000/svg" aria-label="足し算のブロック">
        <rect x="1" y="1" width="128" height="32" rx="8" ry="8"
          fill="#a97a4b" stroke="#7a5030" stroke-width="1.5"/>
        ${_slot(8, 8, 42, 18, '#e6d3b8', '#7a5030')}
        ${_label(65, 23, '+', { fontWeight: 900, fontSize: 18, fill: '#ffffff' })}
        ${_slot(80, 8, 42, 18, '#e6d3b8', '#7a5030')}
      </svg>`;
    },

    // replace_operation: 緑色の長いブロック 「置き換え 式 [_] 【公式 [_] 】 → [_]」
    replaceOperation: function() {
      return `<svg class="${SVG_CLASS}" viewBox="0 0 280 34" xmlns="http://www.w3.org/2000/svg" aria-label="置き換えブロック">
        <rect x="1" y="1" width="278" height="32" rx="8" ry="8"
          fill="#5ba05b" stroke="#3d7d3d" stroke-width="1.5"/>
        ${_label(30, 22, '置き換え', { fontSize: 11, fontWeight: 800, fill: '#ffffff' })}
        ${_label(59, 22, '式', { fontSize: 11, fontWeight: 800, fill: '#ffffff' })}
        ${_slot(70, 10, 32, 14, '#c8e6c8', '#3d7d3d')}
        ${_label(115, 22, '【', { fontSize: 12, fontWeight: 800, fill: '#ffffff' })}
        ${_label(133, 22, '公式', { fontSize: 11, fontWeight: 800, fill: '#ffffff' })}
        ${_slot(154, 10, 32, 14, '#c8e6c8', '#3d7d3d')}
        ${_label(196, 22, '】', { fontSize: 12, fontWeight: 800, fill: '#ffffff' })}
        ${_label(213, 22, '→', { fontSize: 13, fontWeight: 900, fill: '#ffffff' })}
        ${_slot(230, 10, 42, 14, '#c8e6c8', '#3d7d3d')}
      </svg>`;
    },

    // simplify_operation: 緑色 「計算式 [_] → [_]」
    simplifyOperation: function() {
      return `<svg class="${SVG_CLASS}" viewBox="0 0 200 34" xmlns="http://www.w3.org/2000/svg" aria-label="計算式ブロック">
        <rect x="1" y="1" width="198" height="32" rx="8" ry="8"
          fill="#5ba05b" stroke="#3d7d3d" stroke-width="1.5"/>
        ${_label(32, 22, '計算式', { fontSize: 11, fontWeight: 800, fill: '#ffffff' })}
        ${_slot(60, 10, 52, 14, '#c8e6c8', '#3d7d3d')}
        ${_label(126, 22, '→', { fontSize: 13, fontWeight: 900, fill: '#ffffff' })}
        ${_slot(142, 10, 52, 14, '#c8e6c8', '#3d7d3d')}
      </svg>`;
    },

    // common_denominator_operation: 青色 「通分 [_] [通分する] → [_]」
    commonDenominatorOperation: function() {
      return `<svg class="${SVG_CLASS}" viewBox="0 0 240 34" xmlns="http://www.w3.org/2000/svg" aria-label="通分ブロック">
        <rect x="1" y="1" width="238" height="32" rx="8" ry="8"
          fill="#3b82f6" stroke="#1e40af" stroke-width="1.5"/>
        ${_label(24, 22, '通分', { fontSize: 11, fontWeight: 800, fill: '#ffffff' })}
        ${_slot(46, 10, 48, 14, '#c8dbf6', '#1e40af')}
        <rect x="100" y="8" width="56" height="18" rx="4" ry="4"
          fill="#ffffff" stroke="#1e40af" stroke-width="1"/>
        ${_label(128, 22, '通分する', { fontSize: 9, fontWeight: 700, fill: '#1e293b' })}
        ${_label(168, 22, '→', { fontSize: 13, fontWeight: 900, fill: '#ffffff' })}
        ${_slot(184, 10, 48, 14, '#c8dbf6', '#1e40af')}
      </svg>`;
    },

    // proof_step: 茶色〜紫のC字型ブロック 「証明 / 操作 / よって [_] となる」
    // 簡略化して 「よって [_] となる」 のヘッダだけ描く
    proofStep: function() {
      return `<svg class="${SVG_CLASS}" viewBox="0 0 160 34" xmlns="http://www.w3.org/2000/svg" aria-label="よって〜となるブロック">
        <rect x="1" y="1" width="158" height="32" rx="8" ry="8"
          fill="#a97a4b" stroke="#7a5030" stroke-width="1.5"/>
        ${_label(24, 22, 'よって', { fontSize: 11, fontWeight: 800, fill: '#ffffff' })}
        ${_slot(52, 10, 36, 14, '#ffffff', '#7a5030')}
        ${_label(120, 22, 'となる', { fontSize: 11, fontWeight: 800, fill: '#ffffff' })}
      </svg>`;
    },

    // formula: 紫色のブロック 公式ID→表示ラベル
    formula: function(n) {
      const num = String(n);
      const labels = {
        '1': 'sin²θ + cos²θ = 1',
        '2': 'tanθ = sinθ/cosθ',
        '3': '1 + tan²θ = 1/cos²θ',
      };
      const circleNum = n === 1 || n === '1' ? '①' : (n === 2 || n === '2' ? '②' : '③');
      const label = labels[num] || `公式${circleNum}`;
      // 幅は中身の長さで自動 (最大 240 くらい想定)
      return `<svg class="${SVG_CLASS}" viewBox="0 0 220 34" xmlns="http://www.w3.org/2000/svg" aria-label="公式${circleNum}ブロック">
        <rect x="1" y="1" width="218" height="32" rx="16" ry="16"
          fill="#9333ea" stroke="#6b21a8" stroke-width="1.5"/>
        ${_label(20, 23, circleNum, { fontSize: 16, fontWeight: 900, fill: '#ffffff' })}
        ${_label(120, 22, label, { fontSize: 11, fontWeight: 700, fill: '#ffffff', fontFamily: 'serif' })}
      </svg>`;
    },
  };
})();