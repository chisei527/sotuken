-- =====================================================================
-- MathBlock 初期スキーマ
--   profiles   … ユーザーごとの基本情報（引き継ぎID・研究利用の同意）
--   progress   … 進捗（端末をまたいで引き継ぐ）
--   event_logs … 解答提出などの操作ログ（研究用・同意者のみ）
--
-- セキュリティの考え方:
--   フロントに置く Publishable key は誰でも見られる。
--   だから「誰が何をできるか」は全部 DB 側の RLS（行レベルセキュリティ）で決める。
--   - 自分の profiles / progress だけ読み書きできる
--   - event_logs は「自分の分を追加する」ことしかできない（読めない・消せない）
--   - 研究利用に同意していない人のログは DB が受け付けない
-- =====================================================================

-- ---------- profiles ----------
create table public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  login_id         text unique check (login_id ~ '^[a-z0-9_]{4,20}$'),
  research_consent boolean not null default false,
  consent_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
comment on table public.profiles is 'ユーザーの基本情報。login_id は引き継ぎ用ID（未設定なら匿名のまま）';

-- 新しいユーザー（匿名含む）ができたら profiles を自動で作る
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.progress (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

-- ---------- progress ----------
create table public.progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb check (octet_length(data::text) < 50000),
  updated_at timestamptz not null default now()
);
comment on table public.progress is 'storage.js の PROGRESS キーをそのまま JSON で保存';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at を自動更新
create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger progress_touch before update on public.progress
  for each row execute function public.touch_updated_at();

-- ---------- event_logs ----------
create table public.event_logs (
  id          bigint generated always as identity primary key,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  session_id  uuid not null,                 -- 1回の起動ごとのID（同じ人の遊んだ回を区別する）
  event_type  text not null check (event_type in
                ('stage_start', 'submit', 'hint', 'giveup', 'reset', 'stage_clear')),
  stage_id    text,
  payload     jsonb not null default '{}'::jsonb check (octet_length(payload::text) < 100000),
  client_ts   timestamptz not null,          -- 端末側の時刻（所要時間の計算用）
  app_version text,
  created_at  timestamptz not null default now()
);
comment on table public.event_logs is '研究用の操作ログ（方式A: 解答提出単位）。同意者のみ記録';
create index event_logs_user_time_idx  on public.event_logs (user_id, client_ts);
create index event_logs_stage_type_idx on public.event_logs (stage_id, event_type);

-- ---------- RLS ----------
alter table public.profiles   enable row level security;
alter table public.progress   enable row level security;
alter table public.event_logs enable row level security;

create policy "自分のプロフィールを読む" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "自分のプロフィールを更新" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "自分の進捗を読む" on public.progress
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "自分の進捗を作る" on public.progress
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "自分の進捗を更新" on public.progress
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "同意者は自分のログを追加できる" on public.event_logs
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.research_consent
    )
  );
-- event_logs には select / update / delete のポリシーを作らない
-- → 利用者は読めない・消せない。分析はダッシュボード（管理者）から行う。

-- profiles の id / created_at を利用者が書き換えられないようにする
revoke update on public.profiles from anon, authenticated;
grant update (login_id, research_consent, consent_at) on public.profiles to authenticated;

-- トリガー専用の関数なので、API から直接呼べないようにする
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
