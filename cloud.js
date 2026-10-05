// ===== cloud.js =====
// サーバー（Supabase）とのやりとりをまとめたファイル。
//
//   1. ログイン   … 初回は匿名ユーザーを自動で作る。引き継ぎたい人は ID+パスワードを設定する
//   2. 進捗の同期 … storage.js の PROGRESS キーが変わったら、少し待ってからサーバーへ送る
//                    起動時はサーバーの進捗と端末の進捗を「合体」させる（どちらも失わない）
//   3. 操作ログ   … 研究利用に同意した人だけ、解答提出などをキューに貯めてまとめて送る
//
// サーバーにつながらなくてもゲームは止めない。失敗したら端末保存だけで動き続ける。
// 公開する関数は window.Cloud（ログイン関連）と window.AppLog（操作ログ）。

(function () {
  const cfg = window.APP_CONFIG || {};
  const S = window.AppStorage;
  const K = S.KEYS;

  const enabled = !!(cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY && window.supabase);
  const client = enabled
    ? window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    : null;

  const state = {
    enabled,
    user: null,       // Supabase のユーザー
    loginId: null,    // 引き継ぎID（未設定なら null = 匿名）
    status: enabled ? 'connecting' : 'offline', // 'connecting' | 'online' | 'offline' | 'error'
  };
  const statusListeners = [];
  function setStatus(s) {
    state.status = s;
    statusListeners.forEach((fn) => { try { fn(getStatus()); } catch (_) {} });
  }
  function getStatus() {
    return {
      enabled: state.enabled,
      status: state.status,
      isAnonymous: !state.loginId,
      loginId: state.loginId,
      consent: S.getRaw(K.DEVICE.RESEARCH_CONSENT), // 'true' | 'false' | null
    };
  }

  // ------------------------------------------------------------
  // 進捗の合体（マージ）
  //   クリア済み・解放公式は「和集合」、チュートリアル進行は「大きいほう」。
  //   どちらの端末で進めた分も消えないようにするため。
  // ------------------------------------------------------------
  function parseList(raw) {
    try { const v = JSON.parse(raw); return Array.isArray(v) ? v : []; } catch (_) { return []; }
  }
  function mergeProgress(a, b) {
    a = a || {}; b = b || {};
    const P = K.PROGRESS;
    const out = {};
    const cleared = [...new Set([...parseList(a[P.CLEARED]), ...parseList(b[P.CLEARED])].map(Number))]
      .filter((n) => Number.isFinite(n)).sort((x, y) => x - y);
    const gaveUp = [...new Set([...parseList(a[P.GIVEN_UP]), ...parseList(b[P.GIVEN_UP])].map(Number))]
      .filter((n) => Number.isFinite(n) && !cleared.includes(n)).sort((x, y) => x - y);
    const formulas = [...new Set([...parseList(a[P.UNLOCKED_FORMULAS]), ...parseList(b[P.UNLOCKED_FORMULAS])].map(String))];
    const tut = Math.max(parseInt(a[P.TUTORIAL_PROGRESS] || '0', 10) || 0, parseInt(b[P.TUTORIAL_PROGRESS] || '0', 10) || 0);

    out[P.CLEARED] = cleared.length ? JSON.stringify(cleared) : null;
    out[P.GIVEN_UP] = gaveUp.length ? JSON.stringify(gaveUp) : null;
    out[P.UNLOCKED_FORMULAS] = formulas.length ? JSON.stringify(formulas) : null;
    out[P.TUTORIAL_PROGRESS] = tut ? String(tut) : null;
    out[P.TUTORIAL_SEEN] = (a[P.TUTORIAL_SEEN] === 'true' || b[P.TUTORIAL_SEEN] === 'true') ? 'true' : null;
    out[P.POPUP_SEEN_1_1] = (a[P.POPUP_SEEN_1_1] === 'true' || b[P.POPUP_SEEN_1_1] === 'true') ? 'true' : null;
    return out;
  }
  function sameProgress(a, b) {
    return Object.values(K.PROGRESS).every((k) => (a?.[k] ?? null) === (b?.[k] ?? null));
  }

  // localStorage に書き戻した進捗を、ゲーム側の変数（window.xxx）にも反映する
  function applyProgressToGameState() {
    window.clearedStages = S.getJSON(K.PROGRESS.CLEARED, []);
    window.giveUppedStages = S.getJSON(K.PROGRESS.GIVEN_UP, []);
    if (typeof window.loadUnlockedFormulasFromStorage === 'function') {
      window.unlockedFormulas = window.loadUnlockedFormulasFromStorage();
    }
    window.tutorialProgressCount = Math.max(0, parseInt(S.getRaw(K.PROGRESS.TUTORIAL_PROGRESS) || '0', 10) || 0);
    const map = document.getElementById('stage-map-screen');
    if (map && !map.classList.contains('hidden') && typeof window.renderStageMap === 'function') {
      window.renderStageMap();
    }
  }

  // ------------------------------------------------------------
  // サーバーとの進捗同期
  // ------------------------------------------------------------
  let pushTimer = null;
  let applyingRemote = false;

  async function pullAndMerge() {
    const { data, error } = await client.from('progress').select('data').eq('user_id', state.user.id).maybeSingle();
    if (error) throw error;
    const remote = data?.data || {};
    const local = S.exportProgress();
    const merged = mergeProgress(local, remote);
    if (!sameProgress(merged, local)) {
      applyingRemote = true;
      S.importProgress(merged);
      applyingRemote = false;
      applyProgressToGameState();
    }
    if (!sameProgress(merged, remote)) await pushNow();
  }

  async function pushNow() {
    if (!state.user) return;
    clearTimeout(pushTimer);
    pushTimer = null;
    const { error } = await client.from('progress')
      .upsert({ user_id: state.user.id, data: S.exportProgress() });
    if (error) console.warn('[cloud] 進捗の送信に失敗:', error.message);
  }

  function schedulePush() {
    if (!state.user || applyingRemote) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(pushNow, 1500);
  }

  // ------------------------------------------------------------
  // プロフィール（引き継ぎID・同意）
  // ------------------------------------------------------------
  async function loadProfile() {
    const { data, error } = await client.from('profiles')
      .select('login_id, research_consent, consent_at').eq('id', state.user.id).maybeSingle();
    if (error) throw error;
    state.loginId = data?.login_id || null;
    // 端末側で未回答のときだけ、サーバーの同意状態を採用する（ログイン先で引き継ぐため）
    const localConsent = S.getRaw(K.DEVICE.RESEARCH_CONSENT);
    if (data && data.consent_at && localConsent == null) {
      S.setRaw(K.DEVICE.RESEARCH_CONSENT, data.research_consent ? 'true' : 'false');
    } else if (data && localConsent != null && (localConsent === 'true') !== data.research_consent) {
      await saveConsentToServer(localConsent === 'true');
    }
  }

  async function saveConsentToServer(agree) {
    if (!state.user) return;
    const { error } = await client.from('profiles')
      .update({ research_consent: agree, consent_at: new Date().toISOString() })
      .eq('id', state.user.id);
    if (error) console.warn('[cloud] 同意状態の保存に失敗:', error.message);
  }

  // ------------------------------------------------------------
  // 起動
  // ------------------------------------------------------------
  let readyResolve;
  const ready = new Promise((r) => { readyResolve = r; });
  let retryTimer = null;
  let initRunning = false;

  async function init() {
    if (!enabled) { readyResolve(getStatus()); return; }
    if (initRunning) return;
    initRunning = true;
    clearTimeout(retryTimer);
    try {
      let { data: { session } } = await client.auth.getSession();
      if (!session) {
        const { data, error } = await client.auth.signInAnonymously();
        if (error) throw error;
        session = data.session;
      }
      state.user = session.user;
      await loadProfile();
      await pullAndMerge();
      setStatus('online');
      flushLogs();
    } catch (e) {
      console.warn('[cloud] サーバーに接続できませんでした。この端末だけに保存し、あとで再接続します:', e?.message || e);
      setStatus('error');
      retryTimer = setTimeout(init, 60000); // 1分ごとに再接続を試す
    }
    initRunning = false;
    readyResolve(getStatus());
  }
  window.addEventListener('online', () => { if (state.status === 'error') init(); });

  S.onProgressChange(() => schedulePush());
  window.addEventListener('pagehide', () => { if (pushTimer) pushNow(); flushLogs(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { if (pushTimer) pushNow(); flushLogs(); }
  });

  // ------------------------------------------------------------
  // 引き継ぎID（ID + パスワード）
  // ------------------------------------------------------------
  const ID_PATTERN = /^[a-z0-9_]{4,20}$/;
  function toEmail(loginId) { return `${loginId}@${cfg.LOGIN_EMAIL_DOMAIN}`; }
  function friendlyError(error) {
    const msg = String(error?.message || error || '');
    const code = error?.code || '';
    if (code === 'email_exists' || code === 'user_already_exists' || /already (been )?registered|already exists/i.test(msg)) return 'このIDはすでに使われています。別のIDにしてください。';
    if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) return 'IDかパスワードが違います。';
    if (code === 'weak_password' || /password/i.test(msg) && /at least|short|weak/i.test(msg)) return 'パスワードが短すぎます（8文字以上にしてください）。';
    if (/rate limit|too many/i.test(msg)) return '短時間に何度も試したため、少し時間をおいてください。';
    if (/fetch|network/i.test(msg)) return 'サーバーにつながりません。通信環境を確認してください。';
    return `エラーが発生しました（${msg}）`;
  }
  function validate(loginId, password) {
    if (!ID_PATTERN.test(loginId)) return 'IDは半角の小文字英数字と _ で、4〜20文字にしてください。';
    if (!password || password.length < 8) return 'パスワードは8文字以上にしてください。';
    return null;
  }

  // 今の匿名ユーザーに ID とパスワードを付ける（進捗はそのまま）
  async function registerLoginId(loginId, password) {
    if (!state.user) throw new Error('サーバーにつながっていません。');
    loginId = String(loginId || '').trim().toLowerCase();
    const invalid = validate(loginId, password);
    if (invalid) throw new Error(invalid);
    // Supabase の仕様: 匿名ユーザーには「メール → パスワード」の順に2回に分けて設定する
    // （メールが確認済みになってからでないとパスワードを付けられない。メール確認オフなら即確認済み）
    const { data: emailData, error } = await client.auth.updateUser({ email: toEmail(loginId) });
    if (error) throw new Error(friendlyError(error));
    if (emailData?.user && emailData.user.email !== toEmail(loginId)) {
      // Supabase 側で「メール確認」がオンだとここに来る
      throw new Error('サーバーの設定（メール確認）が原因でIDを設定できませんでした。管理者に連絡してください。');
    }
    const { data, error: pwError } = await client.auth.updateUser({ password });
    if (pwError) throw new Error(friendlyError(pwError));
    const { error: pErr } = await client.from('profiles').update({ login_id: loginId }).eq('id', state.user.id);
    if (pErr) console.warn('[cloud] login_id の保存に失敗:', pErr.message);
    state.user = data.user;
    state.loginId = loginId;
    setStatus('online');
    return getStatus();
  }

  // 別の端末で作った ID でログインする。この端末の進捗も合体させる。
  async function login(loginId, password) {
    if (!enabled) throw new Error('サーバーが設定されていません。');
    loginId = String(loginId || '').trim().toLowerCase();
    if (!loginId || !password) throw new Error('IDとパスワードを入力してください。');
    await flushLogs();
    const { data, error } = await client.auth.signInWithPassword({ email: toEmail(loginId), password });
    if (error) throw new Error(friendlyError(error));
    state.user = data.user;
    S.remove(K.DEVICE.RESEARCH_CONSENT); // ログイン先アカウントの同意状態を使う
    await loadProfile();
    if (!state.loginId) state.loginId = loginId;
    await pullAndMerge();
    setStatus('online');
    return getStatus();
  }

  // ログアウト: この端末の進捗を消して、新しい匿名ユーザーで始め直す
  async function logout() {
    if (!enabled) return;
    if (pushTimer) await pushNow();
    await flushLogs();
    await client.auth.signOut();
    // importProgress は通知を出さないので、空の進捗がサーバーへ送られることはない
    const empty = {};
    Object.values(K.PROGRESS).forEach((k) => { empty[k] = null; });
    S.importProgress(empty);
    S.remove(K.DEVICE.RESEARCH_CONSENT);
    S.remove(K.DEVICE.LOG_QUEUE);
    location.reload();
  }

  async function setConsent(agree) {
    S.setRaw(K.DEVICE.RESEARCH_CONSENT, agree ? 'true' : 'false');
    if (!agree) S.remove(K.DEVICE.LOG_QUEUE);
    await ready;
    await saveConsentToServer(!!agree);
    setStatus(state.status);
  }

  // ------------------------------------------------------------
  // 操作ログ（方式A: 解答提出単位）
  //   ゲーム側からは window.AppLog.xxx() を呼ぶだけ。送信は裏でまとめて行う。
  // ------------------------------------------------------------
  const SESSION_ID = (crypto.randomUUID && crypto.randomUUID()) ||
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  const MAX_QUEUE = 500;
  const stage = { id: null, startedAt: 0, attempts: 0, hints: 0 };

  function consented() { return S.getRaw(K.DEVICE.RESEARCH_CONSENT) === 'true'; }

  function enqueue(eventType, payload) {
    if (!consented()) return;
    const queue = S.getJSON(K.DEVICE.LOG_QUEUE, []);
    queue.push({
      session_id: SESSION_ID,
      event_type: eventType,
      stage_id: stage.id == null ? null : String(stage.id),
      payload: payload || {},
      client_ts: new Date().toISOString(),
      app_version: cfg.APP_VERSION || null,
    });
    S.setJSON(K.DEVICE.LOG_QUEUE, queue.slice(-MAX_QUEUE));
    scheduleFlush();
  }

  let flushTimer = null;
  let flushing = null;
  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(() => { flushTimer = null; flushLogs(); }, 5000);
  }
  function flushLogs() {
    if (!state.user || state.status !== 'online' || !consented()) return Promise.resolve();
    if (flushing) return flushing;
    const queue = S.getJSON(K.DEVICE.LOG_QUEUE, []);
    if (!queue.length) return Promise.resolve();
    const batch = queue.slice(0, 100);
    flushing = client.from('event_logs').insert(batch).then(({ error }) => {
      if (error) { console.warn('[cloud] ログ送信に失敗（次回再送）:', error.message); return; }
      const rest = S.getJSON(K.DEVICE.LOG_QUEUE, []).slice(batch.length);
      if (rest.length) S.setJSON(K.DEVICE.LOG_QUEUE, rest); else S.remove(K.DEVICE.LOG_QUEUE);
      if (rest.length) scheduleFlush();
    }).catch((e) => console.warn('[cloud] ログ送信に失敗（次回再送）:', e?.message || e))
      .finally(() => { flushing = null; });
    return flushing;
  }

  function elapsedMs() { return stage.startedAt ? Date.now() - stage.startedAt : null; }

  function snapshotBlocks() {
    try {
      if (window.workspace && window.Blockly?.serialization?.workspaces) {
        return window.Blockly.serialization.workspaces.save(window.workspace);
      }
    } catch (_) { /* スナップショット失敗はログ本体を止めない */ }
    return null;
  }

  window.AppLog = {
    // 同じステージの読み直し（リセット・もう一度）は「続き」として扱い、回数と経過時間を引き継ぐ
    stageStart(stageId) {
      const restart = stage.id != null && String(stage.id) === String(stageId);
      if (!restart) { stage.id = stageId; stage.startedAt = Date.now(); stage.attempts = 0; stage.hints = 0; }
      enqueue('stage_start', { tutorial: !!window.isTutorialStageId?.(stageId), restart, elapsed_ms: restart ? elapsedMs() : 0 });
    },
    submit(validation) {
      stage.attempts += 1;
      enqueue('submit', {
        correct: !!validation?.isValid,
        error_code: validation?.errorCode || null,
        error_step: validation?.errorStepIndex ?? null,
        attempt: stage.attempts,
        hints_used: stage.hints,
        elapsed_ms: elapsedMs(),
        blocks: snapshotBlocks(),
      });
    },
    hint(isOn) {
      if (isOn) stage.hints += 1;
      enqueue('hint', { on: !!isOn, count: stage.hints, elapsed_ms: elapsedMs() });
    },
    giveup() {
      enqueue('giveup', { attempts: stage.attempts, hints_used: stage.hints, elapsed_ms: elapsedMs(), blocks: snapshotBlocks() });
    },
    reset() {
      enqueue('reset', { attempts: stage.attempts, elapsed_ms: elapsedMs() });
    },
  };

  window.Cloud = {
    ready,
    getStatus,
    onStatusChange(fn) { if (typeof fn === 'function') statusListeners.push(fn); },
    registerLoginId,
    login,
    logout,
    setConsent,
    flushLogs,
    retry() { if (state.status === 'error') return init(); return Promise.resolve(); },
    _mergeProgress: mergeProgress, // テスト用
  };

  init();
})();
