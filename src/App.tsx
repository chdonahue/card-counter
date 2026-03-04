import { useState } from 'react';
import { SingleHandTrainer, RunningCountTrainer, MultiPositionTrainer } from './components/training';
import './App.css';

type TrainingModule = 'single-hand' | 'running-count' | 'multi-position';

const MODULE_INFO: Record<TrainingModule, { title: string; description: string }> = {
  'single-hand': {
    title: 'Single Hand',
    description: 'Count one hand at a time',
  },
  'running-count': {
    title: 'Running Count',
    description: 'Track count across hands',
  },
  'multi-position': {
    title: 'Multi-Position',
    description: 'Full table with dealer',
  },
};

function App() {
  const [activeModule, setActiveModule] = useState<TrainingModule>('single-hand');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0d1117' }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#161b22',
        borderBottom: '1px solid #1a2e1a',
        padding: '16px 24px'
      }}>
        <div style={{ maxWidth: '896px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#d4af37', margin: 0 }}>
            Card Counter Pro
          </h1>
          <span style={{ color: '#9ca3af', fontSize: '14px' }}>
            Hi-Lo System
          </span>
        </div>
      </header>

      {/* Module Selector */}
      <div style={{ backgroundColor: '#161b22', borderBottom: '1px solid #1a2e1a', padding: '12px 24px' }}>
        <div style={{ maxWidth: '896px', margin: '0 auto', display: 'flex', gap: 8 }}>
          {(Object.keys(MODULE_INFO) as TrainingModule[]).map(module => (
            <button
              key={module}
              onClick={() => setActiveModule(module)}
              style={{
                padding: '8px 16px',
                backgroundColor: activeModule === module ? '#d4af37' : 'transparent',
                color: activeModule === module ? '#0d1117' : '#9ca3af',
                fontWeight: 500,
                fontSize: 14,
                borderRadius: 6,
                border: activeModule === module ? 'none' : '1px solid #374151',
                cursor: 'pointer',
              }}
            >
              {MODULE_INFO[module].title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="felt-bg" style={{ minHeight: 'calc(100vh - 120px)', padding: '24px' }}>
        <div style={{ maxWidth: '896px', margin: '0 auto' }}>
          {/* Training Area */}
          <div style={{
            backgroundColor: 'rgba(22, 27, 34, 0.5)',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid #243d24'
          }}>
            <h2 style={{ fontSize: '20px', color: 'white', margin: '0 0 8px 0', textAlign: 'center' }}>
              {MODULE_INFO[activeModule].title}
            </h2>
            <p style={{ color: '#6b7280', fontSize: 14, margin: '0 0 24px 0', textAlign: 'center' }}>
              {MODULE_INFO[activeModule].description}
            </p>

            {activeModule === 'single-hand' && <SingleHandTrainer />}
            {activeModule === 'running-count' && <RunningCountTrainer />}
            {activeModule === 'multi-position' && <MultiPositionTrainer />}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
