/**
 * CodeFlow Graph - Deterministic Step Interpreter, Lifecycle Tracker & Trace Generator
 */

import {
  IRProgram,
  IRFunction,
  IRStatement,
  ExecutionTrace,
  ExecutionStep,
  StackFrame,
  VariableChange,
  DynamicExplanation,
  VariableLifecycle,
  LineAnnotation,
} from '../../types/codeflow.ts';
import { evaluateExpression, formatVal } from './evaluator.ts';

const MAX_STEPS = 500;
const MAX_CALL_DEPTH = 30;

interface ExecutionContext {
  ir: IRProgram;
  steps: ExecutionStep[];
  callStack: StackFrame[];
  globalVars: Record<string, any>;
  output: string[];
  stepCounter: number;
  fnMap: Map<string, IRFunction>;
  lifecycles: Record<string, VariableLifecycle>;
  annotations: LineAnnotation[];
}

export function executeProgram(ir: IRProgram): ExecutionTrace {
  const fnMap = new Map<string, IRFunction>();
  ir.functions.forEach(f => fnMap.set(f.name, f));

  const lifecycles: Record<string, VariableLifecycle> = {};
  const annotations: LineAnnotation[] = [];

  // Pre-initialize variables from IR
  ir.allVariables.forEach(v => {
    lifecycles[v] = {
      varName: v,
      scope: 'main',
      events: [],
      history: [{ stepIndex: 0, value: undefined, line: 1, changeExpr: 'Initial undefined' }],
    };
  });

  const ctx: ExecutionContext = {
    ir,
    steps: [],
    callStack: [
      {
        id: 'frame_main',
        functionName: 'main',
        args: {},
        localVars: {},
        depth: 0,
      },
    ],
    globalVars: {},
    output: [],
    stepCounter: 0,
    fnMap,
    lifecycles,
    annotations,
  };

  // Collect initial line annotations from IR
  collectAnnotations(ir, annotations);

  // Step 0: Initial Start Step
  addStartStep(ctx);

  try {
    // Execute main body
    executeStatementList(ir.mainBody, ctx);

    // Final End Step
    addEndStep(ctx);

    return {
      steps: ctx.steps,
      status: 'SUCCESS',
      totalSteps: ctx.steps.length,
      finalOutput: ctx.output,
      variableLifecycles: ctx.lifecycles,
      lineAnnotations: ctx.annotations,
    };
  } catch (err: any) {
    if (err.message === 'MAX_STEPS_REACHED') {
      return {
        steps: ctx.steps,
        status: 'MAX_STEPS_REACHED',
        errorMessage: 'Execution paused: Reached safety limit of 500 steps (prevented infinite loop).',
        totalSteps: ctx.steps.length,
        finalOutput: ctx.output,
        variableLifecycles: ctx.lifecycles,
        lineAnnotations: ctx.annotations,
      };
    }

    return {
      steps: ctx.steps,
      status: 'ERROR',
      errorMessage: err.message || 'Runtime execution error',
      totalSteps: ctx.steps.length,
      finalOutput: ctx.output,
      variableLifecycles: ctx.lifecycles,
      lineAnnotations: ctx.annotations,
    };
  }
}

function getActiveFrame(ctx: ExecutionContext): StackFrame {
  return ctx.callStack[ctx.callStack.length - 1];
}

function getCombinedVariables(ctx: ExecutionContext): Record<string, any> {
  const frame = getActiveFrame(ctx);
  return { ...ctx.globalVars, ...frame.localVars };
}

function ensureLifecycle(ctx: ExecutionContext, varName: string, scope: string, line: number, varType?: string) {
  if (!ctx.lifecycles[varName]) {
    ctx.lifecycles[varName] = {
      varName,
      scope,
      declaredLine: line,
      varType,
      events: [],
      history: [{ stepIndex: 0, value: undefined, line, changeExpr: 'Undefined' }],
    };
  }
}

function recordLifecycleEvent(
  ctx: ExecutionContext,
  varName: string,
  event: {
    type: 'DECLARED' | 'INITIALIZED' | 'MODIFIED' | 'READ' | 'RETURNED' | 'PRINTED';
    line: number;
    value?: any;
    expression?: string;
    description: string;
  }
) {
  ensureLifecycle(ctx, varName, getActiveFrame(ctx).functionName, event.line);
  const lc = ctx.lifecycles[varName];
  lc.events.push({
    ...event,
    stepIndex: ctx.stepCounter,
  });

  if (['DECLARED', 'INITIALIZED', 'MODIFIED'].includes(event.type) && event.value !== undefined) {
    lc.history.push({
      stepIndex: ctx.stepCounter,
      value: event.value,
      line: event.line,
      changeExpr: event.expression,
    });
  }
}

function recordStep(
  ctx: ExecutionContext,
  nodeId: string,
  line: number,
  codeSnippet: string,
  actionSummary: string,
  explanation: DynamicExplanation,
  opts: {
    variableChanges?: VariableChange[];
    conditionEval?: any;
    loopEval?: any;
    functionCall?: any;
    functionReturn?: any;
    newOutput?: string | null;
  } = {}
) {
  if (ctx.stepCounter >= MAX_STEPS) {
    throw new Error('MAX_STEPS_REACHED');
  }

  // Clone call stack snapshot
  const callStackSnapshot: StackFrame[] = ctx.callStack.map(f => ({
    id: f.id,
    functionName: f.functionName,
    args: { ...f.args },
    localVars: { ...f.localVars },
    callerLine: f.callerLine,
    callerNodeId: f.callerNodeId,
    depth: f.depth,
  }));

  const step: ExecutionStep = {
    stepIndex: ctx.stepCounter++,
    nodeId,
    line,
    codeSnippet,
    actionSummary,
    callStack: callStackSnapshot,
    variables: getCombinedVariables(ctx),
    variableChanges: opts.variableChanges,
    conditionEval: opts.conditionEval,
    loopEval: opts.loopEval,
    functionCall: opts.functionCall,
    functionReturn: opts.functionReturn,
    output: [...ctx.output],
    newOutput: opts.newOutput,
    explanation,
  };

  ctx.steps.push(step);
}

function addStartStep(ctx: ExecutionContext) {
  const explanation: DynamicExplanation = {
    stepNumber: 0,
    title: 'Program Execution Started',
    lineContent: 'START',
    what: 'Initializes the runtime memory environment and execution stack.',
    why: 'Entrypoint into the program.',
    input: 'None (initial memory state).',
    calculation: 'Allocates base stack frame for main().',
    output: 'Runtime ready.',
    next: 'Advances to first sequential statement.',
    whatHappens: 'The program initializes runtime memory and enters the main execution scope.',
    stateChange: [],
  };

  recordStep(ctx, 'node_start', 1, 'START', 'Program execution started', explanation);
}

function addEndStep(ctx: ExecutionContext) {
  const lastLine = ctx.steps.length > 0 ? ctx.steps[ctx.steps.length - 1].line : 1;
  const explanation: DynamicExplanation = {
    stepNumber: ctx.stepCounter,
    title: 'Program Terminated',
    lineContent: 'END',
    what: 'Finalizes execution and clears call stack frames.',
    why: 'All statements in main program have finished executing.',
    input: 'Final state of variables and console output.',
    calculation: 'None.',
    output: `Total console lines: ${ctx.output.length}`,
    next: 'Execution completed.',
    whatHappens: 'All statements have finished executing. Call stack cleared and output finalized.',
    stateChange: [],
  };

  recordStep(ctx, 'node_end', lastLine, 'END', 'Program finished successfully', explanation);
}

function executeStatementList(stmts: IRStatement[], ctx: ExecutionContext): any {
  for (const stmt of stmts) {
    const res = executeStatement(stmt, ctx);
    if (res && res.isReturn) {
      return res;
    }
  }
}

function executeStatement(stmt: IRStatement, ctx: ExecutionContext): any {
  const currentFrame = getActiveFrame(ctx);

  switch (stmt.type) {
    case 'VariableDecl': {
      let initialVal: any = undefined;
      let calcStr: string | undefined;
      const readVars: Record<string, any> = {};

      if (stmt.initialValueExpr) {
        const evalRes = evaluateExpressionWithFunctions(stmt.initialValueExpr, ctx);
        initialVal = evalRes.value;
        Object.assign(readVars, evalRes.readVariables);
        if (evalRes.subCalculations.length > 0) {
          calcStr = evalRes.subCalculations.join(', ');
        }
      }

      // Record reads for input variables
      Object.entries(readVars).forEach(([rVar, rVal]) => {
        recordLifecycleEvent(ctx, rVar, {
          type: 'READ',
          line: stmt.line,
          value: rVal,
          description: `Read in declaration of '${stmt.varName}'`,
        });
      });

      const prevVal = currentFrame.localVars[stmt.varName];
      currentFrame.localVars[stmt.varName] = initialVal;

      ensureLifecycle(ctx, stmt.varName, currentFrame.functionName, stmt.line, stmt.varType);
      recordLifecycleEvent(ctx, stmt.varName, {
        type: stmt.initialValueExpr ? 'INITIALIZED' : 'DECLARED',
        line: stmt.line,
        value: initialVal,
        expression: calcStr,
        description: `Declared ${stmt.varType || 'variable'} with initial value ${formatVal(initialVal)}`,
      });

      const varChange: VariableChange = {
        varName: stmt.varName,
        from: prevVal,
        to: initialVal,
        expr: calcStr,
        isNew: true,
        scope: currentFrame.functionName,
      };

      const inputDesc = Object.keys(readVars).length > 0
        ? Object.entries(readVars).map(([k, v]) => `${k} = ${formatVal(v)}`).join(', ')
        : 'Literal value';

      const explanation: DynamicExplanation = {
        stepNumber: ctx.stepCounter,
        title: `Declare Variable: ${stmt.varName}`,
        lineContent: stmt.rawCode,
        what: `Declares ${stmt.varType ? `'${stmt.varType}'` : 'variable'} named '${stmt.varName}' and assigns initial value.`,
        why: `Sequential initialization of variable in '${currentFrame.functionName}()' scope.`,
        input: inputDesc,
        calculation: calcStr ? calcStr : `${stmt.varName} = ${formatVal(initialVal)}`,
        output: `${stmt.varName} = ${formatVal(initialVal)}`,
        next: 'Advances to next sequential statement.',
        whatHappens: `Declares '${stmt.varName}' in '${currentFrame.functionName}' scope with value ${formatVal(initialVal)}.`,
        stateChange: [`${stmt.varName}: ${formatVal(prevVal)} → ${formatVal(initialVal)}`],
      };

      recordStep(ctx, `node_${stmt.id}`, stmt.line, stmt.rawCode, `Declared ${stmt.varName} = ${formatVal(initialVal)}`, explanation, {
        variableChanges: [varChange],
      });
      break;
    }

    case 'Assignment': {
      const prevVal = currentFrame.localVars[stmt.target] !== undefined ? currentFrame.localVars[stmt.target] : ctx.globalVars[stmt.target];
      let newVal: any = prevVal;
      let calcStr: string | undefined;
      const readVars: Record<string, any> = {};

      if (stmt.operator === '++') {
        newVal = (Number(prevVal) || 0) + 1;
        calcStr = `${stmt.target} + 1 = ${newVal}`;
        readVars[stmt.target] = prevVal;
      } else if (stmt.operator === '--') {
        newVal = (Number(prevVal) || 0) - 1;
        calcStr = `${stmt.target} - 1 = ${newVal}`;
        readVars[stmt.target] = prevVal;
      } else if (stmt.valueExpr) {
        const evalRes = evaluateExpressionWithFunctions(stmt.valueExpr, ctx);
        Object.assign(readVars, evalRes.readVariables);
        if (stmt.operator === '=') {
          newVal = evalRes.value;
        } else if (stmt.operator === '+=') {
          newVal = prevVal + evalRes.value;
          calcStr = `${formatVal(prevVal)} + ${formatVal(evalRes.value)} = ${formatVal(newVal)}`;
        } else if (stmt.operator === '-=') {
          newVal = prevVal - evalRes.value;
          calcStr = `${formatVal(prevVal)} - ${formatVal(evalRes.value)} = ${formatVal(newVal)}`;
        } else if (stmt.operator === '*=') {
          newVal = prevVal * evalRes.value;
          calcStr = `${formatVal(prevVal)} * ${formatVal(evalRes.value)} = ${formatVal(newVal)}`;
        } else if (stmt.operator === '/=') {
          newVal = Math.trunc(prevVal / evalRes.value);
          calcStr = `${formatVal(prevVal)} / ${formatVal(evalRes.value)} = ${formatVal(newVal)}`;
        }
        if (!calcStr && evalRes.subCalculations.length > 0) {
          calcStr = evalRes.subCalculations.join(', ');
        }
      }

      // Record reads
      Object.entries(readVars).forEach(([rVar, rVal]) => {
        recordLifecycleEvent(ctx, rVar, {
          type: 'READ',
          line: stmt.line,
          value: rVal,
          description: `Read in assignment to '${stmt.target}'`,
        });
      });

      // Handle array assignment e.g. a[i] = 10
      if (stmt.indexExpr) {
        const idxRes = evaluateExpressionWithFunctions(stmt.indexExpr, ctx);
        const idx = idxRes.value;
        const arr = currentFrame.localVars[stmt.target] || ctx.globalVars[stmt.target] || [];
        const clonedArr = [...arr];
        clonedArr[idx] = newVal;
        if (currentFrame.localVars[stmt.target] !== undefined) {
          currentFrame.localVars[stmt.target] = clonedArr;
        } else {
          ctx.globalVars[stmt.target] = clonedArr;
        }
      } else {
        if (currentFrame.localVars[stmt.target] !== undefined || !Object.prototype.hasOwnProperty.call(ctx.globalVars, stmt.target)) {
          currentFrame.localVars[stmt.target] = newVal;
        } else {
          ctx.globalVars[stmt.target] = newVal;
        }
      }

      recordLifecycleEvent(ctx, stmt.target, {
        type: 'MODIFIED',
        line: stmt.line,
        value: newVal,
        expression: calcStr,
        description: `Modified from ${formatVal(prevVal)} to ${formatVal(newVal)}`,
      });

      const varChange: VariableChange = {
        varName: stmt.target,
        from: prevVal,
        to: newVal,
        expr: calcStr,
        scope: currentFrame.functionName,
      };

      const inputDesc = Object.keys(readVars).length > 0
        ? Object.entries(readVars).map(([k, v]) => `${k} = ${formatVal(v)}`).join(', ')
        : 'Literal expression';

      const explanation: DynamicExplanation = {
        stepNumber: ctx.stepCounter,
        title: `Assign Variable: ${stmt.target}`,
        lineContent: stmt.rawCode,
        what: `Evaluates right-hand side and updates variable '${stmt.target}'.`,
        why: `Computes requested operation and mutates memory state.`,
        input: inputDesc,
        calculation: calcStr ? calcStr : `${stmt.target} = ${formatVal(newVal)}`,
        output: `${stmt.target}: ${formatVal(prevVal)} → ${formatVal(newVal)}`,
        next: 'Advances to next instruction.',
        whatHappens: `Computes expression and updates '${stmt.target}'.`,
        stateChange: [`${stmt.target}: ${formatVal(prevVal)} → ${formatVal(newVal)}`],
      };

      recordStep(ctx, `node_${stmt.id}`, stmt.line, stmt.rawCode, `Assigned ${stmt.target} = ${formatVal(newVal)}`, explanation, {
        variableChanges: [varChange],
      });
      break;
    }

    case 'IfStatement': {
      const evalRes = evaluateExpressionWithFunctions(stmt.condition, ctx);
      const isTrue = Boolean(evalRes.value);
      const branchTaken = isTrue ? 'TRUE' : 'FALSE';

      Object.entries(evalRes.readVariables).forEach(([rVar, rVal]) => {
        recordLifecycleEvent(ctx, rVar, {
          type: 'READ',
          line: stmt.line,
          value: rVal,
          description: `Read for condition check '${stmt.rawCode}'`,
        });
      });

      const inputDesc = Object.keys(evalRes.readVariables).length > 0
        ? Object.entries(evalRes.readVariables).map(([k, v]) => `${k} = ${formatVal(v)}`).join(', ')
        : 'Constant expression';

      const condEval = {
        expression: stmt.rawCode,
        evaluated: isTrue,
        evaluatedString: evalRes.explanation || formatVal(isTrue),
        branchTaken: branchTaken as 'TRUE' | 'FALSE',
      };

      const explanation: DynamicExplanation = {
        stepNumber: ctx.stepCounter,
        title: `Branch Condition: ${branchTaken}`,
        lineContent: stmt.rawCode,
        what: `Evaluates boolean conditional expression '${evalRes.explanation || stmt.rawCode}'.`,
        why: `Directs control flow to the appropriate branch depending on boolean evaluation.`,
        input: inputDesc,
        calculation: `${evalRes.explanation || formatVal(isTrue)} ⇒ ${branchTaken}`,
        output: `Branch decision: ${branchTaken}`,
        next: isTrue ? 'Enters THEN-branch body.' : (stmt.elseBranch ? 'Enters ELSE-branch body.' : 'Bypasses branch.'),
        whatHappens: `Condition evaluated to ${branchTaken} (${isTrue ? 'takes if-branch' : 'takes else/skips'}).`,
        stateChange: [],
      };

      recordStep(ctx, `node_${stmt.id}_cond`, stmt.line, stmt.rawCode, `Branch evaluated to ${branchTaken}`, explanation, {
        conditionEval: condEval,
      });

      if (isTrue) {
        return executeStatementList(stmt.thenBranch, ctx);
      } else if (stmt.elseBranch && stmt.elseBranch.length > 0) {
        return executeStatementList(stmt.elseBranch, ctx);
      }
      break;
    }

    case 'ForLoop': {
      if (stmt.init) {
        executeStatement(stmt.init, ctx);
      }

      let iteration = 1;
      while (true) {
        if (ctx.stepCounter >= MAX_STEPS) throw new Error('MAX_STEPS_REACHED');

        let condResult = true;
        let condExplanation = '';
        const readVars: Record<string, any> = {};

        if (stmt.condition) {
          const evalRes = evaluateExpressionWithFunctions(stmt.condition, ctx);
          condResult = Boolean(evalRes.value);
          condExplanation = evalRes.explanation;
          Object.assign(readVars, evalRes.readVariables);
        }

        Object.entries(readVars).forEach(([rVar, rVal]) => {
          recordLifecycleEvent(ctx, rVar, {
            type: 'READ',
            line: stmt.line,
            value: rVal,
            description: `Read for loop condition iteration #${iteration}`,
          });
        });

        const loopEval = {
          loopId: stmt.id,
          loopType: 'for' as const,
          iteration,
          condition: stmt.condition ? stmt.rawCode : 'true',
          conditionResult: condResult,
          phase: (condResult ? 'CHECK' : 'EXIT') as any,
        };

        const explanation: DynamicExplanation = {
          stepNumber: ctx.stepCounter,
          title: `For Loop: Iteration ${iteration} [${condResult ? 'TRUE' : 'FALSE'}]`,
          lineContent: stmt.rawCode,
          what: `Tests loop continuation condition for iteration #${iteration}.`,
          why: `Determines whether another iteration body should be executed.`,
          input: Object.entries(readVars).map(([k, v]) => `${k} = ${formatVal(v)}`).join(', ') || 'None',
          calculation: condExplanation ? `${condExplanation} ⇒ ${condResult ? 'TRUE' : 'FALSE'}` : (condResult ? 'TRUE' : 'FALSE'),
          output: condResult ? `Continue to body iteration #${iteration}` : `Exit loop`,
          next: condResult ? 'Execute body statements.' : 'Exit loop to next sequential instruction.',
          whatHappens: condResult ? `Loop condition holds TRUE. Entering iteration #${iteration}.` : `Loop condition is FALSE. Exiting loop.`,
          stateChange: [],
        };

        recordStep(ctx, `node_${stmt.id}_head`, stmt.line, stmt.rawCode, `Loop #${iteration} check: ${condResult ? 'TRUE' : 'FALSE'}`, explanation, {
          loopEval,
        });

        if (!condResult) break;

        const bodyRes = executeStatementList(stmt.body, ctx);
        if (bodyRes && bodyRes.isReturn) return bodyRes;

        if (stmt.increment) {
          executeStatement(stmt.increment, ctx);
        }

        iteration++;
      }
      break;
    }

    case 'WhileLoop': {
      let iteration = 1;
      while (true) {
        if (ctx.stepCounter >= MAX_STEPS) throw new Error('MAX_STEPS_REACHED');

        const evalRes = evaluateExpressionWithFunctions(stmt.condition, ctx);
        const condResult = Boolean(evalRes.value);

        Object.entries(evalRes.readVariables).forEach(([rVar, rVal]) => {
          recordLifecycleEvent(ctx, rVar, {
            type: 'READ',
            line: stmt.line,
            value: rVal,
            description: `Read for while condition iteration #${iteration}`,
          });
        });

        const loopEval = {
          loopId: stmt.id,
          loopType: 'while' as const,
          iteration,
          condition: stmt.rawCode,
          conditionResult: condResult,
          phase: (condResult ? 'CHECK' : 'EXIT') as any,
        };

        const explanation: DynamicExplanation = {
          stepNumber: ctx.stepCounter,
          title: `While Loop: Iteration ${iteration} [${condResult ? 'TRUE' : 'FALSE'}]`,
          lineContent: stmt.rawCode,
          what: `Tests while condition '${stmt.rawCode}'.`,
          why: `Controls whether to execute loop body for iteration #${iteration}.`,
          input: Object.entries(evalRes.readVariables).map(([k, v]) => `${k} = ${formatVal(v)}`).join(', ') || 'None',
          calculation: `${evalRes.explanation || formatVal(condResult)} ⇒ ${condResult ? 'TRUE' : 'FALSE'}`,
          output: condResult ? `Enter body #${iteration}` : `Exit while loop`,
          next: condResult ? 'Execute while body.' : 'Exit while loop.',
          whatHappens: condResult ? `Condition is TRUE. Running iteration #${iteration}.` : `Condition is FALSE. Exiting while loop.`,
          stateChange: [],
        };

        recordStep(ctx, `node_${stmt.id}_head`, stmt.line, stmt.rawCode, `While #${iteration}: ${condResult ? 'TRUE' : 'FALSE'}`, explanation, {
          loopEval,
        });

        if (!condResult) break;

        const bodyRes = executeStatementList(stmt.body, ctx);
        if (bodyRes && bodyRes.isReturn) return bodyRes;

        iteration++;
      }
      break;
    }

    case 'DoWhileLoop': {
      let iteration = 1;
      while (true) {
        if (ctx.stepCounter >= MAX_STEPS) throw new Error('MAX_STEPS_REACHED');

        const bodyRes = executeStatementList(stmt.body, ctx);
        if (bodyRes && bodyRes.isReturn) return bodyRes;

        const evalRes = evaluateExpressionWithFunctions(stmt.condition, ctx);
        const condResult = Boolean(evalRes.value);

        const explanation: DynamicExplanation = {
          stepNumber: ctx.stepCounter,
          title: `Do-While Condition: Iteration ${iteration}`,
          lineContent: stmt.rawCode,
          what: `Evaluates post-condition for do-while iteration #${iteration}.`,
          why: `Determines whether to repeat execution loop.`,
          input: Object.entries(evalRes.readVariables).map(([k, v]) => `${k} = ${formatVal(v)}`).join(', ') || 'None',
          calculation: `${evalRes.explanation} ⇒ ${condResult ? 'TRUE' : 'FALSE'}`,
          output: condResult ? 'Repeat loop body' : 'Terminate loop',
          next: condResult ? 'Loops back to start of body.' : 'Proceeds past loop.',
          whatHappens: condResult ? `Condition is TRUE. Repeating body.` : `Condition is FALSE. Terminated.`,
          stateChange: [],
        };

        recordStep(ctx, `node_${stmt.id}_cond`, stmt.line, stmt.rawCode, `Do-While condition: ${condResult ? 'TRUE' : 'FALSE'}`, explanation);

        if (!condResult) break;
        iteration++;
      }
      break;
    }

    case 'PrintStatement': {
      let outputText = '';
      const readVars: Record<string, any> = {};

      if (stmt.formatString) {
        let str = stmt.formatString;
        const evaluatedArgs = stmt.expressions.map(e => {
          const res = evaluateExpressionWithFunctions(e, ctx);
          Object.assign(readVars, res.readVariables);
          return res.value;
        });
        let argIdx = 0;
        str = str.replace(/%[dsf]/g, () => {
          if (argIdx < evaluatedArgs.length) {
            const v = evaluatedArgs[argIdx++];
            return String(v);
          }
          return '';
        });
        str = str.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
        outputText = str;
      } else {
        const evaluatedArgs = stmt.expressions.map(e => {
          const res = evaluateExpressionWithFunctions(e, ctx);
          Object.assign(readVars, res.readVariables);
          return formatVal(res.value).replace(/^"(.*)"$/, '$1');
        });
        outputText = evaluatedArgs.join(' ');
      }

      Object.entries(readVars).forEach(([rVar, rVal]) => {
        recordLifecycleEvent(ctx, rVar, {
          type: 'PRINTED',
          line: stmt.line,
          value: rVal,
          description: `Printed to standard output: "${outputText.trim()}"`,
        });
      });

      ctx.output.push(outputText);

      const explanation: DynamicExplanation = {
        stepNumber: ctx.stepCounter,
        title: `Print Output: "${outputText.trim()}"`,
        lineContent: stmt.rawCode,
        what: `Flushes formatted string "${outputText.trim()}" to standard output console.`,
        why: `I/O statement explicitly requested by program.`,
        input: Object.entries(readVars).map(([k, v]) => `${k} = ${formatVal(v)}`).join(', ') || `"${outputText.trim()}"`,
        calculation: `Formatted stream output`,
        output: `Console: "${outputText.trim()}"`,
        next: 'Advances to next instruction.',
        whatHappens: `Writes "${outputText.trim()}" to standard output console.`,
        stateChange: [`Console: "${outputText.trim()}"`],
      };

      recordStep(ctx, `node_${stmt.id}`, stmt.line, stmt.rawCode, `Output: ${outputText.trim()}`, explanation, {
        newOutput: outputText,
      });
      break;
    }

    case 'ReturnStatement': {
      let retVal: any = undefined;
      let calcStr: string | undefined;
      const readVars: Record<string, any> = {};

      if (stmt.valueExpr) {
        const evalRes = evaluateExpressionWithFunctions(stmt.valueExpr, ctx);
        retVal = evalRes.value;
        calcStr = evalRes.explanation;
        Object.assign(readVars, evalRes.readVariables);
      }

      Object.entries(readVars).forEach(([rVar, rVal]) => {
        recordLifecycleEvent(ctx, rVar, {
          type: 'RETURNED',
          line: stmt.line,
          value: rVal,
          description: `Used in return expression with value ${formatVal(retVal)}`,
        });
      });

      const explanation: DynamicExplanation = {
        stepNumber: ctx.stepCounter,
        title: `Return Value: ${formatVal(retVal)}`,
        lineContent: stmt.rawCode,
        what: `Yields return value ${formatVal(retVal)} and terminates function '${currentFrame.functionName}()'.`,
        why: `Reached return statement in function scope.`,
        input: Object.entries(readVars).map(([k, v]) => `${k} = ${formatVal(v)}`).join(', ') || formatVal(retVal),
        calculation: calcStr ? calcStr : `return ${formatVal(retVal)}`,
        output: `Return value = ${formatVal(retVal)}`,
        next: 'Pops stack frame and hands control back to caller.',
        whatHappens: `Returns ${formatVal(retVal)} from '${currentFrame.functionName}()' and pops stack frame.`,
        stateChange: [`Return value: ${formatVal(retVal)}`],
      };

      recordStep(ctx, `node_${stmt.id}`, stmt.line, stmt.rawCode, `Returned ${formatVal(retVal)} from ${currentFrame.functionName}`, explanation, {
        functionReturn: {
          functionName: currentFrame.functionName,
          returnValue: retVal,
        },
      });

      return { isReturn: true, value: retVal };
    }

    case 'ExpressionStatement': {
      if (stmt.expression.type === 'FunctionCall') {
        const fnName = stmt.expression.functionName;
        const argValues = stmt.expression.args.map(a => evaluateExpressionWithFunctions(a, ctx).value);
        invokeFunction(fnName, argValues, stmt.line, `node_${stmt.id}`, ctx);
      } else {
        const evalRes = evaluateExpressionWithFunctions(stmt.expression, ctx);
        const explanation: DynamicExplanation = {
          stepNumber: ctx.stepCounter,
          title: `Evaluate Expression`,
          lineContent: stmt.rawCode,
          what: `Evaluates expression.`,
          why: `Standalone expression statement.`,
          input: Object.entries(evalRes.readVariables).map(([k, v]) => `${k} = ${formatVal(v)}`).join(', ') || 'None',
          calculation: evalRes.explanation,
          output: `Result = ${formatVal(evalRes.value)}`,
          next: 'Proceeds to next instruction.',
          whatHappens: `Evaluates expression.`,
          stateChange: [],
        };
        recordStep(ctx, `node_${stmt.id}`, stmt.line, stmt.rawCode, `Evaluated expression`, explanation);
      }
      break;
    }
  }
}

function evaluateExpressionWithFunctions(expr: any, ctx: ExecutionContext) {
  const currentFrame = getActiveFrame(ctx);
  return evaluateExpression(
    expr,
    currentFrame.localVars,
    ctx.globalVars,
    (name: string, args: any[]) => {
      return invokeFunction(name, args, 0, undefined, ctx);
    }
  );
}

function invokeFunction(
  name: string,
  args: any[],
  callLine: number,
  callNodeId: string | undefined,
  ctx: ExecutionContext
): any {
  if (ctx.callStack.length >= MAX_CALL_DEPTH) {
    throw new Error(`Maximum recursion stack depth (${MAX_CALL_DEPTH}) exceeded in ${name}()`);
  }

  const fn = ctx.fnMap.get(name);
  if (!fn) {
    if (name === 'abs' || name === 'Math.abs') return Math.abs(args[0]);
    if (name === 'max' || name === 'Math.max') return Math.max(...args);
    if (name === 'min' || name === 'Math.min') return Math.min(...args);
    if (name === 'sqrt' || name === 'Math.sqrt') return Math.sqrt(args[0]);
    return undefined;
  }

  const paramMap: Record<string, any> = {};
  fn.params.forEach((param, idx) => {
    paramMap[param] = args[idx] !== undefined ? args[idx] : 0;
    ensureLifecycle(ctx, param, name, fn.lineStart);
    recordLifecycleEvent(ctx, param, {
      type: 'INITIALIZED',
      line: fn.lineStart,
      value: paramMap[param],
      description: `Passed as parameter to ${name}() with value ${formatVal(paramMap[param])}`,
    });
  });

  const isRecursive = ctx.callStack.some(f => f.functionName === name);

  const newFrame: StackFrame = {
    id: `frame_${name}_${ctx.callStack.length}_${Date.now()}_${Math.random()}`,
    functionName: name,
    args: paramMap,
    localVars: { ...paramMap },
    callerLine: callLine,
    callerNodeId: callNodeId,
    depth: ctx.callStack.length,
  };

  const argsFormatted = Object.entries(paramMap).map(([k, v]) => `${k} = ${formatVal(v)}`).join(', ');
  const explanation: DynamicExplanation = {
    stepNumber: ctx.stepCounter,
    title: `Call Function: ${name}(${args.map(formatVal).join(', ')})`,
    lineContent: `${name}(${args.map(formatVal).join(', ')})`,
    what: `${isRecursive ? 'Recursive invocation' : 'Function call'} of '${name}()' with arguments (${args.map(formatVal).join(', ')}).`,
    why: `Transfers control to function implementation and sets up local stack frame.`,
    input: argsFormatted || 'None',
    calculation: `Stack frame allocated (depth #${newFrame.depth})`,
    output: `Initialized parameters: ${argsFormatted}`,
    next: `Enters function '${name}()' body.`,
    whatHappens: `${isRecursive ? 'Recursive call: ' : ''}Pushing new stack frame for '${name}' (depth ${newFrame.depth}). Initializing arguments: ${argsFormatted}.`,
    stateChange: Object.entries(paramMap).map(([k, v]) => `${k} = ${formatVal(v)}`),
  };

  ctx.callStack.push(newFrame);

  recordStep(ctx, `fn_entry_${name}`, fn.lineStart, `def ${name}(${fn.params.join(', ')})`, `Called ${name}(${args.map(formatVal).join(', ')})`, explanation, {
    functionCall: {
      functionName: name,
      args: paramMap,
      depth: newFrame.depth,
      isRecursive,
    },
  });

  const result = executeStatementList(fn.body, ctx);
  const retVal = result && result.isReturn ? result.value : undefined;

  ctx.callStack.pop();

  return retVal;
}

function collectAnnotations(ir: IRProgram, annotations: LineAnnotation[]) {
  function processList(stmts: IRStatement[]) {
    for (const s of stmts) {
      if (s.type === 'VariableDecl') {
        annotations.push({
          line: s.line,
          type: 'VARIABLE_DECL',
          nodeId: `node_${s.id}`,
          label: `Declare ${s.varName}`,
          iconType: 'var',
        });
      } else if (s.type === 'Assignment') {
        annotations.push({
          line: s.line,
          type: 'VARIABLE_MUTATION',
          nodeId: `node_${s.id}`,
          label: `Modify ${s.target}`,
          iconType: 'var',
        });
      } else if (s.type === 'IfStatement') {
        annotations.push({
          line: s.line,
          type: 'CONDITION',
          nodeId: `node_${s.id}_cond`,
          label: 'Branch Condition',
          iconType: 'branch',
        });
        processList(s.thenBranch);
        if (s.elseBranch) processList(s.elseBranch);
      } else if (s.type === 'ForLoop' || s.type === 'WhileLoop' || s.type === 'DoWhileLoop') {
        annotations.push({
          line: s.line,
          type: 'LOOP',
          nodeId: `node_${s.id}_head`,
          label: 'Loop Condition',
          iconType: 'loop',
        });
        processList(s.body);
      } else if (s.type === 'PrintStatement') {
        annotations.push({
          line: s.line,
          type: 'OUTPUT',
          nodeId: `node_${s.id}`,
          label: 'Console Output',
          iconType: 'output',
        });
      } else if (s.type === 'ReturnStatement') {
        annotations.push({
          line: s.line,
          type: 'RETURN',
          nodeId: `node_${s.id}`,
          label: 'Function Return',
          iconType: 'return',
        });
      }
    }
  }

  for (const fn of ir.functions) {
    annotations.push({
      line: fn.lineStart,
      type: 'FUNCTION',
      nodeId: `fn_entry_${fn.name}`,
      label: `Function ${fn.name}()`,
      iconType: 'fn',
    });
    processList(fn.body);
  }

  processList(ir.mainBody);
}
