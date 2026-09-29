/**
 * CodeFlow Graph - Call Stack Inspector Panel
 * Function semantics: Red-Orange / Amber frame levels
 */

import React from 'react';
import { ExecutionStep } from '../../types/codeflow.ts';
import { Layers } from 'lucide-react';
import { formatVal } from '../../engine/executor/evaluator.ts';

interface CallStackPanelProps {
  activeStep?: ExecutionStep;
  isLight?: boolean;
}

export const CallStackPanel: React.FC<CallStackPanelProps> = ({ activeStep, isLight = false }) => {
  const callStack = activeStep?.callStack || [];

  return (
    <div
      className={`flex flex-col h-full border-r select-none overflow-hidden transition-colors ${
        isLight
          ? 'bg-[#fcfbf9] border-stone-200/90 text-stone-800'
          : 'bg-[#12141a] border-stone-800/80 text-stone-100'
      }`}
    >
      {/* Header */}
      <div
        className={`h-8 border-b px-3 flex items-center justify-between shrink-0 ${
          isLight ? 'bg-stone-50 border-stone-200/90' : 'bg-stone-900/60 border-stone-800/80'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-[11px] font-semibold font-mono uppercase tracking-wider text-stone-400">
            Call Stack ({callStack.length})
          </span>
        </div>
        {callStack.length > 1 && (
          <span
            className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded border ${
              isLight
                ? 'bg-orange-50 text-orange-800 border-orange-200'
                : 'bg-orange-950/50 text-orange-300 border-orange-800/60'
            }`}
          >
            Depth: {callStack.length - 1}
          </span>
        )}
      </div>

      {/* Stack Frames List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {callStack.length === 0 ? (
          <div className="h-full flex items-center justify-center text-stone-500 text-xs font-mono">
            Stack empty
          </div>
        ) : (
          [...callStack].reverse().map((frame, reverseIdx) => {
            const isTop = reverseIdx === 0;
            const argEntries = Object.entries(frame.args);

            return (
              <div
                key={frame.id || reverseIdx}
                className={`p-2 rounded-lg border transition-all ${
                  isTop
                    ? isLight
                      ? 'bg-orange-50/80 border-orange-300 shadow-2xs'
                      : 'bg-orange-950/35 border-orange-500/50 shadow-2xs'
                    : isLight
                    ? 'bg-white border-stone-200/90 opacity-80'
                    : 'bg-stone-900/70 border-stone-800 opacity-75'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
                    <span className="text-orange-500 text-[10px]">{isTop ? '▶' : '·'}</span>
                    <span>{frame.functionName}()</span>
                  </div>
                  <span className="text-[9.5px] font-mono text-stone-500">
                    frame #{frame.depth}
                  </span>
                </div>

                {argEntries.length > 0 && (
                  <div className="mt-1 pt-1 border-t border-stone-750/40 space-y-0.5">
                    <div className="text-[9.5px] font-mono text-stone-400">Parameters:</div>
                    <div className="flex flex-wrap gap-1">
                      {argEntries.map(([k, v]) => (
                        <span
                          key={k}
                          className={`font-mono text-[10px] px-1 py-0.2 rounded border ${
                            isLight
                              ? 'bg-stone-100 border-stone-200 text-orange-800'
                              : 'bg-stone-950 border-stone-800 text-orange-300'
                          }`}
                        >
                          {k} = {formatVal(v)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
