-- パルの「いまの式を見て」（途中チェック）を何回頼んだかを、分析用ビューに出す。
--
-- 新しい event_type は作っていない。event_logs の check 制約に引っかかると
-- ログ送信がまるごと止まってしまうため、回数は submit / giveup の payload に
-- checks_used として相乗りさせている（cloud.js の AppLog.progressCheck）。
--
-- ⚠️ 適用するのは 20261006120000_hint_level_columns.sql のあと、
--    かつ、この機能を入れたアプリを公開したあと。
--    古いアプリから送られたログには checks_used が無いので、その行は NULL になる（想定どおり）。
--
-- 使い方: supabase db push、または Supabase の SQL Editor に貼って実行する。

-- submissions: 提出までにパルへ何回「見て」と頼んだか
drop view if exists analysis.submissions;
create view analysis.submissions as
select pa.participant_no,
       b.id                                        as log_id,
       b.session_id,
       b.stage_id,
       (b.stage_id ~ '^0-')                         as is_tutorial,
       (b.payload->>'attempt')::int                 as attempt,
       (b.payload->>'correct')::boolean             as correct,
       b.payload->>'error_code'                     as error_code,
       (b.payload->>'error_step')::int              as error_step,
       (b.payload->>'hints_used')::int              as hints_used,
       (b.payload->>'hint_level')::int              as hint_level,      -- 提出時に出していた段階 (0〜3)
       (b.payload->>'max_hint_level')::int          as max_hint_level,  -- そのステージで最も深く見た段階
       (b.payload->>'checks_used')::int             as checks_used,     -- パルの「いまの式を見て」の回数
       round((b.payload->>'elapsed_ms')::numeric / 1000, 1) as elapsed_sec,
       (select count(*) from jsonb_path_query(b.payload->'blocks', 'strict $.**.type'))::int as block_count,
       b.client_ts_jst,
       b.app_version
from analysis.base_logs b
join analysis.participants pa on pa.user_id = b.user_id
where b.event_type = 'submit';

-- stage_results: そのステージで最後に記録された回数（提出・ギブアップのうち最大）
drop view if exists analysis.stage_results;
create view analysis.stage_results as
select pa.participant_no,
       b.stage_id,
       (b.stage_id ~ '^0-')                                                     as is_tutorial,
       bool_or(b.event_type = 'submit' and (b.payload->>'correct')::boolean)     as solved,
       bool_or(b.event_type = 'giveup')                                          as gave_up,
       count(*) filter (where b.event_type = 'submit')::int                      as submits,
       min((b.payload->>'attempt')::int) filter (where b.event_type = 'submit' and (b.payload->>'correct')::boolean) as attempts_to_solve,
       round(min((b.payload->>'elapsed_ms')::numeric) filter (where b.event_type = 'submit' and (b.payload->>'correct')::boolean) / 1000, 1) as sec_to_solve,
       count(*) filter (where b.event_type = 'hint' and (b.payload->>'on')::boolean)::int as hints_opened,
       max((b.payload->>'level')::int) filter (where b.event_type = 'hint')::int as max_hint_level,
       max((b.payload->>'checks_used')::int) filter (where b.event_type in ('submit', 'giveup'))::int as checks_used,
       count(*) filter (where b.event_type = 'reset')::int                       as resets,
       min(b.client_ts_jst)                                                      as first_try_jst
from analysis.base_logs b
join analysis.participants pa on pa.user_id = b.user_id
where b.stage_id is not null
group by pa.participant_no, b.stage_id;

-- ビューを作り直すと権限がリセットされるので、必ず閉じ直す。
-- analysis スキーマは Data API に公開しない（研究データなので、プレイヤーには一切見せない）。
-- 読むのはダッシュボードの SQL Editor（service_role）だけ。
revoke all on all tables in schema analysis from public, anon, authenticated;
revoke all on schema analysis from public, anon, authenticated;
