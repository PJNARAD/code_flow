/**
 * CodeFlow Graph - Educational Guide & Architecture Modal
 * Natural Spectrum Color System Reference
 */

import React from 'react';
import {
  X,
  Network,
  PlayCircle,
  GitFork,
  Repeat,
  FunctionSquare,
  Sliders,
  Terminal,
  Calculator,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-stone-900 border border-stone-700/80 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="h-14 bg-stone-925 border-b border-stone-800 px-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Network className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono">
                CodeFlow Graph Reference & Guide
              </h2>
              <p className="text-[11px] text-stone-400">
                Understanding Program Flow, Data Flow, and Dynamic Execution
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-stone-300">
          {/* Section 1: Core Concept */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-amber-400 font-mono flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              1. Dynamic Program Execution Graph
            </h3>
            <p className="text-stone-300 leading-relaxed font-sans">
              CodeFlow Graph statically parses your real source code into a Normalized Intermediate Representation (NIR), computes the Control Flow Graph (CFG) and Data Flow dependencies, and executes the program deterministically step-by-step with an immutable execution trace.
            </p>
          </div>

          {/* Section 2: Node Categories Legend */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-stone-200 font-mono">
              2. Graph Node Categories & Palette Spectrum
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
              <div className="bg-stone-950/70 border border-stone-800 p-2 rounded-lg flex items-center gap-2">
                <PlayCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <div className="font-bold text-stone-200">START / END</div>
                  <div className="text-[10px] text-stone-400 font-sans">Entry (Deep Green) & Termination (Deep Red)</div>
                </div>
              </div>

              <div className="bg-stone-950/70 border border-stone-800 p-2 rounded-lg flex items-center gap-2">
                <GitFork className="w-4 h-4 text-orange-500 shrink-0" />
                <div>
                  <div className="font-bold text-stone-200">CONDITION</div>
                  <div className="text-[10px] text-stone-400 font-sans">Decision branch (Orange)</div>
                </div>
              </div>

              <div className="bg-stone-950/70 border border-stone-800 p-2 rounded-lg flex items-center gap-2">
                <Repeat className="w-4 h-4 text-lime-500 shrink-0" />
                <div>
                  <div className="font-bold text-stone-200">LOOP</div>
                  <div className="text-[10px] text-stone-400 font-sans">Iteration & feedback flow (Yellow-Green)</div>
                </div>
              </div>

              <div className="bg-stone-950/70 border border-stone-800 p-2 rounded-lg flex items-center gap-2">
                <FunctionSquare className="w-4 h-4 text-orange-600 shrink-0" />
                <div>
                  <div className="font-bold text-stone-200">FUNCTION & CALL</div>
                  <div className="text-[10px] text-stone-400 font-sans">Subroutine invocation (Red-Orange)</div>
                </div>
              </div>

              <div className="bg-stone-950/70 border border-stone-800 p-2 rounded-lg flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-500 shrink-0" />
                <div>
                  <div className="font-bold text-stone-200">VARIABLE & DATA</div>
                  <div className="text-[10px] text-stone-400 font-sans">Declarations & state (Cyan / Teal)</div>
                </div>
              </div>

              <div className="bg-stone-950/70 border border-stone-800 p-2 rounded-lg flex items-center gap-2">
                <Calculator className="w-4 h-4 text-yellow-500 shrink-0" />
                <div>
                  <div className="font-bold text-stone-200">EXPRESSION</div>
                  <div className="text-[10px] text-stone-400 font-sans">Calculations & evaluations (Yellow)</div>
                </div>
              </div>

              <div className="bg-stone-950/70 border border-stone-800 p-2 rounded-lg flex items-center gap-2">
                <Terminal className="w-4 h-4 text-green-500 shrink-0" />
                <div>
                  <div className="font-bold text-stone-200">OUTPUT (I/O)</div>
                  <div className="text-[10px] text-stone-400 font-sans">Standard print streams (Green)</div>
                </div>
              </div>

              <div className="bg-stone-950/70 border border-stone-800 p-2 rounded-lg flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                <div>
                  <div className="font-bold text-stone-200">ERROR</div>
                  <div className="text-[10px] text-stone-400 font-sans">Syntax diagnostics (Red)</div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Interactive Graph Controls */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-stone-200 font-mono">
              3. Interactive Navigation & Synchronization
            </h3>
            <ul className="space-y-1.5 list-disc list-inside text-stone-300 font-sans text-xs">
              <li><strong className="text-white font-mono">Zoom & Pan:</strong> Scroll mouse wheel to zoom in/out, drag background to pan.</li>
              <li><strong className="text-white font-mono">Node Dragging:</strong> Drag any node to reposition or pin in the layout.</li>
              <li><strong className="text-white font-mono">Node Selection:</strong> Click a node to highlight its connected paths and sync the corresponding line in the editor.</li>
              <li><strong className="text-white font-mono">Time-Travel Stepper:</strong> Step forward, step back, auto-play, or click anywhere on the timeline scrubber to jump between execution states.</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="h-12 bg-stone-925 border-t border-stone-800 px-5 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
