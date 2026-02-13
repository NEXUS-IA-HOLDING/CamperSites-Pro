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
