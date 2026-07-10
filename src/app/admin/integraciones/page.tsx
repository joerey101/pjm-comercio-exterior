import Link from 'next/link';
import { requireAdmin } from '@/lib/dal';
import { createClient } from '@/lib/supabase/server';
import { AdminNav } from '@/components/admin/AdminNav';
import { FeatureFlagToggle } from '@/components/admin/FeatureFlagToggle';
import { ExchangeRateForm } from '@/components/admin/ExchangeRateForm';
import { RegulatoryReferenceManager } from '@/components/admin/RegulatoryReferenceManager';
import { Badge } from '@/components/ui/Badge';
import { INTEGRATION_CHANNEL_LABELS, type IntegrationChannel, type FeatureFlagKey } from '@/types/integrations';
import type { FeatureFlagRow, ExchangeRateRow, RegulatoryReferenceRow, IntegrationLogRow } from '@/types/database';

export default async function AdminIntegracionesPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: flags }, { data: rates }, { data: references }, { data: logs }] = await Promise.all([
    supabase.from('feature_flags').select('*').order('key').returns<FeatureFlagRow[]>(),
    supabase.from('exchange_rates').select('*').order('rate_date', { ascending: false }).limit(10).returns<ExchangeRateRow[]>(),
    supabase.from('regulatory_references').select('*').order('created_at', { ascending: false }).returns<RegulatoryReferenceRow[]>(),
    supabase.from('integration_logs').select('*').order('created_at', { ascending: false }).limit(20).returns<IntegrationLogRow[]>(),
  ]);

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 w-full">
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">Panel PJM</h1>
      <p className="text-sm text-slate-500 mb-6">
        Centro de integraciones: feature flags, tipo de cambio BNA, referencias BCRA/VUCE y estado de los canales de
        notificación salientes. Ninguna integración externa real está conectada en este MVP — ver detalle abajo.
      </p>
      <AdminNav active="/admin/integraciones" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase mb-1">Feature flags</h2>
          <p className="text-xs text-slate-500 mb-3">
            Los canales salientes no tienen proveedor real configurado: cuando están activados, el envío cae a un
            fallback por consola/log en vez de fallar silenciosamente.
          </p>
          {(flags ?? []).map((flag) => (
            <FeatureFlagToggle key={flag.key} flagKey={flag.key as FeatureFlagKey} enabled={flag.enabled} description={flag.description} />
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase mb-3">Tipo de cambio (BNA, manual)</h2>
          <ExchangeRateForm />
          <div className="mt-4 divide-y divide-slate-100 border-t border-slate-100 pt-2">
            {(rates ?? []).map((r) => (
              <div key={r.id} className="py-1.5 flex justify-between text-sm">
                <span className="text-slate-500">
                  {new Date(r.rate_date).toLocaleDateString('es-AR')} · {r.currency}
                </span>
                <span className="font-semibold text-slate-800">
                  Compra {r.buy_rate} / Venta {r.sell_rate}
                </span>
              </div>
            ))}
            {(!rates || rates.length === 0) && <p className="text-xs text-slate-400 py-2">Sin tipos de cambio cargados.</p>}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase mb-1">Referencias BCRA / VUCE</h2>
          <p className="text-xs text-slate-500 mb-3">
            Carga manual de referencias regulatorias (normas, comunicados, requisitos por NCM) hasta contar con una
            fuente estable para consumir automáticamente.
          </p>
          <RegulatoryReferenceManager references={references ?? []} />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6">
          <h2 className="text-sm font-bold text-slate-900 uppercase mb-1">Catálogo NCM (ARCA)</h2>
          <p className="text-xs text-slate-500 mb-3">
            La carga de posiciones NCM/tributos/intervenciones (Sprint 2) ya soporta un campo &ldquo;fuente&rdquo; para
            marcar un lote como proveniente de ARCA Arancel Integrado — no hay un módulo separado en este sprint.
          </p>
          <Link href="/admin/ncm" className="text-sm font-bold text-indigo-600 hover:underline">
            Ir al importador de catálogo NCM →
          </Link>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:col-span-2">
          <h2 className="text-sm font-bold text-slate-900 uppercase mb-3">Últimos intentos de notificación saliente</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] font-bold text-slate-500 uppercase border-b border-slate-200">
                <tr>
                  <th className="py-2 pr-3">Canal</th>
                  <th className="py-2 pr-3">Evento</th>
                  <th className="py-2 pr-3">Destinatario</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(logs ?? []).map((log) => (
                  <tr key={log.id}>
                    <td className="py-2 pr-3">{INTEGRATION_CHANNEL_LABELS[log.channel as IntegrationChannel] ?? log.channel}</td>
                    <td className="py-2 pr-3">{log.event_type}</td>
                    <td className="py-2 pr-3 text-slate-500">{log.recipient || '—'}</td>
                    <td className="py-2 pr-3">
                      <Badge tone={log.status === 'sent' ? 'emerald' : log.status === 'failed' ? 'rose' : 'slate'}>{log.status}</Badge>
                    </td>
                    <td className="py-2 pr-3 text-slate-500">{new Date(log.created_at).toLocaleString('es-AR')}</td>
                  </tr>
                ))}
                {(!logs || logs.length === 0) && (
                  <tr>
                    <td colSpan={5} className="py-3 text-center text-slate-400 text-xs">
                      Sin actividad todavía.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
