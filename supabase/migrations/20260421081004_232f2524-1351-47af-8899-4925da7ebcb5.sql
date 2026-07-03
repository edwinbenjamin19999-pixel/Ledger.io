create or replace function public.get_company_member_profiles(
  _company_id uuid, _user_ids uuid[]
) returns table(id uuid, first_name text, last_name text, email text)
language sql stable security definer set search_path = public as $$
  select p.id, p.first_name, p.last_name, p.email
  from public.profiles p
  where p.id = any(_user_ids)
    and public.has_company_access(auth.uid(), _company_id);
$$;

grant execute on function public.get_company_member_profiles(uuid, uuid[]) to authenticated;