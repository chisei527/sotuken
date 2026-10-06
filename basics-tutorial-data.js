// ============================================
// basics-tutorial-data.js
// 操作基礎チュートリアル (ステージ 0-0) の台本。
// フリエが 5 ステップに分けて Blockly の基本操作を教える。
// 各ステップは userAction (Blockly イベント条件) を満たすと次に進む。
// ============================================

// 各ステップの構造:
//   introLines:    ステップ開始時のフリエのセリフ (配列)
//   completeLines: 達成後のフリエのセリフ (配列、次のステップに進む前に読む)
//   check:         Blockly の changeListener に渡すイベント判定関数
//                  (event, workspace) → true で達成
//   allowSkip:     スキップ可能なステップか (基本 true)
window.BASICS_TUTORIAL_STEPS = [
  {
    id: 'step_pull_number_1',
    introLines: [
      'まずはブロックの引き出し方だよ！',
      `左の「基本」カテゴリを開いて、「1」のブロック ${window.BlockSvg.number('1')} を真ん中の作業エリアまでドラッグしてみて！`,
    ],
    completeLines: [
      'ばっちり！ブロックが作業エリアに置けたね！',
    ],
    check: (event) => {
      // custom_number ブロックが作成されたら達成
      if (event.type !== Blockly.Events.BLOCK_CREATE) return false;
      return _createdBlockHasType(event, 'custom_number');
    },
  },
  {
    id: 'step_pull_number_2',
    introLines: [
      `その調子！もう一度、「1」のブロック ${window.BlockSvg.number('1')} を出してみよう。`,
      '同じブロックは、何個でも出せるよ。',
    ],
    completeLines: [
      '完璧！ブロックが2つ並んだね。',
    ],
    check: (event, workspace) => {
      if (event.type !== Blockly.Events.BLOCK_CREATE) return false;
      // custom_number が2個以上あれば達成
      const nums = workspace.getBlocksByType('custom_number', false);
      return nums.length >= 2;
    },
  },
  {
    id: 'step_pull_add',
    introLines: [
      '次は、ブロック同士をつなげる練習だよ。',
      `「基本」から、今度は「+」の足し算ブロック ${window.BlockSvg.add()} を出してみて！`,
    ],
    completeLines: [
      'いいね！足し算のブロックが出せたね。',
    ],
    check: (event) => {
      if (event.type !== Blockly.Events.BLOCK_CREATE) return false;
      return _createdBlockHasType(event, 'math_add');
    },
  },
  {
    id: 'step_connect_blocks',
    introLines: [
      `じゃあ、さっきの「1」のブロック ${window.BlockSvg.number('1')} を、足し算ブロック ${window.BlockSvg.add()} の穴にはめてみよう！`,
      'ブロックをつかんで穴に近づけると、パチッとはまるよ。',
    ],
    completeLines: [
      'やった！こうやってブロックをつなげて、式を組み立てていくんだ。',
    ],
    check: (event, workspace) => {
      // BLOCK_MOVE で newParentId があり、custom_number が math_add にくっついた
      if (event.type !== Blockly.Events.BLOCK_MOVE) return false;
      if (!event.newParentId) return false;
      const moved = workspace.getBlockById(event.blockId);
      const parent = workspace.getBlockById(event.newParentId);
      if (!moved || !parent) return false;
      return moved.type === 'custom_number' && parent.type === 'math_add';
    },
  },
  {
    id: 'step_delete_block',
    introLines: [
      '最後に、いらないブロックの消し方を覚えよう。',
      'どれでもいいから、ブロックを右下のゴミ箱までドラッグしてみて！',
      '（ブロックを右クリックして「削除」を選んでも消せるよ）',
    ],
    completeLines: [
      'ばっちり！これで基本操作はおしまい。',
      'ここからは、パルと一緒に実際の問題を解いてみよう！',
    ],
    check: (event) => {
      return event.type === Blockly.Events.BLOCK_DELETE;
    },
  },
];

// ステップ全体の開始・終了時のセリフ
window.BASICS_TUTORIAL_INTRO_LINES = [
  'まずは、ブロックの動かし方を覚えよう！',
  'ここで慣れておくと、このあとの問題がぐっと楽になるよ。',
];
window.BASICS_TUTORIAL_OUTRO_LINES = [
  '基本操作はばっちりだね！次は実際の問題に挑戦しよう！',
];

// ヘルパ: BLOCK_CREATE イベントで指定タイプのブロックが含まれるか判定
function _createdBlockHasType(event, targetType) {
  const ids = event.ids || (event.blockId ? [event.blockId] : []);
  if (ids.length === 0) return false;
  // event.json (作られたブロックの構造) を再帰的に探索
  const stack = [event.json].filter(Boolean);
  while (stack.length > 0) {
    const node = stack.pop();
    if (node.type === targetType) return true;
    if (node.inputs) {
      Object.values(node.inputs).forEach((input) => {
        if (input.block) stack.push(input.block);
        if (input.shadow) stack.push(input.shadow);
      });
    }
    if (node.next && node.next.block) stack.push(node.next.block);
  }
  // フォールバック: ワークスペースから取得
  return false;
}