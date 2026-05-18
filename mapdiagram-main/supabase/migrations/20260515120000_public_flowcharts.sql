-- Public flowchart snapshots (immutable publish targets)
CREATE TABLE IF NOT EXISTS public.public_flowcharts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  data jsonb NOT NULL,
  quality_score integer NOT NULL DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 100),
  is_indexable boolean NOT NULL DEFAULT false,
  view_count bigint NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS public_flowcharts_slug_idx ON public.public_flowcharts (slug);
CREATE INDEX IF NOT EXISTS public_flowcharts_user_id_idx ON public.public_flowcharts (user_id);
CREATE INDEX IF NOT EXISTS public_flowcharts_created_at_idx ON public.public_flowcharts (created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_public_flowchart_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS public_flowcharts_updated_at ON public.public_flowcharts;
CREATE TRIGGER public_flowcharts_updated_at
  BEFORE UPDATE ON public.public_flowcharts
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_public_flowchart_updated_at();

ALTER TABLE public.public_flowcharts ENABLE ROW LEVEL SECURITY;

-- Owner: full access to own rows
CREATE POLICY public_flowcharts_owner_all
  ON public.public_flowcharts
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anonymous: read-only by slug (for direct Supabase client reads if needed)
CREATE POLICY public_flowcharts_anon_read_slug
  ON public.public_flowcharts
  FOR SELECT
  TO anon
  USING (slug IS NOT NULL);

COMMENT ON TABLE public.public_flowcharts IS 'Immutable-ish published flowchart snapshots for public view URLs';
