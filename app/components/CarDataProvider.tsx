"use client";

import { useEffect } from "react";
import { CARS } from "@/lib/cars";
import { useCars } from "@/lib/carRegistry";

/**
 * Initializes the car registry once on mount from the static data source
 * (`data/cars.json` → `CARS`). This is the single seam where the data source
 * is loaded; swapping to an API later only changes what is passed to
 * `initCars()` here.
 */
export default function CarDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    useCars.getState().initCars(CARS);
  }, []);

  return <>{children}</>;
}
