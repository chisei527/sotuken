-- =====================================================================
-- 分析用ビュー（analysis スキーマ）
--   アプリ（Data API）からは見えない場所に置く。Supabase の SQL Editor から
--   `select * from analysis.xxx;` を実行し、結果を「Download CSV」で取り出す。
--
--   analysis.excluded_users … テストに使ったアカウントなど、分析から除く人
--   analysis.participants   … 参加者1人につき1行（同意者のみ）
--   analysis.submissions    … 「正解をチェック」1回につき1行
--   analysis.stage_results  … 参加者 × ステージにつき1行（何回目で解けたか等）
--   analysis.events         … すべての操作ログ（ブロック構成は除く）
--   analysis.submission_blocks … 提出時のブロック構成（JSON）。重いので別ビュー
--
--   参加者は user_id ではなく participant_no（初めて記録した順の番号）で表す。
-- =====================================================================
create schema if not exists analysis;
revoke all on schema analysis from public, anon, authenticated;

create table analysis.excluded_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  reason  text,
  added_at timestamptz not null default now()
);
comment on table analysis.excluded_users is '分析から除くユーザー（開発者のテスト用アカウントなど）';

-- 分析対象のログ（同意者 かつ 除外リストに入っていない人）
create view analysis.base_logs as
select e.*,
       (e.client_ts at time zone 'Asia/Tokyo') as client_ts_jst
from public.event_logs e
join public.profiles p on p.id = e.user_id and p.research_consent
where not exists (select 1 from analysis.excluded_users x where x.user_id = e.user_id);

create view analysis.participants as
with first_seen as (
  select user_id, min(client_ts) as first_ts from analysis.base_logs group by user_id
)
select row_number() over (order by f.first_ts)::int        as participant_no,
       f.user_id,
       (p.login_id is not null)                             as has_login_id,
       (p.consent_at at time zone 'Asia/Tokyo')             as consent_at_jst,
       (f.first_ts at time zone 'Asia/Tokyo')               as first_seen_jst,
       (select max(client_ts) from analysis.base_logs b where b.user_id = f.user_id) at time zone 'Asia/Tokyo' as last_seen_jst,
       (select count(distinct session_id) from analysis.base_logs b where b.user_id = f.user_id) as sessions,
       (select count(*) from analysis.base_logs b where b.user_id = f.user_id and b.event_type = 'submit') as submits,
       (select count(distinct stage_id) from analysis.base_logs b
          where b.user_id = f.user_id and b.event_type = 'submit' and (b.payload->>'correct')::boolean) as stages_solved
from first_seen f
join public.profiles p on p.id = f.user_id;

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
       round((b.payload->>'elapsed_ms')::numeric / 1000, 1) as elapsed_sec,
       (select count(*) from jsonb_path_query(b.payload->'blocks', 'strict $.**.type'))::int as block_count,
       b.client_ts_jst,
       b.app_version
from analysis.base_logs b
join analysis.participants pa on pa.user_id = b.user_id
where b.event_type = 'submit';

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
       count(*) filter (where b.event_type = 'reset')::int                       as resets,
       min(b.client_ts_jst)                                                      as first_try_jst
from analysis.base_logs b
join analysis.participants pa on pa.user_id = b.user_id
where b.stage_id is not null
group by pa.participant_no, b.stage_id;

create view analysis.events as
select pa.participant_no, b.id as log_id, b.session_id, b.event_type, b.stage_id,
       b.payload - 'blocks' as payload, b.client_ts_jst, b.app_version
from analysis.base_logs b
join analysis.participants pa on pa.user_id = b.user_id;

create view analysis.submission_blocks as
select pa.participant_no, b.id as log_id, b.stage_id,
       (b.payload->>'attempt')::int as attempt, (b.payload->>'correct')::boolean as correct,
       b.payload->'blocks' as blocks_json
from analysis.base_logs b
join analysis.participants pa on pa.user_id = b.user_id
where b.event_type in ('submit', 'giveup');

revoke all on all tables in schema analysis from public, anon, authenticated;

-- 実験開始前のテストデータ削除用（必要なときに SQL Editor で実行する。ここでは実行しない）
--   delete from auth.users where is_anonymous and created_at < '2026-11-01';   -- 匿名のテストユーザー
--   insert into analysis.excluded_users (user_id, reason)
--     select id, '開発者テスト' from public.profiles where login_id = 'chisei01';
