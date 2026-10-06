# 研究データの取り出し方

## CSV をダウンロードする
1. Supabase のプロジェクト画面で、左メニューの **SQL Editor** を開く
2. 下の SQL のどれかを貼り付けて **Run** を押す
3. 結果の右上にある **Download CSV**（または「Export」）を押す

| 欲しいもの | SQL | 1行の単位 |
|---|---|---|
| 解答提出の記録 | `select * from analysis.submissions order by participant_no, log_id;` | 「正解をチェック」1回 |
| ステージごとの結果 | `select * from analysis.stage_results order by participant_no, stage_id;` | 参加者 × ステージ |
| ステージごとの結果（登録ID付き。アンケート・紙テストとの突き合わせ用） | `select * from analysis.stage_results_by_login order by login_id, stage_id;` | 参加者 × ステージ |
| 参加者一覧 | `select * from analysis.participants order by participant_no;` | 参加者1人 |
| すべての操作 | `select * from analysis.events order by participant_no, log_id;` | 操作1回 |
| ブロックの組み方 | `select * from analysis.submission_blocks order by log_id;` | 提出・ギブアップ1回（JSON） |

- 研究への協力に同意した人のデータだけが集計されます。
- 参加者は `participant_no`（初めて記録した順の番号）で表されます。個人を特定できる情報は含まれません。
- 時刻は日本時間（`_jst`）です。

## 主な列の意味
- `attempt` … そのステージで何回目の「正解をチェック」か（リセットしても続けて数えます）
- `elapsed_sec` … ステージを開いてからの経過秒数
- `hints_used` / `hints_opened` … ヒントボタンを押した回数
- `hint_level` … 提出した時点で出していたヒントの段階（0=なし / 1=ヒント文 / 2=＋穴を光らせる / 3=＋置き換えブロックを置く）
- `max_hint_level` … そのステージで一番深く見た段階。どれだけ助けを借りて解いたかの指標になる
  （段階的ヒントを入れる前のログでは空になる）
- `error_code` … 不正解のときの理由（例: `ERROR_NO_TRANSFORM` は変形ブロックが1つもない）
- `block_count` … 提出したときに置いていたブロックの数
- `attempts_to_solve` / `sec_to_solve` … 何回目・何秒で初めて正解したか（解けていなければ空）

## テスト用のデータを分析から外す
開発中に自分で遊んだ分などは、除外リストに入れると全ビューから消えます（データ自体は残ります）。

```sql
insert into analysis.excluded_users (user_id, reason)
select id, '開発者テスト' from public.profiles where login_id = 'chisei01';
```

## 実験を始める前に（テストデータを完全に消す）
⚠️ 元に戻せません。実験開始の直前に1回だけ実行します。

```sql
-- 実験開始日より前に作られたユーザーと、そのデータをすべて削除
delete from auth.users where created_at < '2026-11-01 00:00:00+09';
```
