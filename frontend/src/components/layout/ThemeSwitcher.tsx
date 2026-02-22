import { useEffect } from 'react';
import type { ComponentType } from 'react';
import { BookOpen, Scroll, Minus } from 'lucide-react';
import { useSeatStore, THEMES, type Theme } from '../../store/seatStore';

// Map each theme to a display label and Lucide icon
const THEME_CONFIG: Record<Theme, { label: string; Icon: ComponentType<{ className?: string }> }> = {
  academic: { label: 'Academic', Icon: BookOpen },
  paper:    { label: 'Paper',    Icon: Scroll   },
  japanese: { label: 'Japanese', Icon: Minus    },
};

export function ThemeSwitcher() {
  const currentTheme = useSeatStore((s) => s.currentTheme);
  const setTheme     = useSeatStore((s) => s.setTheme);

  // Sync Zustand state → DOM attribute so CSS variable blocks activate.
  // Runs on mount (sets the initial attribute) and on every theme change.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
  }, [currentTheme]);

  return (
    <div
      className="flex rounded-lg bg-white/20 p-1 gap-1 ml-auto"
      role="group"
      aria-label="Theme switcher"
    >
      {THEMES.map((themeName) => {
        const { label, Icon } = THEME_CONFIG[themeName];
        const isActive = themeName === currentTheme;

        return (
          <button
            key={themeName}
            type="button"
            onClick={() => setTheme(themeName)}
            aria-pressed={isActive}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-medium transition-all ${
              isActive
                ? 'bg-white text-header shadow-sm'
                : 'text-white/80 hover:text-white hover:bg-white/30'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
