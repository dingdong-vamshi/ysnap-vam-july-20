-- Calorie Tracker meal logs
CREATE TABLE IF NOT EXISTS public.meal_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_type text NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  meal_name text NOT NULL,
  captured_image_url text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  local_date date NOT NULL,
  timezone text NOT NULL DEFAULT 'local',
  total_calories numeric NOT NULL DEFAULT 0,
  total_protein numeric NOT NULL DEFAULT 0,
  total_carbohydrates numeric NOT NULL DEFAULT 0,
  total_fat numeric NOT NULL DEFAULT 0,
  total_fibre numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid NOT NULL REFERENCES public.meal_logs(id) ON DELETE CASCADE,
  food_name text NOT NULL,
  estimated_quantity numeric,
  serving_unit text,
  calories numeric NOT NULL DEFAULT 0,
  protein numeric NOT NULL DEFAULT 0,
  carbohydrates numeric NOT NULL DEFAULT 0,
  fat numeric NOT NULL DEFAULT 0,
  fibre numeric NOT NULL DEFAULT 0,
  confidence numeric NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  is_user_edited boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meal_logs_user_local_date_idx ON public.meal_logs(user_id, local_date DESC);
CREATE INDEX IF NOT EXISTS meal_items_meal_id_idx ON public.meal_items(meal_id);

ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY meal_logs_select_own ON public.meal_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY meal_logs_insert_own ON public.meal_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY meal_logs_update_own ON public.meal_logs
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY meal_logs_delete_own ON public.meal_logs
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY meal_items_select_own ON public.meal_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.meal_logs
      WHERE meal_logs.id = meal_items.meal_id
        AND meal_logs.user_id = auth.uid()
    )
  );

CREATE POLICY meal_items_insert_own ON public.meal_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_logs
      WHERE meal_logs.id = meal_items.meal_id
        AND meal_logs.user_id = auth.uid()
    )
  );

CREATE POLICY meal_items_update_own ON public.meal_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.meal_logs
      WHERE meal_logs.id = meal_items.meal_id
        AND meal_logs.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_logs
      WHERE meal_logs.id = meal_items.meal_id
        AND meal_logs.user_id = auth.uid()
    )
  );

CREATE POLICY meal_items_delete_own ON public.meal_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.meal_logs
      WHERE meal_logs.id = meal_items.meal_id
        AND meal_logs.user_id = auth.uid()
    )
  );
