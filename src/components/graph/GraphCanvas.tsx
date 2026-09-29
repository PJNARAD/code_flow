/**
 * CodeFlow Graph - Natural Spectrum Visualizer
 * Inspired by the "Thinking in Systems" natural continuum:
 * DEEP RED → RED → ORANGE → GOLD/YELLOW → YELLOW-GREEN → GREEN → TEAL → CYAN
 * Grounded on a sophisticated neutral architecture.
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import {
  FlowGraph,
  GraphNode,
  ExecutionStep,
} from '../../types/codeflow.ts';
import { LayoutMode, applyForceSimulationStep } from '../../engine/graph/layout.ts';
import { Minimap } from './Minimap.tsx';
import { GraphControls } from './GraphControls.tsx';
import {
  PlayCircle,
  CheckCircle2,
  GitFork,
  Repeat,
  Terminal,
  FunctionSquare,
  CornerDownLeft,
  Sliders,
  Code,
  AlertTriangle,
  Calculator,
  ArrowDownLeft,
} from 'lucide-react';

interface GraphCanvasProps {
  graph: FlowGraph;
  activeStep?: ExecutionStep;
  allSteps?: ExecutionStep[];
  selectedNodeId?: string;
  onSelectNode: (nodeId: string) => void;
  layoutMode: LayoutMode;
  searchQuery?: string;
  activeFilter: 'ALL' | 'CONTROL' | 'DATA' | 'EXECUTION_PATH' | 'FUNCTIONS' | 'VARIABLES';
  onFilterChange: (filter: 'ALL' | 'CONTROL' | 'DATA' | 'EXECUTION_PATH' | 'FUNCTIONS' | 'VARIABLES') => void;
  collapsedFunctions?: Set<string>;
  isLight?: boolean;
}

/**
 * Natural Spectrum Color Progression (Deep Red -> Orange -> Yellow -> Green -> Teal -> Cyan)
 */
export function getSpectrumColor(ratio: number): string {
  const clamped = Math.max(0, Math.min(1, ratio));
  if (clamped < 0.15) return '#b91c1c'; // Deep Red
  if (clamped < 0.30) return '#ea580c'; // Red-Orange / Orange
  if (clamped < 0.45) return '#d97706'; // Gold / Warm Amber
  if (clamped < 0.60) return '#ca8a04'; // Gold / Yellow
  if (clamped < 0.72) return '#65a30d'; // Yellow-Green
  if (clamped < 0.84) return '#16a34a'; // Green
  if (clamped < 0.94) return '#0d9488'; // Teal
  return '#0891b2'; // Cyan
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  graph,
  activeStep,
  allSteps = [],
  selectedNodeId,
  onSelectNode,
  layoutMode,
  searchQuery = '',
  activeFilter,
  onFilterChange,
  collapsedFunctions = new Set(),
  isLight = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 380, y: 80 });
  const [zoom, setZoom] = useState<number>(0.92);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Update container dimensions on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Force simulation loop in Obsidian mode
  useEffect(() => {
    if (layoutMode !== 'obsidian') return;

    let animId: number;
    let frame = 0;
    const loop = () => {
      if (frame < 120) {
        applyForceSimulationStep(graph.nodes, graph.edges, 0.08);
        frame++;
        animId = requestAnimationFrame(loop);
      }
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [layoutMode, graph]);

  // Center on active step node automatically
  useEffect(() => {
    if (activeStep?.nodeId) {
      const activeNode = graph.nodes.find(n => n.id === activeStep.nodeId);
      if (activeNode && activeNode.x !== undefined && activeNode.y !== undefined) {
        const screenX = activeNode.x * zoom + pan.x;
        const screenY = activeNode.y * zoom + pan.y;
        const pad = 140;
        if (
          screenX < pad ||
          screenX > dimensions.width - pad ||
          screenY < pad ||
          screenY > dimensions.height - pad
        ) {
          setPan({
            x: dimensions.width / 2 - activeNode.x * zoom,
            y: dimensions.height / 2 - activeNode.y * zoom,
          });
        }
      }
    }
  }, [activeStep?.nodeId, dimensions.width, dimensions.height, zoom]);

  // Map of step index by nodeId for execution path calculation
  const nodeExecutionIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    allSteps.forEach((s, idx) => {
      if (!map.has(s.nodeId)) {
        map.set(s.nodeId, idx);
      }
    });
    return map;
  }, [allSteps]);

  // Set of all node IDs traversed during the entire execution trace
  const executedNodeIds = useMemo(() => {
    return new Set(allSteps.map(s => s.nodeId));
  }, [allSteps]);

  // Connected nodes to focus
  const focusNodeId = selectedNodeId || activeStep?.nodeId;
  const connectedNodeIds = useMemo(() => {
    if (!focusNodeId) return new Set<string>();
    const set = new Set<string>();
    set.add(focusNodeId);
    graph.edges.forEach(e => {
      if (e.source === focusNodeId) set.add(e.target);
      if (e.target === focusNodeId) set.add(e.source);
    });
    return set;
  }, [focusNodeId, graph.edges]);

  // Filtered nodes
  const visibleNodes = useMemo(() => {
    return graph.nodes.filter(n => {
      if (n.functionScope && n.functionScope !== 'main' && n.functionScope !== 'global') {
        if (collapsedFunctions.has(n.functionScope) && n.type !== 'FUNCTION') {
          return false;
        }
      }

      if (activeFilter === 'FUNCTIONS') {
        return (
          n.type === 'FUNCTION' ||
          n.type === 'FUNCTION_CALL' ||
          n.type === 'RETURN' ||
          n.type === 'START' ||
          n.type === 'END'
        );
      }
      if (activeFilter === 'VARIABLES') {
        return (
          n.type === 'VARIABLE' ||
          n.type === 'STATEMENT' ||
          n.type === 'START' ||
          n.type === 'END'
        );
      }
      if (activeFilter === 'EXECUTION_PATH') {
        return executedNodeIds.has(n.id) || n.type === 'START' || n.type === 'END';
      }
      return true;
    });
  }, [graph.nodes, collapsedFunctions, activeFilter, executedNodeIds]);

  const visibleNodeIdSet = useMemo(
    () => new Set(visibleNodes.map(n => n.id)),
    [visibleNodes]
  );

  // Filtered edges
  const visibleEdges = useMemo(() => {
    return graph.edges.filter(e => {
      if (!visibleNodeIdSet.has(e.source) || !visibleNodeIdSet.has(e.target)) return false;

      if (activeFilter === 'CONTROL') return e.type === 'CONTROL_FLOW' || e.type === 'LOOP_FLOW';
      if (activeFilter === 'DATA') return e.type === 'DEPENDENCY' || e.type === 'DATA_FLOW';
      if (activeFilter === 'EXECUTION_PATH') {
        return executedNodeIds.has(e.source) && executedNodeIds.has(e.target);
      }
      return true;
    });
  }, [graph.edges, visibleNodeIdSet, activeFilter, executedNodeIds]);

  // Pan & Zoom Handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    const newZoom = Math.min(2.5, Math.max(0.3, zoom * zoomFactor));

    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      setPan(prev => ({
        x: mouseX - (mouseX - prev.x) * (newZoom / zoom),
        y: mouseY - (mouseY - prev.y) * (newZoom / zoom),
      }));
    }
    setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedNodeId) {
      const node = graph.nodes.find(n => n.id === draggedNodeId);
      if (node && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const worldX = (e.clientX - rect.left - pan.x) / zoom;
        const worldY = (e.clientY - rect.top - pan.y) / zoom;
        node.x = worldX;
        node.y = worldY;
        node.fx = worldX;
        node.fy = worldY;
        setPan(p => ({ ...p }));
      }
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggedNodeId(null);
  };

  const handleFitGraph = useCallback(() => {
    if (visibleNodes.length === 0) return;
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    visibleNodes.forEach(n => {
      const x = n.x || 0;
      const y = n.y || 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    const pad = 100;
    const w = Math.max(200, maxX - minX + pad * 2);
    const h = Math.max(200, maxY - minY + pad * 2);

    const fitZoom = Math.min(1.4, Math.min(dimensions.width / w, dimensions.height / h));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setZoom(fitZoom);
    setPan({
      x: dimensions.width / 2 - centerX * fitZoom,
      y: dimensions.height / 2 - centerY * fitZoom,
    });
  }, [visibleNodes, dimensions]);

  const handleCenterActiveNode = useCallback(() => {
    const targetId = activeStep?.nodeId || selectedNodeId;
    const node = graph.nodes.find(n => n.id === targetId);
    if (node && node.x !== undefined && node.y !== undefined) {
      setPan({
        x: dimensions.width / 2 - node.x * zoom,
        y: dimensions.height / 2 - node.y * zoom,
      });
    } else {
      handleFitGraph();
    }
  }, [activeStep?.nodeId, selectedNodeId, graph.nodes, dimensions, zoom, handleFitGraph]);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing select-none transition-colors ${
        isLight ? 'bg-[#fcfbf9]' : 'bg-[#101216]'
      }`}
      style={{
        backgroundImage: `radial-gradient(${
          isLight ? 'rgba(120, 113, 108, 0.22)' : 'rgba(168, 162, 158, 0.16)'
        } 1px, transparent 1px)`,
        backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
        backgroundPosition: `${pan.x}px ${pan.y}px`,
      }}
    >
      {/* SVG Canvas for Edges */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        <defs>
          <marker
            id="arrow-control"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={isLight ? '#78716c' : '#78716c'} />
          </marker>
          <marker
            id="arrow-active"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#f59e0b" />
          </marker>
          <marker
            id="arrow-true"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#16a34a" />
          </marker>
          <marker
            id="arrow-false"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#dc2626" />
          </marker>
          <marker
            id="arrow-data"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0891b2" />
          </marker>
          <marker
            id="arrow-call"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#ea580c" />
          </marker>
          <marker
            id="arrow-loop"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#65a30d" />
          </marker>
        </defs>

        {visibleEdges.map(edge => {
          const src = graph.nodes.find(n => n.id === edge.source);
          const tgt = graph.nodes.find(n => n.id === edge.target);
          if (!src || !tgt || src.x === undefined || tgt.x === undefined) return null;

          const isActive = activeStep?.nodeId === edge.target;
          const isTrueBranch = edge.conditionBranch === 'TRUE';
          const isFalseBranch = edge.conditionBranch === 'FALSE';
          const isDataFlow = edge.type === 'DEPENDENCY' || edge.type === 'DATA_FLOW';
          const isCall = edge.type === 'FUNCTION_CALL';
          const isLoop = edge.type === 'LOOP_FLOW' || edge.isLoopBack;

          const srcStepIdx = nodeExecutionIndexMap.get(edge.source);
          const tgtStepIdx = nodeExecutionIndexMap.get(edge.target);
          const isExecutedEdge = srcStepIdx !== undefined && tgtStepIdx !== undefined;

          const sx = src.x;
          const sy = (src.y || 0) + (src.height || 58) / 2;
          const tx = tgt.x;
          const ty = (tgt.y || 0) - (tgt.height || 58) / 2;

          let pathD = '';
          if (edge.isLoopBack) {
            const loopOffset = sx >= 0 ? 110 : -110;
            pathD = `M ${sx} ${sy} C ${sx + loopOffset} ${sy + 35}, ${tx + loopOffset} ${ty - 35}, ${tx} ${ty}`;
          } else {
            const dy = Math.abs(ty - sy);
            const cy1 = sy + Math.max(25, dy * 0.38);
            const cy2 = ty - Math.max(25, dy * 0.38);
            pathD = `M ${sx} ${sy} C ${sx} ${cy1}, ${tx} ${cy2}, ${tx} ${ty}`;
          }

          let strokeColor = isLight ? '#a8a29e' : '#57534e';
          let markerId = 'arrow-control';

          if (isActive) {
            strokeColor = '#f59e0b'; // Bright golden yellow for active execution
            markerId = 'arrow-active';
          } else if (isTrueBranch) {
            strokeColor = '#16a34a'; // Green
            markerId = 'arrow-true';
          } else if (isFalseBranch) {
            strokeColor = '#dc2626'; // Red
            markerId = 'arrow-false';
          } else if (isDataFlow) {
            strokeColor = '#0891b2'; // Cyan / Teal
            markerId = 'arrow-data';
          } else if (isCall) {
            strokeColor = '#ea580c'; // Red-orange / Orange
            markerId = 'arrow-call';
          } else if (isLoop) {
            strokeColor = '#65a30d'; // Yellow-green
            markerId = 'arrow-loop';
          } else if (isExecutedEdge && allSteps.length > 1) {
            // Execution progression spectrum along traversed path
            const ratio = (srcStepIdx || 0) / Math.max(1, allSteps.length - 1);
            strokeColor = getSpectrumColor(ratio);
          }

          const midX = (sx + tx) / 2;
          const midY = (sy + ty) / 2;

          return (
            <g key={edge.id} className="transition-opacity duration-200">
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isActive ? 2.2 : isDataFlow ? 1.2 : 1.4}
                strokeDasharray={isDataFlow ? '3 3' : isCall ? '4 2' : undefined}
                markerEnd={`url(#${markerId})`}
                opacity={
                  focusNodeId &&
                  !connectedNodeIds.has(edge.source) &&
                  !connectedNodeIds.has(edge.target)
                    ? 0.15
                    : 0.88
                }
              />

              {edge.label && (
                <g transform={`translate(${midX}, ${midY})`}>
                  <rect
                    x={-((edge.label.length * 5.2) / 2) - 4}
                    y={-8}
                    width={edge.label.length * 5.2 + 8}
                    height={15}
                    rx={3}
                    fill={isLight ? '#ffffff' : '#1c1917'}
                    stroke={strokeColor}
                    strokeWidth="0.8"
                    opacity={0.96}
                  />
                  <text
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={
                      isTrueBranch
                        ? '#16a34a'
                        : isFalseBranch
                        ? '#dc2626'
                        : isDataFlow
                        ? '#0891b2'
                        : isLoop
                        ? '#65a30d'
                        : isLight
                        ? '#57534e'
                        : '#a8a29e'
                    }
                    fontSize="9"
                    fontFamily="monospace"
                    fontWeight="600"
                  >
                    {edge.label}
                  </text>
                </g>
              )}

              {isActive && (
                <circle r="3.5" fill="#f59e0b">
                  <animateMotion path={pathD} dur="1.2s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          );
        })}
      </svg>

      {/* Nodes Container */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {visibleNodes.map(node => {
          if (node.x === undefined || node.y === undefined) return null;

          const isActive = activeStep?.nodeId === node.id;
          const isSelected = selectedNodeId === node.id;
          const isExecuted = executedNodeIds.has(node.id);
          const isConnected = focusNodeId ? connectedNodeIds.has(node.id) : true;
          const matchesSearch = searchQuery
            ? node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
              node.codeSnippet.toLowerCase().includes(searchQuery.toLowerCase())
            : false;

          const width = node.width || 205;
          const height = node.height || 60;

          const nodeTheme = getNodeAccentColor(node.type);

          return (
            <div
              key={node.id}
              onMouseDown={e => {
                e.stopPropagation();
                if (e.button === 0) {
                  setDraggedNodeId(node.id);
                  onSelectNode(node.id);
                }
              }}
              style={{
                transform: `translate(${node.x - width / 2}px, ${node.y - height / 2}px)`,
                width: `${width}px`,
              }}
              className={`graph-node absolute pointer-events-auto cursor-pointer transition-all duration-150 rounded-md p-2.5 border select-none overflow-hidden ${
                isLight
                  ? 'bg-white border-stone-200/90 shadow-[0_1px_3px_rgba(0,0,0,0.04)] text-stone-800 hover:border-stone-300'
                  : 'bg-[#18191e]/95 border-stone-800 shadow-[0_1px_4px_rgba(0,0,0,0.35)] text-stone-100 hover:border-stone-700'
              } ${
                isActive
                  ? isLight
                    ? 'ring-2 ring-amber-500 border-amber-500 shadow-md shadow-amber-500/10 z-30 scale-[1.02]'
                    : 'ring-2 ring-amber-500 border-amber-500 shadow-lg shadow-amber-500/15 z-30 scale-[1.02]'
                  : isSelected
                  ? isLight
                    ? 'ring-2 ring-stone-800 border-stone-800 shadow-xs z-20'
                    : 'ring-2 ring-stone-400 border-stone-400 shadow-xs z-20'
                  : matchesSearch
                  ? 'ring-2 ring-cyan-500'
                  : ''
              } ${
                !isConnected && !matchesSearch
                  ? 'opacity-25 hover:opacity-90'
                  : isExecuted
                  ? 'opacity-100'
                  : 'opacity-90'
              }`}
            >
              {/* Semantic Left Accent 3px Vertical Bar */}
              <div
                className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l"
                style={{ backgroundColor: nodeTheme.color }}
              />

              {/* Node Header Row */}
              <div className="flex items-center justify-between gap-1.5 mb-1 pl-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span style={{ color: nodeTheme.color }}>{getNodeIcon(node.type)}</span>
                  <span
                    className="text-[11px] font-mono font-semibold uppercase tracking-wider truncate"
                    style={{ color: isLight ? nodeTheme.textLight : nodeTheme.textDark }}
                  >
                    {node.type}
                  </span>
                </div>

                {node.lineStart && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 tabular-nums ${
                      isLight
                        ? 'bg-stone-100 border-stone-250 text-stone-600'
                        : 'bg-stone-850 border-stone-750 text-stone-300'
                    }`}
                  >
                    L{node.lineStart}
                  </span>
                )}
              </div>

              {/* Code Snippet Label */}
              <div className="font-mono text-xs font-semibold truncate tracking-tight pl-2">
                {node.label}
              </div>

              {/* SubLabel / Description */}
              {node.subLabel && (
                <div
                  className={`text-[10.5px] truncate mt-0.5 font-sans pl-2 ${
                    isLight ? 'text-stone-500' : 'text-stone-400'
                  }`}
                >
                  {node.subLabel}
                </div>
              )}

              {/* Active Step Indicator Footer */}
              {isActive && (
                <div
                  className={`mt-1.5 pt-1 border-t flex items-center justify-between text-[10px] font-mono text-amber-500 pl-2 ${
                    isLight ? 'border-amber-100' : 'border-amber-950/80'
                  }`}
                >
                  <span className="flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    EXECUTING
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-500 font-mono text-[9.5px]">
                    Step #{activeStep?.stepIndex}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Floating Graph Controls */}
      <div className="absolute top-3 right-3 z-40">
        <GraphControls
          zoom={zoom}
          onZoomIn={() => setZoom(z => Math.min(2.5, z * 1.2))}
          onZoomOut={() => setZoom(z => Math.max(0.3, z * 0.8))}
          onFitGraph={handleFitGraph}
          onCenterActiveNode={handleCenterActiveNode}
          activeFilter={activeFilter as any}
          onFilterChange={onFilterChange as any}
          isLight={isLight}
        />
      </div>

      {/* Minimap */}
      <div className="absolute bottom-3 right-3 z-40">
        <Minimap
          nodes={visibleNodes}
          activeNodeId={activeStep?.nodeId || selectedNodeId}
          pan={pan}
          zoom={zoom}
          viewportWidth={dimensions.width}
          viewportHeight={dimensions.height}
          isLight={isLight}
          onNavigate={(nx, ny) => {
            setPan({
              x: dimensions.width / 2 - nx * zoom,
              y: dimensions.height / 2 - ny * zoom,
            });
          }}
        />
      </div>
    </div>
  );
};

export interface SemanticColorDef {
  color: string;
  textLight: string;
  textDark: string;
}

/**
 * Palette mapping directly matching the requested palette semantics:
 * START: deep green (#15803d)
 * END: deep red (#b91c1c)
 * VARIABLE: cyan / teal (#0891b2)
 * EXPRESSION: yellow (#ca8a04)
 * CONDITION: orange (#ea580c)
 * LOOP: yellow-green (#65a30d)
 * FUNCTION: red-orange (#c2410c)
 * FUNCTION CALL: orange (#d97706)
 * INPUT: teal (#0d9488)
 * OUTPUT: green (#16a34a)
 * RETURN: red-orange (#e11d48)
 * ERROR: red (#dc2626)
 * STATEMENT: neutral (#78716c)
 */
export function getNodeAccentColor(type: GraphNode['type']): SemanticColorDef {
  switch (type) {
    case 'START':
      return { color: '#15803d', textLight: '#15803d', textDark: '#4ade80' }; // Deep Green
    case 'END':
      return { color: '#b91c1c', textLight: '#b91c1c', textDark: '#f87171' }; // Deep Red
    case 'VARIABLE':
      return { color: '#0891b2', textLight: '#0891b2', textDark: '#38bdf8' }; // Cyan
    case 'EXPRESSION':
      return { color: '#ca8a04', textLight: '#a16207', textDark: '#facc15' }; // Yellow
    case 'CONDITION':
      return { color: '#ea580c', textLight: '#c2410c', textDark: '#fb923c' }; // Orange
    case 'LOOP':
      return { color: '#65a30d', textLight: '#4d7c0f', textDark: '#a3e635' }; // Yellow-Green
    case 'FUNCTION':
      return { color: '#c2410c', textLight: '#9a3412', textDark: '#f97316' }; // Red-Orange
    case 'FUNCTION_CALL':
      return { color: '#d97706', textLight: '#b45309', textDark: '#fbbf24' }; // Orange / Amber
    case 'INPUT':
      return { color: '#0d9488', textLight: '#0f766e', textDark: '#2dd4bf' }; // Teal
    case 'OUTPUT':
      return { color: '#16a34a', textLight: '#15803d', textDark: '#4ade80' }; // Green
    case 'RETURN':
      return { color: '#e11d48', textLight: '#be123c', textDark: '#fb7185' }; // Red-Orange / Rose
    case 'ERROR':
      return { color: '#dc2626', textLight: '#b91c1c', textDark: '#f87171' }; // Red
    default:
      return { color: '#78716c', textLight: '#57534e', textDark: '#a8a29e' }; // Neutral
  }
}

function getNodeIcon(type: GraphNode['type']) {
  switch (type) {
    case 'START':
      return <PlayCircle className="w-3.5 h-3.5 shrink-0" />;
    case 'END':
      return <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />;
    case 'CONDITION':
      return <GitFork className="w-3.5 h-3.5 shrink-0" />;
    case 'LOOP':
      return <Repeat className="w-3.5 h-3.5 shrink-0" />;
    case 'FUNCTION':
      return <FunctionSquare className="w-3.5 h-3.5 shrink-0" />;
    case 'FUNCTION_CALL':
      return <ArrowDownLeft className="w-3.5 h-3.5 shrink-0" />;
    case 'RETURN':
      return <CornerDownLeft className="w-3.5 h-3.5 shrink-0" />;
    case 'OUTPUT':
      return <Terminal className="w-3.5 h-3.5 shrink-0" />;
    case 'INPUT':
      return <Sliders className="w-3.5 h-3.5 shrink-0" />;
    case 'VARIABLE':
      return <Sliders className="w-3.5 h-3.5 shrink-0" />;
    case 'EXPRESSION':
      return <Calculator className="w-3.5 h-3.5 shrink-0" />;
    case 'ERROR':
      return <AlertTriangle className="w-3.5 h-3.5 shrink-0" />;
    default:
      return <Code className="w-3.5 h-3.5 shrink-0" />;
  }
}
