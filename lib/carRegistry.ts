"use client";

import { create } from "zustand";
import type { Car } from "./cars";
import { CARS } from "./cars";
import { useDashboard } from "./store";

/**
 * Runtime car registry.
 *
 * Car records are initialized once (Option A: from the static `data/cars.json`
 * via `CARS`) and then read across the whole platform through `useCurrentCar()`.
 * Swapping the data source later (e.g. an API) only means calling `initCars()`
 * with the fetched records — no component changes required.
 */
type CarRegistry = {
  cars: Record<string, Car>;
  ids: string[];
  loaded: boolean;
  /** Load the full set once (replaces existing). */
  initCars: (list: Car[]) => void;
  /** Replace the full set. */
  setCars: (list: Car[]) => void;
  /** Add or update a single car. */
  addCar: (car: Car) => void;
};

function toMap(list: Car[]): Record<string, Car> {
  return Object.fromEntries(list.map((c) => [c.id, c]));
}

export const useCars = create<CarRegistry>((set) => ({
  // Seed synchronously from the static data so the first render is populated.
  cars: toMap(CARS),
  ids: CARS.map((c) => c.id),
  loaded: true,

  initCars: (list) => set({ cars: toMap(list), ids: list.map((c) => c.id), loaded: true }),
  setCars: (list) => set({ cars: toMap(list), ids: list.map((c) => c.id) }),
  addCar: (car) =>
    set((s) => ({
      cars: { ...s.cars, [car.id]: car },
      ids: s.ids.includes(car.id) ? s.ids : [...s.ids, car.id],
    })),
}));

/**
 * The currently selected car, resolved from the registry by the active
 * `carId`. Falls back to the first registered car (then the static default).
 */
export function useCurrentCar(): Car {
  const carId = useDashboard((s) => s.carId);
  const cars = useCars((s) => s.cars);
  const ids = useCars((s) => s.ids);
  return cars[carId] ?? cars[ids[0]] ?? CARS[0];
}

/** List of all registered cars (for selectors / garages). */
export function useCarList(): Car[] {
  const cars = useCars((s) => s.cars);
  const ids = useCars((s) => s.ids);
  return ids.map((id) => cars[id]);
}
