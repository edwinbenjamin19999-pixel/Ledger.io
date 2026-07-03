
create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select coalesce(
    nullif(auth.jwt() ->> 'email', ''),
    (select email from auth.users where id = auth.uid())
  );
$$;

grant execute on function public.current_user_email() to authenticated, anon;

drop policy if exists "Users can view invitations sent to their email" on public.user_invitations;

create policy "Users can view invitations sent to their email"
on public.user_invitations
for select
to authenticated
using (lower(email) = lower(public.current_user_email()));
