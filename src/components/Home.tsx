import { SlidersHorizontal } from 'lucide-react';

interface HomeProps {
  onNavigate: (page: 'metronome-full') => void;
}

export const Home = ({ onNavigate }: HomeProps) => {
  return (
    <div className="w-full max-w-4xl mx-auto px-6">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold text-white mb-4 tracking-tight">
          Audio Tools
        </h1>
        <p className="text-xl text-slate-400">
          Professional music production utilities
        </p>
      </div>

      <div className="max-w-xl mx-auto">
        <button
          type="button"
          onClick={() => onNavigate('metronome-full')}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 p-8 text-left transition-all duration-300 hover:scale-105 hover:border-violet-500/50 hover:shadow-xl hover:shadow-violet-500/20"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/0 to-violet-500/0 group-hover:from-violet-500/10 group-hover:to-transparent transition-all duration-300" />

          <div className="relative">
            <div className="w-16 h-16 rounded-xl bg-violet-500/20 flex items-center justify-center mb-6 group-hover:bg-violet-500/30 transition-colors">
              <SlidersHorizontal className="w-8 h-8 text-violet-400" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">Studio Metronome</h2>

            <p className="text-slate-400 leading-relaxed">
              Practice timing with expressive sound patterns, visual pulse choices, and
              clear beat divisions.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};
