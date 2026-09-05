-- Prevent multiple simultaneous pending password reset requests for the same
-- email address. A partial unique index on status='pending' means the DB
-- rejects the second INSERT if an identical pending request already exists,
-- while still allowing a new request once the admin approves or rejects the
-- previous one (which changes the status away from 'pending').

CREATE UNIQUE INDEX IF NOT EXISTS idx_password_reset_requests_one_pending_per_email
  ON public.password_reset_requests (user_email)
  WHERE (status = 'pending');

COMMENT ON INDEX idx_password_reset_requests_one_pending_per_email IS
  'Enforces at most one active (pending) reset request per email at the DB level.';
