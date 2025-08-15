export const DEBUG = process.env.NODE_ENV !== 'production' && process.env.DEBUG_LOGS === '1';
export const log = (...args: any[]) => { if (DEBUG) console.log(...args); };
export const warn = (...args: any[]) => { if (DEBUG) console.warn(...args); };
export const error = (...args: any[]) => console.error(...args);
