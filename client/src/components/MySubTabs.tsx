import { type ReactNode, useMemo, useEffect } from "react";
import { tabAlegreClasses, tabMinimizadoClasses, type TabColor } from "@/components/MyTab";
import { useStyleMode } from "@/contexts/StyleModeContext";
import { hasTabAccess, getStoredPermissions } from "@/lib/auth";

const RAINBOW_COLORS: TabColor[] = [
  "red", "orange", "yellow", "green", "teal", "cyan",
  "blue", "indigo", "violet", "purple", "pink", "rose",
];

export interface SubTabDef {
  id: string;
  label: string;
  icon?: ReactNode;
  permissionId?: string;
}

interface MySubTabsProps {
  tabs: SubTabDef[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: ReactNode;
  testIdPrefix?: string;
}

export function getSubTabColor(index: number): TabColor {
  return RAINBOW_COLORS[index % RAINBOW_COLORS.length];
}

export default function MySubTabs({ tabs, activeTab, onTabChange, children, testIdPrefix = "subtab" }: MySubTabsProps) {
  const { isAlegre } = useStyleMode();
  const tabColorClasses = isAlegre ? tabAlegreClasses : tabMinimizadoClasses;

  const permissionsKey = JSON.stringify(getStoredPermissions());
  const visibleTabs = useMemo(() => {
    return tabs.filter(tab => hasTabAccess(tab.permissionId || tab.id));
  }, [tabs, permissionsKey]);

  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.some(t => t.id === activeTab)) {
      onTabChange(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab, onTabChange]);

  if (visibleTabs.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
      <div className="flex items-center gap-1 mb-2">
        {visibleTabs.map((tab, index) => {
          const isActive = activeTab === tab.id;
          const color = getSubTabColor(index);
          const cls = tabColorClasses[color];
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md border-2 transition-all animate-flash cursor-pointer select-none ${
                isActive
                  ? `${cls.activeBg} ${cls.border} ${cls.text} ring-2 ring-white scale-105 ${cls.shadow}`
                  : `${cls.bg} ${cls.border} ${cls.text}`
              }`}
              data-testid={`${testIdPrefix}-${tab.id}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        {children}
      </div>
    </div>
  );
}
