"use client";

import { useState } from "react";
import { Home, Car, LayoutGrid, FileText, Clock, Settings } from "lucide-react";

const NAV = [
  { id: "home", icon: Home },
  { id: "car", icon: Car },
  { id: "grid", icon: LayoutGrid },
  { id: "docs", icon: FileText },
  { id: "history", icon: Clock },
];

export default function IconRail() {
  const [active, setActive] = useState("car");

  return (
    <nav className="flex w-16 flex-col items-center justify-between border-r border-line bg-white py-5">
      <div className="flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-foreground text-background">
          <span className="text-sm font-bold">t</span>
        </div>

        {/* Nav icons */}
        <div className="flex flex-col items-center gap-1">
          {NAV.map(({ id, icon: Icon }) => {
            const isActive = active === id;
            return (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                  isActive
                    ? "bg-accent-soft text-accent"
                    : "text-faint hover:bg-surface-2 hover:text-foreground"
                }`}
              >
                <Icon size={20} strokeWidth={1.75} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings */}
      <button className="flex h-10 w-10 items-center justify-center rounded-xl text-faint transition-colors hover:bg-surface-2 hover:text-foreground">
        <Settings size={20} strokeWidth={1.75} />
      </button>
    </nav>
  );
}
