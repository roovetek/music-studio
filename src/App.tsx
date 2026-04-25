import { useEffect, useState } from 'react';
import { Home } from './components/Home';
import { DevAudioGraphLab } from './components/dev/DevAudioGraphLab';
import { FourierPage } from './components/fourier/FourierPage';
import { AdvancedMetronome } from './components/metronome/AdvancedMetronome';
import { ThemedSelect } from './components/ui/ThemedSelect';
import { appThemeOptions, defaultAppThemeId, type AppThemeId } from './lib/themes';

type Page = 'home' | 'metronome-full' | 'dev-audio-lab' | 'fourier';

const PAGE_STORAGE_KEY = 'music-studio-page';

function readStoredPage(): Page {
  if (typeof window === 'undefined') {
    return 'home';
  }
  const raw = window.localStorage.getItem(PAGE_STORAGE_KEY);
  if (raw === 'metronome-full' || raw === 'home' || raw === 'dev-audio-lab' || raw === 'fourier') {
    return raw;
  }
  return 'home';
}

function App() {
  const [currentPage, setCurrentPage] = useState<Page>(readStoredPage);
  const [currentTheme, setCurrentTheme] = useState<AppThemeId>(() => {
    if (typeof window === 'undefined') {
      return defaultAppThemeId;
    }

    const storedTheme = window.localStorage.getItem('music-studio-theme') as AppThemeId | null;
    if (storedTheme && appThemeOptions.some((theme) => theme.id === storedTheme)) {
      return storedTheme;
    }
    return defaultAppThemeId;
  });

  useEffect(() => {
    window.localStorage.setItem(PAGE_STORAGE_KEY, currentPage);
  }, [currentPage]);

  useEffect(() => {
    window.localStorage.setItem('music-studio-theme', currentTheme);

    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    const selectedTheme = appThemeOptions.find((theme) => theme.id === currentTheme);
    if (metaThemeColor && selectedTheme) {
      metaThemeColor.setAttribute('content', selectedTheme.themeColor);
    }
  }, [currentTheme]);

  const selectedTheme = appThemeOptions.find((theme) => theme.id === currentTheme) ?? appThemeOptions[0];

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
              className="theme-back-link mb-8 transition-colors"
            >
              ← Back to Home
            </button>
            <AdvancedMetronome />
          </div>
        );
      case 'dev-audio-lab':
        return <DevAudioGraphLab onBack={() => setCurrentPage('home')} />;
      case 'fourier':
        return <FourierPage onBack={() => setCurrentPage('home')} />;
      default:
        return <Home onNavigate={setCurrentPage} />;
    }
  };

  return (
    <div
      data-theme={currentTheme}
      className="app-shell min-h-screen p-6"
    >
      <div className="app-shell__ambient pointer-events-none absolute inset-0"></div>
      <div className="app-shell__content relative mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col gap-8">
        <header className="app-header rounded-2xl px-5 py-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(24rem,0.7fr)] lg:items-end">
            <div>
              <label
                htmlFor="app-theme-select"
                className="theme-picker-label mb-2 block text-xs font-semibold uppercase tracking-[0.18em]"
              >
                Visual Style
              </label>
              <ThemedSelect
                id="app-theme-select"
                value={currentTheme}
                onChange={(v) => setCurrentTheme(v as AppThemeId)}
                placement="down"
                maxVh={50}
                optionPreview="theme"
                themeSwatchLayout="visualizer"
                triggerClassName="theme-select themed-select-trigger w-full rounded-xl px-4 py-3 text-sm outline-none"
                aria-label="Select app visual style"
                options={appThemeOptions.map((theme) => ({
                  value: theme.id,
                  label: theme.name,
                  sublabel: theme.description,
                }))}
              />
            </div>

            <div className="theme-vibe-summary lg:pb-1">
              <div className="theme-vibe-name text-xs font-semibold uppercase tracking-[0.12em] lg:text-sm">
                {selectedTheme.vibe}
              </div>
            </div>
          </div>
        </header>

        <main className="relative flex flex-1 items-center justify-center">{renderPage()}</main>
      </div>
    </div>
  );
}

export default App;
