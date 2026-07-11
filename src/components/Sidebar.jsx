import { useState } from 'react';
import { ChevronLeft, ChevronRight, LogOut, Menu, X } from 'lucide-react';
import EmblemBadge from './EmblemBadge';
import { ROLE_LABELS } from '../lib/constants';

export default function Sidebar({ navGroups, tab, onTabChange, profile, navOpen, onNavToggle, onLogout, onOpenSettings }) {
  const [collapsed, setCollapsed] = useState(false);

  const renderItems = (items, onSelect, collapsedMode) =>
    items.map((item) => {
      const Icon = item.icon;
      const active = tab === item.key;
      return (
        <button
          key={item.key}
          onClick={() => onSelect(item.key)}
          title={collapsedMode ? item.label : undefined}
          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${collapsedMode ? 'justify-center' : ''} ${
            active ? 'bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40' : 'text-emerald-100/80 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsedMode && <span className="truncate">{item.label}</span>}
        </button>
      );
    });

  const sidebarBody = (onSelect, collapsedMode = false) => (
    <div className="flex h-full flex-col">
      <div className={`flex items-center gap-3 px-4 py-5 ${collapsedMode ? 'justify-center px-2' : ''}`}>
        <EmblemBadge className={collapsedMode ? 'h-10 w-10' : 'h-16 w-16'} />
        {!collapsedMode && (
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white" style={{ fontFamily: "'Lora', serif" }}>
              BUMDes Mulyoarjo
            </p>
            <p className="text-[0.65rem] uppercase tracking-wide text-emerald-300">Buku Kas Digital</p>
          </div>
        )}
      </div>

      <nav className="space-y-5 overflow-y-auto overflow-x-hidden px-3 py-2">
        {navGroups.map((group) => (
          <div key={group.label}>
            {!collapsedMode && <p className="mb-1.5 px-3 text-[0.65rem] font-semibold uppercase tracking-widest text-emerald-400/70">{group.label}</p>}
            <div className="space-y-1">{renderItems(group.items, onSelect, collapsedMode)}</div>
          </div>
        ))}
      </nav>

      <div className="flex flex-1 items-center justify-center">
        {!collapsedMode && <EmblemBadge className="h-32 w-32 opacity-[0.06]" />}
      </div>

      <div className={`border-t border-white/10 px-4 py-4 ${collapsedMode ? 'px-2' : ''}`}>
        <button
          onClick={onOpenSettings}
          title="Pengaturan Akun"
          className={`mb-3 flex w-full items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-white/5 ${collapsedMode ? 'justify-center' : ''}`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-emerald-950">
            {(profile?.full_name || 'U').slice(0, 1).toUpperCase()}
          </div>
          {!collapsedMode && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{profile?.full_name || 'User'}</p>
              <p className="truncate text-[0.65rem] uppercase tracking-wide text-emerald-300">{ROLE_LABELS[profile?.role] || profile?.role}</p>
            </div>
          )}
        </button>
        <button
          onClick={onLogout}
          title="Keluar"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-700/60 bg-emerald-900/40 px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-900/70"
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
        className={`bg-linear-to-b sticky top-0 hidden h-screen shrink-0 from-emerald-950 to-emerald-900 transition-[width] duration-200 lg:relative lg:block ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarBody(onTabChange, collapsed)}
        <button
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? 'Perbesar sidebar' : 'Perkecil sidebar'}
          className="absolute -right-3 top-20 hidden h-7 w-7 items-center justify-center rounded-full border border-emerald-700/60 bg-emerald-800 text-emerald-100 shadow-md transition-colors hover:bg-emerald-700 lg:flex"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </aside>

      {/* Mobile top bar trigger */}
      {!navOpen && (
        <button
          type="button"
          onClick={onNavToggle}
          className="fixed left-3 top-3 z-50 inline-flex items-center justify-center rounded-lg border border-emerald-700/60 bg-emerald-950 p-2 text-emerald-100 shadow-lg lg:hidden"
          aria-label="Buka menu navigasi"
          aria-expanded={navOpen}
        >
          <Menu className="h-5 w-5" />
        </button>
      )}

      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onNavToggle} />
          <aside className="bg-linear-to-b absolute left-0 top-0 h-full w-72 from-emerald-950 to-emerald-900 shadow-2xl">
            <button
              type="button"
              onClick={onNavToggle}
              aria-label="Tutup menu navigasi"
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-emerald-800 text-emerald-50 shadow-md ring-1 ring-white/10 transition-colors hover:from-emerald-500 hover:to-emerald-700"
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
