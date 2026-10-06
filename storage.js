// ===== storage.js =====
// 保存処理の「窓口」。アプリ内で localStorage を直接触ってよいのはこのファイルだけ。
//
// なぜ窓口を1つにするのか:
//   今は保存先が localStorage だけだが、今後サーバー (Supabase) にも進捗を送る。
//   保存処理が各ファイルに散らばっていると、送信処理を何か所にも足すことになり、
//   漏れが出る。ここを通しておけば、後でサーバー同期を足す場所はこのファイルだけで済む。
//
// キーの分類:
//   PROGRESS … 学習の進捗。端末をまたいで引き継ぐ対象（将来サーバーと同期する）
//   DEVICE   … その端末だけの見た目の好み。同期しない
//   DEBUG    … 開発・デモ用。同期しない
//
// 使い方:
//   window.AppStorage.getJSON('s', [])        // 読む（壊れていたら既定値）
//   window.AppStorage.setJSON('s', [1, 2])    // 書く
//   window.AppStorage.onProgressChange(fn)    // 進捗が変わったら fn(key, value) が呼ばれる
//
// ※ app-state.js より先に読み込むこと（index.html の並び順）。

(function () {
  const KEYS = {
    PROGRESS: {
      CLEARED: 's',                       // 自力クリアしたステージ番号の配列
      GIVEN_UP: 'gu',                     // ギブアップしたステージ番号の配列
      UNLOCKED_FORMULAS: 'unlocked_formulas',
      TUTORIAL_PROGRESS: 'tutorial_progress',
      TUTORIAL_SEEN: 'tutorial_seen',
      POPUP_SEEN_1_1: 'popup_seen_1_1',
    },
    DEVICE: {
      PAL_MINI: 'pal_mini',
      PAL_TUTORIAL_SEEN: 'pal_tutorial_seen', // パルの説明をもう見たステージIDの配列（この端末だけ）
      PROOF_SCAFFOLD_MODE: 'proof_scaffold_mode',
      RESEARCH_CONSENT: 'research_consent', // 'true' / 'false' / 未回答なら null（サーバーの profiles にも保存）
      LOG_QUEUE: 'log_queue',               // 送信待ちの操作ログ（オフライン時に貯める）
    },
    DEBUG: {
      UNLOCK_ALL: 'unlock_all',
    },
  };

  const progressKeySet = new Set(Object.values(KEYS.PROGRESS));
  const listeners = [];

  function notify(key, value) {
    if (!progressKeySet.has(key)) return;
    listeners.forEach((fn) => {
      try { fn(key, value); } catch (e) { console.error('[storage] listener error', e); }
    });
  }

  // localStorage はプライベートモードや容量超過で例外を投げることがあるので、
  // すべて try/catch で包み、失敗してもアプリは止めない。
  function getRaw(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }

  function setRaw(key, value) {
    const str = String(value);
    try { localStorage.setItem(key, str); } catch (e) { console.warn('[storage] 保存に失敗:', key, e); }
    notify(key, str);
  }

  function remove(key) {
    try { localStorage.removeItem(key); } catch (_) { /* ignore */ }
    notify(key, null);
  }

  function getJSON(key, fallback) {
    const raw = getRaw(key);
    if (raw == null) return fallback;
    try {
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }

  function setJSON(key, value) {
    setRaw(key, JSON.stringify(value));
  }

  function getBool(key) {
    return getRaw(key) === 'true';
  }

  function setBool(key, value) {
    setRaw(key, value ? 'true' : 'false');
  }

  // 進捗キーをまとめて1つのオブジェクトにする（サーバー送信用・デバッグ用）
  function exportProgress() {
    const out = {};
    Object.values(KEYS.PROGRESS).forEach((key) => { out[key] = getRaw(key); });
    return out;
  }

  // サーバーから受け取った進捗を書き戻す（引き継ぎ用）。通知は出さない。
  function importProgress(data) {
    if (!data || typeof data !== 'object') return;
    Object.values(KEYS.PROGRESS).forEach((key) => {
      if (!(key in data)) return;
      try {
        if (data[key] == null) localStorage.removeItem(key);
        else localStorage.setItem(key, String(data[key]));
      } catch (_) { /* ignore */ }
    });
  }

  window.AppStorage = {
    KEYS,
    getRaw,
    setRaw,
    remove,
    getJSON,
    setJSON,
    getBool,
    setBool,
    exportProgress,
    importProgress,
    onProgressChange(fn) { if (typeof fn === 'function') listeners.push(fn); },
  };
})();
