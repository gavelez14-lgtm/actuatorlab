"use client";

/**
 * Demo learning progress, stored in localStorage.
 *
 * Migration path: `ProgressRepository` is the seam. A Supabase implementation
 * would read/write the `user_progress`, `quiz_attempts` and `recent_topics`
 * tables (see supabase/schema.sql) behind the same interface. Nothing
 * sensitive is stored: no names, emails or identifiers, only lesson slugs,
 * scores and timestamps.
 */
import { useCallback, useSyncExternalStore } from "react";

export interface QuizResult {
  score: number;
  total: number;
  completedAt: string;
  best: number;
  attempts: number;
}

export interface RecentTopic {
  id: string;
  title: string;
  href: string;
  at: string;
}

export interface ProgressData {
  version: 1;
  /** Seeded sample data is flagged so the UI can say so. */
  seeded: boolean;
  completedLessons: Record<string, string>; // slug -> ISO date
  lessonChecks: Record<string, Record<string, number>>; // slug -> questionId -> chosen index
  quizzes: Record<string, QuizResult>;
  recent: RecentTopic[];
  lastLesson: string | null;
}

export interface ProgressRepository {
  load(): ProgressData;
  save(data: ProgressData): void;
}

const KEY = "actuatorlab.progress.v1";

export function sampleProgress(): ProgressData {
  const d = (daysAgo: number) => new Date(Date.now() - daysAgo * 86400000).toISOString();
  return {
    version: 1,
    seeded: true,
    completedLessons: { "what-is-an-actuator": d(6), "actuator-vs-valve": d(5) },
    lessonChecks: {},
    quizzes: {},
    recent: [
      { id: "lesson-actuator-vs-valve", title: "Actuator versus valve", href: "/academy/actuator-vs-valve", at: d(5) },
      { id: "family-cp", title: "CP pneumatic Scotch yoke", href: "/explorer/cp", at: d(5) },
      { id: "lesson-what-is-an-actuator", title: "What is an actuator?", href: "/academy/what-is-an-actuator", at: d(6) },
    ],
    lastLesson: "power-sources",
  };
}

function emptyProgress(): ProgressData {
  return { version: 1, seeded: false, completedLessons: {}, lessonChecks: {}, quizzes: {}, recent: [], lastLesson: null };
}

export const localRepository: ProgressRepository = {
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const seeded = sampleProgress();
        localStorage.setItem(KEY, JSON.stringify(seeded));
        return seeded;
      }
      const parsed = JSON.parse(raw) as ProgressData;
      if (parsed?.version !== 1) return sampleProgress();
      return { ...emptyProgress(), ...parsed };
    } catch {
      return sampleProgress();
    }
  },
  save(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      /* storage full or blocked: progress lives for this session only */
    }
  },
};

/* ------------------------------------------------------------------------ */

let repo: ProgressRepository = localRepository;
let cache: ProgressData | null = null;
const SERVER_SNAPSHOT = emptyProgress();
const listeners = new Set<() => void>();

function get(): ProgressData {
  if (!cache) cache = repo.load();
  return cache;
}

function set(update: (d: ProgressData) => ProgressData) {
  cache = update(get());
  repo.save(cache);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function setProgressRepository(next: ProgressRepository) {
  repo = next;
  cache = null;
  listeners.forEach((l) => l());
}

export function useProgress() {
  const data = useSyncExternalStore(subscribe, get, () => SERVER_SNAPSHOT);

  const completeLesson = useCallback((slug: string) => {
    set((d) => ({ ...d, completedLessons: { ...d.completedLessons, [slug]: new Date().toISOString() } }));
  }, []);

  const uncompleteLesson = useCallback((slug: string) => {
    set((d) => {
      const next = { ...d.completedLessons };
      delete next[slug];
      return { ...d, completedLessons: next };
    });
  }, []);

  const answerCheck = useCallback((slug: string, questionId: string, choice: number) => {
    set((d) => ({ ...d, lessonChecks: { ...d.lessonChecks, [slug]: { ...(d.lessonChecks[slug] ?? {}), [questionId]: choice } } }));
  }, []);

  const recordQuiz = useCallback((slug: string, score: number, total: number) => {
    set((d) => {
      const prev = d.quizzes[slug];
      return {
        ...d,
        quizzes: {
          ...d.quizzes,
          [slug]: { score, total, completedAt: new Date().toISOString(), best: Math.max(score, prev?.best ?? 0), attempts: (prev?.attempts ?? 0) + 1 },
        },
      };
    });
  }, []);

  const touchRecent = useCallback((topic: Omit<RecentTopic, "at">) => {
    set((d) => {
      if (d.recent[0]?.id === topic.id) return d;
      const recent = [{ ...topic, at: new Date().toISOString() }, ...d.recent.filter((r) => r.id !== topic.id)].slice(0, 6);
      return { ...d, recent };
    });
  }, []);

  const setLastLesson = useCallback((slug: string) => {
    set((d) => (d.lastLesson === slug ? d : { ...d, lastLesson: slug }));
  }, []);

  const reset = useCallback((mode: "empty" | "sample") => {
    set(() => (mode === "sample" ? sampleProgress() : emptyProgress()));
  }, []);

  return { data, completeLesson, uncompleteLesson, answerCheck, recordQuiz, touchRecent, setLastLesson, reset };
}
