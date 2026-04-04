import { useState } from 'react';
import { Home } from './components/Home';
import { Metronome } from './components/Metronome';
import { MusicFusionLab } from './components/MusicFusionLab';

type Page = 'home' | 'metronome' | 'fusion-lab';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={setCurrentPage} />;
      case 'metronome':
        return (
          <div className="w-full">
            <button
              onClick={() => setCurrentPage('home')}
              className="mb-8 text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Home
            </button>
            <Metronome />
          </div>
        );
      case 'fusion-lab':
        return <MusicFusionLab onBack={() => setCurrentPage('home')} />;
      default:
        return <Home onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent"></div>
      <div className="relative w-full flex items-center justify-center">
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
