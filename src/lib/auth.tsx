import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { UserProgress } from './supabase';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isGuest: boolean;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  clearGuest: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_KEY = 'sanskrit_path_guest';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!isSupabaseConfigured) {
      setIsGuest(true);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mountedRef.current) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session) {
        setIsGuest(false);
      } else {
        setIsGuest(localStorage.getItem(GUEST_KEY) === 'true');
      }
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mountedRef.current) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession) {
          setIsGuest(false);
          localStorage.removeItem(GUEST_KEY);
        }
        setLoading(false);
      }
    );

    return () => {
      mountedRef.current = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) return { error: 'Supabase is not configured.' };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setIsGuest(false);
    localStorage.removeItem(GUEST_KEY);
  }, []);

  const continueAsGuest = useCallback(() => {
    localStorage.setItem(GUEST_KEY, 'true');
    setIsGuest(true);
  }, []);

  const clearGuest = useCallback(() => {
    localStorage.removeItem(GUEST_KEY);
    setIsGuest(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isGuest, loading, signUp, signIn, signOut, continueAsGuest, clearGuest }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ---- Guest progress (localStorage) ----

const GUEST_PROGRESS_KEY = 'sanskrit_path_guest_progress';
const GUEST_COMPLETIONS_KEY = 'sanskrit_path_guest_completions';

type GuestProgress = {
  total_xp: number;
  current_streak: number;
  longest_streak: number;
  last_lesson_date: string | null;
  hearts: number;
  max_hearts: number;
};

function loadGuestProgress(): GuestProgress {
  try {
    const raw = localStorage.getItem(GUEST_PROGRESS_KEY);
    if (raw) return JSON.parse(raw) as GuestProgress;
  } catch { /* ignore */ }
  return { total_xp: 0, current_streak: 0, longest_streak: 0, last_lesson_date: null, hearts: 5, max_hearts: 5 };
}

function loadGuestCompletions(): string[] {
  try {
    const raw = localStorage.getItem(GUEST_COMPLETIONS_KEY);
    if (raw) return JSON.parse(raw) as string[];
  } catch { /* ignore */ }
  return [];
}

type ProgressContextType = {
  progress: UserProgress | null;
  completions: string[];
  loadingProgress: boolean;
  refreshProgress: () => Promise<void>;
  completeLesson: (lessonId: string, score: number, accuracy: number) => Promise<number>;
};

const ProgressContext = createContext<ProgressContextType | undefined>(undefined);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user, isGuest } = useAuth();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [completions, setCompletions] = useState<string[]>([]);
  const [loadingProgress, setLoadingProgress] = useState(true);

  const refreshProgress = useCallback(async () => {
    if (!user && !isGuest) {
      setProgress(null);
      setCompletions([]);
      setLoadingProgress(false);
      return;
    }

    if ((isGuest && !user) || !isSupabaseConfigured) {
      const gp = loadGuestProgress();
      const gc = loadGuestCompletions();
      setProgress({
        user_id: 'guest',
        ...gp,
        last_heart_regenerated: null,
      });
      setCompletions(gc);
      setLoadingProgress(false);
      return;
    }

    if (!user) {
      setLoadingProgress(false);
      return;
    }

    const [progressRes, completionsRes] = await Promise.all([
      supabase.from('user_progress').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('lesson_completions').select('lesson_id').eq('user_id', user.id),
    ]);

    if (progressRes.data) {
      setProgress(progressRes.data as UserProgress);
    } else if (!progressRes.error) {
      const { data: newProgress } = await supabase
        .from('user_progress')
        .insert({ user_id: user.id })
        .select('*')
        .single();
      if (newProgress) setProgress(newProgress as UserProgress);
    }

    if (completionsRes.data) {
      setCompletions(completionsRes.data.map((c) => c.lesson_id));
    }
    setLoadingProgress(false);
  }, [user, isGuest]);

  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  const completeLesson = useCallback(
    async (lessonId: string, score: number, accuracy: number) => {
      const xpEarned = Math.round(score * 10 + accuracy * 50);

      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      let newStreak = 1;
      if (progress) {
        if (progress.last_lesson_date === today) {
          newStreak = progress.current_streak;
        } else if (progress.last_lesson_date === yesterday) {
          newStreak = progress.current_streak + 1;
        }
      }

      const newTotalXp = (progress?.total_xp ?? 0) + xpEarned;
      const newLongestStreak = Math.max(progress?.longest_streak ?? 0, newStreak);

      if ((isGuest && !user) || !isSupabaseConfigured) {
        const gp: GuestProgress = {
          total_xp: newTotalXp,
          current_streak: newStreak,
          longest_streak: newLongestStreak,
          last_lesson_date: today,
          hearts: progress?.hearts ?? 5,
          max_hearts: progress?.max_hearts ?? 5,
        };
        localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(gp));

        const newCompletions = completions.includes(lessonId) ? completions : [...completions, lessonId];
        localStorage.setItem(GUEST_COMPLETIONS_KEY, JSON.stringify(newCompletions));

        setProgress((prev) => prev ? {
          ...prev,
          total_xp: newTotalXp,
          current_streak: newStreak,
          longest_streak: newLongestStreak,
          last_lesson_date: today,
        } : prev);
        setCompletions(newCompletions);
        return xpEarned;
      }

      if (!user) return 0;

      await supabase.from('lesson_completions').upsert({
        user_id: user.id,
        lesson_id: lessonId,
        score,
        xp_earned: xpEarned,
        accuracy,
      }, { onConflict: 'user_id,lesson_id' });

      await supabase.from('user_progress').upsert({
        user_id: user.id,
        total_xp: newTotalXp,
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        last_lesson_date: today,
      }, { onConflict: 'user_id' });

      setProgress((prev) => prev ? {
        ...prev,
        total_xp: newTotalXp,
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        last_lesson_date: today,
      } : prev);
      setCompletions((prev) => prev.includes(lessonId) ? prev : [...prev, lessonId]);

      return xpEarned;
    },
    [user, isGuest, progress, completions]
  );

  return (
    <ProgressContext.Provider value={{ progress, completions, loadingProgress, refreshProgress, completeLesson }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider');
  return ctx;
}
