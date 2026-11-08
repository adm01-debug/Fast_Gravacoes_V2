# public.user_roles

| propriedade | valor |
|---|---|
| tipo | table |
| owner | postgres |
| RLS habilitado | sim |
| RLS forçado (owner) | não |
| policies | 11 |
| realtime (publication) | não |
| replica identity | default |
| vem de extensão | não |


## Colunas

| # | coluna | tipo | nullable | default | identity/generated | comentário |
|---|---|---|---|---|---|---|
| 1 | `id` | `uuid` | não | `gen_random_uuid()` |  |  |
| 2 | `user_id` | `uuid` | não |  |  |  |
| 3 | `role` | `app_role` | não | `'operator'::app_role` |  |  |
| 4 | `created_at` | `timestamp with time zone` | não | `now()` |  |  |
| 5 | `is_active` | `boolean` | não | `true` |  |  |


## Constraints

| nome | tipo | definição | on delete | on update | validada |
|---|---|---|---|---|---|
| user_roles_pkey | PRIMARY KEY | `PRIMARY KEY (id)` |  |  | sim |
| user_roles_user_id_fkey | FOREIGN KEY | `FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE` | CASCADE | NO ACTION | sim |
| user_roles_user_id_role_key | UNIQUE | `UNIQUE (user_id, role)` |  |  | sim |


## Índices

| nome | método | colunas | único | válido | predicado | definição |
|---|---|---|---|---|---|---|
| idx_user_roles_is_active | btree | is_active | não | sim |  | `CREATE INDEX idx_user_roles_is_active ON public.user_roles USING btree (is_active)` |
| idx_user_roles_role | btree | role | não | sim |  | `CREATE INDEX idx_user_roles_role ON public.user_roles USING btree (role)` |
| idx_user_roles_user_id | btree | user_id | não | sim |  | `CREATE INDEX idx_user_roles_user_id ON public.user_roles USING btree (user_id)` |
| user_roles_pkey | btree | id | sim | sim |  | `CREATE UNIQUE INDEX user_roles_pkey ON public.user_roles USING btree (id)` |
| user_roles_user_id_role_key | btree | user_id, role | sim | sim |  | `CREATE UNIQUE INDEX user_roles_user_id_role_key ON public.user_roles USING btree (user_id, role)` |


## Policies (RLS)

### `AAL2 required for user_roles deletes`

| campo | valor |
|---|---|
| comando | DELETE |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `(COALESCE((auth.jwt() ->> 'aal'::text), 'aal1'::text) = 'aal2'::text)` |
| WITH CHECK |  |

### `AAL2 required for user_roles inserts`

| campo | valor |
|---|---|
| comando | INSERT |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING |  |
| WITH CHECK | `(COALESCE((auth.jwt() ->> 'aal'::text), 'aal1'::text) = 'aal2'::text)` |

### `AAL2 required for user_roles updates`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | RESTRICTIVE |
| roles | authenticated |
| USING | `(COALESCE((auth.jwt() ->> 'aal'::text), 'aal1'::text) = 'aal2'::text)` |
| WITH CHECK | `(COALESCE((auth.jwt() ->> 'aal'::text), 'aal1'::text) = 'aal2'::text)` |

### `Admins can manage all user roles`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)` |
| WITH CHECK | `app_private.has_role(( SELECT auth.uid() AS uid), 'admin'::app_role)` |

### `Coordinators can manage operator roles`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) AND (role = 'operator'::app_role))` |
| WITH CHECK | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) AND (role = 'operator'::app_role))` |

### `Coordinators can view all roles`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role)` |
| WITH CHECK |  |

### `Managers can manage non-privileged roles`

| campo | valor |
|---|---|
| comando | ALL |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role) AND (role <> ALL (ARRAY['admin'::app_role, 'manager'::app_role])))` |
| WITH CHECK | `(app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role) AND (role <> ALL (ARRAY['admin'::app_role, 'manager'::app_role])))` |

### `Managers can view all roles`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | public |
| USING | `(app_private.has_role(( SELECT auth.uid() AS uid), 'coordinator'::app_role) OR app_private.has_role(( SELECT auth.uid() AS uid), 'manager'::app_role))` |
| WITH CHECK |  |

### `Staff can update non-privileged roles`

| campo | valor |
|---|---|
| comando | UPDATE |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(app_private.has_role(auth.uid(), 'admin'::app_role) OR ((app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role)) AND (role <> ALL (ARRAY['admin'::app_role, 'manager'::app_role]))))` |
| WITH CHECK | `(app_private.has_role(auth.uid(), 'admin'::app_role) OR ((app_private.has_role(auth.uid(), 'coordinator'::app_role) OR app_private.has_role(auth.uid(), 'manager'::app_role)) AND (role <> ALL (ARRAY['admin'::app_role, 'manager'::app_role]))))` |

### `Staff can view all user_roles`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `((user_id = auth.uid()) OR is_staff())` |
| WITH CHECK |  |

### `Users can view their own roles`

| campo | valor |
|---|---|
| comando | SELECT |
| tipo | PERMISSIVE |
| roles | authenticated |
| USING | `(( SELECT auth.uid() AS uid) = user_id)` |
| WITH CHECK |  |


## Triggers

| nome | timing | eventos | nível | status | função |
|---|---|---|---|---|---|
| tr_audit_role_changes | AFTER | INSERT OR UPDATE | ROW | enabled | public.log_role_changes |


## Grants

| role | privilégios |
|---|---|
| anon | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| service_role | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
