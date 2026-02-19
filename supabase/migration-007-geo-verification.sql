-- ===========================================
-- CamperSites Pro - Migración 007: Geo-verificación de reportes
-- YRYS
-- Solo se cuentan reportes de usuarios que estuvieron físicamente cerca del radar
-- ===========================================

-- ============================================
-- FUNCIÓN AUXILIAR: Haversine en SQL
-- Calcula distancia en metros entre dos coordenadas GPS
-- Precisión: ~0.5% — suficiente para validar proximidad
-- ============================================
CREATE OR REPLACE FUNCTION haversine_meters(
  lat1 DOUBLE PRECISION, lon1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION, lon2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION
LANGUAGE sql IMMUTABLE PARALLEL SAFE
AS $$
  SELECT 2 * 6371000 * asin(
    sqrt(
      pow(sin(radians(lat2 - lat1) / 2), 2) +
      cos(radians(lat1)) * cos(radians(lat2)) *
      pow(sin(radians(lon2 - lon1) / 2), 2)
    )
  )
$$;

-- ============================================
-- ACTUALIZAR submit_radar_report con validación de proximidad
-- Reglas de geo-verificación:
--   · "still_there: TRUE"  (confirmar presencia) → máximo 500m del radar
--   · "still_there: FALSE" (reportar ausencia)   → máximo 300m del radar
--     (pasar por el punto exacto para saber que no está)
-- Si no se envían coordenadas o el usuario está demasiado lejos:
--   · El reporte se guarda pero como "geo_unverified"
--   · No cuenta para activar/desactivar el radar
-- ============================================
ALTER TABLE radar_reports
  ADD COLUMN IF NOT EXISTS geo_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS distance_at_report DOUBLE PRECISION; -- metros

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
  v_distance DOUBLE PRECISION := NULL;
  v_geo_verified BOOLEAN := FALSE;
  v_false_report_count INTEGER;
  -- Umbrales de proximidad (metros)
  MAX_DIST_CONFIRM CONSTANT DOUBLE PRECISION := 500.0;   -- confirmar "está aquí"
  MAX_DIST_DENY    CONSTANT DOUBLE PRECISION := 300.0;   -- negar "no está"
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

  -- 3. Verificar que el radar existe (activo o no — podemos verificar radares inactivos)
  SELECT id, active, verification_count, latitude, longitude INTO v_radar
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

  -- 5. Geo-verificación: calcular distancia entre usuario y radar
  IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
    v_distance := haversine_meters(
      p_latitude, p_longitude,
      v_radar.latitude, v_radar.longitude
    );

    -- Determinar si pasa el umbral según tipo de reporte
    IF p_still_there THEN
      v_geo_verified := (v_distance <= MAX_DIST_CONFIRM);
    ELSE
      -- Para negar la presencia, exigimos estar más cerca (300m)
      v_geo_verified := (v_distance <= MAX_DIST_DENY);
    END IF;
  END IF;
  -- Si no se envían coordenadas → geo_verified = FALSE (no cuenta)

  -- 6. Obtener trust multiplier del usuario (default 1.0 para nuevos)
  SELECT COALESCE(trust_multiplier, 1.0) INTO v_trust
  FROM report_trust_scores
  WHERE user_id = v_user_id;

  IF NOT FOUND THEN
    v_trust := 1.0;
    INSERT INTO report_trust_scores (user_id, total_reports, last_report_at)
    VALUES (v_user_id, 0, NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- 7. Insertar reporte con info de geo-verificación
  INSERT INTO radar_reports (
    radar_id, user_id, still_there,
    latitude, longitude, vote_date, reported_at,
    geo_verified, distance_at_report
  ) VALUES (
    p_radar_id, v_user_id, p_still_there,
    p_latitude, p_longitude, v_today, NOW(),
    v_geo_verified, v_distance
  );

  -- 8. Actualizar contadores del usuario
  UPDATE report_trust_scores SET
    total_reports = total_reports + 1,
    last_report_at = NOW(),
    updated_at = NOW()
  WHERE user_id = v_user_id;

  -- 9. Solo actuar sobre el radar si el reporte está GEO-VERIFICADO
  IF v_geo_verified THEN
    IF p_still_there THEN
      -- Confirmar presencia: actualizar radar
      UPDATE radars SET
        last_verified = NOW(),
        verified = TRUE,
        verification_count = COALESCE(verification_count, 0) + 1
      WHERE id = p_radar_id;
    ELSE
      -- Negar presencia: contar reportes geo-verificados de distintos usuarios (7 días)
      SELECT COUNT(DISTINCT rr.user_id) INTO v_false_report_count
      FROM radar_reports rr
      WHERE rr.radar_id = p_radar_id
        AND rr.still_there = FALSE
        AND rr.geo_verified = TRUE
        AND rr.reported_at >= NOW() - INTERVAL '7 days';

      -- Necesitamos 5+ usuarios distintos que pasaron por allí y no vieron el radar
      IF v_false_report_count >= 5 THEN
        UPDATE radars SET active = FALSE WHERE id = p_radar_id;
      END IF;
    END IF;
  END IF;

  -- 10. Retornar resultado con info de geo-verificación
  RETURN jsonb_build_object(
    'ok', true,
    'geo_verified', v_geo_verified,
    'distance_m', ROUND(v_distance::NUMERIC, 1),
    'trust', v_trust
  );

EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_VOTED_TODAY');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'error', SQLERRM);
END;
$$;

-- ============================================
-- ÍNDICE para búsquedas de reportes geo-verificados
-- ============================================
CREATE INDEX IF NOT EXISTS idx_radar_reports_geo_verified
  ON radar_reports (radar_id, still_there, geo_verified, reported_at)
  WHERE geo_verified = TRUE;

-- ============================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================
COMMENT ON COLUMN radar_reports.geo_verified IS
  'TRUE si el usuario estaba a <300m (deny) o <500m (confirm) del radar al reportar';
COMMENT ON COLUMN radar_reports.distance_at_report IS
  'Distancia en metros entre el usuario y el radar en el momento del reporte';
COMMENT ON FUNCTION haversine_meters IS
  'Calcula distancia en metros entre dos puntos GPS usando fórmula de Haversine';
COMMENT ON FUNCTION submit_radar_report IS
  'RPC segura para reportar radares. Incluye: auth, rate limit, 1 voto/día, geo-verificación';
