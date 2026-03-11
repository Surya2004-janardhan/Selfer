/**
 * Main Integration Test Runner
 * 
 * Runs all integration tests against Ollama and stores results.
 * Can be run repeatedly to verify fixes.
 */
import * as fs from 'fs';
import * as path from 'path';
import { runAgentTests } from './agent.test';
import { runOrchestratorTests } from './orchestrator.test';
import { runE2ETests } from './e2e.test';

interface OverallResults {
    timestamp: string;
    suites: {
        name: string;
        passed: number;
        failed: number;
        total: number;
    }[];
    totalPassed: number;
    totalFailed: number;
    totalTests: number;
    allPassed: boolean;
}

async function checkOllama(): Promise<boolean> {
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        const data = await response.json();
        const hasLlama = data.models?.some((m: any) => m.name.includes('llama3'));
        if (!hasLlama) {
            console.error('❌ llama3:8b model not found in Ollama. Please run: ollama pull llama3:8b');
            return false;
        }
        return true;
    } catch (err) {
        console.error('❌ Ollama is not running. Please start Ollama first.');
        return false;
    }
}

async function main() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           SELFER INTEGRATION TEST SUITE                       ║
║           Using Ollama llama3:8b                              ║
╚══════════════════════════════════════════════════════════════╝
`);

    // Check Ollama availability
    console.log('Checking Ollama availability...');
    const ollamaReady = await checkOllama();
    if (!ollamaReady) {
        process.exit(1);
    }
    console.log('✅ Ollama is ready with llama3:8b\n');

    const results: OverallResults = {
        timestamp: new Date().toISOString(),
        suites: [],
        totalPassed: 0,
        totalFailed: 0,
        totalTests: 0,
        allPassed: false
    };

    const startTime = Date.now();

    // Run test suites
    const suites = [
        { name: 'Agent Tests', run: runAgentTests },
        { name: 'Orchestrator Tests', run: runOrchestratorTests },
        { name: 'E2E Tests', run: runE2ETests }
    ];

    for (const suite of suites) {
        console.log(`\n${'═'.repeat(60)}`);
        console.log(`Running: ${suite.name}`);
        console.log(`${'═'.repeat(60)}\n`);

        try {
            await suite.run();
            
            // Read the latest results
            const latestPath = path.join(process.cwd(), 'results', `${suite.name.replace(/\s+/g, '_')}_latest.json`);
            if (fs.existsSync(latestPath)) {
                const suiteResult = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));
                results.suites.push({
                    name: suite.name,
                    passed: suiteResult.passed,
                    failed: suiteResult.failed,
                    total: suiteResult.totalTests
                });
                results.totalPassed += suiteResult.passed;
                results.totalFailed += suiteResult.failed;
                results.totalTests += suiteResult.totalTests;
            }
        } catch (err: any) {
            console.error(`Suite ${suite.name} crashed: ${err.message}`);
            results.suites.push({
                name: suite.name,
                passed: 0,
                failed: 1,
                total: 1
            });
            results.totalFailed += 1;
            results.totalTests += 1;
        }
    }

    const totalDuration = Date.now() - startTime;
    results.allPassed = results.totalFailed === 0;

    // Print overall summary
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    OVERALL RESULTS                            ║
╚══════════════════════════════════════════════════════════════╝
`);

    for (const suite of results.suites) {
        const status = suite.failed === 0 ? '✅' : '❌';
        console.log(`  ${status} ${suite.name}: ${suite.passed}/${suite.total} passed`);
    }

    console.log(`
${'─'.repeat(60)}
  Total Tests:  ${results.totalTests}
  Passed:       ${results.totalPassed} ✅
  Failed:       ${results.totalFailed} ❌
  Duration:     ${(totalDuration / 1000).toFixed(2)}s
${'─'.repeat(60)}
`);

    if (results.allPassed) {
        console.log('🎉 ALL TESTS PASSED!\n');
    } else {
        console.log('⚠️  Some tests failed. Check results/logs/ for error details.\n');
    }

    // Save overall results
    const overallPath = path.join(process.cwd(), 'results', 'overall_results.json');
    fs.writeFileSync(overallPath, JSON.stringify(results, null, 2));
    console.log(`Overall results saved to: ${overallPath}`);

    // Exit with appropriate code
    process.exit(results.allPassed ? 0 : 1);
}

main().catch(err => {
    console.error('Test runner failed:', err);
    process.exit(1);
});
