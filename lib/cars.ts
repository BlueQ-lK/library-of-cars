// lib/cars.ts
// Data model + hardcoded demo data for tele-car.
// All values are illustrative demo data for a development build.

export type Trim = {
  id: string;
  name: string;
  price: string;
};

export type PaintOption = {
  id: string;
  name: string;
  /** Hex applied to the GLB "paint" material. */
  hex: string;
  metallic?: boolean;
};

export type InteriorOption = {
  id: string;
  name: string;
  hex: string;
};

export type SpecRow = {
  label: string;
  value: string;
};

export type ConfigOption = {
  /** category, e.g. "Wheels" */
  label: string;
  /** chosen value, e.g. 20" Radial Spoke */
  value: string;
};

export type Metric = {
  label: string;
  value: string;
  unit?: string;
  note?: string;
};

/* ------------------------------------------------------------------ */
/* Aerodynamics Explorer data model                                    */
/* ------------------------------------------------------------------ */

export type AeroViewId = "all" | "external" | "underbody" | "cooling" | "wake";

export type AeroScenarioId =
  | "city"
  | "highway"
  | "track"
  | "crosswind"
  | "wet";

export type AeroComponentId =
  | "front-splitter"
  | "air-curtains"
  | "side-skirts"
  | "rear-diffuser"
  | "active-grille"
  | "cooling-vents"
  | "rear-spoiler";

export type AeroComponent = {
  id: AeroComponentId;
  name: string;
  /** Views in which this component is most relevant / highlighted. */
  views: AeroViewId[];
  /** What the part does. */
  purpose: string;
  /** Why engineers design it the way they do. */
  design: string;
  /** Quantified / qualitative effect on performance. */
  impact: string;
  /** Normalized hotspot position on the 2D side view (0..1). */
  x: number;
  y: number;
};

export type AeroMetrics = {
  /** Drag coefficient (Cd) at this scenario. */
  cd: number;
  /** Aerodynamic drag force, Newtons. */
  dragForceN: number;
  /** Net downforce (positive) or lift (negative), Newtons. */
  downforceN: number;
  /** Front/rear lift balance, percent front (50 = neutral). */
  frontLiftPct: number;
  /** Cooling airflow index, 0..100. */
  coolingFlow: number;
  /** Overall aerodynamic efficiency, 0..100. */
  efficiency: number;
  /** High-speed stability index, 0..100. */
  stability: number;
};

export type AeroScenario = {
  id: AeroScenarioId;
  name: string;
  speedKmh: number;
  description: string;
  /** Relative streamline animation speed multiplier (1 = baseline). */
  flowSpeed: number;
  /** Turbulence / separation intensity, 0..1 (drives wake size). */
  turbulence: number;
  /** Optional lateral yaw flow, 0..1 (crosswind). */
  yaw?: number;
  /** Whether the scenario adds spray/wet visualization. */
  wet?: boolean;
  metrics: AeroMetrics;
};

export type AeroViewMeta = {
  id: AeroViewId;
  name: string;
  blurb: string;
};

export type AeroData = {
  /** Baseline drag coefficient (clean configuration). */
  cd: number;
  /** Frontal area, m² (fallback; the live value is measured from the mesh). */
  frontalAreaM2: number;
  /** Real-world overall length, metres — used to scale mesh measurements. */
  lengthM: number;
  /** Where flow separates from the body (educational note). */
  separationNote: string;
  views: AeroViewMeta[];
  components: AeroComponent[];
  scenarios: AeroScenario[];
};

export type Car = {
  id: string;
  brand: string;
  name: string;
  fullName: string;
  variant: string;
  year: string;
  tagline: string;
  modelPath: string;

  trims: Trim[];

  exteriorColors: PaintOption[];
  /** label shown under the exterior swatches */
  exteriorColorLabel: string;

  interiorColors: InteriorOption[];
  /** label shown under the interior swatches */
  interiorColorLabel: string;

  /** Left sidebar dimensions list. */
  dimensions: SpecRow[];

  /** Right sidebar performance list. */
  performance: SpecRow[];

  /** Right sidebar key features. */
  keyFeatures: string[];

  /** Right sidebar configure list. */
  configure: ConfigOption[];

  /** Bottom metric bar. */
  metrics: Metric[];

  /** Aerodynamics Explorer dataset. */
  aero: AeroData;
};

export const BMW_I8: Car = {
  id: "bmw-i8",
  brand: "BMW",
  name: "i8",
  fullName: "BMW i8 CoupÃ©",
  variant: "CoupÃ© Â· Plug-in Hybrid",
  year: "2020",
  tagline: "Born electric. Engineered for the road ahead.",
  modelPath: "/models/japanese_bus_nagoya_city_bus_aichi.glb",

  trims: [
    { id: "coupe", name: "i8 CoupÃ©", price: "â‚¹2.62 Cr" },
    { id: "roadster", name: "i8 Roadster", price: "â‚¹2.74 Cr" },
    { id: "protonic", name: "Protonic Frozen Black", price: "â‚¹2.80 Cr" },
  ],

  exteriorColors: [
    {
      id: "crystal-white",
      name: "Crystal White Pearl",
      hex: "#eceef1",
      metallic: true,
    },
    {
      id: "protonic-blue",
      name: "Protonic Blue Metallic",
      hex: "#1c4f8f",
      metallic: true,
    },
    {
      id: "sophisto-grey",
      name: "Sophisto Grey",
      hex: "#43474d",
      metallic: true,
    },
    {
      id: "protonic-red",
      name: "Protonic Red",
      hex: "#8e1b21",
      metallic: true,
    },
    {
      id: "donington-grey",
      name: "Donington Grey",
      hex: "#2f3338",
      metallic: true,
    },
    { id: "frozen-black", name: "Frozen Black", hex: "#16181b" },
  ],
  exteriorColorLabel: "Protonic Blue Metallic",

  interiorColors: [
    { id: "carpo-black", name: "Carpo Black", hex: "#1c1d20" },
    { id: "carum-spice", name: "Carum Spice Brown", hex: "#6b4a32" },
    { id: "amido-ivory", name: "Amido Ivory White", hex: "#e6e0d4" },
    { id: "halo-grey", name: "Halo Grey", hex: "#9a9ca1" },
  ],
  interiorColorLabel: "Carpo Black / Electric Blue",

  dimensions: [
    { label: "Length", value: "4,689 mm" },
    { label: "Width", value: "1,942 mm" },
    { label: "Height", value: "1,293 mm" },
    { label: "Wheelbase", value: "2,800 mm" },
    { label: "Curb Weight", value: "1,535 kg" },
    { label: "Trunk Space", value: "154 L" },
  ],

  performance: [
    { label: "Engine", value: "1.5L Turbo I3 + e-Motor" },
    { label: "Horsepower", value: "369 hp" },
    { label: "Torque", value: "570 Nm" },
    { label: "0 â€“ 100 km/h", value: "4.4 s" },
    { label: "Top Speed", value: "250 km/h" },
    { label: "Drivetrain", value: "AWD eDrive" },
  ],

  keyFeatures: [
    "BMW Laser Headlights",
    "eDrive Plug-in Hybrid",
    "Carbon Fiber Body Shell",
    "Driving Assistant",
    "Harman Kardon Surround",
  ],

  configure: [
    { label: "Wheels", value: '20" Radial Spoke' },
    { label: "Brakes", value: "Sport Brakes Â· Blue" },
    { label: "Packages", value: "Tech Plus Package" },
    { label: "Interior", value: "Carpo Amido Leather" },
  ],

  metrics: [
    { label: "Power", value: "369", unit: "hp", note: "@ 5,800 rpm" },
    { label: "Torque", value: "570", unit: "Nm", note: "@ 3,700 rpm" },
    { label: "0 â€“ 100 km/h", value: "4.4", unit: "s" },
    { label: "Top Speed", value: "250", unit: "km/h" },
    { label: "Fuel Economy", value: "2.1", unit: "L/100km" },
    { label: "COâ‚‚ Emissions", value: "49", unit: "g/km" },
  ],

  aero: {
    cd: 0.26,
    frontalAreaM2: 2.1,
    lengthM: 4.689,
    separationNote:
      "Airflow stays attached over the long teardrop roofline and separates cleanly at the sharp rear edge, keeping the wake compact.",
    views: [
      {
        id: "all",
        name: "All Flows",
        blurb:
          "Every system at once — external airflow, underbody, cooling and the rear wake combined in one view.",
      },
      {
        id: "external",
        name: "External Airflow",
        blurb:
          "How air sweeps over the hood, roof and flanks, where it stays attached, and where it separates.",
      },
      {
        id: "underbody",
        name: "Underbody",
        blurb:
          "Smooth, accelerated flow beneath the flat floor feeding the rear diffuser to reduce lift.",
      },
      {
        id: "cooling",
        name: "Cooling Airflow",
        blurb:
          "Air entering the grille through the radiators and battery coolers, then exhausting via outlets and wheel arches.",
      },
      {
        id: "wake",
        name: "Wake Turbulence",
        blurb:
          "The low-pressure recirculating region behind the car — the single largest contributor to drag.",
      },
    ],
    components: [
      {
        id: "front-splitter",
        name: "Front Splitter",
        views: ["external", "underbody"],
        purpose:
          "Splits oncoming air into the over-body and under-body streams and builds high pressure on its upper face.",
        design:
          "A forward-protruding lower lip creates a stagnation zone above and accelerates flow below, generating front downforce.",
        impact:
          "Adds front-axle downforce and reduces front lift, sharpening turn-in stability at speed.",
        x: 0.07,
        y: 0.72,
      },
      {
        id: "air-curtains",
        name: "Air Curtains",
        views: ["external", "cooling"],
        purpose:
          "Channel air from the front intakes through ducts that blow a high-speed 'curtain' over the front wheels.",
        design:
          "Narrow inlets feed tunnels exiting ahead of the tyre, shielding the turbulent wheel wake from the bodyside.",
        impact:
          "Cuts front-wheel turbulence and reduces drag by smoothing flow down the flanks.",
        x: 0.16,
        y: 0.6,
      },
      {
        id: "side-skirts",
        name: "Side Skirts",
        views: ["external", "underbody"],
        purpose:
          "Seal the gap between the floor and the road to stop high-pressure side air leaking under the car.",
        design:
          "Low-hanging sills along the wheelbase keep the underbody region at lower pressure.",
        impact:
          "Improves underbody efficiency and diffuser performance, lowering rear lift.",
        x: 0.5,
        y: 0.78,
      },
      {
        id: "rear-diffuser",
        name: "Rear Diffuser",
        views: ["underbody", "wake"],
        purpose:
          "Expands and decelerates underbody air, recovering pressure and pulling the car toward the road.",
        design:
          "Upswept channels at the rear floor accelerate flow underneath and fill the wake more gently.",
        impact:
          "Major rear downforce source and a key drag reducer by shrinking the low-pressure wake.",
        x: 0.86,
        y: 0.78,
      },
      {
        id: "active-grille",
        name: "Active Grille Shutters",
        views: ["cooling", "external"],
        purpose:
          "Open or close the main intake to balance cooling demand against aerodynamic drag.",
        design:
          "Motorized vanes shut at cruise to reduce cooling drag and open under high thermal load.",
        impact:
          "Closed shutters can lower Cd by ~0.01–0.02 and improve highway efficiency.",
        x: 0.1,
        y: 0.62,
      },
      {
        id: "cooling-vents",
        name: "Cooling Vents / Outlets",
        views: ["cooling"],
        purpose:
          "Exhaust hot air from the powertrain and brakes, completing the cooling path.",
        design:
          "Low-pressure exits over the hood and behind the wheels pull air through the radiators.",
        impact:
          "Maintains thermal limits with minimal drag penalty by routing spent air to low-pressure zones.",
        x: 0.34,
        y: 0.45,
      },
      {
        id: "rear-spoiler",
        name: "Rear Spoiler",
        views: ["external", "wake"],
        purpose:
          "Manages the trailing-edge flow to control the size of the wake and add rear downforce.",
        design:
          "A subtle lip raises pressure on the decklid and defines a clean separation line.",
        impact:
          "Trades a little drag for high-speed rear stability and reduced rear-axle lift.",
        x: 0.93,
        y: 0.46,
      },
    ],
    scenarios: [
      {
        id: "city",
        name: "City",
        speedKmh: 50,
        description:
          "Low-speed urban driving. Aerodynamic forces are small; rolling and accessory losses dominate.",
        flowSpeed: 0.6,
        turbulence: 0.25,
        metrics: {
          cd: 0.26,
          dragForceN: 65,
          downforceN: -10,
          frontLiftPct: 52,
          coolingFlow: 45,
          efficiency: 70,
          stability: 88,
        },
      },
      {
        id: "highway",
        name: "Highway",
        speedKmh: 120,
        description:
          "Steady cruising. Active grille shutters close to minimize drag and maximize efficiency.",
        flowSpeed: 1,
        turbulence: 0.45,
        metrics: {
          cd: 0.25,
          dragForceN: 360,
          downforceN: 30,
          frontLiftPct: 49,
          coolingFlow: 55,
          efficiency: 90,
          stability: 84,
        },
      },
      {
        id: "track",
        name: "Track",
        speedKmh: 250,
        description:
          "High-speed track driving. Drag rises with the square of speed; downforce and cooling demand peak.",
        flowSpeed: 1.8,
        turbulence: 0.75,
        metrics: {
          cd: 0.27,
          dragForceN: 1610,
          downforceN: 240,
          frontLiftPct: 47,
          coolingFlow: 95,
          efficiency: 82,
          stability: 76,
        },
      },
      {
        id: "crosswind",
        name: "Crosswind",
        speedKmh: 120,
        description:
          "Side gusts create a yaw angle, raising effective drag and loading the bodyside — stability is the priority.",
        flowSpeed: 1.1,
        turbulence: 0.6,
        yaw: 0.5,
        metrics: {
          cd: 0.3,
          dragForceN: 430,
          downforceN: 10,
          frontLiftPct: 55,
          coolingFlow: 50,
          efficiency: 74,
          stability: 62,
        },
      },
      {
        id: "wet",
        name: "Wet Weather",
        speedKmh: 110,
        description:
          "Rain adds spray and water management. Underbody and diffuser flow help disperse standing water.",
        flowSpeed: 0.95,
        turbulence: 0.55,
        wet: true,
        metrics: {
          cd: 0.27,
          dragForceN: 320,
          downforceN: 20,
          frontLiftPct: 50,
          coolingFlow: 60,
          efficiency: 80,
          stability: 78,
        },
      },
    ],
  },
};

export const CARS: Car[] = [BMW_I8];

export function getCar(id: string): Car {
  return CARS.find((c) => c.id === id) ?? BMW_I8;
}
