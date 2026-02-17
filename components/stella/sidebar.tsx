"use client";

import { Sparkles, PenTool, Clock, Bell, Crosshair, LogOut } from "lucide-react";

interface SidebarProps {
  activeItem?: string;
  onItemClick?: (item: string) => void;
  onLogout?: () => void;
}

const topItems = [
  { id: "generate", icon: Sparkles, label: "Generar" },
  { id: "edit", icon: PenTool, label: "Editar" },
  { id: "history", icon: Clock, label: "Historial" },
];

const bottomItems = [
  { id: "notifications", icon: Bell, label: "Notificaciones" },
  { id: "settings", icon: Crosshair, label: "Ajustes" },
];

export default function StellaSidebar({
  activeItem = "generate",
  onItemClick,
  onLogout,
}: SidebarProps) {
  return (
    <aside className="w-16 bg-white border-r border-gray-100 flex flex-col items-center py-6 shrink-0">
      {/* Logo */}
      <div className="mb-8">
        <span className="text-[10px] font-semibold tracking-widest text-gray-900">
          S
        </span>
      </div>

      {/* Top navigation */}
      <nav className="flex flex-col items-center gap-1 flex-1">
        {topItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onItemClick?.(item.id)}
              title={item.label}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </button>
          );
        })}
      </nav>

      {/* Bottom navigation */}
      <div className="flex flex-col items-center gap-1 mt-auto">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onItemClick?.(item.id)}
              title={item.label}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
              }`}
            >
              <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
            </button>
          );
        })}

        {/* Logout */}
        <button
          onClick={onLogout}
          title="Cerrar sesión"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all duration-200 mt-2"
        >
          <LogOut className="w-[18px] h-[18px]" strokeWidth={1.5} />
        </button>

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 mt-3 flex items-center justify-center">
          <span className="text-[10px] font-medium text-gray-600">U</span>
        </div>
      </div>
    </aside>
  );
}
