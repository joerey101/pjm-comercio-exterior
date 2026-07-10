import type { ChecklistCategory } from '@/types/documents';

export interface DefaultChecklistItem {
  key: string;
  label: string;
  category: ChecklistCategory;
  required: boolean;
  blocking: boolean;
}

/**
 * Seeded onto `simulation_checklist_items` the first time a simulation is
 * sent to PJM (see `createDefaultChecklistForSimulation` in
 * src/app/actions/checklist.ts). Blocking items must be approved before a
 * request can be marked ready_for_quote.
 */
export const DEFAULT_CHECKLIST_ITEMS: DefaultChecklistItem[] = [
  { key: 'invoice_cargada', label: 'Invoice cargada', category: 'documents', required: true, blocking: true },
  { key: 'invoice_numero_fecha', label: 'Invoice incluye número y fecha', category: 'documents', required: true, blocking: false },
  { key: 'invoice_cuit', label: 'Invoice incluye CUIT del importador', category: 'documents', required: true, blocking: false },
  { key: 'invoice_incoterm', label: 'Invoice incluye Incoterm', category: 'documents', required: true, blocking: false },
  { key: 'valor_fob_informado', label: 'Valor FOB informado', category: 'commercial', required: true, blocking: false },
  { key: 'packing_list_cargado', label: 'Packing list cargado', category: 'documents', required: true, blocking: true },
  { key: 'descripcion_suficiente', label: 'Descripción de mercadería suficiente', category: 'commercial', required: true, blocking: false },
  { key: 'ncm_por_item', label: 'NCM asociado a cada ítem', category: 'customs', required: true, blocking: false },
  { key: 'ncm_pendiente_o_validado', label: 'NCM pendiente o validado por PJM', category: 'customs', required: true, blocking: false },
  { key: 'pais_origen_informado', label: 'País de origen informado', category: 'commercial', required: true, blocking: false },
  { key: 'pais_fabricacion_informado', label: 'País de fabricación informado', category: 'commercial', required: true, blocking: false },
  { key: 'medio_transporte_informado', label: 'Medio de transporte informado', category: 'logistics', required: true, blocking: false },
  { key: 'puerto_origen_informado', label: 'Puerto/aeropuerto origen informado', category: 'logistics', required: true, blocking: false },
  { key: 'puerto_destino_informado', label: 'Puerto/aeropuerto destino informado', category: 'logistics', required: true, blocking: false },
  { key: 'flete_internacional_informado', label: 'Flete internacional informado', category: 'logistics', required: true, blocking: false },
  { key: 'seguro_informado', label: 'Seguro informado o expresamente no informado', category: 'logistics', required: true, blocking: false },
  { key: 'intervenciones_revisadas', label: 'Intervenciones revisadas', category: 'interventions', required: true, blocking: false },
  { key: 'autorizaciones_cargadas', label: 'Autorizaciones cargadas si corresponde', category: 'interventions', required: false, blocking: false },
  { key: 'bl_awb_cargado', label: 'BL/AWB cargado o pendiente justificado', category: 'documents', required: true, blocking: true },
  { key: 'despachante_asignado', label: 'Despachante asignado o pendiente', category: 'internal_pjm', required: false, blocking: false },
  { key: 'domicilio_destino_informado', label: 'Domicilio final de entrega informado', category: 'logistics', required: true, blocking: false },
  { key: 'gastos_locales_revisados', label: 'Gastos locales revisados', category: 'tax', required: true, blocking: false },
  { key: 'tipo_cambio_informado', label: 'Tipo de cambio informado', category: 'commercial', required: true, blocking: false },
  { key: 'disclaimer_aceptado', label: 'Disclaimer aceptado', category: 'commercial', required: true, blocking: false },
  { key: 'lista_para_revision_pjm', label: 'Solicitud lista para revisión PJM', category: 'internal_pjm', required: false, blocking: false },
];
