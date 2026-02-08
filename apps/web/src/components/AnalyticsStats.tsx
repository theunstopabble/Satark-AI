import { useMemo } from "react";
import { ScanResultType } from "@repo/shared";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Activity, ShieldCheck, ShieldAlert, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

interface AnalyticsStatsProps {
  scans: ScanResultType[];
}

export function AnalyticsStats({ scans }: AnalyticsStatsProps) {
  const stats = useMemo(() => {
    const total = scans.length;
    const fake = scans.filter((s) => s.isDeepfake).length;
    const real = total - fake;
    const avgConfidence =
      total > 0
        ? (scans.reduce((acc, curr) => acc + curr.confidenceScore, 0) / total) *
          100
        : 0;

    return { total, fake, real, avgConfidence };
  }, [scans]);

  const pieData = [
    { name: "Real", value: stats.real, color: "#22c55e" }, // Green
    { name: "Fake", value: stats.fake, color: "#ef4444" }, // Red
  ];

  // Distribute confidence into buckets
  const barData = useMemo(() => {
    const buckets = { High: 0, Medium: 0, Low: 0 };
    scans.forEach((s) => {
      const score = s.confidenceScore * 100;
      if (score > 80) buckets.High++;
      else if (score > 50) buckets.Medium++;
      else buckets.Low++;
    });
    return [
      { name: "High (>80%)", count: buckets.High },
      { name: "Med (50-80%)", count: buckets.Medium },
      { name: "Low (<50%)", count: buckets.Low },
    ];
  }, [scans]);

  if (scans.length === 0) return null;

  return (
    <div className="space-y-6 mb-8 animate-in fade-in duration-700">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <Activity className="text-primary" /> Analytics Overview
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 bg-card border rounded-xl shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Total Scans</p>
              <h3 className="text-2xl font-bold">{stats.total}</h3>
            </div>
            <BarChart3 className="text-blue-500" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 bg-card border rounded-xl shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">
                Deepfakes Detected
              </p>
              <h3 className="text-2xl font-bold text-red-600">{stats.fake}</h3>
            </div>
            <ShieldAlert className="text-red-500" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 bg-card border rounded-xl shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Real Audio</p>
              <h3 className="text-2xl font-bold text-green-600">
                {stats.real}
              </h3>
            </div>
            <ShieldCheck className="text-green-500" />
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="p-4 bg-card border rounded-xl shadow-sm"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Avg Confidence</p>
              <h3 className="text-2xl font-bold">
                {stats.avgConfidence.toFixed(1)}%
              </h3>
            </div>
            <Activity className="text-purple-500" />
          </div>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-card border rounded-xl shadow-sm">
          <h3 className="font-semibold mb-4">Detection Ratio</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-2">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm">Fake</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm">Real</span>
            </div>
          </div>
        </div>

        <div className="p-6 bg-card border rounded-xl shadow-sm">
          <h3 className="font-semibold mb-4">Confidence Distribution</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{
                    borderRadius: "8px",
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
