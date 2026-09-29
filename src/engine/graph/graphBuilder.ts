/**
 * CodeFlow Graph - Flow Graph Builder
 * Converts IRProgram into an interactive Obsidian-style FlowGraph with Control Flow, Data Flow, and Calls
 */

import {
  IRProgram,
  IRFunction,
  IRStatement,
  FlowGraph,
  GraphNode,
  GraphEdge,
  IRExpression,
} from '../../types/codeflow.ts';

export function buildFlowGraph(ir: IRProgram): FlowGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const functionNames = ir.functions.map(f => f.name);

  // 1. Entry node (START)
  const startNode: GraphNode = {
    id: 'node_start',
    type: 'START',
    label: 'START',
    subLabel: 'Program Entry',
    codeSnippet: 'start',
    lineStart: 1,
    lineEnd: 1,
  };
  nodes.push(startNode);

  // 2. Exit node (END)
  const endNode: GraphNode = {
    id: 'node_end',
    type: 'END',
    label: 'END',
    subLabel: 'Program Terminated',
    codeSnippet: 'exit',
    lineStart: Math.max(1, ...ir.mainBody.map(s => s.line)),
    lineEnd: Math.max(1, ...ir.mainBody.map(s => s.line)),
  };
  nodes.push(endNode);

  let edgeCounter = 1;
  const nextEdgeId = () => `edge_${edgeCounter++}`;

  // Helper to add edge
  const addEdge = (
    source: string,
    target: string,
    type: GraphEdge['type'] = 'CONTROL_FLOW',
    label?: string,
    conditionBranch?: 'TRUE' | 'FALSE',
    extra?: Partial<GraphEdge>
  ) => {
    // Avoid duplicate identical edges
    const exists = edges.some(e => e.source === source && e.target === target && e.type === type && e.conditionBranch === conditionBranch);
    if (!exists) {
      edges.push({
        id: nextEdgeId(),
        source,
        target,
        type,
        label,
        conditionBranch,
        ...extra,
      });
    }
  };

  // Process functions
  for (const fn of ir.functions) {
    const fnEntryNode: GraphNode = {
      id: `fn_entry_${fn.name}`,
      type: 'FUNCTION',
      label: `${fn.name}(${fn.params.join(', ')})`,
      subLabel: `Function Definition [${fn.returnType || 'void'}]`,
      codeSnippet: `def ${fn.name}(${fn.params.join(', ')}):`,
      lineStart: fn.lineStart,
      lineEnd: fn.lineEnd,
      functionScope: fn.name,
      metadata: {
        functionName: fn.name,
        args: fn.params,
      },
    };
    nodes.push(fnEntryNode);

    const fnExitNode: GraphNode = {
      id: `fn_exit_${fn.name}`,
      type: 'RETURN',
      label: `return from ${fn.name}`,
      subLabel: 'Function Return',
      codeSnippet: `return`,
      lineStart: fn.lineEnd,
      lineEnd: fn.lineEnd,
      functionScope: fn.name,
    };
    nodes.push(fnExitNode);

    const fnLastNodes = buildStatementSequence(fn.body, fnEntryNode.id, fn.name, nodes, edges, addEdge);
    for (const lastId of fnLastNodes) {
      addEdge(lastId, fnExitNode.id, 'RETURN_FLOW', 'Return');
    }
  }

  // Process main body
  let currentPredecessors = [startNode.id];
  if (ir.mainBody.length > 0) {
    currentPredecessors = buildStatementSequence(ir.mainBody, startNode.id, 'main', nodes, edges, addEdge);
  }

  for (const pred of currentPredecessors) {
    addEdge(pred, endNode.id, 'CONTROL_FLOW', 'Finish');
  }

  // Process data-flow dependencies and function call edges
  addCrossReferences(nodes, edges, addEdge, ir);

  return {
    nodes,
    edges,
    functions: functionNames,
    entryNodeId: startNode.id,
    exitNodeId: endNode.id,
  };
}

/**
 * Builds a sequence of statements and links control flow
 * Returns the array of node IDs that exit this block
 */
function buildStatementSequence(
  stmts: IRStatement[],
  entryNodeId: string,
  scope: string,
  nodes: GraphNode[],
  edges: GraphEdge[],
  addEdge: (s: string, t: string, type?: GraphEdge['type'], label?: string, cond?: 'TRUE' | 'FALSE', extra?: any) => void
): string[] {
  let prevNodeIds: string[] = [entryNodeId];

  for (let i = 0; i < stmts.length; i++) {
    const stmt = stmts[i];

    switch (stmt.type) {
      case 'VariableDecl': {
        const node: GraphNode = {
          id: `node_${stmt.id}`,
          type: 'VARIABLE',
          label: stmt.rawCode,
          subLabel: `Declare ${stmt.varName}${stmt.varType ? ` : ${stmt.varType}` : ''}`,
          codeSnippet: stmt.rawCode,
          lineStart: stmt.line,
          lineEnd: stmt.line,
          functionScope: scope,
          metadata: {
            varName: stmt.varName,
            dependencies: stmt.initialValueExpr ? extractIdentifiers(stmt.initialValueExpr) : [],
          },
        };
        nodes.push(node);
        for (const p of prevNodeIds) {
          addEdge(p, node.id, 'CONTROL_FLOW');
        }
        prevNodeIds = [node.id];
        break;
      }

      case 'Assignment': {
        const node: GraphNode = {
          id: `node_${stmt.id}`,
          type: 'STATEMENT',
          label: stmt.rawCode,
          subLabel: `Assign ${stmt.target}`,
          codeSnippet: stmt.rawCode,
          lineStart: stmt.line,
          lineEnd: stmt.line,
          functionScope: scope,
          metadata: {
            varName: stmt.target,
            dependencies: stmt.valueExpr ? extractIdentifiers(stmt.valueExpr) : [],
          },
        };
        nodes.push(node);
        for (const p of prevNodeIds) {
          addEdge(p, node.id, 'CONTROL_FLOW');
        }
        prevNodeIds = [node.id];
        break;
      }

      case 'PrintStatement': {
        const node: GraphNode = {
          id: `node_${stmt.id}`,
          type: 'OUTPUT',
          label: stmt.rawCode,
          subLabel: `Print Output`,
          codeSnippet: stmt.rawCode,
          lineStart: stmt.line,
          lineEnd: stmt.line,
          functionScope: scope,
          metadata: {
            dependencies: stmt.expressions.flatMap(e => extractIdentifiers(e)),
          },
        };
        nodes.push(node);
        for (const p of prevNodeIds) {
          addEdge(p, node.id, 'CONTROL_FLOW');
        }
        prevNodeIds = [node.id];
        break;
      }

      case 'ReturnStatement': {
        const node: GraphNode = {
          id: `node_${stmt.id}`,
          type: 'RETURN',
          label: stmt.rawCode,
          subLabel: `Return Value`,
          codeSnippet: stmt.rawCode,
          lineStart: stmt.line,
          lineEnd: stmt.line,
          functionScope: scope,
          metadata: {
            dependencies: stmt.valueExpr ? extractIdentifiers(stmt.valueExpr) : [],
          },
        };
        nodes.push(node);
        for (const p of prevNodeIds) {
          addEdge(p, node.id, 'CONTROL_FLOW');
        }
        prevNodeIds = [node.id];
        break;
      }

      case 'ExpressionStatement': {
        const isCall = stmt.expression.type === 'FunctionCall';
        const node: GraphNode = {
          id: `node_${stmt.id}`,
          type: isCall ? 'FUNCTION_CALL' : 'STATEMENT',
          label: stmt.rawCode,
          subLabel: isCall ? `Call ${(stmt.expression as any).functionName}()` : `Evaluate Expression`,
          codeSnippet: stmt.rawCode,
          lineStart: stmt.line,
          lineEnd: stmt.line,
          functionScope: scope,
          metadata: {
            functionName: isCall ? (stmt.expression as any).functionName : undefined,
            dependencies: extractIdentifiers(stmt.expression),
          },
        };
        nodes.push(node);
        for (const p of prevNodeIds) {
          addEdge(p, node.id, 'CONTROL_FLOW');
        }
        prevNodeIds = [node.id];
        break;
      }

      case 'IfStatement': {
        const condRaw = formatExpr(stmt.condition);
        const condNode: GraphNode = {
          id: `node_${stmt.id}_cond`,
          type: 'CONDITION',
          label: `${condRaw}?`,
          subLabel: `Branch Decision`,
          codeSnippet: stmt.rawCode,
          lineStart: stmt.line,
          lineEnd: stmt.line,
          functionScope: scope,
          metadata: {
            conditionExpr: condRaw,
            dependencies: extractIdentifiers(stmt.condition),
          },
        };
        nodes.push(condNode);

        for (const p of prevNodeIds) {
          addEdge(p, condNode.id, 'CONTROL_FLOW');
        }

        // Then branch
        const thenExits = buildStatementSequence(
          stmt.thenBranch,
          condNode.id,
          scope,
          nodes,
          edges,
          (s, t, typ, lbl, cond, ext) => {
            if (s === condNode.id) {
              addEdge(s, t, 'CONTROL_FLOW', 'TRUE', 'TRUE', ext);
            } else {
              addEdge(s, t, typ, lbl, cond, ext);
            }
          }
        );

        // Else branch
        let elseExits: string[] = [];
        if (stmt.elseBranch && stmt.elseBranch.length > 0) {
          elseExits = buildStatementSequence(
            stmt.elseBranch,
            condNode.id,
            scope,
            nodes,
            edges,
            (s, t, typ, lbl, cond, ext) => {
              if (s === condNode.id) {
                addEdge(s, t, 'CONTROL_FLOW', 'FALSE', 'FALSE', ext);
              } else {
                addEdge(s, t, typ, lbl, cond, ext);
              }
            }
          );
        } else {
          // If no else branch, condNode directly flows to next on FALSE
          elseExits = [condNode.id];
        }

        prevNodeIds = [...thenExits, ...elseExits];
        break;
      }

      case 'ForLoop': {
        // Init node
        let initNodeId: string | null = null;
        if (stmt.init) {
          const initNode: GraphNode = {
            id: `node_${stmt.id}_init`,
            type: 'STATEMENT',
            label: stmt.init.rawCode,
            subLabel: 'Loop Initialization',
            codeSnippet: stmt.init.rawCode,
            lineStart: stmt.line,
            lineEnd: stmt.line,
            functionScope: scope,
          };
          nodes.push(initNode);
          for (const p of prevNodeIds) {
            addEdge(p, initNode.id, 'CONTROL_FLOW');
          }
          initNodeId = initNode.id;
        }

        // Condition / Header node
        const condStr = stmt.condition ? formatExpr(stmt.condition) : 'true';
        const loopHeadNode: GraphNode = {
          id: `node_${stmt.id}_head`,
          type: 'LOOP',
          label: `${condStr}?`,
          subLabel: 'Loop Condition',
          codeSnippet: stmt.rawCode,
          lineStart: stmt.line,
          lineEnd: stmt.line,
          functionScope: scope,
          metadata: {
            isLoopHeader: true,
            loopType: 'for',
            conditionExpr: condStr,
            dependencies: stmt.condition ? extractIdentifiers(stmt.condition) : [],
          },
        };
        nodes.push(loopHeadNode);

        if (initNodeId) {
          addEdge(initNodeId, loopHeadNode.id, 'CONTROL_FLOW');
        } else {
          for (const p of prevNodeIds) {
            addEdge(p, loopHeadNode.id, 'CONTROL_FLOW');
          }
        }

        // Increment node
        let incNodeId: string | null = null;
        if (stmt.increment) {
          const incNode: GraphNode = {
            id: `node_${stmt.id}_inc`,
            type: 'STATEMENT',
            label: stmt.increment.rawCode,
            subLabel: 'Loop Increment',
            codeSnippet: stmt.increment.rawCode,
            lineStart: stmt.line,
            lineEnd: stmt.line,
            functionScope: scope,
          };
          nodes.push(incNode);
          incNodeId = incNode.id;
          addEdge(incNode.id, loopHeadNode.id, 'LOOP_FLOW', 'Repeat', undefined, { isLoopBack: true });
        }

        // Body
        const bodyExits = buildStatementSequence(
          stmt.body,
          loopHeadNode.id,
          scope,
          nodes,
          edges,
          (s, t, typ, lbl, cond, ext) => {
            if (s === loopHeadNode.id) {
              addEdge(s, t, 'CONTROL_FLOW', 'TRUE (Body)', 'TRUE', ext);
            } else {
              addEdge(s, t, typ, lbl, cond, ext);
            }
          }
        );

        // Body loops back to increment or loopHead
        const loopBackTarget = incNodeId || loopHeadNode.id;
        for (const exitId of bodyExits) {
          addEdge(exitId, loopBackTarget, 'LOOP_FLOW', incNodeId ? 'Next Step' : 'Repeat', undefined, { isLoopBack: true });
        }

        // Exit edge from loopHead
        prevNodeIds = [loopHeadNode.id];
        // When connecting next node, label edge 'FALSE (Exit)'
        break;
      }

      case 'WhileLoop': {
        const condStr = formatExpr(stmt.condition);
        const loopHeadNode: GraphNode = {
          id: `node_${stmt.id}_head`,
          type: 'LOOP',
          label: `${condStr}?`,
          subLabel: 'While Condition',
          codeSnippet: stmt.rawCode,
          lineStart: stmt.line,
          lineEnd: stmt.line,
          functionScope: scope,
          metadata: {
            isLoopHeader: true,
            loopType: 'while',
            conditionExpr: condStr,
            dependencies: extractIdentifiers(stmt.condition),
          },
        };
        nodes.push(loopHeadNode);

        for (const p of prevNodeIds) {
          addEdge(p, loopHeadNode.id, 'CONTROL_FLOW');
        }

        // Body
        const bodyExits = buildStatementSequence(
          stmt.body,
          loopHeadNode.id,
          scope,
          nodes,
          edges,
          (s, t, typ, lbl, cond, ext) => {
            if (s === loopHeadNode.id) {
              addEdge(s, t, 'CONTROL_FLOW', 'TRUE (Body)', 'TRUE', ext);
            } else {
              addEdge(s, t, typ, lbl, cond, ext);
            }
          }
        );

        // Loop back
        for (const exitId of bodyExits) {
          addEdge(exitId, loopHeadNode.id, 'LOOP_FLOW', 'Repeat', undefined, { isLoopBack: true });
        }

        prevNodeIds = [loopHeadNode.id];
        break;
      }

      case 'DoWhileLoop': {
        const bodyExits = buildStatementSequence(stmt.body, prevNodeIds[0], scope, nodes, edges, addEdge);
        const condStr = formatExpr(stmt.condition);
        const condNode: GraphNode = {
          id: `node_${stmt.id}_cond`,
          type: 'LOOP',
          label: `${condStr}?`,
          subLabel: 'Do-While Condition',
          codeSnippet: stmt.rawCode,
          lineStart: stmt.line,
          lineEnd: stmt.line,
          functionScope: scope,
        };
        nodes.push(condNode);

        for (const exitId of bodyExits) {
          addEdge(exitId, condNode.id, 'CONTROL_FLOW');
        }

        // Loop back to start of body on TRUE
        if (stmt.body.length > 0) {
          const firstBodyNodeId = `node_${stmt.body[0].id}`;
          addEdge(condNode.id, firstBodyNodeId, 'LOOP_FLOW', 'TRUE (Repeat)', 'TRUE', { isLoopBack: true });
        }

        prevNodeIds = [condNode.id];
        break;
      }
    }
  }

  return prevNodeIds;
}

/**
 * Cross references function invocations and variable dependencies
 */
function addCrossReferences(
  nodes: GraphNode[],
  edges: GraphEdge[],
  addEdge: (s: string, t: string, type?: GraphEdge['type'], label?: string, cond?: 'TRUE' | 'FALSE', extra?: any) => void,
  ir: IRProgram
) {
  // 1. Function Call edges
  for (const node of nodes) {
    if (node.metadata?.functionName) {
      const fnName = node.metadata.functionName;
      const fnEntry = nodes.find(n => n.id === `fn_entry_${fnName}`);
      if (fnEntry) {
        addEdge(node.id, fnEntry.id, 'FUNCTION_CALL', `Call ${fnName}()`, undefined, { isCallEdge: true });
      }
    }
  }

  // 2. Data Flow edges (Variable definition to variable usage)
  const varDefNodes = new Map<string, GraphNode>();
  for (const node of nodes) {
    if (node.metadata?.varName) {
      varDefNodes.set(node.metadata.varName, node);
    }
  }

  for (const node of nodes) {
    if (node.metadata?.dependencies) {
      for (const depVar of node.metadata.dependencies) {
        const defNode = varDefNodes.get(depVar);
        if (defNode && defNode.id !== node.id) {
          // Add data dependency edge
          addEdge(defNode.id, node.id, 'DEPENDENCY', `Reads ${depVar}`);
        }
      }
    }
  }
}

function extractIdentifiers(expr: IRExpression): string[] {
  const ids: string[] = [];
  function walk(e: IRExpression) {
    if (!e) return;
    if (e.type === 'Identifier') {
      ids.push(e.name);
    } else if (e.type === 'BinaryOp') {
      walk(e.left);
      walk(e.right);
    } else if (e.type === 'UnaryOp') {
      walk(e.argument);
    } else if (e.type === 'FunctionCall') {
      e.args.forEach(walk);
    } else if (e.type === 'ArrayAccess') {
      walk(e.array);
      walk(e.index);
    } else if (e.type === 'ArrayLiteral') {
      e.elements.forEach(walk);
    }
  }
  walk(expr);
  return Array.from(new Set(ids));
}

function formatExpr(expr: IRExpression): string {
  if (!expr) return '';
  switch (expr.type) {
    case 'Literal':
      return expr.raw || String(expr.value);
    case 'Identifier':
      return expr.name;
    case 'BinaryOp':
      return `${formatExpr(expr.left)} ${expr.operator} ${formatExpr(expr.right)}`;
    case 'UnaryOp':
      return expr.prefix ? `${expr.operator}${formatExpr(expr.argument)}` : `${formatExpr(expr.argument)}${expr.operator}`;
    case 'FunctionCall':
      return `${expr.functionName}(${expr.args.map(formatExpr).join(', ')})`;
    case 'ArrayAccess':
      return `${formatExpr(expr.array)}[${formatExpr(expr.index)}]`;
    case 'ArrayLiteral':
      return `[${expr.elements.map(formatExpr).join(', ')}]`;
    default:
      return '';
  }
}
