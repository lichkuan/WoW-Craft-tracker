/* eslint-disable no-console */
export const DEBUG_LOGS = process.env.NODE_ENV !== 'production';

export const log = (...args: unknown[]) => {
  if (DEBUG_LOGS) console.log(...args);
};

export const warn = (...args: unknown[]) => {
  if (DEBUG_LOGS) console.warn(...args);
};

export const error = (...args: unknown[]) => {
  console.error(...args);
};
