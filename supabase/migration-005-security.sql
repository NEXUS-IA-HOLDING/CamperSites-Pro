-- ===========================================
-- CamperSites Pro - MIGRACIÓN 005
-- SISTEMA DE SEGURIDAD COMPLETO
-- YRYS
-- ===========================================
--
-- EJECUTAR EN: https://supabase.com/dashboard/project/cdlhipiukgjmfimhjlkl/sql/new
--
-- NOTA: Esta migración NO contiene ningún DROP.
-- Solo crea tablas nuevas y añade policies de seguridad.
--

-- ===================================================
-- 1. RATE LIMITING - Anti-DDoS / Anti-spam
-- ===================================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action
  ON rate_limits (user_id, action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_action
  ON rate_limits (ip_address, action, created_at DESC);

CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM rate_limits WHERE created_at < NOW() - INTERVAL '24 hours';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Crear trigger solo si no existe
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_cleanup_rate_limits') THEN
    CREATE TRIGGER trg_cleanup_rate_limits
      AFTER INSERT ON rate_limits
      FOR EACH STATEMENT
      EXECUTE FUNCTION cleanup_old_rate_limits();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_user_id UUID,
  p_action TEXT,
  p_max_per_minute INT DEFAULT 10,
  p_max_per_hour INT DEFAULT 100
)
RETURNS BOOLEAN AS $$
DECLARE
  count_minute INT;
  count_hour INT;
BEGIN
  SELECT COUNT(*) INTO count_minute
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at > NOW() - INTERVAL '1 minute';

  IF count_minute >= p_max_per_minute THEN
    RETURN FALSE;
  END IF;

  SELECT COUNT(*) INTO count_hour
  FROM rate_limits
  WHERE user_id = p_user_id
    AND action = p_action
    AND created_at > NOW() - INTERVAL '1 hour';

  IF count_hour >= p_max_per_hour THEN
    RETURN FALSE;
  END IF;

  INSERT INTO rate_limits (user_id, action)
  VALUES (p_user_id, p_action);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ===================================================
-- 2. ANTI-BRUTE-FORCE LOGIN
-- ===================================================

CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address INET,
  success BOOLEAN DEFAULT FALSE,
  attempted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email
  ON login_attempts (email, attempted_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip
  ON login_attempts (ip_address, attempted_at DESC);

CREATE OR REPLACE FUNCTION is_login_blocked(
  p_email TEXT,
  p_max_attempts INT DEFAULT 5,
  p_lockout_minutes INT DEFAULT 15
)
RETURNS BOOLEAN AS $$
DECLARE
  failed_count INT;
BEGIN
  SELECT COUNT(*) INTO failed_count
  FROM login_attempts
  WHERE email = p_email
    AND success = FALSE
    AND attempted_at > NOW() - (p_lockout_minutes || ' minutes')::INTERVAL;

  RETURN failed_count >= p_max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ===================================================
-- 3. SESSION SECURITY - Anti-session-spoofing
-- ===================================================

CREATE TABLE IF NOT EXISTS active_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active TIMESTAMPTZ DEFAULT NOW(),
  is_valid BOOLEAN DEFAULT TRUE,
  UNIQUE(user_id, device_fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user
  ON active_sessions (user_id, is_valid);

CREATE OR REPLACE FUNCTION check_session_anomaly()
RETURNS TRIGGER AS $$
DECLARE
  recent_ips INT;
BEGIN
  SELECT COUNT(DISTINCT ip_address) INTO recent_ips
  FROM active_sessions
  WHERE user_id = NEW.user_id
    AND is_valid = TRUE
    AND last_active > NOW() - INTERVAL '5 minutes';

  IF recent_ips > 3 THEN
    UPDATE active_sessions
    SET is_valid = FALSE
    WHERE user_id = NEW.user_id
      AND id != NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_check_session_anomaly') THEN
    CREATE TRIGGER trg_check_session_anomaly
      AFTER INSERT OR UPDATE ON active_sessions
      FOR EACH ROW
      EXECUTE FUNCTION check_session_anomaly();
  END IF;
END $$;


-- ===================================================
-- 4. ANTI-CHEAT SYSTEM (Alertas comunitarias)
-- ===================================================

CREATE TABLE IF NOT EXISTS user_security (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_banned BOOLEAN DEFAULT FALSE,
  ban_reason TEXT,
  banned_at TIMESTAMPTZ,
  suspicious_score INT DEFAULT 0,
  total_fake_alerts INT DEFAULT 0,
  total_spam_reports INT DEFAULT 0,
  last_suspicious_activity TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION detect_alert_abuse()
RETURNS TRIGGER AS $$
DECLARE
  alerts_last_hour INT;
  fake_ratio FLOAT;
  v_suspicious INT;
BEGIN
  SELECT COUNT(*) INTO alerts_last_hour
  FROM community_alerts
  WHERE reporter_id = NEW.reporter_id
    AND created_at > NOW() - INTERVAL '1 hour';

  IF alerts_last_hour > 20 THEN
    INSERT INTO user_security (user_id, suspicious_score, total_spam_reports, last_suspicious_activity)
    VALUES (NEW.reporter_id, 50, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      suspicious_score = LEAST(user_security.suspicious_score + 20, 100),
      total_spam_reports = user_security.total_spam_reports + 1,
      last_suspicious_activity = NOW();
  END IF;

  SELECT
    CASE WHEN COUNT(*) > 5 THEN
      COUNT(*) FILTER (WHERE status = 'denied')::FLOAT / COUNT(*)::FLOAT
    ELSE 0 END
  INTO fake_ratio
  FROM community_alerts
  WHERE reporter_id = NEW.reporter_id;

  IF fake_ratio > 0.6 THEN
    INSERT INTO user_security (user_id, suspicious_score, total_fake_alerts, last_suspicious_activity)
    VALUES (NEW.reporter_id, 40, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      suspicious_score = LEAST(user_security.suspicious_score + 15, 100),
      total_fake_alerts = user_security.total_fake_alerts + 1,
      last_suspicious_activity = NOW();
  END IF;

  SELECT suspicious_score INTO v_suspicious
  FROM user_security
  WHERE user_id = NEW.reporter_id;

  IF v_suspicious >= 80 THEN
    UPDATE user_security
    SET is_banned = TRUE,
        ban_reason = 'Auto-ban: suspicious score >= 80',
        banned_at = NOW()
    WHERE user_id = NEW.reporter_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_detect_alert_abuse') THEN
    CREATE TRIGGER trg_detect_alert_abuse
      AFTER INSERT ON community_alerts
      FOR EACH ROW
      EXECUTE FUNCTION detect_alert_abuse();
  END IF;
END $$;


-- ===================================================
-- 5. ROW LEVEL SECURITY (RLS) - Tablas nuevas
-- ===================================================

ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_security ENABLE ROW LEVEL SECURITY;

-- Crear policies solo si no existen (usando DO blocks)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'rate_limits_service_only' AND tablename = 'rate_limits') THEN
    CREATE POLICY "rate_limits_service_only" ON rate_limits FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'login_attempts_service_only' AND tablename = 'login_attempts') THEN
    CREATE POLICY "login_attempts_service_only" ON login_attempts FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sessions_own_read' AND tablename = 'active_sessions') THEN
    CREATE POLICY "sessions_own_read" ON active_sessions FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sessions_service_write' AND tablename = 'active_sessions') THEN
    CREATE POLICY "sessions_service_write" ON active_sessions FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'security_own_read' AND tablename = 'user_security') THEN
    CREATE POLICY "security_own_read" ON user_security FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'security_service_write' AND tablename = 'user_security') THEN
    CREATE POLICY "security_service_write" ON user_security FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;


-- ===================================================
-- 6. POLICIES ADICIONALES para tablas existentes
--    (Solo añade las que no existen, NO borra nada)
-- ===================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'locations_service_insert' AND tablename = 'locations') THEN
    CREATE POLICY "locations_service_insert" ON locations FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'locations_service_update' AND tablename = 'locations') THEN
    CREATE POLICY "locations_service_update" ON locations FOR UPDATE USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'radars_service_write' AND tablename = 'radars') THEN
    CREATE POLICY "radars_service_write" ON radars FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'alerts_auth_insert_secure' AND tablename = 'community_alerts') THEN
    CREATE POLICY "alerts_auth_insert_secure" ON community_alerts
      FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM user_security
          WHERE user_id = auth.uid() AND is_banned = TRUE
        )
      );
  END IF;
END $$;


-- ===================================================
-- 7. AUDIT LOG
-- ===================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user
  ON audit_log (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON audit_log (action, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'audit_service_only' AND tablename = 'audit_log') THEN
    CREATE POLICY "audit_service_only" ON audit_log FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;
