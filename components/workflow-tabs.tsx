"use client";

import { cn } from "@/lib/utils";

export type WorkflowTab = "fashion" | "vellum" | "ai-talk";

interface WorkflowTabsProps {
  activeTab: WorkflowTab;
  onTabChange: (tab: WorkflowTab) => void;
}

export function WorkflowTabs({ activeTab, onTabChange }: WorkflowTabsProps) {
  const tabs: Array<{ id: WorkflowTab; label: string }> = [
    { id: "fashion", label: "AI Fashion Commerce" },
    { id: "vellum", label: "Vellum 2.0" },
    { id: "ai-talk", label: "AI Talk" },
  ];

  return (
    <div className="flex gap-1 p-1 rounded-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-all duration-200",
            "focus:outline-none focus:ring-2 focus:ring-brand-pink/50",
            activeTab === tab.id
              ? "bg-brand-pink text-gray-900 shadow-sm"
              : "text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))] hover:bg-[rgb(var(--background))]"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
