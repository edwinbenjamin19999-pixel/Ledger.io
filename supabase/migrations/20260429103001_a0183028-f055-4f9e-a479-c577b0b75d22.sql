REVOKE EXECUTE ON FUNCTION public.get_bureau_client_financials(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_bureau_client_financials(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_bureau_client_financials(uuid) TO authenticated;