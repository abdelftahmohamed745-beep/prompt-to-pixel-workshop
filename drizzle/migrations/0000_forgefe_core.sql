CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '' CHECK (char_length(display_name) <= 80),
  lang text NOT NULL DEFAULT 'ar' CHECK (lang IN ('ar','en')),
  theme text NOT NULL DEFAULT 'light' CHECK (theme IN ('light','dark','system')),
  prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 4000),
  site_type text NOT NULL DEFAULT 'landing',
  direction text NOT NULL DEFAULT 'minimal',
  framework text NOT NULL DEFAULT 'html' CHECK (framework IN ('html')),
  source text NOT NULL DEFAULT 'user' CHECK (source IN ('user','import','duplicate')),
  version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projects_user_updated_idx ON public.projects (user_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own projects select" ON public.projects FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own projects insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own projects update" ON public.projects FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own projects delete" ON public.projects FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.owns_project(_project_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.projects WHERE id = _project_id AND user_id = auth.uid())
$$;
GRANT EXECUTE ON FUNCTION public.owns_project(uuid) TO authenticated;

CREATE TABLE public.project_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  path text NOT NULL CHECK (char_length(path) BETWEEN 1 AND 120),
  content text NOT NULL DEFAULT '' CHECK (char_length(content) <= 200000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, path)
);
CREATE INDEX project_files_project_idx ON public.project_files (project_id);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL CHECK (char_length(content) <= 20000),
  run_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_project_idx ON public.messages (project_id, created_at);

CREATE TABLE public.ai_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL DEFAULT 'edit' CHECK (kind IN ('generate','edit')),
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running','succeeded','failed','cancelled')),
  model text,
  error_code text,
  error_message text,
  summary text,
  input_tokens integer,
  output_tokens integer,
  base_version integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX ai_runs_project_idx ON public.ai_runs (project_id, created_at DESC);
CREATE INDEX ai_runs_user_idx ON public.ai_runs (user_id, created_at DESC);

CREATE TABLE public.file_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  run_id uuid REFERENCES public.ai_runs(id) ON DELETE SET NULL,
  path text NOT NULL,
  op text NOT NULL CHECK (op IN ('create','update','delete','revert')),
  before_content text,
  after_content text,
  version integer NOT NULL,
  reverted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX file_changes_project_idx ON public.file_changes (project_id, created_at DESC);

CREATE TABLE public.test_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  run_id uuid REFERENCES public.ai_runs(id) ON DELETE SET NULL,
  status text NOT NULL CHECK (status IN ('passed','failed')),
  results jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX test_runs_project_idx ON public.test_runs (project_id, created_at DESC);

CREATE TABLE public.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (char_length(kind) <= 40),
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX usage_events_user_idx ON public.usage_events (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_files, public.messages, public.ai_runs, public.file_changes, public.test_runs TO authenticated;
GRANT SELECT, INSERT ON public.usage_events TO authenticated;
GRANT ALL ON public.project_files, public.messages, public.ai_runs, public.file_changes, public.test_runs, public.usage_events TO service_role;

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own files" ON public.project_files FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND public.owns_project(project_id));
CREATE POLICY "own messages" ON public.messages FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND public.owns_project(project_id));
CREATE POLICY "own runs" ON public.ai_runs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND public.owns_project(project_id));
CREATE POLICY "own changes" ON public.file_changes FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND public.owns_project(project_id));
CREATE POLICY "own tests" ON public.test_runs FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid() AND public.owns_project(project_id));
CREATE POLICY "own usage select" ON public.usage_events FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own usage insert" ON public.usage_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND (project_id IS NULL OR public.owns_project(project_id)));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1), ''), 80))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic, version-checked file commit. Applies a batch of file ops for the caller's
-- project only if the project is still at _base_version; records every change.
CREATE OR REPLACE FUNCTION public.commit_file_changes(_project_id uuid, _base_version integer, _run_id uuid, _ops jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  _new integer;
  _op jsonb;
  _path text;
  _before text;
BEGIN
  UPDATE public.projects SET version = version + 1, updated_at = now()
   WHERE id = _project_id AND user_id = auth.uid() AND version = _base_version
   RETURNING version INTO _new;
  IF _new IS NULL THEN
    RAISE EXCEPTION 'version_conflict' USING ERRCODE = 'P0001';
  END IF;
  FOR _op IN SELECT * FROM jsonb_array_elements(_ops) LOOP
    _path := _op->>'path';
    SELECT content INTO _before FROM public.project_files WHERE project_id = _project_id AND path = _path;
    IF (_op->>'op') = 'delete' THEN
      DELETE FROM public.project_files WHERE project_id = _project_id AND path = _path;
    ELSE
      INSERT INTO public.project_files (project_id, user_id, path, content, updated_at)
      VALUES (_project_id, auth.uid(), _path, _op->>'content', now())
      ON CONFLICT (project_id, path) DO UPDATE SET content = EXCLUDED.content, updated_at = now();
    END IF;
    INSERT INTO public.file_changes (project_id, user_id, run_id, path, op, before_content, after_content, version)
    VALUES (_project_id, auth.uid(), _run_id, _path, coalesce(_op->>'kind', CASE WHEN (_op->>'op') = 'delete' THEN 'delete' WHEN _before IS NULL THEN 'create' ELSE 'update' END),
            _before, CASE WHEN (_op->>'op') = 'delete' THEN NULL ELSE _op->>'content' END, _new);
    _before := NULL;
  END LOOP;
  RETURN _new;
END $$;
GRANT EXECUTE ON FUNCTION public.commit_file_changes(uuid, integer, uuid, jsonb) TO authenticated;
