/**
 * CodeFlow Graph - Step Intelligence & Explanation Panel
 * Linear-inspired inspector with natural palette spectrum sections
 */

import React from 'react';
import { ExecutionStep, GraphNode } from '../../types/codeflow.ts';
import {
  Sparkles,
  ArrowRight,
  Calculator,
  Database,
  HelpCircle,
  Code2,
  ArrowDownCircle,
  Cpu,
} from 'lucide-react';

interface ExplanationPanelProps {
  activeStep?: ExecutionStep;
  selectedNode?: GraphNode;
  totalSteps: number;
  isLight?: boolean;
}

export const ExplanationPanel: React.FC<ExplanationPanelProps> = ({
  activeStep,
  selectedNode,
  totalSteps,
  isLight = false,
}) => {
  const explanation = activeStep?.explanation;

  return (
    <div
      className={`flex flex-col h-full border-l select-none overflow-hidden transition-colors ${
        isLight
          ? 'bg-[#fcfbf9] border-stone-200/90 text-stone-800'
          : 'bg-[#12141a] border-stone-800/80 text-stone-100'
      }`}
    >
      {/* Panel Header */}
      <div
        className={`h-9 border-b px-3 flex items-center justify-between shrink-0 ${
          isLight ? 'bg-stone-50 border-stone-200/90' : 'bg-stone-900/60 border-stone-800/80'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[11px] font-semibold font-mono uppercase tracking-wider text-stone-400">
            Step Intelligence
          </span>
        </div>
        {activeStep && (
          <span
            className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
              isLight
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-amber-950/50 text-amber-400 border-amber-800/60'
            }`}
          >
            Step {activeStep.stepIndex} of {Math.max(0, totalSteps - 1)}
          </span>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
        {activeStep && explanation ? (
          <>
            {/* Current Instruction Line */}
            <div
              className={`border rounded-lg p-2.5 ${
                isLight
                  ? 'bg-white border-stone-200 shadow-2xs'
                  : 'bg-stone-900/80 border-stone-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between text-[10.5px] font-mono text-stone-400 uppercase mb-1">
                <span>Active Instruction</span>
                <span className="text-amber-500 font-bold">Line {activeStep.line}</span>
              </div>
              <div
                className={`font-mono text-xs font-semibold px-2 py-1 rounded border break-all ${
                  isLight
                    ? 'bg-stone-100 text-stone-800 border-stone-200'
                    : 'bg-stone-950 text-stone-100 border-stone-800'
                }`}
              >
                {activeStep.codeSnippet}
              </div>
            </div>

            {/* WHAT Card */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400 font-mono font-bold text-[10.5px] uppercase tracking-wider">
                <HelpCircle className="w-3 h-3" />
                <span>WHAT</span>
              </div>
              <div
                className={`p-2 rounded-md border font-sans text-xs leading-relaxed ${
                  isLight
                    ? 'bg-white border-stone-200 text-stone-700'
                    : 'bg-stone-900/60 border-stone-800/80 text-stone-200'
                }`}
              >
                {explanation.what || explanation.whatHappens}
              </div>
            </div>

            {/* WHY Card */}
            {explanation.why && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-mono font-bold text-[10.5px] uppercase tracking-wider">
                  <Cpu className="w-3 h-3" />
                  <span>WHY</span>
                </div>
                <div
                  className={`p-2 rounded-md border font-sans text-xs leading-relaxed ${
                    isLight
                      ? 'bg-white border-stone-200 text-stone-700'
                      : 'bg-stone-900/60 border-stone-800/80 text-stone-200'
                  }`}
                >
                  {explanation.why}
                </div>
              </div>
            )}

            {/* INPUT Card */}
            {explanation.input && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-mono font-bold text-[10.5px] uppercase tracking-wider">
                  <Database className="w-3 h-3" />
                  <span>INPUT VARIABLES</span>
                </div>
                <div
                  className={`p-2 rounded-md border font-mono text-xs break-all ${
                    isLight
                      ? 'bg-white border-stone-200 text-teal-900'
                      : 'bg-stone-900/60 border-stone-800/80 text-teal-300'
                  }`}
                >
                  {explanation.input}
                </div>
              </div>
            )}

            {/* CALCULATION Card */}
            {explanation.calculation && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-mono font-bold text-[10.5px] uppercase tracking-wider">
                  <Calculator className="w-3 h-3" />
                  <span>CALCULATION & EVALUATION</span>
                </div>
                <div
                  className={`p-2 rounded-md border font-mono text-xs break-all ${
                    isLight
                      ? 'bg-white border-stone-200 text-amber-900'
                      : 'bg-stone-900/60 border-stone-800/80 text-amber-300'
                  }`}
                >
                  {explanation.calculation}
                </div>
              </div>
            )}

            {/* OUTPUT / STATE MUTATION Card */}
            {explanation.output && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-mono font-bold text-[10.5px] uppercase tracking-wider">
                  <ArrowDownCircle className="w-3 h-3" />
                  <span>OUTPUT & STATE MUTATION</span>
                </div>
                <div
                  className={`p-2 rounded-md border font-mono text-xs break-all ${
                    isLight
                      ? 'bg-white border-stone-200 text-green-900'
                      : 'bg-stone-900/60 border-stone-800/80 text-green-300'
                  }`}
                >
                  {explanation.output}
                </div>
              </div>
            )}

            {/* NEXT Action */}
            <div className="space-y-1 pt-1.5 border-t border-stone-800/60">
              <div className="flex items-center gap-1.5 text-stone-400 font-mono font-bold text-[10.5px] uppercase tracking-wider">
                <ArrowRight className="w-3 h-3 text-amber-500" />
                <span>NEXT ACTION</span>
              </div>
              <div className="text-stone-400 text-xs font-sans leading-relaxed">
                {explanation.next}
              </div>
            </div>
          </>
        ) : selectedNode ? (
          <div className="space-y-3">
            <div className="text-stone-400 text-[10.5px] uppercase tracking-wider font-mono">
              Inspecting Graph Node
            </div>
            <div
              className={`border p-2.5 rounded-lg space-y-2 ${
                isLight
                  ? 'bg-white border-stone-200 shadow-2xs'
                  : 'bg-stone-900/80 border-stone-800 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-amber-500 font-bold">
                  {selectedNode.type}
                </span>
                <span className="text-[10px] font-mono text-stone-500">
                  Line {selectedNode.lineStart}
                </span>
              </div>
              <div
                className={`font-mono text-xs p-2 rounded border ${
                  isLight
                    ? 'bg-stone-100 border-stone-200 text-stone-800'
                    : 'bg-stone-950 border-stone-800 text-stone-200'
                }`}
              >
                {selectedNode.codeSnippet}
              </div>
              {selectedNode.subLabel && (
                <div className="text-xs text-stone-400 font-sans">{selectedNode.subLabel}</div>
              )}
            </div>
            <p className="text-stone-400 text-xs leading-relaxed">
              Click <strong className="text-amber-500 font-semibold">Step</strong> or{' '}
              <strong className="text-amber-500 font-semibold">Auto Play</strong> in the top
              bar to trace execution flow through this node.
            </p>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-stone-500 space-y-2">
            <Code2 className="w-7 h-7 text-stone-600" />
            <p className="text-xs">Press Step or Auto Play to begin tracing execution flow.</p>
          </div>
        )}
      </div>
    </div>
  );
};
