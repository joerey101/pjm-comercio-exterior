'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin, requireUser } from '@/lib/dal';
import { mapDbError } from '@/lib/errorMessages';
import { logAuditEvent } from '@/lib/auditLog';
import { notifyUser } from '@/lib/notify';
import { computeQuoteTotals } from '@/lib/quoteTotals';
import type {
  SimulationRow,
  SimulationItemRow,
  FormalQuoteRow,
  FormalQuoteItemRow,
  FormalQuoteCostRow,
} from '@/types/database';
import type { FormalQuoteCostCategory } from '@/types/quotes';

type ActionResult = { ok: true } | { error: string };

/**
 * Creates a draft formal quote from the current state of a simulation: a
 * frozen jsonb snapshot of the simulation row (for history, even if the
 * simulation changes later) plus editable item/cost rows seeded from
 * simulation_items and the simulation's own calculated cost breakdown.
 */
export async function createDraftQuote(
  simulationId: string,
  requestId: string | null
): Promise<{ ok: true; quoteId: string } | { error: string }> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: simulation } = await supabase.from('simulations').select('*').eq('id', simulationId).maybeSingle<SimulationRow>();
  if (!simulation) return { error: 'Simulación no encontrada.' };

  const { data: items } = await supabase
    .from('simulation_items')
    .select('*')
    .eq('simulation_id', simulationId)
    .returns<SimulationItemRow[]>();

  const { data: quote, error } = await supabase
    .from('formal_quotes')
    .insert({
      simulation_id: simulationId,
      request_id: requestId,
      currency: simulation.currency,
      snapshot: simulation,
      created_by: admin.id,
    })
    .select('*')
    .single<FormalQuoteRow>();
  if (error || !quote) return { error: mapDbError(error?.message ?? 'No se pudo crear el borrador.') };

  if (items && items.length > 0) {
    await supabase.from('formal_quote_items').insert(
      items.map((item, index) => ({
        formal_quote_id: quote.id,
        description: item.description,
        ncm_code: item.ncm_code,
        quantity: item.quantity,
        unit_value: item.unit_value,
        total_value: item.total_value,
        sort_order: index,
      }))
    );
  }

  const allDefaultCosts: { category: FormalQuoteCostCategory; label: string; amount: number }[] = [
    { category: 'customs', label: 'Derecho de importación', amount: simulation.customs_duty },
    { category: 'customs', label: 'Tasa estadística', amount: simulation.statistical_rate },
    { category: 'taxes', label: 'IVA', amount: simulation.iva },
    { category: 'taxes', label: 'IVA adicional', amount: simulation.iva_additional },
    { category: 'taxes', label: 'Percepción Ganancias', amount: simulation.ganancias },
    { category: 'taxes', label: 'Percepción IIBB', amount: simulation.iibb },
    { category: 'logistics', label: 'Gastos locales y logísticos', amount: simulation.local_costs },
  ];
  const defaultCosts = allDefaultCosts.filter((c) => c.amount > 0);

  if (defaultCosts.length > 0) {
    await supabase.from('formal_quote_costs').insert(
      defaultCosts.map((c, index) => ({ formal_quote_id: quote.id, ...c, sort_order: index }))
    );
  }

  await recalculateQuoteTotals(quote.id);
  await logAuditEvent({ entityType: 'formal_quote', entityId: quote.id, simulationId, requestId, userId: admin.id, action: 'formal_quote_draft_created' });

  revalidatePath(`/admin/solicitudes/${simulationId}`);
  return { ok: true as const, quoteId: quote.id };
}

async function recalculateQuoteTotals(quoteId: string) {
  const supabase = await createClient();
  const [{ data: items }, { data: costs }] = await Promise.all([
    supabase.from('formal_quote_items').select('*').eq('formal_quote_id', quoteId).returns<FormalQuoteItemRow[]>(),
    supabase.from('formal_quote_costs').select('*').eq('formal_quote_id', quoteId).returns<FormalQuoteCostRow[]>(),
  ]);
  const totals = computeQuoteTotals(
    (items ?? []).map((i) => ({ quantity: i.quantity, unitValue: i.unit_value })),
    (costs ?? []).map((c) => ({ category: c.category, amount: c.amount }))
  );
  await supabase.from('formal_quotes').update({ subtotal: totals.subtotal, taxes_total: totals.taxesTotal, total: totals.total }).eq('id', quoteId);
}

export async function updateQuoteTerms(
  quoteId: string,
  simulationId: string,
  fields: { paymentTerms?: string; validityDays?: number; notes?: string; exclusions?: string; currency?: string }
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase
    .from('formal_quotes')
    .update({
      payment_terms: fields.paymentTerms,
      validity_days: fields.validityDays,
      notes: fields.notes,
      exclusions: fields.exclusions,
      currency: fields.currency,
    })
    .eq('id', quoteId)
    .eq('status', 'draft');
  if (error) return { error: mapDbError(error.message) };
  revalidatePath(`/admin/solicitudes/${simulationId}`);
  return { ok: true };
}

/** Snapshots a BNA-entered exchange rate onto a draft quote (Sprint 5). */
export async function setQuoteExchangeRate(quoteId: string, simulationId: string, rate: number): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('formal_quotes').update({ exchange_rate: rate }).eq('id', quoteId).eq('status', 'draft');
  if (error) return { error: mapDbError(error.message) };
  revalidatePath(`/admin/solicitudes/${simulationId}`);
  return { ok: true };
}

export async function addQuoteItem(
  quoteId: string,
  simulationId: string,
  item: { description: string; ncmCode: string | null; quantity: number; unitValue: number }
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('formal_quote_items').insert({
    formal_quote_id: quoteId,
    description: item.description,
    ncm_code: item.ncmCode,
    quantity: item.quantity,
    unit_value: item.unitValue,
    total_value: item.quantity * item.unitValue,
  });
  if (error) return { error: mapDbError(error.message) };
  await recalculateQuoteTotals(quoteId);
  revalidatePath(`/admin/solicitudes/${simulationId}`);
  return { ok: true };
}

export async function removeQuoteItem(itemId: string, quoteId: string, simulationId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('formal_quote_items').delete().eq('id', itemId);
  if (error) return { error: mapDbError(error.message) };
  await recalculateQuoteTotals(quoteId);
  revalidatePath(`/admin/solicitudes/${simulationId}`);
  return { ok: true };
}

export async function addQuoteCost(
  quoteId: string,
  simulationId: string,
  cost: { category: FormalQuoteCostCategory; label: string; amount: number }
): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('formal_quote_costs').insert({
    formal_quote_id: quoteId,
    category: cost.category,
    label: cost.label,
    amount: cost.amount,
  });
  if (error) return { error: mapDbError(error.message) };
  await recalculateQuoteTotals(quoteId);
  revalidatePath(`/admin/solicitudes/${simulationId}`);
  return { ok: true };
}

export async function removeQuoteCost(costId: string, quoteId: string, simulationId: string): Promise<ActionResult> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('formal_quote_costs').delete().eq('id', costId);
  if (error) return { error: mapDbError(error.message) };
  await recalculateQuoteTotals(quoteId);
  revalidatePath(`/admin/solicitudes/${simulationId}`);
  return { ok: true };
}

export async function approveQuote(quoteId: string, simulationId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: items } = await supabase.from('formal_quote_items').select('id').eq('formal_quote_id', quoteId);
  if (!items || items.length === 0) return { error: 'La cotización necesita al menos un ítem de mercadería.' };

  const { error } = await supabase
    .from('formal_quotes')
    .update({ status: 'approved', approved_by: admin.id, approved_at: new Date().toISOString() })
    .eq('id', quoteId)
    .eq('status', 'draft');
  if (error) return { error: mapDbError(error.message) };

  await logAuditEvent({ entityType: 'formal_quote', entityId: quoteId, simulationId, userId: admin.id, action: 'formal_quote_approved' });
  revalidatePath(`/admin/solicitudes/${simulationId}`);
  return { ok: true };
}

/** Moves an approved draft to 'issued': allocates the quote number atomically via RPC and notifies the client. */
export async function issueQuote(quoteId: string, simulationId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data: quoteBefore } = await supabase.from('formal_quotes').select('request_id').eq('id', quoteId).maybeSingle<FormalQuoteRow>();

  const { data: quoteNumber, error } = await supabase.rpc('issue_formal_quote', { p_quote_id: quoteId });
  if (error) return { error: mapDbError(error.message) };

  if (quoteBefore?.request_id) {
    await supabase
      .from('pjm_requests')
      .update({ status: 'formal_quote_sent', last_activity_at: new Date().toISOString() })
      .eq('id', quoteBefore.request_id);
  }

  await logAuditEvent({ entityType: 'formal_quote', entityId: quoteId, simulationId, userId: admin.id, action: 'formal_quote_issued', newValue: { quoteNumber } });

  const { data: simulation } = await supabase.from('simulations').select('user_id, name').eq('id', simulationId).maybeSingle<SimulationRow>();
  if (simulation) {
    await notifyUser({
      userId: simulation.user_id,
      type: 'formal_quote_issued',
      title: 'Tu cotización formal está lista',
      message: `${simulation.name}: cotización ${quoteNumber} disponible para tu revisión.`,
      linkUrl: `/simulaciones/${simulationId}`,
    });
  }

  revalidatePath('/admin');
  revalidatePath(`/admin/solicitudes/${simulationId}`);
  revalidatePath(`/simulaciones/${simulationId}`);
  return { ok: true };
}

export async function cancelQuote(quoteId: string, simulationId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from('formal_quotes').update({ status: 'cancelled' }).eq('id', quoteId).in('status', ['draft', 'approved']);
  if (error) return { error: mapDbError(error.message) };
  await logAuditEvent({ entityType: 'formal_quote', entityId: quoteId, simulationId, userId: admin.id, action: 'formal_quote_cancelled' });
  revalidatePath(`/admin/solicitudes/${simulationId}`);
  return { ok: true };
}

/** Client-facing: accept or reject an issued quote. Only 'issued' -> 'accepted'/'rejected' is allowed by RLS. */
export async function respondToQuote(
  quoteId: string,
  simulationId: string,
  response: 'accepted' | 'rejected',
  notes?: string
): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from('formal_quotes')
    .update({ status: response, client_responded_at: new Date().toISOString(), client_response_notes: notes ?? null })
    .eq('id', quoteId);
  if (error) return { error: mapDbError(error.message) };

  await logAuditEvent({
    entityType: 'formal_quote',
    entityId: quoteId,
    simulationId,
    userId: user.id,
    action: response === 'accepted' ? 'formal_quote_accepted' : 'formal_quote_rejected',
    newValue: { notes },
  });
  await notifyAllAdminsQuoteResponse(simulationId, quoteId, response);

  revalidatePath(`/simulaciones/${simulationId}`);
  revalidatePath(`/admin/solicitudes/${simulationId}`);
  return { ok: true };
}

async function notifyAllAdminsQuoteResponse(simulationId: string, quoteId: string, response: 'accepted' | 'rejected') {
  const { notifyAllAdmins } = await import('@/lib/notify');
  const supabase = await createClient();
  const { data: simulation } = await supabase.from('simulations').select('name').eq('id', simulationId).maybeSingle<SimulationRow>();
  await notifyAllAdmins({
    type: response === 'accepted' ? 'formal_quote_accepted' : 'formal_quote_rejected',
    title: response === 'accepted' ? 'Cotización aceptada' : 'Cotización rechazada',
    message: `${simulation?.name ?? 'Simulación'}: el cliente ${response === 'accepted' ? 'aceptó' : 'rechazó'} la cotización.`,
    linkUrl: `/admin/solicitudes/${simulationId}`,
  });
  void quoteId;
}
