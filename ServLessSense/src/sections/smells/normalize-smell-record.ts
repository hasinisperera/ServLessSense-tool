import { getSmellDisplayText } from 'src/utils/smell-display';

import type { SmellRecord } from './types';

export function normalizeSmellRecord(record: SmellRecord): SmellRecord {
  const displayText = getSmellDisplayText(record);

  return {
    ...record,
    code: record.code ?? displayText,
    message: record.message ?? displayText,
  };
}

export function normalizeSmellRecords(records: SmellRecord[]): SmellRecord[] {
  return records.map(normalizeSmellRecord);
}
