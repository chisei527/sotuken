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
//   window.BlockSvg.formula('formula_addition_sin') // 加法公式 sin (紫)
//   window.BlockSvg.term('α')          // α などの角のブロック (青)
//
// 全ての SVG は class="basics-tutorial-hint-block" を持ち、
// 高さは CSS で 1.6em (basics-tutorial-waiting-hint-text のスタイルに合わせる)。
// ============================================

(function blockSvgModule() {
  // 共通の SVG 属性
  const SVG_CLASS = 'basics-tutorial-hint-block';

  // ===== 色 =====
  // 盤面のブロックと同じ色を使う。定義元は blocks.js の BLOCK_COLORS 1か所だけ。
  // （blocks.js → block-svg.js の順に読み込まれる。読めなかったときのために同じ値を控えに置く）
  const C = window.BLOCK_COLORS || {
    term: '#4A7BB7', number: '#5B8CC8', operator: '#6B4A32', formula: '#6D3FBF',
    proof: '#17304F', replace: '#17514A', simplify: '#1C4D35', common: '#24547A',
    conclusion: '#55304F',
  };

  // 16進の色を明るく/暗くする。ratio>0 で白寄り、<0 で黒寄り。
  function _shade(hex, ratio) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      const t = ratio > 0 ? 255 : 0;
      return Math.round(v + (t - v) * Math.abs(ratio));
    });
    return '#' + ch.map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  // セリフの吹き出しは暗い背景なので、枠線は中の色より「明るく」して輪郭を出す。
  // 盤面では枠線を暗くしているが、ここは下地が違うので逆にする。
  const _edge = (hex) => _shade(hex, 0.3);
  // 空いている穴。ブロックの色を暗くして「へこみ」に見せる。
  const _hole = (hex) => _shade(hex, -0.42);

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

    // math_add: 演算子の茶色。左右に穴と中央に "+"
    add: function() {
      return `<svg class="${SVG_CLASS}" viewBox="0 0 130 34" xmlns="http://www.w3.org/2000/svg" aria-label="足し算のブロック">
        <rect x="1" y="1" width="128" height="32" rx="8" ry="8"
          fill="${C.operator}" stroke="${_edge(C.operator)}" stroke-width="1.5"/>
        ${_slot(8, 8, 42, 18, _hole(C.operator), _edge(C.operator))}
        ${_label(65, 23, '+', { fontWeight: 700, fontSize: 18, fill: '#ffffff' })}
        ${_slot(80, 8, 42, 18, _hole(C.operator), _edge(C.operator))}
      </svg>`;
    },

    // replace_operation: 緑色の長いブロック 「置き換え 式 [_] 【公式 [_] 】 → [_]」
    replaceOperation: function() {
      return `<svg class="${SVG_CLASS}" viewBox="0 0 280 34" xmlns="http://www.w3.org/2000/svg" aria-label="置き換えブロック">
        <rect x="1" y="1" width="278" height="32" rx="8" ry="8"
          fill="${C.replace}" stroke="${_edge(C.replace)}" stroke-width="1.5"/>
        ${_label(30, 22, '置き換え', { fontSize: 11, fontWeight: 800, fill: '#ffffff' })}
        ${_label(59, 22, '式', { fontSize: 11, fontWeight: 800, fill: '#ffffff' })}
        ${_slot(70, 10, 32, 14, _hole(C.replace), _edge(C.replace))}
        ${_label(115, 22, '【', { fontSize: 12, fontWeight: 800, fill: '#ffffff' })}
        ${_label(133, 22, '公式', { fontSize: 11, fontWeight: 800, fill: '#ffffff' })}
        ${_slot(154, 10, 32, 14, _hole(C.formula), _edge(C.formula))}
        ${_label(196, 22, '】', { fontSize: 12, fontWeight: 800, fill: '#ffffff' })}
        ${_label(213, 22, '→', { fontSize: 13, fontWeight: 700, fill: '#ffffff' })}
        ${_slot(230, 10, 42, 14, _hole(C.replace), _edge(C.replace))}
      </svg>`;
    },

    // simplify_operation: 緑色 「計算式 [_] → [_]」
    simplifyOperation: function() {
      return `<svg class="${SVG_CLASS}" viewBox="0 0 200 34" xmlns="http://www.w3.org/2000/svg" aria-label="計算式ブロック">
        <rect x="1" y="1" width="198" height="32" rx="8" ry="8"
          fill="${C.simplify}" stroke="${_edge(C.simplify)}" stroke-width="1.5"/>
        ${_label(32, 22, '計算式', { fontSize: 11, fontWeight: 800, fill: '#ffffff' })}
        ${_slot(60, 10, 52, 14, _hole(C.simplify), _edge(C.simplify))}
        ${_label(126, 22, '→', { fontSize: 13, fontWeight: 700, fill: '#ffffff' })}
        ${_slot(142, 10, 52, 14, _hole(C.simplify), _edge(C.simplify))}
      </svg>`;
    },

    // common_denominator_operation: 青色 「通分 [_] [通分する] → [_]」
    commonDenominatorOperation: function() {
      return `<svg class="${SVG_CLASS}" viewBox="0 0 240 34" xmlns="http://www.w3.org/2000/svg" aria-label="通分ブロック">
        <rect x="1" y="1" width="238" height="32" rx="8" ry="8"
          fill="${C.common}" stroke="${_edge(C.common)}" stroke-width="1.5"/>
        ${_label(24, 22, '通分', { fontSize: 11, fontWeight: 800, fill: '#ffffff' })}
        ${_slot(46, 10, 48, 14, _hole(C.common), _edge(C.common))}
        <rect x="100" y="8" width="56" height="18" rx="4" ry="4"
          fill="#cfe4fb" stroke="${_edge(C.common)}" stroke-width="1"/>
        ${_label(128, 22, '通分する', { fontSize: 9, fontWeight: 700, fill: '#1e293b' })}
        ${_label(168, 22, '→', { fontSize: 13, fontWeight: 700, fill: '#ffffff' })}
        ${_slot(184, 10, 48, 14, _hole(C.common), _edge(C.common))}
      </svg>`;
    },

    // conclusion_operation: 「よって [_] となる」。盤面と同じ梅色。
    proofStep: function() {
      return `<svg class="${SVG_CLASS}" viewBox="0 0 160 34" xmlns="http://www.w3.org/2000/svg" aria-label="よって〜となるブロック">
        <rect x="1" y="1" width="158" height="32" rx="8" ry="8"
          fill="${C.conclusion}" stroke="${_edge(C.conclusion)}" stroke-width="1.5"/>
        ${_label(24, 22, 'よって', { fontSize: 11, fontWeight: 700, fill: '#ffffff' })}
        ${_slot(52, 10, 36, 14, _hole(C.conclusion), _edge(C.conclusion))}
        ${_label(120, 22, 'となる', { fontSize: 11, fontWeight: 700, fill: '#ffffff' })}
      </svg>`;
    },

    // formula: 紫色のブロック
    //   formula(1) / formula('2')              … 公式①②③
    //   formula('formula_addition_sin') など   … 加法公式（ブロックIDでも指定できる）
    formula: function(n) {
      const key = String(n);
      const MARKS = {
        '1': '①', '2': '②', '3': '③',
        formula_1: '①', formula_2: '②', formula_3: '③',
        formula_addition_sin: '加法', formula_addition_cos: '加法', formula_addition_tan: '加法',
      };
      const LABELS = {
        '1': 'sin²θ + cos²θ = 1',
        '2': 'tanθ = sinθ/cosθ',
        '3': '1 + tan²θ = 1/cos²θ',
        formula_1: 'sin²θ + cos²θ = 1',
        formula_2: 'tanθ = sinθ/cosθ',
        formula_3: '1 + tan²θ = 1/cos²θ',
        formula_addition_sin: 'sin(α+β) = sinαcosβ + cosαsinβ',
        formula_addition_cos: 'cos(α+β) = cosαcosβ − sinαsinβ',
        formula_addition_tan: 'tan(α+β) = (tanα+tanβ)/(1−tanαtanβ)',
      };
      const mark = MARKS[key] || '③';
      const label = LABELS[key] || `公式${mark}`;
      // 加法公式は数式が長いので、記号の欄を広めに取り、文字を少し小さくする
      const isAddition = mark === '加法';
      const markX = isAddition ? 30 : 20;
      const markSize = isAddition ? 11 : 16;
      const textX = isAddition ? 135 : 120;
      const textSize = isAddition ? 10 : 11;
      // 幅は中身の長さで自動 (最大 240 くらい想定)
      return `<svg class="${SVG_CLASS}" viewBox="0 0 250 34" xmlns="http://www.w3.org/2000/svg" aria-label="${mark === '加法' ? '加法公式' : '公式' + mark}ブロック">
        <rect x="1" y="1" width="248" height="32" rx="16" ry="16"
          fill="${C.formula}" stroke="${_edge(C.formula)}" stroke-width="1.5"/>
        ${_label(markX, 23, mark, { fontSize: markSize, fontWeight: 700, fill: '#ffffff' })}
        ${_label(textX, 22, label, { fontSize: textSize, fontWeight: 700, fill: '#ffffff', fontFamily: 'serif' })}
      </svg>`;
    },

    // 角のブロック (α / β / sin( ) など)。青系の基本ブロックと同じ見た目。
    term: function(label = 'α') {
      const text = String(label);
      const width = Math.max(44, 18 + text.length * 11);
      return `<svg class="${SVG_CLASS}" viewBox="0 0 ${width} 34" xmlns="http://www.w3.org/2000/svg" aria-label="${text}のブロック">
        <rect x="1" y="1" width="${width - 2}" height="32" rx="16" ry="16"
          fill="${C.term}" stroke="${_edge(C.term)}" stroke-width="1.5"/>
        ${_label(width / 2, 23, text, { fontSize: 14, fontWeight: 800, fill: '#ffffff', fontFamily: 'serif' })}
      </svg>`;
    },
  };
})();