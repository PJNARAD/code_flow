/**
 * CodeFlow Graph - Helpful Empty State View
 */

import React from 'react';
import { Network } from 'lucide-react';
import { SAMPLE_PROGRAMS } from '../../samples/samplePrograms.ts';

interface EmptyStateViewProps {
  onSelectSample: (sampleId: string) => void;
}

export const EmptyStateView: React.FC<EmptyStateViewProps> = ({ onSelectSample }) => {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none bg-[#101216]">
      <div className="max-w-md w-full space-y-5">
        {/* Icon & Title */}
        <div className="space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg">
            <Network className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-white font-mono">
            Paste Code to Build Flow Graph
          </h2>
          <p className="text-xs text-stone-400 font-sans leading-relaxed">
            Enter your source code in C, C++, Python, Java, or JavaScript. The system will automatically detect the language, analyze control & data flows, and build an interactive execution graph.
          </p>
        </div>

        {/* Quick Sample Cards */}
        <div className="space-y-2 text-left">
          <div className="text-[11px] font-mono text-stone-400 uppercase tracking-wider text-center">
            Or try an algorithm example:
          </div>

          <div className="grid grid-cols-2 gap-2">
            {SAMPLE_PROGRAMS.slice(0, 6).map(sample => (
              <button
                key={sample.id}
                onClick={() => onSelectSample(sample.id)}
                className="p-2.5 rounded-xl bg-stone-900/90 border border-stone-800 hover:border-amber-500/50 hover:bg-stone-850 transition-all text-left group cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-stone-200 group-hover:text-amber-400 transition-colors">
                    {sample.title.split(':')[1]?.trim() || sample.title}
                  </span>
                  <span className="text-[9px] font-mono text-stone-500 uppercase">
                    {sample.language}
                  </span>
                </div>
                <div className="text-[10px] text-stone-400 font-sans line-clamp-1">
                  {sample.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
