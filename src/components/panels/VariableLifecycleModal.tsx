/**
 * CodeFlow Graph - Variable Lifecycle & History Inspector Drawer
 * Spectrum palette semantics
 */

import React from 'react';
import {
  X,
  Sliders,
  ArrowRight,
  Clock,
} from 'lucide-react';
import { VariableLifecycle } from '../../types/codeflow.ts';
import { formatVal } from '../../engine/executor/evaluator.ts';

interface VariableLifecycleModalProps {
  lifecycle?: VariableLifecycle;
  onClose: () => void;
  onJumpToStep: (stepIndex: number) => void;
}

export const VariableLifecycleModal: React.FC<VariableLifecycleModalProps> = ({
  lifecycle,
  onClose,
  onJumpToStep,
}) => {
  if (!lifecycle) return null;

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-stone-900 border border-stone-700/80 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="h-14 bg-stone-925 border-b border-stone-800 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono flex items-center gap-2">
                <span>Variable Lifecycle:</span>
                <span className="text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/80">
                  {lifecycle.varName}
                </span>
              </h2>
              <p className="text-[11px] text-stone-400 font-sans">
                Scope: {lifecycle.scope}() {lifecycle.varType ? `· Type: ${lifecycle.varType}` : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-stone-300">
          {/* Timeline Events */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-stone-200 font-mono flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>LIFECYCLE EVENTS ({lifecycle.events.length})</span>
            </h3>

            <div className="space-y-2 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-800">
              {lifecycle.events.length === 0 ? (
                <div className="text-stone-500 italic pl-6">No lifecycle events recorded.</div>
              ) : (
                lifecycle.events.map((evt, idx) => {
                  let badgeColor = 'bg-stone-800 text-stone-300 border-stone-700';
                  if (evt.type === 'DECLARED' || evt.type === 'INITIALIZED') {
                    badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-700/80';
                  } else if (evt.type === 'MODIFIED') {
                    badgeColor = 'bg-cyan-950/80 text-cyan-300 border-cyan-700/80';
                  } else if (evt.type === 'READ') {
                    badgeColor = 'bg-amber-950/80 text-amber-300 border-amber-700/80';
                  } else if (evt.type === 'RETURNED' || evt.type === 'PRINTED') {
                    badgeColor = 'bg-orange-950/80 text-orange-300 border-orange-700/80';
                  }

                  return (
                    <div key={idx} className="relative pl-7 group">
                      {/* Node Bullet */}
                      <div className="absolute left-2 top-2.5 w-3 h-3 rounded-full bg-stone-900 border-2 border-cyan-400 -translate-x-1/2" />

                      <div className="p-2.5 bg-stone-950/70 border border-stone-800/80 rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold border ${badgeColor}`}>
                            {evt.type}
                          </span>
                          <span className="text-[10px] font-mono text-stone-500">
                            Line {evt.line}
                          </span>
                        </div>

                        <div className="text-stone-300 font-sans text-xs">
                          {evt.description}
                        </div>

                        {evt.value !== undefined && (
                          <div className="font-mono text-xs text-teal-400 bg-stone-900 px-2 py-1 rounded border border-stone-800 flex items-center justify-between">
                            <span>Value: {formatVal(evt.value)}</span>
                            {evt.stepIndex !== undefined && (
                              <button
                                onClick={() => {
                                  onJumpToStep(evt.stepIndex!);
                                  onClose();
                                }}
                                className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                              >
                                <span>Go to Step #{evt.stepIndex}</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Historical Values Table */}
          {lifecycle.history.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-stone-800">
              <h3 className="text-xs font-bold text-stone-200 font-mono">
                VALUE EVOLUTION OVER TIME
              </h3>
              <div className="bg-stone-950/80 border border-stone-800 rounded-lg overflow-hidden font-mono text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-stone-900 border-b border-stone-800 text-[10px] text-stone-400 uppercase">
                      <th className="p-2">Step</th>
                      <th className="p-2">Line</th>
                      <th className="p-2">Value</th>
                      <th className="p-2">Change</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lifecycle.history.map((hist, i) => (
                      <tr
                        key={i}
                        onClick={() => {
                          onJumpToStep(hist.stepIndex);
                          onClose();
                        }}
                        className="border-b border-stone-800/50 hover:bg-stone-850 cursor-pointer transition-colors"
                      >
                        <td className="p-2 text-cyan-400 font-bold">#{hist.stepIndex}</td>
                        <td className="p-2 text-stone-400">L{hist.line}</td>
                        <td className="p-2 text-teal-400 font-semibold">{formatVal(hist.value)}</td>
                        <td className="p-2 text-stone-400 text-[11px]">{hist.changeExpr || '─'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-12 bg-stone-925 border-t border-stone-800 px-5 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
