-- ===========================================
-- CamperSites Pro - Migración 006: Anti-abuso de reportes
-- YRYS
-- Protección contra bots y votos falsos en radar_reports
-- ===========================================

-- ============================================
-- 1. UNIQUE CONSTRAINT: 1 reporte por usuario por radar cada 24h
-- Evita que un mismo usuario vote múltiples veces sobre el mismo radar
-- ============================================
ALTER TABLE radar_reports
  ADD COLUMN IF NOT EXISTS vote_date DATE DEFAULT CURRENT_DATE;

-- Índice unique: mismo user + mismo radar + mismo día = 1 solo voto
CREATE UNIQUE INDEX IF NOT EXISTS idx_radar_reports_one_per_day
  ON radar_reports (user_id, radar_id, vote_date)
  WHERE user_id IS NOT NULL;

-- ============================================
-- 2. TABLA: report_trust_scores
-- Trackea la fiabilidad de cada usuario para ponderar sus votos
-- ============================================
CREATE TABLE IF NOT EXISTS report_trust_scores (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_reports INTEGER DEFAULT 0,
  confirmed_reports INTEGER DEFAULT 0,   -- reportes confirmados por otros
  rejected_reports INTEGER DEFAULT 0,    -- reportes en minoría (posibles falsos)
  trust_multiplier NUMERIC(3,2) DEFAULT 1.0  CHECK (trust_multiplier BETWEEN 0.0 AND 2.0),
  last_report_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_trust_user
  ON report_trust_scores (user_id);

-- RLS: solo el propio usuario y admins leen su trust score
ALTER TABLE report_trust_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trust_scores_read_own"
  ON report_trust_scores FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "trust_scores_service_all"
  ON report_trust_scores FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- 3. FUNCIÓN: Registrar reporte con validaciones anti-abuso
-- Llamada desde el cliente con los datos del reporte
-- ============================================
CREATE OR REPLACE FUNCTION submit_radar_report(
  p_radar_id TEXT,
  p_still_there BOOLEAN,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_today DATE := CURRENT_DATE;
  v_recent_count INTEGER;
  v_trust NUMERIC(3,2);
  v_radar RECORD;
  v_false_report_count INTEGER;
BEGIN
  -- 1. Verificar autenticación
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'AUTH_REQUIRED');
  END IF;

  -- 2. Rate limit: máximo 20 reportes por usuario por día
  SELECT COUNT(*) INTO v_recent_count
  FROM radar_reports
  WHERE user_id = v_user_id
    AND reported_at >= NOW() - INTERVAL '24 hours';

  IF v_recent_count >= 20 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RATE_LIMIT_EXCEEDED');
  END IF;

  -- 3. Verificar que el radar existe y está activo
  SELECT id, active, verification_count INTO v_radar
  FROM radars
  WHERE id = p_radar_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'RADAR_NOT_FOUND');
  END IF;

  -- 4. Verificar que no ha votado hoy sobre este radar
  IF EXISTS (
    SELECT 1 FROM radar_reports
    WHERE user_id = v_user_id
      AND radar_id = p_radar_id
      AND vote_date = v_today
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_VOTED_TODAY');
  END IF;

  -- 5. Obtener trust multiplier del usuario (default 1.0 para nuevos)
  SELECT COALESCE(trust_multiplier, 1.0) INTO v_trust
  FROM report_trust_scores
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    v_trust := 1.0;
    -- Crear registro de trust para el usuario nuevo
    INSERT INTO report_trust_scores (user_id, total_reports, last_report_at)
    VALUES (v_user_id, 0, NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- 6. Insertar reporte
  INSERT INTO radar_reports (
    radar_id, user_id, still_there,
    latitude, longitude, vote_date, reported_at
  ) VALUES (
    p_radar_id, v_user_id, p_still_there,
    p_latitude, p_longitude, v_today, NOW()
  );

  -- 7. Actualizar contadores del usuario
  UPDATE report_trust_scores SET
    total_reports = total_reports + 1,
    last_report_at = NOW(),
    updated_at = NOW()
  WHERE user_id = v_user_id;

  -- 8. Si confirma presencia → actualizar radar
  IF p_still_there THEN
    UPDATE radars SET
      last_verified = NOW(),
      verified = TRUE,
      verification_count = COALESCE(verification_count, 0) + 1
    WHERE id = p_radar_id;
  ELSE
    -- 9. Contar reportes "no está" recientes (últimos 7 días)
    -- Ponderados por trust score
    SELECT COUNT(*) INTO v_false_report_count
    FROM radar_reports rr
    JOIN report_trust_scores rts ON rts.user_id = rr.user_id
    WHERE rr.radar_id = p_radar_id
      AND rr.still_there = FALSE
      AND rr.reported_at >= NOW() - INTERVAL '7 days';

    -- Desactivar solo si 5+ reportes negativos de usuarios distintos
    -- (más conservador que los 3 anteriores para evitar abuso)
    IF v_false_report_count >= 5 THEN
      -- Verificar que son al menos 5 usuarios distintos
      IF (
        SELECT COUNT(DISTINCT user_id)
        FROM radar_reports
        WHERE radar_id = p_radar_id
          AND still_there = FALSE
          AND reported_at >= NOW() - INTERVAL '7 days'
      ) >= 5 THEN
        UPDATE radars SET active = FALSE WHERE id = p_radar_id;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'trust', v_trust);

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_VOTED_TODAY');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- 4. FUNCIÓN: Actualizar trust scores (ejecutar periódicamente)
-- Sube trust a usuarios con muchos votos confirmados,
-- baja trust a usuarios cuyos votos fueron minoría
-- ============================================
CREATE OR REPLACE FUNCTION update_trust_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Actualizar trust_multiplier basado en ratio confirmed/total
  UPDATE report_trust_scores rts SET
    trust_multiplier = CASE
      WHEN total_reports < 5 THEN 1.0  -- Nuevos: neutral
      WHEN (confirmed_reports::NUMERIC / NULLIF(total_reports, 0)) >= 0.8 THEN 1.5  -- Muy fiable
      WHEN (confirmed_reports::NUMERIC / NULLIF(total_reports, 0)) >= 0.6 THEN 1.2  -- Fiable
      WHEN (rejected_reports::NUMERIC / NULLIF(total_reports, 0)) >= 0.5 THEN 0.3  -- Sospechoso
      WHEN (rejected_reports::NUMERIC / NULLIF(total_reports, 0)) >= 0.3 THEN 0.6  -- Poco fiable
      ELSE 1.0
    END,
    updated_at = NOW();
END;
$$;

-- ============================================
-- 5. TRIGGER: Actualizar vote_date automáticamente al insertar
-- (backup por si el cliente no lo envía)
-- ============================================
CREATE OR REPLACE FUNCTION set_vote_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.vote_date := CURRENT_DATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_radar_reports_vote_date
  BEFORE INSERT ON radar_reports
  FOR EACH ROW EXECUTE FUNCTION set_vote_date();

-- Nota: Ejecutar update_trust_scores() periódicamente via cron en Supabase
-- Dashboard → Edge Functions → Cron Jobs → update_trust_scores() cada 24h
