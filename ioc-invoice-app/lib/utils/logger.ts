export function logError(context: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ level: "error", context, message, timestamp: new Date().toISOString() }));
}

export function logInfo(context: string, data?: Record<string, unknown>) {
  console.log(JSON.stringify({ level: "info", context, ...data, timestamp: new Date().toISOString() }));
}
