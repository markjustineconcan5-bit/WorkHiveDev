create table if not exists public.project_tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  status       text not null default 'todo'
               check (status in ('todo', 'in_progress', 'review', 'done')),
  priority     text not null default 'medium'
               check (priority in ('low', 'medium', 'high')),
  assignee     text,
  due_date     date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists project_tasks_status_idx on public.project_tasks (status);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists project_tasks_updated_at on public.project_tasks;
create trigger project_tasks_updated_at
before update on public.project_tasks
for each row execute function public.set_updated_at();

alter table public.project_tasks enable row level security;

drop policy if exists "signed-in users manage tasks" on public.project_tasks;
create policy "signed-in users manage tasks" on public.project_tasks
  for all to authenticated
  using (true) with check (true);

insert into public.project_tasks (title, description, status, priority)
values ('Connect website to Supabase', 'Add client and test the connection', 'in_progress', 'high');