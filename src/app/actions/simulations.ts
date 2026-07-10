'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/dal';
import { calculateSimulationSummary } from '@/lib/calculations/importCostCalculator';
import { merchandiseToCargoItem, totalFobValue, totalUnits } from '@/lib/adapters';
import type { SimulationDraft } from '@/types/simulation';

export interface SaveSimulationPayload {
  id?: string;
  name: string;
  draft: SimulationDraft;
  asCompleted?: boolean;
}

export async function saveSimulation(
  payload: SaveSimulationPayload
): Promise<{ id: string } | { error: string }> {
  const user = await requireUser();
  const supabase = await createClient();
  const { draft } = payload;

  const fobValue = totalFobValue(draft.items);
  const units = totalUnits(draft.items);
  const cargoItems = draft.items.map(merchandiseToCargoItem);

  const summary = calculateSimulationSummary({
    fobValue,
    totalUnits: units,
    transportMode: draft.operation.transportMode,
    incoterm: draft.operation.incoterm,
    cargoItems,
    containers: draft.containers,
    freightRates: {
      mainFreightRate: draft.logistics.mainFreightRate,
      bafFsc: draft.logistics.bafFsc,
      fclRates: undefined,
    },
    insurancePercent: draft.logistics.insurancePercent,
    originLocalCharges: draft.logistics.originLocalCharges,
    destinationLocalCharges: draft.logistics.destinationLocalCharges,
    customsBrokerFee: draft.logistics.customsBrokerFee,
    internalFreight: draft.logistics.internalFreight,
    otherDefinitiveCosts: draft.logistics.otherDefinitiveCosts,
    taxRates: draft.taxRates,
  });

  const { data: company } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();

  const ncmStatuses = draft.items.map((i) => i.ncmStatus);
  const overallNcmStatus = ncmStatuses.includes('requiere_revision')
    ? 'requiere_revision'
    : ncmStatuses.includes('pendiente_validacion')
      ? 'pendiente_validacion'
      : ncmStatuses.includes('propuesto_cliente')
        ? 'propuesto_cliente'
        : ncmStatuses.every((s) => s === 'validado_pjm') && ncmStatuses.length > 0
          ? 'validado_pjm'
          : 'no_informado';

  const documentStatus = 'incomplete';

  const simulationRow = {
    user_id: user.id,
    company_id: company?.id ?? null,
    name: payload.name || 'Simulación sin nombre',
    operation_type: draft.operation.operationType,
    transport_mode: draft.operation.transportMode,
    incoterm: draft.operation.incoterm,
    origin_country: draft.operation.originCountry,
    origin_port: draft.operation.originPort,
    destination_port: draft.operation.destinationPort,
    final_destination: draft.operation.finalDestination,
    currency: draft.operation.currency,
    exchange_rate: draft.operation.exchangeRate,
    supplier: draft.operation.supplier,
    buyer: draft.operation.buyer,
    shipment_date: draft.operation.shipmentDate,
    arrival_date: draft.operation.arrivalDate,
    fob_value: fobValue,
    freight: summary.freight,
    insurance: summary.insurance,
    cif_value: summary.cif,
    customs_duty: summary.customsDuty,
    statistical_rate: summary.statisticalRate,
    iva: summary.iva,
    iva_additional: summary.ivaAdditional,
    ganancias: summary.ganancias,
    iibb: summary.iibb,
    local_costs: summary.localExpenses,
    definitive_cost: summary.definitiveCost,
    fiscal_credits: summary.fiscalCredits,
    cash_required: summary.cashRequired,
    total_cost: summary.cashRequired,
    unit_cost: summary.unitCost,
    status: payload.asCompleted ? 'completed' : 'draft',
    ncm_status: overallNcmStatus,
    document_status: documentStatus,
    raw_data: draft as unknown as Record<string, unknown>,
  };

  let simulationId = payload.id;

  if (simulationId) {
    const { error } = await supabase.from('simulations').update(simulationRow).eq('id', simulationId);
    if (error) return { error: error.message };
    await supabase.from('simulation_items').delete().eq('simulation_id', simulationId);
  } else {
    const { data, error } = await supabase.from('simulations').insert(simulationRow).select('id').single();
    if (error) return { error: error.message };
    simulationId = data.id;
  }

  if (draft.items.length > 0) {
    const itemRows = draft.items.map((item) => ({
      simulation_id: simulationId,
      description: item.description,
      technical_description: item.technicalDescription,
      brand_model: item.brandModel,
      intended_use: item.intendedUse,
      quantity: item.quantity,
      unit_value: item.unitValue,
      total_value: item.quantity * item.unitValue,
      gross_weight: item.grossWeightKg,
      net_weight: item.netWeightKg,
      length_cm: item.lengthCm,
      width_cm: item.widthCm,
      height_cm: item.heightCm,
      cbm: (item.lengthCm * item.widthCm * item.heightCm) / 1_000_000 * (item.packages || 1),
      packages: item.packages,
      packaging_type: item.packagingType,
      country_of_origin: item.countryOfOrigin,
      ncm_code: item.ncmCode,
      ncm_description: item.ncmDescription,
      ncm_status: item.ncmStatus,
    }));
    const { error: itemsError } = await supabase.from('simulation_items').insert(itemRows);
    if (itemsError) return { error: itemsError.message };
  }

  const logisticsRow = {
    simulation_id: simulationId,
    freight: summary.freight,
    insurance: summary.insurance,
    baf: draft.logistics.bafFsc,
    fsc: 0,
    origin_charges: draft.logistics.originLocalCharges,
    destination_charges: draft.logistics.destinationLocalCharges,
    internal_freight: draft.logistics.internalFreight,
    customs_broker_fee: draft.logistics.customsBrokerFee,
    terminal: 0,
    warehouse: 0,
    desconsolidation: 0,
    handling: 0,
    verification: 0,
    scan: 0,
    storage: 0,
    pickup: 0,
    empty_return: 0,
    management_fee: 0,
    bank_expenses: 0,
    documentation_expenses: 0,
    other_expenses: draft.logistics.otherDefinitiveCosts,
  };
  await supabase.from('logistic_costs').upsert(logisticsRow, { onConflict: 'simulation_id' });

  revalidatePath('/dashboard');
  revalidatePath(`/simulaciones/${simulationId}`);

  return { id: simulationId! };
}

export async function requestFormalQuote(simulationId: string): Promise<{ ok: true } | { error: string }> {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: simulation, error: fetchError } = await supabase
    .from('simulations')
    .select('id, user_id')
    .eq('id', simulationId)
    .single();

  if (fetchError || !simulation || simulation.user_id !== user.id) {
    return { error: 'No se encontró la simulación.' };
  }

  const { error: updateError } = await supabase
    .from('simulations')
    .update({ status: 'sent_to_pjm' })
    .eq('id', simulationId);
  if (updateError) return { error: updateError.message };

  const { error: requestError } = await supabase
    .from('pjm_requests')
    .upsert({ simulation_id: simulationId, status: 'sent_to_pjm' }, { onConflict: 'simulation_id' });
  if (requestError) return { error: requestError.message };

  revalidatePath('/dashboard');
  revalidatePath(`/simulaciones/${simulationId}`);
  revalidatePath('/admin');

  return { ok: true };
}
