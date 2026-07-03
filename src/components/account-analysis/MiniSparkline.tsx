import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface MiniSparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}

export const MiniSparkline = ({ data, width = 60, height = 20, color = '#6366f1' }: MiniSparklineProps) => {
  if (!data || data.length < 2) return null;
  const chartData = data.map((v, i) => ({ v, i }));

  return (
    <div style={{ width, height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
