"use client";

import { useEffect } from "react";
import { CARS } from "@/lib/cars";
import { F1_CAR } from "@/lib/f1";
import { useCars } from "@/lib/carRegistry";
import { useDashboard } from "@/lib/store";

const F1_SETUP_KEY = "tele-car:f1-setup";

/**
 * Initializes the car registry once on mount from the static data source
 * (`data/cars.json` → `CARS`), and persists the F1 garage setup to
 * localStorage so a tuned setup survives reloads.
 */
export default function CarDataProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    useCars.getState().initCars([...CARS, F1_CAR]);

    // Restore a saved F1 setup, if any.
    try {
      const raw = localStorage.getItem(F1_SETUP_KEY);
      if (raw) useDashboard.getState().setF1Part(JSON.parse(raw));
    } catch {
      /* ignore malformed storage */
    }

    // Persist whenever the setup changes.
    const unsub = useDashboard.subscribe((state, prev) => {
      if (state.f1Setup !== prev.f1Setup) {
        try {
          localStorage.setItem(F1_SETUP_KEY, JSON.stringify(state.f1Setup));
        } catch {
          /* storage unavailable */
        }
      }
    });
    return unsub;
  }, []);

  return <>{children}</>;
}
