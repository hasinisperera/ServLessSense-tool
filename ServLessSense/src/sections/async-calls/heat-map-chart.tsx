import React from 'react';
import * as d3 from 'd3';

interface HeatMapChartProps {
  data: number[][]; // 2D array of counts
  xLabels: string[]; // Labels for the x-axis (smells)
  yLabels: string[]; // Labels for the y-axis (file paths)
  width?: number; // Width of the chart (optional)
  height?: number; // Height of the chart (optional)
}

const HeatMapChart: React.FC<HeatMapChartProps> = ({ data, xLabels, yLabels, width = 800, height = 600 }) => {
  const cellSizeX = Math.max(width / xLabels.length, 30); // Calculate cell width dynamically
  const cellSizeY = Math.max(height / yLabels.length, 30); // Calculate cell height dynamically
  const margin = { top: 50, right: 50, bottom: 50, left: 150 };

  // Colors for the heat map
  const maxCount = d3.max(data.flat()) || 1; // Maximum count in the data
  const colorScale = d3.scaleSequential(d3.interpolateBlues).domain([0, maxCount]);

  return (
    <svg
      width={width + margin.left + margin.right}
      height={height + margin.top + margin.bottom}
      style={{ width: '100%', height: '20%' }}
    >
      <g transform={`translate(${margin.left}, ${margin.top})`}>
        {/* X-axis labels */}
        {xLabels.map((label, i) => (
          <text
            key={i}
            x={i * cellSizeX + cellSizeX / 2}
            y={-10}
            textAnchor="middle"
            style={{ fontSize: '12px' }}
          >
            {label}
          </text>
        ))}

        {/* Y-axis labels */}
        {yLabels.map((label, i) => (
          <text
            key={i}
            x={-10}
            y={i * cellSizeY + cellSizeY / 2}
            textAnchor="end"
            style={{ fontSize: '12px' }}
          >
            {label}
          </text>
        ))}

        {/* Heatmap cells */}
        {data.map((row, rowIndex) =>
          row.map((value, colIndex) => (
            <rect
              key={`${rowIndex}-${colIndex}`}
              x={colIndex * cellSizeX}
              y={rowIndex * cellSizeY}
              width={cellSizeX}
              height={cellSizeY}
              fill={colorScale(value)}
              stroke="#ccc"
            >
              <title>{value}</title> {/* Tooltip on hover */}
            </rect>
          ))
        )}
      </g>
    </svg>
  );
};

export default HeatMapChart;
