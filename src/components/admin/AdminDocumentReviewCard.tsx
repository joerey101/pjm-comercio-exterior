'use client';

import { useState } from 'react';
import { DOCUMENT_TYPE_LABELS, type DocumentType, type DocumentStatus } from '@/types/documents';
import { DocumentStatusBadge } from '@/components/documents/DocumentStatusBadge';
import { DocumentPreviewLink } from '@/components/documents/DocumentPreviewLink';
import { DocumentReviewActions } from '@/components/documents/DocumentReviewActions';

export function AdminDocumentReviewCard({
  documentId,
  simulationId,
  documentType,
  fileName,
  filePath,
  status,
  reviewNotes,
  uploadedAt,
}: {
  documentId: string;
  simulationId: string;
  documentType: DocumentType;
  fileName: string;
  filePath: string;
  status: DocumentStatus;
  reviewNotes: string | null;
  uploadedAt: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-xl p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-slate-700 uppercase block">{DOCUMENT_TYPE_LABELS[documentType]}</span>
          <span className="text-sm text-slate-600">{fileName}</span>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[11px] text-slate-400">{new Date(uploadedAt).toLocaleString('es-AR')}</span>
            <DocumentPreviewLink filePath={filePath} />
          </div>
        </div>
        <DocumentStatusBadge status={status} />
      </div>
      {reviewNotes && <p className="text-xs text-slate-500 mt-2">Último comentario: {reviewNotes}</p>}
      {expanded ? (
        <DocumentReviewActions documentId={documentId} simulationId={simulationId} />
      ) : (
        <button type="button" onClick={() => setExpanded(true)} className="text-xs text-indigo-600 hover:underline mt-2">
          Revisar documento
        </button>
      )}
    </div>
  );
}
