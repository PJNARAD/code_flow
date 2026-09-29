/**
 * CodeFlow Graph - Function Explorer Component
 * Function semantics: Red-Orange / Orange accents
 */

import React from 'react';
import { FunctionSquare, ChevronRight, Eye, EyeOff } from 'lucide-react';

interface FunctionExplorerProps {
  functions: string[];
  activeFunction?: string;
  onSelectFunction: (fnName: string) => void;
  collapsedFunctions: Set<string>;
  onToggleCollapse: (fnName: string) => void;
  isLight?: boolean;
}

export const FunctionExplorer: React.FC<FunctionExplorerProps> = ({
  functions,
  activeFunction,
  onSelectFunction,
  collapsedFunctions,
  onToggleCollapse,
  isLight = false,
}) => {
  if (functions.length === 0) return null;

  return (
    <div
      className={`border rounded-xl p-2.5 shadow-lg select-none text-xs ${
        isLight
          ? 'bg-white/95 border-stone-200 text-stone-800'
          : 'bg-stone-900/95 border-stone-800 text-stone-200'
      }`}
    >
      <div className="flex items-center justify-between mb-2 pb-1 border-b border-stone-750/50">
        <div className="flex items-center gap-1.5 font-mono font-bold text-stone-300">
          <FunctionSquare className="w-3.5 h-3.5 text-orange-500" />
          <span className={isLight ? 'text-stone-800' : 'text-stone-200'}>
            FUNCTIONS ({functions.length})
          </span>
        </div>
      </div>

      <div className="space-y-1">
        {functions.map(fn => {
          const isCollapsed = collapsedFunctions.has(fn);
          const isActive = activeFunction === fn;

          return (
            <div
              key={fn}
              className={`flex items-center justify-between p-1.5 rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? isLight
                    ? 'bg-orange-50 border border-orange-300 text-orange-800'
                    : 'bg-orange-950/50 border border-orange-500/50 text-orange-300'
                  : isLight
                  ? 'bg-stone-50 hover:bg-stone-100 text-stone-700'
                  : 'bg-stone-950/50 hover:bg-stone-800 text-stone-300'
              }`}
              onClick={() => onSelectFunction(fn)}
            >
              <div className="flex items-center gap-1.5 font-mono truncate">
                <ChevronRight
                  className={`w-3 h-3 text-orange-400 transition-transform ${
                    isCollapsed ? '' : 'rotate-90'
                  }`}
                />
                <span className="font-semibold">{fn}()</span>
              </div>

              <button
                onClick={e => {
                  e.stopPropagation();
                  onToggleCollapse(fn);
                }}
                title={isCollapsed ? 'Expand in graph' : 'Collapse in graph'}
                className="p-1 text-stone-500 hover:text-stone-300 rounded cursor-pointer"
              >
                {isCollapsed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
