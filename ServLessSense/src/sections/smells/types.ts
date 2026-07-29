export type Severity = 'low' | 'medium' | 'high';

export type SmellRecord = {
  filePath: string;
  line: number;
  type?: string;
  code?: string;
  message?: string;
  column?: number;
  severity?: number;
  functionName?: string;
};

export type TreeNode = {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'directory';
  children: TreeNode[];
  smells?: SmellRecord[];
  expanded: boolean;
  severity?: Severity;
};

export type SmellTableColumn = 'filePath' | 'line' | 'type' | 'code' | 'message' | 'actions';

export type SmellDetailConfig = {
  title: string;
  description: string;
  dataPath: string;
  tableColumns: SmellTableColumn[];
  recordFilter?: (record: SmellRecord) => boolean;
  treeSmellFilter?: (record: SmellRecord) => boolean;
  enableRefactor?: boolean;
  refactorType?: string;
};

export type SmellTypeLabel =
  | 'Sync & Async Calls'
  | 'Too Many Libraries'
  | 'Too Many Functions'
  | 'Shared Code'
  | 'Too Many Technologies';

export type HeatmapDataPoint = {
  x: string;
  y: number;
};

export type HeatmapItem = {
  id: string;
  data: HeatmapDataPoint[];
};

export type SmellGroup = {
  smellType: string;
  data: HeatmapItem[];
};

export type SmellDataRow = {
  id: string;
  'Sync & Async Calls': number;
  'Too Many Libraries': number;
  'Too Many Functions': number;
  'Shared Code': number;
  'Too Many Technologies': number;
  [key: string]: string | number;
};

export type TransformedHeatmapItem = {
  id: string;
  data: Array<{ x: SmellTypeLabel; y: number }>;
};
