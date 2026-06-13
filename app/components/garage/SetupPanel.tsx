"use client";

import { useMemo } from "react";
import { useDashboard } from "@/lib/store";
import { TUNEABLE_PARTS, type F1Setup, type TuneablePart } from "@/lib/f1";

export default function SetupPanel() {
  const f1Setup = useDashboard((s) => s.f1Setup);
  const setF1Part = useDashboard((s) => s.setF1Part);
  const resetF1Setup = useDashboard((s) => s.resetF1Setup);

  // Group parts by system (Aerodynamics / Powertrain / Mechanical / Cooling).
  const groups = useMemo(() => {
    const map = new Map<string, TuneablePart[]>();
    for (const p of TUNEABLE_PARTS) {
      const list = map.get(p.group) ?? [];
      list.push(p);
      map.set(p.group, list);
    }
    return Array.from(map.entries());
  }, []);

  return (
    <aside className="flex w-[320px] shrink-0 flex-col overflow-y-auto border-r border-line bg-white">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">Car Setup</h2>
          <p className="text-[11px] text-faint">Tune the parts · data only</p>
        </div>
        <button
          onClick={resetF1Setup}
          className="rounded-full border border-line px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-surface"
        >
          Reset
        </button>
      </div>

      <div className="space-y-6 px-5 pb-8">
        {groups.map(([group, parts]) => (
          <section key={group}>
            <h3 className="tele-label mb-2.5">{group}</h3>
            <div className="space-y-3">
              {parts.map((part) => (
                <PartControl
                  key={part.id}
                  part={part}
                  setup={f1Setup}
                  onChange={setF1Part}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}

function PartControl({
  part,
  setup,
  onChange,
}: {
  part: TuneablePart;
  setup: F1Setup;
  onChange: (patch: Partial<F1Setup>) => void;
}) {
  const value = setup[part.id];

  return (
    <div className="rounded-xl border border-line p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[13px] font-medium">{part.label}</span>
        {part.kind === "range" && (
          <span className="tele-readout text-xs font-semibold text-accent">
            {value as number}
            <span className="text-[10px] text-faint">/{part.max}</span>
          </span>
        )}
      </div>

      {part.kind === "range" ? (
        <input
          type="range"
          min={part.min}
          max={part.max}
          step={part.step}
          value={value as number}
          onChange={(e) => onChange({ [part.id]: Number(e.target.value) } as Partial<F1Setup>)}
          className="mt-1 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-surface-2 accent-accent"
          aria-label={part.label}
        />
      ) : (
        <div className="mt-1 flex gap-1">
          {part.options.map((opt) => {
            const active = value === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onChange({ [part.id]: opt.value } as Partial<F1Setup>)}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-line text-muted-foreground hover:bg-surface"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      <p className="mt-1.5 text-[11px] leading-relaxed text-faint">{part.description}</p>
    </div>
  );
}
