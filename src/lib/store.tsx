import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { translate, type Lang, type TKey } from "./i18n";
import { applyDemoEdit, buildTemplate, type Direction, type SiteType } from "./templates";

export type Theme = "light" | "dark" | "system";
export type Viewport = "desktop" | "tablet" | "mobile";
export type TaskStatus = "planning" | "editing" | "testing" | "done" | "stopped" | "error";

export interface Change {
  id: string;
  taskId: string;
  path: string;
  before: string | null;
  after: string;
  createdAt: number;
  reverted: boolean;
}
export interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: number;
  demo?: boolean;
}
export interface Task {
  id: string;
  prompt: string;
  status: TaskStatus;
  createdAt: number;
}
export interface LogEntry {
  id: string;
  level: "info" | "warn" | "error";
  text: string;
  createdAt: number;
}
export interface Project {
  id: string;
  name: string;
  description: string;
  siteType: SiteType;
  direction: Direction;
  createdAt: number;
  updatedAt: number;
  files: Record<string, string>;
  messages: Message[];
  tasks: Task[];
  changes: Change[];
  logs: LogEntry[];
}
export interface Session {
  name: string;
  email: string;
}
export interface Prefs {
  defaultViewport: Viewport;
  lineNumbers: boolean;
  wrap: boolean;
}

interface Persisted {
  lang: Lang;
  theme: Theme;
  prefs: Prefs;
  profile: Session;
  projects: Project[];
}

const KEY = "forgefe:v1";
const SESSION_KEY = "forgefe:session";

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function seedProjects(): Project[] {
  const now = Date.now();
  const mk = (name: string, description: string, siteType: SiteType, direction: Direction, ageH: number): Project => {
    const t = now - ageH * 3600_000;
    return {
      id: uid(),
      name,
      description,
      siteType,
      direction,
      createdAt: t - 86400_000,
      updatedAt: t,
      files: buildTemplate({ name, description, type: siteType, direction, lang: "ar" }),
      messages: [],
      tasks: [],
      changes: [],
      logs: [{ id: uid(), level: "info", text: "Demo project seeded locally", createdAt: t }],
    };
  };
  return [
    mk("مقهى البن", "صفحة هبوط لمقهى مختص مع قائمة المشروبات وساعات العمل.", "landing", "editorial", 3),
    mk("Studio Noor", "Portfolio for an architecture studio with selected projects.", "portfolio", "minimal", 50),
  ];
}

export function defaultState(): Persisted {
  return {
    lang: "ar",
    theme: "light",
    prefs: { defaultViewport: "desktop", lineNumbers: true, wrap: false },
    profile: { name: "", email: "" },
    projects: seedProjects(),
  };
}

interface Ctx extends Persisted {
  ready: boolean;
  loadError: boolean;
  session: Session | null;
  t: (k: TKey, v?: Record<string, string | number>) => string;
  setLang: (l: Lang) => void;
  setTheme: (t: Theme) => void;
  setPrefs: (p: Partial<Prefs>) => void;
  setProfile: (p: Session) => void;
  signIn: (s: Session, remember: boolean) => void;
  signOut: () => void;
  createProject: (p: { name: string; description: string; siteType: SiteType; direction: Direction }) => string;
  renameProject: (id: string, name: string) => void;
  duplicateProject: (id: string) => void;
  deleteProject: (id: string) => void;
  resetData: () => void;
  runTask: (projectId: string, prompt: string) => void;
  stopTask: (projectId: string) => void;
  revertChange: (projectId: string, changeId: string) => boolean;
  isRunning: (projectId: string) => boolean;
}

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(defaultState);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>[]>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Persisted;
        if (!Array.isArray(parsed.projects)) throw new Error("bad");
        setState({ ...defaultState(), ...parsed });
      }
    } catch {
      setLoadError(true);
    }
    try {
      const s = localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
      if (s) setSession(JSON.parse(s));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && !loadError) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, ready, loadError]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = state.lang;
    root.dir = state.lang === "ar" ? "rtl" : "ltr";
  }, [state.lang]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = state.theme === "dark" || (state.theme === "system" && mq.matches);
      document.documentElement.classList.toggle("dark", dark);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [state.theme]);

  const t = useCallback((k: TKey, v?: Record<string, string | number>) => translate(state.lang, k, v), [state.lang]);

  const patchProject = useCallback((id: string, fn: (p: Project) => Project) => {
    setState((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? fn(p) : p)) }));
  }, []);

  const clearTimers = (id: string) => {
    (timers.current[id] ?? []).forEach(clearTimeout);
    timers.current[id] = [];
  };

  const runTask = useCallback(
    (projectId: string, prompt: string) => {
      const taskId = uid();
      const now = Date.now();
      const lang = state.lang;
      setRunning((r) => ({ ...r, [projectId]: true }));
      patchProject(projectId, (p) => ({
        ...p,
        updatedAt: now,
        messages: [...p.messages, { id: uid(), role: "user", text: prompt, createdAt: now }],
        tasks: [...p.tasks, { id: taskId, prompt, status: "planning", createdAt: now }],
        logs: [...p.logs, { id: uid(), level: "info", text: `[demo] task ${taskId} planning`, createdAt: now }],
      }));
      const setStatus = (status: TaskStatus) =>
        patchProject(projectId, (p) => ({
          ...p,
          tasks: p.tasks.map((x) => (x.id === taskId ? { ...x, status } : x)),
          logs: [...p.logs, { id: uid(), level: "info", text: `[demo] task ${taskId} ${status}`, createdAt: Date.now() }],
        }));
      clearTimers(projectId);
      timers.current[projectId] = [
        setTimeout(() => setStatus("editing"), 1200),
        setTimeout(() => setStatus("testing"), 2600),
        setTimeout(() => {
          patchProject(projectId, (p) => {
            const at = Date.now();
            const html = p.files["index.html"];
            if (html === undefined) {
              return {
                ...p,
                tasks: p.tasks.map((x) => (x.id === taskId ? { ...x, status: "error" } : x)),
                messages: [...p.messages, { id: uid(), role: "assistant", text: translate(lang, "demoError"), createdAt: at, demo: true }],
                logs: [...p.logs, { id: uid(), level: "error", text: "[demo] index.html missing", createdAt: at }],
              };
            }
            const after = applyDemoEdit(html, prompt, lang);
            return {
              ...p,
              updatedAt: at,
              files: { ...p.files, "index.html": after },
              tasks: p.tasks.map((x) => (x.id === taskId ? { ...x, status: "done" } : x)),
              changes: [...p.changes, { id: uid(), taskId, path: "index.html", before: html, after, createdAt: at, reverted: false }],
              messages: [...p.messages, { id: uid(), role: "assistant", text: translate(lang, "demoReply"), createdAt: at, demo: true }],
              logs: [...p.logs, { id: uid(), level: "info", text: `[demo] task ${taskId} done — index.html modified`, createdAt: at }],
            };
          });
          setRunning((r) => ({ ...r, [projectId]: false }));
        }, 3800),
      ];
    },
    [patchProject, state.lang],
  );

  const stopTask = useCallback(
    (projectId: string) => {
      clearTimers(projectId);
      setRunning((r) => ({ ...r, [projectId]: false }));
      const lang = state.lang;
      patchProject(projectId, (p) => {
        const at = Date.now();
        return {
          ...p,
          tasks: p.tasks.map((x) => (["planning", "editing", "testing"].includes(x.status) ? { ...x, status: "stopped" } : x)),
          messages: [...p.messages, { id: uid(), role: "assistant", text: translate(lang, "demoStopped"), createdAt: at, demo: true }],
          logs: [...p.logs, { id: uid(), level: "warn", text: "[demo] task stopped by user", createdAt: at }],
        };
      });
    },
    [patchProject, state.lang],
  );

  const value = useMemo<Ctx>(
    () => ({
      ...state,
      ready,
      loadError,
      session,
      t,
      setLang: (lang) => setState((s) => ({ ...s, lang })),
      setTheme: (theme) => setState((s) => ({ ...s, theme })),
      setPrefs: (p) => setState((s) => ({ ...s, prefs: { ...s.prefs, ...p } })),
      setProfile: (profile) => {
        setState((s) => ({ ...s, profile }));
        setSession(profile);
        const store = localStorage.getItem(SESSION_KEY) ? localStorage : sessionStorage;
        store.setItem(SESSION_KEY, JSON.stringify(profile));
      },
      signIn: (s, remember) => {
        setSession(s);
        setState((st) => ({ ...st, profile: s }));
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
        (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(s));
      },
      signOut: () => {
        setSession(null);
        localStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SESSION_KEY);
      },
      createProject: ({ name, description, siteType, direction }) => {
        const id = uid();
        const now = Date.now();
        const p: Project = {
          id,
          name,
          description,
          siteType,
          direction,
          createdAt: now,
          updatedAt: now,
          files: buildTemplate({ name, description, type: siteType, direction, lang: state.lang }),
          messages: [{ id: uid(), role: "user", text: description, createdAt: now }],
          tasks: [],
          changes: [],
          logs: [{ id: uid(), level: "info", text: "[demo] starter template created locally (not AI-generated)", createdAt: now }],
        };
        setState((s) => ({ ...s, projects: [p, ...s.projects] }));
        return id;
      },
      renameProject: (id, name) => patchProject(id, (p) => ({ ...p, name, updatedAt: Date.now() })),
      duplicateProject: (id) =>
        setState((s) => {
          const src = s.projects.find((p) => p.id === id);
          if (!src) return s;
          const now = Date.now();
          const copy: Project = { ...structuredClone(src), id: uid(), name: `${src.name} ${translate(s.lang, "copySuffix")}`, createdAt: now, updatedAt: now };
          return { ...s, projects: [copy, ...s.projects] };
        }),
      deleteProject: (id) => {
        clearTimers(id);
        setState((s) => ({ ...s, projects: s.projects.filter((p) => p.id !== id) }));
      },
      resetData: () => {
        Object.keys(timers.current).forEach(clearTimers);
        setRunning({});
        setLoadError(false);
        setState((s) => ({ ...defaultState(), lang: s.lang, theme: s.theme, profile: s.profile }));
      },
      runTask,
      stopTask,
      revertChange: (projectId, changeId) => {
        const p = state.projects.find((x) => x.id === projectId);
        const c = p?.changes.find((x) => x.id === changeId);
        if (!p || !c || c.reverted || p.files[c.path] !== c.after) return false;
        patchProject(projectId, (pp) => {
          const files = { ...pp.files };
          if (c.before === null) delete files[c.path];
          else files[c.path] = c.before;
          const at = Date.now();
          return {
            ...pp,
            files,
            updatedAt: at,
            changes: pp.changes.map((x) => (x.id === changeId ? { ...x, reverted: true } : x)),
            logs: [...pp.logs, { id: uid(), level: "info", text: `[demo] reverted change on ${c.path}`, createdAt: at }],
          };
        });
        return true;
      },
      isRunning: (id) => !!running[id],
    }),
    [state, ready, loadError, session, t, patchProject, runTask, stopTask, running],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const c = useContext(AppContext);
  if (!c) throw new Error("useApp outside AppProvider");
  return c;
}

export function projectStatus(p: Project, running: boolean): "running" | "edited" | "draft" {
  if (running) return "running";
  return p.changes.some((c) => !c.reverted) ? "edited" : "draft";
}
