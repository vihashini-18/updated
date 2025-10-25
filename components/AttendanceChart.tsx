import React from 'react';

interface AttendanceChartProps {
  present: number;
  absent: number;
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({ present, absent }) => {
  const total = present + absent;
  if (total === 0) {
    return <div className="text-center text-gray-400 py-8">No attendance data for today.</div>;
  }

  const presentPercentage = total > 0 ? (present / total) * 100 : 0;
  
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 12;

  const presentStrokeDashoffset = circumference - (presentPercentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-40 h-40">
        <svg viewBox="0 0 124 124" className="transform -rotate-90 w-full h-full">
          {/* Background circle for absent */}
          <circle
            cx="62"
            cy="62"
            r={radius}
            fill="transparent"
            stroke="rgba(239, 68, 68, 0.2)" // Faint red for absent
            strokeWidth={strokeWidth}
          />
          {/* Foreground arc for present */}
          {present > 0 && (
            <circle
              cx="62"
              cy="62"
              r={radius}
              fill="transparent"
              stroke="#22c55e" // Green for present
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={presentStrokeDashoffset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white">{`${Math.round(presentPercentage)}%`}</span>
          <span className="text-xs text-gray-400 uppercase tracking-wider">Present</span>
        </div>
      </div>
      <div className="flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          <span className="text-gray-300">Present: <span className="font-semibold text-white">{present}</span></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500/30"></span>
          <span className="text-gray-300">Absent: <span className="font-semibold text-white">{absent}</span></span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceChart;
