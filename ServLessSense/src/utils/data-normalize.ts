export const normalizeData = (fileData: any[], type: string) => {
  return fileData.map((item) => ({
    type,
    filePath: item.filePath,
    line: item.line,
    code: item.code || item.message, // Use 'code' or 'message'
    severity: item.severity || null, // Use 'severity' if available
  }));
};
