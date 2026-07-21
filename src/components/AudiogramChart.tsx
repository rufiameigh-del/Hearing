import React from "react";
import { Frequency, FREQUENCIES } from "../types";

interface AudiogramChartProps {
  leftData: { [key in Frequency]?: number };
  rightData: { [key in Frequency]?: number };
}

export default function AudiogramChart({ leftData, rightData }: AudiogramChartProps) {
  // Dimensions for SVG
  const width = 600;
  const height = 400;
  const padding = { top: 40, right: 40, bottom: 50, left: 60 };

  // Helper functions for mapping data to SVG space
  const getX = (freq: Frequency) => {
    const index = FREQUENCIES.indexOf(freq);
    const step = (width - padding.left - padding.right) / (FREQUENCIES.length - 1);
    return padding.left + index * step;
  };

  const getY = (db: number) => {
    const minDb = -10;
    const maxDb = 110;
    const yRange = height - padding.top - padding.bottom;
    const dbRange = maxDb - minDb;
    // Lower dB (better hearing) is at the TOP, so dB = -10 maps to padding.top
    const ratio = (db - minDb) / dbRange;
    return padding.top + ratio * yRange;
  };

  // Generate ticks for Y-axis (dB) from -10 to 110 with steps of 10 or 20
  const yTicks: number[] = [];
  for (let db = -10; db <= 110; db += 10) {
    yTicks.push(db);
  }

  // Right ear points (Red circles)
  const rightPoints = FREQUENCIES.map((f) => {
    const val = rightData[f];
    if (val === undefined) return null;
    return { x: getX(f), y: getY(val), f, val };
  }).filter((p): p is { x: number; y: number; f: Frequency; val: number } => p !== null);

  // Left ear points (Blue crosses)
  const leftPoints = FREQUENCIES.map((f) => {
    const val = leftData[f];
    if (val === undefined) return null;
    return { x: getX(f), y: getY(val), f, val };
  }).filter((p): p is { x: number; y: number; f: Frequency; val: number } => p !== null);

  return (
    <div id="audiogram-chart-container" className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center">
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-[600px] min-w-[450px] mx-auto overflow-visible font-sans"
        >
          {/* Normal Hearing Shaded Zone (-10 dB to 20 dB) */}
          <rect
            x={padding.left}
            y={getY(-10)}
            width={width - padding.left - padding.right}
            height={getY(20) - getY(-10)}
            fill="#10b981"
            fillOpacity="0.06"
          />
          <text
            x={padding.left + 10}
            y={getY(5)}
            className="fill-emerald-600 text-[10px] font-semibold tracking-wider opacity-80"
          >
            正常听力范围 (&le; 20 dB HL)
          </text>

          {/* Mild Hearing Loss Threshold Reference line */}
          <line
            x1={padding.left}
            y1={getY(20)}
            x2={width - padding.right}
            y2={getY(20)}
            stroke="#10b981"
            strokeDasharray="4 4"
            strokeWidth="1"
            opacity="0.5"
          />

          {/* Grid lines - Frequency (Vertical) */}
          {FREQUENCIES.map((freq) => {
            const x = getX(freq);
            return (
              <g key={`v-grid-${freq}`}>
                <line
                  x1={x}
                  y1={padding.top}
                  x2={x}
                  y2={height - padding.bottom}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={height - padding.bottom + 18}
                  textAnchor="middle"
                  className="fill-slate-500 text-xs font-medium"
                >
                  {freq >= 1000 ? `${freq / 1000}k` : freq}
                </text>
              </g>
            );
          })}

          {/* Grid lines - dB HL (Horizontal) */}
          {yTicks.map((db) => {
            const y = getY(db);
            const isMainLine = db === 0 || db === 40 || db === 70 || db === 90;
            return (
              <g key={`h-grid-${db}`}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke={isMainLine ? "#cbd5e1" : "#f1f5f9"}
                  strokeWidth={isMainLine ? "1.2" : "1"}
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  textAnchor="end"
                  className={`fill-slate-500 text-[11px] font-mono ${
                    isMainLine ? "font-semibold fill-slate-700" : ""
                  }`}
                >
                  {db}
                </text>
              </g>
            );
          })}

          {/* Axes labels */}
          <text
            x={padding.left + (width - padding.left - padding.right) / 2}
            y={height - 10}
            textAnchor="middle"
            className="fill-slate-600 text-xs font-semibold"
          >
            频率 (Hz - 赫兹)
          </text>

          <text
            transform={`rotate(-90)`}
            x={-padding.top - (height - padding.top - padding.bottom) / 2}
            y={15}
            textAnchor="middle"
            className="fill-slate-600 text-xs font-semibold"
          >
            听力级 (dB HL - 分贝) &rarr;
          </text>

          {/* Connection Lines - Right Ear (Red Solid) */}
          {rightPoints.length > 1 && (
            <path
              d={rightPoints
                .map((p, index) => `${index === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                .join(" ")}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2.5"
            />
          )}

          {/* Connection Lines - Left Ear (Blue Dashed) */}
          {leftPoints.length > 1 && (
            <path
              d={leftPoints
                .map((p, index) => `${index === 0 ? "M" : "L"} ${p.x} ${p.y}`)
                .join(" ")}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeDasharray="4 4"
            />
          )}

          {/* Markers - Right Ear (Red Circles ◯) */}
          {rightPoints.map((p) => (
            <g key={`right-point-${p.f}`} className="group cursor-pointer">
              <circle
                cx={p.x}
                cy={p.y}
                r="6"
                fill="white"
                stroke="#ef4444"
                strokeWidth="2.5"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r="10"
                fill="#ef4444"
                fillOpacity="0"
                className="hover:fill-opacity-10 transition-all duration-150"
              />
              {/* Tooltip on hover */}
              <title>{`右耳 ${p.f}Hz: ${p.val}dB`}</title>
              {/* Little value text badge */}
              <text
                x={p.x}
                y={p.y - 12}
                textAnchor="middle"
                className="fill-red-600 text-[10px] font-bold bg-white"
              >
                {p.val}
              </text>
            </g>
          ))}

          {/* Markers - Left Ear (Blue Crosses ✕) */}
          {leftPoints.map((p) => (
            <g key={`left-point-${p.f}`} className="group cursor-pointer">
              {/* Drawing a standard 'X' symbol */}
              <line
                x1={p.x - 5}
                y1={p.y - 5}
                x2={p.x + 5}
                y2={p.y + 5}
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <line
                x1={p.x + 5}
                y1={p.y - 5}
                x2={p.x - 5}
                y2={p.y + 5}
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle
                cx={p.x}
                cy={p.y}
                r="10"
                fill="#3b82f6"
                fillOpacity="0"
                className="hover:fill-opacity-10 transition-all duration-150"
              />
              {/* Tooltip on hover */}
              <title>{`左耳 ${p.f}Hz: ${p.val}dB`}</title>
              <text
                x={p.x}
                y={p.y - 12}
                textAnchor="middle"
                className="fill-blue-600 text-[10px] font-bold bg-white"
              >
                {p.val}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex gap-6 mt-3 text-xs border-t border-slate-100 pt-3 w-full justify-center">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded-full border-2 border-red-500 bg-white inline-flex items-center justify-center">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
          </span>
          <span className="text-red-600 font-semibold">右耳 (气导 ◯ - 红色实线)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-blue-500 font-extrabold text-sm inline-flex leading-none items-center justify-center h-4">&#10005;</span>
          <span className="text-blue-600 font-semibold border-b border-dashed border-blue-400">左耳 (气导 ✕ - 蓝色虚线)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-5 h-3 bg-emerald-500 bg-opacity-15 border border-emerald-300 inline-block"></span>
          <span className="text-emerald-700">WHO正常听力标准 (&le; 20 dB HL)</span>
        </div>
      </div>
    </div>
  );
}
