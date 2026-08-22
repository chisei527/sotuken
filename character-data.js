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
      default: 'asset/メインビジュアル.webp',
      joy: 'asset/喜び.webp',
      joyPlain: 'asset/喜び周りなし.webp',
      think: 'asset/悩み差分.webp',
      thinkPlain: 'asset/悩み周りなし.webp',
      welcome: 'asset/メインビジュアル.webp',
      welcomePlain: 'asset/周りなし差分.webp',
    },
  },
  hippalcos: {
    id: 'hippalcos',
    name: 'ヒッパルコス（パル）',
    portraits: {
      default: 'asset/ヒッパルコス 通常.webp',
      normal: 'asset/ヒッパルコス 通常.webp',
      explain: 'asset/ヒッパルコス 解説.webp',
      joy: 'asset/ヒッパルコス 喜び.webp',
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
      { character: 'hippalcos', portrait: 'joy', text: 'はじめまして！ぼくはヒッパルコス、パルって呼んでね！' },
      'これから一緒に、三角関数の証明パズルを解いていくよ！',
      'まずどうする？基本操作をゆっくり覚えていくか、いきなり本編に挑戦するか、選んでね！',
    ],
    choices: [
      {
        label: '基本操作から覚える（おすすめ）',
        subLabel: 'まずは基本の使い方をチュートリアルで学ぶよ',
        actionId: 'start_tutorial',
      },
      {
        label: '本編に挑戦！',
        subLabel: 'いきなり本編ステージ1から始めるよ',
        actionId: 'start_main_stage_1',
      },
    ],
  },

  // モード選択画面 (2回目以降): 挨拶を短くしてすぐ選ばせる。パルも一言挟む
  intro_mode_select_repeat: {
    character: 'furie',
    portrait: 'joyPlain',
    lines: [
      'おかえり！次はどうする？',
      { character: 'hippalcos', portrait: 'joy', text: 'またあったね！準備できたら教えてね！' },
      'チュートリアルをもう1回やる？それとも本編に挑戦してみる？',
    ],
    choices: [
      {
        label: 'チュートリアルをもう一度',
        subLabel: '基本操作をおさらいする',
        actionId: 'start_tutorial',
      },
      {
        label: '本編にチャレンジ',
        subLabel: '本編ステージ1へ',
        actionId: 'start_main_stage_1',
      },
    ],
  },

  // チュートリアル開始前: フリエが説明。選択肢はなく、最後の行タップで自動的にパル登場へ
  tutorial_intro: {
    character: 'furie',
    portrait: 'joyPlain',
    lines: [
      'まず、ブロックを組み合わせて式を作るんだ。',
      '左辺と右辺が等しくなるようにブロックを使って証明していくよ！',
    ],
    // 選択肢を出さず、最終行タップで confirm_tutorial_start を発火する
    choices: [],
    nextActionId: 'confirm_tutorial_start',
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
        `${name} だよ、これで色々な変形ができるようになるよ！`,
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
  // パルの登場 (tutorial_intro 完了後): 詳しい解説
  // 「はじめまして」は既にモード選択の途中で言っているため、ここでは省略
  intro_pal: {
    character: 'hippalcos',
    portrait: 'explain',
    lines: [
      '詰まったら、いつでも右下の僕を押してね！',
      '三角関数のことなら何でも聞いてね！',
      'ヒントとかガイドもぼくが担当するよ、右下にいるからいつでも押してね！',
    ],
    choices: [
      {
        label: 'よし、始めよう！',
        subLabel: '',
        actionId: 'confirm_pal_intro',
      },
    ],
  },

  // パルの登場 (2回目以降): もう解説不要なので「よし、始めよう！」1 行のみ
  intro_pal_repeat: {
    character: 'hippalcos',
    portrait: 'joy',
    lines: [
      'よし、始めよう！',
    ],
    choices: [
      {
        label: 'よろしく！',
        subLabel: '',
        actionId: 'confirm_pal_intro',
      },
    ],
  },

  // 「本編に飛び込む」を選んだ時 (チュートリアル未受講) の簡単ブリーフィング (初回のみ)
  // まずフリエが「使い方紹介する?」の選択肢
  intro_main_briefing_ask: {
    character: 'furie',
    portrait: 'welcome',
    lines: [
      'じゃあ本編を始めるけど、簡単に使い方だけ紹介するね！',
    ],
    choices: [
      {
        label: '紹介を聞く',
        subLabel: 'フリエが使い方を教えてくれるよ',
        actionId: 'briefing_show_furie',
      },
      {
        label: 'もう分かってる',
        subLabel: 'スキップして始める',
        actionId: 'briefing_skip',
      },
    ],
  },

  // フリエによる引き出し操作の説明
  intro_main_briefing_furie: {
    character: 'furie',
    portrait: 'default',
    lines: [
      '左のメニューから、証明に使うブロックを引き出してね！',
      '「基本」「公式」「操作」の3つのカテゴリがあるよ！',
      '引き出したブロックは、証明ブロックの中に組み立てて使うんだ！',
      'じゃあ、あとはパルに任せるね！',
    ],
    choices: [],
    nextActionId: 'briefing_show_pal',
  },

  // 「正解をチェック」で不正解だったときにフリエが登場して選択肢を出す
  incorrect_confirm: {
    character: 'furie',
    portrait: 'think',
    lines: [
      'あっ、この解答だと少し違うみたいだよ！',
      'どうする？もう一度自分でやってみる？それとも、パルに答えを聞いて解説してもらう？',
    ],
    choices: [
      { label: 'もう一度やってみる 💪', subLabel: '', actionId: 'incorrect_retry' },
      { label: '解説を聞く 💡', subLabel: 'ギブアップして答えを見る', actionId: 'incorrect_giveup' },
    ],
  },

  // 「あきらめる」ボタンを押したときの最終確認
  give_up_confirm: {
    character: 'furie',
    portrait: 'think',
    lines: [
      '本当にあきらめる？',
      'あきらめると、この問題はクリア判定にならないよ？',
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
  // 「次のステージへ」は独立ボタン (app.js showNextStageButton) で発火するため、
  // ここでは choices を空にして keepOpenAtEnd で最終行でも閉じない状態を保持する。
  answer_reveal_pal_explain: {
    character: 'hippalcos',
    portrait: 'explain',
    keepOpenAtEnd: true,
    // 最終行到達時に「次のステージへ」ボタンが吹き出し内に表示される。
    // クリックすると nextActionId が発火される (character-dialog.js が処理)。
    nextActionId: 'answer_reveal_next_stage',
    buildLines: (ctx) => {
      const req = Array.isArray(ctx && ctx.requiredFormulas) ? ctx.requiredFormulas : [];
      const steps = Array.isArray(ctx && ctx.proofSteps) ? ctx.proofSteps : [];
      const lines = [];

      const fmt = (e) => (typeof window.prettyFormatExpression === 'function')
        ? window.prettyFormatExpression(e) : String(e || '');
      const svg = (n) => (window.BlockSvg && typeof window.BlockSvg.formula === 'function')
        ? ' ' + window.BlockSvg.formula(n) : '';
      const numOf = (id) => ({ formula_1: 1, formula_2: 2, formula_3: 3 }[id] || null);
      const MARU = ['', '①', '②', '③'];

      // 公式ごとの「どこに目をつければ気づけるか」。
      // 解き方の丸暗記ではなく、次の問題で自分で気づけるようにするのが狙い。
      const noticeHint = {
        formula_1: 'sin と cos の 2 乗が足し算で並んでいたら、公式①で「1」にまとめられる合図だよ。',
        formula_2: 'tan が混ざっていたら、公式②で sinθ/cosθ に開くと他の項とそろえやすくなるよ。',
        formula_3: '「1 + tan²θ」の形を見つけたら、公式③で 1/cos²θ に変えられる合図だよ。',
      };
      const formulaName = {
        formula_1: '公式① sin²θ + cos²θ = 1',
        formula_2: '公式② tanθ = sinθ/cosθ',
        formula_3: '公式③ 1 + tan²θ = 1/cos²θ',
      };

      // 変形ステップ（結論ブロックを除く）
      const ops = steps.filter((s) => s && s.type && s.type !== 'conclusion_operation');
      const conclusion = steps.find((s) => s && s.type === 'conclusion_operation');

      // ── 手順が取れなかった場合のフォールバック ──
      // 盤面を読めなかったときでも、公式の一般論だけは伝える。
      if (ops.length === 0) {
        lines.push('じゃあ、この問題のポイントを説明するね！');
        if (req.length === 0) {
          lines.push('今回はブロックを整理するだけで解けたね！');
        } else {
          req.forEach((k) => { if (noticeHint[k]) lines.push(`${formulaName[k]}${svg(numOf(k))} がポイントだよ。${noticeHint[k]}`); });
        }
        lines.push('この解き方を覚えて、次の問題にチャレンジしてみよう！');
        return lines;
      }

      // ── 1. 出発点と着眼点 ──
      const startExpr = fmt(ops[0].before);
      // 着眼点は「1 手目がいきなり公式のとき」だけ言う。
      // 1 手目が通分や計算の問題（例: 問題20）で「sin²+cos² を探そう」と言うと、
      // 実際にやることと食い違って混乱させてしまう。
      const firstOp = ops[0];
      const firstFormula = (firstOp && firstOp.formula) ? firstOp.formula : null;
      const firstIsPrep = firstOp && !firstOp.formula;
      if (startExpr) {
        lines.push(`まずは左辺の ${startExpr} からスタート。ここを右辺の形に近づけていくよ。`);
      } else {
        lines.push('じゃあ、この問題を最初から一緒に追いかけてみよう！');
      }
      if (firstFormula && noticeHint[firstFormula]) {
        lines.push(`最初の手がかりはここ。${noticeHint[firstFormula]}`);
      } else if (firstIsPrep) {
        // 下ごしらえから入る問題は「なぜ先に整理するのか」だけを言う。
        // 具体的に何をするかは次の行で式つきで説明するので、ここでは重ねない。
        lines.push('この形のままだと公式が当てはまらないよね。まずは式を整えるところから始めるよ。');
      }

      // ── 2. 実際にやった変形を 1 手ずつ ──
      // 「何を」「なぜ」「どうなった」を毎回そろえて書く。
      // 変形が 1 手しかない問題で「1つ目。」と付けると回りくどいので、
      // 2 手以上のときだけ番号を振る。
      const numbered = ops.length >= 2;
      ops.forEach((op, i) => {
        const no = numbered ? `${i + 1}つ目。` : '';
        const before = fmt(op.before);
        const after = fmt(op.after);
        const arrow = (before && after) ? `${before} → ${after}` : (after || before);

        if (op.type === 'replace_operation' && op.formula) {
          const n = numOf(op.formula);
          const label = formulaName[op.formula] || '公式';
          lines.push(`${no}「${label}」${svg(n)} を当てはめて、${arrow} にしたよ。`);
        } else if (op.type === 'replace_operation') {
          lines.push(`${no}${arrow} と書き換えたよ。`);
        } else if (op.type === 'common_denominator_operation') {
          lines.push(`${no}分母がバラバラだと足せないから、通分して分母をそろえるよ。${arrow} だね。`);
        } else if (op.type === 'simplify_operation') {
          lines.push(`${no}ここは計算で整理するだけ。${arrow} になるよ。`);
        } else {
          lines.push(`${no}${arrow}`);
        }
      });

      // ── 3. 到達点 ──
      const goal = conclusion ? fmt(conclusion.before) : fmt(ops[ops.length - 1].after);
      if (goal) {
        lines.push(`これで左辺が ${goal} になって、右辺とぴったり同じ形になったね。証明できた！`);
      }

      // ── 4. 次に活かすまとめ ──
      // 2 つ以上の公式を組み合わせた問題は、その「順番」が肝になる。
      const usedFormulas = ops.map((o) => o.formula).filter(Boolean);
      const uniqueUsed = usedFormulas.filter((v, i) => usedFormulas.indexOf(v) === i);
      if (uniqueUsed.length >= 2) {
        const order = uniqueUsed.map((k) => MARU[numOf(k)] || k).join(' → ');
        lines.push(`今回のコツは、公式を使う順番。${order} の順に使うのがポイントだったよ。`);
      } else if (uniqueUsed.length === 1) {
        // 着眼点は冒頭で既に言っているので、締めでは同じ文を繰り返さない。
        // 「探すべき形」だけを短く復習させる。
        const target = {
          formula_1: 'sin²θ + cos²θ',
          formula_2: 'tanθ',
          formula_3: '1 + tan²θ',
        }[uniqueUsed[0]];
        const n = numOf(uniqueUsed[0]);
        if (target) lines.push(`次からは式の中に「${target}」が隠れていないか探してみて。見つけたら公式${MARU[n]}の出番だよ。`);
      }

      return lines;
    },
    choices: [],
  },
};