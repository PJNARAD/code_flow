/**
 * CodeFlow Graph - Recursive Descent Expression Parser
 */

import { IRExpression, IRLiteral, IRIdentifier, IRBinaryOp, IRUnaryOp, IRFunctionCallExpr, IRArrayAccess, IRArrayLiteral } from '../../types/codeflow.ts';
import { Token } from './tokenizer.ts';

export class ExpressionParser {
  private tokens: Token[];
  private pos: number = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens.filter(t => t.type !== 'COMMENT' && t.type !== 'NEWLINE');
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  private match(val: string): boolean {
    const t = this.peek();
    if (t && t.value === val) {
      this.advance();
      return true;
    }
    return false;
  }

  public parse(): IRExpression {
    if (this.tokens.length === 0) {
      return { type: 'Literal', value: null, raw: 'null' };
    }
    return this.parseLogicalOr();
  }

  // Precedence level 1: Logical OR (||, or)
  private parseLogicalOr(): IRExpression {
    let expr = this.parseLogicalAnd();
    while (this.match('||') || this.match('or')) {
      const right = this.parseLogicalAnd();
      expr = {
        type: 'BinaryOp',
        operator: '||',
        left: expr,
        right,
      } as IRBinaryOp;
    }
    return expr;
  }

  // Precedence level 2: Logical AND (&&, and)
  private parseLogicalAnd(): IRExpression {
    let expr = this.parseEquality();
    while (this.match('&&') || this.match('and')) {
      const right = this.parseEquality();
      expr = {
        type: 'BinaryOp',
        operator: '&&',
        left: expr,
        right,
      } as IRBinaryOp;
    }
    return expr;
  }

  // Precedence level 3: Equality (==, !=, ===, !==, is)
  private parseEquality(): IRExpression {
    let expr = this.parseRelational();
    while (this.peek() && ['==', '!=', '===', '!==', 'is'].includes(this.peek()!.value)) {
      const op = this.advance().value;
      const right = this.parseRelational();
      expr = {
        type: 'BinaryOp',
        operator: op === '===' ? '==' : op === '!==' ? '!=' : op,
        left: expr,
        right,
      } as IRBinaryOp;
    }
    return expr;
  }

  // Precedence level 4: Relational (<, <=, >, >=)
  private parseRelational(): IRExpression {
    let expr = this.parseAdditive();
    while (this.peek() && ['<', '<=', '>', '>='].includes(this.peek()!.value)) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      expr = {
        type: 'BinaryOp',
        operator: op,
        left: expr,
        right,
      } as IRBinaryOp;
    }
    return expr;
  }

  // Precedence level 5: Additive (+, -)
  private parseAdditive(): IRExpression {
    let expr = this.parseMultiplicative();
    while (this.peek() && ['+', '-'].includes(this.peek()!.value)) {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      expr = {
        type: 'BinaryOp',
        operator: op,
        left: expr,
        right,
      } as IRBinaryOp;
    }
    return expr;
  }

  // Precedence level 6: Multiplicative (*, /, %, **)
  private parseMultiplicative(): IRExpression {
    let expr = this.parseUnary();
    while (this.peek() && ['*', '/', '%', '**', '//'].includes(this.peek()!.value)) {
      const op = this.advance().value;
      const right = this.parseUnary();
      expr = {
        type: 'BinaryOp',
        operator: op === '//' ? '/' : op,
        left: expr,
        right,
      } as IRBinaryOp;
    }
    return expr;
  }

  // Precedence level 7: Unary (!, -, +, ++, --, not)
  private parseUnary(): IRExpression {
    const t = this.peek();
    if (t && ['!', '-', '+', '++', '--', 'not', '~'].includes(t.value)) {
      const op = this.advance().value;
      const arg = this.parseUnary();
      return {
        type: 'UnaryOp',
        operator: op === 'not' ? '!' : op,
        argument: arg,
        prefix: true,
      } as IRUnaryOp;
    }
    return this.parsePostfix();
  }

  // Postfix (array access, function call, ++, --)
  private parsePostfix(): IRExpression {
    let expr = this.parsePrimary();

    while (true) {
      const t = this.peek();
      if (!t) break;

      // Function call: expr(arg1, arg2)
      if (t.value === '(') {
        this.advance(); // skip '('
        const args: IRExpression[] = [];
        if (this.peek() && this.peek()!.value !== ')') {
          while (true) {
            args.push(this.parseSubExpression());
            if (this.match(',')) continue;
            break;
          }
        }
        this.match(')');
        let fnName = 'anonymous';
        if (expr.type === 'Identifier') {
          fnName = expr.name;
        } else if (expr.type === 'Literal') {
          fnName = String(expr.value);
        }
        expr = {
          type: 'FunctionCall',
          functionName: fnName,
          args,
        } as IRFunctionCallExpr;
        continue;
      }

      // Array access: expr[index]
      if (t.value === '[') {
        this.advance(); // skip '['
        const indexExpr = this.parseSubExpression();
        this.match(']');
        expr = {
          type: 'ArrayAccess',
          array: expr,
          index: indexExpr,
        } as IRArrayAccess;
        continue;
      }

      // Postfix ++ or --
      if (t.value === '++' || t.value === '--') {
        const op = this.advance().value;
        expr = {
          type: 'UnaryOp',
          operator: op,
          argument: expr,
          prefix: false,
        } as IRUnaryOp;
        continue;
      }

      break;
    }

    return expr;
  }

  // Parse a subexpression up to a delimiter like ',' or ')' or ']'
  private parseSubExpression(): IRExpression {
    // Collect tokens until matching delimiter
    const subTokens: Token[] = [];
    let parenDepth = 0;
    let bracketDepth = 0;
    let braceDepth = 0;

    while (this.pos < this.tokens.length) {
      const t = this.tokens[this.pos];
      if (t.value === '(') parenDepth++;
      else if (t.value === ')') {
        if (parenDepth === 0) break;
        parenDepth--;
      } else if (t.value === '[') bracketDepth++;
      else if (t.value === ']') {
        if (bracketDepth === 0) break;
        bracketDepth--;
      } else if (t.value === '{') braceDepth++;
      else if (t.value === '}') {
        if (braceDepth === 0) break;
        braceDepth--;
      } else if (t.value === ',' && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
        break;
      }
      subTokens.push(this.advance());
    }

    if (subTokens.length === 0) {
      return { type: 'Literal', value: null, raw: 'null' };
    }
    const subParser = new ExpressionParser(subTokens);
    return subParser.parse();
  }

  // Primary: literals, identifiers, parenthesized expressions, array literals
  private parsePrimary(): IRExpression {
    const t = this.peek();
    if (!t) {
      return { type: 'Literal', value: null, raw: 'null' };
    }

    // Parentheses
    if (t.value === '(') {
      this.advance();
      const expr = this.parseSubExpression();
      this.match(')');
      return expr;
    }

    // Array literals [1, 2, 3] or {1, 2, 3}
    if (t.value === '[' || t.value === '{') {
      const closing = t.value === '[' ? ']' : '}';
      this.advance();
      const elements: IRExpression[] = [];
      if (this.peek() && this.peek()!.value !== closing) {
        while (true) {
          elements.push(this.parseSubExpression());
          if (this.match(',')) continue;
          break;
        }
      }
      this.match(closing);
      return {
        type: 'ArrayLiteral',
        elements,
      } as IRArrayLiteral;
    }

    // Number
    if (t.type === 'NUMBER') {
      this.advance();
      const num = Number(t.value);
      return {
        type: 'Literal',
        value: isNaN(num) ? 0 : num,
        raw: t.value,
      } as IRLiteral;
    }

    // String
    if (t.type === 'STRING') {
      this.advance();
      let str = t.value;
      if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'")) || (str.startsWith('`') && str.endsWith('`'))) {
        str = str.slice(1, -1);
      }
      return {
        type: 'Literal',
        value: str,
        raw: t.value,
      } as IRLiteral;
    }

    // Boolean / Null / None
    if (['true', 'True'].includes(t.value)) {
      this.advance();
      return { type: 'Literal', value: true, raw: t.value } as IRLiteral;
    }
    if (['false', 'False'].includes(t.value)) {
      this.advance();
      return { type: 'Literal', value: false, raw: t.value } as IRLiteral;
    }
    if (['null', 'None', 'NULL', 'nullptr'].includes(t.value)) {
      this.advance();
      return { type: 'Literal', value: null, raw: t.value } as IRLiteral;
    }

    // Identifiers or other tokens
    this.advance();
    return {
      type: 'Identifier',
      name: t.value,
    } as IRIdentifier;
  }
}

export function parseExpression(tokens: Token[]): IRExpression {
  const parser = new ExpressionParser(tokens);
  return parser.parse();
}
