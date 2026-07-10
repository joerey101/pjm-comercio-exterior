const CARD_CONFIG: { key: string; label: string; statuses: string[] }[] = [
  { key: 'new', label: 'Nuevas', statuses: ['received'] },
  { key: 'in_review', label: 'En revisión', statuses: ['in_review', 'ncm_review', 'tax_review', 'logistics_review'] },
  { key: 'missing_docs', label: 'Doc. incompleta', statuses: ['missing_documents', 'waiting_client'] },
  { key: 'ready', label: 'Listas para cotizar', statuses: ['ready_for_quote'] },
  { key: 'quoted', label: 'Cotización enviada', statuses: ['formal_quote_sent'] },
  { key: 'closed', label: 'Cerradas', statuses: ['closed', 'cancelled'] },
];

export function AdminKpiCards({ statusCounts }: { statusCounts: Record<string, number> }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {CARD_CONFIG.map((card) => {
        const total = card.statuses.reduce((sum, s) => sum + (statusCounts[s] ?? 0), 0);
        return (
          <div key={card.key} className="bg-white border border-slate-200 rounded-xl p-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase block">{card.label}</span>
            <span className="text-xl font-black text-slate-800">{total}</span>
          </div>
        );
      })}
    </div>
  );
}
