-- Tabela de produtos/materiais (para categorização)
CREATE TABLE public.product_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)

-- Tabela de materiais (algodão, poliéster, cerâmica, etc.)
CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)

-- Tabela principal: Fichas Técnicas
CREATE TABLE public.technical_sheets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technique_id text NOT NULL REFERENCES public.techniques(id),
  product_category_id uuid REFERENCES public.product_categories(id),
  material_id uuid REFERENCES public.materials(id),
  title text NOT NULL,
  description text,
  estimated_time_minutes integer,
  recommended_machine_id uuid REFERENCES public.machines(id),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  updated_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)

-- Passos do processo (passo a passo)
CREATE TABLE public.technical_sheet_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technical_sheet_id uuid NOT NULL REFERENCES public.technical_sheets(id) ON DELETE CASCADE,
  step_number integer NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  tips text,
  warnings text,
  created_at timestamptz NOT NULL DEFAULT now()
)

-- Materiais e insumos necessários
CREATE TABLE public.technical_sheet_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technical_sheet_id uuid NOT NULL REFERENCES public.technical_sheets(id) ON DELETE CASCADE,
  name text NOT NULL,
  specification text,
  quantity text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
)

-- Dicas e observações gerais
CREATE TABLE public.technical_sheet_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technical_sheet_id uuid NOT NULL REFERENCES public.technical_sheets(id) ON DELETE CASCADE,
  tip_type text NOT NULL DEFAULT 'tip', -- 'tip', 'warning', 'important'
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
)

-- Enable RLS em todas as tabelas
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY

ALTER TABLE public.technical_sheets ENABLE ROW LEVEL SECURITY

ALTER TABLE public.technical_sheet_steps ENABLE ROW LEVEL SECURITY

ALTER TABLE public.technical_sheet_materials ENABLE ROW LEVEL SECURITY

ALTER TABLE public.technical_sheet_tips ENABLE ROW LEVEL SECURITY

-- Políticas: Todos visualizam
CREATE POLICY "Anyone can view product categories" ON public.product_categories FOR SELECT USING (true)

CREATE POLICY "Anyone can view materials" ON public.materials FOR SELECT USING (true)

CREATE POLICY "Anyone can view technical sheets" ON public.technical_sheets FOR SELECT USING (true)

CREATE POLICY "Anyone can view technical sheet steps" ON public.technical_sheet_steps FOR SELECT USING (true)

CREATE POLICY "Anyone can view technical sheet materials" ON public.technical_sheet_materials FOR SELECT USING (true)

CREATE POLICY "Anyone can view technical sheet tips" ON public.technical_sheet_tips FOR SELECT USING (true)

-- Políticas: Coordenador edita
CREATE POLICY "Coordinators can manage product categories" ON public.product_categories FOR ALL USING (has_role(auth.uid(), 'coordinator')) WITH CHECK (has_role(auth.uid(), 'coordinator'))

CREATE POLICY "Coordinators can manage materials" ON public.materials FOR ALL USING (has_role(auth.uid(), 'coordinator')) WITH CHECK (has_role(auth.uid(), 'coordinator'))

CREATE POLICY "Coordinators can manage technical sheets" ON public.technical_sheets FOR ALL USING (has_role(auth.uid(), 'coordinator')) WITH CHECK (has_role(auth.uid(), 'coordinator'))

CREATE POLICY "Coordinators can manage sheet steps" ON public.technical_sheet_steps FOR ALL USING (has_role(auth.uid(), 'coordinator')) WITH CHECK (has_role(auth.uid(), 'coordinator'))

CREATE POLICY "Coordinators can manage sheet materials" ON public.technical_sheet_materials FOR ALL USING (has_role(auth.uid(), 'coordinator')) WITH CHECK (has_role(auth.uid(), 'coordinator'))

CREATE POLICY "Coordinators can manage sheet tips" ON public.technical_sheet_tips FOR ALL USING (has_role(auth.uid(), 'coordinator')) WITH CHECK (has_role(auth.uid(), 'coordinator'))

-- Trigger para updated_at
CREATE TRIGGER update_product_categories_updated_at BEFORE UPDATE ON public.product_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()

CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()

CREATE TRIGGER update_technical_sheets_updated_at BEFORE UPDATE ON public.technical_sheets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()

-- Inserir algumas categorias de produtos iniciais
INSERT INTO public.product_categories (name, description) VALUES
  ('Camisetas', 'Camisetas, regatas e roupas têxteis'),
  ('Canecas', 'Canecas de cerâmica, polímero e acrílico'),
  ('Bonés', 'Bonés, chapéus e acessórios de cabeça'),
  ('Brindes', 'Brindes promocionais diversos'),
  ('Squeezes', 'Garrafas e squeezes'),
  ('Ecobags', 'Sacolas ecológicas'),
  ('Cadernos', 'Cadernos e blocos de notas'),
  ('Canetas', 'Canetas e materiais de escrita'),
  ('Chaveiros', 'Chaveiros e pingentes'),
  ('Copos', 'Copos térmicos e acrílicos')

-- Inserir materiais comuns
INSERT INTO public.materials (name, description) VALUES
  ('Algodão', 'Tecido 100% algodão'),
  ('Poliéster', 'Tecido 100% poliéster'),
  ('Algodão/Poliéster', 'Tecido misto'),
  ('Cerâmica', 'Material cerâmico'),
  ('Polímero', 'Plástico de polímero'),
  ('Acrílico', 'Material acrílico transparente ou colorido'),
  ('Metal', 'Superfícies metálicas'),
  ('Madeira', 'Superfícies de madeira'),
  ('Vidro', 'Superfícies de vidro'),
  ('Couro', 'Couro natural ou sintético'),
  ('Nylon', 'Tecido nylon'),
  ('PVC', 'Material PVC flexível ou rígido')
