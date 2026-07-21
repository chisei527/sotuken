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
      `左側の「基本」カテゴリから、白い「1」のブロック ${window.BlockSvg.number('1')} を掴んで真ん中の作業エリアにドラッグしてみて！`,
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
      `よくできたね！もう一回、同じ「1」のブロック ${window.BlockSvg.number('1')} を引き出してみよう。`,
      '同じ操作を繰り返せば、ブロックはいくつでも作業エリアに置けるよ！',
    ],
    completeLines: [
      '完璧！これで2つのブロックが並んだね！',
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
      '次は、ブロック同士をつなぐ練習をするよ。',
      `左側の「基本」から、今度は「+」の書かれた足し算ブロック ${window.BlockSvg.add()} を引き出してみて！`,
    ],
    completeLines: [
      'いい調子！足し算のブロックが出せたね！',
    ],
    check: (event) => {
      if (event.type !== Blockly.Events.BLOCK_CREATE) return false;
      return _createdBlockHasType(event, 'math_add');
    },
  },
  {
    id: 'step_connect_blocks',
    introLines: [
      `それじゃあ、さっきの「1」のブロック ${window.BlockSvg.number('1')} を足し算ブロック ${window.BlockSvg.add()} の穴にはめてみよう！`,
      'ブロックを掴んで、足し算ブロックの丸い穴に近づけると自動でハマるよ。',
    ],
    completeLines: [
      'やった！ブロックをつなげたね！こうやって式を組み立てていくんだよ！',
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
      '最後に、間違えて置いたブロックの消し方を覚えよう！',
      'どれでもいいから、ブロックを右下のゴミ箱にドラッグしてみて！',
      '（右クリックして「ブロックを削除」でも消せるよ！）',
    ],
    completeLines: [
      'ばっちり！これで基本操作は全部覚えたね！',
      'それじゃあ、次から本番のチュートリアルを始めよう！',
    ],
    check: (event) => {
      return event.type === Blockly.Events.BLOCK_DELETE;
    },
  },
];

// ステップ全体の開始・終了時のセリフ
window.BASICS_TUTORIAL_INTRO_LINES = [
  '最初にブロックの動かし方を覚えていこう！',
  'これができれば、あとの問題もスムーズに進められるようになるよ！',
];
window.BASICS_TUTORIAL_OUTRO_LINES = [
  'これで基本操作はマスター！次は実際の問題に挑戦しよう！',
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