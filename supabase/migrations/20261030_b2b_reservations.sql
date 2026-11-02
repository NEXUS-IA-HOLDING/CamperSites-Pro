-- ====================================================================
-- CamperSites Pro - Migración B2B: 20261030_b2b_reservations.sql
-- Módulo de Reservas B2B de Parcelas, Gálibos y Conectores de Camping
-- Idempotente y compatible con PostgreSQL 14+ / Supabase
-- ====================================================================

-- En Supabase la tabla auth.users ya existe de forma nativa gestionada por Supabase Auth.
-- Asegurar tabla locations si no existe previamente
CREATE TABLE IF NOT EXISTS public.locations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  longitude DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  category TEXT NOT NULL DEFAULT 'CAMPING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Asegurar función update_updated_at si no existe
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 1. TABLA: b2b_campground_hosts (Anfitriones y Gestores de Parcelas)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.b2b_campground_hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id TEXT REFERENCES public.locations(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  commercial_name TEXT,
  tax_id TEXT, -- CIF / NIF
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  payout_iban TEXT,
  commission_rate NUMERIC(4,2) DEFAULT 0.10 CHECK (commission_rate >= 0.05 AND commission_rate <= 0.25),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending_verification', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_b2b_hosts_user_id ON public.b2b_campground_hosts(user_id);
CREATE INDEX IF NOT EXISTS idx_b2b_hosts_location_id ON public.b2b_campground_hosts(location_id);
CREATE INDEX IF NOT EXISTS idx_b2b_hosts_status ON public.b2b_campground_hosts(status);

DROP TRIGGER IF EXISTS trg_b2b_hosts_updated ON public.b2b_campground_hosts;
CREATE TRIGGER trg_b2b_hosts_updated
  BEFORE UPDATE ON public.b2b_campground_hosts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ====================================================================
-- 2. TABLA: b2b_pitches (Parcelas con Medidas, Gálibo y Electricidad)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.b2b_pitches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES public.b2b_campground_hosts(id) ON DELETE CASCADE,
  location_id TEXT REFERENCES public.locations(id) ON DELETE CASCADE,
  pitch_number TEXT NOT NULL,
  pitch_type TEXT NOT NULL CHECK (pitch_type IN ('standard_small', 'comfort_medium', 'xxl_heavy')),
  max_length_meters NUMERIC(4,2) NOT NULL CHECK (max_length_meters > 0),
  max_height_meters NUMERIC(4,2) NOT NULL CHECK (max_height_meters > 0),
  max_width_meters NUMERIC(4,2) NOT NULL DEFAULT 2.50 CHECK (max_width_meters > 0),
  electricity_rating_amperes INTEGER DEFAULT 16 CHECK (electricity_rating_amperes >= 0),
  has_water_hookup BOOLEAN DEFAULT FALSE,
  has_drain_hookup BOOLEAN DEFAULT FALSE,
  has_shade BOOLEAN DEFAULT FALSE,
  ground_type TEXT DEFAULT 'gravel' CHECK (ground_type IN ('grass', 'gravel', 'asphalt', 'paved')),
  base_price_night NUMERIC(8,2) NOT NULL CHECK (base_price_night >= 0),
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_b2b_pitches_host_pitch UNIQUE (host_id, pitch_number)
);

CREATE INDEX IF NOT EXISTS idx_b2b_pitches_host_id ON public.b2b_pitches(host_id);
CREATE INDEX IF NOT EXISTS idx_b2b_pitches_location_id ON public.b2b_pitches(location_id);
CREATE INDEX IF NOT EXISTS idx_b2b_pitches_type ON public.b2b_pitches(pitch_type);
CREATE INDEX IF NOT EXISTS idx_b2b_pitches_available ON public.b2b_pitches(is_available);

DROP TRIGGER IF EXISTS trg_b2b_pitches_updated ON public.b2b_pitches;
CREATE TRIGGER trg_b2b_pitches_updated
  BEFORE UPDATE ON public.b2b_pitches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ====================================================================
-- 3. TABLA: b2b_reservations (Reservas con Códigos PIN y QR)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.b2b_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  host_id UUID REFERENCES public.b2b_campground_hosts(id) ON DELETE SET NULL,
  pitch_id UUID REFERENCES public.b2b_pitches(id) ON DELETE SET NULL,
  location_id TEXT REFERENCES public.locations(id) ON DELETE CASCADE,
  area_name TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  vehicle_length_meters NUMERIC(4,2) NOT NULL CHECK (vehicle_length_meters > 0),
  vehicle_height_meters NUMERIC(4,2) NOT NULL CHECK (vehicle_height_meters > 0),
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL CHECK (check_out_date > check_in_date),
  number_of_nights INTEGER NOT NULL CHECK (number_of_nights > 0),
  pitch_type TEXT NOT NULL CHECK (pitch_type IN ('standard_small', 'comfort_medium', 'xxl_heavy')),
  nightly_rate NUMERIC(8,2) NOT NULL CHECK (nightly_rate >= 0),
  base_total NUMERIC(8,2) NOT NULL CHECK (base_total >= 0),
  addons_total NUMERIC(8,2) NOT NULL DEFAULT 0.00 CHECK (addons_total >= 0),
  platform_fee NUMERIC(8,2) NOT NULL DEFAULT 0.00 CHECK (platform_fee >= 0), -- 10% Comisión CamperSites
  taxes_total NUMERIC(8,2) NOT NULL DEFAULT 0.00 CHECK (taxes_total >= 0),   -- 21% IVA
  total_amount NUMERIC(8,2) NOT NULL CHECK (total_amount >= 0),
  selected_addons JSONB DEFAULT '[]'::jsonb,
  barrier_pin_code TEXT NOT NULL,
  qr_access_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'pending_payment', 'checked_in', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_b2b_reservations_booking_id ON public.b2b_reservations(booking_id);
CREATE INDEX IF NOT EXISTS idx_b2b_reservations_user_id ON public.b2b_reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_b2b_reservations_host_id ON public.b2b_reservations(host_id);
CREATE INDEX IF NOT EXISTS idx_b2b_reservations_pitch_id ON public.b2b_reservations(pitch_id);
CREATE INDEX IF NOT EXISTS idx_b2b_reservations_location_id ON public.b2b_reservations(location_id);
CREATE INDEX IF NOT EXISTS idx_b2b_reservations_dates ON public.b2b_reservations(pitch_id, check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_b2b_reservations_license_plate ON public.b2b_reservations(license_plate);

DROP TRIGGER IF EXISTS trg_b2b_reservations_updated ON public.b2b_reservations;
CREATE TRIGGER trg_b2b_reservations_updated
  BEFORE UPDATE ON public.b2b_reservations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ====================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.b2b_campground_hosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_pitches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_reservations ENABLE ROW LEVEL SECURITY;

-- ---- POLICIES: b2b_campground_hosts ----
DROP POLICY IF EXISTS "hosts_public_read" ON public.b2b_campground_hosts;
CREATE POLICY "hosts_public_read"
  ON public.b2b_campground_hosts FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "hosts_manage_own" ON public.b2b_campground_hosts;
CREATE POLICY "hosts_manage_own"
  ON public.b2b_campground_hosts FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "hosts_service_role" ON public.b2b_campground_hosts;
CREATE POLICY "hosts_service_role"
  ON public.b2b_campground_hosts FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ---- POLICIES: b2b_pitches ----
DROP POLICY IF EXISTS "pitches_public_read" ON public.b2b_pitches;
CREATE POLICY "pitches_public_read"
  ON public.b2b_pitches FOR SELECT
  USING (is_available = true);

DROP POLICY IF EXISTS "pitches_manage_own_host" ON public.b2b_pitches;
CREATE POLICY "pitches_manage_own_host"
  ON public.b2b_pitches FOR ALL
  USING (
    host_id IN (
      SELECT id FROM public.b2b_campground_hosts WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    host_id IN (
      SELECT id FROM public.b2b_campground_hosts WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "pitches_service_role" ON public.b2b_pitches;
CREATE POLICY "pitches_service_role"
  ON public.b2b_pitches FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- ---- POLICIES: b2b_reservations ----
DROP POLICY IF EXISTS "reservations_user_read_own" ON public.b2b_reservations;
CREATE POLICY "reservations_user_read_own"
  ON public.b2b_reservations FOR SELECT
  USING (
    user_id = auth.uid() OR
    (host_id IS NOT NULL AND host_id IN (
      SELECT id FROM public.b2b_campground_hosts WHERE user_id = auth.uid()
    )) OR
    auth.jwt() ->> 'role' = 'service_role'
  );

DROP POLICY IF EXISTS "reservations_insert_customer" ON public.b2b_reservations;
CREATE POLICY "reservations_insert_customer"
  ON public.b2b_reservations FOR INSERT
  WITH CHECK (
    auth.uid() = user_id OR
    user_id IS NULL OR
    auth.jwt() ->> 'role' = 'service_role'
  );

DROP POLICY IF EXISTS "reservations_update_host_or_user" ON public.b2b_reservations;
CREATE POLICY "reservations_update_host_or_user"
  ON public.b2b_reservations FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (host_id IS NOT NULL AND host_id IN (
      SELECT id FROM public.b2b_campground_hosts WHERE user_id = auth.uid()
    )) OR
    auth.jwt() ->> 'role' = 'service_role'
  );

DROP POLICY IF EXISTS "reservations_delete_own" ON public.b2b_reservations;
CREATE POLICY "reservations_delete_own"
  ON public.b2b_reservations FOR DELETE
  USING (
    user_id = auth.uid() OR
    (host_id IS NOT NULL AND host_id IN (
      SELECT id FROM public.b2b_campground_hosts WHERE user_id = auth.uid()
    )) OR
    auth.jwt() ->> 'role' = 'service_role'
  );

DROP POLICY IF EXISTS "reservations_service_role" ON public.b2b_reservations;
CREATE POLICY "reservations_service_role"
  ON public.b2b_reservations FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
