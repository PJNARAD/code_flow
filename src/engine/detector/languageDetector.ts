/**
 * CodeFlow Graph - Automatic Language Detector with Confidence & Heuristics
 */

import { SupportedLanguage } from '../../types/codeflow.ts';

export interface DetectionResult {
  language: SupportedLanguage;
  confidence: 'High' | 'Medium' | 'Low' | 'Uncertain';
  confidenceScore: number; // 0.0 - 1.0
  reasons: string[];
}

export function detectLanguage(source: string): DetectionResult {
  const trimmed = source.trim();
  if (!trimmed) {
    return {
      language: 'c',
      confidence: 'Uncertain',
      confidenceScore: 0.1,
      reasons: ['No code provided (defaulting to C)'],
    };
  }

  const scores: Record<SupportedLanguage, { score: number; reasons: string[] }> = {
    c: { score: 0, reasons: [] },
    cpp: { score: 0, reasons: [] },
    python: { score: 0, reasons: [] },
    java: { score: 0, reasons: [] },
    javascript: { score: 0, reasons: [] },
  };

  // 1. C++ specific markers
  if (/#include\s*<iostream>|#include\s*<vector>|#include\s*<string>|#include\s*<algorithm>/i.test(source)) {
    scores.cpp.score += 50;
    scores.cpp.reasons.push('C++ standard library headers (#include <iostream/vector>)');
  }
  if (/using\s+namespace\s+std;/i.test(source) || /std::cout|std::cin|std::endl|std::vector/i.test(source)) {
    scores.cpp.score += 45;
    scores.cpp.reasons.push('std namespace or stream operators (std::cout / std::endl)');
  }
  if (/cout\s*<<|cin\s*>>/i.test(source)) {
    scores.cpp.score += 35;
    scores.cpp.reasons.push('Stream insertion/extraction operators (cout << / cin >>)');
  }

  // 2. C specific markers
  if (/#include\s*<stdio\.h>|#include\s*<stdlib\.h>|#include\s*<string\.h>/i.test(source)) {
    scores.c.score += 40;
    scores.c.reasons.push('C standard library headers (#include <stdio.h>)');
  }
  if (/\bprintf\s*\(|\bscanf\s*\(/i.test(source) && scores.cpp.score < 30) {
    scores.c.score += 30;
    scores.c.reasons.push('Standard C I/O (printf / scanf)');
  }

  // 3. Python specific markers
  if (/^\s*def\s+[a-zA-Z_]\w*\s*\([^)]*\)\s*:/m.test(source)) {
    scores.python.score += 45;
    scores.python.reasons.push('Python function definition (def func():)');
  }
  if (/^\s*(if|elif|while|for)\s+.*:\s*$/m.test(source)) {
    scores.python.score += 35;
    scores.python.reasons.push('Python colon block syntax (if/elif/for/while ...:)');
  }
  if (/\bprint\s*\([^;]*\)(?!\s*;)/m.test(source) && !/\bSystem\.out\.print/i.test(source)) {
    scores.python.score += 25;
    scores.python.reasons.push('Python print() function without semicolon');
  }
  if (/\b(None|True|False|elif|in\s+range)\b/.test(source)) {
    scores.python.score += 30;
    scores.python.reasons.push('Python keywords (None, True, False, elif, range)');
  }
  if (/^\s*#\s+[^\n]*/m.test(source) && !source.includes('#include')) {
    scores.python.score += 20;
    scores.python.reasons.push('Python comment style (# ... )');
  }

  // 4. Java specific markers
  if (/\bpublic\s+class\s+[a-zA-Z_]\w*/i.test(source) || /\bclass\s+[a-zA-Z_]\w*\s*\{/i.test(source)) {
    scores.java.score += 35;
    scores.java.reasons.push('Class definition (public class Name)');
  }
  if (/public\s+static\s+void\s+main\s*\(\s*String\s*\[\s*\]/i.test(source)) {
    scores.java.score += 55;
    scores.java.reasons.push('Java main method (public static void main(String[] args))');
  }
  if (/System\.out\.print(ln)?\s*\(/i.test(source)) {
    scores.java.score += 45;
    scores.java.reasons.push('Java output stream (System.out.println)');
  }

  // 5. JavaScript specific markers
  if (/\b(const|let|var)\s+[a-zA-Z_]\w*\s*=/i.test(source)) {
    scores.javascript.score += 35;
    scores.javascript.reasons.push('JavaScript variable declaration (const / let / var)');
  }
  if (/console\.log\s*\(/i.test(source)) {
    scores.javascript.score += 40;
    scores.javascript.reasons.push('JavaScript console output (console.log)');
  }
  if (/function\s+[a-zA-Z_]\w*\s*\([^)]*\)\s*\{/i.test(source) || /=>\s*\{/i.test(source)) {
    scores.javascript.score += 35;
    scores.javascript.reasons.push('JavaScript function syntax (function name() / =>)');
  }

  // 6. Generic C-family checks (int main(), typed variables)
  if (/\bint\s+main\s*\([^)]*\)\s*\{/i.test(source)) {
    if (scores.cpp.score >= scores.c.score && scores.cpp.score > 10) {
      scores.cpp.score += 15;
    } else {
      scores.c.score += 25;
      scores.c.reasons.push('C/C++ entrypoint (int main())');
    }
  }

  // Generic typed variables like int a = 5;
  if (/\b(int|float|double|char)\s+[a-zA-Z_]\w*\s*(=|;)/i.test(source)) {
    if (scores.java.score > 0) scores.java.score += 10;
    if (scores.cpp.score > 0) scores.cpp.score += 10;
    if (scores.c.score >= 0) scores.c.score += 15;
  }

  // Find language with highest score
  let bestLang: SupportedLanguage = 'c';
  let maxScore = -1;

  for (const lang of (['cpp', 'c', 'python', 'java', 'javascript'] as SupportedLanguage[])) {
    if (scores[lang].score > maxScore) {
      maxScore = scores[lang].score;
      bestLang = lang;
    }
  }

  let confidence: 'High' | 'Medium' | 'Low' | 'Uncertain' = 'Low';
  let confidenceScore = Math.min(1.0, maxScore / 60);

  if (maxScore >= 45) {
    confidence = 'High';
  } else if (maxScore >= 25) {
    confidence = 'Medium';
  } else if (maxScore > 0) {
    confidence = 'Low';
  } else {
    confidence = 'Uncertain';
    bestLang = 'c';
    scores.c.reasons = ['Default fallback'];
  }

  return {
    language: bestLang,
    confidence,
    confidenceScore,
    reasons: scores[bestLang].reasons.length > 0 ? scores[bestLang].reasons : ['Syntactic structure matches default patterns'],
  };
}
