import { Music, Waves, Video } from 'lucide-react';

interface HomeProps {
  onNavigate: (page: 'metronome' | 'fusion-lab' | 'cricket-analysis') => void;
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

      <div className="grid md:grid-cols-3 gap-6">
        <button
          onClick={() => onNavigate('metronome')}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 p-8 text-left transition-all duration-300 hover:scale-105 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/20"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/10 group-hover:to-transparent transition-all duration-300" />

          <div className="relative">
            <div className="w-16 h-16 rounded-xl bg-blue-500/20 flex items-center justify-center mb-6 group-hover:bg-blue-500/30 transition-colors">
              <Music className="w-8 h-8 text-blue-400" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">
              Metronome
            </h2>

            <p className="text-slate-400 leading-relaxed">
              Precision tempo control with visual feedback. Adjustable from 30 to 300 BPM.
            </p>
          </div>
        </button>

        <button
          onClick={() => onNavigate('fusion-lab')}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 p-8 text-left transition-all duration-300 hover:scale-105 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/20"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/10 group-hover:to-transparent transition-all duration-300" />

          <div className="relative">
            <div className="w-16 h-16 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-6 group-hover:bg-emerald-500/30 transition-colors">
              <Waves className="w-8 h-8 text-emerald-400" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">
              Music Fusion Lab
            </h2>

            <p className="text-slate-400 leading-relaxed">
              Upload and analyze audio files. Extract BPM, key, and duration from your tracks.
            </p>
          </div>
        </button>
        <button
          onClick={() => onNavigate('cricket-analysis')}
          className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-slate-700/50 p-8 text-left transition-all duration-300 hover:scale-105 hover:border-rose-500/50 hover:shadow-xl hover:shadow-rose-500/20"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/0 to-rose-500/0 group-hover:from-rose-500/10 group-hover:to-transparent transition-all duration-300" />

          <div className="relative">
            <div className="w-16 h-16 rounded-xl bg-rose-500/20 flex items-center justify-center mb-6 group-hover:bg-rose-500/30 transition-colors">
              <Video className="w-8 h-8 text-rose-400" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-3">
              Video Analysis
            </h2>

            <p className="text-slate-400 leading-relaxed">
              AI-powered cricket analysis with pose estimation, ball tracking, and real-time scoring.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
};
