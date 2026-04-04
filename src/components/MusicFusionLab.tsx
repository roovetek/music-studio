import { useState, useRef } from 'react';
import { Upload, Music, ArrowLeft } from 'lucide-react';

interface MusicFusionLabProps {
  onBack: () => void;
}

interface AudioFile {
  file: File | null;
  name: string;
  bpm: number | null;
  key: string | null;
  duration: number | null;
}

export const MusicFusionLab = ({ onBack }: MusicFusionLabProps) => {
  const [audioFiles, setAudioFiles] = useState<[AudioFile, AudioFile]>([
    { file: null, name: '', bpm: null, key: null, duration: null },
    { file: null, name: '', bpm: null, key: null, duration: null },
  ]);

  const fileInput1Ref = useRef<HTMLInputElement>(null);
  const fileInput2Ref = useRef<HTMLInputElement>(null);

  const handleFileSelect = (index: 0 | 1, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && (file.type === 'audio/mpeg' || file.type === 'audio/wav')) {
      const newFiles = [...audioFiles] as [AudioFile, AudioFile];
      newFiles[index] = {
        file,
        name: file.name,
        bpm: null,
        key: null,
        duration: null,
      };
      setAudioFiles(newFiles);
    }
  };

  const handleUploadClick = (index: 0 | 1) => {
    if (index === 0) {
      fileInput1Ref.current?.click();
    } else {
      fileInput2Ref.current?.click();
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return '--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6">
      <button
        onClick={onBack}
        className="mb-8 flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Home
      </button>

      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
          Music Fusion Lab
        </h1>
        <p className="text-lg text-slate-400">
          Upload two audio files to analyze and compare their properties
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {[0, 1].map((index) => (
          <div key={index}>
            <input
              ref={index === 0 ? fileInput1Ref : fileInput2Ref}
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav"
              onChange={(e) => handleFileSelect(index as 0 | 1, e)}
              className="hidden"
            />

            <button
              onClick={() => handleUploadClick(index as 0 | 1)}
              className="w-full group relative overflow-hidden rounded-2xl bg-slate-800/30 border-2 border-dashed border-slate-600 hover:border-slate-500 p-12 transition-all duration-300 hover:bg-slate-800/50"
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-slate-700/50 flex items-center justify-center group-hover:bg-slate-700 transition-colors">
                  {audioFiles[index].file ? (
                    <Music className="w-10 h-10 text-emerald-400" />
                  ) : (
                    <Upload className="w-10 h-10 text-slate-400 group-hover:text-slate-300" />
                  )}
                </div>

                <div className="text-center">
                  <p className="text-xl font-semibold text-white mb-2">
                    {audioFiles[index].file ? 'File Selected' : `Upload Track ${index + 1}`}
                  </p>
                  {audioFiles[index].file ? (
                    <p className="text-sm text-emerald-400 font-medium">
                      {audioFiles[index].name}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">
                      MP3 or WAV files only
                    </p>
                  )}
                </div>
              </div>
            </button>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {[0, 1].map((index) => (
          <div
            key={index}
            className="rounded-2xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/50 p-8"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <h3 className="text-xl font-bold text-white">
                Track {index + 1} Analysis
              </h3>
            </div>

            <div className="space-y-6">
              <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                <span className="text-sm text-slate-400 uppercase tracking-wider">
                  BPM
                </span>
                <span className="text-3xl font-bold text-white">
                  {audioFiles[index].bpm ?? '--'}
                </span>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-700/50">
                <span className="text-sm text-slate-400 uppercase tracking-wider">
                  Key
                </span>
                <span className="text-3xl font-bold text-white">
                  {audioFiles[index].key ?? '--'}
                </span>
              </div>

              <div className="flex justify-between items-center py-3">
                <span className="text-sm text-slate-400 uppercase tracking-wider">
                  Duration
                </span>
                <span className="text-3xl font-bold text-white">
                  {formatDuration(audioFiles[index].duration)}
                </span>
              </div>
            </div>

            {!audioFiles[index].file && (
              <div className="mt-6 text-center">
                <p className="text-sm text-slate-500 italic">
                  Upload a file to see analysis
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
