import type { MerchandiseItem } from '@/types/simulation';
import type { CargoItem } from '@/types/logistics';

/**
 * Adapts a merchandise line into the calculator's CargoItem shape so the
 * logistics engine (CBM / chargeable weight) can be reused as-is: packages
 * become "qty" of identically-dimensioned units, and per-package weight is
 * derived by spreading the item's total gross weight across its packages.
 */
export function merchandiseToCargoItem(item: MerchandiseItem): CargoItem {
  const packages = item.packages > 0 ? item.packages : 1;
  return {
    id: item.id,
    name: item.description || 'Ítem sin descripción',
    qty: packages,
    lengthCm: item.lengthCm,
    widthCm: item.widthCm,
    heightCm: item.heightCm,
    weightKg: item.grossWeightKg / packages,
  };
}

export function totalFobValue(items: MerchandiseItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitValue, 0);
}

export function totalUnits(items: MerchandiseItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}
