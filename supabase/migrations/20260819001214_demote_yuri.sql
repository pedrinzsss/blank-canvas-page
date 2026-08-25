-- Demote yurigminati@gmail.com from admin
UPDATE public.admin_collaborators SET role = 'user' WHERE email = 'yurigminati@gmail.com';
DELETE FROM public.user_roles WHERE user_id = '33eeafcf-60c8-4d18-b01e-802615b88256' AND role = 'admin';
