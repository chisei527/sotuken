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

## 加法定理（角が2つある問題）
- 角のブロックは `term_alpha` / `term_beta`（α・β）、三角関数は `term_sin_of` / `term_cos_of` / `term_tan_of`（穴に角を入れる形）。
- ツールボックスの「角 α・β」カテゴリは、加法公式（`formula_addition_sin/cos/tan`）のどれかが解放されたときだけ出る（`buildToolboxConfig`）。
- 正誤判定（math-logic.js の厳密判定）は①②③に加えて加法定理3つに対応している。
  - ①②③は「同じ角の中の関係」なので、S・C・T に値を入れるだけで判定できる。
  - 加法定理は「違う角をまたぐ関係」なので、まず `findAngleSums()` が「どの角がどの角の和か」を数値で見つけ、その関係だけを成り立たせて判定する。
  - `STRICT_FORMULA_MODES` に無い公式（④以降）は、従来のゆるい判定にフォールバックする。厳密にしたい公式を増やすときはここにモードを足す。
- 解説（`explanations.js` の `FORMULA_EXPLANATIONS`）は、解放済みの公式だけタブに出る。

## ヒント（段階制）
- ヒントは `window.hintLevel`（0〜3）の1本だけ。旧「ガイド機能」ボタンは段階3に統合した。
  - 1 … 問題ごとのヒント文（`problems/*.json` の `hints`。全ステージ3本ずつ用意してある）
  - 2 … ＋ 次に埋める穴を光らせる／【目標】を出す
  - 3 … ＋ 「置き換え」ブロックを証明の中に置く（`applyHintScaffold`）
- 文章は作業エリアの右上に浮かぶカード（`#hint-card`）に出す。`position: fixed` なので盤面がずれない。
  位置は `positionHintCard()` が `#l` と下のボタン列から計算する（ゴミ箱のぶん右端を84px空ける）。
- `goalHintActive` は「ヒントが出ているか」= `hintLevel > 0`。古いコードが見ているので残してある。
- `applyHintScaffold` は盤面を消さずに足すだけ。すでに操作ブロックを置いていたら何もしない
  （旧ガイドは盤面を作り直していたので、組みかけが消えていた）。
- ヒント文を足すときは、`公式②` のような書き方に注意。`extractRequiredFormulaIdsFromHints`
  がヒント文から公式IDを拾うので、`requiredFormulas` に無い公式を書かないこと。
- ログは `AppLog.hint(on, level)`。`submit` にも `hint_level` / `max_hint_level` が入る。
  分析用ビューの列追加は `supabase/migrations/20261006120000_hint_level_columns.sql`（公開後に適用する）。

## パルのチュートリアル
- `PAL_TUTORIAL_SCRIPTS[ステージID]` に台本があれば、そのステージに初めて入ったときに流れる。チュートリアル(`0-*`)だけでなく本編ステージでも動く（例: `'23'` で加法定理の導入）。
- 「もう見た」の記録は、チュートリアルはメモリだけ、本編は `AppStorage.KEYS.DEVICE.PAL_TUTORIAL_SEEN`（端末だけ）。
- 公式紹介の演出と重ならないよう、`window._formulaUnlockSceneActive` が立っている間は待つ。
- 台本の進行中は `CONTROLLED_BUTTON_IDS`（リセット／あきらめる／正解をチェック／ヒント）が押せない。
  押させたいステップでは `enableButtons: [...]` に書く。
- 別のステージへ移ると `loadStage` が `abortPalTutorial()` を呼んで台本を終わらせる
  （以前は「ステージ選択」からしか終わらず、ヘッダーの ← → で抜けるとボタンが押せないままだった）。

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
5. [ ] 加法定理の章（ステージ23〜26 + パルのチュートリアル）。手元のフォルダにだけ入れてある段階で、実験が終わるまで公開しない
