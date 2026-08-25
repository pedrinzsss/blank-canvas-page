create table public.admin_collaborators (
    id uuid primary key default gen_random_uuid(),
    email text unique not null,
    password text not null,
    created_at timestamp with time zone default now()
);

grant select, insert, update, delete on public.admin_collaborators to authenticated;
grant all on public.admin_collaborators to service_role;

alter table public.admin_collaborators enable row level security;

create policy "Admins can manage collaborators"
on public.admin_collaborators
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'));