import { useState } from 'react';
import { sbInsert } from '../lib/api';
import InvoiceUpload from './InvoiceUpload';

export default function TransferForm({ session, onCreated }) {
  const [fromUnit, setFromUnit] = useState('');
  const [toUnit, setToUnit] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [createdTransfer, setCreatedTransfer] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!fromUnit || !toUnit || !amount) return;
    setBusy(true);
    try {
      const rows = await sbInsert('transfers', [{ from_unit_id: fromUnit, to_unit_id: toUnit, amount: Number(amount), description }], { accessToken: session?.access_token });
      const created = rows?.[0] ?? null;
      setCreatedTransfer(created);
      if (onCreated) onCreated(created);
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleCreate} className="space-y-3 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input placeholder="From Unit ID" value={fromUnit} onChange={(e) => setFromUnit(e.target.value)} className="rounded-lg border px-3 py-2" />
          <input placeholder="To Unit ID" value={toUnit} onChange={(e) => setToUnit(e.target.value)} className="rounded-lg border px-3 py-2" />
          <input placeholder="Amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="rounded-lg border px-3 py-2" />
        </div>
        <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-lg border px-3 py-2" />
        <div className="flex gap-2">
          <button className="rounded-lg bg-emerald-700 px-4 py-2 text-white" disabled={busy}>{busy ? 'Creating…' : 'Create Transfer'}</button>
        </div>
      </form>

      {createdTransfer && (
        <div className="rounded-lg border p-3 bg-white">
          <div className="font-semibold mb-2">Transfer Created — ID: {createdTransfer.id}</div>
          <InvoiceUpload transferId={createdTransfer.id} session={session} onUploaded={(inv) => console.log('invoice saved', inv)} />
        </div>
      )}
    </div>
  );
}
