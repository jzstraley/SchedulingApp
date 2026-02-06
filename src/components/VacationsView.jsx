import React, { useState } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';

export default function VacationsView({
  fellows = [],
  schedule = {},
  vacations = [],
  setSchedule,
  setVacations,
  isAdmin = true,
}) {
  const [newReq, setNewReq] = useState({ fellow: fellows[0] || '', startBlock: 1, endBlock: 1, reason: 'Vacation', status: 'pending' });

  const approveRequest = (idx) => {
    if (!isAdmin) return;

    const pendingVacations = vacations.filter(v => !v.status || v.status === 'pending');
    const req = pendingVacations[idx];
    if (!req) return;

    // Update schedule: mark blocks as 'Vacation'
    if (setSchedule) {
      setSchedule((prev) => {
        const next = { ...prev };
        next[req.fellow] = [...(next[req.fellow] || [])];
        for (let b = req.startBlock; b <= req.endBlock; b++) {
          next[req.fellow][b - 1] = 'Vacation';
        }
        return next;
      });
    }

    // Mark as approved in vacations array
    const updatedVacations = vacations.map(v =>
      v === req ? { ...v, status: 'approved' } : v
    );
    setVacations(updatedVacations);
  };

  const denyRequest = (idx) => {
    if (!isAdmin) return;

    const pendingVacations = vacations.filter(v => !v.status || v.status === 'pending');
    const req = pendingVacations[idx];
    if (!req) return;

    // Remove the denied request from vacations array
    const next = vacations.filter(v => v !== req);
    setVacations(next);
  };

  const submitNewRequest = () => {
    if (!newReq.fellow) return;
    setVacations([...(vacations || []), { ...newReq }]);
    setNewReq({ fellow: fellows[0] || '', startBlock: 1, endBlock: 1, reason: 'Vacation', status: 'pending' });
  };

  const pendingVacations = vacations.filter(v => !v.status || v.status === 'pending');
  const approvedVacations = vacations.filter(v => v.status === 'approved');

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold">Vacation Requests</h3>
        <div className="text-sm text-gray-600">Admin controls enabled</div>
      </div>

      {/* Pending Requests */}
      <div className="bg-white dark:bg-gray-700 rounded border dark:border-gray-600 p-3">
        <div className="mb-2 font-semibold dark:text-gray-100">Pending Requests</div>
        {pendingVacations.length === 0 && <div className="text-xs text-gray-500 dark:text-gray-400">No pending requests</div>}
        <div className="space-y-2">
          {pendingVacations.map((v, idx) => (
            <div key={idx} className="flex items-center justify-between border dark:border-gray-600 dark:bg-gray-800 p-2 rounded">
              <div className="text-sm">
                <div className="font-semibold dark:text-gray-100">{v.fellow}</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Blocks {v.startBlock}–{v.endBlock} — {v.reason}</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => approveRequest(idx)} className="px-3 py-1 bg-green-600 text-white rounded text-xs flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Approve
                </button>
                <button onClick={() => denyRequest(idx)} className="px-3 py-1 bg-red-600 text-white rounded text-xs flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Deny
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Approved Vacations */}
      <div className="bg-white dark:bg-gray-700 rounded border dark:border-gray-600 p-3">
        <div className="mb-2 font-semibold dark:text-gray-100">Approved Vacations</div>
        {approvedVacations.length === 0 && <div className="text-xs text-gray-500 dark:text-gray-400">No approved vacations</div>}
        <div className="space-y-2">
          {approvedVacations.map((v, idx) => (
            <div key={idx} className="flex items-center justify-between border border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900 p-2 rounded">
              <div className="text-sm">
                <div className="font-semibold dark:text-green-100">{v.fellow}</div>
                <div className="text-xs text-gray-600 dark:text-green-200">Blocks {v.startBlock}–{v.endBlock} — {v.reason}</div>
              </div>
              <div className="px-3 py-1 bg-green-600 text-white rounded text-xs">
                ✓ Approved
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-700 rounded border dark:border-gray-600 p-3">
        <div className="mb-2 font-semibold dark:text-gray-100">Create New Request</div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
          <select className="p-2 border dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100" value={newReq.fellow} onChange={(e) => setNewReq({ ...newReq, fellow: e.target.value })}>
            {fellows.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <input type="number" className="p-2 border dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100" min={1} max={26} value={newReq.startBlock} onChange={(e) => setNewReq({ ...newReq, startBlock: Number(e.target.value) })} />
          <input type="number" className="p-2 border dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100" min={1} max={26} value={newReq.endBlock} onChange={(e) => setNewReq({ ...newReq, endBlock: Number(e.target.value) })} />
          <input className="p-2 border dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100" value={newReq.reason} onChange={(e) => setNewReq({ ...newReq, reason: e.target.value })} />
        </div>
        <div className="mt-2">
          <button onClick={submitNewRequest} className="px-3 py-1 bg-blue-600 text-white rounded text-xs">Add Request</button>
        </div>
      </div>
    </div>
  );
}
