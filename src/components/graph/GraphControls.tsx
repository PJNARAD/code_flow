/**
 * CodeFlow Graph - Floating Graph Controls Toolbar
 */

import React from 'react';
import { ZoomIn, ZoomOut, Maximize2, Crosshair } from 'lucide-react';

interface GraphControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitGraph: () => void;
  onCenterActiveNode: () => void;
  activeFilter: 'ALL' | 'CONTROL' | 'DATA' | 'EXECUTION_PATH' | 'FUNCTIONS' | 'VARIABLES';
  onFilterChange: (filter: 'ALL' | 'CONTROL' | 'DATA' | 'EXECUTION_PATH' | 'FUNCTIONS' | 'VARIABLES') => void;
  isLight?: boolean;
}

export const GraphControls: React.FC<GraphControlsProps> = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onFitGraph,
  onCenterActiveNode,
  activeFilter,
  onFilterChange,
  isLight = false,
}) => {
  return (
    <div className="flex items-center gap-2 select-none">
      {/* Filter Segmented Control */}
      <div
        className={`flex items-center rounded-lg p-0.5 shadow-md border text-xs transition-colors duration-200 ${
          isLight
            ? 'bg-white/95 border-stone-200 text-stone-700'
            : 'bg-stone-900/95 border-stone-800 text-stone-300'
        }`}
      >
        <button
          onClick={() => onFilterChange('ALL')}
          className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
            activeFilter === 'ALL'
              ? isLight
                ? 'bg-stone-100 text-stone-900 font-semibold shadow-2xs'
                : 'bg-stone-800 text-amber-400 font-semibold shadow-2xs'
              : 'text-stone-400 hover:text-stone-200'
          }`}
          title="Show all control flow, data dependencies, and function calls"
        >
          All
        </button>
        <button
          onClick={() => onFilterChange('CONTROL')}
          className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
            activeFilter === 'CONTROL'
              ? isLight
                ? 'bg-stone-100 text-stone-900 font-semibold shadow-2xs'
                : 'bg-stone-800 text-amber-400 font-semibold shadow-2xs'
              : 'text-stone-400 hover:text-stone-200'
          }`}
          title="Show primary control flow only"
        >
          Control Flow
        </button>
        <button
          onClick={() => onFilterChange('DATA')}
          className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
            activeFilter === 'DATA'
              ? isLight
                ? 'bg-stone-100 text-stone-900 font-semibold shadow-2xs'
                : 'bg-stone-800 text-amber-400 font-semibold shadow-2xs'
              : 'text-stone-400 hover:text-stone-200'
          }`}
          title="Show variable dependencies & data flow"
        >
          Data Flow
        </button>
        <button
          onClick={() => onFilterChange('EXECUTION_PATH')}
          className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
            activeFilter === 'EXECUTION_PATH'
              ? isLight
                ? 'bg-stone-100 text-amber-800 font-semibold shadow-2xs'
                : 'bg-stone-800 text-amber-400 font-semibold shadow-2xs'
              : 'text-stone-400 hover:text-stone-200'
          }`}
          title="Highlight active execution trace path"
        >
          Trace
        </button>
      </div>

      {/* Zoom / View controls */}
      <div
        className={`flex items-center rounded-lg p-0.5 shadow-md border transition-colors duration-200 ${
          isLight
            ? 'bg-white/95 border-stone-200 text-stone-700'
            : 'bg-stone-900/95 border-stone-800 text-stone-300'
        }`}
      >
        <button
          onClick={onZoomIn}
          title="Zoom In"
          className="p-1 hover:text-amber-500 rounded transition-colors cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <div className="px-1 text-[10px] font-mono text-stone-400 tabular-nums">
          {Math.round(zoom * 100)}%
        </div>
        <button
          onClick={onZoomOut}
          title="Zoom Out"
          className="p-1 hover:text-amber-500 rounded transition-colors cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <div className={`h-3.5 w-px mx-0.5 ${isLight ? 'bg-stone-200' : 'bg-stone-800'}`} />
        <button
          onClick={onFitGraph}
          title="Fit All Nodes in View"
          className="p-1 hover:text-amber-500 rounded transition-colors cursor-pointer"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onCenterActiveNode}
          title="Center on Current Step"
          className="p-1 hover:text-amber-500 rounded transition-colors cursor-pointer"
        >
          <Crosshair className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
