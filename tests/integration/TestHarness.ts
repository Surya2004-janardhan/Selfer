/**
 * TestHarness - Integration test framework for Selfer
 * 
 * This harness runs comprehensive integration tests against real LLM (Ollama)
 * and stores results in the results folder for analysis.
 */
import * as fs from 'fs';
import * as path from 'path';

export interface TestResult {
    testName: string;
    category: string;
    passed: boolean;
    duration: number;
    input?: any;
    expectedOutput?: string;
    actualOutput?: string;
    error?: string;
    errorStack?: string;
    timestamp: string;
}

export interface TestSuiteResult {
    suiteName: string;
    totalTests: number;
    passed: number;
    failed: number;
    duration: number;
    results: TestResult[];
    timestamp: string;
}

export class TestHarness {
    private resultsDir: string;
    private logsDir: string;
    private results: TestResult[] = [];
    private suiteName: string;
    private startTime: number = 0;

    constructor(suiteName: string) {
        this.suiteName = suiteName;
        this.resultsDir = path.join(process.cwd(), 'results');
        this.logsDir = path.join(this.resultsDir, 'logs');
        
        // Ensure directories exist
        if (!fs.existsSync(this.resultsDir)) {
            fs.mkdirSync(this.resultsDir, { recursive: true });
        }
        if (!fs.existsSync(this.logsDir)) {
            fs.mkdirSync(this.logsDir, { recursive: true });
        }
    }

    start() {
        this.startTime = Date.now();
        this.results = [];
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Starting Test Suite: ${this.suiteName}`);
        console.log(`${'='.repeat(60)}\n`);
    }

    async runTest(
        testName: string,
        category: string,
        testFn: () => Promise<{ passed: boolean; actual?: string; expected?: string; error?: string }>
    ): Promise<TestResult> {
        const testStart = Date.now();
        console.log(`  [TEST] ${category} / ${testName}...`);

        let result: TestResult;

        try {
            const testResult = await testFn();
            const duration = Date.now() - testStart;

            result = {
                testName,
                category,
                passed: testResult.passed,
                duration,
                actualOutput: testResult.actual,
                expectedOutput: testResult.expected,
                error: testResult.error,
                timestamp: new Date().toISOString()
            };

            if (testResult.passed) {
                console.log(`    ✅ PASSED (${duration}ms)`);
            } else {
                console.log(`    ❌ FAILED (${duration}ms)`);
                if (testResult.error) {
                    console.log(`       Error: ${testResult.error}`);
                }
            }
        } catch (err: any) {
            const duration = Date.now() - testStart;
            result = {
                testName,
                category,
                passed: false,
                duration,
                error: err.message,
                errorStack: err.stack,
                timestamp: new Date().toISOString()
            };
            console.log(`    ❌ EXCEPTION (${duration}ms)`);
            console.log(`       Error: ${err.message}`);
        }

        this.results.push(result);
        return result;
    }

    finish(): TestSuiteResult {
        const totalDuration = Date.now() - this.startTime;
        const passed = this.results.filter(r => r.passed).length;
        const failed = this.results.filter(r => !r.passed).length;

        const suiteResult: TestSuiteResult = {
            suiteName: this.suiteName,
            totalTests: this.results.length,
            passed,
            failed,
            duration: totalDuration,
            results: this.results,
            timestamp: new Date().toISOString()
        };

        // Print summary
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Test Suite Complete: ${this.suiteName}`);
        console.log(`${'='.repeat(60)}`);
        console.log(`  Total:  ${this.results.length}`);
        console.log(`  Passed: ${passed} ✅`);
        console.log(`  Failed: ${failed} ❌`);
        console.log(`  Duration: ${(totalDuration / 1000).toFixed(2)}s`);
        console.log(`${'='.repeat(60)}\n`);

        // Save results
        this.saveResults(suiteResult);

        // Save errors separately for analysis
        if (failed > 0) {
            this.saveErrors(suiteResult);
        }

        return suiteResult;
    }

    private saveResults(suiteResult: TestSuiteResult) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${this.suiteName.replace(/\s+/g, '_')}_${timestamp}.json`;
        const filepath = path.join(this.resultsDir, filename);
        
        fs.writeFileSync(filepath, JSON.stringify(suiteResult, null, 2));
        console.log(`Results saved to: ${filepath}`);

        // Also save a latest.json for easy access
        const latestPath = path.join(this.resultsDir, `${this.suiteName.replace(/\s+/g, '_')}_latest.json`);
        fs.writeFileSync(latestPath, JSON.stringify(suiteResult, null, 2));
    }

    private saveErrors(suiteResult: TestSuiteResult) {
        const failedTests = suiteResult.results.filter(r => !r.passed);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `errors_${this.suiteName.replace(/\s+/g, '_')}_${timestamp}.json`;
        const filepath = path.join(this.logsDir, filename);

        const errorReport = {
            suiteName: suiteResult.suiteName,
            failedCount: failedTests.length,
            timestamp: suiteResult.timestamp,
            failures: failedTests.map(t => ({
                testName: t.testName,
                category: t.category,
                error: t.error,
                errorStack: t.errorStack,
                actualOutput: t.actualOutput,
                expectedOutput: t.expectedOutput
            }))
        };

        fs.writeFileSync(filepath, JSON.stringify(errorReport, null, 2));
        console.log(`Error report saved to: ${filepath}`);
    }
}

// Helper to check if a string contains expected content
export function containsExpected(actual: string, expected: string | string[]): boolean {
    if (Array.isArray(expected)) {
        return expected.some(e => actual.toLowerCase().includes(e.toLowerCase()));
    }
    return actual.toLowerCase().includes(expected.toLowerCase());
}

// Helper to validate tool call was made
export function hasToolCall(response: string, toolName: string): boolean {
    return response.includes(`<${toolName}>`) && response.includes(`</${toolName}>`);
}
