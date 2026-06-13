"use client";

import dynamic from "next/dynamic";

function ViewerSkeleton() {
  return (
    <div className="relative flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
        <span className="tele-label">Initializing viewer</span>
      </div>
    </div>
  );
}

// Next 16: dynamic(..., { ssr: false }) must live inside a Client Component.
const CarViewer = dynamic(() => import("./CarViewer"), {
  ssr: false,
  loading: () => <ViewerSkeleton />,
});

export default function CarStage() {
  return (
    <div className="relative h-full w-full">
      <CarViewer />
    </div>
  );
}
