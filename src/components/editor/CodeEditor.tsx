/**
 * CodeFlow Graph - Interactive Code Editor Component
 * Natural Spectrum Palette Highlights
 */

import React, { useRef, useEffect } from 'react';
import {
  Code2,
  Copy,
  Check,
  AlertCircle,
  Sliders,
  GitFork,
  Repeat,
  FunctionSquare,
  Terminal,
  CornerDownLeft,
} from 'lucide-react';
import { SupportedLanguage, LineAnnotation } from '../../types/codeflow.ts';

interface CodeEditorProps {
  code: string;
  onChange: (newCode: string) => void;
  language: SupportedLanguage;
  activeLine?: number;
  selectedNodeLine?: number;
  onLineClick?: (line: number) => void;
  errors?: { message: string; line?: number; column?: number }[];
  annotations?: LineAnnotation[];
  onAnnotationClick?: (nodeId?: string, line?: number) => void;
  isLight?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  language,
  activeLine,
  selectedNodeLine,
  onLineClick,
  errors = [],
  annotations = [],
  onAnnotationClick,
  isLight = false,
}) => {
  const [copied, setCopied] = React.useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lines = code.split('\n');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Scroll synchronization with active execution line
  useEffect(() => {
    if (activeLine && textareaRef.current) {
      const lineHeight = 22;
      const targetScroll = (activeLine - 4) * lineHeight;
      textareaRef.current.scrollTop = Math.max(0, targetScroll);
    }
  }, [activeLine]);

  // Annotation Map
  const annotationMap = new Map<number, LineAnnotation>();
  annotations.forEach(a => {
    if (!annotationMap.has(a.line)) {
      annotationMap.set(a.line, a);
    }
  });

  return (
    <div
      className={`flex flex-col h-full border-r select-none transition-colors ${
        isLight
          ? 'bg-[#fcfbf9] border-stone-200/90 text-stone-900'
          : 'bg-[#12141a] border-stone-800/80 text-stone-100'
      }`}
    >
      {/* Editor Header */}
      <div
        className={`h-9 border-b px-3 flex items-center justify-between shrink-0 ${
          isLight ? 'bg-stone-50 border-stone-200/90' : 'bg-stone-900/60 border-stone-800/80'
        }`}
      >
        <div className="flex items-center gap-2">
          <Code2 className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-[11px] font-semibold font-mono uppercase tracking-wider text-stone-400">
            Source Code ({language})
          </span>
          {errors.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-950/60 border border-rose-800/80 px-1.5 py-0.5 rounded">
              <AlertCircle className="w-2.5 h-2.5" />
              {errors.length} error{errors.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className={`text-[10px] px-1.5 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer border ${
              isLight
                ? 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                : 'bg-stone-850 border-stone-750 text-stone-400 hover:text-stone-200'
            }`}
          >
            {copied ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex-1 overflow-hidden flex font-mono text-xs leading-[22px]">
        {/* Line Numbers, Pointer & Glyph Annotations Rail */}
        <div
          className={`w-13 border-r py-3 select-none shrink-0 flex flex-col items-center ${
            isLight
              ? 'bg-stone-50/80 border-stone-200/90 text-stone-400'
              : 'bg-stone-950/60 border-stone-800/80 text-stone-600'
          }`}
        >
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const isActive = activeLine === lineNum;
            const isNodeSelected = selectedNodeLine === lineNum;
            const hasError = errors.some(e => e.line === lineNum);
            const ann = annotationMap.get(lineNum);

            return (
              <div
                key={idx}
                onClick={() => {
                  onLineClick?.(lineNum);
                  if (ann) onAnnotationClick?.(ann.nodeId, lineNum);
                }}
                className={`w-full h-[22px] flex items-center justify-between px-1 cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-500 font-bold'
                    : isNodeSelected
                    ? 'bg-cyan-500/15 text-cyan-500 font-semibold'
                    : 'hover:text-stone-300'
                }`}
              >
                {/* Active Indicator / Error / Annotation Icon */}
                <span className="w-3 flex justify-center shrink-0">
                  {isActive ? (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  ) : hasError ? (
                    <span className="text-rose-500 font-bold text-[10px]">!</span>
                  ) : ann ? (
                    <span title={ann.label} className="opacity-70 hover:opacity-100">
                      {getAnnotationIcon(ann.iconType)}
                    </span>
                  ) : null}
                </span>

                <span className="tabular-nums text-right pr-0.5 text-[10.5px]">
                  {lineNum}
                </span>
              </div>
            );
          })}
        </div>

        {/* Text Area Container */}
        <div className="relative flex-1 h-full overflow-auto">
          {/* Highlight Line Backgrounds */}
          <div className="absolute inset-0 pointer-events-none py-3">
            {lines.map((_, idx) => {
              const lineNum = idx + 1;
              const isActive = activeLine === lineNum;
              const isNodeSelected = selectedNodeLine === lineNum;

              if (!isActive && !isNodeSelected) {
                return <div key={idx} className="h-[22px]" />;
              }

              return (
                <div
                  key={idx}
                  className={`h-[22px] w-full ${
                    isActive
                      ? isLight
                        ? 'bg-amber-500/10 border-l-2 border-amber-500'
                        : 'bg-amber-500/15 border-l-2 border-amber-400'
                      : isLight
                      ? 'bg-cyan-500/10 border-l-2 border-cyan-500'
                      : 'bg-cyan-500/15 border-l-2 border-cyan-400'
                  }`}
                />
              );
            })}
          </div>

          {/* Real Editable Textarea */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={e => onChange(e.target.value)}
            spellCheck={false}
            placeholder="Type or paste your code here..."
            className={`w-full h-full p-3 bg-transparent resize-none font-mono text-xs leading-[22px] focus:outline-none whitespace-pre tab-4 z-10 relative selection:bg-amber-500/20 ${
              isLight ? 'text-stone-800 placeholder-stone-400' : 'text-stone-100 placeholder-stone-600'
            }`}
            style={{ tabSize: 4 }}
          />
        </div>
      </div>

      {/* Parser Errors Drawer */}
      {errors.length > 0 && (
        <div className="bg-rose-950/30 border-t border-rose-900/50 p-2.5 text-xs text-rose-300 font-mono shrink-0">
          <div className="flex items-center gap-1.5 font-semibold text-rose-400 mb-1 text-[11px]">
            <AlertCircle className="w-3 h-3" />
            <span>Parser Diagnostic</span>
          </div>
          {errors.map((err, i) => (
            <div key={i} className="text-[10.5px] text-rose-200/90 pl-4.5">
              Line {err.line || 1}: {err.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

function getAnnotationIcon(iconType: LineAnnotation['iconType']) {
  switch (iconType) {
    case 'var':
      return <Sliders className="w-2.5 h-2.5 text-[#0891b2]" />;
    case 'branch':
      return <GitFork className="w-2.5 h-2.5 text-[#ea580c]" />;
    case 'loop':
      return <Repeat className="w-2.5 h-2.5 text-[#65a30d]" />;
    case 'fn':
      return <FunctionSquare className="w-2.5 h-2.5 text-[#c2410c]" />;
    case 'output':
      return <Terminal className="w-2.5 h-2.5 text-[#16a34a]" />;
    case 'return':
      return <CornerDownLeft className="w-2.5 h-2.5 text-[#e11d48]" />;
    default:
      return null;
  }
}
