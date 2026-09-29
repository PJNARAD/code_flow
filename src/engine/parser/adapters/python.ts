/**
 * CodeFlow Graph - Python Language Adapter
 */

import {
  IRProgram,
  IRFunction,
  IRStatement,
  IRVariableDecl,
  IRAssignment,
  IRIfStatement,
  IRForLoop,
  IRWhileLoop,
  IRReturnStatement,
  IRExpressionStatement,
  IRPrintStatement,
} from '../../../types/codeflow.ts';
import { Token, tokenize } from '../tokenizer.ts';
import { ExpressionParser } from '../expressionParser.ts';

export class PythonAdapter {
  private tokens: Token[] = [];
  private pos: number = 0;
  private stmtIdCounter: number = 1;
  private errors: { message: string; line?: number; column?: number }[] = [];
  private rawLines: string[] = [];

  public parse(source: string): { ir: IRProgram; errors: { message: string; line?: number; column?: number }[] } {
    this.rawLines = source.split('\n');
    this.tokens = tokenize(source, true).filter(t => t.type !== 'COMMENT');
    this.pos = 0;
    this.stmtIdCounter = 1;
    this.errors = [];

    const functions: IRFunction[] = [];
    const mainBody: IRStatement[] = [];
    const allVariables = new Set<string>();

    while (!this.isAtEnd()) {
      if (this.peek()?.type === 'NEWLINE' || this.peek()?.type === 'INDENT' || this.peek()?.type === 'DEDENT') {
        this.advance();
        continue;
      }

      try {
        if (this.peek()?.value === 'def') {
          const fn = this.parseFunctionDeclaration();
          if (fn) functions.push(fn);
        } else {
          const stmt = this.parseStatement('global');
          if (stmt) {
            mainBody.push(stmt);
          }
        }
      } catch (err: any) {
        const curTok = this.peek();
        this.errors.push({
          message: err.message || 'Syntax error in Python parser',
          line: curTok?.line || 1,
          column: curTok?.column || 1,
        });
        this.advance();
      }
    }

    for (const fn of functions) {
      fn.params.forEach(p => allVariables.add(p));
      this.collectVariables(fn.body, allVariables);
    }
    this.collectVariables(mainBody, allVariables);

    const program: IRProgram = {
      type: 'Program',
      language: 'python',
      functions,
      mainBody,
      allVariables: Array.from(allVariables),
    };

    return { ir: program, errors: this.errors };
  }

  private collectVariables(stmts: IRStatement[], vars: Set<string>) {
    for (const s of stmts) {
      if (s.type === 'VariableDecl') vars.add(s.varName);
      if (s.type === 'Assignment') vars.add(s.target);
      if (s.type === 'IfStatement') {
        this.collectVariables(s.thenBranch, vars);
        if (s.elseBranch) this.collectVariables(s.elseBranch, vars);
      }
      if (s.type === 'ForLoop') {
        if (s.init && s.init.type === 'Assignment') vars.add(s.init.target);
        if (s.init && s.init.type === 'VariableDecl') vars.add(s.init.varName);
        this.collectVariables(s.body, vars);
      }
      if (s.type === 'WhileLoop') {
        this.collectVariables(s.body, vars);
      }
    }
  }

  private nextId(prefix: string = 'stmt'): string {
    return `${prefix}_${this.stmtIdCounter++}`;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  private isAtEnd(): boolean {
    const t = this.peek();
    return !t || t.type === 'EOF';
  }

  private match(val: string): boolean {
    if (this.peek()?.value === val) {
      this.advance();
      return true;
    }
    return false;
  }

  private parseFunctionDeclaration(): IRFunction | null {
    const defTok = this.advance(); // 'def'
    const nameTok = this.advance();
    const name = nameTok.value;
    this.match('(');
    const params: string[] = [];
    if (this.peek()?.value !== ')') {
      while (!this.isAtEnd()) {
        if (this.peek()?.type === 'IDENTIFIER') {
          params.push(this.advance().value);
        }
        if (this.match(',')) continue;
        break;
      }
    }
    this.match(')');
    this.match(':');

    // Skip newline and expect INDENT
    while (this.peek()?.type === 'NEWLINE') this.advance();
    this.match('INDENT') || (this.peek()?.type === 'INDENT' && this.advance());

    const body: IRStatement[] = [];
    while (!this.isAtEnd() && this.peek()?.type !== 'DEDENT') {
      while (this.peek()?.type === 'NEWLINE') this.advance();
      if (this.peek()?.type === 'DEDENT' || this.isAtEnd()) break;
      const stmt = this.parseStatement(name);
      if (stmt) body.push(stmt);
    }
    if (this.peek()?.type === 'DEDENT') this.advance();

    return {
      name,
      params,
      body,
      lineStart: defTok.line,
      lineEnd: body[body.length - 1]?.line || defTok.line,
      returnType: 'dynamic',
    };
  }

  public parseStatement(scope: string): IRStatement | null {
    while (this.peek()?.type === 'NEWLINE') this.advance();
    if (this.isAtEnd() || this.peek()?.type === 'DEDENT') return null;

    const t = this.peek();
    if (!t) return null;

    // IF STATEMENT
    if (t.value === 'if') {
      return this.parseIf(scope);
    }

    // FOR LOOP (e.g., for i in range(5): or for x in arr:)
    if (t.value === 'for') {
      return this.parseFor(scope);
    }

    // WHILE LOOP
    if (t.value === 'while') {
      return this.parseWhile(scope);
    }

    // RETURN STATEMENT
    if (t.value === 'return') {
      return this.parseReturn(scope);
    }

    // PRINT STATEMENT
    if (t.value === 'print') {
      return this.parsePrint(scope);
    }

    // ASSIGNMENT OR EXPRESSION
    return this.parseAssignmentOrExpr(scope);
  }

  private parseIf(scope: string): IRIfStatement {
    const startTok = this.advance(); // 'if' or 'elif'
    const condTokens: Token[] = [];
    while (!this.isAtEnd() && this.peek()?.value !== ':') {
      condTokens.push(this.advance());
    }
    this.match(':');
    const condition = new ExpressionParser(condTokens).parse();

    const thenBranch = this.parseIndentedBlock(scope);
    let elseBranch: IRStatement[] | undefined;

    while (this.peek()?.type === 'NEWLINE') this.advance();

    if (this.peek()?.value === 'elif') {
      elseBranch = [this.parseIf(scope)];
    } else if (this.peek()?.value === 'else') {
      this.advance(); // 'else'
      this.match(':');
      elseBranch = this.parseIndentedBlock(scope);
    }

    const rawLine = this.rawLines[startTok.line - 1]?.trim() || `if ...:`;

    return {
      id: this.nextId('if'),
      type: 'IfStatement',
      line: startTok.line,
      rawCode: rawLine,
      scope,
      condition,
      thenBranch,
      elseBranch,
    };
  }

  private parseFor(scope: string): IRForLoop {
    const startTok = this.advance(); // 'for'
    const varTok = this.advance(); // loop var
    this.match('in');

    const iterTokens: Token[] = [];
    while (!this.isAtEnd() && this.peek()?.value !== ':') {
      iterTokens.push(this.advance());
    }
    this.match(':');

    // Interpret range(start, end, step) or range(N)
    let rangeExpr = iterTokens.map(t => t.value).join('');
    let initVal = '0';
    let limitVal = '5';
    let stepVal = '1';

    if (rangeExpr.startsWith('range(') && rangeExpr.endsWith(')')) {
      const inner = rangeExpr.slice(6, -1).split(',').map(s => s.trim());
      if (inner.length === 1) {
        limitVal = inner[0];
      } else if (inner.length >= 2) {
        initVal = inner[0];
        limitVal = inner[1];
        if (inner.length >= 3) stepVal = inner[2];
      }
    }

    const varName = varTok.value;
    const init: IRAssignment = {
      id: this.nextId('assign'),
      type: 'Assignment',
      line: startTok.line,
      rawCode: `${varName} = ${initVal}`,
      scope,
      target: varName,
      operator: '=',
      valueExpr: { type: 'Literal', value: Number(initVal) || 0, raw: initVal },
    };

    const condition: any = {
      type: 'BinaryOp',
      operator: '<',
      left: { type: 'Identifier', name: varName },
      right: { type: 'Literal', value: Number(limitVal) || 5, raw: limitVal },
    };

    const increment: IRAssignment = {
      id: this.nextId('assign'),
      type: 'Assignment',
      line: startTok.line,
      rawCode: `${varName} += ${stepVal}`,
      scope,
      target: varName,
      operator: '+=',
      valueExpr: { type: 'Literal', value: Number(stepVal) || 1, raw: stepVal },
    };

    const body = this.parseIndentedBlock(scope);
    const rawLine = this.rawLines[startTok.line - 1]?.trim() || `for ${varName} in range(...):`;

    return {
      id: this.nextId('for'),
      type: 'ForLoop',
      line: startTok.line,
      rawCode: rawLine,
      scope,
      init,
      condition,
      increment,
      body,
    };
  }

  private parseWhile(scope: string): IRWhileLoop {
    const startTok = this.advance(); // 'while'
    const condTokens: Token[] = [];
    while (!this.isAtEnd() && this.peek()?.value !== ':') {
      condTokens.push(this.advance());
    }
    this.match(':');
    const condition = new ExpressionParser(condTokens).parse();
    const body = this.parseIndentedBlock(scope);
    const rawLine = this.rawLines[startTok.line - 1]?.trim() || `while ...:`;

    return {
      id: this.nextId('while'),
      type: 'WhileLoop',
      line: startTok.line,
      rawCode: rawLine,
      scope,
      condition,
      body,
    };
  }

  private parseReturn(scope: string): IRReturnStatement {
    const startTok = this.advance(); // 'return'
    const exprTokens: Token[] = [];
    while (!this.isAtEnd() && this.peek()?.type !== 'NEWLINE') {
      exprTokens.push(this.advance());
    }
    const valueExpr = exprTokens.length > 0 ? new ExpressionParser(exprTokens).parse() : undefined;
    const rawLine = this.rawLines[startTok.line - 1]?.trim() || `return`;

    return {
      id: this.nextId('return'),
      type: 'ReturnStatement',
      line: startTok.line,
      rawCode: rawLine,
      scope,
      valueExpr,
    };
  }

  private parsePrint(scope: string): IRPrintStatement {
    const startTok = this.advance(); // 'print'
    this.match('(');
    const args: Token[][] = [];
    let curArg: Token[] = [];
    let pDepth = 0;
    while (!this.isAtEnd()) {
      const t = this.peek()!;
      if (t.value === '(') pDepth++;
      else if (t.value === ')') {
        if (pDepth === 0) break;
        pDepth--;
      } else if (t.value === ',' && pDepth === 0) {
        args.push(curArg);
        curArg = [];
        this.advance();
        continue;
      }
      curArg.push(this.advance());
    }
    if (curArg.length > 0) args.push(curArg);
    this.match(')');

    const expressions = args.map(a => new ExpressionParser(a).parse());
    const rawLine = this.rawLines[startTok.line - 1]?.trim() || `print(...)`;

    return {
      id: this.nextId('print'),
      type: 'PrintStatement',
      line: startTok.line,
      rawCode: rawLine,
      scope,
      expressions,
      newline: true,
    };
  }

  private parseAssignmentOrExpr(scope: string): IRStatement {
    const startTok = this.peek()!;
    const lineNum = startTok?.line || 1;
    const tokens: Token[] = [];

    while (!this.isAtEnd() && this.peek()?.type !== 'NEWLINE') {
      tokens.push(this.advance());
    }

    const rawLine = this.rawLines[lineNum - 1]?.trim() || tokens.map(t => t.value).join(' ');

    let assignIndex = -1;
    let op = '=';
    for (let i = 0; i < tokens.length; i++) {
      if (['=', '+=', '-=', '*=', '/=', '%='].includes(tokens[i].value)) {
        assignIndex = i;
        op = tokens[i].value;
        break;
      }
    }

    if (assignIndex > 0) {
      const targetTokens = tokens.slice(0, assignIndex);
      const valTokens = tokens.slice(assignIndex + 1);

      let target = targetTokens[0].value;
      let indexExpr: any;
      if (targetTokens.length > 2 && targetTokens[1].value === '[') {
        target = targetTokens[0].value;
        const subIndexTokens = targetTokens.slice(2, targetTokens.length - 1);
        indexExpr = new ExpressionParser(subIndexTokens).parse();
      }

      return {
        id: this.nextId('assign'),
        type: 'Assignment',
        line: lineNum,
        rawCode: rawLine,
        scope,
        target,
        indexExpr,
        operator: op as any,
        valueExpr: new ExpressionParser(valTokens).parse(),
      };
    }

    return {
      id: this.nextId('expr'),
      type: 'ExpressionStatement',
      line: lineNum,
      rawCode: rawLine,
      scope,
      expression: new ExpressionParser(tokens).parse(),
    };
  }

  private parseIndentedBlock(scope: string): IRStatement[] {
    while (this.peek()?.type === 'NEWLINE') this.advance();
    if (this.peek()?.type === 'INDENT') {
      this.advance();
    }
    const stmts: IRStatement[] = [];
    while (!this.isAtEnd() && this.peek()?.type !== 'DEDENT') {
      while (this.peek()?.type === 'NEWLINE') this.advance();
      if (this.peek()?.type === 'DEDENT' || this.isAtEnd()) break;
      const s = this.parseStatement(scope);
      if (s) stmts.push(s);
    }
    if (this.peek()?.type === 'DEDENT') this.advance();
    return stmts;
  }
}
