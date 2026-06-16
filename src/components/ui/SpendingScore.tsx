"use client";

interface SpendingScoreProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function SpendingScore({
  score,
  size = 120,
  strokeWidth = 8,
  className = "",
}: SpendingScoreProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 70) return { stroke: "#0d9488", bg: "rgba(13, 148, 136, 0.1)", label: "Great", text: "text-teal-400" };
    if (s >= 40) return { stroke: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", label: "Fair", text: "text-amber-400" };
    return { stroke: "#ef4444", bg: "rgba(239, 68, 68, 0.1)", label: "Needs Work", text: "text-red-400" };
  };

  const colors = getColor(score);

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ animation: "score-fill 1.5s ease-out", transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-2xl font-bold ${colors.text}`}>{score}</span>
        <span className="text-xs text-slate-500">{colors.label}</span>
      </div>
    </div>
  );
}
