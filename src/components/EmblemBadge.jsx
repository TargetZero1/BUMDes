import logo from '../assets/logo.png';

export default function EmblemBadge() {
  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-amber-400 bg-emerald-950/40 p-1">
      <img src={logo} alt="Logo BUMDes Mulyo Sejahtera Abadi" className="h-full w-full rounded-full object-contain" />
    </div>
  );
}
