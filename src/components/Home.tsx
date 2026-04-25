import { SlidersHorizontal } from 'lucide-react';

interface HomeProps {
  onNavigate: (page: 'metronome-full' | 'dev-audio-lab') => void;
}

export const Home = ({ onNavigate }: HomeProps) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-6">
      <div className="text-center mb-12">
        <h1 className="home-title mb-4 text-6xl font-bold tracking-tight">
          Audio Tools
        </h1>
        <p className="home-subtitle text-xl">
          Professional music production utilities
        </p>
      </div>

      <div className="max-w-xl mx-auto">
        <button
          type="button"
          onClick={() => onNavigate('metronome-full')}
          className="home-tile group relative overflow-hidden rounded-2xl p-8 text-left transition-all duration-300 hover:scale-[1.02]"
        >
          <div className="home-tile__glow absolute inset-0 transition-all duration-300" />

          <div className="relative">
            <div className="home-tile__icon mb-6 flex h-16 w-16 items-center justify-center rounded-xl transition-colors">
              <SlidersHorizontal className="h-8 w-8" />
            </div>

            <h2 className="home-tile__title mb-3 text-2xl font-bold">Studio Metronome</h2>

            <p className="home-tile__copy leading-relaxed">
              Practice timing with expressive sound patterns, visual pulse choices, and
              clear beat divisions.
            </p>
          </div>
        </button>
      </div>

      {import.meta.env.DEV ? (
        <p className="mt-8 text-center">
          <button
            type="button"
            onClick={() => onNavigate('dev-audio-lab')}
            className="text-sm text-stone-500 underline decoration-stone-400/50 underline-offset-2 hover:text-stone-800 dark:hover:text-stone-200"
          >
            Dev: metronome audio graph lab
          </button>
        </p>
      ) : null}
    </div>
  );
};
