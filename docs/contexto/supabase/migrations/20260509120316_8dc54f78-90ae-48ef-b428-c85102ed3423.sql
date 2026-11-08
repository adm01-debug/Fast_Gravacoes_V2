-- Fix search path and restrict execution
ALTER FUNCTION public.log_technical_sheet_change() SET search_path = public

REVOKE ALL ON FUNCTION public.log_technical_sheet_change() FROM PUBLIC

GRANT EXECUTE ON FUNCTION public.log_technical_sheet_change() TO postgres, service_role
