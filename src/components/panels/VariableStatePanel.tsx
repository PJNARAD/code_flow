/**
 * CodeFlow Graph - Variable State & Memory Inspector Panel
 * Spectrum-inspired subtle highlights (Gold/Amber on change → Teal/Cyan data flow)
 */

import React from 'react';
import { ExecutionStep, VariableLifecycle } from '../../types/codeflow.ts';
import { Database, ArrowRight, Clock } from 'lucide-react';
import { formatVal } from '../../engine/executor/evaluator.ts';

interface VariableStatePanelProps {
  activeStep?: ExecutionStep;
  lifecycles?: Record<string, VariableLifecycle>;
  onInspectLifecycle: (varName: string) => void;
  isLight?: boolean;
}

export const VariableStatePanel: React.FC<VariableStatePanelProps> = ({
  activeStep,
  lifecycles = {},
  onInspectLifecycle,
  isLight = false,
}) => {
  const activeFrame = activeStep?.callStack?.[activeStep.callStack.length - 1];
  const localVars = activeFrame?.localVars || {};
  const globalVars = activeStep?.variables || {};
  const changes = activeStep?.variableChanges || [];

  const changeMap = new Map<string, { from: any; to: any; expr?: string }>();
  changes.forEach(c => changeMap.set(c.varName, c));

  const allVarNames = Array.from(
    new Set([...Object.keys(localVars), ...Object.keys(globalVars)])
  );

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
          <Database className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          <span className="text-[11px] font-semibold font-mono uppercase tracking-wider text-stone-400">
            Variables & Memory
          </span>
        </div>
        {activeFrame && (
          <span
            className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded border ${
              isLight
                ? 'bg-teal-50 text-teal-800 border-teal-200'
                : 'bg-teal-950/50 text-teal-300 border-teal-800/60'
            }`}
          >
            Scope: {activeFrame.functionName}()
          </span>
        )}
      </div>

      {/* Variables List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {allVarNames.length === 0 ? (
          <div className="h-full flex items-center justify-center text-stone-500 text-xs font-mono">
            No active variables
          </div>
        ) : (
          allVarNames.map(varName => {
            const val =
              localVars[varName] !== undefined ? localVars[varName] : globalVars[varName];
            const change = changeMap.get(varName);
            const isArray = Array.isArray(val);

            return (
              <div
                key={varName}
                className={`p-2 rounded-lg border transition-all duration-200 ${
                  change
                    ? isLight
                      ? 'bg-amber-50/90 border-amber-300 shadow-2xs'
                      : 'bg-amber-950/30 border-amber-500/50 shadow-2xs'
                    : isLight
                    ? 'bg-white border-stone-200/90 hover:border-stone-300'
                    : 'bg-stone-900/70 border-stone-800 hover:border-stone-700'
                }`}
              >
                {/* Header Row with Lifecycle Button */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-mono text-xs font-bold ${
                        isLight ? 'text-stone-800' : 'text-stone-200'
                      }`}
                    >
                      {varName}
                    </span>
                    <span className="text-[9.5px] font-mono text-stone-500">
                      {isArray ? `Array[${val.length}]` : typeof val}
                    </span>
                  </div>

                  <button
                    onClick={() => onInspectLifecycle(varName)}
                    title={`Inspect full lifecycle & history of '${varName}'`}
                    className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                      isLight
                        ? 'bg-stone-100 text-stone-600 border-stone-200 hover:bg-stone-200'
                        : 'bg-stone-850 text-stone-400 border-stone-750 hover:text-cyan-300'
                    }`}
                  >
                    <Clock className="w-2.5 h-2.5" />
                    <span>Lifecycle</span>
                  </button>
                </div>

                {/* Value or Array Cells */}
                {isArray ? (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {val.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className={`flex flex-col items-center rounded px-1.5 py-0.5 min-w-[26px] border ${
                          isLight
                            ? 'bg-stone-100 border-stone-200'
                            : 'bg-stone-950 border-stone-800'
                        }`}
                      >
                        <span className="text-[8.5px] font-mono text-stone-500">[{idx}]</span>
                        <span className="font-mono text-[11px] font-semibold text-teal-600 dark:text-teal-400 tabular-nums">
                          {formatVal(item)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-between font-mono text-xs">
                    {change ? (
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-stone-500 line-through">
                          {formatVal(change.from)}
                        </span>
                        <ArrowRight className="w-3 h-3 text-amber-500" />
                        <span className="font-bold text-teal-600 dark:text-teal-300">
                          {formatVal(change.to)}
                        </span>
                        {change.expr && (
                          <span className="text-[9.5px] text-stone-400 ml-1">
                            ({change.expr})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="font-semibold tabular-nums text-stone-300">
                        {formatVal(val)}
                      </span>
                    )}
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
