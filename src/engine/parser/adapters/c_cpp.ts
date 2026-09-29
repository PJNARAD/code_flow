/**
 * CodeFlow Graph - C and C++ Language Adapter
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

const C_TYPES = new Set(['int', 'float', 'double', 'char', 'void', 'bool', 'long', 'short', 'unsigned', 'size_t', 'auto', 'const']);

export class CCppAdapter {
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
      // Skip preprocessor directives like #include <stdio.h>, #include <iostream>, using namespace std;
      if (this.peek()?.value === '#' || (this.peek()?.value === 'using' && this.peekAhead(1)?.value === 'namespace')) {
        this.skipUntilNewlineOrSemicolon();
        continue;
      }

      try {
        if (this.isFunctionDeclaration()) {
          const fn = this.parseFunctionDeclaration();
          if (fn) {
            if (fn.name === 'main') {
              // Main function body forms the primary mainBody
              mainBody.push(...fn.body);
            } else {
              functions.push(fn);
            }
          }
        } else {
          const stmt = this.parseStatement('global');
          if (stmt) {
            mainBody.push(stmt);
            if (stmt.type === 'VariableDecl') allVariables.add(stmt.varName);
          }
        }
      } catch (err: any) {
        const curTok = this.peek();
        this.errors.push({
          message: err.message || 'Syntax error in C/C++ parser',
          line: curTok?.line || 1,
          column: curTok?.column || 1,
        });
        this.synchronize();
      }
    }

    // Collect all variables from functions as well
    for (const fn of functions) {
      fn.params.forEach(p => allVariables.add(p));
      this.collectVariables(fn.body, allVariables);
    }
    this.collectVariables(mainBody, allVariables);

    const program: IRProgram = {
      type: 'Program',
      language: 'c',
      functions,
      mainBody,
      allVariables: Array.from(allVariables),
    };

    return { ir: program, errors: this.errors };
  }

  private collectVariables(stmts: IRStatement[], vars: Set<string>) {
    for (const s of stmts) {
      if (s.type === 'VariableDecl') vars.add(s.varName);
      if (s.type === 'IfStatement') {
        this.collectVariables(s.thenBranch, vars);
        if (s.elseBranch) this.collectVariables(s.elseBranch, vars);
      }
      if (s.type === 'ForLoop') {
        if (s.init && s.init.type === 'VariableDecl') vars.add(s.init.varName);
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

  private peekAhead(offset: number): Token | undefined {
    return this.tokens[this.pos + offset];
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

  private skipUntilNewlineOrSemicolon() {
    const curLine = this.peek()?.line;
    while (!this.isAtEnd()) {
      const t = this.peek();
      if (t?.value === ';') {
        this.advance();
        break;
      }
      if (t && t.line !== curLine) {
        break;
      }
      this.advance();
    }
  }

  private synchronize() {
    this.advance();
    while (!this.isAtEnd()) {
      if (this.tokens[this.pos - 1]?.value === ';') return;
      if (this.tokens[this.pos - 1]?.value === '}') return;
      const val = this.peek()?.value;
      if (val && ['if', 'for', 'while', 'return', 'int', 'float', 'void', 'char'].includes(val)) return;
      this.advance();
    }
  }

  private isFunctionDeclaration(): boolean {
    let i = this.pos;
    // Skip type specifiers e.g. int, void, static, const
    while (i < this.tokens.length && (C_TYPES.has(this.tokens[i].value) || ['static', 'inline', 'const'].includes(this.tokens[i].value))) {
      i++;
    }
    // Check if next is identifier and following is '('
    if (i < this.tokens.length && (this.tokens[i].type === 'IDENTIFIER' || this.tokens[i].value === 'main')) {
      if (i + 1 < this.tokens.length && this.tokens[i + 1].value === '(') {
        // Look ahead for closing ')' and '{' (not a prototype with ';')
        let parenDepth = 1;
        let j = i + 2;
        while (j < this.tokens.length && parenDepth > 0) {
          if (this.tokens[j].value === '(') parenDepth++;
          else if (this.tokens[j].value === ')') parenDepth--;
          j++;
        }
        if (j < this.tokens.length && this.tokens[j].value === '{') {
          return true;
        }
      }
    }
    return false;
  }

  private parseFunctionDeclaration(): IRFunction | null {
    const startLine = this.peek()?.line || 1;
    let returnType = 'void';
    if (C_TYPES.has(this.peek()?.value || '')) {
      returnType = this.advance().value;
    }
    const name = this.advance().value;
    this.match('(');
    const params: string[] = [];
    if (this.peek()?.value !== ')') {
      while (!this.isAtEnd()) {
        if (C_TYPES.has(this.peek()?.value || '')) {
          this.advance(); // skip type
        }
        // Pointer *
        while (this.peek()?.value === '*') this.advance();
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
    const endLine = this.peek()?.line || startLine;
    this.match('}');

    return {
      name,
      params,
      body,
      lineStart: startLine,
      lineEnd: endLine,
      returnType,
    };
  }

  public parseStatement(scope: string): IRStatement | null {
    // Skip extra newlines/semicolons
    while (this.peek()?.value === '\n' || this.peek()?.value === ';') {
      this.advance();
    }
    if (this.isAtEnd() || this.peek()?.value === '}') return null;

    const t = this.peek();
    if (!t) return null;

    // IF STATEMENT
    if (t.value === 'if') {
      return this.parseIf(scope);
    }

    // FOR LOOP
    if (t.value === 'for') {
      return this.parseFor(scope);
    }

    // WHILE LOOP
    if (t.value === 'while') {
      return this.parseWhile(scope);
    }

    // DO-WHILE LOOP
    if (t.value === 'do') {
      return this.parseDoWhile(scope);
    }

    // RETURN STATEMENT
    if (t.value === 'return') {
      return this.parseReturn(scope);
    }

    // PRINTF OR STD::COUT
    if (t.value === 'printf' || t.value === 'cout' || (t.value === 'std' && this.peekAhead(1)?.value === '::' && this.peekAhead(2)?.value === 'cout')) {
      return this.parsePrint(scope);
    }

    // VARIABLE DECLARATION (e.g., int a = 5;)
    if (C_TYPES.has(t.value)) {
      return this.parseVariableDecl(scope);
    }

    // ASSIGNMENT OR EXPRESSION STATEMENT
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
      this.advance(); // 'else'
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

    // Part 1: Init (e.g., int i = 0;)
    let init: IRAssignment | IRVariableDecl | undefined;
    if (this.peek()?.value !== ';') {
      if (C_TYPES.has(this.peek()?.value || '')) {
        init = this.parseVariableDecl(scope, false);
      } else {
        const stmt = this.parseAssignmentOrExpr(scope, false);
        if (stmt && (stmt.type === 'Assignment' || stmt.type === 'VariableDecl')) {
          init = stmt as any;
        }
      }
    }
    this.match(';');

    // Part 2: Condition (e.g., i < 5;)
    const condTokens: Token[] = [];
    while (!this.isAtEnd() && this.peek()?.value !== ';') {
      condTokens.push(this.advance());
    }
    const condition = condTokens.length > 0 ? new ExpressionParser(condTokens).parse() : undefined;
    this.match(';');

    // Part 3: Increment (e.g., i++)
    const incTokens: Token[] = [];
    while (!this.isAtEnd() && this.peek()?.value !== ')') {
      incTokens.push(this.advance());
    }
    this.match(')');

    let increment: IRAssignment | undefined;
    if (incTokens.length > 0) {
      const incParser = new CCppAdapter();
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
    const startTok = this.advance(); // 'while'
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
    const startTok = this.advance(); // 'do'
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
    const startTok = this.advance(); // 'return'
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
    const startTok = this.peek()!;
    let isCout = false;
    if (startTok.value === 'std') {
      this.advance(); // std
      this.advance(); // ::
      this.advance(); // cout
      isCout = true;
    } else if (startTok.value === 'cout') {
      this.advance();
      isCout = true;
    } else {
      this.advance(); // printf
    }

    const expressions: any[] = [];
    let formatString = '';

    if (isCout) {
      while (!this.isAtEnd() && this.peek()?.value !== ';') {
        if (this.match('<<')) {
          if (this.peek()?.value === 'endl' || (this.peek()?.value === 'std' && this.peekAhead(2)?.value === 'endl')) {
            if (this.peek()?.value === 'std') {
              this.advance();
              this.advance();
            }
            this.advance(); // endl
            continue;
          }
          const subTokens: Token[] = [];
          while (!this.isAtEnd() && this.peek()?.value !== '<<' && this.peek()?.value !== ';') {
            subTokens.push(this.advance());
          }
          if (subTokens.length > 0) {
            expressions.push(new ExpressionParser(subTokens).parse());
          }
        } else {
          this.advance();
        }
      }
      this.match(';');
    } else {
      // printf(...)
      this.match('(');
      const args: Token[][] = [];
      let currentArg: Token[] = [];
      let pDepth = 0;
      while (!this.isAtEnd()) {
        const t = this.peek()!;
        if (t.value === '(') pDepth++;
        else if (t.value === ')') {
          if (pDepth === 0) break;
          pDepth--;
        } else if (t.value === ',' && pDepth === 0) {
          args.push(currentArg);
          currentArg = [];
          this.advance();
          continue;
        }
        currentArg.push(this.advance());
      }
      if (currentArg.length > 0) args.push(currentArg);
      this.match(')');
      this.match(';');

      if (args.length > 0) {
        if (args[0].length === 1 && args[0][0].type === 'STRING') {
          let s = args[0][0].value;
          if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1);
          formatString = s;
          for (let i = 1; i < args.length; i++) {
            expressions.push(new ExpressionParser(args[i]).parse());
          }
        } else {
          for (const arg of args) {
            expressions.push(new ExpressionParser(arg).parse());
          }
        }
      }
    }

    const rawLine = this.rawLines[startTok.line - 1]?.trim() || `printf(...)`;

    return {
      id: this.nextId('print'),
      type: 'PrintStatement',
      line: startTok.line,
      rawCode: rawLine,
      scope,
      expressions,
      formatString,
      newline: formatString.includes('\\n') || isCout,
    };
  }

  private parseVariableDecl(scope: string, consumeSemicolon: boolean = true): IRVariableDecl {
    const typeTok = this.advance(); // e.g. int
    // Pointer or reference
    while (this.peek()?.value === '*' || this.peek()?.value === '&') this.advance();

    const nameTok = this.advance(); // variable name
    let initialValueExpr: any;

    // Check for array declaration e.g. int arr[5] = {1, 2, 3};
    let isArray = false;
    if (this.peek()?.value === '[') {
      isArray = true;
      this.advance();
      while (!this.isAtEnd() && this.peek()?.value !== ']') this.advance();
      this.match(']');
    }

    if (this.match('=')) {
      const exprTokens: Token[] = [];
      let pDepth = 0;
      let bDepth = 0;
      while (!this.isAtEnd()) {
        const t = this.peek()!;
        if (t.value === '(') pDepth++;
        else if (t.value === ')') pDepth--;
        else if (t.value === '{' || t.value === '[') bDepth++;
        else if (t.value === '}' || t.value === ']') bDepth--;
        else if (t.value === ';' && pDepth === 0 && bDepth === 0) break;
        exprTokens.push(this.advance());
      }
      initialValueExpr = new ExpressionParser(exprTokens).parse();
    }

    if (consumeSemicolon) this.match(';');
    const rawLine = this.rawLines[typeTok.line - 1]?.trim() || `${typeTok.value} ${nameTok.value};`;

    return {
      id: this.nextId('decl'),
      type: 'VariableDecl',
      line: typeTok.line,
      rawCode: rawLine,
      scope,
      varName: nameTok.value,
      varType: typeTok.value + (isArray ? '[]' : ''),
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

    // Check for increment/decrement statement e.g. i++ or ++i or i--
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
      if (tokens[0].value === '++' || tokens[0].value === '--') {
        return {
          id: this.nextId('assign'),
          type: 'Assignment',
          line: lineNum,
          rawCode: rawLine,
          scope,
          target: tokens[1].value,
          operator: tokens[0].value as any,
        };
      }
    }

    // Check for assignment with =, +=, -=, *=, /=
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

    // Expression statement (e.g., function call `add(5, 10);`)
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
