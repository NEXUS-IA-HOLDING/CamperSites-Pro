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

CREATE TRIGGER trg_locations_updated
  BEFORE UPDATE ON locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_radars_updated
  BEFORE UPDATE ON radars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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
CREATE POLICY "locations_read_public"
  ON locations FOR SELECT
  USING (true);

-- Solo admins pueden insertar/actualizar/eliminar
CREATE POLICY "locations_admin_insert"
  ON locations FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "locations_admin_update"
  ON locations FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

CREATE POLICY "locations_admin_delete"
  ON locations FOR DELETE
  USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- ---- RADARS ----
-- Lectura publica (todos pueden ver radares activos)
CREATE POLICY "radars_read_public"
  ON radars FOR SELECT
  USING (active = TRUE);

-- Solo admins/service pueden modificar radares
CREATE POLICY "radars_admin_write"
  ON radars FOR ALL
  USING (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- ---- RADAR REPORTS ----
-- Usuarios autenticados pueden crear reportes
CREATE POLICY "radar_reports_insert_authenticated"
  ON radar_reports FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Usuarios solo ven sus propios reportes
CREATE POLICY "radar_reports_read_own"
  ON radar_reports FOR SELECT
  USING (
    user_id = auth.uid()
  );

-- ---- USER PROFILES ----
-- Cada usuario solo ve y edita su propio perfil
CREATE POLICY "user_profiles_read_own"
  ON user_profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "user_profiles_update_own"
  ON user_profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Auto-crear perfil al registrarse
CREATE POLICY "user_profiles_insert_own"
  ON user_profiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ---- SAVED ROUTES ----
-- Cada usuario solo ve y gestiona sus propias rutas
CREATE POLICY "saved_routes_read_own"
  ON saved_routes FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "saved_routes_insert_own"
  ON saved_routes FOR INSERT
  WITH CHECK (user_id = auth.uid());

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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
