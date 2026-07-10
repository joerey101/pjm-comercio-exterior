'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateSimulationStatus, updateNcmStatus, updateDocumentStatus } from '@/app/actions/admin';
import { SIMULATION_STATUS_LABELS, type SimulationStatus, SIMULATION_DOCUMENT_STATUS_LABELS, type SimulationDocumentStatus } from '@/types/simulation';
import { NCM_STATUS_LABELS, type NCMStatus } from '@/types/ncm';
import { selectClass } from '@/components/ui/Field';

export function StatusControls({
  simulationId,
  status,
  ncmStatus,
  documentStatus,
}: {
  simulationId: string;
  status: SimulationStatus;
  ncmStatus: NCMStatus;
  documentStatus: SimulationDocumentStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handle(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
          Estado de la simulación
        </label>
        <select
          className={selectClass}
          value={status}
          disabled={isPending}
          onChange={(e) => handle(() => updateSimulationStatus(simulationId, e.target.value as SimulationStatus))}
        >
          {Object.entries(SIMULATION_STATUS_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
          Estado NCM
        </label>
        <select
          className={selectClass}
          value={ncmStatus}
          disabled={isPending}
          onChange={(e) => handle(() => updateNcmStatus(simulationId, e.target.value as NCMStatus))}
        >
          {Object.entries(NCM_STATUS_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
          Estado documental
        </label>
        <select
          className={selectClass}
          value={documentStatus}
          disabled={isPending}
          onChange={(e) => handle(() => updateDocumentStatus(simulationId, e.target.value as SimulationDocumentStatus))}
        >
          {Object.entries(SIMULATION_DOCUMENT_STATUS_LABELS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
