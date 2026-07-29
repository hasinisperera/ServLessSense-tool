import { useCallback, useEffect, useState } from 'react';

import { normalizeSmellRecords } from './normalize-smell-record';
import type { SmellRecord } from './types';

type UseSmellDataResult = {
  records: SmellRecord[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useSmellData(dataPath: string): UseSmellDataResult {
  const [records, setRecords] = useState<SmellRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(dataPath);

      if (!response.ok) {
        throw new Error(`Failed to fetch smell data (${response.status})`);
      }

      const data = await response.json();
      setRecords(normalizeSmellRecords(Array.isArray(data) ? data : []));
    } catch (fetchError) {
      console.error('Error fetching smell data:', fetchError);
      setError('Failed to load smell data. Please run analysis or check data files.');
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [dataPath]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { records, loading, error, refetch: fetchData };
}
