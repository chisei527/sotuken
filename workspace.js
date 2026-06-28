// ===== workspace.js =====
// ブロックを並べる「ワークスペース（机）」の環境設定と整列を担当

// 1. パレット（ツールボックス）の中身を定義
window.buildToolboxConfig = function(problemData) {
  const unlockedFormulaIds = typeof window.getUnlockedFormulaIds === 'function'
    ? window.getUnlockedFormulaIds()
    : Array.from({length: 16}, (_, i) => `formula_${i+1}`);
  console.log('[buildToolboxConfig] ツールボックスに乗せる公式:', unlockedFormulaIds);

  return {
    kind: 'categoryToolbox',
    contents: [
      {
        kind: 'category', name: '基本', colour: '200',
        contents: [
          { kind: 'block', type: 'custom_number' },
          { kind: 'block', type: 'term_sin' },
          { kind: 'block', type: 'term_cos' },
          { kind: 'block', type: 'term_tan' },
          { kind: 'block', type: 'term_sin2' },
          { kind: 'block', type: 'term_cos2' },
          { kind: 'block', type: 'term_theta' },
          { kind: 'block', type: 'math_add' },
          { kind: 'block', type: 'math_negate' },
          { kind: 'block', type: 'math_multiply' },
          { kind: 'block', type: 'math_fraction' },
          { kind: 'block', type: 'math_square' }
        ]
      },
      {
        kind: 'category', name: '公式', colour: '260',
        contents: unlockedFormulaIds.map((type) => ({ kind: 'block', type }))
      },
      {
        kind: 'category', name: '操作', colour: '120',
        contents: [
          { kind: 'block', type: 'replace_operation' },
          { kind: 'block', type: 'common_denominator_operation' },
          { kind: 'block', type: 'conclusion_operation' }
        ]
      }
    ]
  };
};

// 2. サイバーデザインのダークテーマ設定
const mathDarkTheme = Blockly.Theme.defineTheme('mathDarkTheme', {
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: 'transparent',
    toolboxBackgroundColour: 'rgba(6, 26, 58, 0.95)',
    toolboxForegroundColour: '#ffffff',
    flyoutBackgroundColour: 'rgba(8, 22, 44, 0.92)',
    flyoutForegroundColour: '#ffffff',
    scrollbarColour: 'rgba(56, 189, 248, 0.65)',
    scrollbarOpacity: 1,
  },
});

// 3. ワークスペースの起動（机を画面に置く）
window.workspace = Blockly.inject('l', {
  toolbox: window.buildToolboxConfig(),
  renderer: 'zelos',
  theme: mathDarkTheme,
  trashcan: true,
  move: { scrollbars: true, drag: true, wheel: true },
  zoom: { controls: true, wheel: true, startScale: 1, maxScale: 2, minScale: 0.5, scaleSpeed: 1.1 },
});

// 4. ブロックを綺麗に整列させる機能
window.forceWorkspaceLayoutSync = function() {
  if (!window.workspace) return;
  Blockly.svgResize(window.workspace);
  window.workspace.resizeContents();
  window.workspace.render();
};

window.arrangeBlocks = function() {
  if (!window.workspace) return;
  window.forceWorkspaceLayoutSync();
  const metrics = window.workspace.getMetrics();
  const leftInset = Math.max(250, (metrics?.absoluteMetrics?.left || 0) + (metrics?.toolboxWidth || 0) + 24);
  const topInset = 24;

  const topBlocks = window.workspace.getTopBlocks(true);
  const nonProofBlocks = topBlocks.filter(b => b.type !== 'proof_step');
  const proofBlocks = topBlocks.filter(b => b.type === 'proof_step');

  nonProofBlocks.sort((a, b) => a.getRelativeToSurfaceXY().x - b.getRelativeToSurfaceXY().x);

  let currentX = leftInset;
  let rowMaxHeight = 0;
  nonProofBlocks.forEach((block) => {
    const pos = block.getRelativeToSurfaceXY();
    const size = block.getHeightWidth();
    block.moveBy(currentX - pos.x, topInset - pos.y);
    currentX += size.width + 26;
    rowMaxHeight = Math.max(rowMaxHeight, size.height);
  });

  let proofY = topInset + Math.max(150, rowMaxHeight + 80);
  proofBlocks.forEach((block) => {
    const pos = block.getRelativeToSurfaceXY();
    const size = block.getHeightWidth();
    block.moveBy(leftInset - pos.x, proofY - pos.y);
    proofY += size.height + 26;
  });
};