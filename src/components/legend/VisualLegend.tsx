/**
 * CodeFlow Graph - Visual Legend Component
 * Natural Spectrum Palette Reference:
 * START (Deep Green) · END (Deep Red) · VARIABLE (Cyan) · EXPRESSION (Yellow)
 * CONDITION (Orange) · LOOP (Yellow-Green) · FUNCTION (Red-Orange) · OUTPUT (Green)
 */

import React from 'react';
import {
  Info,
  ChevronUp,
} from 'lucide-react';

interface VisualLegendProps {
  isOpen: boolean;
  onToggle: () => void;
  isLight?: boolean;
}

export const VisualLegend: React.FC<VisualLegendProps> = ({ isOpen, onToggle, isLight = false }) => {
  if (!isOpen) return null;

  return (
    <div
      className={`absolute top-12 left-3 z-40 w-72 rounded-xl border shadow-xl p-3 select-none backdrop-blur-md transition-all ${
        isLight
          ? 'bg-white/95 border-stone-200 text-stone-800'
          : 'bg-stone-900/95 border-stone-800 text-stone-200'
      }`}
    >
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-750/50">
        <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-amber-500">
          <Info className="w-3.5 h-3.5" />
          <span>GRAPH VISUAL LEGEND</span>
        </div>
        <button
          onClick={onToggle}
          className="text-stone-400 hover:text-stone-200 p-0.5 rounded cursor-pointer"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3 text-xs">
        {/* Node Categories */}
        <div>
          <div className="text-[10px] font-mono text-stone-400 uppercase tracking-wider mb-1.5">
            Node Semantics (Natural Spectrum)
          </div>
          <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
            <div
              className={`flex items-center gap-1.5 p-1 rounded border ${
                isLight ? 'bg-stone-50 border-emerald-500/30' : 'bg-stone-950/40 border-emerald-500/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#15803d]" />
              <span>Start</span>
            </div>
            <div
              className={`flex items-center gap-1.5 p-1 rounded border ${
                isLight ? 'bg-stone-50 border-rose-500/30' : 'bg-stone-950/40 border-rose-500/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#b91c1c]" />
              <span>End</span>
            </div>
            <div
              className={`flex items-center gap-1.5 p-1 rounded border ${
                isLight ? 'bg-stone-50 border-cyan-500/30' : 'bg-stone-950/40 border-cyan-500/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#0891b2]" />
              <span>Variable</span>
            </div>
            <div
              className={`flex items-center gap-1.5 p-1 rounded border ${
                isLight ? 'bg-stone-50 border-yellow-500/30' : 'bg-stone-950/40 border-yellow-500/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#ca8a04]" />
              <span>Expression</span>
            </div>
            <div
              className={`flex items-center gap-1.5 p-1 rounded border ${
                isLight ? 'bg-stone-50 border-orange-500/30' : 'bg-stone-950/40 border-orange-500/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#ea580c]" />
              <span>Condition</span>
            </div>
            <div
              className={`flex items-center gap-1.5 p-1 rounded border ${
                isLight ? 'bg-stone-50 border-lime-500/30' : 'bg-stone-950/40 border-lime-500/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#65a30d]" />
              <span>Loop</span>
            </div>
            <div
              className={`flex items-center gap-1.5 p-1 rounded border ${
                isLight ? 'bg-stone-50 border-orange-600/30' : 'bg-stone-950/40 border-orange-600/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#c2410c]" />
              <span>Function</span>
            </div>
            <div
              className={`flex items-center gap-1.5 p-1 rounded border ${
                isLight ? 'bg-stone-50 border-teal-500/30' : 'bg-stone-950/40 border-teal-500/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#0d9488]" />
              <span>Input</span>
            </div>
            <div
              className={`flex items-center gap-1.5 p-1 rounded border ${
                isLight ? 'bg-stone-50 border-green-500/30' : 'bg-stone-950/40 border-green-500/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#16a34a]" />
              <span>Output (I/O)</span>
            </div>
            <div
              className={`flex items-center gap-1.5 p-1 rounded border ${
                isLight ? 'bg-stone-50 border-red-500/30' : 'bg-stone-950/40 border-red-500/30'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#dc2626]" />
              <span>Error</span>
            </div>
          </div>
        </div>

        {/* Edge Styles */}
        <div>
          <div className="text-[10px] font-mono text-stone-400 uppercase tracking-wider mb-1.5">
            Edge Relationships & Execution Flow
          </div>
          <div className="space-y-1 font-mono text-[10px]">
            <div
              className={`flex items-center justify-between p-1 rounded ${
                isLight ? 'bg-stone-100/80' : 'bg-stone-950/40'
              }`}
            >
              <span className="text-stone-400">Control Flow</span>
              <span className="text-stone-500 font-bold">──► Solid Line</span>
            </div>
            <div
              className={`flex items-center justify-between p-1 rounded ${
                isLight ? 'bg-stone-100/80' : 'bg-stone-950/40'
              }`}
            >
              <span className="text-amber-500 font-medium">Active Execution</span>
              <span className="text-amber-500 font-bold">──► Bright Gold + Pulse</span>
            </div>
            <div
              className={`flex items-center justify-between p-1 rounded ${
                isLight ? 'bg-stone-100/80' : 'bg-stone-950/40'
              }`}
            >
              <span className="text-green-600 dark:text-green-400 font-medium">Branch TRUE</span>
              <span className="text-green-600 dark:text-green-400 font-bold">──► Green</span>
            </div>
            <div
              className={`flex items-center justify-between p-1 rounded ${
                isLight ? 'bg-stone-100/80' : 'bg-stone-950/40'
              }`}
            >
              <span className="text-red-500 font-medium">Branch FALSE</span>
              <span className="text-red-500 font-bold">──► Red</span>
            </div>
            <div
              className={`flex items-center justify-between p-1 rounded ${
                isLight ? 'bg-stone-100/80' : 'bg-stone-950/40'
              }`}
            >
              <span className="text-lime-600 dark:text-lime-400 font-medium">Loop Repeat</span>
              <span className="text-lime-600 dark:text-lime-400 font-bold">⤹ Yellow-Green</span>
            </div>
            <div
              className={`flex items-center justify-between p-1 rounded ${
                isLight ? 'bg-stone-100/80' : 'bg-stone-950/40'
              }`}
            >
              <span className="text-cyan-600 dark:text-cyan-400 font-medium">Data Flow</span>
              <span className="text-cyan-600 dark:text-cyan-400 font-bold">- - - Dashed Cyan</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
