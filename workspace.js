function buildToolboxConfig() {
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
        contents: Array.from({length: 16}, (_, i) => ({kind: 'block', type: `formula_${i+1}`}))
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
}

let toolboxConfig = buildToolboxConfig();

// Blockly標準のテーマエンジンをハックしてダーク化
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

const workspace = Blockly.inject('l', {
  toolbox: toolboxConfig,
  renderer: 'zelos',
  theme: mathDarkTheme,
  trashcan: true,
  move: { scrollbars: true, drag: true, wheel: true },
  zoom: { controls: true, wheel: true, startScale: 1, maxScale: 2, minScale: 0.5, scaleSpeed: 1.1 },
});
window.workspace = workspace;

function forceWorkspaceLayoutSync() {
  if (!workspace) return;
  Blockly.svgResize(workspace);
  workspace.resizeContents();
  workspace.render();
}

function arrangeBlocks() {
  if (!workspace) return;

  forceWorkspaceLayoutSync();
  const metrics = workspace.getMetrics();
  const toolboxWidth = Math.max(0, metrics?.toolboxWidth || 0);
  const flyoutWidth = Math.max(0, metrics?.flyoutWidth || 0);
  const absoluteLeft = Math.max(0, metrics?.absoluteMetrics?.left || 0);
  const absoluteTop = Math.max(0, metrics?.absoluteMetrics?.top || 0);

  // ツールボックスと重ならない最小マージンを保証する。
  const leftInset = Math.max(250, absoluteLeft + toolboxWidth + flyoutWidth + 24);
  const topInset = Math.max(absoluteTop + 24, 24);
  const gap = 26;

  const topBlocks = workspace.getTopBlocks(true);
  const nonProofBlocks = topBlocks.filter((block) => block && block.type !== 'proof_step');
  const proofBlocks = topBlocks.filter((block) => block && block.type === 'proof_step');

  nonProofBlocks.sort((firstBlock, secondBlock) => firstBlock.getRelativeToSurfaceXY().x - secondBlock.getRelativeToSurfaceXY().x);

  let nonProofBlockX = leftInset;
  let nonProofRowMaxHeight = 0;
  nonProofBlocks.forEach((mathBlock) => {
    const mathBlockPosition = mathBlock.getRelativeToSurfaceXY();
    const mathBlockSize = mathBlock.getHeightWidth();
    mathBlock.moveBy(nonProofBlockX - mathBlockPosition.x, topInset - mathBlockPosition.y);
    nonProofBlockX += mathBlockSize.width + gap;
    nonProofRowMaxHeight = Math.max(nonProofRowMaxHeight, mathBlockSize.height);
  });

  const proofRowStartY = topInset + Math.max(150, nonProofRowMaxHeight + 80);
  let proofBlockY = proofRowStartY;
  proofBlocks.forEach((proofBlock) => {
    const proofBlockPosition = proofBlock.getRelativeToSurfaceXY();
    const proofBlockSize = proofBlock.getHeightWidth();
    proofBlock.moveBy(leftInset - proofBlockPosition.x, proofBlockY - proofBlockPosition.y);
    proofBlockY += Math.max(40, proofBlockSize.height) + gap;
  });
}
