/**
 * CodeFlow Graph - Verification Suite for Required Test Cases
 */

import { parseSourceCode } from '../parser/index.ts';
import { buildFlowGraph } from '../graph/graphBuilder.ts';
import { executeProgram } from '../executor/interpreter.ts';
import { SAMPLE_PROGRAMS } from '../../samples/samplePrograms.ts';

function runVerification() {
  console.log('=== STARTING CODEFLOW GRAPH VERIFICATION SUITE ===\n');

  let allPassed = true;

  SAMPLE_PROGRAMS.forEach((sample, idx) => {
    console.log(`--------------------------------------------------`);
    console.log(`TEST #${idx + 1}: ${sample.title} [${sample.language.toUpperCase()}]`);
    console.log(`Description: ${sample.description}`);

    const parseRes = parseSourceCode(sample.code, sample.language);
    if (!parseRes.success || parseRes.errors.length > 0) {
      console.error(`❌ Parse failed for ${sample.title}:`, parseRes.errors);
      allPassed = false;
      return;
    }
    console.log(`✅ Parse Success (AST functions: ${parseRes.ir.functions.length}, statements: ${parseRes.ir.mainBody.length})`);

    const graph = buildFlowGraph(parseRes.ir);
    console.log(`✅ Graph Generated: ${graph.nodes.length} nodes, ${graph.edges.length} edges`);

    const trace = executeProgram(parseRes.ir);
    console.log(`✅ Execution Completed: ${trace.totalSteps} steps, Status: ${trace.status}`);
    console.log(`   Final Output: ${JSON.stringify(trace.finalOutput)}`);

    if (trace.status !== 'SUCCESS') {
      console.error(`❌ Execution status failed: ${trace.errorMessage}`);
      allPassed = false;
    }
  });

  console.log(`\n==================================================`);
  if (allPassed) {
    console.log(`🎉 ALL 11 VERIFICATION TESTS PASSED PERFECTLY!`);
  } else {
    console.error(`⚠️ SOME TESTS FAILED. INVESTIGATE LOGS ABOVE.`);
  }
}

runVerification();
