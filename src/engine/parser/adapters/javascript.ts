/**
 * CodeFlow Graph - JavaScript Language Adapter
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
  IRDoWhileLoop,
  IRReturnStatement,
  IRExpressionStatement,
  IRPrintStatement,
} from '../../../types/codeflow.ts';
import { Token, tokenize } from '../tokenizer.ts';
import { ExpressionParser } from '../expressionParser.ts';

const JS_DECL_KEYWORDS = new Set(['let', 'const', 'var']);

export class JavaScriptAdapter {
  private tokens: Token[] = [];
  private pos: number = 0;
  private stmtIdCounter: number = 1;
  private errors: { message: string; line?: number; column?: number }[] = [];
  private rawLines: string[] = [];

  public parse(source: string): { ir: IRProgram; errors: { message: string; line?: number; column?: number }[] } {
    this.rawLines = source.split('\n');
    this.tokens = tokenize(source, false).filter(t => t.type !== 'COMMENT' && t.type !== 'NEWLINE');
    this.pos = 0;
    this.stmtIdCounter = 1;
    this.errors = [];

    const functions: IRFunction[] = [];
    const mainBody: IRStatement[] = [];
    const allVariables = new Set<string>();

    while (!this.isAtEnd()) {
      try {
        if (this.peek()?.value === 'function') {
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
          message: err.message || 'Syntax error in JavaScript parser',
          line: curTok?.line || 1,
          column: curTok?.column || 1,
        });
        this.synchronize();
      }
    }

    for (const fn of functions) {
      fn.params.forEach(p => allVariables.add(p));
      this.collectVariables(fn.body, allVariables);
    }
    this.collectVariables(mainBody, allVariables);

    const program: IRProgram = {
      type: 'Program',
      language: 'javascript',
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
        if (s.init && s.init.type === 'VariableDecl') vars.add(s.init.varName);
        if (s.init && s.init.type === 'Assignment') vars.add(s.init.target);
        this.collectVariables(s.body, vars);
      }
      if (s.type === 'WhileLoop' || s.type === 'DoWhileLoop') {
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

  private synchronize() {
    this.advance();
    while (!this.isAtEnd()) {
      if (this.tokens[this.pos - 1]?.value === ';') return;
      if (this.tokens[this.pos - 1]?.value === '}') return;
      const val = this.peek()?.value;
      if (val && ['if', 'for', 'while', 'return', 'let', 'const', 'var', 'function'].includes(val)) return;
      this.advance();
    }
  }

  private parseFunctionDeclaration(): IRFunction | null {
    const fnTok = this.advance(); // 'function'
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
    this.match('{');

    const body: IRStatement[] = [];
    while (!this.isAtEnd() && this.peek()?.value !== '}') {
      const stmt = this.parseStatement(name);
      if (stmt) body.push(stmt);
    }
    const endLine = this.peek()?.line || fnTok.line;
    this.match('}');

    return {
      name,
      params,
      body,
      lineStart: fnTok.line,
      lineEnd: endLine,
      returnType: 'any',
    };
  }

  public parseStatement(scope: string): IRStatement | null {
    while (this.peek()?.value === '\n' || this.peek()?.value === ';') {
      this.advance();
    }
    if (this.isAtEnd() || this.peek()?.value === '}') return null;

    const t = this.peek();
    if (!t) return null;

    // IF
    if (t.value === 'if') {
      return this.parseIf(scope);
    }

    // FOR
    if (t.value === 'for') {
      return this.parseFor(scope);
    }

    // WHILE
    if (t.value === 'while') {
      return this.parseWhile(scope);
    }

    // DO-WHILE
    if (t.value === 'do') {
      return this.parseDoWhile(scope);
    }

    // RETURN
    if (t.value === 'return') {
      return this.parseReturn(scope);
    }

    // CONSOLE.LOG
    if (t.value === 'console') {
      return this.parsePrint(scope);
    }

    // VARIABLE DECLARATION (let, const, var)
    if (JS_DECL_KEYWORDS.has(t.value)) {
      return this.parseVariableDecl(scope);
    }

    // ASSIGNMENT / EXPR
    return this.parseAssignmentOrExpr(scope);
  }

  private parseIf(scope: string): IRIfStatement {
    const startTok = this.advance(); // 'if'
    this.match('(');
    const condTokens = this.collectTokensUntilMatchingParen();
    const condition = new ExpressionParser(condTokens).parse();
    this.match(')');

    const thenBranch = this.parseBlockOrSingleStatement(scope);
    let elseBranch: IRStatement[] | undefined;

    if (this.peek()?.value === 'else') {
      this.advance();
      if (this.peek()?.value === 'if') {
        elseBranch = [this.parseIf(scope)];
      } else {
        elseBranch = this.parseBlockOrSingleStatement(scope);
      }
    }

    const rawLine = this.rawLines[startTok.line - 1]?.trim() || `if (...)`;

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
    this.match('(');

    let init: IRAssignment | IRVariableDecl | undefined;
    if (this.peek()?.value !== ';') {
      if (JS_DECL_KEYWORDS.has(this.peek()?.value || '')) {
        init = this.parseVariableDecl(scope, false);
      } else {
        const stmt = this.parseAssignmentOrExpr(scope, false);
        if (stmt && (stmt.type === 'Assignment' || stmt.type === 'VariableDecl')) {
          init = stmt as any;
        }
      }
    }
    this.match(';');

    const condTokens: Token[] = [];
    while (!this.isAtEnd() && this.peek()?.value !== ';') {
      condTokens.push(this.advance());
    }
    const condition = condTokens.length > 0 ? new ExpressionParser(condTokens).parse() : undefined;
    this.match(';');

    const incTokens: Token[] = [];
    while (!this.isAtEnd() && this.peek()?.value !== ')') {
      incTokens.push(this.advance());
    }
    this.match(')');

    let increment: IRAssignment | undefined;
    if (incTokens.length > 0) {
      const incParser = new JavaScriptAdapter();
      incParser.tokens = incTokens;
      incParser.pos = 0;
      const incStmt = incParser.parseAssignmentOrExpr(scope, false);
      if (incStmt && incStmt.type === 'Assignment') {
        increment = incStmt;
      }
    }

    const body = this.parseBlockOrSingleStatement(scope);
    const rawLine = this.rawLines[startTok.line - 1]?.trim() || `for (...)`;

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
    const startTok = this.advance();
    this.match('(');
    const condTokens = this.collectTokensUntilMatchingParen();
    const condition = new ExpressionParser(condTokens).parse();
    this.match(')');

    const body = this.parseBlockOrSingleStatement(scope);
    const rawLine = this.rawLines[startTok.line - 1]?.trim() || `while (...)`;

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

  private parseDoWhile(scope: string): IRDoWhileLoop {
    const startTok = this.advance();
    const body = this.parseBlockOrSingleStatement(scope);
    this.match('while');
    this.match('(');
    const condTokens = this.collectTokensUntilMatchingParen();
    const condition = new ExpressionParser(condTokens).parse();
    this.match(')');
    this.match(';');

    const rawLine = this.rawLines[startTok.line - 1]?.trim() || `do { ... } while (...)`;

    return {
      id: this.nextId('dowhile'),
      type: 'DoWhileLoop',
      line: startTok.line,
      rawCode: rawLine,
      scope,
      condition,
      body,
    };
  }

  private parseReturn(scope: string): IRReturnStatement {
    const startTok = this.advance();
    const exprTokens: Token[] = [];
    while (!this.isAtEnd() && this.peek()?.value !== ';' && this.peek()?.value !== '}') {
      exprTokens.push(this.advance());
    }
    this.match(';');
    const valueExpr = exprTokens.length > 0 ? new ExpressionParser(exprTokens).parse() : undefined;
    const rawLine = this.rawLines[startTok.line - 1]?.trim() || `return;`;

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
    const startTok = this.advance(); // 'console'
    this.match('.');
    const method = this.advance().value; // 'log', 'info', 'warn', 'error'
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
    this.match(';');

    const expressions = args.map(a => new ExpressionParser(a).parse());
    const rawLine = this.rawLines[startTok.line - 1]?.trim() || `console.${method}(...)`;

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

  private parseVariableDecl(scope: string, consumeSemicolon: boolean = true): IRVariableDecl {
    const kwTok = this.advance(); // let / const / var
    const nameTok = this.advance();
    let initialValueExpr: any;

    if (this.match('=')) {
      const exprTokens: Token[] = [];
      let pDepth = 0;
      let bDepth = 0;
      let brkDepth = 0;
      while (!this.isAtEnd()) {
        const t = this.peek()!;
        if (t.value === '(') pDepth++;
        else if (t.value === ')') pDepth--;
        else if (t.value === '{') bDepth++;
        else if (t.value === '}') bDepth--;
        else if (t.value === '[') brkDepth++;
        else if (t.value === ']') brkDepth--;
        else if (t.value === ';' && pDepth === 0 && bDepth === 0 && brkDepth === 0) break;
        exprTokens.push(this.advance());
      }
      initialValueExpr = new ExpressionParser(exprTokens).parse();
    }

    if (consumeSemicolon) this.match(';');
    const rawLine = this.rawLines[kwTok.line - 1]?.trim() || `${kwTok.value} ${nameTok.value};`;

    return {
      id: this.nextId('decl'),
      type: 'VariableDecl',
      line: kwTok.line,
      rawCode: rawLine,
      scope,
      varName: nameTok.value,
      varType: kwTok.value,
      initialValueExpr,
    };
  }

  public parseAssignmentOrExpr(scope: string, consumeSemicolon: boolean = true): IRStatement {
    const startTok = this.peek()!;
    const lineNum = startTok?.line || 1;
    const tokens: Token[] = [];

    while (!this.isAtEnd() && this.peek()?.value !== ';' && this.peek()?.value !== '}') {
      tokens.push(this.advance());
    }
    if (consumeSemicolon) this.match(';');

    const rawLine = this.rawLines[lineNum - 1]?.trim() || tokens.map(t => t.value).join(' ');

    if (tokens.length === 2) {
      if (tokens[1].value === '++' || tokens[1].value === '--') {
        return {
          id: this.nextId('assign'),
          type: 'Assignment',
          line: lineNum,
          rawCode: rawLine,
          scope,
          target: tokens[0].value,
          operator: tokens[1].value as any,
        };
      }
    }

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

  private parseBlockOrSingleStatement(scope: string): IRStatement[] {
    if (this.match('{')) {
      const stmts: IRStatement[] = [];
      while (!this.isAtEnd() && this.peek()?.value !== '}') {
        const s = this.parseStatement(scope);
        if (s) stmts.push(s);
      }
      this.match('}');
      return stmts;
    } else {
      const s = this.parseStatement(scope);
      return s ? [s] : [];
    }
  }

  private collectTokensUntilMatchingParen(): Token[] {
    const tokens: Token[] = [];
    let depth = 0;
    while (!this.isAtEnd()) {
      const t = this.peek()!;
      if (t.value === '(') depth++;
      else if (t.value === ')') {
        if (depth === 0) break;
        depth--;
      }
      tokens.push(this.advance());
    }
    return tokens;
  }
}
