/**
 * Card counting color legend component
 * Shows the meaning of cyan (+1), gray (0), and magenta (-1) card outlines
 */
export function Legend() {
  return (
    <div style={{ display: 'flex', gap: 24, fontSize: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 16,
          height: 22,
          borderRadius: 3,
          backgroundColor: 'white',
          boxShadow: '0 0 0 1px #000, 0 0 0 4px #00ffff, 0 0 0 5px #000',
        }} />
        <span style={{ color: '#9ca3af' }}>+1 (2-6)</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 16,
          height: 22,
          borderRadius: 3,
          backgroundColor: 'white',
          boxShadow: '0 0 0 1px #000, 0 0 0 4px #6b7280, 0 0 0 5px #000',
        }} />
        <span style={{ color: '#9ca3af' }}>0 (7-9)</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 16,
          height: 22,
          borderRadius: 3,
          backgroundColor: 'white',
          boxShadow: '0 0 0 1px #000, 0 0 0 4px #ff00ff, 0 0 0 5px #000',
        }} />
        <span style={{ color: '#9ca3af' }}>-1 (10-A)</span>
      </div>
    </div>
  );
}

export default Legend;
