-- Create table for granular permissions per role
CREATE TABLE public.role_permissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  role app_role NOT NULL,
  permission TEXT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  is_granted BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(role, permission)
)

-- Enable RLS
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY

-- Anyone can view permissions
CREATE POLICY "Anyone can view permissions"
ON public.role_permissions
FOR SELECT
USING (true)

-- Only coordinators can manage permissions
CREATE POLICY "Coordinators can manage permissions"
ON public.role_permissions
FOR ALL
USING (has_role(auth.uid(), 'coordinator'))
WITH CHECK (has_role(auth.uid(), 'coordinator'))

-- Create trigger for updated_at
CREATE TRIGGER update_role_permissions_updated_at
BEFORE UPDATE ON public.role_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column()

-- Insert default permissions
INSERT INTO public.role_permissions (role, permission, resource, action, is_granted) VALUES
-- Coordinator permissions (all)
('coordinator', 'jobs:read', 'jobs', 'read', true),
('coordinator', 'jobs:create', 'jobs', 'create', true),
('coordinator', 'jobs:update', 'jobs', 'update', true),
('coordinator', 'jobs:delete', 'jobs', 'delete', true),
('coordinator', 'production:register', 'production', 'register', true),
('coordinator', 'operators:read', 'operators', 'read', true),
('coordinator', 'operators:create', 'operators', 'create', true),
('coordinator', 'operators:update', 'operators', 'update', true),
('coordinator', 'operators:delete', 'operators', 'delete', true),
('coordinator', 'machines:read', 'machines', 'read', true),
('coordinator', 'machines:create', 'machines', 'create', true),
('coordinator', 'machines:update', 'machines', 'update', true),
('coordinator', 'machines:delete', 'machines', 'delete', true),
('coordinator', 'reports:read', 'reports', 'read', true),
('coordinator', 'reports:create', 'reports', 'create', true),
('coordinator', 'reports:export', 'reports', 'export', true),
('coordinator', 'settings:read', 'settings', 'read', true),
('coordinator', 'settings:update', 'settings', 'update', true),
('coordinator', 'security:read', 'security', 'read', true),
('coordinator', 'security:manage', 'security', 'manage', true),
('coordinator', 'users:manage', 'users', 'manage', true),

-- Manager permissions
('manager', 'jobs:read', 'jobs', 'read', true),
('manager', 'jobs:create', 'jobs', 'create', true),
('manager', 'jobs:update', 'jobs', 'update', true),
('manager', 'jobs:delete', 'jobs', 'delete', true),
('manager', 'production:register', 'production', 'register', true),
('manager', 'operators:read', 'operators', 'read', true),
('manager', 'operators:create', 'operators', 'create', true),
('manager', 'operators:update', 'operators', 'update', true),
('manager', 'machines:read', 'machines', 'read', true),
('manager', 'machines:create', 'machines', 'create', true),
('manager', 'machines:update', 'machines', 'update', true),
('manager', 'reports:read', 'reports', 'read', true),
('manager', 'reports:create', 'reports', 'create', true),
('manager', 'reports:export', 'reports', 'export', true),
('manager', 'settings:read', 'settings', 'read', true),
('manager', 'security:read', 'security', 'read', true),

-- Operator permissions
('operator', 'jobs:read', 'jobs', 'read', true),
('operator', 'jobs:update', 'jobs', 'update', true),
('operator', 'production:register', 'production', 'register', true),
('operator', 'machines:read', 'machines', 'read', true),
('operator', 'reports:read', 'reports', 'read', true)

-- Create index for faster lookups
CREATE INDEX idx_role_permissions_role ON public.role_permissions(role)

CREATE INDEX idx_role_permissions_permission ON public.role_permissions(permission)
