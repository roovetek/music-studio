import { useState } from 'react';
import { Home } from './components/Home';
import { AdvancedMetronome } from './components/metronome/AdvancedMetronome';

type Page = 'home' | 'metronome-full';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={setCurrentPage} />;
      case 'metronome-full':
        return (
          <div className="w-full">
            <button
              type="button"
              onClick={() => setCurrentPage('home')}
              className="mb-8 text-slate-400 hover:text-white transition-colors"
            >
              ← Back to Home
            </button>
            <AdvancedMetronome />
          </div>
        );
      default:
        return <Home onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-900/20 via-transparent to-transparent pointer-events-none"></div>
      <div className="relative w-full flex items-center justify-center">{renderPage()}</div>
    </div>
  );
}

export default App;
