/**
 * CodeFlow Graph - Layout & Force Dynamics Engine
 * Supports Hierarchical DAG Flow Layout and Obsidian-style Force Simulation
 */

import { FlowGraph, GraphNode, GraphEdge } from '../../types/codeflow.ts';

export type LayoutMode = 'hierarchical' | 'obsidian' | 'compact' | 'dataflow';

export interface LayoutOptions {
  mode: LayoutMode;
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  mode: 'hierarchical',
  nodeWidth: 200,
  nodeHeight: 64,
  horizontalSpacing: 80,
  verticalSpacing: 90,
};

export function computeGraphLayout(graph: FlowGraph, options: Partial<LayoutOptions> = {}): FlowGraph {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const nodes = graph.nodes.map(n => ({
    ...n,
    width: n.width || opts.nodeWidth,
    height: n.height || opts.nodeHeight,
  }));
  const edges = [...graph.edges];

  if (opts.mode === 'hierarchical' || opts.mode === 'compact') {
    applyHierarchicalLayout(nodes, edges, opts);
  } else {
    applyForceLayout(nodes, edges, 120);
  }

  return {
    ...graph,
    nodes,
    edges,
  };
}

/**
 * Computes a layered topological layout (Sugiyama-inspired DAG layout)
 */
function applyHierarchicalLayout(nodes: GraphNode[], edges: GraphEdge[], opts: LayoutOptions) {
  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach(n => nodeMap.set(n.id, n));

  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  nodes.forEach(n => {
    inDegree.set(n.id, 0);
    adj.set(n.id, []);
  });

  // Only consider non-loopback control flow edges for layer assignment
  edges.forEach(e => {
    if (!e.isLoopBack && e.type === 'CONTROL_FLOW') {
      adj.get(e.source)?.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    }
  });

  // Assign layers using BFS / Longest Path
  const layers = new Map<string, number>();
  const queue: string[] = [];

  nodes.forEach(n => {
    if (inDegree.get(n.id) === 0 || n.type === 'START' || n.type === 'FUNCTION') {
      layers.set(n.id, 0);
      queue.push(n.id);
    }
  });

  // If start node wasn't in queue
  const startNode = nodes.find(n => n.type === 'START');
  if (startNode && !layers.has(startNode.id)) {
    layers.set(startNode.id, 0);
    queue.push(startNode.id);
  }

  while (queue.length > 0) {
    const u = queue.shift()!;
    const uLayer = layers.get(u) || 0;

    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      const vLayer = layers.get(v) || 0;
      if (uLayer + 1 > vLayer) {
        layers.set(v, uLayer + 1);
        queue.push(v);
      }
    }
  }

  // Handle any orphan nodes
  let maxLayer = 0;
  layers.forEach(l => {
    if (l > maxLayer) maxLayer = l;
  });

  nodes.forEach(n => {
    if (!layers.has(n.id)) {
      layers.set(n.id, n.type === 'END' ? maxLayer + 1 : 1);
    }
  });

  // Group nodes by layer and scope (functions separated horizontally)
  const layerGroups = new Map<number, GraphNode[]>();
  nodes.forEach(n => {
    const l = layers.get(n.id) || 0;
    if (!layerGroups.has(l)) layerGroups.set(l, []);
    layerGroups.get(l)!.push(n);
  });

  // Separate functions into side columns
  const functionNames = Array.from(new Set(nodes.map(n => n.functionScope).filter(Boolean)));
  const scopeOffsets = new Map<string, number>();
  scopeOffsets.set('main', 0);
  scopeOffsets.set('global', 0);

  let rightOffset = 380;
  let leftOffset = -380;
  functionNames.forEach(fn => {
    if (fn !== 'main' && fn !== 'global' && fn) {
      if (rightOffset <= Math.abs(leftOffset)) {
        scopeOffsets.set(fn, rightOffset);
        rightOffset += 380;
      } else {
        scopeOffsets.set(fn, leftOffset);
        leftOffset -= 380;
      }
    }
  });

  // Position nodes
  layerGroups.forEach((groupNodes, layerIndex) => {
    const y = layerIndex * (opts.nodeHeight + opts.verticalSpacing) + 60;

    // Sub-group by function scope
    const byScope = new Map<string, GraphNode[]>();
    groupNodes.forEach(n => {
      const s = n.functionScope || 'main';
      if (!byScope.has(s)) byScope.set(s, []);
      byScope.get(s)!.push(n);
    });

    byScope.forEach((scopeNodes, scope) => {
      const centerOffsetX = scopeOffsets.get(scope) || 0;
      const count = scopeNodes.length;
      const totalWidth = (count - 1) * (opts.nodeWidth + opts.horizontalSpacing);
      const startX = centerOffsetX - totalWidth / 2;

      scopeNodes.forEach((n, idx) => {
        if (n.fx === undefined || n.fx === null) {
          n.x = startX + idx * (opts.nodeWidth + opts.horizontalSpacing);
        } else {
          n.x = n.fx;
        }
        if (n.fy === undefined || n.fy === null) {
          n.y = y;
        } else {
          n.y = n.fy;
        }
        n.vx = 0;
        n.vy = 0;
      });
    });
  });
}

/**
 * Obsidian Force Simulation step
 */
export function applyForceSimulationStep(nodes: GraphNode[], edges: GraphEdge[], alpha: number = 0.1) {
  const nodeMap = new Map<string, GraphNode>();
  nodes.forEach(n => {
    nodeMap.set(n.id, n);
    if (n.x === undefined) n.x = (Math.random() - 0.5) * 400;
    if (n.y === undefined) n.y = (Math.random() - 0.5) * 400;
    n.vx = (n.vx || 0) * 0.85; // Damping
    n.vy = (n.vy || 0) * 0.85;
  });

  // 1. Repulsion (Coulomb / charge force between all node pairs)
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const n1 = nodes[i];
      const n2 = nodes[j];

      const dx = (n2.x || 0) - (n1.x || 0);
      const dy = (n2.y || 0) - (n1.y || 0);
      const distSq = dx * dx + dy * dy + 100;
      const dist = Math.sqrt(distSq);

      const force = (80000 / distSq) * alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;

      if (n1.fx === null || n1.fx === undefined) {
        n1.vx! -= fx;
        n1.vy! -= fy;
      }
      if (n2.fx === null || n2.fx === undefined) {
        n2.vx! += fx;
        n2.vy! += fy;
      }
    }
  }

  // 2. Edge Spring Attraction (Hooke's law)
  edges.forEach(e => {
    const src = nodeMap.get(e.source);
    const tgt = nodeMap.get(e.target);
    if (!src || !tgt) return;

    const dx = (tgt.x || 0) - (src.x || 0);
    const dy = (tgt.y || 0) - (src.y || 0);
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;

    const targetDist = e.type === 'DEPENDENCY' ? 140 : 110;
    const displacement = dist - targetDist;
    const force = displacement * 0.04 * alpha;

    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    if (src.fx === null || src.fx === undefined) {
      src.vx! += fx;
      src.vy! += fy;
    }
    if (tgt.fx === null || tgt.fx === undefined) {
      tgt.vx! -= fx;
      tgt.vy! -= fy;
    }
  });

  // 3. Centering force to (0, 150)
  nodes.forEach(n => {
    if (n.fx === null || n.fx === undefined) {
      n.vx! -= ((n.x || 0) - 0) * 0.005 * alpha;
      n.vy! -= ((n.y || 0) - 150) * 0.005 * alpha;
    }
  });

  // Apply velocities
  nodes.forEach(n => {
    if (n.fx === null || n.fx === undefined) {
      n.x = (n.x || 0) + (n.vx || 0);
    } else {
      n.x = n.fx;
    }
    if (n.fy === null || n.fy === undefined) {
      n.y = (n.y || 0) + (n.vy || 0);
    } else {
      n.y = n.fy;
    }
  });
}

function applyForceLayout(nodes: GraphNode[], edges: GraphEdge[], iterations: number = 80) {
  // Initialize in a circle if undefined
  const radius = Math.max(150, nodes.length * 20);
  nodes.forEach((n, idx) => {
    if (n.x === undefined || n.y === undefined) {
      const angle = (idx / nodes.length) * 2 * Math.PI;
      n.x = Math.cos(angle) * radius;
      n.y = Math.sin(angle) * radius;
    }
  });

  for (let i = 0; i < iterations; i++) {
    applyForceSimulationStep(nodes, edges, 0.2 * (1 - i / iterations));
  }
}
