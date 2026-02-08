-- Create role enums
CREATE TYPE public.vendor_role AS ENUM ('admin', 'team_member');
CREATE TYPE public.customer_role AS ENUM ('customer_contact');
CREATE TYPE public.project_status AS ENUM ('planning', 'in_progress', 'at_risk', 'completed', 'on_hold');
CREATE TYPE public.task_status AS ENUM ('todo', 'in_progress', 'blocked', 'completed');
CREATE TYPE public.milestone_status AS ENUM ('pending', 'in_progress', 'completed', 'delayed');

-- Profiles table for user info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customers table (corporate clients)
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  contact_email TEXT,
  industry TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User vendor roles (for staff members of the SaaS vendor)
CREATE TABLE public.user_vendor_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role vendor_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- User customer roles (for customer contacts)
CREATE TABLE public.user_customer_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, customer_id)
);

-- Projects (implementations)
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  target_end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '90 days'),
  status project_status NOT NULL DEFAULT 'planning',
  health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Milestones (major checkpoints)
CREATE TABLE public.milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  target_date DATE NOT NULL,
  status milestone_status NOT NULL DEFAULT 'pending',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tasks / Tickets
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.milestones(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  is_feature_request BOOLEAN DEFAULT FALSE,
  votes INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activity feed
CREATE TABLE public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Calendar events for weekly digests
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_type TEXT DEFAULT 'meeting',
  ai_suggested BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vendor_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_customer_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is vendor staff
CREATE OR REPLACE FUNCTION public.is_vendor_staff(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_vendor_roles
    WHERE user_id = _user_id
  );
$$;

-- Helper function: Check if user is vendor admin
CREATE OR REPLACE FUNCTION public.is_vendor_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_vendor_roles
    WHERE user_id = _user_id AND role = 'admin'
  );
$$;

-- Helper function: Check if user has access to customer
CREATE OR REPLACE FUNCTION public.has_customer_access(_user_id UUID, _customer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    public.is_vendor_staff(_user_id) OR
    EXISTS (
      SELECT 1 FROM public.user_customer_roles
      WHERE user_id = _user_id AND customer_id = _customer_id
    );
$$;

-- Helper function: Get project's customer_id
CREATE OR REPLACE FUNCTION public.get_project_customer_id(_project_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT customer_id FROM public.projects WHERE id = _project_id;
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Vendor staff can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_vendor_staff(auth.uid()));

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Customers policies
CREATE POLICY "Vendor staff can view all customers"
  ON public.customers FOR SELECT
  USING (public.is_vendor_staff(auth.uid()));

CREATE POLICY "Customer contacts can view their customer"
  ON public.customers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.user_customer_roles
    WHERE user_id = auth.uid() AND customer_id = id
  ));

CREATE POLICY "Vendor admins can manage customers"
  ON public.customers FOR ALL
  USING (public.is_vendor_admin(auth.uid()));

-- User vendor roles policies
CREATE POLICY "Vendor staff can view vendor roles"
  ON public.user_vendor_roles FOR SELECT
  USING (public.is_vendor_staff(auth.uid()));

CREATE POLICY "Vendor admins can manage vendor roles"
  ON public.user_vendor_roles FOR ALL
  USING (public.is_vendor_admin(auth.uid()));

-- User customer roles policies
CREATE POLICY "Users can view their own customer roles"
  ON public.user_customer_roles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Vendor staff can view all customer roles"
  ON public.user_customer_roles FOR SELECT
  USING (public.is_vendor_staff(auth.uid()));

CREATE POLICY "Vendor admins can manage customer roles"
  ON public.user_customer_roles FOR ALL
  USING (public.is_vendor_admin(auth.uid()));

-- Projects policies
CREATE POLICY "Users with customer access can view projects"
  ON public.projects FOR SELECT
  USING (public.has_customer_access(auth.uid(), customer_id));

CREATE POLICY "Vendor staff can create projects"
  ON public.projects FOR INSERT
  WITH CHECK (public.is_vendor_staff(auth.uid()));

CREATE POLICY "Vendor staff can update projects"
  ON public.projects FOR UPDATE
  USING (public.is_vendor_staff(auth.uid()));

CREATE POLICY "Vendor admins can delete projects"
  ON public.projects FOR DELETE
  USING (public.is_vendor_admin(auth.uid()));

-- Milestones policies
CREATE POLICY "Users with customer access can view milestones"
  ON public.milestones FOR SELECT
  USING (public.has_customer_access(auth.uid(), public.get_project_customer_id(project_id)));

CREATE POLICY "Vendor staff can manage milestones"
  ON public.milestones FOR ALL
  USING (public.is_vendor_staff(auth.uid()));

-- Tasks policies
CREATE POLICY "Users with customer access can view tasks"
  ON public.tasks FOR SELECT
  USING (public.has_customer_access(auth.uid(), public.get_project_customer_id(project_id)));

CREATE POLICY "Users with access can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (public.has_customer_access(auth.uid(), public.get_project_customer_id(project_id)));

CREATE POLICY "Users with access can update tasks"
  ON public.tasks FOR UPDATE
  USING (public.has_customer_access(auth.uid(), public.get_project_customer_id(project_id)));

CREATE POLICY "Vendor admins can delete tasks"
  ON public.tasks FOR DELETE
  USING (public.is_vendor_admin(auth.uid()));

-- Activity feed policies
CREATE POLICY "Users with customer access can view activity"
  ON public.activity_feed FOR SELECT
  USING (public.has_customer_access(auth.uid(), public.get_project_customer_id(project_id)));

CREATE POLICY "Users with access can create activity"
  ON public.activity_feed FOR INSERT
  WITH CHECK (public.has_customer_access(auth.uid(), public.get_project_customer_id(project_id)));

-- Calendar events policies
CREATE POLICY "Users with customer access can view calendar events"
  ON public.calendar_events FOR SELECT
  USING (public.has_customer_access(auth.uid(), public.get_project_customer_id(project_id)));

CREATE POLICY "Vendor staff can manage calendar events"
  ON public.calendar_events FOR ALL
  USING (public.is_vendor_staff(auth.uid()));

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON public.milestones FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_calendar_events_updated_at BEFORE UPDATE ON public.calendar_events FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();