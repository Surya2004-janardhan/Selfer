/**
 * Logger – structured, levelled logging for Selfer.
 *
 * Writes to:
 *   - Console (with chalk colours)
 *   - `.selfer/logs/selfer-<date>.log` (plain JSON-lines) when LOG_FILE=true or
 *     when the LOG_DIR env var points to a directory.
 */

import * as fs from 'fs';
import * as path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

/** Minimum level that is written. Override via LOG_LEVEL env var. */
const MIN_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

/** Directory for log files. Empty string means no file logging. */
const LOG_DIR: string = process.env.LOG_DIR || '';

function shouldLog(level: LogLevel): boolean {
    return LEVEL_RANK[level] >= LEVEL_RANK[MIN_LEVEL];
}

function getLogFilePath(): string | null {
    if (!LOG_DIR) return null;
    try {
        if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
        const date = new Date().toISOString().split('T')[0];
        return path.join(LOG_DIR, `selfer-${date}.log`);
    } catch {
        return null;
    }
}

function writeToFile(entry: object): void {
    const filePath = getLogFilePath();
    if (!filePath) return;
    try {
        fs.appendFileSync(filePath, JSON.stringify(entry) + '\n', 'utf-8');
    } catch {
        // Ignore file-write errors to never crash the agent over logging
    }
}

export const Logger = {
    debug(message: string, meta?: object): void {
        if (!shouldLog('debug')) return;
        const entry = { level: 'debug', time: new Date().toISOString(), message, ...meta };
        process.stdout.write(`\x1b[90m[DEBUG] ${message}\x1b[0m\n`);
        writeToFile(entry);
    },

    info(message: string, meta?: object): void {
        if (!shouldLog('info')) return;
        const entry = { level: 'info', time: new Date().toISOString(), message, ...meta };
        process.stdout.write(`\x1b[36m[INFO]  ${message}\x1b[0m\n`);
        writeToFile(entry);
    },

    warn(message: string, meta?: object): void {
        if (!shouldLog('warn')) return;
        const entry = { level: 'warn', time: new Date().toISOString(), message, ...meta };
        process.stdout.write(`\x1b[33m[WARN]  ${message}\x1b[0m\n`);
        writeToFile(entry);
    },

    error(message: string, meta?: object): void {
        if (!shouldLog('error')) return;
        const entry = { level: 'error', time: new Date().toISOString(), message, ...meta };
        process.stderr.write(`\x1b[31m[ERROR] ${message}\x1b[0m\n`);
        writeToFile(entry);
    }
};
