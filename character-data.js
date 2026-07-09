// ============================================
// character-data.js
// キャラクター (立ち絵・表情・セリフ) のデータ定義。
// 将来キャラを追加するときはこのファイルにエントリを増やすだけで対応できる。
// ============================================

// キャラごとのプロフィール
//   id:      内部識別子
//   name:    表示名 (吹き出しの話者名などに使う)
//   portraits:
//     各表情キーに対応する画像パス。未定義の表情キーが指定された場合は
//     default にフォールバックする。
window.CHARACTER_PROFILES = {
  furie: {
    id: 'furie',
    name: '有葉フリエ',
    portraits: {
      default: 'asset/メインビジュアル.png',
      joy: 'asset/喜び.png',
      joyPlain: 'asset/喜び周りなし.png',
      think: 'asset/悩み差分.png',
      thinkPlain: 'asset/悩み周りなし.png',
      welcome: 'asset/メインビジュアル.png',
      welcomePlain: 'asset/周りなし差分.png',
    },
  },
  hippalcos: {
    id: 'hippalcos',
    name: 'ヒッパルコス（パル）',
    portraits: {
      default: 'asset/ヒッパルコス 通常.png',
      normal: 'asset/ヒッパルコス 通常.png',
      explain: 'asset/ヒッパルコス 解説.png',
      joy: 'asset/ヒッパルコス 喜び.png',
    },
  },
};

// シーンごとのセリフ台本
//   scene id -> { character, portrait, lines, choices? }
//     character: CHARACTER_PROFILES のキー
//     portrait:  表示する表情キー (portraits のいずれか)
//     lines:     順に表示されるセリフの配列
//     choices:   最後のセリフ後に出現する選択肢 (省略可)
//       - label:    ボタン表示テキスト
//       - subLabel: 補足テキスト (小さめ表示)
//       - actionId: character-scenes.js の CHARACTER_SCENE_ACTIONS に対応するキー
window.CHARACTER_SCENES = {
  // モード選択画面: フリエちゃん初対面 + モード選択
  intro_mode_select: {
    character: 'furie',
    portrait: 'welcome',
    lines: [
      'はじめまして！わたし、有葉フリエ。',
      'これから一緒に、三角関数の証明パズルを解いていくよ！',
      'まずどうする？基本操作をゆっくり覚えていくか、いきなり本編に飛び込むか、選んでね！',
    ],
    choices: [
      {
        label: '基本論理の学習（推奨）',
        subLabel: 'ブロックの使い方をチュートリアルで学ぶ',
        actionId: 'start_tutorial',
      },
      {
        label: '数式領域への直接介入',
        subLabel: 'いきなり本編ステージ1から始める',
        actionId: 'start_main_stage_1',
      },
    ],
  },

  // モード選択画面 (2回目以降): 挨拶を短くしてすぐ選ばせる
  intro_mode_select_repeat: {
    character: 'furie',
    portrait: 'joyPlain',
    lines: [
      'おかえり！次はどうする？',
      'チュートリアルをもう1回やる？それとも本編に挑戦してみる？',
    ],
    choices: [
      {
        label: '基本論理の学習',
        subLabel: 'チュートリアルをもう一度',
        actionId: 'start_tutorial',
      },
      {
        label: '数式領域への直接介入',
        subLabel: '本編ステージ1へ',
        actionId: 'start_main_stage_1',
      },
    ],
  },

  // チュートリアル開始前: 説明動画モーダルの代わり
  tutorial_intro: {
    character: 'furie',
    portrait: 'joyPlain',
    lines: [
      'まず、ブロックを組み合わせて式を作るんだ。',
      '左辺と右辺が等しくなるように証明していくよ！',
      '詰まったら、いつでもヒントボタンを押してね！',
    ],
    choices: [
      {
        label: 'よし、始めよう！',
        subLabel: 'チュートリアル 1 へ',
        actionId: 'confirm_tutorial_start',
      },
    ],
  },

  // 公式アンロック時: アンロックモーダルの代わり
  // formula_name (アンロックした公式の表示名) を lines 生成時に注入するため、
  // lines は文字列テンプレートではなく関数として持たせる。
  formula_unlocked: {
    character: 'furie',
    portrait: 'joy',
    buildLines: function(context) {
      const name = (context && context.formulaLabel) ? context.formulaLabel : '新しい公式';
      return [
        'わあ！新しい公式を覚えたね！',
        `${name} だよ、これで色々な変形ができるようになる！`,
        'これからも一緒にがんばろうね！',
      ];
    },
    choices: [
      {
        label: '確認完了',
        subLabel: '',
        actionId: 'close_dialog',
      },
    ],
  },

  // パルの自己紹介: チュートリアル or 本編開始直前に登場
  intro_pal: {
    character: 'hippalcos',
    portrait: 'explain',
    lines: [
      'はじめまして！ぼくはヒッパルコス、パルって呼んでね！',
      '三角関数のことなら何でも聞いてね！',
      'ヒントとかガイドもぼくが担当するよ、右下にいるからいつでも呼んでね！',
    ],
    choices: [
      {
        label: 'よろしくね！',
        subLabel: '',
        actionId: 'confirm_pal_intro',
      },
    ],
  },

  // パルの登場 (2回目以降): 短めに
  intro_pal_repeat: {
    character: 'hippalcos',
    portrait: 'joy',
    lines: [
      'またよろしくね！準備できたら教えてね！',
    ],
    choices: [
      {
        label: 'よろしく！',
        subLabel: '',
        actionId: 'confirm_pal_intro',
      },
    ],
  },

  // 「正解をチェック」で不正解だったときにフリエが登場して選択肢を出す
  incorrect_confirm: {
    character: 'furie',
    portrait: 'think',
    lines: [
      'あっ、この解答だと少し違うみたいだよ！',
      'どうする？もう一度自分でやってみる？それとも、答えを見て解説を聞いてみる？',
    ],
    choices: [
      { label: 'もう一度やってみる 💪', subLabel: '', actionId: 'incorrect_retry' },
      { label: '解説を見る 💡', subLabel: 'ギブアップして答えを見ます', actionId: 'incorrect_giveup' },
    ],
  },

  // 「あきらめる」ボタンを押したときの最終確認
  give_up_confirm: {
    character: 'furie',
    portrait: 'think',
    lines: [
      '本当にあきらめる？',
      'あきらめると、この問題は「ヒント使用」の記録になっちゃうよ？',
    ],
    choices: [
      { label: 'もう少し頑張る 💪', subLabel: '', actionId: 'giveup_cancel' },
      { label: 'あきらめる 💡', subLabel: '答えと解説を見ます', actionId: 'giveup_confirm' },
    ],
  },

  // 答え表示直前にフリエが登場して切り出す
  answer_reveal_intro: {
    character: 'furie',
    portrait: 'default',
    lines: [
      'じゃあ、正解の並びを見てみよう！',
      'ここからはパルに解説してもらうね！',
    ],
    choices: [
      { label: '見る 👀', subLabel: '', actionId: 'answer_reveal_show' },
    ],
  },

  // 答え表示後にパルが登場して、そのステージで使う公式について解説する
  // context.requiredFormulas: string[] (使う公式ID配列) が buildLines に渡される
  answer_reveal_pal_explain: {
    character: 'hippalcos',
    portrait: 'explain',
    buildLines: (ctx) => {
      const req = Array.isArray(ctx && ctx.requiredFormulas) ? ctx.requiredFormulas : [];
      const lines = [];
      lines.push('じゃあ、この問題のポイントを説明するね！');

      // 各公式の解説を組み立て
      const explains = {
        formula_1: '「公式① sin²θ + cos²θ = 1」を使って、sin²+cos² が出てくる部分を「1」に書き換えたよ！',
        formula_2: '「公式② tanθ = sinθ/cosθ」を使って、tan を sin と cos の分数に開くと、他の関数と組み合わせて計算しやすくなるんだ！',
        formula_3: '「公式③ 1 + tan²θ = 1/cos²θ」を使って、1+tan² を 1/cos² に書き換えたよ！',
      };

      if (req.length === 0) {
        lines.push('今回はブロックを整理するだけで解けたね！');
      } else if (req.length === 1) {
        const key = req[0];
        if (explains[key]) lines.push(explains[key]);
      } else {
        // 複数公式を使う問題
        const names = req.map((k) => {
          if (k === 'formula_1') return '公式①';
          if (k === 'formula_2') return '公式②';
          if (k === 'formula_3') return '公式③';
          return k;
        });
        lines.push(`今回は ${names.join(' と ')} を組み合わせるのがポイントだよ！`);
        req.forEach((k) => {
          if (explains[k]) lines.push(explains[k]);
        });
      }

      lines.push('この解き方を覚えて、次の問題にチャレンジしてみよう！');
      return lines;
    },
    choices: [
      { label: '次のステージへ ▶', subLabel: '', actionId: 'answer_reveal_next_stage' },
    ],
  },
};