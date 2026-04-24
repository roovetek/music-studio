import { useEffect, useState } from 'react';
import { Home } from './components/Home';
import { AdvancedMetronome } from './components/metronome/AdvancedMetronome';
import { appThemeOptions, defaultAppThemeId, type AppThemeId } from './lib/themes';

type Page = 'home' | 'metronome-full';

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex-1">
              <label
                htmlFor="app-theme-select"
                className="theme-picker-label mb-2 block text-xs font-semibold uppercase tracking-[0.18em]"
              >
                Visual Style
              </label>
              <select
                id="app-theme-select"
                value={currentTheme}
                onChange={(e) => setCurrentTheme(e.target.value as AppThemeId)}
                className="theme-select w-full rounded-xl px-4 py-3 text-sm outline-none lg:max-w-sm"
                aria-label="Select app visual style"
              >
                {appThemeOptions.map((theme) => (
                  <option key={theme.id} value={theme.id}>
                    {`${theme.name} [${theme.description.replace(/\.$/, '')}]`}
                  </option>
                ))}
              </select>
            </div>

            <div className="theme-vibe-summary lg:pb-1">
              <div className="theme-vibe-name text-sm font-semibold uppercase tracking-[0.18em]">
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
