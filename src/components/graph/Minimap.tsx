/**
 * CodeFlow Graph - Minimap Component
 */

import React from 'react';
import { GraphNode } from '../../types/codeflow.ts';

interface MinimapProps {
  nodes: GraphNode[];
  activeNodeId?: string;
  pan: { x: number; y: number };
  zoom: number;
  viewportWidth: number;
  viewportHeight: number;
  onNavigate: (x: number, y: number) => void;
  isLight?: boolean;
}

export const Minimap: React.FC<MinimapProps> = ({
  nodes,
  activeNodeId,
  pan,
  zoom,
  viewportWidth,
  viewportHeight,
  isLight = false,
}) => {
  if (nodes.length === 0) return null;

  // Calculate bounding box of all nodes
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach(n => {
    const x = n.x || 0;
    const y = n.y || 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  });

  const padding = 80;
  minX -= padding;
  maxX += padding;
  minY -= padding;
  maxY += padding;

  const mapWidth = 140;
  const mapHeight = 100;
  const graphWidth = Math.max(100, maxX - minX);
  const graphHeight = Math.max(100, maxY - minY);

  const scale = Math.min(mapWidth / graphWidth, mapHeight / graphHeight);

  // Viewport box in minimap coords
  const viewX = (-pan.x / zoom - minX) * scale;
  const viewY = (-pan.y / zoom - minY) * scale;
  const viewW = (viewportWidth / zoom) * scale;
  const viewH = (viewportHeight / zoom) * scale;

  return (
    <div
      className={`w-[140px] h-[100px] border rounded-lg shadow-md relative overflow-hidden pointer-events-none select-none backdrop-blur-xs transition-colors duration-200 ${
        isLight ? 'bg-white/90 border-stone-200' : 'bg-stone-950/85 border-stone-800'
      }`}
    >
      {/* Node dots */}
      <svg className="w-full h-full">
        {nodes.map(n => {
          const nx = ((n.x || 0) - minX) * scale;
          const ny = ((n.y || 0) - minY) * scale;
          const isActive = n.id === activeNodeId;

          return (
            <circle
              key={n.id}
              cx={nx}
              cy={ny}
              r={isActive ? 3.5 : 2}
              fill={isActive ? '#f59e0b' : isLight ? '#a8a29e' : '#78716c'}
              opacity={isActive ? 1 : 0.7}
            />
          );
        })}

        {/* Viewport rectangle */}
        <rect
          x={Math.max(0, viewX)}
          y={Math.max(0, viewY)}
          width={Math.min(mapWidth, Math.max(8, viewW))}
          height={Math.min(mapHeight, Math.max(8, viewH))}
          fill={isLight ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.12)'}
          stroke="#f59e0b"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
      </svg>
      <div className="absolute bottom-1 right-1 text-[8.5px] font-mono text-stone-500 uppercase tracking-wider">
        Minimap
      </div>
    </div>
  );
};
