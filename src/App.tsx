/**
 * CodeFlow Graph - Main Application Entrypoint
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SupportedLanguage, FlowGraph, ExecutionTrace, GraphNode } from './types/codeflow.ts';
import { parseSourceCode } from './engine/parser/index.ts';
import { buildFlowGraph } from './engine/graph/graphBuilder.ts';
import { computeGraphLayout, LayoutMode } from './engine/graph/layout.ts';
import { executeProgram } from './engine/executor/interpreter.ts';
import { detectLanguage, DetectionResult } from './engine/detector/languageDetector.ts';
import { SAMPLE_PROGRAMS, SampleProgram } from './samples/samplePrograms.ts';

import { TopBar } from './components/header/TopBar.tsx';
import { CodeEditor } from './components/editor/CodeEditor.tsx';
import { GraphCanvas } from './components/graph/GraphCanvas.tsx';
import { ExplanationPanel } from './components/panels/ExplanationPanel.tsx';
import { VariableStatePanel } from './components/panels/VariableStatePanel.tsx';
import { CallStackPanel } from './components/panels/CallStackPanel.tsx';
import { ConsolePanel } from './components/panels/ConsolePanel.tsx';
import { TimelineScrubber } from './components/panels/TimelineScrubber.tsx';
import { VisualLegend } from './components/legend/VisualLegend.tsx';
import { FunctionExplorer } from './components/explorer/FunctionExplorer.tsx';
import { VariableLifecycleModal } from './components/panels/VariableLifecycleModal.tsx';
import { EmptyStateView } from './components/empty/EmptyStateView.tsx';
import { HelpGuideModal } from './components/modal/HelpGuideModal.tsx';

export default function App() {
  // Primary Language & Code State
  const [selectedSampleId, setSelectedSampleId] = useState<string>('test-1-sequential');
  const [code, setCode] = useState<string>(SAMPLE_PROGRAMS[0].code);
  const [isAutoDetect, setIsAutoDetect] = useState<boolean>(true);
  const [manualLanguage, setManualLanguage] = useState<SupportedLanguage>('c');

  // Debounced auto-detection
  const [detectedResult, setDetectedResult] = useState<DetectionResult>(() =>
    detectLanguage(SAMPLE_PROGRAMS[0].code)
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (code.trim()) {
        const res = detectLanguage(code);
        setDetectedResult(res);
      }
    }, 250); // 250ms debounce
    return () => clearTimeout(timer);
  }, [code]);

  const effectiveLanguage: SupportedLanguage = isAutoDetect
    ? detectedResult.language
    : manualLanguage;

  // Execution & Step State
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(800);

  // Graph State
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('hierarchical');
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<
    'ALL' | 'CONTROL' | 'DATA' | 'EXECUTION_PATH' | 'FUNCTIONS' | 'VARIABLES'
  >('ALL');
  const [collapsedFunctions, setCollapsedFunctions] = useState<Set<string>>(new Set());

  // UI Toggles & Modals
  const [showLegend, setShowLegend] = useState<boolean>(false);
  const [showFunctionExplorer, setShowFunctionExplorer] = useState<boolean>(false);
  const [inspectedVarName, setInspectedVarName] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // Theme state with localStorage persistence & system fallback
  const [isLight, setIsLight] = useState<boolean>(() => {
    try {
      const savedTheme = localStorage.getItem('codeflow_theme');
      if (savedTheme === 'light') return true;
      if (savedTheme === 'dark') return false;
      if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: light)').matches;
      }
      return false;
    } catch {
      return false;
    }
  });

  // Persist theme changes
  useEffect(() => {
    try {
      localStorage.setItem('codeflow_theme', isLight ? 'light' : 'dark');
      if (isLight) {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
  }, [isLight]);

  // Keyboard shortcut (Alt+T or Meta+Shift+L) for quick theme switching
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.key.toLowerCase() === 't') || (e.shiftKey && (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l')) {
        e.preventDefault();
        setIsLight(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Analyze code & build Graph + Execution Trace
  const { graph, trace, parseErrors } = useMemo(() => {
    const parseRes = parseSourceCode(code, effectiveLanguage);
    const rawGraph = buildFlowGraph(parseRes.ir);
    const layoutGraph = computeGraphLayout(rawGraph, { mode: layoutMode });
    const execTrace = executeProgram(parseRes.ir);

    return {
      graph: layoutGraph,
      trace: execTrace,
      parseErrors: parseRes.errors,
    };
  }, [code, effectiveLanguage, layoutMode]);

  // Total steps & active step
  const totalSteps = trace.steps.length;
  const safeStepIndex = Math.min(Math.max(0, currentStepIndex), Math.max(0, totalSteps - 1));
  const activeStep = trace.steps[safeStepIndex];

  // Auto-play interval
  useEffect(() => {
    if (!isPlaying) return;

    if (safeStepIndex >= totalSteps - 1) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStepIndex(prev => {
        if (prev + 1 >= totalSteps) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, speed);

    return () => clearTimeout(timer);
  }, [isPlaying, safeStepIndex, totalSteps, speed]);

  // Stepper Handlers
  const handleStepForward = useCallback(() => {
    setIsPlaying(false);
    if (safeStepIndex < totalSteps - 1) {
      setCurrentStepIndex(safeStepIndex + 1);
    }
  }, [safeStepIndex, totalSteps]);

  const handleStepBack = useCallback(() => {
    setIsPlaying(false);
    if (safeStepIndex > 0) {
      setCurrentStepIndex(safeStepIndex - 1);
    }
  }, [safeStepIndex]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStepIndex(0);
    setSelectedNodeId(undefined);
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (safeStepIndex >= totalSteps - 1) {
      setCurrentStepIndex(0);
    }
    setIsPlaying(p => !p);
  }, [safeStepIndex, totalSteps]);

  // Sample Selection
  const handleSelectSample = (sampleId: string) => {
    const sample = SAMPLE_PROGRAMS.find(s => s.id === sampleId);
    if (sample) {
      setSelectedSampleId(sample.id);
      setIsAutoDetect(true);
      setManualLanguage(sample.language);
      setCode(sample.code);
      setCurrentStepIndex(0);
      setIsPlaying(false);
      setSelectedNodeId(undefined);
    }
  };

  const handleManualLanguageChange = (newLang: SupportedLanguage) => {
    setIsAutoDetect(false);
    setManualLanguage(newLang);
    setCurrentStepIndex(0);
    setIsPlaying(false);
  };

  // Node & Line Selection
  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    const stepIdx = trace.steps.findIndex(s => s.nodeId === nodeId);
    if (stepIdx !== -1) {
      setCurrentStepIndex(stepIdx);
    }
  };

  const handleLineClick = (line: number) => {
    const node = graph.nodes.find(n => n.lineStart === line);
    if (node) {
      setSelectedNodeId(node.id);
      const stepIdx = trace.steps.findIndex(s => s.line === line);
      if (stepIdx !== -1) {
        setCurrentStepIndex(stepIdx);
      }
    }
  };

  const handleToggleCollapseFunction = (fnName: string) => {
    setCollapsedFunctions(prev => {
      const next = new Set(prev);
      if (next.has(fnName)) next.delete(fnName);
      else next.add(fnName);
      return next;
    });
  };

  const selectedNode = selectedNodeId ? graph.nodes.find(n => n.id === selectedNodeId) : undefined;
  const activeLine = activeStep?.line;
  const selectedNodeLine = selectedNode?.lineStart;

  const inspectedLifecycle =
    inspectedVarName && trace.variableLifecycles
      ? trace.variableLifecycles[inspectedVarName]
      : undefined;

  return (
    <div
      className={`flex flex-col h-screen w-screen overflow-hidden font-sans antialiased select-none transition-colors ${
        isLight ? 'bg-[#f8f7f4] text-stone-900' : 'bg-[#0f1115] text-stone-100'
      }`}
    >
      {/* Top Bar Navigation */}
      <TopBar
        language={effectiveLanguage}
        onLanguageChange={handleManualLanguageChange}
        isAutoDetect={isAutoDetect}
        onToggleAutoDetect={setIsAutoDetect}
        detectionResult={detectedResult}
        selectedSampleId={selectedSampleId}
        onSelectSample={handleSelectSample}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onStepForward={handleStepForward}
        onStepBack={handleStepBack}
        onReset={handleReset}
        currentStep={safeStepIndex}
        totalSteps={totalSteps}
        speed={speed}
        onSpeedChange={setSpeed}
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        onOpenHelp={() => setIsHelpOpen(true)}
        onFitGraph={() => {}}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        showLegend={showLegend}
        onToggleLegend={() => setShowLegend(s => !s)}
        showFunctionExplorer={showFunctionExplorer}
        onToggleFunctionExplorer={() => setShowFunctionExplorer(s => !s)}
        isLight={isLight}
        onToggleTheme={() => setIsLight(l => !l)}
      />

      {/* Main Workspace: 3 Columns */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Code Editor */}
        <div className="w-[330px] xl:w-[370px] shrink-0 h-full flex flex-col">
          <CodeEditor
            code={code}
            onChange={newCode => {
              setCode(newCode);
              setCurrentStepIndex(0);
              setIsPlaying(false);
            }}
            language={effectiveLanguage}
            activeLine={activeLine}
            selectedNodeLine={selectedNodeLine}
            onLineClick={handleLineClick}
            errors={parseErrors}
            annotations={trace.lineAnnotations}
            onAnnotationClick={(nodeId, line) => {
              if (nodeId) handleSelectNode(nodeId);
              else if (line) handleLineClick(line);
            }}
            isLight={isLight}
          />
        </div>

        {/* Center Column: Interactive Graph Visualizer OR Empty State */}
        <div className="flex-1 h-full relative overflow-hidden">
          {!code.trim() ? (
            <EmptyStateView onSelectSample={handleSelectSample} />
          ) : (
            <GraphCanvas
              graph={graph}
              activeStep={activeStep}
              allSteps={trace.steps}
              selectedNodeId={selectedNodeId}
              onSelectNode={handleSelectNode}
              layoutMode={layoutMode}
              searchQuery={searchQuery}
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              collapsedFunctions={collapsedFunctions}
              isLight={isLight}
            />
          )}

          {/* Floating Visual Legend */}
          <VisualLegend
            isOpen={showLegend}
            onToggle={() => setShowLegend(false)}
            isLight={isLight}
          />

          {/* Floating Function Explorer */}
          {showFunctionExplorer && graph.functions.length > 0 && (
            <div className="absolute top-12 left-3 z-40 w-64">
              <FunctionExplorer
                functions={graph.functions}
                activeFunction={
                  activeStep?.callStack?.[activeStep.callStack.length - 1]?.functionName
                }
                onSelectFunction={fn => {
                  const fnNode = graph.nodes.find(n => n.id === `fn_entry_${fn}`);
                  if (fnNode) handleSelectNode(fnNode.id);
                }}
                collapsedFunctions={collapsedFunctions}
                onToggleCollapse={handleToggleCollapseFunction}
                isLight={isLight}
              />
            </div>
          )}
        </div>

        {/* Right Column: Step Intelligence & Explanations */}
        <div className="w-[320px] xl:w-[350px] shrink-0 h-full flex flex-col">
          <ExplanationPanel
            activeStep={activeStep}
            selectedNode={selectedNode}
            totalSteps={totalSteps}
            isLight={isLight}
          />
        </div>
      </div>

      {/* Bottom Inspector Area (Variables, Call Stack, Console) */}
      <div
        className={`h-[175px] shrink-0 flex border-t transition-colors ${
          isLight ? 'border-stone-200/90 bg-[#fcfbf9]' : 'border-stone-800/80 bg-[#12141a]'
        }`}
      >
        {/* Variables State Panel (40%) */}
        <div className="w-[40%] h-full">
          <VariableStatePanel
            activeStep={activeStep}
            lifecycles={trace.variableLifecycles}
            onInspectLifecycle={varName => setInspectedVarName(varName)}
            isLight={isLight}
          />
        </div>

        {/* Call Stack Panel (30%) */}
        <div className="w-[30%] h-full">
          <CallStackPanel activeStep={activeStep} isLight={isLight} />
        </div>

        {/* Console Standard Output (30%) */}
        <div className="w-[30%] h-full">
          <ConsolePanel output={activeStep?.output || []} isLight={isLight} />
        </div>
      </div>

      {/* Bottom Timeline Scrubber */}
      <TimelineScrubber
        steps={trace.steps}
        currentStepIndex={safeStepIndex}
        onSelectStep={stepIdx => {
          setIsPlaying(false);
          setCurrentStepIndex(stepIdx);
        }}
        isLight={isLight}
      />

      {/* Variable Lifecycle Inspector Modal */}
      {inspectedVarName && (
        <VariableLifecycleModal
          lifecycle={inspectedLifecycle}
          onClose={() => setInspectedVarName(null)}
          onJumpToStep={stepIdx => {
            setCurrentStepIndex(stepIdx);
            setIsPlaying(false);
          }}
        />
      )}

      {/* Help & Architecture Modal */}
      <HelpGuideModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  );
}
