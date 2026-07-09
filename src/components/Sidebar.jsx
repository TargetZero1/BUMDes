import { LogOut, Menu, X } from 'lucide-react';
import EmblemBadge from './EmblemBadge';
import { ROLE_LABELS } from '../lib/constants';

export default function Sidebar({ navGroups, tab, onTabChange, profile, navOpen, onNavToggle, onLogout, onOpenSettings }) {
  const renderItems = (items, onSelect) =>
    items.map((item) => {
      const Icon = item.icon;
      const active = tab === item.key;
      return (
        <button
          key={item.key}
          onClick={() => onSelect(item.key)}
          className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors ${
            active ? 'bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/40' : 'text-emerald-100/80 hover:bg-white/5 hover:text-white'
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.label}</span>
        </button>
      );
    });

  const sidebarBody = (onSelect) => (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 px-4 py-5">
        <div className="scale-75">
          <EmblemBadge />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white" style={{ fontFamily: "'Lora', serif" }}>
            BUMDes Mulyoarjo
          </p>
          <p className="text-[0.65rem] uppercase tracking-wide text-emerald-300">Buku Kas Digital</p>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 px-3 text-[0.65rem] font-semibold uppercase tracking-widest text-emerald-400/70">{group.label}</p>
            <div className="space-y-1">{renderItems(group.items, onSelect)}</div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-4 py-4">
        <button
          onClick={onOpenSettings}
          title="Pengaturan Akun"
          className="mb-3 flex w-full items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition-colors hover:bg-white/5"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500 text-sm font-bold text-emerald-950">
            {(profile?.full_name || 'U').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{profile?.full_name || 'User'}</p>
            <p className="truncate text-[0.65rem] uppercase tracking-wide text-emerald-300">{ROLE_LABELS[profile?.role] || profile?.role}</p>
          </div>
        </button>
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-700/60 bg-emerald-900/40 px-3 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-900/70"
        >
          <LogOut className="h-4 w-4" /> Keluar
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="bg-linear-to-b sticky top-0 hidden h-screen w-64 shrink-0 from-emerald-950 to-emerald-900 lg:block">
        {sidebarBody(onTabChange)}
      </aside>

      {/* Mobile top bar trigger + drawer */}
      <button
        type="button"
        onClick={onNavToggle}
        className="fixed left-3 top-3 z-50 inline-flex items-center justify-center rounded-lg border border-emerald-700/60 bg-emerald-950 p-2 text-emerald-100 shadow-lg lg:hidden"
        aria-label={navOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
        aria-expanded={navOpen}
      >
        {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {navOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onNavToggle} />
          <aside className="bg-linear-to-b absolute left-0 top-0 h-full w-72 from-emerald-950 to-emerald-900 shadow-2xl">
            {sidebarBody((key) => {
              onTabChange(key);
            })}
          </aside>
        </div>
      )}
    </>
  );
}
