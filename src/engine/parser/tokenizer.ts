/**
 * CodeFlow Graph - Universal Code Tokenizer
 */

export type TokenType =
  | 'KEYWORD'
  | 'IDENTIFIER'
  | 'NUMBER'
  | 'STRING'
  | 'OPERATOR'
  | 'PUNCTUATION'
  | 'COMMENT'
  | 'NEWLINE'
  | 'INDENT'
  | 'DEDENT'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
  start: number;
  end: number;
}

const KEYWORDS = new Set([
  // C / C++ / Java / JS / Python
  'int', 'float', 'double', 'char', 'void', 'bool', 'boolean', 'long', 'short', 'auto', 'const', 'let', 'var',
  'if', 'else', 'elif', 'for', 'while', 'do', 'return', 'break', 'continue', 'switch', 'case', 'default',
  'function', 'def', 'class', 'struct', 'new', 'null', 'None', 'true', 'false', 'True', 'False',
  'public', 'private', 'protected', 'static', 'final', 'import', 'include', 'from', 'in', 'range',
  'printf', 'scanf', 'cout', 'cin', 'endl', 'print', 'println', 'console', 'log', 'System', 'out'
]);

export function tokenize(source: string, isPython: boolean = false): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  let line = 1;
  let column = 1;
  const length = source.length;

  const indentStack = [0];

  while (index < length) {
    const char = source[index];

    // Handle newlines
    if (char === '\n') {
      tokens.push({
        type: 'NEWLINE',
        value: '\n',
        line,
        column,
        start: index,
        end: index + 1,
      });
      index++;
      line++;
      column = 1;

      if (isPython) {
        // Python indentation calculation
        let spaces = 0;
        let indentIndex = index;
        while (indentIndex < length && (source[indentIndex] === ' ' || source[indentIndex] === '\t')) {
          if (source[indentIndex] === '\t') spaces += 4;
          else spaces += 1;
          indentIndex++;
        }

        // Ignore empty lines with whitespace only or comments
        if (indentIndex < length && source[indentIndex] !== '\n' && source[indentIndex] !== '#') {
          const currentIndent = indentStack[indentStack.length - 1];
          if (spaces > currentIndent) {
            indentStack.push(spaces);
            tokens.push({
              type: 'INDENT',
              value: ' '.repeat(spaces),
              line,
              column: 1,
              start: index,
              end: indentIndex,
            });
          } else if (spaces < currentIndent) {
            while (indentStack.length > 1 && indentStack[indentStack.length - 1] > spaces) {
              indentStack.pop();
              tokens.push({
                type: 'DEDENT',
                value: '',
                line,
                column: 1,
                start: index,
                end: indentIndex,
              });
            }
          }
          index = indentIndex;
          column = spaces + 1;
        }
      }
      continue;
    }

    // Skip carriage returns
    if (char === '\r') {
      index++;
      continue;
    }

    // Whitespace
    if (char === ' ' || char === '\t') {
      index++;
      column++;
      continue;
    }

    // Single-line comments // or #
    if ((char === '/' && source[index + 1] === '/') || (isPython && char === '#')) {
      const start = index;
      const startCol = column;
      while (index < length && source[index] !== '\n') {
        index++;
        column++;
      }
      tokens.push({
        type: 'COMMENT',
        value: source.substring(start, index),
        line,
        column: startCol,
        start,
        end: index,
      });
      continue;
    }

    // Multi-line comments /* ... */
    if (char === '/' && source[index + 1] === '*') {
      const start = index;
      const startCol = column;
      const startLine = line;
      index += 2;
      column += 2;
      while (index < length && !(source[index] === '*' && source[index + 1] === '/')) {
        if (source[index] === '\n') {
          line++;
          column = 1;
        } else {
          column++;
        }
        index++;
      }
      if (index < length) {
        index += 2;
        column += 2;
      }
      tokens.push({
        type: 'COMMENT',
        value: source.substring(start, index),
        line: startLine,
        column: startCol,
        start,
        end: index,
      });
      continue;
    }

    // String literals "..." or '...'
    if (char === '"' || char === "'" || char === '`') {
      const quote = char;
      const start = index;
      const startCol = column;
      const startLine = line;
      index++;
      column++;
      let strVal = '';
      while (index < length && source[index] !== quote) {
        if (source[index] === '\\' && index + 1 < length) {
          strVal += source[index] + source[index + 1];
          index += 2;
          column += 2;
        } else {
          if (source[index] === '\n') {
            line++;
            column = 1;
          } else {
            column++;
          }
          strVal += source[index];
          index++;
        }
      }
      if (index < length && source[index] === quote) {
        index++;
        column++;
      }
      tokens.push({
        type: 'STRING',
        value: source.substring(start, index),
        line: startLine,
        column: startCol,
        start,
        end: index,
      });
      continue;
    }

    // Numeric literals
    if (char >= '0' && char <= '9') {
      const start = index;
      const startCol = column;
      let hasDot = false;
      while (
        index < length &&
        ((source[index] >= '0' && source[index] <= '9') ||
          (source[index] === '.' && !hasDot && index + 1 < length && source[index + 1] >= '0' && source[index + 1] <= '9'))
      ) {
        if (source[index] === '.') hasDot = true;
        index++;
        column++;
      }
      tokens.push({
        type: 'NUMBER',
        value: source.substring(start, index),
        line,
        column: startCol,
        start,
        end: index,
      });
      continue;
    }

    // Multi-character operators
    const twoChars = source.substring(index, index + 2);
    const threeChars = source.substring(index, index + 3);

    if (threeChars === '===' || threeChars === '!==' || threeChars === '<<=' || threeChars === '>>=') {
      tokens.push({
        type: 'OPERATOR',
        value: threeChars,
        line,
        column,
        start: index,
        end: index + 3,
      });
      index += 3;
      column += 3;
      continue;
    }

    if (
      [
        '==', '!=', '<=', '>=', '&&', '||', '++', '--', '+=', '-=', '*=', '/=', '%=',
        '<<', '>>', '->', '::', '**', '//'
      ].includes(twoChars)
    ) {
      tokens.push({
        type: 'OPERATOR',
        value: twoChars,
        line,
        column,
        start: index,
        end: index + 2,
      });
      index += 2;
      column += 2;
      continue;
    }

    // Single-character punctuation / operators
    if (['+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^', '~', '?', ':'].includes(char)) {
      tokens.push({
        type: 'OPERATOR',
        value: char,
        line,
        column,
        start: index,
        end: index + 1,
      });
      index++;
      column++;
      continue;
    }

    if (['(', ')', '{', '}', '[', ']', ';', ',', '.'].includes(char)) {
      tokens.push({
        type: 'PUNCTUATION',
        value: char,
        line,
        column,
        start: index,
        end: index + 1,
      });
      index++;
      column++;
      continue;
    }

    // Identifiers and Keywords
    if ((char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_' || char === '$') {
      const start = index;
      const startCol = column;
      while (
        index < length &&
        ((source[index] >= 'a' && source[index] <= 'z') ||
          (source[index] >= 'A' && source[index] <= 'Z') ||
          (source[index] >= '0' && source[index] <= '9') ||
          source[index] === '_' ||
          source[index] === '$')
      ) {
        index++;
        column++;
      }
      const val = source.substring(start, index);
      tokens.push({
        type: KEYWORDS.has(val) ? 'KEYWORD' : 'IDENTIFIER',
        value: val,
        line,
        column: startCol,
        start,
        end: index,
      });
      continue;
    }

    // Fallback single character
    tokens.push({
      type: 'PUNCTUATION',
      value: char,
      line,
      column,
      start: index,
      end: index + 1,
    });
    index++;
    column++;
  }

  if (isPython) {
    while (indentStack.length > 1) {
      indentStack.pop();
      tokens.push({
        type: 'DEDENT',
        value: '',
        line,
        column: 1,
        start: index,
        end: index,
      });
    }
  }

  tokens.push({
    type: 'EOF',
    value: '',
    line,
    column,
    start: index,
    end: index,
  });

  return tokens;
}
