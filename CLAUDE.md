# MathBlock（卒研アプリ）

Blockly + math.js の数式パズル。ビルド不要の素の JavaScript（index.html から defer で順に読み込む）。

## 守るルール
- 状態と関数は `window.xxx` に定義し、参照も `window.xxx` で行う（app-state.js が状態の唯一の定義元）。
- **localStorage を直接触らない**。必ず `window.AppStorage`（storage.js）を通す。
  - 進捗キー（`AppStorage.KEYS.PROGRESS`）は今後サーバー同期の対象。新しい進捗を保存するときはここにキーを追加する。
  - 端末だけの好みは `KEYS.DEVICE`、開発用は `KEYS.DEBUG`。
- 新しい .js を足したら index.html の読み込み順を確認する（storage.js → app-state.js が先頭）。
- 問題を追加したら `problems/index.json`（mainStageTotal）を更新する。
- APIキーなどの秘密情報はコードに書かない。Supabase の service_role キーはフロントに絶対に置かない。

## サーバー（Supabase）
- 設定は `config.js`（URL と Publishable key だけ。secret / service_role キーは絶対に置かない）。空ならオフラインで動く。
- `cloud.js` … 匿名ログイン、ID+パスワードでの引き継ぎ（ID は `{id}@LOGIN_EMAIL_DOMAIN` のメールとして Supabase Auth に登録）、進捗の同期（和集合でマージ）、操作ログの送信。
- `account-ui.js` … アカウント画面と研究協力の同意画面。
- ログを足すときはゲーム側から `window.AppLog.xxx()` を呼ぶ。event_type を増やしたら DB の check 制約も更新する。
- DB の変更は `supabase/migrations/` に SQL を追加してから適用する。すべての表で RLS を有効にする。
- 新しい表は権限が自動で付かない。必要な GRANT を migration に明記する（anon には何も付けない）。
- 分析用ビューは `analysis` スキーマ（Data API に公開しない）。
- Supabase の Auth 設定: Anonymous sign-ins オン / Manual linking オン / Confirm email オフ。

## ブロックの型（blocks.js）
- 式のブロック（数・項・+・−・×・分数・2乗）は `setOutput(true, TYPE_EXPR)`、公式ブロックは `TYPE_FORMULA`。
- 「公式」の穴は `setCheck(TYPE_FORMULA)`、式を入れる穴は `setCheck(TYPE_EXPR)`。穴に入れ間違えられないようにするため。
- 「公式」の穴には `formula_placeholder`（紫の見本 = shadow ブロック）が入っている。
  shadow は保存時 `inputs.FORMULA.shadow` に入るので、`readInputBlock`（math-logic.js）は拾わない＝未入力として判定される。
  穴が埋まっているかを見るときは `window.getFilledInputBlock()`（app-guide.js）を使う（`getInputTargetBlock` は見本も拾ってしまう）。
- Blockly の画像（ゴミ箱など）は `asset/blockly-media/` に同梱し、`Blockly.inject` の `media` で指定する。外部サイトを参照させない。

## 開発
- ローカル起動: `python -m http.server 8080` → http://localhost:8080
- `AUTO_RESET_ON_LOAD`（app-state.js）は本番では false。
- `window.IS_DEV`（config.js）は localhost のときだけ true。開発用機能（全問題を開放など）は IS_DEV のときだけ動かす。

## 公開（Cloudflare Pages）
- GitHub の main にマージすると自動で公開される（ビルドなし、出力ディレクトリはリポジトリのルート）。
- `_headers` でセキュリティ用の HTTP ヘッダーを設定。
- ボット対策: Cloudflare Turnstile。config.js の TURNSTILE_SITE_KEY を入れて公開 → その後 Supabase の Auth で CAPTCHA を有効化（順番を逆にするとログインが全部失敗する）。

## ロードマップ
1. [x] 保存処理を storage.js に集約
2. [x] Supabase: 匿名ログイン + ID/パスワードでの引き継ぎ、進捗同期（profiles / progress）
3. [x] 操作ログ（event_logs、方式A: 解答提出単位）、研究利用の同意画面
3b. [x] ログの CSV 書き出し（analysis スキーマのビュー。手順は docs/analysis.md）
3c. [ ] プライバシーポリシー（privacy.html は下書き）
4. [x] Cloudflare Pages で公開（https://sotuken1.pages.dev）。「全開放」ボタンは本番では隠す（研究データが汚れるため）。匿名ログインの乱用対策に Cloudflare Turnstile（CAPTCHA）を入れる
