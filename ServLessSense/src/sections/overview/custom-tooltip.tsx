import React from 'react';

interface TooltipData {
  name: string;
  value: number;
}

interface CustomTooltipProps {
  payload?: { payload: TooltipData }[]; // Make `payload` optional to match Recharts behavior
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ payload }) => {
  if (!payload || payload.length === 0) return null;

  const data = payload[0].payload; // Access the first data point
  return (
    <div style={{ background: '#fff', padding: '5px', border: '1px solid #ccc' }}>
      <p>{data.name}</p>
      <p>Occurrences: {data.value}</p>
    </div>
  );
};

export default CustomTooltip;
