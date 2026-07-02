// ============================================
// explanations.js
// 教育的な解説コンテンツをまとめて管理するファイル。
// - 各公式の解説 (FORMULA_EXPLANATIONS)
// - 三角関数の基礎 (TRIG_BASICS_ENTRIES)
// - 解説モーダルで使うSVG図の生成 (getFormulaReferenceSvg)
//
// 依存: math-logic.js の FORMULA_REGISTRY (このファイルの末尾でマージする)
// このファイルは math-logic.js より後、app.js より前に読み込むこと。
// ============================================

// ============================================
// 公式解説 (FORMULA_REGISTRY にマージされる)
// 新しい公式の解説を追加する場合は、対応する formula_N をここに追加する。
// ============================================
window.FORMULA_EXPLANATIONS = {
  formula_1: {
    title: '公式① 三平方の関係',
    displayLatex: '\\sin^2\\theta + \\cos^2\\theta = 1',
    meaning:
      '半径1の円(単位円)を考えたとき、円周上の点は座標で (cos&theta;, sin&theta;) と表せる。' +
      '原点からその点までの距離が常に1だから、x座標とy座標の二乗の和は 1² = 1 になる。' +
      'つまり sin&theta; と cos&theta; の二乗の和は、&theta; がどんな角度であっても必ず 1 になる。',
    derivation:
      '直角三角形において、斜辺の長さを 1 とすると、対辺(縦)が sin&theta;、隣辺(横)が cos&theta;。' +
      '三平方の定理 a² + b² = c² より、対辺² + 隣辺² = 斜辺² なので sin²&theta; + cos²&theta; = 1² = 1。',
    usage:
      '式の中に sin²&theta; + cos²&theta; のパターンが現れたら、迷わず 1 に置き換えられる。' +
      '逆に「1」を「sin²&theta; + cos²&theta;」に展開して、他の項とまとめる使い方もよくある。',
    variants: [
      '\\sin^2\\theta = 1 - \\cos^2\\theta',
      '\\cos^2\\theta = 1 - \\sin^2\\theta',
    ],
    svgKey: 'unitCircle',
  },
  formula_2: {
    title: '公式② tan の定義',
    displayLatex: '\\tan\\theta = \\dfrac{\\sin\\theta}{\\cos\\theta}',
    meaning:
      'tan&theta; は「対辺 ÷ 隣辺」と定義される。' +
      '対辺は sin&theta; に、隣辺は cos&theta; に対応するので、tan&theta; は sin&theta; を cos&theta; で割ったものに等しい。',
    derivation:
      '直角三角形で対辺/隣辺 = (対辺/斜辺) ÷ (隣辺/斜辺) = sin&theta;/cos&theta;。' +
      '斜辺で割って約分しているだけで、本質的には対辺と隣辺の比そのもの。',
    usage:
      'tan&theta; を sin&theta;/cos&theta; に書き換えて分数の形にすると、他の項と通分できることが多い。' +
      '逆に、sin&theta;/cos&theta; の形を tan&theta; にまとめて式を短くするのも基本テクニック。',
    variants: [
      '\\sin\\theta = \\tan\\theta \\cdot \\cos\\theta',
    ],
    svgKey: 'rightTriangle',
  },
  formula_3: {
    title: '公式③ tan の三平方関係',
    displayLatex: '1 + \\tan^2\\theta = \\dfrac{1}{\\cos^2\\theta}',
    meaning:
      '公式①の両辺を cos²&theta; で割ると導かれる関係。' +
      'tan の二乗が含まれる式と、1/cos²&theta; を行き来できる強力な変形ツール。',
    derivation:
      '公式① sin²&theta; + cos²&theta; = 1 の両辺を cos²&theta; で割ると、' +
      'sin²&theta;/cos²&theta; + cos²&theta;/cos²&theta; = 1/cos²&theta;。' +
      'sin&theta;/cos&theta; = tan&theta; (公式②) なので、左辺の最初の項は tan²&theta;。第2項は 1。よって 1 + tan²&theta; = 1/cos²&theta;。',
    usage:
      'tan²&theta; が出てくる式で、1/cos²&theta; に変換したいときに使う。' +
      '逆に 1/cos²&theta; を 1 + tan²&theta; に分解すると、tan を含む別の式とまとめやすくなる。',
    variants: [
      '\\tan^2\\theta = \\dfrac{1}{\\cos^2\\theta} - 1',
    ],
    svgKey: null, // 公式①②から導出される関係なので、専用の図は省略
  },
};

// ============================================
// 三角関数の基礎解説 (三角関数がわからない人向け)
// 公式解説モーダルの中に、公式①〜③と並ぶ形でタブ表示される。
// 増やしたければこの配列に追加するだけでモーダルに反映される。
// ============================================
window.TRIG_BASICS_ENTRIES = [
  {
    id: 'basics_intro',
    label: '基礎①',
    tabTitle: '三角関数とは',
    body: {
      title: '三角関数とは何か',
      displayLatex: '\\sin\\theta,\\; \\cos\\theta,\\; \\tan\\theta',
      sections: [
        {
          heading: '直角三角形の辺の比',
          body:
            '三角関数は「直角三角形の辺の長さの比」を表す関数。' +
            '直角三角形の1つの角を &theta; とし、辺を「対辺(向かい合う辺)」「隣辺(となりの辺)」「斜辺(一番長い辺)」と呼ぶ。' +
            'これらの比を、角度 &theta; の関数として次のように定義する。',
        },
        {
          heading: 'sin θ (正弦・サイン)',
          body: '「対辺 ÷ 斜辺」。斜辺の長さを1にしたときの縦の高さ。',
        },
        {
          heading: 'cos θ (余弦・コサイン)',
          body: '「隣辺 ÷ 斜辺」。斜辺の長さを1にしたときの横の幅。',
        },
        {
          heading: 'tan θ (正接・タンジェント)',
          body:
            '「対辺 ÷ 隣辺」。三角形の傾きを表す。' +
            'また、tan&theta; = sin&theta; / cos&theta; の関係が成り立つ (公式②)。',
        },
        {
          heading: 'なぜ役に立つ？',
          body:
            '角度と長さの関係を式で扱えるようになるので、物理・工学・波動・音・光・建築など、あらゆる場面で登場する。' +
            'このアプリでは、これらの間に成り立つ「恒等式」を証明することで、三角関数の変形パターンに慣れることを目指す。',
        },
      ],
      svgKey: 'rightTriangleAnnotated',
    },
  },
  {
    id: 'basics_unit_circle',
    label: '基礎②',
    tabTitle: '単位円で理解する',
    body: {
      title: '単位円と三角関数',
      displayLatex: '(\\cos\\theta,\\; \\sin\\theta)',
      sections: [
        {
          heading: '直角三角形だけでは説明しきれない',
          body:
            '直角三角形の角度は 0°〜90° の範囲でしか使えないが、' +
            '実際の三角関数は 180° や 270°、負の角度でも定義される。' +
            'そのために使うのが「単位円」という考え方。',
        },
        {
          heading: '単位円とは',
          body: '原点を中心とする、半径1の円のこと。この円周上の点の座標を使って三角関数を定義し直す。',
        },
        {
          heading: '定義',
          body:
            'x軸の正の向きから反時計回りに &theta; だけ回った点の座標を (cos&theta;, sin&theta;) と決める。' +
            'こうすると &theta; がどんな値でも sin&theta; と cos&theta; が計算できる。',
        },
        {
          heading: '公式①との関係',
          body:
            '単位円は半径1なので、円周上の任意の点 (cos&theta;, sin&theta;) は「原点からの距離が1」を満たす。' +
            '座標距離の公式 x² + y² = r² より cos²&theta; + sin²&theta; = 1²= 1、これが公式①の正体。',
        },
      ],
      svgKey: 'unitCircle',
    },
  },
  {
    id: 'basics_special_values',
    label: '基礎③',
    tabTitle: '代表的な角度の値',
    body: {
      title: 'よく使う角度の値',
      displayLatex: '\\sin 30° = \\dfrac{1}{2},\\; \\cos 30° = \\dfrac{\\sqrt{3}}{2}',
      sections: [
        {
          heading: '暗記して損なし',
          body:
            '0°, 30°, 45°, 60°, 90° は特別で、sin/cos/tan の値がきれいな形になる。' +
            '証明問題でも計算問題でも頻出なので、下の表は覚えておくと有利。',
        },
        {
          heading: '値の表',
          body:
            '<div style="overflow-x:auto; margin-top: 6px;">' +
            '<table style="border-collapse: collapse; width: 100%; color: #cbd5e1;">' +
            '<thead><tr style="background: rgba(56,189,248,0.15);">' +
            '<th style="padding:6px 10px; border:1px solid rgba(56,189,248,0.35);">角度</th>' +
            '<th style="padding:6px 10px; border:1px solid rgba(56,189,248,0.35);">sin</th>' +
            '<th style="padding:6px 10px; border:1px solid rgba(56,189,248,0.35);">cos</th>' +
            '<th style="padding:6px 10px; border:1px solid rgba(56,189,248,0.35);">tan</th>' +
            '</tr></thead><tbody>' +
            '<tr><td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">0°</td>' +
              '<td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">0</td>' +
              '<td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">1</td>' +
              '<td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">0</td></tr>' +
            '<tr><td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">30°</td>' +
              '<td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">1/2</td>' +
              '<td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">&radic;3/2</td>' +
              '<td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">1/&radic;3</td></tr>' +
            '<tr><td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">45°</td>' +
              '<td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">&radic;2/2</td>' +
              '<td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">&radic;2/2</td>' +
              '<td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">1</td></tr>' +
            '<tr><td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">60°</td>' +
              '<td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">&radic;3/2</td>' +
              '<td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">1/2</td>' +
              '<td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">&radic;3</td></tr>' +
            '<tr><td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">90°</td>' +
              '<td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">1</td>' +
              '<td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">0</td>' +
              '<td style="padding:6px 10px; border:1px solid rgba(255,255,255,0.15); text-align:center;">未定義</td></tr>' +
            '</tbody></table></div>',
          isRawHtml: true,
        },
        {
          heading: '覚え方のコツ',
          body:
            'sin は 0°→90° で 0 から 1 へ増える、cos は 1 から 0 へ減る。' +
            '30°/45°/60° の値は "1/2, &radic;2/2, &radic;3/2" のように分子が √1, √2, √3 と並ぶと考えると覚えやすい。',
        },
      ],
      svgKey: 'specialAngles',
    },
  },
];

// ============================================
// 解説モーダルで使う SVG 図の生成
// 新しい図を足したら svgKey を対応させる。
// ============================================
window.getFormulaReferenceSvg = function(svgKey) {
  if (svgKey === 'unitCircle') {
    // 単位円: 原点中心の円と、第1象限の点 (cosθ, sinθ)
    return `
<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" style="font-family: sans-serif;">
  <line x1="20" y1="120" x2="220" y2="120" stroke="#64748b" stroke-width="1"/>
  <line x1="120" y1="20" x2="120" y2="220" stroke="#64748b" stroke-width="1"/>
  <circle cx="120" cy="120" r="80" fill="none" stroke="#38bdf8" stroke-width="2"/>
  <line x1="120" y1="120" x2="171" y2="59" stroke="#fbbf24" stroke-width="2"/>
  <line x1="171" y1="59" x2="171" y2="120" stroke="#a78bfa" stroke-width="1.5" stroke-dasharray="3,3"/>
  <line x1="120" y1="120" x2="171" y2="120" stroke="#a78bfa" stroke-width="1.5" stroke-dasharray="3,3"/>
  <circle cx="171" cy="59" r="3.5" fill="#fbbf24"/>
  <path d="M 140 120 A 20 20 0 0 0 134 105" fill="none" stroke="#f97316" stroke-width="1.5"/>
  <text x="144" y="116" fill="#f97316" font-size="11" font-weight="bold">θ</text>
  <text x="176" y="55" fill="#fbbf24" font-size="11" font-weight="bold">(cosθ, sinθ)</text>
  <text x="138" y="135" fill="#a78bfa" font-size="10">cosθ</text>
  <text x="173" y="92" fill="#a78bfa" font-size="10">sinθ</text>
  <text x="222" y="124" fill="#94a3b8" font-size="11">x</text>
  <text x="124" y="22" fill="#94a3b8" font-size="11">y</text>
  <text x="120" y="216" fill="#64748b" font-size="10" text-anchor="middle">半径1の単位円</text>
</svg>`;
  }
  if (svgKey === 'rightTriangle') {
    // 直角三角形: 斜辺・対辺・隣辺
    return `
<svg viewBox="0 0 240 200" xmlns="http://www.w3.org/2000/svg" style="font-family: sans-serif;">
  <polygon points="40,170 200,170 200,50" fill="rgba(56,189,248,0.1)" stroke="#38bdf8" stroke-width="2"/>
  <polyline points="188,170 188,158 200,158" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
  <path d="M 64 170 A 24 24 0 0 0 60 156" fill="none" stroke="#f97316" stroke-width="1.5"/>
  <text x="118" y="186" fill="#a78bfa" font-size="13" text-anchor="middle" font-weight="bold">隣辺 (cosθ)</text>
  <text x="210" y="115" fill="#a78bfa" font-size="13" font-weight="bold">対辺 (sinθ)</text>
  <text x="105" y="100" fill="#fbbf24" font-size="13" font-weight="bold" transform="rotate(-37, 105, 100)">斜辺 = 1</text>
  <text x="60" y="166" fill="#f97316" font-size="14" font-weight="bold">θ</text>
</svg>`;
  }
  if (svgKey === 'rightTriangleAnnotated') {
    // 情報量多めの直角三角形
    return `
<svg viewBox="0 0 260 220" xmlns="http://www.w3.org/2000/svg" style="font-family: sans-serif;">
  <polygon points="40,180 220,180 220,50" fill="rgba(56,189,248,0.1)" stroke="#38bdf8" stroke-width="2"/>
  <polyline points="208,180 208,168 220,168" fill="none" stroke="#38bdf8" stroke-width="1.5"/>
  <path d="M 64 180 A 24 24 0 0 0 60 166" fill="none" stroke="#f97316" stroke-width="1.5"/>
  <text x="128" y="200" fill="#a78bfa" font-size="12" text-anchor="middle" font-weight="bold">隣辺</text>
  <text x="128" y="214" fill="#94a3b8" font-size="10" text-anchor="middle">(cosθ に対応)</text>
  <text x="228" y="120" fill="#a78bfa" font-size="12" font-weight="bold">対辺</text>
  <text x="228" y="134" fill="#94a3b8" font-size="10">(sinθ)</text>
  <text x="102" y="108" fill="#fbbf24" font-size="12" font-weight="bold" transform="rotate(-36, 102, 108)">斜辺</text>
  <text x="118" y="126" fill="#94a3b8" font-size="10" transform="rotate(-36, 118, 126)">(=1で正規化)</text>
  <text x="60" y="176" fill="#f97316" font-size="14" font-weight="bold">θ</text>
</svg>`;
  }
  if (svgKey === 'specialAngles') {
    // 単位円上に 30°/45°/60°/90° の点をマーク
    return `
<svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg" style="font-family: sans-serif;">
  <line x1="20" y1="120" x2="220" y2="120" stroke="#64748b" stroke-width="1"/>
  <line x1="120" y1="20" x2="120" y2="220" stroke="#64748b" stroke-width="1"/>
  <circle cx="120" cy="120" r="80" fill="none" stroke="#38bdf8" stroke-width="2"/>
  <line x1="120" y1="120" x2="189" y2="80" stroke="#4ade80" stroke-width="1.5"/>
  <circle cx="189" cy="80" r="3" fill="#4ade80"/>
  <text x="193" y="76" fill="#4ade80" font-size="11" font-weight="bold">30°</text>
  <line x1="120" y1="120" x2="177" y2="63" stroke="#fbbf24" stroke-width="1.5"/>
  <circle cx="177" cy="63" r="3" fill="#fbbf24"/>
  <text x="167" y="55" fill="#fbbf24" font-size="11" font-weight="bold">45°</text>
  <line x1="120" y1="120" x2="160" y2="51" stroke="#f472b6" stroke-width="1.5"/>
  <circle cx="160" cy="51" r="3" fill="#f472b6"/>
  <text x="135" y="49" fill="#f472b6" font-size="11" font-weight="bold">60°</text>
  <line x1="120" y1="120" x2="120" y2="40" stroke="#a78bfa" stroke-width="1.5"/>
  <circle cx="120" cy="40" r="3" fill="#a78bfa"/>
  <text x="98" y="36" fill="#a78bfa" font-size="11" font-weight="bold">90°</text>
  <circle cx="200" cy="120" r="3" fill="#e2e8f0"/>
  <text x="204" y="116" fill="#e2e8f0" font-size="11" font-weight="bold">0°</text>
  <text x="222" y="124" fill="#94a3b8" font-size="11">x</text>
  <text x="124" y="22" fill="#94a3b8" font-size="11">y</text>
  <text x="120" y="216" fill="#64748b" font-size="10" text-anchor="middle">代表的な角度の位置</text>
</svg>`;
  }
  return '';
};

// ============================================
// FORMULA_EXPLANATIONS を FORMULA_REGISTRY にマージする
// これにより、renderFormulaReference は既存通り
//   registry[id].explanation
// で解説にアクセスできる。
// ============================================
(function mergeExplanationsIntoRegistry() {
  if (!window.FORMULA_REGISTRY) return;
  Object.keys(window.FORMULA_EXPLANATIONS).forEach((formulaId) => {
    if (window.FORMULA_REGISTRY[formulaId]) {
      window.FORMULA_REGISTRY[formulaId].explanation = window.FORMULA_EXPLANATIONS[formulaId];
    }
  });
})();