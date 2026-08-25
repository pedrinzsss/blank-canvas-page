-- Promote isaquehotmart244@gmail.com to admin
insert into public.user_roles (user_id, role) 
values ('f68bf22f-1348-4c2e-aac5-6f5633be490a', 'admin') 
on conflict (user_id, role) do nothing;

-- Update collaborator password if it exists
update public.admin_collaborators 
set password = 'Sucesso2026!2901' 
where email = 'isaquehotmart244@gmail.com';