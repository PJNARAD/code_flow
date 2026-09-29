/**
 * CodeFlow Graph - Console Output Panel
 * Output semantics: Natural Green text stream
 */

import React, { useRef, useEffect } from 'react';
import { Terminal, Copy, Check } from 'lucide-react';

interface ConsolePanelProps {
  output: string[];
  isLight?: boolean;
}

export const ConsolePanel: React.FC<ConsolePanelProps> = ({ output, isLight = false }) => {
  const [copied, setCopied] = React.useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  const handleCopy = () => {
    navigator.clipboard.writeText(output.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`flex flex-col h-full select-none overflow-hidden font-mono text-xs transition-colors ${
        isLight ? 'bg-[#fcfbf9] text-stone-800' : 'bg-[#12141a] text-stone-200'
      }`}
    >
      {/* Header */}
      <div
        className={`h-8 border-b px-3 flex items-center justify-between shrink-0 ${
          isLight ? 'bg-stone-50 border-stone-200/90' : 'bg-stone-900/60 border-stone-800/80'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-green-600 dark:text-green-500" />
          <span className="text-[11px] font-semibold font-mono uppercase tracking-wider text-stone-400">
            Standard Output
          </span>
          <span className="text-[10px] text-stone-500">
            ({output.length} line{output.length === 1 ? '' : 's'})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            disabled={output.length === 0}
            className={`text-[10px] px-1.5 py-0.2 rounded disabled:opacity-30 transition-colors flex items-center gap-1 cursor-pointer border ${
              isLight
                ? 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                : 'bg-stone-850 border-stone-750 text-stone-400 hover:text-stone-200'
            }`}
          >
            {copied ? <Check className="w-2.5 h-2.5 text-green-600 dark:text-green-400" /> : <Copy className="w-2.5 h-2.5" />}
            <span>Copy</span>
          </button>
        </div>
      </div>

      {/* Terminal Stream */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1 font-mono leading-relaxed text-xs">
        {output.length === 0 ? (
          <div className="text-stone-500 italic text-[11px]">
            Program has produced no standard output yet.
          </div>
        ) : (
          output.map((line, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="text-stone-500 select-none tabular-nums text-[10px] pt-0.5">
                {idx + 1}
              </span>
              <span
                className={`whitespace-pre-wrap font-mono ${
                  isLight ? 'text-green-700 font-medium' : 'text-green-400'
                }`}
              >
                {line}
              </span>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>
    </div>
  );
};
