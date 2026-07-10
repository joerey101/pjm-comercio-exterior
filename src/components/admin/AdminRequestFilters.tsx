'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { PJM_REQUEST_STATUS_LABELS, REQUEST_PRIORITY_LABELS } from '@/types/documents';
import { selectClass } from '@/components/ui/Field';

export function AdminRequestFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/admin?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3 mb-4">
      <select className={selectClass + ' w-auto'} value={searchParams.get('status') ?? ''} onChange={(e) => setParam('status', e.target.value)}>
        <option value="">Todos los estados</option>
        {Object.entries(PJM_REQUEST_STATUS_LABELS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
      <select className={selectClass + ' w-auto'} value={searchParams.get('priority') ?? ''} onChange={(e) => setParam('priority', e.target.value)}>
        <option value="">Toda prioridad</option>
        {Object.entries(REQUEST_PRIORITY_LABELS).map(([k, label]) => (
          <option key={k} value={k}>
            {label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1.5 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={searchParams.get('ncmPending') === '1'}
          onChange={(e) => setParam('ncmPending', e.target.checked ? '1' : '')}
        />
        NCM pendiente
      </label>
    </div>
  );
}
