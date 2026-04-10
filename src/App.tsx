import { useState } from 'react';
import { Home } from './components/Home';
import { Metronome } from './components/metronome/Metronome';
import { MusicFusionLab } from './components/musicFusion/MusicFusionLab';
import { CricketAnalysis } from './components/cricket/CricketAnalysis';

type Page = 'home' | 'metronome' | 'fusion-lab' | 'cricket-analysis';

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
      case 'cricket-analysis':
        return <CricketAnalysis onBack={() => setCurrentPage('home')} />;
      default:
        return <Home onNavigate={setCurrentPage} />;
    }
  };

  const isCricket = currentPage === 'cricket-analysis';

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 ${isCricket ? '' : 'flex items-center justify-center p-6'}`}>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none"></div>
      <div className={`relative w-full ${isCricket ? '' : 'flex items-center justify-center'}`}>
        {renderPage()}
      </div>
    </div>
  );
}

export default App;
