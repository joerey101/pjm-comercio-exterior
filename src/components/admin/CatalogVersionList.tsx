'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setCatalogVersionStatus } from '@/app/actions/ncm';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import type { ImportJobType, CatalogVersionRow } from '@/types/database';

const STATUS_TONE = {
  draft: 'slate',
  active: 'emerald',
  inactive: 'amber',
  archived: 'slate',
} as const;

export function CatalogVersionList({ jobType, versions }: { jobType: ImportJobType; versions: CatalogVersionRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function setStatus(versionId: string, status: 'active' | 'inactive' | 'archived') {
    startTransition(async () => {
      await setCatalogVersionStatus(jobType, versionId, status);
      router.refresh();
    });
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
          <tr>
            <th className="p-3">Versión</th>
            <th className="p-3">Fuente</th>
            <th className="p-3 text-right">Filas</th>
            <th className="p-3 text-right">Errores</th>
            <th className="p-3">Estado</th>
            <th className="p-3">Importado</th>
            <th className="p-3">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {versions.map((v) => (
            <tr key={v.id}>
              <td className="p-3 font-semibold text-slate-800">{v.name}</td>
              <td className="p-3 text-slate-500">{v.source}</td>
              <td className="p-3 text-right">{v.row_count}</td>
              <td className="p-3 text-right">{v.error_count}</td>
              <td className="p-3">
                <Badge tone={STATUS_TONE[v.status]}>{v.status}</Badge>
              </td>
              <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(v.imported_at).toLocaleString('es-AR')}</td>
              <td className="p-3">
                <div className="flex gap-2">
                  {v.status !== 'active' && (
                    <Button type="button" variant="secondary" disabled={isPending} onClick={() => setStatus(v.id, 'active')}>
                      Activar
                    </Button>
                  )}
                  {v.status === 'active' && (
                    <Button type="button" variant="ghost" disabled={isPending} onClick={() => setStatus(v.id, 'inactive')}>
                      Desactivar
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {versions.length === 0 && (
            <tr>
              <td colSpan={7} className="p-6 text-center text-slate-400 text-sm">
                Todavía no se importó ninguna versión.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
