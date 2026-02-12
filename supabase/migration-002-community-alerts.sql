-- ===========================================
-- CamperSites Pro - MIGRACIÓN 002
-- Sistema de Alertas Comunitarias + Puntos de Reputación
-- YRYS
-- ===========================================
--
-- EJECUTAR EN: https://supabase.com/dashboard/project/cdlhipiukgjmfimhjlkl/sql/new
--

-- ============================================
-- TABLA: community_alerts (alertas de usuarios)
-- Tipos: CONTROL_POLICIAL, RADAR, ACCIDENTE,
--        PELIGRO, VEHICULO_PARADO, OBRAS, ANIMAL_VIA
-- ============================================
CREATE TABLE IF NOT EXISTS community_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Quien reporta
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reporter_trust_score INTEGER DEFAULT 0, -- snapshot del trust al crear

  -- Tipo de alerta
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'CONTROL_POLICIAL',
    'RADAR_MOVIL',
    'ACCIDENTE',
    'PELIGRO_VIA',
    'VEHICULO_PARADO',
    'OBRAS',
    'ANIMAL_VIA',
    'CONDICIONES_METEOROLOGICAS'
  )),

  -- Ubicación
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  road TEXT DEFAULT '',           -- carretera (ej: A-2)
  direction TEXT DEFAULT '',      -- dirección (ej: sentido Barcelona)

  -- Detalles
  description TEXT DEFAULT '',
  severity TEXT DEFAULT 'MEDIA' CHECK (severity IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),

  -- Estado y validación comunitaria
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'FAKE', 'CONFIRMED')),
  confirmations INTEGER DEFAULT 0,      -- usuarios que confirman
  denials INTEGER DEFAULT 0,            -- usuarios que niegan
  confidence_score NUMERIC(5,2) DEFAULT 50.0,  -- 0-100, calculado

  -- Tiempo de vida (las alertas caducan)
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 hours'),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_community_alerts_coords
  ON community_alerts (latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_community_alerts_active
  ON community_alerts (status, expires_at)
  WHERE status = 'ACTIVE';

CREATE INDEX IF NOT EXISTS idx_community_alerts_type
  ON community_alerts (alert_type);

CREATE INDEX IF NOT EXISTS idx_community_alerts_reporter
  ON community_alerts (reporter_id);

-- ============================================
-- TABLA: alert_votes (votos de confirmación/negación)
-- Cada usuario solo puede votar 1 vez por alerta
-- ============================================
CREATE TABLE IF NOT EXISTS alert_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL REFERENCES community_alerts(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  vote_type TEXT NOT NULL CHECK (vote_type IN ('CONFIRM', 'DENY')),

  -- Posición del votante al votar (para validar proximidad)
  voter_latitude DOUBLE PRECISION,
  voter_longitude DOUBLE PRECISION,
  distance_to_alert NUMERIC(10,2), -- metros al punto de la alerta

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Un usuario solo puede votar una vez por alerta
  UNIQUE(alert_id, voter_id)
);

CREATE INDEX IF NOT EXISTS idx_alert_votes_alert
  ON alert_votes (alert_id);

CREATE INDEX IF NOT EXISTS idx_alert_votes_voter
  ON alert_votes (voter_id);

-- ============================================
-- MODIFICAR: user_profiles - añadir campos de reputación
-- ============================================
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_level TEXT DEFAULT 'NOVATO'
    CHECK (trust_level IN ('NOVATO', 'EXPLORADOR', 'GUARDIAN', 'VETERANO', 'LEYENDA')),
  ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alerts_created INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alerts_confirmed INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS alerts_accuracy NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_days INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_activity TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- TABLA: point_transactions (historial de puntos)
-- Trazabilidad completa de cómo se ganan/pierden puntos
-- ============================================
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  points INTEGER NOT NULL, -- positivo = gana, negativo = pierde
  reason TEXT NOT NULL CHECK (reason IN (
    'ALERT_CREATED',         -- +10 Crear alerta
    'ALERT_CONFIRMED',       -- +15 Tu alerta fue confirmada por otro
    'ALERT_CONFIRMED_5X',    -- +25 Tu alerta fue confirmada 5 veces
    'ALERT_CONFIRMED_10X',   -- +50 Tu alerta fue confirmada 10 veces
    'VOTED_CONFIRM',         -- +3 Confirmar alerta de otro
    'VOTED_DENY',            -- +2 Negar alerta falsa
    'ALERT_MARKED_FAKE',     -- -20 Tu alerta fue marcada como falsa
    'STREAK_3_DAYS',         -- +30 Racha 3 días seguidos
    'STREAK_7_DAYS',         -- +100 Racha 7 días seguidos
    'STREAK_30_DAYS',        -- +500 Racha 30 días seguidos
    'LEVEL_UP',              -- +50 Subir de nivel
    'FIRST_ALERT',           -- +25 Primera alerta
    'RADAR_VERIFIED',        -- +5 Verificar radar existente
    'DAILY_BONUS'            -- +5 Bonus por abrir app
  )),

  -- Referencia opcional
  reference_id UUID, -- alert_id o vote_id
  reference_type TEXT, -- 'alert' o 'vote'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user
  ON point_transactions (user_id, created_at DESC);

-- ============================================
-- FUNCIÓN: Recalcular confianza de una alerta
-- Se ejecuta automáticamente al recibir votos
-- ============================================
CREATE OR REPLACE FUNCTION recalculate_alert_confidence()
RETURNS TRIGGER AS $$
DECLARE
  v_confirmations INTEGER;
  v_denials INTEGER;
  v_total INTEGER;
  v_confidence NUMERIC(5,2);
  v_new_status TEXT;
BEGIN
  -- Contar votos
  SELECT
    COUNT(*) FILTER (WHERE vote_type = 'CONFIRM'),
    COUNT(*) FILTER (WHERE vote_type = 'DENY'),
    COUNT(*)
  INTO v_confirmations, v_denials, v_total
  FROM alert_votes
  WHERE alert_id = NEW.alert_id;

  -- Calcular confianza (fórmula ponderada)
  -- Base 50 + (confirmaciones - negaciones) * factor
  IF v_total > 0 THEN
    v_confidence := LEAST(100, GREATEST(0,
      50 + ((v_confirmations - v_denials)::NUMERIC / v_total) * 50
    ));
  ELSE
    v_confidence := 50;
  END IF;

  -- Determinar estado
  IF v_denials >= 3 AND v_denials > v_confirmations * 2 THEN
    v_new_status := 'FAKE';
  ELSIF v_confirmations >= 3 THEN
    v_new_status := 'CONFIRMED';
  ELSE
    v_new_status := 'ACTIVE';
  END IF;

  -- Actualizar la alerta
  UPDATE community_alerts
  SET
    confirmations = v_confirmations,
    denials = v_denials,
    confidence_score = v_confidence,
    status = v_new_status,
    updated_at = NOW()
  WHERE id = NEW.alert_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_recalculate_confidence
  AFTER INSERT ON alert_votes
  FOR EACH ROW EXECUTE FUNCTION recalculate_alert_confidence();

-- ============================================
-- FUNCIÓN: Otorgar puntos al creador cuando su alerta es confirmada
-- ============================================
CREATE OR REPLACE FUNCTION reward_alert_creator()
RETURNS TRIGGER AS $$
DECLARE
  v_alert RECORD;
  v_confirmations INTEGER;
  v_reason TEXT;
  v_points INTEGER;
BEGIN
  -- Solo si es confirmación
  IF NEW.vote_type != 'CONFIRM' THEN
    RETURN NEW;
  END IF;

  -- Obtener datos de la alerta
  SELECT * INTO v_alert FROM community_alerts WHERE id = NEW.alert_id;

  -- No dar puntos a ti mismo
  IF v_alert.reporter_id = NEW.voter_id THEN
    RETURN NEW;
  END IF;

  -- Contar confirmaciones actuales
  SELECT COUNT(*) INTO v_confirmations
  FROM alert_votes
  WHERE alert_id = NEW.alert_id AND vote_type = 'CONFIRM';

  -- Puntos al creador según hitos
  IF v_confirmations = 1 THEN
    -- Primera confirmación: +15
    INSERT INTO point_transactions (user_id, points, reason, reference_id, reference_type)
    VALUES (v_alert.reporter_id, 15, 'ALERT_CONFIRMED', NEW.alert_id, 'alert');

    UPDATE user_profiles
    SET total_points = total_points + 15,
        trust_score = trust_score + 2,
        alerts_confirmed = alerts_confirmed + 1
    WHERE id = v_alert.reporter_id;

  ELSIF v_confirmations = 5 THEN
    -- 5 confirmaciones: +25 bonus
    INSERT INTO point_transactions (user_id, points, reason, reference_id, reference_type)
    VALUES (v_alert.reporter_id, 25, 'ALERT_CONFIRMED_5X', NEW.alert_id, 'alert');

    UPDATE user_profiles
    SET total_points = total_points + 25, trust_score = trust_score + 5
    WHERE id = v_alert.reporter_id;

  ELSIF v_confirmations = 10 THEN
    -- 10 confirmaciones: +50 bonus
    INSERT INTO point_transactions (user_id, points, reason, reference_id, reference_type)
    VALUES (v_alert.reporter_id, 50, 'ALERT_CONFIRMED_10X', NEW.alert_id, 'alert');

    UPDATE user_profiles
    SET total_points = total_points + 50, trust_score = trust_score + 10
    WHERE id = v_alert.reporter_id;
  END IF;

  -- Puntos al votante: +3 por confirmar
  INSERT INTO point_transactions (user_id, points, reason, reference_id, reference_type)
  VALUES (NEW.voter_id, 3, 'VOTED_CONFIRM', NEW.alert_id, 'vote');

  UPDATE user_profiles
  SET total_points = total_points + 3, trust_score = trust_score + 1
  WHERE id = NEW.voter_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_reward_alert_creator
  AFTER INSERT ON alert_votes
  FOR EACH ROW EXECUTE FUNCTION reward_alert_creator();

-- ============================================
-- FUNCIÓN: Penalizar alertas falsas
-- ============================================
CREATE OR REPLACE FUNCTION penalize_fake_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Si el estado cambió a FAKE
  IF NEW.status = 'FAKE' AND OLD.status != 'FAKE' THEN
    -- Restar puntos al creador
    INSERT INTO point_transactions (user_id, points, reason, reference_id, reference_type)
    VALUES (NEW.reporter_id, -20, 'ALERT_MARKED_FAKE', NEW.id, 'alert');

    UPDATE user_profiles
    SET total_points = GREATEST(0, total_points - 20),
        trust_score = GREATEST(0, trust_score - 5)
    WHERE id = NEW.reporter_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_penalize_fake
  AFTER UPDATE ON community_alerts
  FOR EACH ROW EXECUTE FUNCTION penalize_fake_alert();

-- ============================================
-- FUNCIÓN: Actualizar nivel de confianza del usuario
-- ============================================
CREATE OR REPLACE FUNCTION update_trust_level()
RETURNS TRIGGER AS $$
DECLARE
  v_level TEXT;
BEGIN
  -- Calcular nivel según trust_score
  IF NEW.trust_score >= 500 THEN
    v_level := 'LEYENDA';
  ELSIF NEW.trust_score >= 200 THEN
    v_level := 'VETERANO';
  ELSIF NEW.trust_score >= 75 THEN
    v_level := 'GUARDIAN';
  ELSIF NEW.trust_score >= 25 THEN
    v_level := 'EXPLORADOR';
  ELSE
    v_level := 'NOVATO';
  END IF;

  -- Si cambió de nivel, bonus
  IF v_level != OLD.trust_level THEN
    NEW.trust_level := v_level;

    -- Bonus por subir de nivel
    INSERT INTO point_transactions (user_id, points, reason)
    VALUES (NEW.id, 50, 'LEVEL_UP');

    NEW.total_points := NEW.total_points + 50;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_trust_level
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  WHEN (NEW.trust_score != OLD.trust_score)
  EXECUTE FUNCTION update_trust_level();

-- ============================================
-- FUNCIÓN: Dar puntos al crear alerta
-- ============================================
CREATE OR REPLACE FUNCTION reward_alert_creation()
RETURNS TRIGGER AS $$
DECLARE
  v_is_first BOOLEAN;
  v_alert_count INTEGER;
BEGIN
  -- Contar alertas previas del usuario
  SELECT COUNT(*) INTO v_alert_count
  FROM community_alerts
  WHERE reporter_id = NEW.reporter_id AND id != NEW.id;

  -- Puntos por crear alerta: +10
  INSERT INTO point_transactions (user_id, points, reason, reference_id, reference_type)
  VALUES (NEW.reporter_id, 10, 'ALERT_CREATED', NEW.id, 'alert');

  -- Si es la primera alerta: +25 bonus
  IF v_alert_count = 0 THEN
    INSERT INTO point_transactions (user_id, points, reason, reference_id, reference_type)
    VALUES (NEW.reporter_id, 25, 'FIRST_ALERT', NEW.id, 'alert');

    UPDATE user_profiles
    SET total_points = total_points + 35, -- 10 + 25
        trust_score = trust_score + 3,
        alerts_created = alerts_created + 1
    WHERE id = NEW.reporter_id;
  ELSE
    UPDATE user_profiles
    SET total_points = total_points + 10,
        trust_score = trust_score + 1,
        alerts_created = alerts_created + 1
    WHERE id = NEW.reporter_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_reward_alert_creation
  AFTER INSERT ON community_alerts
  FOR EACH ROW EXECUTE FUNCTION reward_alert_creation();

-- ============================================
-- FUNCIÓN: Expirar alertas automáticamente
-- (ejecutar con pg_cron cada 5 minutos)
-- ============================================
CREATE OR REPLACE FUNCTION expire_old_alerts()
RETURNS void AS $$
BEGIN
  UPDATE community_alerts
  SET status = 'EXPIRED', updated_at = NOW()
  WHERE status = 'ACTIVE' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY para nuevas tablas
-- ============================================

ALTER TABLE community_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;

-- COMMUNITY ALERTS: lectura publica de alertas activas
CREATE POLICY "alerts_read_active"
  ON community_alerts FOR SELECT
  USING (status IN ('ACTIVE', 'CONFIRMED'));

-- Usuarios autenticados pueden crear alertas
CREATE POLICY "alerts_insert_authenticated"
  ON community_alerts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND reporter_id = auth.uid());

-- ALERT VOTES: usuarios pueden votar
CREATE POLICY "votes_insert_authenticated"
  ON alert_votes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND voter_id = auth.uid());

-- Usuarios ven sus propios votos
CREATE POLICY "votes_read_own"
  ON alert_votes FOR SELECT
  USING (voter_id = auth.uid());

-- Lectura publica del conteo de votos (via la alerta)
CREATE POLICY "votes_read_counts"
  ON alert_votes FOR SELECT
  USING (true);

-- POINT TRANSACTIONS: usuarios ven su propio historial
CREATE POLICY "points_read_own"
  ON point_transactions FOR SELECT
  USING (user_id = auth.uid());

-- Trigger updated_at
CREATE TRIGGER trg_community_alerts_updated
  BEFORE UPDATE ON community_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
