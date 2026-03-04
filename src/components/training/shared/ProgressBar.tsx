/**
 * Session progress bar component
 * Shows visual progress through a training session
 */
interface ProgressBarProps {
  current: number;
  target: number;
  label?: string;
  unit?: string;
}

export function ProgressBar({
  current,
  target,
  label = 'Session Progress',
  unit = '',
}: ProgressBarProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ color: '#6b7280', fontSize: 12 }}>{label}</span>
      <div style={{
        width: 200,
        height: 8,
        backgroundColor: '#1f2937',
        borderRadius: 4,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${(current / target) * 100}%`,
          height: '100%',
          backgroundColor: '#d4af37',
          transition: 'width 0.3s ease',
        }} />
      </div>
      <span style={{ color: '#9ca3af', fontSize: 12 }}>
        {current}/{target}{unit && ` ${unit}`}
      </span>
    </div>
  );
}

export default ProgressBar;
