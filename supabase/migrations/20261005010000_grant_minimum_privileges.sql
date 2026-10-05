-- 新しいプロジェクトでは表の権限が自動で付かないので、必要な分だけ明示的に付ける。
-- まず全部外す（TRUNCATE は RLS を無視して表を空にできてしまうため特に危険）
revoke all on public.profiles, public.progress, public.event_logs from anon, authenticated;

-- ログインしていない(anon)人は何もできない。ログイン済み(authenticated)には最小限だけ。
grant select on public.profiles to authenticated;
grant update (login_id, research_consent, consent_at) on public.profiles to authenticated;
grant select, insert, update on public.progress to authenticated;
grant insert on public.event_logs to authenticated;
