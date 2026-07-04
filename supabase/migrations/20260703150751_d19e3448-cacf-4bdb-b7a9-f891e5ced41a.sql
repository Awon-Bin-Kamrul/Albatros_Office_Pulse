
REVOKE EXECUTE ON FUNCTION public.simulate_devices() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_alerts() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_discord_on_alert() FROM PUBLIC, anon, authenticated;
