import { SingleHandTrainer } from './components/training';
import './App.css';

function App() {

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
            Hi-Lo System • Single Hand Training
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="felt-bg" style={{ minHeight: 'calc(100vh - 72px)', padding: '24px' }}>
        <div style={{ maxWidth: '896px', margin: '0 auto' }}>
          {/* Training Area */}
          <div style={{
            backgroundColor: 'rgba(22, 27, 34, 0.5)',
            borderRadius: '12px',
            padding: '32px',
            border: '1px solid #243d24'
          }}>
            <h2 style={{ fontSize: '20px', color: 'white', margin: '0 0 24px 0', textAlign: 'center' }}>
              Single Hand Count Training
            </h2>

            <SingleHandTrainer />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
