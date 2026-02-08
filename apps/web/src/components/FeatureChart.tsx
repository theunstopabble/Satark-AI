import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface FeatureChartProps {
  data: number[];
  label: string;
  color?: string;
}

export function FeatureChart({
  data,
  label,
  color = "#8884d8",
}: FeatureChartProps) {
  // Convert 1D array to object array for Recharts
  const chartData = data.map((val, index) => ({
    index,
    value: val,
  }));

  return (
    <div className="bg-card p-4 rounded-lg border shadow-sm">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        {label} Analysis
      </h3>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="index" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                borderColor: "var(--border)",
              }}
              itemStyle={{ color: "var(--foreground)" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
