/**
 * Simple structured logger for production use.
 * In a full production environment, consider using pino or winston with external transport.
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    data?: Record<string, unknown>;
}

const formatLog = (entry: LogEntry): string => {
    return JSON.stringify(entry);
};

export const logger = {
    info: (message: string, data?: Record<string, unknown>) => {
        console.log(formatLog({
            timestamp: new Date().toISOString(),
            level: 'info',
            message,
            data,
        }));
    },

    warn: (message: string, data?: Record<string, unknown>) => {
        console.warn(formatLog({
            timestamp: new Date().toISOString(),
            level: 'warn',
            message,
            data,
        }));
    },

    error: (message: string, data?: Record<string, unknown>) => {
        console.error(formatLog({
            timestamp: new Date().toISOString(),
            level: 'error',
            message,
            data,
        }));
    },

    debug: (message: string, data?: Record<string, unknown>) => {
        if (process.env.NODE_ENV !== 'production') {
            console.debug(formatLog({
                timestamp: new Date().toISOString(),
                level: 'debug',
                message,
                data,
            }));
        }
    },
};
