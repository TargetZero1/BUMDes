import { Building2 } from 'lucide-react';

export default function EmblemBadge() {
  return (
    <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-amber-400 bg-emerald-950/40">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500">
        <Building2 className="h-5 w-5 text-emerald-950" strokeWidth={2.5} />
      </div>
    </div>
  );
}
