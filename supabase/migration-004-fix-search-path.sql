-- ===========================================
-- CamperSites Pro - MIGRACIÓN 004
-- Fix: Function Search Path Mutable warnings
-- YRYS
-- ===========================================
--
-- EJECUTAR EN: https://supabase.com/dashboard/project/cdlhipiukgjmfimhjlkl/sql/new
--
-- Esto fija el search_path de todas las funciones para eliminar
-- los 8 warnings de seguridad "Function Search Path Mutable"
--

ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.recalculate_alert_confidence() SET search_path = public;
ALTER FUNCTION public.reward_alert_creator() SET search_path = public;
ALTER FUNCTION public.penalize_fake_alert() SET search_path = public;
ALTER FUNCTION public.update_trust_level() SET search_path = public;
ALTER FUNCTION public.reward_alert_creation() SET search_path = public;
ALTER FUNCTION public.expire_old_alerts() SET search_path = public;
