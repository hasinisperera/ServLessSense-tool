declare module 'react-heatmap-grid' {
  import { CSSProperties } from 'react';

  export interface HeatMapGridProps {
    xLabels: string[];
    yLabels: string[];
    data: number[][];
    cellStyle?: (
      background: string,
      value: number,
      row: number,
      col: number
    ) => CSSProperties;
    cellRender?: (value: number, row: number, col: number) => React.ReactNode;
    xLabelsStyle?: (index: number) => CSSProperties;
    yLabelsStyle?: (index: number) => CSSProperties;
    square?: boolean;
    background?: string;
  }

  export default function HeatMapGrid(props: HeatMapGridProps): JSX.Element;
}
