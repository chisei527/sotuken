// ===== account-ui.js =====
// 「アカウント」画面（引き継ぎIDの作成・ログイン・ログアウト・研究協力の設定）と、
// 初回の「研究協力のお願い」画面。中身の処理はすべて cloud.js の window.Cloud を呼ぶ。

(function () {
  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function toast(msg, isError) {
    if (typeof window.showToast !== 'function') return;
    window.showToast(isError ? `<span style='color:#ff4b4b'>${msg}</span>` : msg, false);
  }

  // ------------------------------------------------------------
  // 初回の「研究協力のお願い」
  // ------------------------------------------------------------
  function buildConsentModal() {
    const modal = el(`
      <div id="consent-modal" class="overlay-screen hidden" role="dialog" aria-modal="true" aria-labelledby="consent-title">
        <div class="account-card">
          <h2 id="consent-title">研究へのご協力のお願い</h2>
          <p>このアプリは卒業研究の一環として作られています。学習の仕方を調べるため、遊んだときの記録をお預かりしてもよいですか？</p>
          <ul class="account-list">
            <li><b>記録するもの：</b>解いた問題、答えを確かめたときの正誤とブロックの組み方、ヒントやギブアップを使ったか、かかった時間</li>
            <li><b>記録しないもの：</b>名前・メールアドレスなど、あなたを特定できる情報</li>
            <li>記録は研究の目的にだけ使い、個人が分かる形で公開することはありません。</li>
            <li>あとから「アカウント」画面でいつでも取りやめられます。協力しなくても、すべての機能を使えます。</li>
          </ul>
          <p class="account-note"><a href="privacy.html" target="_blank" rel="noopener">プライバシーポリシー</a></p>
          <div class="account-actions">
            <button id="btn-consent-no" class="action-btn btn-secondary" type="button">協力しない</button>
            <button id="btn-consent-yes" class="action-btn btn-primary" type="button">協力する</button>
          </div>
        </div>
      </div>`);
    document.body.appendChild(modal);
    const close = () => modal.classList.add('hidden');
    modal.querySelector('#btn-consent-yes').addEventListener('click', async () => {
      close(); await window.Cloud.setConsent(true); toast('ご協力ありがとうございます！');
    });
    modal.querySelector('#btn-consent-no').addEventListener('click', async () => {
      close(); await window.Cloud.setConsent(false);
    });
    return modal;
  }

  // ------------------------------------------------------------
  // アカウント画面
  // ------------------------------------------------------------
  function buildAccountModal() {
    const modal = el(`
      <div id="account-modal" class="overlay-screen hidden" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <div class="account-card">
          <button class="account-close" type="button" aria-label="閉じる">×</button>
          <h2 id="account-title">アカウント</h2>
          <p class="account-status" id="account-status"></p>

          <section id="account-section-register" class="account-section">
            <h3>引き継ぎIDを作る</h3>
            <p class="account-note">IDを作っておくと、別の端末やブラウザでも続きから遊べます。今の進捗はそのまま引き継がれます。</p>
            <form id="form-register" class="account-form" autocomplete="on">
              <label>ID（半角小文字の英数字と _、4〜20文字）<input name="id" type="text" inputmode="latin" autocomplete="username" autocapitalize="none" spellcheck="false" required minlength="4" maxlength="20" pattern="[a-z0-9_]{4,20}"></label>
              <label>パスワード（8文字以上）<input name="pw" type="password" autocomplete="new-password" required minlength="8"></label>
              <label>パスワード（確認）<input name="pw2" type="password" autocomplete="new-password" required minlength="8"></label>
              <button class="action-btn btn-primary" type="submit">IDを作る</button>
            </form>
          </section>

          <section id="account-section-login" class="account-section">
            <h3>別の端末で作ったIDでログイン</h3>
            <p class="account-note">この端末の進捗も、ログインしたIDの進捗に合わせてまとめられます。</p>
            <form id="form-login" class="account-form" autocomplete="on">
              <label>ID<input name="id" type="text" autocomplete="username" autocapitalize="none" spellcheck="false" required></label>
              <label>パスワード<input name="pw" type="password" autocomplete="current-password" required></label>
              <button class="action-btn btn-primary" type="submit">ログイン</button>
            </form>
          </section>

          <section id="account-section-logout" class="account-section">
            <h3>ログアウト</h3>
            <p class="account-note">この端末から進捗が消えます（サーバーには残るので、もう一度ログインすれば戻ります）。IDとパスワードを忘れると戻せません。</p>
            <button id="btn-logout" class="action-btn btn-secondary" type="button">ログアウト</button>
          </section>

          <section id="account-section-consent" class="account-section">
            <h3>研究への協力</h3>
            <label class="account-toggle"><input id="chk-consent" type="checkbox"> 遊んだ記録を研究に提供する</label>
            <p class="account-note"><a href="privacy.html" target="_blank" rel="noopener">プライバシーポリシー</a></p>
          </section>
        </div>
      </div>`);
    document.body.appendChild(modal);

    const q = (s) => modal.querySelector(s);
    const close = () => modal.classList.add('hidden');
    q('.account-close').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    async function withBusy(form, fn) {
      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      try { await fn(); } catch (e) { toast(esc(e.message || String(e)), true); } finally { btn.disabled = false; }
    }

    q('#form-register').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.currentTarget;
      if (f.pw.value !== f.pw2.value) { toast('パスワード（確認）が一致しません。', true); return; }
      withBusy(f, async () => {
        const st = await window.Cloud.registerLoginId(f.id.value, f.pw.value);
        f.reset(); render();
        toast(`ID「${esc(st.loginId)}」を作りました。IDとパスワードは忘れないようにメモしてください。`);
      });
    });

    q('#form-login').addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.currentTarget;
      withBusy(f, async () => {
        const st = await window.Cloud.login(f.id.value, f.pw.value);
        f.reset(); render();
        toast(`ID「${esc(st.loginId)}」でログインしました。`);
        if (st.consent == null) showConsentIfNeeded();
      });
    });

    q('#btn-logout').addEventListener('click', async () => {
      if (!confirm('ログアウトすると、この端末から進捗が消えます。よろしいですか？')) return;
      await window.Cloud.logout();
    });

    q('#chk-consent').addEventListener('change', async (e) => {
      await window.Cloud.setConsent(e.target.checked);
      toast(e.target.checked ? '研究への協力をオンにしました。' : '研究への協力をオフにしました。今後の記録は送られません。');
    });

    function render() {
      const st = window.Cloud.getStatus();
      const status = q('#account-status');
      const show = (id, on) => { q(id).style.display = on ? '' : 'none'; };
      if (!st.enabled) {
        status.textContent = 'この端末だけに保存されています（サーバー未設定）。';
        ['#account-section-register', '#account-section-login', '#account-section-logout', '#account-section-consent'].forEach((id) => show(id, false));
        return;
      }
      if (st.status === 'connecting') status.textContent = 'サーバーに接続しています…';
      else if (st.status === 'error') status.textContent = 'サーバーにつながりません。進捗はこの端末に保存され、つながったときに送られます。';
      else status.innerHTML = st.isAnonymous
        ? 'まだIDを作っていません。進捗はサーバーに保存されていますが、<b>この端末・このブラウザでしか続きを遊べません</b>。'
        : `ID「<b>${esc(st.loginId)}</b>」でログイン中です。`;
      const online = st.status === 'online';
      show('#account-section-register', online && st.isAnonymous);
      show('#account-section-login', online && st.isAnonymous);
      show('#account-section-logout', online && !st.isAnonymous);
      show('#account-section-consent', true);
      q('#chk-consent').checked = st.consent === 'true';
    }

    modal.render = render;
    window.Cloud.onStatusChange(() => { if (!modal.classList.contains('hidden')) render(); });
    return modal;
  }

  let consentModal = null;
  let accountModal = null;

  async function showConsentIfNeeded() {
    const st = await window.Cloud.ready;
    if (!st.enabled || window.Cloud.getStatus().consent != null) return;
    consentModal = consentModal || buildConsentModal();
    consentModal.classList.remove('hidden');
  }

  window.openAccountModal = function () {
    accountModal = accountModal || buildAccountModal();
    accountModal.render();
    accountModal.classList.remove('hidden');
  };

  function addAccountButton() {
    const controls = document.querySelector('#stage-map-screen .map-controls');
    if (!controls || document.getElementById('btn-account')) return;
    const btn = el('<button id="btn-account" class="map-control-btn" type="button">👤 アカウント</button>');
    btn.addEventListener('click', () => window.openAccountModal());
    controls.insertBefore(btn, controls.querySelector('#btn-unlock-all'));
  }

  function start() {
    if (!window.Cloud) return;
    addAccountButton();
    showConsentIfNeeded();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
