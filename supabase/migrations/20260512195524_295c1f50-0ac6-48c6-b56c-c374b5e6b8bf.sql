ALTER FUNCTION public.sync_counterparty_type_between_registries() SECURITY INVOKER;
REVOKE EXECUTE ON FUNCTION public.sync_counterparty_type_between_registries() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_counterparty_type_between_registries() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_counterparty_type_between_registries() FROM authenticated;