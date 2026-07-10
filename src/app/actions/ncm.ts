'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireUser, requireAdmin } from '@/lib/dal';
import { mapDbError } from '@/lib/errorMessages';
import { normalizeNcmCode, chapterOf } from '@/lib/ncm/normalizeNcmCode';
import { rankNcmMatches, type SearchableNcmPosition } from '@/lib/ncm/searchNcm';
import { matchTaxParameters, type MatchableTaxParameter } from '@/lib/ncm/matchTaxParameters';
import { matchInterventionRules, type MatchableInterventionRule } from '@/lib/ncm/matchInterventionRules';
import { parseNcmCatalogCsv } from '@/lib/ncm/importNcmCatalog';
import { parseTaxParametersCsv } from '@/lib/ncm/importTaxParameters';
import { parseInterventionRulesCsv } from '@/lib/ncm/importInterventionRules';
import type { NCMPositionRow, TaxParameterRow, InterventionRuleRow, ImportJobType, ImportJobRow } from '@/types/database';

// ---------------------------------------------------------------------------
// Client-facing search / lookup (read-only, RLS: any authenticated user can
// read active catalog rows)
// ---------------------------------------------------------------------------

export interface NcmSearchResultDto {
  id: string;
  code: string;
  description: string;
  section: string | null;
  chapter: string | null;
  aec: number | null;
  exportRebate: number | null;
  source: string | null;
  validFrom: string | null;
  validTo: string | null;
  requiresReview: boolean;
  reason: string;
}

/** Searches the active NCM catalog by code (with/without dots), chapter, or free text. */
export async function searchNcmPositions(query: string): Promise<NcmSearchResultDto[]> {
  await requireUser();
  const trimmed = query.trim();
  if (!trimmed) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from('ncm_positions')
    .select('id, code, normalized_code, description, section, chapter, aec, export_rebate, source, valid_from, valid_to, requires_review')
    .eq('is_active', true)
    .limit(500)
    .returns<NCMPositionRow[]>();

  const candidates: SearchableNcmPosition[] = (data ?? []).map((p) => ({
    id: p.id,
    code: p.code,
    normalizedCode: p.normalized_code,
    description: p.description,
    section: p.section,
    chapter: p.chapter,
  }));

  const ranked = rankNcmMatches(trimmed, candidates).slice(0, 25);
  const byId = new Map((data ?? []).map((p) => [p.id, p]));

  return ranked.map((r) => {
    const p = byId.get(r.position.id)!;
    return {
      id: p.id,
      code: p.code,
      description: p.description,
      section: p.section,
      chapter: p.chapter,
      aec: p.aec,
      exportRebate: p.export_rebate,
      source: p.source,
      validFrom: p.valid_from,
      validTo: p.valid_to,
      requiresReview: p.requires_review,
      reason: r.reason,
    };
  });
}

export interface NcmTaxAndInterventionDto {
  taxParameters: {
    id: string;
    importDuty: number;
    statisticalRate: number;
    iva: number;
    ivaAdditional: number;
    ganancias: number;
    iibb: number;
    otherTax: number;
    source: string | null;
    validFrom: string | null;
    validTo: string | null;
  } | null;
  interventions: {
    level: 'ncm' | 'chapter' | 'none';
    hasBlocking: boolean;
    hasWarning: boolean;
    rules: { type: string; description: string; severity: string; source: string | null }[];
  };
}

/** Given a selected NCM code, resolves the active tax parameters + intervention rules that apply. */
export async function getTaxAndInterventionsForNcm(ncmCode: string): Promise<NcmTaxAndInterventionDto> {
  await requireUser();
  const supabase = await createClient();
  const normalized = normalizeNcmCode(ncmCode);

  const [{ data: taxRows }, { data: ruleRows }] = await Promise.all([
    supabase.from('tax_parameters').select('*').eq('is_active', true).eq('normalized_ncm_code', normalized).returns<TaxParameterRow[]>(),
    supabase
      .from('intervention_rules')
      .select('*')
      .eq('is_active', true)
      .or(`normalized_ncm_code.eq.${normalized},chapter.eq.${chapterOf(normalized)}`)
      .returns<InterventionRuleRow[]>(),
  ]);

  const taxCandidates: MatchableTaxParameter[] = (taxRows ?? []).map((t) => ({
    id: t.id,
    normalizedNcmCode: t.normalized_ncm_code,
    isActive: t.is_active,
    importDuty: t.import_duty,
    statisticalRate: t.statistical_rate,
    iva: t.iva,
    ivaAdditional: t.iva_additional,
    ganancias: t.ganancias,
    iibb: t.iibb,
    otherTax: t.other_tax,
  }));
  const tax = matchTaxParameters(ncmCode, taxCandidates);
  const taxRow = tax ? taxRows!.find((t) => t.id === tax.id) ?? null : null;

  const interventionCandidates: MatchableInterventionRule[] = (ruleRows ?? []).map((r) => ({
    id: r.id,
    normalizedNcmCode: r.normalized_ncm_code,
    chapter: r.chapter,
    interventionType: r.intervention_type as MatchableInterventionRule['interventionType'],
    description: r.description,
    severity: r.severity,
    isActive: r.is_active,
  }));
  const interventionMatch = matchInterventionRules(ncmCode, interventionCandidates);

  return {
    taxParameters: taxRow
      ? {
          id: taxRow.id,
          importDuty: taxRow.import_duty,
          statisticalRate: taxRow.statistical_rate,
          iva: taxRow.iva,
          ivaAdditional: taxRow.iva_additional,
          ganancias: taxRow.ganancias,
          iibb: taxRow.iibb,
          otherTax: taxRow.other_tax,
          source: taxRow.source,
          validFrom: taxRow.valid_from,
          validTo: taxRow.valid_to,
        }
      : null,
    interventions: {
      level: interventionMatch.level,
      hasBlocking: interventionMatch.hasBlocking,
      hasWarning: interventionMatch.hasWarning,
      rules: interventionMatch.rules.map((r) => ({
        type: r.interventionType,
        description: r.description,
        severity: r.severity,
        source: (ruleRows ?? []).find((row) => row.id === r.id)?.source ?? null,
      })),
    },
  };
}

// ---------------------------------------------------------------------------
// Admin: catalog / version management
// ---------------------------------------------------------------------------

export async function listCatalogVersions(jobType: ImportJobType) {
  await requireAdmin();
  const supabase = await createClient();
  const table = jobType === 'ncm_catalog' ? 'ncm_catalog_versions' : jobType === 'tax_parameters' ? 'tax_parameter_versions' : 'intervention_rule_versions';
  const { data } = await supabase.from(table).select('*').order('created_at', { ascending: false });
  return data ?? [];
}

export async function setCatalogVersionStatus(jobType: ImportJobType, versionId: string, status: 'active' | 'inactive' | 'archived') {
  await requireAdmin();
  const supabase = await createClient();
  const table = jobType === 'ncm_catalog' ? 'ncm_catalog_versions' : jobType === 'tax_parameters' ? 'tax_parameter_versions' : 'intervention_rule_versions';
  const positionsTable = jobType === 'ncm_catalog' ? 'ncm_positions' : jobType === 'tax_parameters' ? 'tax_parameters' : 'intervention_rules';

  await supabase.from(table).update({ status }).eq('id', versionId);
  // Keep row-level is_active in sync with its version's status so search/match
  // (which filter on is_active) reflect activation/rollback immediately.
  await supabase.from(positionsTable).update({ is_active: status === 'active' }).eq('version_id', versionId);

  revalidatePath('/admin/ncm');
  revalidatePath('/admin/ncm/tributos');
  revalidatePath('/admin/ncm/intervenciones');
}

export async function listImportJobs(): Promise<ImportJobRow[]> {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.from('import_jobs').select('*').order('created_at', { ascending: false }).limit(50).returns<ImportJobRow[]>();
  return data ?? [];
}

interface ImportSummary {
  jobId: string;
  versionId: string | null;
  totalRows: number;
  processedRows: number;
  errorRows: number;
  status: ImportJobRow['status'];
  errorReport: { row: number; message: string }[];
}

async function createImportJob(jobType: ImportJobType, fileName: string, importedBy: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('import_jobs')
    .insert({ job_type: jobType, file_name: fileName, imported_by: importedBy, status: 'processing' })
    .select('id')
    .single();
  return data!.id as string;
}

async function finishImportJob(
  jobId: string,
  fields: { versionId: string | null; total: number; processed: number; errors: { row: number; message: string }[] }
) {
  const supabase = await createClient();
  const status: ImportJobRow['status'] = fields.errors.length === 0 ? 'completed' : fields.processed > 0 ? 'completed_with_errors' : 'failed';
  await supabase
    .from('import_jobs')
    .update({
      version_id: fields.versionId,
      status,
      total_rows: fields.total,
      processed_rows: fields.processed,
      error_rows: fields.errors.length,
      error_report: fields.errors,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);
}

export async function importNcmCatalogFile(formData: FormData): Promise<ImportSummary | { error: string }> {
  const admin = await requireAdmin();
  const file = formData.get('file') as File | null;
  const versionName = String(formData.get('versionName') ?? '').trim() || `Importación ${new Date().toLocaleDateString('es-AR')}`;
  if (!file) return { error: 'Adjuntá un archivo CSV.' };

  const text = await file.text();
  const { rows, errors, totalRows } = parseNcmCatalogCsv(text);
  const supabase = await createClient();
  const jobId = await createImportJob('ncm_catalog', file.name, admin.id);

  if (rows.length === 0) {
    await finishImportJob(jobId, { versionId: null, total: totalRows, processed: 0, errors });
    return { jobId, versionId: null, totalRows, processedRows: 0, errorRows: errors.length, status: 'failed', errorReport: errors };
  }

  const { data: version, error: versionError } = await supabase
    .from('ncm_catalog_versions')
    .insert({ name: versionName, source: 'manual_upload', imported_by: admin.id, status: 'draft', row_count: rows.length, error_count: errors.length })
    .select('id')
    .single();
  if (versionError || !version) {
    await finishImportJob(jobId, { versionId: null, total: totalRows, processed: 0, errors: [...errors, { row: 0, message: mapDbError(versionError?.message) }] });
    return { error: mapDbError(versionError?.message) };
  }

  const { error: insertError } = await supabase.from('ncm_positions').insert(
    rows.map((r) => ({
      version_id: version.id,
      code: r.code,
      normalized_code: r.normalizedCode,
      description: r.description,
      section: r.section,
      chapter: r.chapter,
      heading: r.heading,
      subheading: r.subheading,
      aec: r.aec,
      export_rebate: r.exportRebate,
      source: r.source ?? 'manual_upload',
      valid_from: r.validFrom,
      valid_to: r.validTo,
      is_active: false,
    }))
  );
  if (insertError) {
    errors.push({ row: 0, message: mapDbError(insertError.message) });
  }

  await finishImportJob(jobId, { versionId: version.id, total: totalRows, processed: insertError ? 0 : rows.length, errors });
  revalidatePath('/admin/ncm');
  return {
    jobId,
    versionId: version.id,
    totalRows,
    processedRows: insertError ? 0 : rows.length,
    errorRows: errors.length,
    status: errors.length === 0 ? 'completed' : 'completed_with_errors',
    errorReport: errors,
  };
}

export async function importTaxParametersFile(formData: FormData): Promise<ImportSummary | { error: string }> {
  const admin = await requireAdmin();
  const file = formData.get('file') as File | null;
  const versionName = String(formData.get('versionName') ?? '').trim() || `Importación ${new Date().toLocaleDateString('es-AR')}`;
  if (!file) return { error: 'Adjuntá un archivo CSV.' };

  const text = await file.text();
  const { rows, errors, totalRows } = parseTaxParametersCsv(text);
  const warnings = rows.filter((r) => r.warning).map((r, i) => ({ row: i, message: r.warning! }));
  const supabase = await createClient();
  const jobId = await createImportJob('tax_parameters', file.name, admin.id);

  if (rows.length === 0) {
    await finishImportJob(jobId, { versionId: null, total: totalRows, processed: 0, errors });
    return { jobId, versionId: null, totalRows, processedRows: 0, errorRows: errors.length, status: 'failed', errorReport: errors };
  }

  const { data: version, error: versionError } = await supabase
    .from('tax_parameter_versions')
    .insert({ name: versionName, source: 'manual_upload', imported_by: admin.id, status: 'draft', row_count: rows.length, error_count: errors.length })
    .select('id')
    .single();
  if (versionError || !version) return { error: mapDbError(versionError?.message) };

  const { error: insertError } = await supabase.from('tax_parameters').insert(
    rows.map((r) => ({
      version_id: version.id,
      ncm_code: r.ncmCode,
      normalized_ncm_code: r.normalizedNcmCode,
      import_duty: r.importDuty,
      statistical_rate: r.statisticalRate,
      iva: r.iva,
      iva_additional: r.ivaAdditional,
      ganancias: r.ganancias,
      iibb: r.iibb,
      other_tax: r.otherTax,
      source: r.source ?? 'manual_upload',
      valid_from: r.validFrom,
      valid_to: r.validTo,
      is_active: false,
    }))
  );
  if (insertError) errors.push({ row: 0, message: mapDbError(insertError.message) });

  const allNotes = [...errors, ...warnings];
  await finishImportJob(jobId, { versionId: version.id, total: totalRows, processed: insertError ? 0 : rows.length, errors: allNotes });
  revalidatePath('/admin/ncm/tributos');
  return {
    jobId,
    versionId: version.id,
    totalRows,
    processedRows: insertError ? 0 : rows.length,
    errorRows: errors.length,
    status: errors.length === 0 ? 'completed' : 'completed_with_errors',
    errorReport: allNotes,
  };
}

export async function importInterventionRulesFile(formData: FormData): Promise<ImportSummary | { error: string }> {
  const admin = await requireAdmin();
  const file = formData.get('file') as File | null;
  const versionName = String(formData.get('versionName') ?? '').trim() || `Importación ${new Date().toLocaleDateString('es-AR')}`;
  if (!file) return { error: 'Adjuntá un archivo CSV.' };

  const text = await file.text();
  const { rows, errors, totalRows } = parseInterventionRulesCsv(text);
  const supabase = await createClient();
  const jobId = await createImportJob('intervention_rules', file.name, admin.id);

  if (rows.length === 0) {
    await finishImportJob(jobId, { versionId: null, total: totalRows, processed: 0, errors });
    return { jobId, versionId: null, totalRows, processedRows: 0, errorRows: errors.length, status: 'failed', errorReport: errors };
  }

  const { data: version, error: versionError } = await supabase
    .from('intervention_rule_versions')
    .insert({ name: versionName, source: 'manual_upload', imported_by: admin.id, status: 'draft', row_count: rows.length, error_count: errors.length })
    .select('id')
    .single();
  if (versionError || !version) return { error: mapDbError(versionError?.message) };

  const { error: insertError } = await supabase.from('intervention_rules').insert(
    rows.map((r) => ({
      version_id: version.id,
      ncm_code: r.ncmCode,
      normalized_ncm_code: r.normalizedNcmCode,
      chapter: r.chapter,
      intervention_type: r.interventionType,
      description: r.description,
      severity: r.severity,
      source: r.source ?? 'manual_upload',
      valid_from: r.validFrom,
      valid_to: r.validTo,
      is_active: false,
    }))
  );
  if (insertError) errors.push({ row: 0, message: mapDbError(insertError.message) });

  await finishImportJob(jobId, { versionId: version.id, total: totalRows, processed: insertError ? 0 : rows.length, errors });
  revalidatePath('/admin/ncm/intervenciones');
  return {
    jobId,
    versionId: version.id,
    totalRows,
    processedRows: insertError ? 0 : rows.length,
    errorRows: errors.length,
    status: errors.length === 0 ? 'completed' : 'completed_with_errors',
    errorReport: errors,
  };
}

// ---------------------------------------------------------------------------
// Admin: NCM validation (per simulation item)
// ---------------------------------------------------------------------------

export async function validateNcmForItem(
  simulationItemId: string,
  simulationId: string,
  input: { status: 'validated' | 'rejected' | 'requires_review'; validatedNcmCode?: string; notes: string }
): Promise<{ error: string } | { ok: true }> {
  const admin = await requireAdmin();
  if (!input.notes.trim() && input.status !== 'validated') {
    return { error: 'El comentario técnico es obligatorio al rechazar o pedir revisión.' };
  }
  const supabase = await createClient();

  const itemNcmStatus = input.status === 'validated' ? 'validado_pjm' : input.status === 'rejected' ? 'requiere_revision' : 'requiere_revision';

  await supabase
    .from('simulation_items')
    .update({
      ncm_status: itemNcmStatus,
      ncm_code: input.validatedNcmCode || undefined,
      ncm_validation_notes: input.notes || null,
    })
    .eq('id', simulationItemId);

  const { data: item } = await supabase.from('simulation_items').select('ncm_code').eq('id', simulationItemId).maybeSingle();

  await supabase.from('ncm_validations').insert({
    simulation_id: simulationId,
    simulation_item_id: simulationItemId,
    proposed_ncm_code: item?.ncm_code ?? null,
    validated_ncm_code: input.validatedNcmCode || item?.ncm_code || null,
    status: input.status,
    validated_by: admin.id,
    validated_at: new Date().toISOString(),
    notes: input.notes || null,
  });

  // Roll up: simulation-level ncm_status mirrors the worst item status.
  const { data: items } = await supabase.from('simulation_items').select('ncm_status').eq('simulation_id', simulationId);
  const statuses = (items ?? []).map((i) => i.ncm_status);
  const overall = statuses.includes('requiere_revision')
    ? 'requiere_revision'
    : statuses.includes('pendiente_validacion')
      ? 'pendiente_validacion'
      : statuses.length > 0 && statuses.every((s) => s === 'validado_pjm')
        ? 'validado_pjm'
        : 'pendiente_validacion';
  await supabase.from('simulations').update({ ncm_status: overall }).eq('id', simulationId);

  revalidatePath(`/admin/solicitudes/${simulationId}`);
  revalidatePath(`/simulaciones/${simulationId}`);
  return { ok: true };
}
