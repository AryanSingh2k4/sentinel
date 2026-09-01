'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop, Check } from 'lucide-react';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!mounted) {
    return (
      <div className="h-8 w-8 rounded-full bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222]" />
    );
  }

  const currentIcon = resolvedTheme === 'dark' ? (
    <Moon className="h-3.5 w-3.5 text-[#171717] dark:text-[#ededed]" />
  ) : (
    <Sun className="h-3.5 w-3.5 text-[#171717] dark:text-[#ededed]" />
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="h-8 w-8 rounded-full bg-[#ffffff] dark:bg-[#0a0a0a] hover:bg-[#fafafa] dark:hover:bg-[#171717] border border-[#ebebeb] dark:border-[#222222] flex items-center justify-center transition-colors focus:outline-none cursor-pointer"
        aria-label="Toggle theme"
        title={`Current theme: ${theme} (Click to change)`}
      >
        {currentIcon}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-36 bg-[#ffffff] dark:bg-[#0a0a0a] border border-[#ebebeb] dark:border-[#222222] rounded-[12px] shadow-lg py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
          <button
            type="button"
            onClick={() => {
              setTheme('light');
              setOpen(false);
            }}
            className={`w-full text-left px-3 py-1.5 text-[13px] flex items-center justify-between transition-colors ${
              theme === 'light'
                ? 'text-[#171717] dark:text-[#ededed] font-medium bg-[#fafafa] dark:bg-[#171717]'
                : 'text-[#8f8f8f] hover:text-[#171717] dark:hover:text-[#ededed] hover:bg-[#fafafa] dark:hover:bg-[#171717]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sun className="h-3.5 w-3.5" />
              <span>Light</span>
            </div>
            {theme === 'light' && <Check className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('dark');
              setOpen(false);
            }}
            className={`w-full text-left px-3 py-1.5 text-[13px] flex items-center justify-between transition-colors ${
              theme === 'dark'
                ? 'text-[#171717] dark:text-[#ededed] font-medium bg-[#fafafa] dark:bg-[#171717]'
                : 'text-[#8f8f8f] hover:text-[#171717] dark:hover:text-[#ededed] hover:bg-[#fafafa] dark:hover:bg-[#171717]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Moon className="h-3.5 w-3.5" />
              <span>Dark</span>
            </div>
            {theme === 'dark' && <Check className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => {
              setTheme('system');
              setOpen(false);
            }}
            className={`w-full text-left px-3 py-1.5 text-[13px] flex items-center justify-between transition-colors ${
              theme === 'system'
                ? 'text-[#171717] dark:text-[#ededed] font-medium bg-[#fafafa] dark:bg-[#171717]'
                : 'text-[#8f8f8f] hover:text-[#171717] dark:hover:text-[#ededed] hover:bg-[#fafafa] dark:hover:bg-[#171717]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Laptop className="h-3.5 w-3.5" />
              <span>System</span>
            </div>
            {theme === 'system' && <Check className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}

export function ThemeSegmentedControl() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-7 w-24 rounded-full bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222]" />;
  }

  return (
    <div className="flex items-center p-0.5 bg-[#fafafa] dark:bg-[#111111] border border-[#ebebeb] dark:border-[#222222] rounded-full">
      <button
        type="button"
        onClick={() => setTheme('light')}
        title="Light Mode"
        className={`p-1 rounded-full transition-all cursor-pointer ${
          theme === 'light'
            ? 'bg-[#ffffff] text-[#171717] shadow-xs'
            : 'text-[#8f8f8f] hover:text-[#171717] dark:hover:text-[#ededed]'
        }`}
      >
        <Sun className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        title="Dark Mode"
        className={`p-1 rounded-full transition-all cursor-pointer ${
          theme === 'dark'
            ? 'bg-[#171717] text-[#ededed] shadow-xs'
            : 'text-[#8f8f8f] hover:text-[#171717] dark:hover:text-[#ededed]'
        }`}
      >
        <Moon className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        onClick={() => setTheme('system')}
        title="System Preference"
        className={`p-1 rounded-full transition-all cursor-pointer ${
          theme === 'system'
            ? 'bg-[#ffffff] dark:bg-[#171717] text-[#171717] dark:text-[#ededed] shadow-xs'
            : 'text-[#8f8f8f] hover:text-[#171717] dark:hover:text-[#ededed]'
        }`}
      >
        <Laptop className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
