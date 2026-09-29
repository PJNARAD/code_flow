/**
 * CodeFlow Graph - Universal Parser Entrypoint
 */

import { SupportedLanguage, IRProgram } from '../../types/codeflow.ts';
import { CCppAdapter } from './adapters/c_cpp.ts';
import { PythonAdapter } from './adapters/python.ts';
import { JavaScriptAdapter } from './adapters/javascript.ts';
import { JavaAdapter } from './adapters/java.ts';

export interface ParseOutput {
  success: boolean;
  ir: IRProgram;
  errors: {
    message: string;
    line?: number;
    column?: number;
    unsupportedConstruct?: string;
  }[];
}

export function parseSourceCode(source: string, language: SupportedLanguage): ParseOutput {
  const trimmed = source.trim();
  if (!trimmed) {
    return {
      success: true,
      ir: {
        type: 'Program',
        language,
        functions: [],
        mainBody: [],
        allVariables: [],
      },
      errors: [],
    };
  }

  try {
    switch (language) {
      case 'c':
      case 'cpp': {
        const adapter = new CCppAdapter();
        const res = adapter.parse(source);
        return {
          success: res.errors.length === 0,
          ir: res.ir,
          errors: res.errors,
        };
      }
      case 'python': {
        const adapter = new PythonAdapter();
        const res = adapter.parse(source);
        return {
          success: res.errors.length === 0,
          ir: res.ir,
          errors: res.errors,
        };
      }
      case 'java': {
        const adapter = new JavaAdapter();
        const res = adapter.parse(source);
        return {
          success: res.errors.length === 0,
          ir: res.ir,
          errors: res.errors,
        };
      }
      case 'javascript': {
        const adapter = new JavaScriptAdapter();
        const res = adapter.parse(source);
        return {
          success: res.errors.length === 0,
          ir: res.ir,
          errors: res.errors,
        };
      }
      default: {
        const adapter = new CCppAdapter();
        const res = adapter.parse(source);
        return {
          success: res.errors.length === 0,
          ir: res.ir,
          errors: res.errors,
        };
      }
    }
  } catch (err: any) {
    return {
      success: false,
      ir: {
        type: 'Program',
        language,
        functions: [],
        mainBody: [],
        allVariables: [],
      },
      errors: [
        {
          message: err.message || 'Failed to parse program',
          line: 1,
        },
      ],
    };
  }
}
