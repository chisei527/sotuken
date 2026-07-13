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
// ============================================
window.PAL_TUTORIAL_SCRIPTS['0-1'] = {
  steps: [
    {
      id: 'step_pull_replace_operation',
      introLines: [
        'それじゃあ、この式を一緒に証明していこう！',
        '目標は「sin²θ + cos²θ が 1 と等しい」ことを示すことだよ！',
        'まずは「操作」カテゴリから、「置き換え」のブロックを引き出して、「よって〜となる」の中に入れてみて！',
      ],
      completeLines: [
        'ばっちり！「置き換え」ブロックは、ある値を別の値に書き換える魔法だよ！',
      ],
      hintHtml: () => `「操作」から ${window.BlockSvg.replaceOperation()} を ${window.BlockSvg.proofStep()} の中に入れよう！`,
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
        '次は、「置き換え」の一番上の穴に「もとの式」を入れよう！',
        '既に置いてある「sin²θ + cos²θ」の式を、穴にドラッグしてね！',
      ],
      completeLines: [
        'いいね！ここが「これから書き換える式」の場所だよ！',
      ],
      hintHtml: () => `「sin²θ + cos²θ」の式 (${window.BlockSvg.add()}) を ${window.BlockSvg.replaceOperation()} の一番上の穴に入れよう！`,
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
        '次は、「公式」カテゴリから「公式①」を引き出して、真ん中の穴に入れて！',
        '公式①は「sin²θ + cos²θ = 1」だよ！これを使って書き換えるんだ！',
      ],
      completeLines: [
        'そう、この位置が「使う公式」の場所！',
      ],
      hintHtml: () => `「公式」から ${window.BlockSvg.formula(1)} を ${window.BlockSvg.replaceOperation()} の真ん中の穴に入れよう！`,
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
        '最後の穴には、「書き換え後の値」を入れるよ！',
        '公式①によると sin²θ + cos²θ は「1」に等しいから、既にある「1」のブロックを一番下の穴に入れよう！',
      ],
      completeLines: [
        '完璧！これで置き換えの準備が整ったよ！',
      ],
      hintHtml: () => `${window.BlockSvg.number('1')} のブロックを ${window.BlockSvg.replaceOperation()} の一番下の穴に入れよう！`,
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
        'あとちょっと！ボタンの使い方も覚えておこう！',
        '間違えたときや最初からやり直したいときは、下の「リセット」ボタンを押せば元に戻せるよ！',
        '「答え」ボタンは正解のブロック配置を見せてくれる、詰まったときの切り札だよ！',
      ],
      completeLines: [],
      autoAdvance: true,
      enableButtons: ['btn-reset', 'btn-answer'],
    },
    {
      id: 'step_check_answer',
      introLines: [
        'それじゃあ、いよいよ答え合わせだよ！',
        '下の「正解をチェック」ボタンを押してみて！',
      ],
      completeLines: [
        'やった！正解だ！これで最初の証明が完成したよ！',
      ],
      hintHtml: '下の「正解をチェック」ボタンを押そう！',
      buttonWait: true,
      buttonId: 'btn-submit',
      enableButtons: ['btn-submit'],
    },
  ],
};

// ============================================
// 0-2: パル自身の3機能 (三角関数解説 / ガイド / ヒント) の紹介
// 解説だけ + ガイドON と ヒントON の実操作
// ============================================
window.PAL_TUTORIAL_SCRIPTS['0-2'] = {
  steps: [
    {
      id: 'step_intro',
      introLines: [
        'ここからは自力で解いてもらうから、ぼくのできることを紹介するね！',
        '右下のぼくをクリックすると、3つのメニューが出てくるよ。',
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_explain_trig',
      introLines: [
        'まず「三角関数の解説」！',
        '三角関数の基礎や、各公式の意味と使い方をぼくが解説してあげるよ！',
        '困ったときは、ここから覗いてみてね！',
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_explain_guide',
      introLines: [
        '次は「ガイド」機能！',
        'ONにすると、「答えの骨組みブロック」が薄く表示されて、どこに何のブロックを置けばいいかがわかるよ！',
        'それじゃあ、実際にぼくをクリックして「ガイド」をONにしてみて！',
      ],
      completeLines: [
        'いいね！これで穴に何を入れればいいか一目でわかるはず！',
      ],
      hintHtml: '右下のパルをクリックして「ガイド」を押してONにしよう！',
      // ガイド機能のON状態はヘッダーのボタン (id=btn-overwrite-permission) の
      // クラスで判定する: 'on' クラスが付いていれば有効化されている。
      // 汎用の Blockly イベント判定ではないため、custom watcher を使う。
      customWatch: {
        // check は 100ms 間隔で評価される
        pollCheck: () => {
          const btn = document.getElementById('btn-overwrite-permission');
          return !!(btn && btn.classList.contains('on'));
        },
      },
      hintHtmlEmphasizeMascot: true,
    },
    {
      id: 'step_explain_hint',
      introLines: [
        '最後は「ヒント」機能！',
        '今どこまで進んでいるか、次に何をすればいいかを教えてくれるよ！',
        '同じようにぼくをクリックして「ヒント」もONにしてみて！',
      ],
      completeLines: [
        'ばっちり！これで詰まっても道しるべが見えるよ！',
      ],
      hintHtml: '右下のパルをクリックして「ヒント」を押してONにしよう！',
      customWatch: {
        pollCheck: () => !!window.goalHintActive,
      },
      hintHtmlEmphasizeMascot: true,
    },
    {
      id: 'step_outro',
      introLines: [
        'これでぼくのできることは全部紹介したよ！',
        'この問題は 0-1 とほとんど同じだから、覚えた操作を思い出しながら自分で解いてみて！',
        '困ったら、いつでもぼくを頼ってね！',
      ],
      completeLines: [],
      autoAdvance: true,
    },
  ],
};

// ============================================
// 0-6: 「計算式」ブロック (simplify_operation) の初出解説
// 解説オンリー、実操作なし
// 問題: tanθ/sinθ = 1/cosθ
// 解答手順: replace_operation (公式②) → simplify_operation (約分) → conclusion
// ============================================
window.PAL_TUTORIAL_SCRIPTS['0-6'] = {
  steps: [
    {
      id: 'step_intro',
      introLines: [
        '今回の問題は分数と掛け算がまざってて、ちょっと難しく見えるね！',
        'でも大丈夫、順番にやれば解けるよ！',
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_introduce_simplify',
      introLines: [
        '今回、新しいブロックを紹介するよ！「計算式」ブロックだよ！',
        'これは、公式を使わずに単に約分や整理をしたいときに使うんだ！',
        '「操作」カテゴリの中に緑色のブロックとして入ってるよ！',
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_explain_example',
      introLines: [
        '例えば「(1/sinθ) × (sinθ/cosθ)」は、sinθ が約分できて「1/cosθ」になるよね？',
        'そういうときに「計算式」ブロックを使うんだ！',
        '公式では書き換えられない、シンプルな計算のためのブロックだよ！',
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_outro',
      introLines: [
        'それじゃあ、この問題を解いてみよう！',
        'まず公式②で tanθ を書き換えて、そのあと「計算式」ブロックで約分するよ！',
        '詰まったらヒントやガイド、三角関数の解説を使ってね！',
      ],
      completeLines: [],
      autoAdvance: true,
    },
  ],
};

// ============================================
// 0-7: 「通分」ブロック (common_denominator_operation) の初出解説
// 解説オンリー、実操作なし
// 問題: sin²θ/cosθ + cosθ = 1/cosθ
// 解答手順: common_denominator_operation (通分ボタン押下) → replace_operation (公式①) → conclusion
// ============================================
window.PAL_TUTORIAL_SCRIPTS['0-7'] = {
  steps: [
    {
      id: 'step_intro',
      introLines: [
        '今回の問題は分数と普通の項が足し算になってるね！',
        'このままだと公式が使いにくいから、まず1つの分数にまとめる必要があるよ！',
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_introduce_common_denominator',
      introLines: [
        'そこで新しいブロック、「通分」ブロックの登場だよ！',
        '「操作」カテゴリの中に、青色のブロックとして入ってるよ！',
        '式を入れて「通分する」ボタンを押すと、自動で通分した結果が右側に出てくるんだ！',
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_explain_example',
      introLines: [
        '例えば「sin²θ/cosθ + cosθ」を通分すると「(sin²θ + cos²θ)/cosθ」になるよ！',
        '分母を cosθ に揃えて、分子を足し合わせる感じだね！',
        '通分ができれば、あとは公式①で分子を 1 に書き換えられるから、正解に近づくよ！',
      ],
      completeLines: [],
      autoAdvance: true,
    },
    {
      id: 'step_outro',
      introLines: [
        'それじゃあやってみよう！',
        'まず「通分」ブロックを引き出して左辺を入れて、「通分する」ボタンをポチッ！',
        'そのあと公式①で書き換えたら完成だよ！',
      ],
      completeLines: [],
      autoAdvance: true,
    },
  ],
};