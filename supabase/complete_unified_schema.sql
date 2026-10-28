-- =====================================================
-- CAMPER-SITES-PRO UNIFIED SCHEMA AND MIGRATIONS
-- Ready to execute in Supabase SQL Editor
-- =====================================================


-- >>> START: supabase/schema.sql <<<
-- ===========================================
-- CamperSites Pro - Schema de Base de Datos
-- YRYS - Supabase PostgreSQL
-- ===========================================

-- ============================================
-- TABLA: locations (campings, parkings, areas)
-- ============================================
CREATE TABLE IF NOT EXISTS locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'CAMPING', 'PARKING_PERMITIDO', 'AREA_DESCANSO', 'AREA_SERVICIOS'
  )),
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  province TEXT DEFAULT '',
  has_water BOOLEAN DEFAULT FALSE,
  has_electricity BOOLEAN DEFAULT FALSE,
  capacity INTEGER,
  price NUMERIC(10,2),
  description TEXT DEFAULT '',
  website TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  source TEXT DEFAULT 'osm', -- osm, manual, user
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indice espacial para busquedas por proximidad
CREATE INDEX IF NOT EXISTS idx_locations_coords
  ON locations (latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_locations_category
  ON locations (category);

-- ============================================
-- TABLA: radars (radares y controles)
-- ============================================
CREATE TABLE IF NOT EXISTS radars (
  id TEXT PRIMARY KEY,
  code TEXT,
  type TEXT NOT NULL CHECK (type IN ('RADAR', 'CONTROL', 'FIJO', 'MOVIL', 'TRAMO')),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  speed_limit INTEGER,
  road TEXT DEFAULT '',
  km TEXT DEFAULT '',
  direction TEXT DEFAULT '',
  province TEXT DEFAULT '',
  source TEXT DEFAULT 'dgt',
  verified BOOLEAN DEFAULT FALSE,
  last_verified TIMESTAMPTZ,
  verification_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_radars_coords
  ON radars (latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_radars_active
  ON radars (active) WHERE active = TRUE;

-- ============================================
-- TABLA: radar_reports (verificaciones crowdsourced)
-- ============================================
CREATE TABLE IF NOT EXISTS radar_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  radar_id TEXT NOT NULL REFERENCES radars(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  still_there BOOLEAN NOT NULL,
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  latitude DOUBLE PRECISION, -- posicion del usuario al reportar
  longitude DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_radar_reports_radar
  ON radar_reports (radar_id);

CREATE INDEX IF NOT EXISTS idx_radar_reports_user
  ON radar_reports (user_id);

-- ============================================
-- TABLA: user_profiles (datos extendidos de usuario)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT DEFAULT '',
  is_premium BOOLEAN DEFAULT FALSE,
  premium_until TIMESTAMPTZ,
  km_driven NUMERIC(12,2) DEFAULT 0,
  locations_visited INTEGER DEFAULT 0,
  radars_reported INTEGER DEFAULT 0,
  favorite_locations TEXT[] DEFAULT '{}',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABLA: saved_routes (rutas guardadas)
-- ============================================
CREATE TABLE IF NOT EXISTS saved_routes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lng DOUBLE PRECISION NOT NULL,
  destination_lat DOUBLE PRECISION NOT NULL,
  destination_lng DOUBLE PRECISION NOT NULL,
  waypoints JSONB DEFAULT '[]',
  distance NUMERIC(12,2),
  duration INTEGER, -- segundos
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_routes_user
  ON saved_routes (user_id);

-- ============================================
-- FUNCION: actualizar updated_at automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_locations_updated ON locations;
CREATE TRIGGER trg_locations_updated
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_radars_updated ON radars;
CREATE TRIGGER trg_radars_updated
  BEFORE UPDATE ON radars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_user_profiles_updated ON user_profiles;
CREATE TRIGGER trg_user_profiles_updated
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Politicas de acceso a datos
-- ============================================

-- Activar RLS en todas las tablas
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE radars ENABLE ROW LEVEL SECURITY;
ALTER TABLE radar_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_routes ENABLE ROW LEVEL SECURITY;

-- ---- LOCATIONS ----
-- Lectura publica (todos pueden ver campings/parkings)
DROP POLICY IF EXISTS "locations_read_public" ON locations;
CREATE POLICY "locations_read_public"
  ON locations FOR SELECT
  USING (true);

-- Solo admins pueden insertar/actualizar/eliminar
DROP POLICY IF EXISTS "locations_admin_insert" ON locations;
CREATE POLICY "locations_admin_insert"
  ON locations FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );

DROP POLICY IF EXISTS "locations_admin_update" ON locations;
CREATE POLICY "locations_admin_update"
  ON locations FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

DROP POLICY IF EXISTS "locations_admin_delete" ON locations;
CREATE POLICY "locations_admin_delete"
  ON locations FOR DELETE
  USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- ---- RADARS ----
-- Lectura publica (todos pueden ver radares activos)
DROP POLICY IF EXISTS "radars_read_public" ON radars;
CREATE POLICY "radars_read_public"
  ON radars FOR SELECT
  USING (active = TRUE);

-- Solo admins/service pueden modificar radares
DROP POLICY IF EXISTS "radars_admin_write" ON radars;
CREATE POLICY "radars_admin_write"
  ON radars FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- ---- RADAR REPORTS ----
-- Usuarios autenticados pueden crear reportes
DROP POLICY IF EXISTS "radar_reports_insert_authenticated" ON radar_reports;
CREATE POLICY "radar_reports_insert_authenticated"
  ON radar_reports FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Usuarios solo ven sus propios reportes
DROP POLICY IF EXISTS "radar_reports_read_own" ON radar_reports;
CREATE POLICY "radar_reports_read_own"
  ON radar_reports FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- ---- USER PROFILES ----
-- Cada usuario solo ve y edita su propio perfil
DROP POLICY IF EXISTS "user_profiles_read_own" ON user_profiles;
CREATE POLICY "user_profiles_read_own"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "user_profiles_update_own" ON user_profiles;
CREATE POLICY "user_profiles_update_own"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Auto-crear perfil al registrarse
DROP POLICY IF EXISTS "user_profiles_insert_own" ON user_profiles;
CREATE POLICY "user_profiles_insert_own"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ---- SAVED ROUTES ----
-- Cada usuario solo ve y gestiona sus propias rutas
DROP POLICY IF EXISTS "saved_routes_read_own" ON saved_routes;
CREATE POLICY "saved_routes_read_own"
  ON saved_routes FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "saved_routes_insert_own" ON saved_routes;
CREATE POLICY "saved_routes_insert_own"
  ON saved_routes FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "saved_routes_delete_own" ON saved_routes;
CREATE POLICY "saved_routes_delete_own"
  ON saved_routes FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- FUNCION: crear perfil automaticamente al registrarse
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- >>> END: supabase/schema.sql <<<


-- >>> START: supabase/migration-002-community-alerts.sql <<<
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

DROP TRIGGER IF EXISTS trg_recalculate_confidence ON alert_votes;
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

DROP TRIGGER IF EXISTS trg_reward_alert_creator ON alert_votes;
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

DROP TRIGGER IF EXISTS trg_penalize_fake ON community_alerts;
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

DROP TRIGGER IF EXISTS trg_update_trust_level ON user_profiles;
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

DROP TRIGGER IF EXISTS trg_reward_alert_creation ON community_alerts;
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
DROP POLICY IF EXISTS "alerts_read_active" ON community_alerts;
CREATE POLICY "alerts_read_active"
  ON community_alerts FOR SELECT
  USING (status IN ('ACTIVE', 'CONFIRMED'));

-- Usuarios autenticados pueden crear alertas
DROP POLICY IF EXISTS "alerts_insert_authenticated" ON community_alerts;
CREATE POLICY "alerts_insert_authenticated"
  ON community_alerts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND reporter_id = auth.uid());

-- ALERT VOTES: usuarios pueden votar
DROP POLICY IF EXISTS "votes_insert_authenticated" ON alert_votes;
CREATE POLICY "votes_insert_authenticated"
  ON alert_votes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND voter_id = auth.uid());

-- Usuarios ven sus propios votos
DROP POLICY IF EXISTS "votes_read_own" ON alert_votes;
CREATE POLICY "votes_read_own"
  ON alert_votes FOR SELECT
  USING (voter_id = auth.uid());

-- Lectura publica del conteo de votos (via la alerta)
DROP POLICY IF EXISTS "votes_read_counts" ON alert_votes;
CREATE POLICY "votes_read_counts"
  ON alert_votes FOR SELECT
  USING (true);

-- POINT TRANSACTIONS: usuarios ven su propio historial
DROP POLICY IF EXISTS "points_read_own" ON point_transactions;
CREATE POLICY "points_read_own"
  ON point_transactions FOR SELECT
  USING (user_id = auth.uid());

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_community_alerts_updated ON community_alerts;
CREATE TRIGGER trg_community_alerts_updated
  BEFORE UPDATE ON community_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- >>> END: supabase/migration-002-community-alerts.sql <<<


-- >>> START: supabase/migration-003-expanded-categories.sql <<<
-- ===========================================
-- CamperSites Pro - MIGRACIÓN 003
-- Categorías expandidas para toda Europa
-- YRYS
-- ===========================================
--
-- EJECUTAR EN: https://supabase.com/dashboard/project/cdlhipiukgjmfimhjlkl/sql/new
--

-- Eliminar el CHECK constraint anterior y poner uno ampliado
ALTER TABLE locations DROP CONSTRAINT IF EXISTS locations_category_check;

ALTER TABLE locations ADD CONSTRAINT locations_category_check
  CHECK (category IN (
    -- === ALOJAMIENTO / PERNOCTA ===
    'CAMPING',              -- Campings
    'PARKING_PERMITIDO',    -- Parkings permitidos para pernocta
    'AREA_DESCANSO',        -- Áreas de descanso en carretera
    'AREA_SERVICIOS',       -- Áreas de servicios para campers
    'PERNOCTA_LIBRE',       -- Zonas de pernocta libre / wild camping

    -- === SERVICIOS CAMPER ===
    'VACIADO_AGUAS',        -- Puntos de vaciado aguas grises/negras
    'LLENADO_AGUA',         -- Puntos de llenado agua potable
    'LAVADERO_CAMPER',      -- Lavaderos de autocaravanas
    'LAVADERO_COCHES',      -- Lavaderos de coches
    'TALLER_MECANICO',      -- Talleres mecánicos
    'GASOLINERA_GLP',       -- Gasolineras con GLP/autogas

    -- === ALIMENTACIÓN ===
    'SUPERMERCADO',         -- Supermercados
    'RESTAURANTE',          -- Restaurantes
    'BAR_CAFETERIA',        -- Bares y cafeterías
    'MERCADO_LOCAL',        -- Mercados locales / farmers market

    -- === NATURALEZA / VISTAS ===
    'MIRADOR',              -- Miradores con vistas
    'PLAYA',                -- Playas
    'ACANTILADO',           -- Acantilados y costas
    'MONTANA',              -- Montañas y cumbres
    'LAGO',                 -- Lagos y embalses
    'CASCADA',              -- Cascadas
    'BOSQUE',               -- Bosques y parques naturales
    'PARQUE_NACIONAL',      -- Parques nacionales

    -- === OCIO / CULTURA ===
    'MONUMENTO',            -- Monumentos y patrimonio
    'PUEBLO_BONITO',        -- Pueblos con encanto
    'TERMAS',               -- Aguas termales y balnearios

    -- === SERVICIOS BÁSICOS ===
    'HOSPITAL',             -- Hospitales
    'FARMACIA',             -- Farmacias
    'WIFI_GRATIS',          -- Puntos de WiFi gratuito
    'LAVANDERIA'            -- Lavanderías autoservicio
  ));

-- Añadir campo country para filtrar por país
ALTER TABLE locations ADD COLUMN IF NOT EXISTS country TEXT DEFAULT '';

-- Índice por país para filtros rápidos
CREATE INDEX IF NOT EXISTS idx_locations_country
  ON locations (country);

-- >>> END: supabase/migration-003-expanded-categories.sql <<<


-- >>> START: supabase/migration-004-fix-search-path.sql <<<
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

-- >>> END: supabase/migration-004-fix-search-path.sql <<<


-- >>> START: supabase/migration-005-security.sql <<<
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
    DROP TRIGGER IF EXISTS trg_cleanup_rate_limits ON rate_limits;
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
    DROP TRIGGER IF EXISTS trg_check_session_anomaly ON active_sessions;
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
    DROP TRIGGER IF EXISTS trg_detect_alert_abuse ON community_alerts;
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
    DROP POLICY IF EXISTS "rate_limits_service_only" ON rate_limits;
CREATE POLICY "rate_limits_service_only" ON rate_limits FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'login_attempts_service_only' AND tablename = 'login_attempts') THEN
    DROP POLICY IF EXISTS "login_attempts_service_only" ON login_attempts;
CREATE POLICY "login_attempts_service_only" ON login_attempts FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sessions_own_read' AND tablename = 'active_sessions') THEN
    DROP POLICY IF EXISTS "sessions_own_read" ON active_sessions;
CREATE POLICY "sessions_own_read" ON active_sessions FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'sessions_service_write' AND tablename = 'active_sessions') THEN
    DROP POLICY IF EXISTS "sessions_service_write" ON active_sessions;
CREATE POLICY "sessions_service_write" ON active_sessions FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'security_own_read' AND tablename = 'user_security') THEN
    DROP POLICY IF EXISTS "security_own_read" ON user_security;
CREATE POLICY "security_own_read" ON user_security FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'security_service_write' AND tablename = 'user_security') THEN
    DROP POLICY IF EXISTS "security_service_write" ON user_security;
CREATE POLICY "security_service_write" ON user_security FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;


-- ===================================================
-- 6. POLICIES ADICIONALES para tablas existentes
--    (Solo añade las que no existen, NO borra nada)
-- ===================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'locations_service_insert' AND tablename = 'locations') THEN
    DROP POLICY IF EXISTS "locations_service_insert" ON locations;
CREATE POLICY "locations_service_insert" ON locations FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'locations_service_update' AND tablename = 'locations') THEN
    DROP POLICY IF EXISTS "locations_service_update" ON locations;
CREATE POLICY "locations_service_update" ON locations FOR UPDATE USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'radars_service_write' AND tablename = 'radars') THEN
    DROP POLICY IF EXISTS "radars_service_write" ON radars;
CREATE POLICY "radars_service_write" ON radars FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'alerts_auth_insert_secure' AND tablename = 'community_alerts') THEN
    DROP POLICY IF EXISTS "alerts_auth_insert_secure" ON community_alerts;
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
    DROP POLICY IF EXISTS "audit_service_only" ON audit_log;
CREATE POLICY "audit_service_only" ON audit_log FOR ALL USING (auth.role() = 'service_role');
  END IF;
END $$;

-- >>> END: supabase/migration-005-security.sql <<<


-- >>> START: supabase/migration-006-anti-abuse.sql <<<
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

DROP POLICY IF EXISTS "trust_scores_read_own" ON report_trust_scores;
CREATE POLICY "trust_scores_read_own"
  ON report_trust_scores FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "trust_scores_service_all" ON report_trust_scores;
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

DROP TRIGGER IF EXISTS trg_radar_reports_vote_date ON radar_reports;
CREATE TRIGGER trg_radar_reports_vote_date
  BEFORE INSERT ON radar_reports
  FOR EACH ROW EXECUTE FUNCTION set_vote_date();

-- Nota: Ejecutar update_trust_scores() periódicamente via cron en Supabase
-- Dashboard → Edge Functions → Cron Jobs → update_trust_scores() cada 24h

-- >>> END: supabase/migration-006-anti-abuse.sql <<<


-- >>> START: supabase/migration-007-geo-verification.sql <<<
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

-- >>> END: supabase/migration-007-geo-verification.sql <<<


-- >>> START: supabase/migration-008-vehicle-profiles.sql <<<
-- ============================================
-- Migración 008: Perfiles de Vehículo
-- Para optimización de rutas con IA
-- Incluye preferencias de conducción y configuración avanzada
-- ============================================

-- Tabla de perfiles de vehículo
CREATE TABLE IF NOT EXISTS vehicle_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Información básica del vehículo
  model VARCHAR(100),
  year INTEGER CHECK (year >= 1950 AND year <= EXTRACT(YEAR FROM NOW()) + 1),
  vehicle_type VARCHAR(20) DEFAULT 'camper' CHECK (vehicle_type IN ('camper', 'motorhome', 'caravan', 'van', 'unknown')),
  
  -- Dimensiones (en metros)
  height DECIMAL(4,2) CHECK (height > 0 AND height <= 5),
  width DECIMAL(4,2) CHECK (width > 0 AND width <= 4),
  length DECIMAL(5,2) CHECK (length > 0 AND length <= 15),
  
  -- Peso (en kg)
  weight INTEGER CHECK (weight > 0 AND weight <= 10000),
  
  -- Motor (cilindrada en cc y año)
  engine_size INTEGER CHECK (engine_size > 0),
  engine_year INTEGER CHECK (engine_year >= 1950 AND engine_year <= EXTRACT(YEAR FROM NOW()) + 1),
  engine_cc INTEGER CHECK (engine_cc > 0),
  
  -- Preferencias de conducción
  driving_style VARCHAR(20) DEFAULT 'balanced' CHECK (driving_style IN ('eco', 'balanced', 'fast', 'scenic')),
  avoid_tolls BOOLEAN DEFAULT FALSE,
  avoid_highways BOOLEAN DEFAULT FALSE,
  max_slope_preference VARCHAR(10) DEFAULT 'medium' CHECK (max_slope_preference IN ('low', 'medium', 'high')),
  
  -- Preferencias de ruta basadas en el vehículo
  avoid_steep_hills BOOLEAN DEFAULT FALSE,
  prefer_scenic_routes BOOLEAN DEFAULT FALSE,
  optimize_fuel_consumption BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_vehicle_profiles_user_id ON vehicle_profiles(user_id);

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_vehicle_profiles_updated_at ON vehicle_profiles;
CREATE TRIGGER update_vehicle_profiles_updated_at
  BEFORE UPDATE ON vehicle_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Políticas de Seguridad (RLS)
-- ============================================

ALTER TABLE vehicle_profiles ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver su propio perfil
DROP POLICY IF EXISTS "Users can view their own vehicle profile" ON vehicle_profiles;
CREATE POLICY "Users can view their own vehicle profile"
  ON vehicle_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden insertar su propio perfil
DROP POLICY IF EXISTS "Users can insert their own vehicle profile" ON vehicle_profiles;
CREATE POLICY "Users can insert their own vehicle profile"
  ON vehicle_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar su propio perfil
DROP POLICY IF EXISTS "Users can update their own vehicle profile" ON vehicle_profiles;
CREATE POLICY "Users can update their own vehicle profile"
  ON vehicle_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Los usuarios pueden eliminar su propio perfil
DROP POLICY IF EXISTS "Users can delete their own vehicle profile" ON vehicle_profiles;
CREATE POLICY "Users can delete their own vehicle profile"
  ON vehicle_profiles
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- Comentarios para documentación
-- ============================================

COMMENT ON TABLE vehicle_profiles IS 'Perfiles de vehículo de los usuarios para optimización de rutas con IA';
COMMENT ON COLUMN vehicle_profiles.vehicle_type IS 'Tipo de vehículo: camper, motorhome, caravan, van, unknown';
COMMENT ON COLUMN vehicle_profiles.height IS 'Altura del vehículo en metros';
COMMENT ON COLUMN vehicle_profiles.width IS 'Ancho del vehículo en metros';
COMMENT ON COLUMN vehicle_profiles.length IS 'Longitud del vehículo en metros';
COMMENT ON COLUMN vehicle_profiles.weight IS 'Peso del vehículo en kilogramos';
COMMENT ON COLUMN vehicle_profiles.engine_size IS 'Cilindrada del motor en centímetros cúbicos';
COMMENT ON COLUMN vehicle_profiles.engine_year IS 'Año del motor para calcular pendientes máximas';
COMMENT ON COLUMN vehicle_profiles.engine_cc IS 'Cilindrada del motor en cc';
COMMENT ON COLUMN vehicle_profiles.driving_style IS 'Estilo de conducción: eco, balanced, fast, scenic';
COMMENT ON COLUMN vehicle_profiles.avoid_tolls IS 'Evitar peajes en las rutas';
COMMENT ON COLUMN vehicle_profiles.avoid_highways IS 'Evitar autopistas en las rutas';
COMMENT ON COLUMN vehicle_profiles.max_slope_preference IS 'Preferencia de pendiente: low (evitar), medium, high (sin problema)';
COMMENT ON COLUMN vehicle_profiles.avoid_steep_hills IS 'Evitar rutas con cuestas pronunciadas (útil para motores antiguos)';
COMMENT ON COLUMN vehicle_profiles.optimize_fuel_consumption IS 'Optimizar rutas para minimizar consumo de combustible';

-- >>> END: supabase/migration-008-vehicle-profiles.sql <<<



-- >>> START: supabase/migration-009-location-reviews.sql <<<
-- =====================================================
-- MIGRATION 009: SISTEMA DE RESEÑAS Y VALORACIONES DE LA COMUNIDAD
-- CamperSites-Pro (Camper, Camión y Reparto)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.location_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id TEXT NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_display_name TEXT NOT NULL DEFAULT 'Conductor de la Comunidad',
  vehicle_type TEXT NOT NULL DEFAULT 'camper',
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  safety_rating TEXT NOT NULL DEFAULT 'SEGURO' CHECK (safety_rating IN ('SEGURO', 'PRECAUCION', 'INSEGURO')),
  noise_level TEXT NOT NULL DEFAULT 'SILENCIOSO' CHECK (noise_level IN ('SILENCIOSO', 'MODERADO', 'RUIDOSO')),
  verified_services TEXT[] DEFAULT '{}',
  comment TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_location_reviews_location_id ON public.location_reviews(location_id);
CREATE INDEX IF NOT EXISTS idx_location_reviews_rating ON public.location_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_location_reviews_safety ON public.location_reviews(safety_rating);
CREATE INDEX IF NOT EXISTS idx_location_reviews_created_at ON public.location_reviews(created_at DESC);

-- Habilitar RLS
ALTER TABLE public.location_reviews ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad
DROP POLICY IF EXISTS "reviews_read_public" ON public.location_reviews;
CREATE POLICY "reviews_read_public"
  ON public.location_reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "reviews_insert_authenticated" ON public.location_reviews;
CREATE POLICY "reviews_insert_authenticated"
  ON public.location_reviews FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "reviews_update_own" ON public.location_reviews;
CREATE POLICY "reviews_update_own"
  ON public.location_reviews FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_delete_own" ON public.location_reviews;
CREATE POLICY "reviews_delete_own"
  ON public.location_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- Función para actualizar updated_at automáticamente
DROP TRIGGER IF EXISTS trg_location_reviews_updated ON public.location_reviews;
CREATE TRIGGER trg_location_reviews_updated
  BEFORE UPDATE ON public.location_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- >>> END: supabase/migration-009-location-reviews.sql <<<
