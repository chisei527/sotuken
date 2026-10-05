// ===== app-state.js =====
// アプリ全体で共有する状態と定数。すべて window.xxx に直接書き込む形に統一し、
// 「ローカル変数」と「windowプロパティ」が食い違う事故を根本的に防ぐ。
//
// ルール:
//   - 状態と関数は全て window.xxx として定義する
//   - 他ファイルからも必ず window.xxx として参照する（裸の参照は禁止）
//   - このファイルは「状態の単一の真実」。同名の関数を他ファイルで再定義しないこと。

// ------------------------------------------------------------
// 定数（変化しない値）
// ------------------------------------------------------------
window.UNLOCKED_FORMULAS_STORAGE_KEY = 'unlocked_formulas';

// チュートリアルのステージID。
// ※ここが唯一の定義。main.js など他ファイルで再定義しないこと。
//   （以前 main.js が 0-7 までの7件で上書きしており、0-8 が到達不能になっていた）
window.TUTORIAL_STAGE_IDS = ['0-1', '0-2', '0-3', '0-4', '0-5', '0-6', '0-7', '0-8'];

window.APP_STORAGE_KEYS = ['s', 'gu', 'unlock_all', 'tutorial_seen', 'proof_scaffold_mode', 'tutorial_progress', window.UNLOCKED_FORMULAS_STORAGE_KEY];

// ------------------------------------------------------------
// 【開発用】起動時に localStorage を自動リセットするフラグ。
// テスト中は毎回まっさらな状態から始めたいので true にする。
// 本番リリース時は false にする。 ← 提出・デモ時は必ず false のままにすること
// ------------------------------------------------------------
window.AUTO_RESET_ON_LOAD = false;
if (window.AUTO_RESET_ON_LOAD) {
  window.APP_STORAGE_KEYS.forEach((key) => { if (key) window.AppStorage.remove(key); });
  console.log('[app-state] AUTO_RESET_ON_LOAD が有効なため localStorage をリセットしました');
}

// ------------------------------------------------------------
// アンロック公式の永続化（localStorage）
// ------------------------------------------------------------
window.loadUnlockedFormulasFromStorage = function() {
  try {
    const parsed = window.AppStorage.getJSON(window.UNLOCKED_FORMULAS_STORAGE_KEY, []);
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
  } catch (_) {
    return [];
  }
};

window.saveUnlockedFormulasToStorage = function(formulaIds) {
  const safeIds = Array.isArray(formulaIds) ? formulaIds.map((id) => String(id)) : [];
  window.AppStorage.setJSON(window.UNLOCKED_FORMULAS_STORAGE_KEY, safeIds);
};

// ------------------------------------------------------------
// 共有状態（書き換わる値）— すべて window 直書きで一元化
// ------------------------------------------------------------
window.clearedStages = window.AppStorage.getJSON('s', []);
// ギブアップ済み(=あきらめて解説を見た)ステージ。「クリア」とは別カテゴリで管理する。
// 後で本人が自力クリアしたら、こっちのリストから削除して clearedStages に格上げする。
window.giveUppedStages = window.AppStorage.getJSON('gu', []);
window.unlockAll = window.AppStorage.getRaw('unlock_all') === '1';
window.unlockedFormulas = window.loadUnlockedFormulasFromStorage();
window.currentStageNumber = 0;
window.currentProblemData = null;
window.currentStreak = 0;
window.currentStageSolved = false;
window.hasBoundEventListeners = false;
window.workspace = null;

// チュートリアル関連
window.tutorialModeActive = false;
window.tutorialWorkspaceListenerBound = false;
window.tutorialProgressCount = Math.max(0, parseInt(window.AppStorage.getRaw('tutorial_progress') || '0', 10) || 0);

// ガイド/ヒント関連
window.goalHintActive = false;
window.currentHighlightTargetNode = null;
window.highlightTrackingFrameId = 0;
window.guideWorkspaceListenerBound = false;

// ------------------------------------------------------------
// チュートリアル判定ヘルパー
// ※これも唯一の定義。main.js 側の重複定義は削除済み。
// ------------------------------------------------------------
window.isTutorialStageId = function(stageId) {
  return window.TUTORIAL_STAGE_IDS.includes(String(stageId));
};

window.getTutorialStageIndex = function(stageId) {
  return window.TUTORIAL_STAGE_IDS.indexOf(String(stageId));
};

window.getTutorialStageId = function(stageIndex) {
  return window.TUTORIAL_STAGE_IDS[Math.max(0, Math.min(Number(stageIndex) || 0, window.TUTORIAL_STAGE_IDS.length - 1))] || null;
};

window.getNextTutorialStageId = function(stageId) {
  const currentIndex = window.getTutorialStageIndex(stageId);
  if (currentIndex < 0) return null;
  return window.getTutorialStageId(currentIndex + 1);
};

// ------------------------------------------------------------
// チュートリアル進行状態の判定について
//   getTutorialOperationMissingHole / getTutorialTargetOperationState /
//   getTutorialGoalState / getTutorialBannerText は app-guide.js が唯一の実装。
//   以前このファイルにも同名の実装があったが、読み込み順で app-guide.js に
//   完全に上書きされる死にコードだったため削除した。
// ------------------------------------------------------------

// ------------------------------------------------------------
// 画像アセットのURL解決
//
// asset/ の画像は元は PNG 合計 53MB あり、読み込みの重さのほぼ全てを
// 占めていた。WebP に変換して合計 1.8MB になっている。
//
// 各ファイルのパスは '.webp' を直接書く方針（どのファイルを読むか
// コードを見てすぐ分かるようにするため）。
// この assetUrl() は、'.png' 表記が残っている箇所を '.webp' に
// 読み替えるための保険として置いてある。
// ------------------------------------------------------------
window.SUPPORTS_WEBP = (function() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } catch (_) {
    return false;
  }
})();

if (!window.SUPPORTS_WEBP) {
  console.warn('[app-state] このブラウザは WebP に非対応です。画像が表示されない場合は asset/ に元の PNG を戻してください。');
}

/**
 * '.png' 表記のパスを、実際に置いてあるファイル（.webp）に読み替える。
 * すでに '.webp' なら何もしない。
 * @param {string} path アセットのパス
 * @returns {string} 実際に読み込むべきパス
 */
window.assetUrl = function(path) {
  const raw = String(path || '');
  if (!window.SUPPORTS_WEBP) return raw;
  return raw.replace(/\.(png|jpg|jpeg)$/i, '.webp');
};