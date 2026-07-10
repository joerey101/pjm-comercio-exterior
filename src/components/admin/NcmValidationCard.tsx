'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { validateNcmForItem, getTaxAndInterventionsForNcm, type NcmTaxAndInterventionDto } from '@/app/actions/ncm';
import { NcmStatusBadge } from '@/components/ncm/NcmStatusBadge';
import { TaxParameterCard } from '@/components/ncm/TaxParameterCard';
import { InterventionAlert } from '@/components/ncm/InterventionAlert';
import { Button } from '@/components/ui/Button';
import { textareaClass } from '@/components/ui/Field';
import type { NCMStatus } from '@/types/ncm';

export function NcmValidationCard({
  simulationId,
  itemId,
  description,
  ncmCode,
  ncmDescription,
  ncmStatus,
  ncmSource,
}: {
  simulationId: string;
  itemId: string;
  description: string;
  ncmCode: string | null;
  ncmDescription: string | null;
  ncmStatus: NCMStatus;
  ncmSource: string;
}) {
  const router = useRouter();
  const [lookup, setLookup] = useState<NcmTaxAndInterventionDto | null>(null);
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!ncmCode) return;
    getTaxAndInterventionsForNcm(ncmCode).then(setLookup);
  }, [ncmCode]);

  function act(status: 'validated' | 'rejected' | 'requires_review') {
    setMessage(null);
    startTransition(async () => {
      const res = await validateNcmForItem(itemId, simulationId, { status, notes });
      if (res && 'error' in res) {
        setMessage(res.error ?? 'Ocurrió un error inesperado.');
        return;
      }
      setNotes('');
      router.refresh();
    });
  }

  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/40 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-sm font-bold text-slate-800">{description}</span>
          <p className="text-xs text-slate-500">
            NCM propuesto: <span className="font-mono">{ncmCode || 'no informado'}</span> — {ncmDescription || '—'} ·{' '}
            <span className="uppercase">{ncmSource === 'catalog' ? 'catálogo' : 'manual'}</span>
          </p>
        </div>
        <NcmStatusBadge status={ncmStatus} />
      </div>

      {lookup && (
        <div className="space-y-2">
          <TaxParameterCard taxParameters={lookup.taxParameters} />
          <InterventionAlert interventions={lookup.interventions} />
        </div>
      )}

      <textarea
        rows={2}
        placeholder="Comentario técnico (obligatorio para rechazar o pedir revisión)"
        className={textareaClass}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      {message && <p className="text-xs text-rose-600 font-medium">{message}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={isPending} onClick={() => act('validated')}>
          Validar NCM
        </Button>
        <Button type="button" variant="secondary" disabled={isPending} onClick={() => act('requires_review')}>
          Requiere revisión
        </Button>
        <Button type="button" variant="danger" disabled={isPending} onClick={() => act('rejected')}>
          Rechazar
        </Button>
      </div>
    </div>
  );
}
