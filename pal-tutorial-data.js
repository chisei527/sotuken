// ============================================
// pal-tutorial-data.js
// パルによる各ステージ解法の完全誘導チュートリアル台本。
// PAL_TUTORIAL_SCRIPTS[stageId] にステージIDごとの台本を格納する。
//
// フォーマット:
//   { steps: [ { id, introLines, completeLines, check, hintHtml, ... }, ... ] }
// ============================================

window.PAL_TUTORIAL_SCRIPTS = {};

// ============================================
// 0-1: sin²θ + cos²θ = 1 の証明を完全誘導
//   置き換えブロックの「3つの穴」の意味をここでしっかり説明する。
// ============================================
window.PAL_TUTORIAL_SCRIPTS['0-1'] = {
  steps: [
    {
      id: 'step_explain_replace',
      introLines: [
        'それじゃあ、いよいよ証明だよ！今回の目標は「sin²θ + cos²θ = 1」を示すこと。',
        `証明では「置き換え」ブロック ${window.BlockSvg.replaceOperation()} を使って、左辺の式を少しずつ書き換えていくんだ。`,
        '置き換えブロックには穴が3つあるよ。左から順に「いまの式」「使う公式」「書き換えたあとの式」。',
        '「左の式に、真ん中の公式を使うと、右の式になる」という意味のブロックなんだ。',
        `右辺と同じ形になったら、最後に「よって〜となる」ブロック ${window.BlockSvg.proofStep()} で締めくくれば証明は完成だよ！`,
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_pull_replace_operation',
      introLines: [
        `まずは「操作」カテゴリから「置き換え」ブロック ${window.BlockSvg.replaceOperation()} を出して、「よって〜となる」ブロック ${window.BlockSvg.proofStep()} のすぐ上にくっつけてね！`,
      ],
      completeLines: [
        'ばっちり！これで「置き換え → よって」の順に並んだね。上から順に読んでいくんだ。',
      ],
      hintHtml: () => `「操作」から ${window.BlockSvg.replaceOperation()} を出して、${window.BlockSvg.proofStep()} の上にくっつけよう！`,
      check: (event, workspace) => {
        if (event.type !== Blockly.Events.BLOCK_MOVE) return false;
        if (!event.newParentId) return false;
        const moved = workspace.getBlockById(event.blockId);
        const parent = workspace.getBlockById(event.newParentId);
        if (!moved || !parent) return false;
        return moved.type === 'replace_operation' &&
               parent.type === 'proof_step' &&
               event.newInputName === 'OPERATIONS';
      },
    },
    {
      id: 'step_connect_value',
      introLines: [
        '左の穴には「いまの式」を入れるよ。最初の置き換えなので、問題の左辺そのものだね。',
        `作業エリアにある「sin²θ + cos²θ」のブロック ${window.BlockSvg.add()} を、置き換えブロックの左の穴にドラッグしてね！`,
      ],
      completeLines: [
        'いいね！これが「これから書き換える式」だよ。',
      ],
      hintHtml: () => `「sin²θ + cos²θ」のブロック (${window.BlockSvg.add()}) を ${window.BlockSvg.replaceOperation()} の左の穴に入れよう！`,
      check: (event, workspace) => {
        if (event.type !== Blockly.Events.BLOCK_MOVE) return false;
        if (!event.newParentId) return false;
        const moved = workspace.getBlockById(event.blockId);
        const parent = workspace.getBlockById(event.newParentId);
        if (!moved || !parent) return false;
        return moved.type === 'math_add' &&
               parent.type === 'replace_operation' &&
               event.newInputName === 'VALUE';
      },
    },
    {
      id: 'step_connect_formula',
      introLines: [
        '真ん中の穴には「使う公式」を入れるよ。',
        `作業エリアにある「公式①」 ${window.BlockSvg.formula(1)} を、真ん中の穴に入れてね！公式①は「sin²θ + cos²θ = 1」だよ。`,
      ],
      completeLines: [
        'OK！公式①を使えば、sin²θ + cos²θ を 1 に書き換えられるね。',
      ],
      hintHtml: () => `${window.BlockSvg.formula(1)} を ${window.BlockSvg.replaceOperation()} の真ん中の穴に入れよう！（「公式」カテゴリから出してもOK）`,
      check: (event, workspace) => {
        if (event.type !== Blockly.Events.BLOCK_MOVE) return false;
        if (!event.newParentId) return false;
        const moved = workspace.getBlockById(event.blockId);
        const parent = workspace.getBlockById(event.newParentId);
        if (!moved || !parent) return false;
        return moved.type === 'formula_1' &&
               parent.type === 'replace_operation' &&
               event.newInputName === 'FORMULA';
      },
    },
    {
      id: 'step_connect_replacement',
      introLines: [
        '右の穴には「書き換えたあとの式」を入れるよ。',
        `公式①を使うと sin²θ + cos²θ は 1 になるから、作業エリアの「1」のブロック ${window.BlockSvg.number('1')} を右の穴に入れてね！`,
      ],
      completeLines: [
        '完璧！「sin²θ + cos²θ に公式①を使うと 1 になる」を、ブロックで書けたね。',
        '「よって〜となる」にも 1 が入っているから、左辺から右辺までつながったよ！',
      ],
      hintHtml: () => `${window.BlockSvg.number('1')} のブロックを ${window.BlockSvg.replaceOperation()} の右の穴に入れよう！`,
      check: (event, workspace) => {
        if (event.type !== Blockly.Events.BLOCK_MOVE) return false;
        if (!event.newParentId) return false;
        const moved = workspace.getBlockById(event.blockId);
        const parent = workspace.getBlockById(event.newParentId);
        if (!moved || !parent) return false;
        return moved.type === 'custom_number' &&
               parent.type === 'replace_operation' &&
               event.newInputName === 'REPLACEMENT';
      },
    },
    {
      id: 'step_reset_explanation',
      introLines: [
        '答え合わせの前に、下のボタンも紹介しておくね。',
        '「リセット」は、ブロックを問題の最初の状態に戻すボタンだよ。',
        '「あきらめる」を押すと、正解の並べ方を見たうえで、ぼくが解き方を解説するよ。ただし、その問題はクリアにならないから気をつけてね。',
      ],
      completeLines: [],
      autoAdvance: true,
      enableButtons: ['btn-reset', 'btn-answer'],
    },
    {
      id: 'step_check_answer',
      introLines: [
        'それじゃあ答え合わせ！下の「正解をチェック」ボタンを押してみて！',
      ],
      completeLines: [
        'やった、正解！これがはじめての証明だよ！',
      ],
      hintHtml: '下の「正解をチェック」ボタンを押そう！',
      buttonWait: true,
      buttonId: 'btn-submit',
      enableButtons: ['btn-submit'],
    },
  ],
};

// ============================================
// 0-2: パルのメニュー（三角関数の解説）と、段階的ヒントの紹介
//   ヒント … 1回目=ヒント文 / 2回目=穴を光らせる / 3回目=「置き換え」ブロックを置く
//            (main.js applyConditionalInitialStateGeneration)
//   ヒント … 次にやることが表示され、触る場所が光る (app-guide.js)
// ============================================
window.PAL_TUTORIAL_SCRIPTS['0-2'] = {
  steps: [
    {
      id: 'step_intro',
      introLines: [
        'ここからは自分の力で解いてもらうよ。その前に、ぼくにできることを紹介するね！',
        '画面の右下にいるぼくを押すと、メニューが開くよ。',
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_explain_trig',
      introLines: [
        'まずは「三角関数の解説」。三角関数の基本や、公式①〜③の意味と使いどころを説明するよ。',
        'どの公式を使えばいいか迷ったら、ここを開いてみてね。',
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_explain_hint',
      introLines: [
        '次は「ヒント」。画面の下にある「ヒント」ボタンだよ。',
        'ヒントは3段階になっていて、押すたびに助けが強くなるんだ。',
        '1回目は、この問題の進め方のヒントが出る。2回目は、次に埋める穴が光る。3回目は、「置き換え」ブロックを証明の中に置いてあげるよ。',
        'いきなり全部は出ないから、まずは1回だけ押してみて！',
      ],
      completeLines: [
        '出たね！右上のカードに書いてあるのがヒントだよ。もう一度押すと、もう1段くわしくなる。',
        'もう要らなくなったら、カードの × か、ボタンをもう一度押していけば消えるよ。',
      ],
      hintHtml: '画面の下の「ヒント」ボタンを押してみよう！',
      customWatch: {
        pollCheck: () => (window.hintLevel || 0) >= 1,
      },
    },
    {
      id: 'step_outro',
      introLines: [
        'ぼくの紹介はこれでおしまい！',
        'この問題は、さっきの式の足し算の順番が入れかわっただけ。さっきと同じ手順で解いてみよう！',
        'ヒントは、ぼくのメニューからでも出せるよ。',
      ],
      completeLines: [],
      autoAdvance: true,
    },
  ],
};

// ============================================
// 0-3: 公式②の初登場 (tanθ = sinθ/cosθ)
// ============================================
window.PAL_TUTORIAL_SCRIPTS['0-3'] = {
  steps: [
    {
      id: 'step_formula_2',
      introLines: [
        `今回は新しい公式、公式② ${window.BlockSvg.formula(2)}「tanθ = sinθ/cosθ」を使うよ。`,
        'tanθ が出てきたら、sinθ/cosθ に書き換えられる、ということだね。',
        `置き換えブロック ${window.BlockSvg.replaceOperation()} の使い方は今までと同じ。左に「tanθ」、真ん中に「公式②」、右に「sinθ/cosθ」を入れよう！`,
      ],
      completeLines: [],
      autoAdvance: true,
    },
  ],
};

// ============================================
// 0-4: 公式③の初登場 (1 + tan²θ = 1/cos²θ)
// ============================================
window.PAL_TUTORIAL_SCRIPTS['0-4'] = {
  steps: [
    {
      id: 'step_formula_3',
      introLines: [
        `今度は公式③ ${window.BlockSvg.formula(3)}「1 + tan²θ = 1/cos²θ」の出番だよ。`,
        '「1 + tan²θ」というカタマリを見つけたら、まるごと 1/cos²θ に置き換えられるんだ。',
        '今回の左辺はまさにその形。置き換えブロック1つで解けるよ！',
      ],
      completeLines: [],
      autoAdvance: true,
    },
  ],
};

// ============================================
// 0-5: 式の「一部」だけに公式を使う
//   右の穴には書き換えた部分だけでなく「式全体」を入れる、を説明する
// ============================================
window.PAL_TUTORIAL_SCRIPTS['0-5'] = {
  steps: [
    {
      id: 'step_partial_replace',
      introLines: [
        '今回は、式の一部分だけに公式を使う練習だよ。',
        '左辺は分数で、分子が sin²θ + cos²θ になっているね。この分子に公式①を使うと 1 になるよ。',
        'ここが大事なポイント！置き換えブロックの右の穴には、書き換えた部分だけじゃなく「書き換えたあとの式全体」を入れるんだ。',
        '今回なら、右の穴に入れるのは「1」じゃなくて「1/cos²θ」だよ！',
      ],
      completeLines: [],
      autoAdvance: true,
    },
  ],
};

// ============================================
// 0-6: 「計算」ブロック (simplify_operation) の初登場
//   問題: tanθ/sinθ = 1/cosθ
//   解答手順: 置き換え(公式②) → 計算(約分) → よって
// ============================================
window.PAL_TUTORIAL_SCRIPTS['0-6'] = {
  steps: [
    {
      id: 'step_intro',
      introLines: [
        '今回は tanθ/sinθ。2つのブロックをつなげて解くよ。',
        `まずは今までどおり、置き換えブロック ${window.BlockSvg.replaceOperation()} と公式② ${window.BlockSvg.formula(2)} で tanθ を sinθ/cosθ に書き換えよう。`,
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_introduce_simplify',
      introLines: [
        `書き換えると (sinθ/cosθ)/sinθ になるね。ここで新しく「計算」ブロック ${window.BlockSvg.simplifyOperation()} の出番だよ！`,
        '「計算」は、公式を使わずに、約分や式の整理だけをするブロックなんだ。左の穴にいまの式、右の穴に計算したあとの式を入れるよ。',
        'たとえば (sinθ/cosθ)/sinθ は、sinθ を約分すると 1/cosθ になるよね。',
        '気をつけてほしいのは、公式を使った書き換えは「計算」ではできないこと。公式を使うときは、必ず「置き換え」を使ってね。',
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_explain_chain',
      introLines: [
        'ブロックは上から順につなげていくよ。「置き換え → 計算 → よって」の順だね。',
        '2つ目のブロックの左の穴には、1つ目のブロックの右の穴と同じ式を入れよう。前の結果から続けて書き換えていくイメージだよ。',
        '困ったら、下の「ヒント」ボタンや、ぼくの「三角関数の解説」を使ってね！',
      ],
      completeLines: [],
      autoAdvance: true,
    },
  ],
};

// ============================================
// 0-7: 「通分」ブロック (common_denominator_operation) の初登場
//   問題: sin²θ/cosθ + cosθ = 1/cosθ
//   解答手順: 通分（ボタン） → 置き換え(公式①) → よって
// ============================================
window.PAL_TUTORIAL_SCRIPTS['0-7'] = {
  steps: [
    {
      id: 'step_intro',
      introLines: [
        '今回は、分数とふつうの項の足し算になっているね。',
        'このままだと公式を使いにくいから、まず1つの分数にまとめよう。',
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_introduce_common_denominator',
      introLines: [
        `そこで新しく「通分」ブロック ${window.BlockSvg.commonDenominatorOperation()} の登場だよ！「操作」カテゴリに入っているよ。`,
        '左の穴に式を入れて「通分する」ボタンを押すと、通分したあとの式が右の穴に自動で入るんだ。',
        'たとえば sin²θ/cosθ + cosθ を通分すると、(sin²θ + cos²θ)/cosθ になるよ。',
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_outro',
      introLines: [
        `通分できたら、次は置き換えブロックで、分子の sin²θ + cos²θ に公式① ${window.BlockSvg.formula(1)} を使おう。`,
        '置き換えの左の穴には、通分の右の穴と同じ式を入れてね。右の穴は「1/cosθ」だよ。',
        '最後に「よって〜となる」につなげれば完成！',
      ],
      completeLines: [],
      autoAdvance: true,
    },
  ],
};

// ============================================
// 0-8: 公式を2回使う（置き換えを2つつなげる）
//   問題: sin²θ + cos²θ + tan²θ = 1/cos²θ
//   解答手順: 置き換え(公式①) → 置き換え(公式③) → よって
// ============================================
window.PAL_TUTORIAL_SCRIPTS['0-8'] = {
  steps: [
    {
      id: 'step_two_formulas',
      introLines: [
        'いよいよ最後のチュートリアル！今回は公式を2回使うよ。',
        'まず公式①で sin²θ + cos²θ を 1 にすると、式全体は 1 + tan²θ になるね。',
        'その 1 + tan²θ に公式③を使えば 1/cos²θ。置き換えブロックを2つ、上から順につなげよう！',
        '2つ目の置き換えの左の穴には、1つ目の右の穴と同じ「1 + tan²θ」を入れるのを忘れずにね。',
      ],
      completeLines: [],
      autoAdvance: true,
    },
  ],
};

// ============================================
// 23: 加法定理（sin）の初登場
//   ここから「角が2つある公式」が始まる。
//   これまでの①②③は角が θ ひとつだけだったので、
//   「α・β という2つの角」「sin( ) の穴に角を入れて式を作る」の2点を説明する。
// ============================================
window.PAL_TUTORIAL_SCRIPTS['23'] = {
  steps: [
    {
      id: 'step_two_angles',
      introLines: [
        'ここからは新しい章だよ。今までの公式①②③は、角が θ ひとつだけだったよね。',
        `今回からは角が2つ出てくるよ。${window.BlockSvg.term('α')}（アルファ）と ${window.BlockSvg.term('β')}（ベータ）だ。`,
        'たとえば「30°と45°を足した角」みたいに、2つの角を足した角を考えるときに使うんだ。',
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_build_trig',
      introLines: [
        `角が2つあるので、ブロックも新しくなるよ。左のメニューに「角 α・β」というカテゴリが増えているから見てみて！`,
        `${window.BlockSvg.term('sin( )')} は、穴に入れた角の sin を表すブロックだよ。穴に ${window.BlockSvg.term('α')} を入れれば sinα、${window.BlockSvg.term('β')} を入れれば sinβ になる。`,
        `穴に「α + β」の足し算ブロック ${window.BlockSvg.add()} を入れれば sin(α+β) だね。cos( ) と tan( ) も同じ使い方だよ。`,
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_addition_sin',
      introLines: [
        `そして今回の新しい公式が、加法公式 sin ${window.BlockSvg.formula('formula_addition_sin')} だよ。`,
        '「足した角の sin は、バラバラにすると sinα·cosβ + cosα·sinβ になる」という意味。sin と cos が入れかわって並ぶのがポイントだね。',
        'sin(α+β) は sinα + sinβ ではないんだ。ここを間違える人がとても多いから気をつけて！',
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_how_to_solve',
      introLines: [
        `解き方は今までと同じだよ。「置き換え」ブロック ${window.BlockSvg.replaceOperation()} の左に sin(α+β)、真ん中に加法公式 sin、右に書き換えたあとの式を入れよう。`,
        '右の穴に入れる sinα·cosβ + cosα·sinβ は、かけ算ブロックと足し算ブロックを組み合わせて自分で組み立ててね。',
        '組み立てるのが大変なら、右上にある答えの式のブロックを右クリックして「複製」すると早いよ。',
      ],
      completeLines: [],
      autoAdvance: true,
    },
  ],
};

// ============================================
// 24: 加法定理（cos）— マイナスが付くことと、打ち消し合いは「計算」ブロック
// ============================================
window.PAL_TUTORIAL_SCRIPTS['24'] = {
  steps: [
    {
      id: 'step_addition_cos',
      introLines: [
        `次は加法公式 cos ${window.BlockSvg.formula('formula_addition_cos')} だよ。`,
        'sin のときは「+」だったけど、cos では真ん中が「−」になるんだ。ここが入れかわりやすいところだよ。',
        `まず「置き換え」で cos(α+β) を cosα·cosβ − sinα·sinβ に書き換えよう。右の穴には、残っている + sinα·sinβ も付けた式全体を入れるのを忘れずにね。`,
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_cancel',
      introLines: [
        '書き換えると「− sinα·sinβ」と「+ sinα·sinβ」が並ぶよね。これは打ち消し合って消えるよ。',
        `打ち消し合いは公式ではなく、ただの計算だから「計算」ブロック ${window.BlockSvg.simplifyOperation()} を使ってね。`,
        '残るのは cosα·cosβ。これが右辺と同じだから、「よって〜となる」につなげれば完成だよ！',
      ],
      completeLines: [],
      autoAdvance: true,
    },
  ],
};

// ============================================
// 25: 加法定理（tan）— 分数の形。約分は「計算」ブロック
// ============================================
window.PAL_TUTORIAL_SCRIPTS['25'] = {
  steps: [
    {
      id: 'step_addition_tan',
      introLines: [
        `最後の加法公式、tan ${window.BlockSvg.formula('formula_addition_tan')} だよ。`,
        'tan のときだけ分数の形になるんだ。分母が「1 − tanα·tanβ」で、マイナスが分母にあるところに注意してね。',
        `今回の左辺は、その分母と同じ「(1 − tanα·tanβ)」が掛けられている形。まず「置き換え」で tan(α+β) を分数に書き換えよう。`,
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_reduce',
      introLines: [
        '書き換えると、分母の (1 − tanα·tanβ) と、掛けられている (1 − tanα·tanβ) で約分できるね。',
        `約分は公式ではないので「計算」ブロック ${window.BlockSvg.simplifyOperation()} だよ。残るのは tanα + tanβ。`,
        'これで3つの加法公式はぜんぶ登場したよ。次の問題では組み合わせて使ってみよう！',
      ],
      completeLines: [],
      autoAdvance: true,
    },
  ],
};

// ============================================
// 26: 加法定理 + 公式② の組み合わせ（最終問題）
// ============================================
window.PAL_TUTORIAL_SCRIPTS['26'] = {
  steps: [
    {
      id: 'step_final',
      introLines: [
        'いよいよ最後の問題！加法公式と、今までの公式を組み合わせて解くよ。',
        `まず分子の sin(α+β) に加法公式 sin ${window.BlockSvg.formula('formula_addition_sin')} を使って、(sinα·cosβ + cosα·sinβ)/(cosα·cosβ) にしよう。`,
        'そのあと分母の cosα·cosβ で約分すると、sinα/cosα + sinβ/cosβ の形に分かれるよ。約分は「計算」ブロックだね。',
        `最後は見覚えのある形！公式② ${window.BlockSvg.formula(2)}「tanθ = sinθ/cosθ」で、sinα/cosα を tanα に、sinβ/cosβ を tanβ に置き換えれば完成だよ。`,
      ],
      completeLines: [],
      autoAdvance: true,
    },
  ],
};
