'use client';

import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export function PrintButton() {
  return (
    <Button type="button" variant="secondary" onClick={() => window.print()} className="no-print">
      <Printer className="w-4 h-4" />
      Imprimir / Guardar PDF
    </Button>
  );
}
