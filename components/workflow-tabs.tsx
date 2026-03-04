"use client";

import { cn } from "@/lib/utils";

export type WorkflowTab = "fashion" | "vellum" | "aiTalk" | "avatar" | "avatarT" | "poses";

const externalTabs: Record<string, string> = {
  avatar: "http://192.168.1.10:3000/",
  avatarT: "http://192.168.193.229:3000/",
};

interface WorkflowTabsProps {
  activeTab: WorkflowTab;
  onTabChange: (tab: WorkflowTab) => void;
}

export function WorkflowTabs({ activeTab, onTabChange }: WorkflowTabsProps) {
  const tabs: Array<{ id: WorkflowTab; label: string }> = [
    { id: "fashion", label: "AI Fashion Commerce" },
//  { id: "vellum", label: "Vellum 2.0" },
    { id: "aiTalk", label: "AI Talk" },
    { id: "avatar", label: "Avatar Generator" },
    { id: "avatarT", label: "Avatar Generator T" },
//    { id: "poses", label: "Poses" },
  ];

  const handleTabClick = (tabId: WorkflowTab) => {
    if (externalTabs[tabId]) {
      window.open(externalTabs[tabId], "_blank");
    } else {
      onTabChange(tabId);
    }
  };

  return (
    <div className="flex gap-1 p-1 rounded-lg bg-[rgb(var(--card))] border border-[rgb(var(--border))]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => handleTabClick(tab.id)}
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
