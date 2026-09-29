/**
 * CodeFlow Graph - Timeline Scrubber Component
 * Natural progression along the spectrum:
 * DEEP RED → RED → ORANGE → GOLD/YELLOW → YELLOW-GREEN → GREEN → TEAL → CYAN
 */

import React from 'react';
import { ExecutionStep } from '../../types/codeflow.ts';
import { Activity, GitFork, Repeat, FunctionSquare, Terminal } from 'lucide-react';
import { getSpectrumColor } from '../graph/GraphCanvas.tsx';

interface TimelineScrubberProps {
  steps: ExecutionStep[];
  currentStepIndex: number;
  onSelectStep: (stepIndex: number) => void;
  isLight?: boolean;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  steps,
  currentStepIndex,
  onSelectStep,
  isLight = false,
}) => {
  if (steps.length <= 1) return null;

  return (
    <div
      className={`h-9 border-t px-3 flex items-center gap-3 shrink-0 select-none transition-colors ${
        isLight
          ? 'bg-[#fcfbf9] border-stone-200/90 text-stone-800'
          : 'bg-[#12141a] border-stone-800/80 text-stone-200'
      }`}
    >
      <div className="flex items-center gap-1.5 text-[11px] text-stone-400 font-mono shrink-0">
        <Activity className="w-3.5 h-3.5 text-amber-500" />
        <span className="hidden sm:inline">TIMELINE</span>
      </div>

      {/* Timeline Track with Spectrum Progression */}
      <div className="relative flex-1 flex items-center h-6 overflow-x-auto py-0.5 gap-1 custom-scrollbar">
        {steps.map((step, idx) => {
          const isActive = idx === currentStepIndex;
          const ratio = idx / Math.max(1, steps.length - 1);
          const spectrumColor = getSpectrumColor(ratio);

          const isCondition = !!step.conditionEval;
          const isLoop = !!step.loopEval;
          const isCall = !!step.functionCall;
          const isOutput = !!step.newOutput;

          return (
            <button
              key={idx}
              onClick={() => onSelectStep(idx)}
              title={`Step ${idx}: ${step.actionSummary} (Line ${step.line})`}
              style={{
                borderColor: isActive ? '#f59e0b' : `${spectrumColor}55`,
                backgroundColor: isActive
                  ? '#f59e0b'
                  : isLight
                  ? `${spectrumColor}14`
                  : `${spectrumColor}22`,
                color: isActive ? '#1c1917' : spectrumColor,
              }}
              className={`h-5 min-w-[20px] px-1 rounded flex items-center justify-center text-[9.5px] font-mono cursor-pointer transition-all shrink-0 border ${
                isActive
                  ? 'font-bold ring-2 ring-amber-400/50 shadow-xs scale-105 z-10'
                  : 'hover:scale-105 hover:opacity-100 opacity-85'
              }`}
            >
              {isCondition ? (
                <GitFork className="w-2.5 h-2.5" />
              ) : isLoop ? (
                <Repeat className="w-2.5 h-2.5" />
              ) : isCall ? (
                <FunctionSquare className="w-2.5 h-2.5" />
              ) : isOutput ? (
                <Terminal className="w-2.5 h-2.5" />
              ) : (
                <span>{idx}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="text-[10.5px] font-mono text-stone-400 shrink-0">
        Step <span className="text-amber-500 font-bold">{currentStepIndex}</span> of{' '}
        {steps.length - 1}
      </div>
    </div>
  );
};
