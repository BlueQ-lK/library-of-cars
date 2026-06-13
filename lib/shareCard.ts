// lib/shareCard.ts
// Draws a styled lap-result card onto a canvas and downloads it as a PNG.
// Dependency-free — pure Canvas 2D.

import type { Track } from "./tracks";
import type { SimResult } from "./lapsim";
import { formatLapTime, speedColor } from "./lapsim";

export function downloadResultCard(opts: {
  carName: string;
  track: Track;
  result: SimResult;
  downforce: number;
  wet: boolean;
}) {
  const { carName, track, result, downforce, wet } = opts;
  const W = 1200;
  const H = 630;
  const dpr = 2;
  const canvas = document.createElement("canvas");
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(dpr, dpr);

  // background
  ctx.fillStyle = "#0b0d10";
  ctx.fillRect(0, 0, W, H);
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#11151c");
  grad.addColorStop(1, "#0b0d10");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // accent bar
  ctx.fillStyle = "#0057ff";
  ctx.fillRect(0, 0, 8, H);

  const pad = 56;

  // header
  ctx.fillStyle = "#9aa1ad";
  ctx.font = "600 16px system-ui, sans-serif";
  ctx.fillText("TELE-CAR · TRACK LAB", pad, pad + 6);

  ctx.fillStyle = "#ffffff";
  ctx.font = "700 40px system-ui, sans-serif";
  ctx.fillText(carName, pad, pad + 56);

  ctx.fillStyle = "#c2cad6";
  ctx.font = "500 20px system-ui, sans-serif";
  ctx.fillText(
    `${track.name}  ·  ${(track.lengthM / 1000).toFixed(2)} km  ·  ${
      wet ? "Wet" : "Dry"
    }  ·  ${Math.round(downforce * 100)}% downforce`,
    pad,
    pad + 90,
  );

  // lap time (hero)
  ctx.fillStyle = "#9aa1ad";
  ctx.font = "600 18px system-ui, sans-serif";
  ctx.fillText("LAP TIME", pad, 230);
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 96px ui-monospace, monospace";
  ctx.fillText(formatLapTime(result.lapTimeS), pad, 320);

  // stat chips
  const stats: [string, string][] = [
    ["AVG SPEED", `${Math.round(result.avgSpeedKmh)} km/h`],
    ["PEAK SPEED", `${Math.round(result.peakSpeedKmh)} km/h`],
    ["PEAK LAT G", `${result.peakLatG.toFixed(1)} g`],
  ];
  stats.forEach(([label, value], i) => {
    const x = pad + i * 250;
    const y = 370;
    ctx.fillStyle = "#9aa1ad";
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.fillText(label, x, y);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 30px ui-monospace, monospace";
    ctx.fillText(value, x, y + 36);
  });

  // sector times
  ctx.fillStyle = "#9aa1ad";
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillText("SECTORS", pad, 470);
  result.sectorS.forEach((s, i) => {
    const x = pad + i * 250;
    ctx.fillStyle = "#1c2530";
    roundRect(ctx, x, 484, 210, 60, 12);
    ctx.fill();
    ctx.fillStyle = "#7fb0ff";
    ctx.font = "600 13px system-ui, sans-serif";
    ctx.fillText(`S${i + 1}`, x + 16, 508);
    ctx.fillStyle = "#ffffff";
    ctx.font = "700 22px ui-monospace, monospace";
    ctx.fillText(`${s.toFixed(3)}`, x + 16, 534);
  });

  // speed-vs-distance sparkline (right side)
  const gx = 720;
  const gy = 150;
  const gw = 420;
  const gh = 220;
  ctx.fillStyle = "#9aa1ad";
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillText("SPEED TRACE", gx, gy - 12);
  ctx.strokeStyle = "#262d38";
  ctx.lineWidth = 1;
  ctx.strokeRect(gx, gy, gw, gh);

  const n = result.samples.length;
  const maxV = Math.max(...result.samples.map((s) => s.speedKmh), 1);
  // colored segments by speed
  for (let i = 0; i < n - 1; i++) {
    const a = result.samples[i];
    const b = result.samples[i + 1];
    const x1 = gx + (a.s / result.samples[n - 1].s) * gw;
    const x2 = gx + (b.s / result.samples[n - 1].s) * gw;
    const y1 = gy + gh - (a.speedKmh / maxV) * gh;
    const y2 = gy + gh - (b.speedKmh / maxV) * gh;
    ctx.strokeStyle = speedColor(a.speedKmh);
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // footer
  ctx.fillStyle = "#5b6573";
  ctx.font = "500 14px system-ui, sans-serif";
  ctx.fillText("Illustrative lap simulation · not a CFD/vehicle-dynamics model", pad, H - 36);

  // download
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `tele-car-${track.id}-${formatLapTime(result.lapTimeS).replace(/[:.]/g, "-")}.png`;
  a.click();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
