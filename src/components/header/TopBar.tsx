/**
 * CodeFlow Graph - Professional Top Bar Header
 * Natural Spectrum Palette System (Warm White in Light / Graphite in Dark)
 */

import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  StepBack,
  Network,
  HelpCircle,
  Search,
  Layers,
  Compass,
  Zap,
  Info,
  Sun,
  Moon,
  FunctionSquare,
  Route,
} from 'lucide-react';
import { SupportedLanguage } from '../../types/codeflow.ts';
import { LayoutMode } from '../../engine/graph/layout.ts';
import { DetectionResult } from '../../engine/detector/languageDetector.ts';
import { SAMPLE_PROGRAMS } from '../../samples/samplePrograms.ts';

interface TopBarProps {
  language: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  isAutoDetect: boolean;
  onToggleAutoDetect: (enabled: boolean) => void;
  detectionResult?: DetectionResult;
  selectedSampleId: string;
  onSelectSample: (sampleId: string) => void;
  // Execution state
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepForward: () => void;
  onStepBack: () => void;
  onReset: () => void;
  currentStep: number;
  totalSteps: number;
  speed: number;
  onSpeedChange: (speed: number) => void;
  // Graph controls
  layoutMode: LayoutMode;
  onLayoutModeChange: (mode: LayoutMode) => void;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
  onOpenHelp: () => void;
  onFitGraph: () => void;
  activeFilter: 'ALL' | 'CONTROL' | 'DATA' | 'EXECUTION_PATH' | 'FUNCTIONS' | 'VARIABLES';
  onFilterChange: (filter: 'ALL' | 'CONTROL' | 'DATA' | 'EXECUTION_PATH' | 'FUNCTIONS' | 'VARIABLES') => void;
  // Additional Toggles
  showLegend: boolean;
  onToggleLegend: () => void;
  showFunctionExplorer: boolean;
  onToggleFunctionExplorer: () => void;
  isLight: boolean;
  onToggleTheme: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  language,
  onLanguageChange,
  isAutoDetect,
  onToggleAutoDetect,
  detectionResult,
  selectedSampleId,
  onSelectSample,
  isPlaying,
  onTogglePlay,
  onStepForward,
  onStepBack,
  onReset,
  currentStep,
  totalSteps,
  speed,
  onSpeedChange,
  layoutMode,
  onLayoutModeChange,
  searchQuery,
  onSearchQueryChange,
  onOpenHelp,
  onFitGraph,
  activeFilter,
  onFilterChange,
  showLegend,
  onToggleLegend,
  showFunctionExplorer,
  onToggleFunctionExplorer,
  isLight,
  onToggleTheme,
}) => {
  return (
    <header
      className={`h-13 border-b px-3.5 flex items-center justify-between shrink-0 select-none transition-colors duration-200 ${
        isLight
          ? 'bg-[#ffffff] border-stone-200/90 text-stone-800'
          : 'bg-[#14161d] border-stone-800/80 text-stone-200'
      }`}
    >
      {/* Zone 1: Brand & Language / Samples */}
      <div className="flex items-center gap-2.5">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2 pr-1">
          <div
            className={`w-7 h-7 rounded-md flex items-center justify-center font-bold text-sm shadow-xs border ${
              isLight
                ? 'bg-stone-900 border-stone-950 text-amber-400'
                : 'bg-stone-900 border-stone-750 text-amber-400'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-baseline gap-1">
            <span
              className={`text-sm font-semibold tracking-tight font-sans ${
                isLight ? 'text-stone-900' : 'text-stone-100'
              }`}
            >
              CodeFlow
            </span>
            <span className="text-[11px] font-mono text-amber-500 font-medium tracking-normal">
              Graph
            </span>
          </div>
        </div>

        <div className={`h-4 w-px ${isLight ? 'bg-stone-200' : 'bg-stone-800'} mx-0.5`} />

        {/* Language Selector + Auto Detect Indicator */}
        <div className="flex items-center gap-1.5 text-xs">
          <div className="relative flex items-center">
            <select
              value={isAutoDetect ? 'auto' : language}
              onChange={e => {
                if (e.target.value === 'auto') {
                  onToggleAutoDetect(true);
                } else {
                  onToggleAutoDetect(false);
                  onLanguageChange(e.target.value as SupportedLanguage);
                }
              }}
              className={`rounded-md px-2 py-1 text-xs font-mono font-medium border cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${
                isLight
                  ? 'bg-stone-100/90 text-stone-800 border-stone-250 hover:bg-stone-150'
                  : 'bg-stone-850 text-stone-200 border-stone-750 hover:bg-stone-800'
              }`}
            >
              <option value="auto">
                ⚡ Auto ({language.toUpperCase()})
              </option>
              <option value="c">C</option>
              <option value="cpp">C++</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
            </select>
          </div>

          {/* Confidence Badge */}
          {isAutoDetect && detectionResult && (
            <div
              title={`Detected with ${detectionResult.confidence} confidence. Reasons: ${detectionResult.reasons.join(', ')}`}
              className={`hidden sm:flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                detectionResult.confidence === 'High'
                  ? isLight
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-amber-950/50 text-amber-400 border-amber-800/60'
                  : detectionResult.confidence === 'Medium'
                  ? isLight
                    ? 'bg-orange-50 text-orange-800 border-orange-200'
                    : 'bg-orange-950/50 text-orange-400 border-orange-800/60'
                  : isLight
                  ? 'bg-stone-100 text-stone-500 border-stone-200'
                  : 'bg-stone-850 text-stone-400 border-stone-750'
              }`}
            >
              <Zap className="w-2.5 h-2.5" />
              <span>{detectionResult.confidence}</span>
            </div>
          )}
        </div>

        {/* Sample Program Picker */}
        <div className="flex items-center gap-1.5 text-xs">
          <select
            value={selectedSampleId}
            onChange={e => onSelectSample(e.target.value)}
            className={`rounded-md px-2 py-1 text-xs max-w-[170px] lg:max-w-[210px] truncate border cursor-pointer transition-colors focus:outline-none focus:ring-1 focus:ring-amber-500/50 ${
              isLight
                ? 'bg-stone-100/90 text-stone-800 border-stone-250 hover:bg-stone-150'
                : 'bg-stone-850 text-stone-200 border-stone-750 hover:bg-stone-800'
            }`}
          >
            <optgroup label="Required Tests">
              {SAMPLE_PROGRAMS.filter(s => s.category === 'Required Tests').map(s => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Algorithms">
              {SAMPLE_PROGRAMS.filter(s => s.category === 'Algorithms').map(s => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </optgroup>
            <optgroup label="Multi-Language Examples">
              {SAMPLE_PROGRAMS.filter(s => s.category === 'Multi-Language').map(s => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Zone 2: Stepper Execution Controls (Center) */}
      <div className="flex items-center gap-2">
        {/* Playback Button Cluster */}
        <div
          className={`flex items-center rounded-lg p-0.5 border shadow-xs ${
            isLight ? 'bg-stone-100/90 border-stone-200' : 'bg-stone-900 border-stone-800'
          }`}
        >
          <button
            onClick={onStepBack}
            disabled={currentStep <= 0}
            title="Step Back (Previous State)"
            className="px-2 py-1 text-xs font-medium hover:bg-stone-700/20 disabled:opacity-30 disabled:hover:bg-transparent rounded-md transition-colors flex items-center gap-1 cursor-pointer"
          >
            <StepBack className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">Back</span>
          </button>

          <button
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause Auto-Play' : 'Auto Play Steps'}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              isPlaying
                ? 'bg-amber-500 text-stone-950 hover:bg-amber-400 font-semibold'
                : 'bg-amber-600 text-white hover:bg-amber-500 font-semibold shadow-xs'
            }`}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span className="text-[11px]">{isPlaying ? 'Pause' : 'Auto Play'}</span>
          </button>

          <button
            onClick={onStepForward}
            disabled={currentStep >= totalSteps - 1}
            title="Step Forward (Next Instruction)"
            className="px-2 py-1 text-xs font-medium hover:bg-stone-700/20 disabled:opacity-30 disabled:hover:bg-transparent rounded-md transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span className="hidden lg:inline text-[11px]">Step</span>
            <StepForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onReset}
            title="Reset to Initial Step"
            className="p-1 text-stone-400 hover:text-stone-200 hover:bg-stone-700/20 rounded-md transition-colors cursor-pointer ml-0.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border ${
            isLight ? 'bg-stone-50 border-stone-200 text-stone-700' : 'bg-stone-900 border-stone-800 text-stone-300'
          }`}
        >
          <span className="text-stone-500 text-[11px]">Step:</span>
          <span className="text-amber-500 font-bold tabular-nums">
            {totalSteps > 0 ? currentStep : 0}
          </span>
          <span className="text-stone-600">/</span>
          <span className="text-stone-400 tabular-nums">
            {Math.max(0, totalSteps - 1)}
          </span>
        </div>

        {/* Playback Speed Selector */}
        <div
          className={`hidden xl:flex items-center gap-1 text-xs rounded-md px-2 py-1 border ${
            isLight ? 'bg-stone-50 border-stone-200 text-stone-700' : 'bg-stone-900 border-stone-800 text-stone-300'
          }`}
        >
          <span className="text-stone-500 text-[11px]">Speed:</span>
          <select
            value={speed}
            onChange={e => onSpeedChange(Number(e.target.value))}
            className="bg-transparent font-mono text-xs focus:outline-none cursor-pointer"
          >
            <option value={1500} className="bg-stone-900 text-stone-100">0.5x</option>
            <option value={800} className="bg-stone-900 text-stone-100">1.0x</option>
            <option value={400} className="bg-stone-900 text-stone-100">2.0x</option>
            <option value={200} className="bg-stone-900 text-stone-100">4.0x</option>
          </select>
        </div>
      </div>

      {/* Zone 3: Layouts, Filters, Legend, Theme Switch, Help */}
      <div className="flex items-center gap-1.5">
        {/* Search */}
        <div className="relative hidden lg:block">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={e => onSearchQueryChange(e.target.value)}
            className={`w-32 xl:w-40 text-xs rounded-md pl-8 pr-2 py-1 border focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all ${
              isLight
                ? 'bg-stone-100 text-stone-800 border-stone-250 placeholder-stone-400'
                : 'bg-stone-850 text-stone-200 border-stone-750 placeholder-stone-500'
            }`}
          />
        </div>

        {/* Layout Switcher (DAG vs Force) */}
        <div
          className={`flex items-center rounded-md p-0.5 border ${
            isLight ? 'bg-stone-100 border-stone-200' : 'bg-stone-900 border-stone-800'
          }`}
        >
          <button
            onClick={() => onLayoutModeChange('hierarchical')}
            title="Hierarchical Flow Layout (Control Flow DAG)"
            className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 cursor-pointer transition-colors ${
              layoutMode === 'hierarchical'
                ? isLight
                  ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                  : 'bg-stone-800 text-stone-100 font-semibold shadow-2xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span className="hidden xl:inline text-[11px]">DAG</span>
          </button>
          <button
            onClick={() => onLayoutModeChange('obsidian')}
            title="Obsidian-style Dynamic Force Layout"
            className={`px-2 py-0.5 text-xs rounded flex items-center gap-1 cursor-pointer transition-colors ${
              layoutMode === 'obsidian'
                ? isLight
                  ? 'bg-white text-stone-900 font-semibold shadow-2xs'
                  : 'bg-stone-800 text-stone-100 font-semibold shadow-2xs'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Compass className="w-3 h-3" />
            <span className="hidden xl:inline text-[11px]">Obsidian</span>
          </button>
        </div>

        {/* Execution Path Mode Quick Toggle */}
        <button
          onClick={() =>
            onFilterChange(activeFilter === 'EXECUTION_PATH' ? 'ALL' : 'EXECUTION_PATH')
          }
          title={
            activeFilter === 'EXECUTION_PATH'
              ? 'Showing Active Execution Path Only (Click to show all)'
              : 'Filter to Executed Path Nodes Only'
          }
          className={`p-1.5 rounded-md border transition-colors cursor-pointer flex items-center gap-1 text-xs ${
            activeFilter === 'EXECUTION_PATH'
              ? 'bg-amber-600 text-white border-amber-500 font-semibold shadow-xs'
              : isLight
              ? 'bg-stone-100 text-stone-600 border-stone-250 hover:bg-stone-200'
              : 'bg-stone-850 text-stone-400 border-stone-750 hover:text-stone-200'
          }`}
        >
          <Route className="w-3.5 h-3.5" />
          <span className="hidden 2xl:inline text-[11px]">Trace</span>
        </button>

        {/* Function Explorer Toggle */}
        <button
          onClick={onToggleFunctionExplorer}
          title="Toggle Function Explorer"
          className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
            showFunctionExplorer
              ? isLight
                ? 'bg-orange-100 text-orange-800 border-orange-300'
                : 'bg-orange-950/80 text-orange-300 border-orange-700'
              : isLight
              ? 'bg-stone-100 text-stone-600 border-stone-250 hover:bg-stone-200'
              : 'bg-stone-850 text-stone-400 border-stone-750 hover:text-stone-200'
          }`}
        >
          <FunctionSquare className="w-3.5 h-3.5" />
        </button>

        {/* Visual Legend Toggle */}
        <button
          onClick={onToggleLegend}
          title="Toggle Graph Visual Legend"
          className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
            showLegend
              ? isLight
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-amber-950/80 text-amber-300 border-amber-700'
              : isLight
              ? 'bg-stone-100 text-stone-600 border-stone-250 hover:bg-stone-200'
              : 'bg-stone-850 text-stone-400 border-stone-750 hover:text-stone-200'
          }`}
        >
          <Info className="w-3.5 h-3.5" />
        </button>

        {/* Premium Developer-Tool Theme Switch */}
        <button
          onClick={onToggleTheme}
          aria-label={isLight ? 'Switch to dark theme' : 'Switch to light theme'}
          aria-pressed={isLight}
          title={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          className={`px-2 py-1 rounded-md border text-xs font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:outline-none ${
            isLight
              ? 'bg-stone-100 text-stone-800 border-stone-250 hover:bg-stone-200 shadow-2xs'
              : 'bg-stone-850 text-stone-200 border-stone-750 hover:bg-stone-800 shadow-2xs'
          }`}
        >
          {isLight ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline text-[11px] font-mono font-medium">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-stone-300" />
              <span className="hidden sm:inline text-[11px] font-mono font-medium">Dark</span>
            </>
          )}
        </button>

        {/* Help Guide */}
        <button
          onClick={onOpenHelp}
          title="CodeFlow Graph Reference & Guide"
          className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
            isLight
              ? 'bg-stone-100 text-stone-600 border-stone-250 hover:text-amber-600'
              : 'bg-stone-850 text-stone-400 border-stone-750 hover:text-amber-400'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
