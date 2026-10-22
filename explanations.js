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
    lecture: {
      intro: '三角関数で最初に覚える関係。この1本だけで解ける問題がたくさんあるので、まずはここを自分のものにしよう。',
      steps: [
        {
          body: '半径1の円（単位円）を描き、x軸の正の向きから反時計回りに &theta; だけ回った点を P とする。三角関数の定義から、P の座標はこうなる。',
          latex: 'P(\\cos\\theta,\\ \\sin\\theta)',
        },
        {
          body: 'P は円の上の点だから、原点 O からの距離は必ず半径の 1 に等しい。&theta; をどこまで回しても、この距離は変わらない。',
          latex: 'OP = 1',
        },
        {
          body: '2点間の距離の式 √(x² + y²) に、P の座標をそのまま入れる。',
          latex: '\\sqrt{(\\cos\\theta)^2 + (\\sin\\theta)^2} = 1',
        },
        {
          body: '両辺を2乗すれば根号が外れて、公式①ができあがる。&theta; に条件を一切使っていないので、どんな角でも成り立つ。',
          latex: '\\cos^2\\theta + \\sin^2\\theta = 1',
        },
      ],
      examples: [
        {
          title: '例題 1 ── 値を求める',
          problem: '0° < \\theta < 90°,\\quad \\sin\\theta = \\dfrac{3}{5}\\ \\text{のとき}\\ \\cos\\theta\\ \\text{は？}',
          steps: [
            { body: '公式①に sin&theta; の値を入れる。', latex: '\\left(\\dfrac{3}{5}\\right)^2 + \\cos^2\\theta = 1' },
            { body: 'cos²&theta; について解く。', latex: '\\cos^2\\theta = 1 - \\dfrac{9}{25} = \\dfrac{16}{25}' },
            { body: '2乗して 16/25 になる数は ±4/5 の2つ。ここで &theta; が 0°〜90°（第1象限）だと分かっているので、cos&theta; は正のほうに決まる。', latex: '\\cos\\theta = \\pm\\dfrac{4}{5}' },
          ],
          answer: '\\cos\\theta = \\dfrac{4}{5}',
          note: '2乗を外すときは必ず符号を2つとも書き出し、角の範囲で片方を落とす。これが答案の作法。',
        },
        {
          title: '例題 2 ── 式を整理する',
          problem: '(1 - \\cos\\theta)(1 + \\cos\\theta)\\ \\text{を簡単にせよ}',
          steps: [
            { body: '和と差の積なので、まず展開する。', latex: '(1-\\cos\\theta)(1+\\cos\\theta) = 1 - \\cos^2\\theta' },
            { body: '公式①を sin の形に直したもの（派生形）を使う。', latex: '1 - \\cos^2\\theta = \\sin^2\\theta' },
          ],
          answer: '\\sin^2\\theta',
          note: 'このアプリでも「1 − cos²&theta;」が出てきたら sin²&theta; に置き換えられる、という形でよく使う。',
        },
      ],
      pitfalls: [
        'sin²&theta; は (sin&theta;)² のこと。sin(&theta;²) ではない。',
        'sin&theta; + cos&theta; = 1 ではない。&theta; = 45° で試すと &radic;2/2 + &radic;2/2 = &radic;2 ≒ 1.41 になって合わない。2乗の和でこそ 1 になる。',
        '「1」を見たときに sin²&theta; + cos²&theta; へ<b>戻せる</b>ことを忘れがち。行き詰まったら、式の中の 1 を展開してみる。',
        '2乗を外すときの符号。cos²&theta; = 16/25 から cos&theta; = 4/5 とすぐ書かず、角の範囲を確認する。',
      ],
      quiz: [
        { q: 'cos²&theta; を sin&theta; だけで表すと？', a: '1 − sin²&theta;。公式①を cos²&theta; について解いただけ。' },
        { q: 'sin²30° + cos²30° はいくつ？', a: '1。実際に (1/2)² + (&radic;3/2)² = 1/4 + 3/4 = 1 で確かめられる。公式①は角によらないので、計算しなくても 1 と答えてよい。' },
        { q: 'sin⁴&theta; − cos⁴&theta; を簡単にすると？', a: 'sin²&theta; − cos²&theta;。まず (sin²&theta; + cos²&theta;)(sin²&theta; − cos²&theta;) と因数分解し、前のかっこが公式①で 1 になる。' },
      ],
    },
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
    lecture: {
      intro: 'tan は sin と cos から作られる関数。「tan が出てきたら sin と cos に開く」と覚えておくと、式の見通しが一気によくなる。',
      steps: [
        {
          body: '斜辺の長さを c とする直角三角形を考える。sin と cos の定義から、対辺と隣辺は c を使ってこう書ける。',
          latex: '\\text{対辺} = c\\sin\\theta,\\qquad \\text{隣辺} = c\\cos\\theta',
        },
        {
          body: 'tan の定義「対辺 ÷ 隣辺」にそのまま当てはめる。',
          latex: '\\tan\\theta = \\dfrac{c\\sin\\theta}{c\\cos\\theta}',
        },
        {
          body: '分母・分子の c が約分されて消える。三角形の大きさに関係なく成り立つ、ということでもある。',
          latex: '\\tan\\theta = \\dfrac{\\sin\\theta}{\\cos\\theta}',
        },
        {
          body: '単位円で見ると、原点と点 (cos&theta;, sin&theta;) を結ぶ直線の「傾き」が tan&theta;。だから cos&theta; = 0 になる &theta; = 90° では、直線が垂直になって傾きが定まらない。',
          latex: '\\cos\\theta = 0 \\Rightarrow \\tan\\theta\\ \\text{は定義されない}',
        },
      ],
      examples: [
        {
          title: '例題 1 ── tan を開く',
          problem: '\\tan\\theta \\cdot \\cos\\theta\\ \\text{を簡単にせよ}',
          steps: [
            { body: '公式②で tan&theta; を分数に開く。', latex: '\\tan\\theta \\cdot \\cos\\theta = \\dfrac{\\sin\\theta}{\\cos\\theta}\\cdot\\cos\\theta' },
            { body: 'cos&theta; が約分されて消える。', latex: '= \\sin\\theta' },
          ],
          answer: '\\sin\\theta',
        },
        {
          title: '例題 2 ── 公式①と組み合わせる',
          problem: '\\tan\\theta + \\dfrac{1}{\\tan\\theta}\\ \\text{を簡単にせよ}',
          steps: [
            { body: '両方の tan を公式②で開く。1/tan&theta; は逆数なので cos&theta;/sin&theta; になる。', latex: '= \\dfrac{\\sin\\theta}{\\cos\\theta} + \\dfrac{\\cos\\theta}{\\sin\\theta}' },
            { body: '分母が違うので通分する。分母は sin&theta;cos&theta;。', latex: '= \\dfrac{\\sin^2\\theta + \\cos^2\\theta}{\\sin\\theta\\cos\\theta}' },
            { body: '分子に公式①の形が現れた。ここを 1 にする。', latex: '= \\dfrac{1}{\\sin\\theta\\cos\\theta}' },
          ],
          answer: '\\dfrac{1}{\\sin\\theta\\cos\\theta}',
          note: '「tan を開く → 通分する → 公式①でまとめる」。この3手はこのアプリの問題でも何度も出てくる、いちばん基本の流れ。',
        },
      ],
      pitfalls: [
        '分母と分子が逆。tan&theta; = sin&theta;/cos&theta; であって、cos&theta;/sin&theta; ではない。「<b>タン</b>は<b>サイン</b>が上」と声に出して覚えるとよい。',
        'cos&theta; = 0 のとき（&theta; = 90°, 270° など）は分母が 0 になるので tan&theta; は存在しない。',
        '1/tan&theta; は tan(1/&theta;) ではなく cos&theta;/sin&theta;。',
      ],
      quiz: [
        { q: 'sin60° ÷ cos60° はいくつ？', a: '&radic;3。公式②より tan60° のこと。(&radic;3/2) ÷ (1/2) = &radic;3。' },
        { q: 'sin&theta; を tan&theta; と cos&theta; で表すと？', a: 'sin&theta; = tan&theta;·cos&theta;。公式②の両辺に cos&theta; を掛けただけ。' },
        { q: 'tan&theta;·cos&theta; + cos&theta; を因数分解せずに簡単にすると？', a: 'sin&theta; + cos&theta;。前の項だけ公式②で開くと cos&theta; が約分される。' },
      ],
    },
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
    lecture: {
      intro: '新しく覚える公式ではなく、公式①と②から作れる「3本目」。導出を一度自分でたどっておくと、忘れてもその場で作り直せる。',
      steps: [
        {
          body: '出発点は公式①。これだけ。',
          latex: '\\sin^2\\theta + \\cos^2\\theta = 1',
        },
        {
          body: '両辺を cos²&theta; で割る。tan を作りたいので、sin を cos で割る形をわざと作りにいく。',
          latex: '\\dfrac{\\sin^2\\theta}{\\cos^2\\theta} + \\dfrac{\\cos^2\\theta}{\\cos^2\\theta} = \\dfrac{1}{\\cos^2\\theta}',
        },
        {
          body: '第1項は (sin&theta;/cos&theta;)² なので、公式②より tan²&theta;。第2項は約分して 1。',
          latex: '\\tan^2\\theta + 1 = \\dfrac{1}{\\cos^2\\theta}',
        },
        {
          body: '順番を入れかえれば公式③。cos²&theta; で割っているので、cos&theta; ≠ 0 が前提になっている点だけ覚えておく。',
          latex: '1 + \\tan^2\\theta = \\dfrac{1}{\\cos^2\\theta}',
        },
      ],
      examples: [
        {
          title: '例題 1 ── 打ち消す',
          problem: '\\dfrac{1}{\\cos^2\\theta} - \\tan^2\\theta\\ \\text{を簡単にせよ}',
          steps: [
            { body: '公式③で 1/cos²&theta; を tan の形に開く。', latex: '= (1 + \\tan^2\\theta) - \\tan^2\\theta' },
            { body: 'tan²&theta; どうしが打ち消し合う。', latex: '= 1' },
          ],
          answer: '1',
        },
        {
          title: '例題 2 ── 値を求める',
          problem: '0° < \\theta < 90°,\\quad \\tan\\theta = 2\\ \\text{のとき}\\ \\cos\\theta\\ \\text{は？}',
          steps: [
            { body: '公式③に tan&theta; = 2 を入れる。', latex: '1 + 2^2 = \\dfrac{1}{\\cos^2\\theta}' },
            { body: '左辺は 5。逆数をとれば cos²&theta; が出る。', latex: '\\cos^2\\theta = \\dfrac{1}{5}' },
            { body: '&theta; は第1象限なので cos&theta; は正。', latex: '\\cos\\theta = \\dfrac{1}{\\sqrt{5}}' },
          ],
          answer: '\\cos\\theta = \\dfrac{1}{\\sqrt{5}} = \\dfrac{\\sqrt{5}}{5}',
          note: 'tan の値だけから cos が求まるのが公式③の便利なところ。sin は sin&theta; = tan&theta;·cos&theta; で続けて求められる。',
        },
      ],
      pitfalls: [
        '右辺は 1/cos²&theta; であって 1/cos&theta; ではない。すべて2乗で揃っている。',
        '左辺の「1 +」を忘れて tan²&theta; = 1/cos²&theta; としてしまう。&theta; = 45° で試すと 1 ≠ 2 ですぐ気づける。',
        'cos²&theta; で割って作った式なので、cos&theta; = 0 の角では使えない。',
      ],
      quiz: [
        { q: 'tan²&theta; を cos&theta; で表すと？', a: '1/cos²&theta; − 1。公式③を移項しただけ。' },
        { q: '&theta; = 45° のとき、公式③の両辺はそれぞれいくつ？', a: 'どちらも 2。左辺 1 + 1² = 2、右辺 1/(&radic;2/2)² = 1/(1/2) = 2。' },
        { q: '(1 + tan²&theta;)·cos²&theta; は？', a: '1。公式③で 1 + tan²&theta; を 1/cos²&theta; に変えると約分される。' },
      ],
    },
    variants: [
      '\\tan^2\\theta = \\dfrac{1}{\\cos^2\\theta} - 1',
    ],
    svgKey: null,
  },

  // ---- 加法定理（角が2つある公式） ----
  // ①②③と違い、α と β という「別々の2つの角」を結びつける関係。
  // そのため ①②③をいくら組み合わせても導けない、独立した公式になっている。
  formula_addition_sin: {
    title: '加法公式 sin',
    displayLatex: '\\sin(\\alpha + \\beta) = \\sin\\alpha\\cos\\beta + \\cos\\alpha\\sin\\beta',
    meaning:
      '2つの角を足した角の sin を、それぞれの角の sin と cos だけで表す公式。' +
      'sin(&alpha;+&beta;) は sin&alpha; + sin&beta; では<b>ない</b>、というのがいちばん大事なところ。' +
      '試しに &alpha; = &beta; = 30° で確かめると、左辺は sin60° = 0.866、sin30° + sin30° = 1 で合わない。',
    derivation:
      '単位円の上で、角 &alpha; だけ回した点を (cos&alpha;, sin&alpha;) とする。' +
      'そこからさらに &beta; 回すのは、座標を &beta; だけ回転させることに等しい。' +
      '回転後の y 座標を計算すると sin&alpha;·cos&beta; + cos&alpha;·sin&beta; になり、' +
      'それは角 &alpha;+&beta; の点の y 座標、つまり sin(&alpha;+&beta;) と同じ。',
    usage:
      'sin(&alpha;+&beta;) のように「足し算の角」が出てきたら、バラバラの角に分解できる。' +
      '逆に sin&alpha;·cos&beta; + cos&alpha;·sin&beta; の形を見つけたら、sin(&alpha;+&beta;) にまとめて式を短くできる。' +
      '&alpha; = &beta; = &theta; と置くと sin2&theta; = 2sin&theta;cos&theta;（公式④）になる。',
    lecture: {
      intro: 'ここから「角が2つ」の世界に入る。公式①②③は1つの角の中だけの関係だったので、どう組み合わせてもこの公式は作れない。新しい道具だと思って覚えよう。',
      steps: [
        {
          body: 'まず、単位円の上で角 &alpha; だけ回った点 A を置く。定義から座標はこう。',
          latex: 'A(\\cos\\alpha,\\ \\sin\\alpha)',
        },
        {
          body: 'そこからさらに &beta; だけ回すと、全体では &alpha;+&beta; 回ったことになる。つまり「角 &alpha;+&beta; の点」は「A をもう &beta; 回した点」と同じ。',
          latex: '\\text{回転後の点} = (\\cos(\\alpha+\\beta),\\ \\sin(\\alpha+\\beta))',
        },
        {
          body: '原点のまわりに点 (x, y) を &beta; だけ回すと、座標はこう変わる（回転の公式）。',
          latex: '(x,\\ y) \\longmapsto (x\\cos\\beta - y\\sin\\beta,\\quad x\\sin\\beta + y\\cos\\beta)',
        },
        {
          body: 'A の座標 x = cos&alpha;, y = sin&alpha; を代入して、y 成分（＝高さ）だけ取り出す。',
          latex: '\\cos\\alpha\\sin\\beta + \\sin\\alpha\\cos\\beta',
        },
        {
          body: 'この y 成分は、角 &alpha;+&beta; の点の高さ、つまり sin(&alpha;+&beta;) に他ならない。並べ替えて完成。',
          latex: '\\sin(\\alpha+\\beta) = \\sin\\alpha\\cos\\beta + \\cos\\alpha\\sin\\beta',
        },
      ],
      examples: [
        {
          title: '例題 1 ── 75° の値を出す',
          problem: '\\sin 75°\\ \\text{の値を求めよ}',
          lead: '75° は単独では値を覚えていないが、45° + 30° と分ければどちらも知っている角になる。',
          steps: [
            { body: '75° を知っている角の和に分ける。', latex: '\\sin 75° = \\sin(45° + 30°)' },
            { body: '加法公式に当てはめる。', latex: '= \\sin45°\\cos30° + \\cos45°\\sin30°' },
            { body: '覚えている値を入れる。', latex: '= \\dfrac{\\sqrt{2}}{2}\\cdot\\dfrac{\\sqrt{3}}{2} + \\dfrac{\\sqrt{2}}{2}\\cdot\\dfrac{1}{2}' },
            { body: '分母をそろえて足す。', latex: '= \\dfrac{\\sqrt{6}}{4} + \\dfrac{\\sqrt{2}}{4}' },
          ],
          answer: '\\sin 75° = \\dfrac{\\sqrt{6} + \\sqrt{2}}{4}',
          note: '15° や 105° も、同じように「知っている角の和・差」に分ければ計算できる。',
        },
        {
          title: '例題 2 ── 逆向きに使う',
          problem: '\\sin3\\theta\\cos\\theta + \\cos3\\theta\\sin\\theta\\ \\text{を簡単にせよ}',
          lead: '加法公式は右から左にも読める。この形を見たら「まとめられる」と気づけるかがポイント。',
          steps: [
            { body: '&alpha; = 3&theta;、&beta; = &theta; とみると、ちょうど公式の右辺の形になっている。', latex: '\\sin\\alpha\\cos\\beta + \\cos\\alpha\\sin\\beta' },
            { body: '左辺にまとめる。', latex: '= \\sin(3\\theta + \\theta)' },
          ],
          answer: '\\sin 4\\theta',
        },
      ],
      pitfalls: [
        'sin(&alpha;+&beta;) = sin&alpha; + sin&beta; は<b>誤り</b>。迷ったら &alpha; = &beta; = 30° で検算する習慣をつけよう。',
        '右辺の組み合わせは「sin cos + cos sin」。sin どうし・cos どうしを掛けない。これは cos の加法公式のほう。',
        '&alpha; と &beta; の順番を入れかえても結果は同じ（足し算なので）。どちらを先に書いても正解。',
        '引き算の角は sin(&alpha;−&beta;) = sin&alpha;cos&beta; − cos&alpha;sin&beta;。真ん中の符号だけが変わる。',
      ],
      quiz: [
        { q: '&alpha; = &beta; = &theta; と置くと、どんな公式になる？', a: 'sin2&theta; = 2sin&theta;cos&theta;（2倍角の公式）。sin&theta;cos&theta; + cos&theta;sin&theta; は同じものが2つなので 2sin&theta;cos&theta;。' },
        { q: 'sin(90° + &theta;) を展開すると？', a: 'cos&theta;。sin90°cos&theta; + cos90°sin&theta; = 1·cos&theta; + 0·sin&theta; = cos&theta;。' },
        { q: 'sin15° を求めるには、どう分ければよい？', a: '45° − 30°（または 60° − 45°）。引き算の加法公式を使って sin45°cos30° − cos45°sin30° = (&radic;6 − &radic;2)/4。' },
      ],
    },
    variants: [
      '\\sin(\\alpha - \\beta) = \\sin\\alpha\\cos\\beta - \\cos\\alpha\\sin\\beta',
      '\\sin 2\\theta = 2\\sin\\theta\\cos\\theta',
    ],
    svgKey: 'unitCircle',
  },
  formula_addition_cos: {
    title: '加法公式 cos',
    displayLatex: '\\cos(\\alpha + \\beta) = \\cos\\alpha\\cos\\beta - \\sin\\alpha\\sin\\beta',
    meaning:
      'sin のときと形は似ているが、真ん中の符号が<b>マイナス</b>になる。' +
      'sin は「+」、cos は「−」。ここを入れかえてしまう間違いがとても多い。',
    derivation:
      'sin のときと同じ回転の考え方で、回転後の x 座標を計算すると ' +
      'cos&alpha;·cos&beta; − sin&alpha;·sin&beta; になる。' +
      'これが角 &alpha;+&beta; の点の x 座標、つまり cos(&alpha;+&beta;)。',
    usage:
      '&alpha; = &beta; = &theta; と置くと cos2&theta; = cos²&theta; − sin²&theta; になり、' +
      'さらに公式①を使えば 1 − 2sin²&theta; や 2cos²&theta; − 1 の形にも変形できる。',
    lecture: {
      intro: 'sin の加法公式と出どころは同じ（同じ回転の、今度は横方向を見るだけ）。違いは「掛ける相手」と「真ん中の符号」の2点だけ。',
      steps: [
        {
          body: 'sin のときと同じ図を使う。単位円上の角 &alpha; の点 A を、さらに &beta; だけ回す。',
          latex: 'A(\\cos\\alpha,\\ \\sin\\alpha)',
        },
        {
          body: '回転の公式のうち、今度は x 成分（＝横の位置）を見る。',
          latex: '(x,\\ y) \\longmapsto (\\,x\\cos\\beta - y\\sin\\beta,\\ \\ \\cdots)',
        },
        {
          body: 'x = cos&alpha;, y = sin&alpha; を代入する。y に掛かっている符号がマイナスなので、ここで「−」が生まれる。',
          latex: '\\cos\\alpha\\cos\\beta - \\sin\\alpha\\sin\\beta',
        },
        {
          body: 'これが角 &alpha;+&beta; の点の x 座標、つまり cos(&alpha;+&beta;)。',
          latex: '\\cos(\\alpha+\\beta) = \\cos\\alpha\\cos\\beta - \\sin\\alpha\\sin\\beta',
        },
      ],
      examples: [
        {
          title: '例題 1 ── 75° の値を出す',
          problem: '\\cos 75°\\ \\text{の値を求めよ}',
          steps: [
            { body: '45° + 30° に分けて加法公式へ。', latex: '\\cos 75° = \\cos45°\\cos30° - \\sin45°\\sin30°' },
            { body: '値を入れる。', latex: '= \\dfrac{\\sqrt{2}}{2}\\cdot\\dfrac{\\sqrt{3}}{2} - \\dfrac{\\sqrt{2}}{2}\\cdot\\dfrac{1}{2}' },
            { body: '分母をそろえて引く。', latex: '= \\dfrac{\\sqrt{6}}{4} - \\dfrac{\\sqrt{2}}{4}' },
          ],
          answer: '\\cos 75° = \\dfrac{\\sqrt{6} - \\sqrt{2}}{4}',
          note: 'sin75° と見比べると、違いは真ん中の符号だけ。cos のほうが小さい値になるのは、75° が 90° に近いから。',
        },
        {
          title: '例題 2 ── 2倍角を作る',
          problem: '\\cos 2\\theta\\ \\text{を}\\ \\cos\\theta\\ \\text{だけで表せ}',
          steps: [
            { body: '2&theta; = &theta; + &theta; とみて加法公式を使う。', latex: '\\cos2\\theta = \\cos\\theta\\cos\\theta - \\sin\\theta\\sin\\theta = \\cos^2\\theta - \\sin^2\\theta' },
            { body: 'sin を消したいので、公式① sin²&theta; = 1 − cos²&theta; を使う。', latex: '= \\cos^2\\theta - (1 - \\cos^2\\theta)' },
            { body: 'かっこを外して整理する。', latex: '= 2\\cos^2\\theta - 1' },
          ],
          answer: '\\cos 2\\theta = 2\\cos^2\\theta - 1',
          note: '同じ要領で cos を消せば cos2&theta; = 1 − 2sin²&theta;。加法定理と公式①を組み合わせると、こうして別の顔の公式が次々に作れる。',
        },
      ],
      pitfalls: [
        '符号が sin と逆。<b>cos はマイナス</b>。「コスコス引くサインサイン」と唱えて覚える人が多い。',
        '掛ける相手を間違えやすい。cos の公式は「cos どうし」「sin どうし」を掛ける。sin の公式のように交差させない。',
        '引き算の角では符号が反転して cos(&alpha;−&beta;) = cos&alpha;cos&beta; + sin&alpha;sin&beta;。プラスになる。',
      ],
      quiz: [
        { q: 'cos(90° − &theta;) を展開すると？', a: 'sin&theta;。cos90°cos&theta; + sin90°sin&theta; = 0 + sin&theta;（引き算の形なので符号は +）。' },
        { q: 'cos(&alpha;+&beta;) + cos(&alpha;−&beta;) を簡単にすると？', a: '2cos&alpha;cos&beta;。足すと sin&alpha;sin&beta; が打ち消し合う。' },
        { q: 'cos2&theta; を sin&theta; だけで表すと？', a: '1 − 2sin²&theta;。cos²&theta; − sin²&theta; の cos²&theta; を 1 − sin²&theta; に置き換える。' },
      ],
    },
    variants: [
      '\\cos(\\alpha - \\beta) = \\cos\\alpha\\cos\\beta + \\sin\\alpha\\sin\\beta',
      '\\cos 2\\theta = \\cos^2\\theta - \\sin^2\\theta',
    ],
    svgKey: 'unitCircle',
  },
  formula_addition_tan: {
    title: '加法公式 tan',
    displayLatex: '\\tan(\\alpha + \\beta) = \\dfrac{\\tan\\alpha + \\tan\\beta}{1 - \\tan\\alpha\\tan\\beta}',
    meaning:
      '3つの加法公式のうち、tan だけが分数の形になる。' +
      '分子が「足し算」、分母が「1 − かけ算」と覚えるとよい。',
    derivation:
      'tan = sin/cos なので、tan(&alpha;+&beta;) = sin(&alpha;+&beta;)/cos(&alpha;+&beta;) に ' +
      'sin と cos の加法公式を入れる。そのあと分子・分母を cos&alpha;·cos&beta; で割ると、' +
      'すべて tan の形になって (tan&alpha; + tan&beta;)/(1 − tan&alpha;·tan&beta;) が出てくる。',
    usage:
      '分母が 0 になる（tan&alpha;·tan&beta; = 1 の）ときは使えない点に注意。' +
      '&alpha; = &beta; = &theta; と置くと tan2&theta; = 2tan&theta;/(1 − tan²&theta;)（公式⑯）になる。',
    lecture: {
      intro: 'これも新しく覚える必要はない。sin と cos の加法公式を割り算するだけで出てくる。導出をたどれば、分母の「1 −」がどこから来たのかも腑に落ちる。',
      steps: [
        {
          body: '公式②の形に書く。tan は sin を cos で割ったものだった。',
          latex: '\\tan(\\alpha+\\beta) = \\dfrac{\\sin(\\alpha+\\beta)}{\\cos(\\alpha+\\beta)}',
        },
        {
          body: '分子に sin の加法公式、分母に cos の加法公式をそのまま入れる。',
          latex: '= \\dfrac{\\sin\\alpha\\cos\\beta + \\cos\\alpha\\sin\\beta}{\\cos\\alpha\\cos\\beta - \\sin\\alpha\\sin\\beta}',
        },
        {
          body: 'このままでは sin と cos が混ざっている。全部 tan にしたいので、分子と分母を同じ量 cos&alpha;cos&beta; で割る（分数は分母と分子を同じ数で割っても値が変わらない）。',
          latex: '= \\dfrac{\\dfrac{\\sin\\alpha\\cos\\beta}{\\cos\\alpha\\cos\\beta} + \\dfrac{\\cos\\alpha\\sin\\beta}{\\cos\\alpha\\cos\\beta}}{\\dfrac{\\cos\\alpha\\cos\\beta}{\\cos\\alpha\\cos\\beta} - \\dfrac{\\sin\\alpha\\sin\\beta}{\\cos\\alpha\\cos\\beta}}',
        },
        {
          body: '約分すると、分子は tan&alpha; + tan&beta;、分母は 1 − tan&alpha;tan&beta;。分母の第1項が 1 になるのは、同じものどうしの約分だから。',
          latex: '\\tan(\\alpha+\\beta) = \\dfrac{\\tan\\alpha + \\tan\\beta}{1 - \\tan\\alpha\\tan\\beta}',
        },
      ],
      examples: [
        {
          title: '例題 1 ── 75° の値を出す',
          problem: '\\tan 75°\\ \\text{の値を求めよ}',
          steps: [
            { body: '45° + 30° に分ける。tan45° = 1、tan30° = 1/&radic;3。', latex: '\\tan75° = \\dfrac{\\tan45° + \\tan30°}{1 - \\tan45°\\tan30°}' },
            { body: '値を入れる。', latex: '= \\dfrac{1 + \\dfrac{1}{\\sqrt{3}}}{1 - \\dfrac{1}{\\sqrt{3}}}' },
            { body: '分母・分子に &radic;3 を掛けて整理する。', latex: '= \\dfrac{\\sqrt{3}+1}{\\sqrt{3}-1}' },
            { body: '分母を有理化する（分母・分子に &radic;3 + 1 を掛ける）。', latex: '= \\dfrac{(\\sqrt{3}+1)^2}{2} = \\dfrac{4 + 2\\sqrt{3}}{2}' },
          ],
          answer: '\\tan 75° = 2 + \\sqrt{3}',
        },
        {
          title: '例題 2 ── 使えない場合を知る',
          problem: '\\tan(45° + 45°)\\ \\text{はどうなる？}',
          steps: [
            { body: '公式に入れてみる。tan45° = 1 なので分母は…', latex: '1 - 1\\cdot 1 = 0' },
            { body: '分母が 0 になってしまう。実際 45° + 45° = 90° で、tan90° は定義されない角だった（公式②の導出を思い出そう）。', latex: '\\tan 90°\\ \\text{は定義されない}' },
          ],
          answer: '\\text{定義されない}',
          note: '公式が壊れたのではなく、「そこには値が無い」ことを分母 0 が教えてくれている。',
        },
      ],
      pitfalls: [
        '分母の符号。<b>1 − tan&alpha;tan&beta;</b>。分子が +、分母が − と覚える（cos の公式から来た「−」）。',
        '引き算の角では符号が全部ひっくり返る。tan(&alpha;−&beta;) = (tan&alpha; − tan&beta;)/(1 + tan&alpha;tan&beta;)。',
        'tan&alpha;tan&beta; = 1 のときは分母が 0 になるので使えない。&alpha;+&beta; が 90° になる場合がこれ。',
      ],
      quiz: [
        { q: '&alpha; = &beta; = &theta; と置くとどうなる？', a: 'tan2&theta; = 2tan&theta;/(1 − tan²&theta;)。分子は同じものが2つで 2tan&theta;、分母は tan&theta;·tan&theta; = tan²&theta;。' },
        { q: 'tan(&theta; + 180°) は？', a: 'tan&theta;。tan180° = 0 なので、分子は tan&theta;、分母は 1 になる。tan の周期が 180° であることの確認にもなる。' },
        { q: 'なぜ tan の公式だけ分数になるの？', a: 'tan 自体が sin ÷ cos という分数だから。sin と cos の加法公式を割り算して作る以上、分数の形になるのは自然なこと。' },
      ],
    },
    variants: [
      '\\tan(\\alpha - \\beta) = \\dfrac{\\tan\\alpha - \\tan\\beta}{1 + \\tan\\alpha\\tan\\beta}',
      '\\tan 2\\theta = \\dfrac{2\\tan\\theta}{1 - \\tan^2\\theta}',
    ],
    svgKey: null,
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
  {
    id: 'basics_proof_flow',
    label: '基礎④',
    tabTitle: '証明の進め方',
    body: {
      title: '恒等式の証明のしかた',
      displayLatex: '\\text{左辺} \\longrightarrow \\cdots \\longrightarrow \\text{右辺}',
      sections: [
        {
          heading: '「恒等式」とは',
          body:
            '方程式は「ある特定の &theta; でだけ成り立つ式」だが、恒等式は「どんな &theta; でも成り立つ式」のこと。' +
            'このアプリで出てくる問題は全部こちら。だから &theta; に数を代入して確かめるのではなく、' +
            '<b>式の形を変えていって、左辺が右辺と同じ形になることを見せる</b>のが証明になる。',
        },
        {
          heading: '両辺を同時にいじらない',
          body:
            '方程式を解くときのように「両辺に同じものを足す」「両辺を2乗する」といった操作はしない。' +
            'それをすると「成り立つと仮定したら成り立つ」という堂々めぐりになってしまうから。' +
            '片方の辺（ふつうは複雑なほう）だけを出発点にして、もう片方の形へ一方通行で近づけていく。',
        },
        {
          heading: '手順の型',
          body:
            '① 左辺と右辺を見比べて、<b>何が違うか</b>を言葉にする（tan があるのに右辺には無い、分数になっている、など）。<br>' +
            '② その違いを埋める公式を探す。tan を消したいなら公式②、sin²+cos² が見えたら公式①。<br>' +
            '③ 公式が当てはまらないときは、先に下ごしらえ（通分・展開・因数分解）をして形を整える。<br>' +
            '④ 右辺と同じ形になったら「よって〜となる」で締める。',
          isRawHtml: true,
        },
        {
          heading: 'このアプリのブロックとの対応',
          body:
            '「置き換え」ブロックは②の公式を当てる操作、「計算」ブロックは③の整理、' +
            '「通分」ブロックは分母をそろえる操作。' +
            'いちばん下の「よって〜となる」が④の締めにあたる。' +
            'つまり盤面に並ぶブロックの列が、そのまま答案の行になっている。',
        },
      ],
      lecture: {
        examples: [
          {
            title: '通しでやってみる',
            problem: '\\tan\\theta\\cos\\theta + \\cos\\theta = \\sin\\theta + \\cos\\theta\\ \\text{を証明せよ}',
            lead: '左辺のほうが複雑なので、左辺を出発点にする。',
            steps: [
              { body: '① まず見比べる。左辺には tan があるが、右辺には無い。だから「tan を消す」のが目標だと分かる。' },
              { body: '② tan を消す道具は公式②。左辺の tan&theta; を sin&theta;/cos&theta; に置き換える。', latex: '\\dfrac{\\sin\\theta}{\\cos\\theta}\\cos\\theta + \\cos\\theta' },
              { body: '③ 第1項で cos&theta; が約分できるので、計算して整理する。', latex: '\\sin\\theta + \\cos\\theta' },
              { body: '④ 右辺と同じ形になった。ここで締める。', latex: '\\text{よって}\\ \\tan\\theta\\cos\\theta + \\cos\\theta = \\sin\\theta + \\cos\\theta' },
            ],
            note: '大事なのは①。いきなり公式を当てにいくのではなく、「左辺と右辺の違い」を先に見つけると、使う公式は自然に決まる。',
          },
        ],
        pitfalls: [
          '右辺を勝手に書き換えてしまう。証明の間、右辺は<b>ゴール</b>なので動かさない。',
          '「両辺に cos&theta; を掛ける」のような両辺同時の操作をしてしまう。恒等式の証明ではやらない。',
          '公式が当てはまらないからと止まってしまう。多くの場合、先に通分や展開で形を整えれば当てはまるようになる。',
          '最後の「よって〜となる」を忘れる。どこがゴールだったのかを示すところまでが証明。',
        ],
        quiz: [
          { q: '左辺と右辺、どちらから手をつけるとよい？', a: '複雑なほう。ふつうは項が多い・分数がある・tan が混ざっている側。簡単なほうへ向かって下る方が道が見つけやすい。' },
          { q: '式の中に「1」があって行き詰まった。何を試す？', a: '公式①で 1 を sin²&theta; + cos²&theta; に展開してみる。逆向きに使うのも立派な一手。' },
          { q: '分母がバラバラの分数が2つ。次の一手は？', a: '通分して分母をそろえる。分子がまとまると、そこに公式①の形が現れることが多い。' },
        ],
      },
      svgKey: null,
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