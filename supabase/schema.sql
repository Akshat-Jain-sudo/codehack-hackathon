-- ============================================================================
-- LabLoop — Trusted Resource Sharing Schema for Supabase / PostgreSQL
-- ============================================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ROLES & ENUMS
CREATE TYPE user_role AS ENUM ('borrower', 'owner', 'manager', 'admin');
CREATE TYPE resource_status AS ENUM ('available', 'in_use', 'maintenance', 'retired');
CREATE TYPE booking_status AS ENUM (
  'draft',
  'pending_approval',
  'pending',
  'approved',
  'rejected',
  'waitlisted',
  'checked_in',
  'return_pending',
  'completed',
  'checked_out',
  'cancelled',
  'overdue',
  'incident_hold',
  'incident_review'
);
CREATE TYPE report_type AS ENUM ('check_in', 'check_out', 'incident');
CREATE TYPE condition_rating AS ENUM ('excellent', 'good', 'minor_wear', 'fair', 'missing_components', 'damaged', 'other');
CREATE TYPE incident_status AS ENUM ('open', 'investigating', 'resolved', 'escalated');

-- 2. USERS TABLE (Linked to auth.users in production Supabase)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'borrower',
  department TEXT NOT NULL,
  student_id TEXT NOT NULL,
  training_completed BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. CATEGORIES TABLE
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'Folder'
);

-- 4. RESOURCES TABLE
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  institution TEXT NOT NULL DEFAULT 'University Shared Laboratory',
  location_building TEXT NOT NULL,
  location_room TEXT NOT NULL,
  campus_zone TEXT NOT NULL DEFAULT 'Main Campus',
  walking_minutes INTEGER NOT NULL DEFAULT 5,
  status resource_status NOT NULL DEFAULT 'available',
  resource_type TEXT NOT NULL DEFAULT 'equipment',
  cost_per_hour NUMERIC NOT NULL DEFAULT 0,
  deposit_amount NUMERIC NOT NULL DEFAULT 0,
  cancellation_policy TEXT NOT NULL DEFAULT 'Standard 2-hour cancellation notice.',
  intended_uses JSONB NOT NULL DEFAULT '[]'::jsonb,
  operating_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  eligibility_requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  availability_schedule JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_url TEXT,
  requires_training BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  min_booking_hours NUMERIC NOT NULL DEFAULT 1,
  max_booking_hours INTEGER NOT NULL DEFAULT 4,
  safety_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. BOOKINGS TABLE
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  borrower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES public.users(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  purpose TEXT NOT NULL,
  project_course_context TEXT NOT NULL DEFAULT 'General Academic Research',
  training_evidence TEXT,
  training_evidence_verified BOOLEAN NOT NULL DEFAULT false,
  rules_acknowledged BOOLEAN NOT NULL DEFAULT false,
  custom_field_responses JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority_level TEXT NOT NULL DEFAULT 'normal',
  priority_reason TEXT,
  allocation_explanation TEXT,
  waitlist_position INTEGER,
  waitlist_reason TEXT,
  extension_requested_end_time TIMESTAMPTZ,
  extension_status TEXT NOT NULL DEFAULT 'none',
  incident_hold_reason TEXT,
  cancellation_reason TEXT,
  rejection_reason TEXT,
  checked_in_at TIMESTAMPTZ,
  return_initiated_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  overdue_minutes INTEGER,
  initial_report_id UUID,
  final_report_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  
  -- Constraint: end time must be after start time
  CONSTRAINT valid_booking_time_range CHECK (end_time > start_time)
);

-- Index for collision prevention checks
CREATE INDEX idx_bookings_resource_window ON public.bookings (resource_id, start_time, end_time) 
WHERE status IN ('approved', 'checked_in', 'return_pending', 'overdue', 'incident_review');

-- 6. CONDITION & INCIDENT REPORTS TABLE
CREATE TABLE public.condition_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type report_type NOT NULL,
  condition condition_rating NOT NULL,
  notes TEXT NOT NULL,
  evidence_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  accessories_returned JSONB NOT NULL DEFAULT '[]'::jsonb,
  confirmed_by_reporter BOOLEAN NOT NULL DEFAULT false,
  incident_status incident_status,
  resolved_by UUID REFERENCES public.users(id),
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  corrections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. AUDIT LOGS TABLE
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL, -- 'booking', 'resource', 'user', 'report'
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. NOTIFICATIONS TABLE
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. BLACKOUT PERIODS TABLE
CREATE TABLE public.blackout_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. ACCESS EXCEPTIONS TABLE
CREATE TABLE public.access_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  resource_id UUID REFERENCES public.resources(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL, -- 'training_override', 'hour_quota_exemption', 'emergency_access'
  reason TEXT NOT NULL,
  granted_by UUID NOT NULL REFERENCES public.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 11. INSTITUTION CONFIG TABLE
CREATE TABLE public.institution_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_name TEXT NOT NULL DEFAULT 'Metro Tech University',
  campus_name TEXT NOT NULL DEFAULT 'Main STEM Quad',
  max_advance_booking_days INTEGER NOT NULL DEFAULT 14,
  max_active_bookings_per_user INTEGER NOT NULL DEFAULT 3,
  max_weekly_booking_hours INTEGER NOT NULL DEFAULT 16,
  cancellation_window_hours INTEGER NOT NULL DEFAULT 2,
  require_checkin_photo BOOLEAN NOT NULL DEFAULT true,
  allow_self_checkin BOOLEAN NOT NULL DEFAULT true,
  support_email TEXT NOT NULL DEFAULT 'labloop-support@metrotech.edu',
  support_phone TEXT NOT NULL DEFAULT '(555) 019-2831',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.condition_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blackout_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_config ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Public profile read" ON public.users FOR SELECT USING (true);
CREATE POLICY "User update own profile (non-role)" ON public.users FOR UPDATE USING (auth.uid() = id);

-- Prevent self privilege escalation trigger
CREATE OR REPLACE FUNCTION prevent_self_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role <> OLD.role AND NEW.id = auth.uid() THEN
    RAISE EXCEPTION 'Security violation: Users are strictly prohibited from altering their own role privileges.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_self_role_escalation
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION prevent_self_role_escalation();

-- Resources policies
CREATE POLICY "Anyone can browse active resources" ON public.resources 
  FOR SELECT USING (true);
CREATE POLICY "Owners can insert their resources" ON public.resources 
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
-- Strict owner restriction: owners can only edit resources they own; managers and admins can edit any
CREATE POLICY "Owners can update their own resources" ON public.resources 
  FOR UPDATE USING (
    (auth.uid() = owner_id AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'owner')) OR
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('manager', 'admin'))
  );

-- Bookings policies
CREATE POLICY "Borrowers can view their own bookings" ON public.bookings 
  FOR SELECT USING (
    auth.uid() = borrower_id OR 
    EXISTS (SELECT 1 FROM public.resources r WHERE r.id = resource_id AND r.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('manager', 'admin'))
  );

CREATE POLICY "Borrowers can create booking requests" ON public.bookings 
  FOR INSERT WITH CHECK (auth.uid() = borrower_id);

CREATE POLICY "Resource owners or managers can update bookings" ON public.bookings 
  FOR UPDATE USING (
    auth.uid() = borrower_id OR
    EXISTS (SELECT 1 FROM public.resources r WHERE r.id = resource_id AND r.owner_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('manager', 'admin'))
  );

-- Condition reports policies
CREATE POLICY "Anyone can view condition reports" ON public.condition_reports 
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can submit reports" ON public.condition_reports 
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Managers and owners can resolve incidents" ON public.condition_reports 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('manager', 'admin')) OR
    EXISTS (SELECT 1 FROM public.resources r WHERE r.id = resource_id AND r.owner_id = auth.uid())
  );

-- Blackout periods policies
CREATE POLICY "Anyone can view blackout periods" ON public.blackout_periods FOR SELECT USING (true);
CREATE POLICY "Owners, managers, and admins can create blackouts" ON public.blackout_periods 
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('owner', 'manager', 'admin'))
  );

-- Access exceptions policies
CREATE POLICY "Users can view relevant exceptions" ON public.access_exceptions 
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('manager', 'admin'))
  );
CREATE POLICY "Managers and admins can manage exceptions" ON public.access_exceptions 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('manager', 'admin'))
  );

-- Institution config policies
CREATE POLICY "Anyone can view institution config" ON public.institution_config FOR SELECT USING (true);
CREATE POLICY "Admins and managers can update config" ON public.institution_config 
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('admin', 'manager'))
  );

-- Notifications policies
CREATE POLICY "Users can only read own notifications" ON public.notifications 
  FOR ALL USING (auth.uid() = user_id);

-- Audit logs policies (Read only for Manager/Admin, append only via system triggers)
CREATE POLICY "Managers and Admins view audit logs" ON public.audit_logs 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role IN ('manager', 'admin'))
  );

-- ============================================================================
-- PREVENT OVERLAPPING RESERVATION TRIGGER (INCLUDING BLACKOUT WINDOWS)
-- ============================================================================
CREATE OR REPLACE FUNCTION check_booking_overlap()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate overlap if status is confirmed/active
  IF NEW.status IN ('approved', 'checked_in', 'return_pending', 'overdue') THEN
    IF EXISTS (
      SELECT 1 FROM public.bookings
      WHERE resource_id = NEW.resource_id
        AND id <> NEW.id
        AND status IN ('approved', 'checked_in', 'return_pending', 'overdue')
        AND (NEW.start_time < end_time AND NEW.end_time > start_time)
    ) THEN
      RAISE EXCEPTION 'Double-booking conflict: Another confirmed booking overlaps with this timeframe.';
    END IF;

    -- Check scheduled blackout periods
    IF EXISTS (
      SELECT 1 FROM public.blackout_periods
      WHERE (resource_id = NEW.resource_id OR resource_id IS NULL)
        AND (NEW.start_time < end_time AND NEW.end_time > start_time)
    ) THEN
      RAISE EXCEPTION 'Blackout conflict: Asset or campus is undergoing scheduled blackout during this timeframe.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_booking_overlap
BEFORE INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION check_booking_overlap();
