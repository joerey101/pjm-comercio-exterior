import { requireUser } from '@/lib/dal';
import { SimulationWizard } from './SimulationWizard';

export default async function NuevaSimulacionPage() {
  await requireUser();
  return <SimulationWizard />;
}
