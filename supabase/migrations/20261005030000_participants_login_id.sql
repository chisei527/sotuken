-- アンケート・紙テストと突き合わせるため、参加者が登録した ID（p001 など）を出す
create or replace view analysis.participants as
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
          where b.user_id = f.user_id and b.event_type = 'submit' and (b.payload->>'correct')::boolean) as stages_solved,
       p.login_id
from first_seen f
join public.profiles p on p.id = f.user_id;

create or replace view analysis.stage_results_by_login as
select pa.login_id, r.*
from analysis.stage_results r
join analysis.participants pa on pa.participant_no = r.participant_no;

revoke all on all tables in schema analysis from public, anon, authenticated;
