// ===== app-effects.js =====
// クリア時のエフェクト（波紋やスタンプ）を描画します

function showSuccessRipple() {
  const ripple = document.createElement('div');
  ripple.className = 'success-ripple';
  document.body.appendChild(ripple);
  setTimeout(() => {
    if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
  }, 1000);
}

function showClearStamp(text) {
  const stamp = document.createElement('div');
  stamp.className = 'clear-stamp-effect';
  stamp.textContent = text || 'CLEAR!';
  document.body.appendChild(stamp);
  setTimeout(() => {
    if (stamp.parentNode) stamp.parentNode.removeChild(stamp);
  }, 1500);
}

// 正解時のエフェクトをまとめて再生する（波紋＋スタンプ＋紙吹雪）
function playClearEffects(text) {
  showSuccessRipple();
  showClearStamp(text);
  if (typeof confetti === 'function') {
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
  }
}

// 他ファイル（app.js）から呼べるよう window に登録
window.showSuccessRipple = showSuccessRipple;
window.showClearStamp = showClearStamp;
window.playClearEffects = playClearEffects;