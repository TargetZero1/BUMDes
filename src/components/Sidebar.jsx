import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import EmblemBadge from './EmblemBadge';
import { ROLE_LABELS } from '../lib/constants';
import { getTheme, toggleTheme } from '../lib/theme';

export default function Sidebar({ navGroups, tab, onTabChange, profile, navOpen, onNavToggle, onLogout, onOpenSettings }) {
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    setTheme(getTheme());
  }, []);

  const handleThemeToggle = () => setTheme(toggleTheme());

  const renderItems = (items, onSelect, collapsedMode) =>
    items.map((item) => {
      const Icon = item.icon;
      const active = tab === item.key;
      return (
        <button
          key={item.key}
          onClick={() => onSelect(item.key)}
          title={collapsedMode ? item.label : undefined}
          className={`relative flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${collapsedMode ? 'justify-center' : ''} ${
            active ? 'bg-white/8 text-gold-400' : 'text-white/70 hover:bg-white/5 hover:text-white'
          }`}
        >
          {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-gold-500" />}
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsedMode && <span className="truncate">{item.label}</span>}
        </button>
      );
    });

  const sidebarBody = (onSelect, collapsedMode = false) => (
    <div className="relative flex h-full flex-col">
      <div className={`flex items-center gap-3 px-4 py-5 ${collapsedMode ? 'justify-center px-2' : ''}`}>
        <EmblemBadge className={collapsedMode ? 'h-10 w-10' : 'h-16 w-16'} />
        {!collapsedMode && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white" style={{ fontFamily: "'Lora', serif" }}>
              BUMDes Mulyoarjo
            </p>
            <p className="text-[0.65rem] uppercase tracking-wide text-gold-400/80">Buku Kas Digital</p>
          </div>
        )}
      </div>

      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-3 py-2">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsedMode && <p className="mb-1.5 px-3 text-[0.65rem] font-semibold uppercase tracking-widest text-white/35">{group.label}</p>}
            <div className="space-y-1">{renderItems(group.items, onSelect, collapsedMode)}</div>
          </div>
        ))}
      </nav>

      {!collapsedMode && <EmblemBadge className="pointer-events-none absolute bottom-40 left-1/2 h-32 w-32 -translate-x-1/2 opacity-[0.07]" />}

      <div className={`relative border-t border-white/10 px-4 py-4 ${collapsedMode ? 'px-2' : ''}`}>
        <button
          onClick={onOpenSettings}
          title="Pengaturan Akun"
          className={`mb-3 flex w-full items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-white/5 ${collapsedMode ? 'justify-center' : ''}`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-500 text-sm font-bold text-ink">
            {(profile?.full_name || 'U').slice(0, 1).toUpperCase()}
          </div>
          {!collapsedMode && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{profile?.full_name || 'User'}</p>
              <p className="truncate text-[0.65rem] uppercase tracking-wide text-gold-400/80">{ROLE_LABELS[profile?.role] || profile?.role}</p>
            </div>
          )}
        </button>

        <div className={`mb-2 flex gap-2 ${collapsedMode ? 'flex-col' : ''}`}>
          <button
            onClick={handleThemeToggle}
            title={theme === 'dark' ? 'Mode terang' : 'Mode gelap'}
            className={`flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10 ${collapsedMode ? 'w-full' : ''}`}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!collapsedMode && (theme === 'dark' ? 'Mode Terang' : 'Mode Gelap')}
          </button>
        </div>

        <button
          onClick={onLogout}
          title="Keluar"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10"
        >
          <LogOut className="h-4 w-4" /> {!collapsedMode && 'Keluar'}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`bg-seal-pattern sticky top-0 hidden h-screen shrink-0 self-start bg-linear-to-b from-ink to-ink-2 shadow-[inset_-1px_0_0_rgba(255,255,255,0.06)] transition-[width] duration-200 lg:block ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarBody(onTabChange, collapsed)}
        <button
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? 'Perbesar sidebar' : 'Perkecil sidebar'}
          className="absolute -right-3 top-20 hidden h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-ink-2 text-white shadow-md transition-colors hover:bg-ink lg:flex"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Mobile top bar trigger */}
      {!navOpen && (
        <button
          type="button"
          onClick={onNavToggle}
          className="fixed left-3 top-3 z-50 inline-flex items-center justify-center rounded-lg border border-white/15 bg-ink p-2 text-white shadow-lg lg:hidden"
          aria-label="Buka menu navigasi"
          aria-expanded={navOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onNavToggle} />
          <aside className="bg-seal-pattern absolute left-0 top-0 h-full w-72 bg-linear-to-b from-ink to-ink-2 shadow-2xl">
            <button
              type="button"
              onClick={onNavToggle}
              aria-label="Tutup menu navigasi"
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white shadow-md transition-colors hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebarBody((key) => {
              onTabChange(key);
            })}
          </aside>
        </div>
      )}
    </>
  );
}
