import { useCallback, useEffect, useState } from 'react';

import { DATA_PATHS } from 'src/config-data';
import { getPathBasename } from 'src/utils/split-path';

import { normalizeSmellRecords } from './normalize-smell-record';
import type {
  SmellGroup,
  SmellRecord,
  SmellTypeLabel,
  TransformedHeatmapItem,
} from './types';

const SMELL_CONFIG: Array<{ url: string; type: SmellTypeLabel }> = [
  { url: DATA_PATHS.smells.asyncCalls, type: 'Sync & Async Calls' },
  { url: DATA_PATHS.smells.tooManyLibraries, type: 'Too Many Libraries' },
  { url: DATA_PATHS.smells.tooManyFunctions, type: 'Too Many Functions' },
  { url: DATA_PATHS.smells.sharedCode, type: 'Shared Code' },
  { url: DATA_PATHS.smells.tooManyTechnologies, type: 'Too Many Technologies' },
];

export function useSmellDashboardData() {
  const [projectName, setProjectName] = useState('project');
  const [asyncCalls, setAsyncCalls] = useState<SmellRecord[]>([]);
  const [sharedCodes, setSharedCodes] = useState<SmellRecord[]>([]);
  const [libraries, setLibraries] = useState<SmellRecord[]>([]);
  const [technologies, setTechnologies] = useState<SmellRecord[]>([]);
  const [functions, setFunctions] = useState<SmellRecord[]>([]);
  const [heatmapData, setHeatmapData] = useState<TransformedHeatmapItem[] | null>(null);
  const [smellGroupedData, setSmellGroupedData] = useState<SmellGroup[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const projectResponse = await fetch(DATA_PATHS.projectName);
      if (projectResponse.ok) {
        const projectData = await projectResponse.json();
        setProjectName(projectData.projectName ?? 'project');
      }

      const responses = await Promise.all(
        SMELL_CONFIG.map(async ({ url, type }) => {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              return { type, data: [] as SmellRecord[] };
            }
            const data = await response.json();
            return { type, data: normalizeSmellRecords(Array.isArray(data) ? data : []) };
          } catch {
            return { type, data: [] as SmellRecord[] };
          }
        })
      );

      responses.forEach(({ type, data }) => {
        if (type === 'Sync & Async Calls') setAsyncCalls(data);
        if (type === 'Shared Code') setSharedCodes(data);
        if (type === 'Too Many Libraries') setLibraries(data);
        if (type === 'Too Many Technologies') setTechnologies(data);
        if (type === 'Too Many Functions') setFunctions(data);
      });

      const masterFileMap = new Map<string, Record<SmellTypeLabel, number>>();

      responses.forEach(({ type, data }) => {
        data.forEach((entry) => {
          if (!entry.filePath) return;
          const fileName = getPathBasename(entry.filePath);
          const existing = masterFileMap.get(fileName) ?? {
            'Sync & Async Calls': 0,
            'Too Many Libraries': 0,
            'Too Many Functions': 0,
            'Shared Code': 0,
            'Too Many Technologies': 0,
          };
          existing[type] += 1;
          masterFileMap.set(fileName, existing);
        });
      });

      const heatmap: TransformedHeatmapItem[] = Array.from(masterFileMap.entries()).map(
        ([id, counts]) => ({
          id,
          data: [
            { x: 'Sync & Async Calls', y: counts['Sync & Async Calls'] },
            { x: 'Too Many Libraries', y: counts['Too Many Libraries'] },
            { x: 'Too Many Functions', y: counts['Too Many Functions'] },
            { x: 'Shared Code', y: counts['Shared Code'] },
            { x: 'Too Many Technologies', y: counts['Too Many Technologies'] },
          ],
        })
      );

      setHeatmapData(heatmap);
    } catch (fetchError) {
      console.error('Error loading dashboard data:', fetchError);
      setError('Failed to load smell data. Please run analysis or check data files.');
      setHeatmapData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    if (!heatmapData) {
      setSmellGroupedData(null);
      return;

    }

    const smellTypes: SmellTypeLabel[] = [
      'Sync & Async Calls',
      'Too Many Libraries',
      'Too Many Functions',
      'Shared Code',
      'Too Many Technologies',
    ];

    const grouped: SmellGroup[] = smellTypes.map((smellType) => ({
      smellType,
      data: heatmapData
        .filter((item) => item.data.some((d) => d.x === smellType && d.y > 0))
        .map((item) => ({
          id: item.id,
          data: [{ x: smellType, y: item.data.find((d) => d.x === smellType)?.y ?? 0 }],
        })),
    }));

    setSmellGroupedData(grouped);
  }, [heatmapData]);

  const totalCounts = asyncCalls.reduce(
    (totals, method) => {
      const type = method.type ?? 'sync';
      if (type in totals) {
        totals[type as keyof typeof totals] += 1;
      }
      return totals;
    },
    { sync: 0, async: 0, promise: 0 }
  );

  return {
    projectName,
    asyncCalls,
    sharedCodes,
    libraries,
    technologies,
    functions,
    heatmapData,
    smellGroupedData,
    totalCounts,
    loading,
    error,
    refetch: fetchAll,
  };
}
