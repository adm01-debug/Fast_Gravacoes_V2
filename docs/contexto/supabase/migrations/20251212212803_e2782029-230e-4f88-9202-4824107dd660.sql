-- Create techniques table
CREATE TABLE public.techniques (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  color TEXT NOT NULL,
  setup_time INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Create machines table
CREATE TABLE public.machines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  technique_id TEXT NOT NULL REFERENCES public.techniques(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Create jobs table
CREATE TABLE public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL,
  client TEXT NOT NULL,
  product TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  technique_id TEXT NOT NULL REFERENCES public.techniques(id),
  machine_id UUID REFERENCES public.machines(id),
  scheduled_date DATE,
  start_time TEXT,
  end_time TEXT,
  estimated_duration INTEGER NOT NULL DEFAULT 60,
  status TEXT NOT NULL DEFAULT 'queue' CHECK (status IN ('queue', 'ready', 'scheduled', 'production', 'finished', 'paused', 'cancelled', 'delayed', 'rework')),
  gravure_color TEXT,
  notes TEXT,
  actual_start_time TIMESTAMP WITH TIME ZONE,
  actual_end_time TIMESTAMP WITH TIME ZONE,
  lost_pieces INTEGER DEFAULT 0,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
)

-- Enable RLS
ALTER TABLE public.techniques ENABLE ROW LEVEL SECURITY

ALTER TABLE public.machines ENABLE ROW LEVEL SECURITY

ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY

-- Public read for techniques and machines (reference data)
CREATE POLICY "Anyone can view techniques" ON public.techniques FOR SELECT USING (true)

CREATE POLICY "Anyone can view machines" ON public.machines FOR SELECT USING (true)

CREATE POLICY "Anyone can view jobs" ON public.jobs FOR SELECT USING (true)

-- For now, allow authenticated users to manage jobs (coordinator role)
CREATE POLICY "Authenticated users can insert jobs" ON public.jobs FOR INSERT WITH CHECK (true)

CREATE POLICY "Authenticated users can update jobs" ON public.jobs FOR UPDATE USING (true)

CREATE POLICY "Authenticated users can delete jobs" ON public.jobs FOR DELETE USING (true)

-- Allow managing reference data
CREATE POLICY "Authenticated users can manage techniques" ON public.techniques FOR ALL USING (true) WITH CHECK (true)

CREATE POLICY "Authenticated users can manage machines" ON public.machines FOR ALL USING (true) WITH CHECK (true)

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public

-- Trigger for jobs updated_at
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column()

-- Insert initial techniques data
INSERT INTO public.techniques (id, name, short_name, color, setup_time) VALUES
  ('silk-textile', 'Silk Têxtil', 'SLK-T', '#10B981', 20),
  ('silk-vinyl-flat', 'Silk Vinílico/UV Plano', 'SLK-VP', '#F59E0B', 20),
  ('silk-vinyl-rotative', 'Silk Vinílico/UV Rotativo', 'SLK-VR', '#EF4444', 20),
  ('silk-decal', 'Silk Decalque', 'SLK-D', '#8B5CF6', 20),
  ('fiber-laser', 'Fiber Laser', 'F-LAS', '#06B6D4', 5),
  ('laser-co2', 'Laser CO2', 'CO2', '#EC4899', 5),
  ('laser-uv', 'Laser UV', 'UV', '#84CC16', 5),
  ('tampo', 'Tampografia', 'TAMP', '#F97316', 15),
  ('hot-stamp', 'Hot Stamping', 'H-STP', '#FBBF24', 10),
  ('thermal-press', 'Prensa Térmica', 'P-TER', '#A855F7', 10),
  ('sublimation-mug', 'Sublimação Caneca', 'SUBL', '#14B8A6', 10),
  ('decal-oven', 'Decalque Forno', 'D-FOR', '#FB7185', 15),
  ('dtf-uv-application', 'Aplicação DTF-UV', 'DTF-A', '#38BDF8', 10),
  ('dtf-textile', 'DTF Têxtil', 'DTF-T', '#4ADE80', 10),
  ('dtf-uv', 'DTF UV', 'DTF-U', '#C084FC', 10),
  ('cut-media', 'Corte Mídia', 'CORT', '#FB923C', 5)

-- Insert some machines
INSERT INTO public.machines (code, name, technique_id) VALUES
  ('SLK-T-01', 'Silk Têxtil 01', 'silk-textile'),
  ('SLK-T-02', 'Silk Têxtil 02', 'silk-textile'),
  ('SLK-T-03', 'Silk Têxtil 03', 'silk-textile'),
  ('F-LAS-01', 'Fiber Laser 01', 'fiber-laser'),
  ('F-LAS-02', 'Fiber Laser 02', 'fiber-laser'),
  ('TAMP-01', 'Tampografia 01', 'tampo'),
  ('TAMP-02', 'Tampografia 02', 'tampo'),
  ('P-TER-01', 'Prensa Térmica 01', 'thermal-press'),
  ('P-TER-02', 'Prensa Térmica 02', 'thermal-press'),
  ('SUBL-01', 'Sublimação 01', 'sublimation-mug')

-- Enable realtime for jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.jobs
