/**
 * CodeFlow Graph - Safe Expression Evaluator with Explanation Breakdown
 */

import { IRExpression } from '../../types/codeflow.ts';

export interface EvalResult {
  value: any;
  explanation: string;
  readVariables: Record<string, any>;
  subCalculations: string[];
}

export function evaluateExpression(
  expr: IRExpression,
  scopeVars: Record<string, any>,
  globalVars: Record<string, any> = {},
  functionResolver?: (name: string, args: any[]) => any
): EvalResult {
  const readVariables: Record<string, any> = {};
  const subCalculations: string[] = [];

  function getVar(name: string): any {
    if (Object.prototype.hasOwnProperty.call(scopeVars, name)) {
      readVariables[name] = scopeVars[name];
      return scopeVars[name];
    }
    if (Object.prototype.hasOwnProperty.call(globalVars, name)) {
      readVariables[name] = globalVars[name];
      return globalVars[name];
    }
    return undefined;
  }

  function evalNode(e: IRExpression): any {
    if (!e) return undefined;

    switch (e.type) {
      case 'Literal':
        return e.value;

      case 'Identifier': {
        const v = getVar(e.name);
        return v;
      }

      case 'BinaryOp': {
        const leftVal = evalNode(e.left);
        const rightVal = evalNode(e.right);
        let res: any;

        switch (e.operator) {
          case '+': res = leftVal + rightVal; break;
          case '-': res = leftVal - rightVal; break;
          case '*': res = leftVal * rightVal; break;
          case '/': res = rightVal === 0 ? 0 : (typeof leftVal === 'number' && typeof rightVal === 'number' && Number.isInteger(leftVal) && Number.isInteger(rightVal) ? Math.trunc(leftVal / rightVal) : leftVal / rightVal); break;
          case '%': res = leftVal % rightVal; break;
          case '==':
          case '===': res = leftVal == rightVal; break;
          case '!=':
          case '!==': res = leftVal != rightVal; break;
          case '<': res = leftVal < rightVal; break;
          case '<=': res = leftVal <= rightVal; break;
          case '>': res = leftVal > rightVal; break;
          case '>=': res = leftVal >= rightVal; break;
          case '&&':
          case 'and': res = Boolean(leftVal && rightVal); break;
          case '||':
          case 'or': res = Boolean(leftVal || rightVal); break;
          default: res = leftVal; break;
        }

        subCalculations.push(`${formatVal(leftVal)} ${e.operator} ${formatVal(rightVal)} = ${formatVal(res)}`);
        return res;
      }

      case 'UnaryOp': {
        const argVal = evalNode(e.argument);
        let res: any;
        switch (e.operator) {
          case '-': res = -argVal; break;
          case '+': res = +argVal; break;
          case '!': res = !argVal; break;
          case '++': res = argVal + 1; break;
          case '--': res = argVal - 1; break;
          default: res = argVal; break;
        }
        subCalculations.push(`${e.operator}${formatVal(argVal)} = ${formatVal(res)}`);
        return res;
      }

      case 'ArrayAccess': {
        const arr = evalNode(e.array);
        const idx = evalNode(e.index);
        if (Array.isArray(arr)) {
          const val = arr[idx];
          subCalculations.push(`arr[${idx}] = ${formatVal(val)}`);
          return val;
        }
        return undefined;
      }

      case 'ArrayLiteral': {
        return e.elements.map(el => evalNode(el));
      }

      case 'FunctionCall': {
        const argVals = e.args.map(a => evalNode(a));
        if (functionResolver) {
          const ret = functionResolver(e.functionName, argVals);
          subCalculations.push(`${e.functionName}(${argVals.map(formatVal).join(', ')}) = ${formatVal(ret)}`);
          return ret;
        }
        return undefined;
      }

      default:
        return undefined;
    }
  }

  const value = evalNode(expr);
  let explanation = '';
  if (subCalculations.length > 0) {
    explanation = subCalculations[subCalculations.length - 1];
  } else {
    explanation = formatVal(value);
  }

  return {
    value,
    explanation,
    readVariables,
    subCalculations,
  };
}

export function formatVal(val: any): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'string') return `"${val}"`;
  if (Array.isArray(val)) return `[${val.map(formatVal).join(', ')}]`;
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  return String(val);
}
