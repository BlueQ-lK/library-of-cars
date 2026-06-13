"use client";

import { useMemo } from "react";
import type { SimResult } from "@/lib/lapsim";
import { speedColor } from "@/lib/lapsim";

const VW = 1000;
const VH = 560;
const PAD = 70;

export default function TrackMap({
  result,
  index,
}: {
  result: SimResult;
  index: number;
}) {
  const { samples, corners } = result;

  // Fit the normalized track into the viewBox.
  const project = useMemo(() => {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const s of samples) {
      if (s.x < minX) minX = s.x;
      if (s.x > maxX) maxX = s.x;
      if (s.y < minY) minY = s.y;
      if (s.y > maxY) maxY = s.y;
    }
    const spanX = maxX - minX || 1;
    const spanY = maxY - minY || 1;
    const scale = Math.min((VW - 2 * PAD) / spanX, (VH - 2 * PAD) / spanY);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    return (x: number, y: number): [number, number] => [
      VW / 2 + (x - cx) * scale,
      // flip Y (SVG y is downward)
      VH / 2 - (y - cy) * scale,
    ];
  }, [samples]);

  const asphalt = useMemo(() => {
    const pts = samples.map((s) => project(s.x, s.y));
    return pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  }, [samples, project]);

  const car = samples[Math.min(index, samples.length - 1)];
  const [carX, carY] = project(car.x, car.y);
  const [startX, startY] = project(samples[0].x, samples[0].y);

  return (
    <div className="relative h-full w-full">
      {/* speed legend */}
      <div className="absolute left-2 top-2 z-10">
        <div className="tele-label mb-1">Speed (km/h)</div>
        <div
          className="h-2 w-48 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, rgb(37,99,235), rgb(22,184,148), rgb(120,200,60), rgb(230,170,0), rgb(229,72,77))",
          }}
        />
        <div className="mt-1 flex w-48 justify-between text-[10px] text-faint">
          <span>60</span>
          <span>120</span>
          <span>180</span>
          <span>240</span>
          <span>300+</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${VW} ${VH}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <filter id="trackShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#1a1d24" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* asphalt base (with soft shadow) */}
        <polyline
          points={asphalt}
          fill="none"
          stroke="#cfd4dc"
          strokeWidth={26}
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#trackShadow)"
        />
        <polyline
          points={asphalt}
          fill="none"
          stroke="#3a3f48"
          strokeWidth={22}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* speed-colored racing surface */}
        <g strokeWidth={15} strokeLinecap="round">
          {samples.map((s, i) => {
            const a = project(s.x, s.y);
            const b = project(samples[(i + 1) % samples.length].x, samples[(i + 1) % samples.length].y);
            return (
              <line
                key={i}
                x1={a[0]}
                y1={a[1]}
                x2={b[0]}
                y2={b[1]}
                stroke={speedColor(s.speedKmh)}
              />
            );
          })}
        </g>

        {/* start / finish line */}
        <g transform={`translate(${startX},${startY})`}>
          <rect x={-9} y={-9} width={18} height={18} rx={3} fill="#fff" stroke="#11151c" strokeWidth={2} />
          <path d="M-9 -9 h6 v6 h-6 z M-3 -3 h6 v6 h-6 z M3 -9 h6 v6 h-6 z M-9 3 h6 v6 h-6 z M3 3 h6 v6 h-6 z" fill="#11151c" />
        </g>

        {/* corner markers */}
        {corners.map((c) => {
          const [x, y] = project(c.x, c.y);
          return (
            <g key={c.number} transform={`translate(${x},${y})`}>
              <circle r={11} fill="#11151c" />
              <text
                x={0}
                y={0}
                fontSize={11}
                fontWeight={600}
                fill="#fff"
                textAnchor="middle"
                dominantBaseline="central"
              >
                {c.number}
              </text>
            </g>
          );
        })}

        {/* car marker */}
        <g transform={`translate(${carX},${carY})`}>
          <circle r={13} fill={speedColor(car.speedKmh)} opacity={0.25} />
          <circle r={7} fill={speedColor(car.speedKmh)} stroke="#fff" strokeWidth={2.5} />
        </g>
      </svg>
    </div>
  );
}
