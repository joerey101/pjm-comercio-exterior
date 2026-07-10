'use client';

import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { DOCUMENT_TYPE_LABELS, type DocumentType, type DocumentStatus } from '@/types/documents';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import { DocumentPreviewLink } from './DocumentPreviewLink';
import { DocumentUploadForm } from './DocumentUploadForm';

export interface DocumentListItem {
  id: string;
  documentType: DocumentType;
  fileName: string;
  filePath: string;
  status: DocumentStatus;
  reviewNotes: string | null;
  uploadedAt: string;
}

export function DocumentList({ simulationId, documents }: { simulationId: string; documents: DocumentListItem[] }) {
  const [replacingId, setReplacingId] = useState<string | null>(null);

  if (documents.length === 0) {
    return <p className="text-sm text-slate-400">Todavía no subiste documentos para esta simulación.</p>;
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div key={doc.id} className="border border-slate-200 rounded-xl p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-700 uppercase block">{DOCUMENT_TYPE_LABELS[doc.documentType]}</span>
              <span className="text-sm text-slate-600">{doc.fileName}</span>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[11px] text-slate-400">{new Date(doc.uploadedAt).toLocaleString('es-AR')}</span>
                <DocumentPreviewLink filePath={doc.filePath} />
              </div>
            </div>
            <DocumentStatusBadge status={doc.status} />
          </div>

          {doc.reviewNotes && (doc.status === 'observed' || doc.status === 'rejected') && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">{doc.reviewNotes}</p>
          )}

          {(doc.status === 'observed' || doc.status === 'rejected') && (
            <div className="mt-2">
              {replacingId === doc.id ? (
                <DocumentUploadForm simulationId={simulationId} replacesDocumentId={doc.id} onDone={() => setReplacingId(null)} />
              ) : (
                <button
                  type="button"
                  onClick={() => setReplacingId(doc.id)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reemplazar documento
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
