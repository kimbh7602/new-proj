"use client";

import { cn } from "@/lib/utils";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  boards: { id: number; name: string; project_key: string }[];
}

export function Sidebar({ activeView, onViewChange, boards }: SidebarProps) {
  return (
    <aside className="w-[220px] bg-zinc-900 border-r border-zinc-800 flex flex-col h-full">
      <h1 className="text-[15px] font-semibold text-white px-4 py-5">
        Agent Control Center
      </h1>

      <div className="px-4 pb-2">
        <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">
          Views
        </span>
      </div>
      <NavItem
        label="All Tasks"
        active={activeView === "tasks"}
        onClick={() => onViewChange("tasks")}
      />
      <NavItem
        label="Dashboard"
        active={activeView === "dashboard"}
        onClick={() => onViewChange("dashboard")}
      />
      <NavItem
        label="Results"
        active={activeView === "results"}
        onClick={() => onViewChange("results")}
      />

      <div className="px-4 pt-4 pb-2">
        <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">
          Boards
        </span>
      </div>
      {boards.map((board) => (
        <NavItem
          key={board.id}
          label={board.name}
          active={false}
          onClick={() => {}}
        />
      ))}
      <button
        className="px-4 py-2 text-[13px] text-blue-500 text-left hover:bg-zinc-800/50"
        onClick={() => onViewChange("add-board")}
      >
        + Add Board
      </button>

      <div className="mt-auto px-4 pt-4 pb-2">
        <span className="text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">
          Settings
        </span>
      </div>
      <NavItem
        label="Connections"
        active={activeView === "settings"}
        onClick={() => onViewChange("settings")}
      />
    </aside>
  );
}

function NavItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "px-4 py-2 text-[13px] text-left w-full",
        active
          ? "text-white bg-zinc-800 border-l-2 border-blue-500"
          : "text-zinc-400 hover:bg-zinc-800/50 border-l-2 border-transparent"
      )}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
