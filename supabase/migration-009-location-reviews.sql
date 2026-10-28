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
