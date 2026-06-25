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