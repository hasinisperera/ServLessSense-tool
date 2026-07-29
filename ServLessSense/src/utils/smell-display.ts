/**
 * Display text for a smell record (ESLint uses message, asyncCalls uses code).
 */
export function getSmellDisplayText(record: {
  message?: string;
  code?: string;
}): string {
  return record.message ?? record.code ?? '';
}
