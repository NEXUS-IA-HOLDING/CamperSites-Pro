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

CREATE TRIGGER update_vehicle_profiles_updated_at
  BEFORE UPDATE ON vehicle_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Políticas de Seguridad (RLS)
-- ============================================

ALTER TABLE vehicle_profiles ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver su propio perfil
CREATE POLICY "Users can view their own vehicle profile"
  ON vehicle_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden insertar su propio perfil
CREATE POLICY "Users can insert their own vehicle profile"
  ON vehicle_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update their own vehicle profile"
  ON vehicle_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Los usuarios pueden eliminar su propio perfil
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
