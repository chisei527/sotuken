// ===== config.js =====
// サーバー（Supabase）の接続設定。
//
// ここに書いてよいのは「公開されても安全な値」だけ。
//   - SUPABASE_URL             … プロジェクトのURL
//   - SUPABASE_PUBLISHABLE_KEY … sb_publishable_... (旧 anon key)
// service_role / secret キーは絶対に書かないこと（DBを丸ごと操作できてしまう）。
//
// 値が空のままなら、アプリはこれまで通り「この端末だけに保存」モードで動く。

window.APP_CONFIG = {
  SUPABASE_URL: 'https://fiqutvzhrfqlqtrewiwc.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_ViVHj_tAiXWUvXT_e1P0iA_zSLJ_A2h',

  // 引き継ぎIDを Supabase のログイン用メールアドレスに変換するときのドメイン。
  // 実際にメールは送らない（Supabase 側で「メール確認」をオフにしておく）。
  LOGIN_EMAIL_DOMAIN: 'users.mathblock.app',

  // ログに残すアプリのバージョン。問題やロジックを変えたら上げると、分析時に区別できる。
  APP_VERSION: '1.0.0',
};
