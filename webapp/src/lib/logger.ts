// Simple JSON logger for structured logging

export const logger = {
  info: (obj: Record<string, any>) => {
    console.log(JSON.stringify({ ...obj, level: 'info', timestamp: new Date().toISOString() }));
  },
  
  warn: (obj: Record<string, any>) => {
    console.warn(JSON.stringify({ ...obj, level: 'warn', timestamp: new Date().toISOString() }));
  },
  
  error: (obj: Record<string, any>) => {
    console.error(JSON.stringify({ ...obj, level: 'error', timestamp: new Date().toISOString() }));
  },
};
