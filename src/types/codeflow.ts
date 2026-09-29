/**
 * CodeFlow Graph - Core Type Definitions
 */

export type SupportedLanguage = 'c' | 'cpp' | 'python' | 'java' | 'javascript';

export type NodeType =
  | 'START'
  | 'END'
  | 'STATEMENT'
  | 'VARIABLE'
  | 'EXPRESSION'
  | 'CONDITION'
  | 'LOOP'
  | 'FUNCTION'
  | 'FUNCTION_CALL'
  | 'RETURN'
  | 'INPUT'
  | 'OUTPUT'
  | 'ERROR';

export type EdgeType =
  | 'CONTROL_FLOW'
  | 'DATA_FLOW'
  | 'FUNCTION_CALL'
  | 'RETURN_FLOW'
  | 'LOOP_FLOW'
  | 'DEPENDENCY';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  subLabel?: string;
  codeSnippet: string;
  lineStart: number;
  lineEnd: number;
  functionScope?: string;
  metadata?: {
    varName?: string;
    conditionExpr?: string;
    functionName?: string;
    isLoopHeader?: boolean;
    loopType?: 'for' | 'while' | 'do-while';
    args?: string[];
    returnExpr?: string;
    expressionTree?: any;
    dependencies?: string[];
  };
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  width?: number;
  height?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: EdgeType;
  label?: string;
  conditionBranch?: 'TRUE' | 'FALSE';
  isLoopBack?: boolean;
  isCallEdge?: boolean;
  isReturnEdge?: boolean;
}

export interface FlowGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  functions: string[];
  entryNodeId: string;
  exitNodeId: string;
}

export interface StackFrame {
  id: string;
  functionName: string;
  args: Record<string, any>;
  localVars: Record<string, any>;
  callerLine?: number;
  callerNodeId?: string;
  depth: number;
}

export interface VariableChange {
  varName: string;
  from: any;
  to: any;
  expr?: string;
  isNew?: boolean;
  scope: string;
}

export interface ConditionEvaluation {
  expression: string;
  evaluated: boolean;
  evaluatedString: string;
  branchTaken: 'TRUE' | 'FALSE';
}

export interface LoopEvaluation {
  loopId: string;
  loopType: 'for' | 'while' | 'do-while';
  iteration: number;
  condition: string;
  conditionResult: boolean;
  phase: 'CHECK' | 'BODY' | 'INCREMENT' | 'EXIT';
}

export interface DynamicExplanation {
  stepNumber: number;
  title: string;
  lineContent: string;
  what: string; // WHAT does this statement do?
  why: string; // WHY is it executed here?
  input?: string; // INPUT: which variables/data does it use?
  calculation?: string; // CALCULATION: exact evaluation
  output?: string; // OUTPUT / STATE CHANGE: what does it produce?
  next: string; // NEXT: where does execution go next?
  whatHappens: string; // Backward-compatible summary
  stateChange?: string[];
}

export interface VariableLifecycleEvent {
  type: 'DECLARED' | 'INITIALIZED' | 'MODIFIED' | 'READ' | 'RETURNED' | 'PRINTED';
  line: number;
  stepIndex?: number;
  value?: any;
  expression?: string;
  description: string;
}

export interface VariableLifecycle {
  varName: string;
  scope: string;
  declaredLine?: number;
  varType?: string;
  events: VariableLifecycleEvent[];
  history: { stepIndex: number; value: any; line: number; changeExpr?: string }[];
}

export interface LineAnnotation {
  line: number;
  type: 'VARIABLE_DECL' | 'VARIABLE_MUTATION' | 'CONDITION' | 'LOOP' | 'FUNCTION' | 'FUNCTION_CALL' | 'OUTPUT' | 'RETURN';
  nodeId?: string;
  label: string;
  iconType: 'var' | 'branch' | 'loop' | 'fn' | 'output' | 'return';
}

export interface ExecutionStep {
  stepIndex: number;
  nodeId: string;
  line: number;
  codeSnippet: string;
  actionSummary: string;
  callStack: StackFrame[];
  variables: Record<string, any>;
  variableChanges?: VariableChange[];
  conditionEval?: ConditionEvaluation;
  loopEval?: LoopEvaluation;
  functionCall?: {
    functionName: string;
    args: Record<string, any>;
    depth: number;
    isRecursive: boolean;
  };
  functionReturn?: {
    functionName: string;
    returnValue: any;
  };
  output: string[];
  newOutput?: string | null;
  explanation: DynamicExplanation;
}

export interface ExecutionTrace {
  steps: ExecutionStep[];
  status: 'SUCCESS' | 'ERROR' | 'MAX_STEPS_REACHED';
  errorMessage?: string;
  errorLine?: number;
  totalSteps: number;
  finalOutput: string[];
  variableLifecycles?: Record<string, VariableLifecycle>;
  lineAnnotations?: LineAnnotation[];
}

export interface ParseResult {
  success: boolean;
  ir?: IRProgram;
  graph: FlowGraph;
  errors: {
    message: string;
    line?: number;
    column?: number;
    unsupportedConstruct?: string;
  }[];
}

// Normalized Intermediate Representation
export interface IRProgram {
  type: 'Program';
  language: SupportedLanguage;
  functions: IRFunction[];
  mainBody: IRStatement[];
  allVariables: string[];
}

export interface IRFunction {
  name: string;
  params: string[];
  body: IRStatement[];
  lineStart: number;
  lineEnd: number;
  returnType?: string;
}

export type IRStatement =
  | IRVariableDecl
  | IRAssignment
  | IRIfStatement
  | IRForLoop
  | IRWhileLoop
  | IRDoWhileLoop
  | IRReturnStatement
  | IRExpressionStatement
  | IRPrintStatement
  | IRBreakStatement
  | IRContinueStatement;

export interface IRBaseStatement {
  id: string;
  line: number;
  rawCode: string;
  scope: string;
}

export interface IRVariableDecl extends IRBaseStatement {
  type: 'VariableDecl';
  varName: string;
  varType?: string;
  initialValueExpr?: IRExpression;
}

export interface IRAssignment extends IRBaseStatement {
  type: 'Assignment';
  target: string;
  indexExpr?: IRExpression; // For arrays e.g. a[i]
  operator: '=' | '+=' | '-=' | '*=' | '/=' | '++' | '--';
  valueExpr?: IRExpression;
}

export interface IRIfStatement extends IRBaseStatement {
  type: 'IfStatement';
  condition: IRExpression;
  thenBranch: IRStatement[];
  elseBranch?: IRStatement[];
}

export interface IRForLoop extends IRBaseStatement {
  type: 'ForLoop';
  init?: IRAssignment | IRVariableDecl;
  condition?: IRExpression;
  increment?: IRAssignment;
  body: IRStatement[];
}

export interface IRWhileLoop extends IRBaseStatement {
  type: 'WhileLoop';
  condition: IRExpression;
  body: IRStatement[];
}

export interface IRDoWhileLoop extends IRBaseStatement {
  type: 'DoWhileLoop';
  condition: IRExpression;
  body: IRStatement[];
}

export interface IRReturnStatement extends IRBaseStatement {
  type: 'ReturnStatement';
  valueExpr?: IRExpression;
}

export interface IRExpressionStatement extends IRBaseStatement {
  type: 'ExpressionStatement';
  expression: IRExpression;
}

export interface IRPrintStatement extends IRBaseStatement {
  type: 'PrintStatement';
  expressions: IRExpression[];
  formatString?: string;
  newline: boolean;
}

export interface IRBreakStatement extends IRBaseStatement {
  type: 'BreakStatement';
}

export interface IRContinueStatement extends IRBaseStatement {
  type: 'ContinueStatement';
}

export type IRExpression =
  | IRLiteral
  | IRIdentifier
  | IRBinaryOp
  | IRUnaryOp
  | IRFunctionCallExpr
  | IRArrayAccess
  | IRArrayLiteral;

export interface IRLiteral {
  type: 'Literal';
  value: string | number | boolean | null;
  raw: string;
}

export interface IRIdentifier {
  type: 'Identifier';
  name: string;
}

export interface IRBinaryOp {
  type: 'BinaryOp';
  operator: string;
  left: IRExpression;
  right: IRExpression;
}

export interface IRUnaryOp {
  type: 'UnaryOp';
  operator: string;
  argument: IRExpression;
  prefix: boolean;
}

export interface IRFunctionCallExpr {
  type: 'FunctionCall';
  functionName: string;
  args: IRExpression[];
}

export interface IRArrayAccess {
  type: 'ArrayAccess';
  array: IRExpression;
  index: IRExpression;
}

export interface IRArrayLiteral {
  type: 'ArrayLiteral';
  elements: IRExpression[];
}
