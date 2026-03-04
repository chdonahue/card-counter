import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Session stats for a single training session
export interface SessionStats {
  moduleId: string;
  timestamp: number;
  handsCompleted: number;
  countCorrect: number;
  countTotal: number;
  totalCorrect: number;   // Includes hand totals if asked
  totalQuestions: number;
  avgResponseTimeMs: number;
  config: {
    scaffolding: 'bold' | 'subtle' | 'flash' | 'none';
    speed: number;
    askTotal: boolean;
    deckCount: number;
  };
}

// Aggregate stats derived from sessions
export interface ModuleStats {
  totalSessions: number;
  totalHands: number;
  bestAccuracy: number;
  avgAccuracy: number;
  avgSpeed: number;
  lastPlayed: number | null;
}

interface ProgressState {
  // Session history (last N sessions)
  sessions: SessionStats[];

  // Current session being tracked (before completion)
  currentSession: Partial<SessionStats> | null;

  // Lifetime stats
  totalHandsCounted: number;
  streakCurrent: number;
  streakBest: number;

  // Actions
  startSession: (moduleId: string, config: SessionStats['config']) => void;
  recordAnswer: (correct: boolean, responseTimeMs: number) => void;
  recordHandComplete: (countCorrect: boolean, totalCorrect?: boolean) => void;
  endSession: () => SessionStats | null;
  getModuleStats: (moduleId: string) => ModuleStats;
  getRecentSessions: (moduleId: string, count: number) => SessionStats[];
  clearAllData: () => void;
}

const MAX_SESSIONS_STORED = 100;

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSession: null,
      totalHandsCounted: 0,
      streakCurrent: 0,
      streakBest: 0,

      startSession: (moduleId, config) => {
        set({
          currentSession: {
            moduleId,
            timestamp: Date.now(),
            handsCompleted: 0,
            countCorrect: 0,
            countTotal: 0,
            totalCorrect: 0,
            totalQuestions: 0,
            avgResponseTimeMs: 0,
            config,
          },
        });
      },

      // FUTURE USE: Track response time for speed progression
      // Will be used to auto-adjust deal speed based on user performance
      recordAnswer: (correct, responseTimeMs) => {
        set((state) => {
          if (!state.currentSession) return state;

          const current = state.currentSession;
          const totalQuestions = (current.totalQuestions || 0) + 1;
          const totalCorrect = (current.totalCorrect || 0) + (correct ? 1 : 0);

          // Running average for response time
          const prevAvg = current.avgResponseTimeMs || 0;
          const newAvg = prevAvg + (responseTimeMs - prevAvg) / totalQuestions;

          return {
            currentSession: {
              ...current,
              totalQuestions,
              totalCorrect,
              avgResponseTimeMs: newAvg,
            },
          };
        });
      },

      recordHandComplete: (countCorrect, totalCorrect) => {
        set((state) => {
          if (!state.currentSession) return state;

          const current = state.currentSession;

          return {
            currentSession: {
              ...current,
              handsCompleted: (current.handsCompleted || 0) + 1,
              countCorrect: (current.countCorrect || 0) + (countCorrect ? 1 : 0),
              countTotal: (current.countTotal || 0) + 1,
              // Only track total if it was asked
              ...(totalCorrect !== undefined && {
                totalCorrect: (current.totalCorrect || 0) + (totalCorrect ? 1 : 0),
                totalQuestions: (current.totalQuestions || 0) + 1,
              }),
            },
            totalHandsCounted: state.totalHandsCounted + 1,
          };
        });
      },

      endSession: () => {
        const state = get();
        if (!state.currentSession || !state.currentSession.handsCompleted) {
          set({ currentSession: null });
          return null;
        }

        const completedSession = state.currentSession as SessionStats;
        const accuracy = completedSession.countTotal > 0
          ? completedSession.countCorrect / completedSession.countTotal
          : 0;

        // Update streak based on accuracy (80% threshold)
        const passedSession = accuracy >= 0.8;
        const newStreakCurrent = passedSession ? state.streakCurrent + 1 : 0;
        const newStreakBest = Math.max(state.streakBest, newStreakCurrent);

        // Keep only last N sessions
        const updatedSessions = [completedSession, ...state.sessions].slice(0, MAX_SESSIONS_STORED);

        set({
          sessions: updatedSessions,
          currentSession: null,
          streakCurrent: newStreakCurrent,
          streakBest: newStreakBest,
        });

        return completedSession;
      },

      // FUTURE USE: Statistics for Duolingo-style curriculum
      // Will be used to show per-module progress and unlock criteria
      getModuleStats: (moduleId) => {
        const moduleSessions = get().sessions.filter(s => s.moduleId === moduleId);

        if (moduleSessions.length === 0) {
          return {
            totalSessions: 0,
            totalHands: 0,
            bestAccuracy: 0,
            avgAccuracy: 0,
            avgSpeed: 0,
            lastPlayed: null,
          };
        }

        const accuracies = moduleSessions.map(s =>
          s.countTotal > 0 ? s.countCorrect / s.countTotal : 0
        );

        return {
          totalSessions: moduleSessions.length,
          totalHands: moduleSessions.reduce((sum, s) => sum + s.handsCompleted, 0),
          bestAccuracy: Math.max(...accuracies),
          avgAccuracy: accuracies.reduce((a, b) => a + b, 0) / accuracies.length,
          avgSpeed: moduleSessions.reduce((sum, s) => sum + s.avgResponseTimeMs, 0) / moduleSessions.length,
          lastPlayed: Math.max(...moduleSessions.map(s => s.timestamp)),
        };
      },

      // FUTURE USE: Session history for stats screen
      getRecentSessions: (moduleId, count) => {
        return get().sessions
          .filter(s => s.moduleId === moduleId)
          .slice(0, count);
      },

      clearAllData: () => {
        set({
          sessions: [],
          currentSession: null,
          totalHandsCounted: 0,
          streakCurrent: 0,
          streakBest: 0,
        });
      },
    }),
    {
      name: 'card-counter-progress',
      version: 1,
    }
  )
);
