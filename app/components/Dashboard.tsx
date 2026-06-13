"use client";

import { getCar } from "@/lib/cars";
import { useDashboard } from "@/lib/store";
import IconRail from "./IconRail";
import LeftSidebar from "./LeftSidebar";
import Header from "./Header";
import RightSidebar from "./RightSidebar";
import MetricBar from "./MetricBar";
import CarStage from "./viewer/CarStage";
import AeroPanel from "./AeroPanel";
import { StageTabs, ThreeSixtyBadge, StageControls } from "./StageToolbar";

export default function Dashboard() {
  const carId = useDashboard((s) => s.carId);
  const car = getCar(carId);
  const aeroMode = useDashboard((s) => s.aeroMode);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-white">
      {/* Far-left icon rail */}
      <IconRail />

      {/* Left sidebar */}
      <LeftSidebar car={car} />

      {/* Center column: header + stage + metrics */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header car={car} />

        {/* Stage */}
        <section
          className="relative flex-1 overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse 90% 70% at 50% 35%, #ffffff 0%, #f7f8fa 55%, #eef0f3 100%)",
          }}
        >
          {/* Exterior / Interior tabs (hidden in aero mode) */}
          {!aeroMode && (
            <div className="absolute left-1/2 top-5 z-10 -translate-x-1/2">
              <StageTabs />
            </div>
          )}

          {/* 360 badge (hidden in aero mode) */}
          {!aeroMode && (
            <div className="absolute right-6 top-5 z-10">
              <ThreeSixtyBadge />
            </div>
          )}

          {/* Stage content: 2D Aerodynamics Explorer or 3D viewer */}
          <div className="absolute inset-0">
            {aeroMode ? <AeroPanel car={car} /> : <CarStage />}
          </div>

          {/* Bottom-center controls */}
          <div className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2">
            <StageControls />
          </div>
        </section>

        {/* Bottom metric bar */}
        <div className="border-t border-line bg-white px-6 py-4">
          <MetricBar car={car} />
          <p className="mt-3 text-center text-[11px] text-faint">
            All figures are illustrative lab data for demonstration purposes.
          </p>
        </div>
      </div>

      {/* Right sidebar */}
      <RightSidebar car={car} />
    </div>
  );
}
