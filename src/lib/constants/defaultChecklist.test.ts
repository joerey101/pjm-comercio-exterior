import { describe, expect, it } from 'vitest';
import { DEFAULT_CHECKLIST_ITEMS } from './defaultChecklist';

describe('DEFAULT_CHECKLIST_ITEMS', () => {
  it('has 25 items, matching the Sprint 3 spec', () => {
    expect(DEFAULT_CHECKLIST_ITEMS).toHaveLength(25);
  });

  it('has unique checklist_key values (unique constraint on simulation_checklist_items)', () => {
    const keys = DEFAULT_CHECKLIST_ITEMS.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('marks invoice, packing list and BL/AWB as blocking', () => {
    const blockingKeys = DEFAULT_CHECKLIST_ITEMS.filter((i) => i.blocking).map((i) => i.key);
    expect(blockingKeys).toEqual(['invoice_cargada', 'packing_list_cargado', 'bl_awb_cargado']);
  });

  it('every blocking item is also required', () => {
    expect(DEFAULT_CHECKLIST_ITEMS.filter((i) => i.blocking).every((i) => i.required)).toBe(true);
  });
});
