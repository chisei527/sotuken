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

## 開発
- ローカル起動: `python -m http.server 8080` → http://localhost:8080
- `AUTO_RESET_ON_LOAD`（app-state.js）は本番では false。

## ロードマップ
1. [x] 保存処理を storage.js に集約
2. [ ] Supabase: 匿名ログイン + ID/パスワードでの引き継ぎ、進捗同期（profiles / progress）
3. [ ] 操作ログ（event_logs）、研究利用の同意画面、プライバシーポリシー
4. [ ] Cloudflare Pages で公開。「全開放」ボタンは本番では隠す（研究データが汚れるため）
