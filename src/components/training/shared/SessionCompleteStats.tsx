/**
 * Session complete stats display
 * Shows session results and global progress stats.
 */

import { COLORS } from '../../../constants/colors';
import { BUTTON_STYLES } from './types';

// ============================================================================
// Types
// ============================================================================

export interface StatRow {
  label: string;
  value: string | number;
  /** Optional color override for the value */
  color?: string;
}

export interface GlobalStats {
  streakCurrent: number;
  streakBest: number;
  totalHandsCounted: number;
}

interface SessionCompleteStatsProps {
  /** Title displayed at the top */
  title?: string;
  /** Trainer-specific stats to display */
  stats: StatRow[];
  /** Global progress stats from the store */
  globalStats: GlobalStats;
  /** Called when user wants to start a new session */
  onNewSession: () => void;
  /** Called when user wants to change settings */
  onChangeSettings: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function SessionCompleteStats({
  title = 'Session Complete!',
  stats,
  globalStats,
  onNewSession,
  onChangeSettings,
}: SessionCompleteStatsProps) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{
        color: COLORS.gold.primary,
        fontSize: 28,
        fontWeight: 700,
        marginBottom: 8,
      }}>
        {title}
      </p>

      {/* Stats card */}
      <div style={{
        backgroundColor: COLORS.background.card,
        borderRadius: 12,
        padding: 24,
        marginBottom: 24,
        minWidth: 280,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Trainer-specific stats */}
          {stats.map((stat, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: COLORS.text.secondary }}>{stat.label}:</span>
              <span style={{
                color: stat.color || COLORS.text.primary,
                fontWeight: 600,
              }}>
                {stat.value}
              </span>
            </div>
          ))}

          {/* Divider */}
          <hr style={{
            border: 'none',
            borderTop: `1px solid ${COLORS.background.border}`,
            margin: '8px 0',
          }} />

          {/* Global stats */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: COLORS.text.secondary }}>Current Streak:</span>
            <span style={{ color: COLORS.gold.primary, fontWeight: 600 }}>
              {globalStats.streakCurrent}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: COLORS.text.secondary }}>Best Streak:</span>
            <span style={{ color: COLORS.text.primary, fontWeight: 600 }}>
              {globalStats.streakBest}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: COLORS.text.secondary }}>Total Hands (All Time):</span>
            <span style={{ color: COLORS.text.primary, fontWeight: 600 }}>
              {globalStats.totalHandsCounted}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={onNewSession} style={BUTTON_STYLES.primary}>
          New Session
        </button>
        <button onClick={onChangeSettings} style={BUTTON_STYLES.tertiary}>
          Change Settings
        </button>
      </div>
    </div>
  );
}
