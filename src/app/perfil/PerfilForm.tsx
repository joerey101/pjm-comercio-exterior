'use client';

import { useActionState } from 'react';
import { updateCompany, type CompanyFormState } from '@/app/actions/company';
import { Field, inputClass, selectClass, textareaClass } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { ProfileRow, CompanyRow } from '@/types/database';

export function PerfilForm({ profile, company }: { profile: ProfileRow; company: CompanyRow | null }) {
  const [state, action, pending] = useActionState<CompanyFormState, FormData>(updateCompany, undefined);

  return (
    <form action={action} className="space-y-6">
      <Card step={1} title="Tus datos">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nombre y apellido" htmlFor="fullName">
            <input id="fullName" name="fullName" defaultValue={profile.full_name} className={inputClass} />
          </Field>
          <Field label="Email" htmlFor="email">
            <input id="email" name="email" defaultValue={profile.email} disabled className={inputClass + ' bg-slate-100 text-slate-500'} />
          </Field>
          <Field label="Teléfono" htmlFor="phone">
            <input id="phone" name="phone" defaultValue={profile.phone ?? ''} className={inputClass} />
          </Field>
          <Field label="WhatsApp" htmlFor="whatsapp">
            <input id="whatsapp" name="whatsapp" defaultValue={profile.whatsapp ?? ''} className={inputClass} />
          </Field>
        </div>
      </Card>

      <Card step={2} title="Tu empresa">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Razón social" htmlFor="businessName">
            <input id="businessName" name="businessName" defaultValue={company?.business_name ?? ''} className={inputClass} />
          </Field>
          <Field label="CUIT" htmlFor="cuit">
            <input id="cuit" name="cuit" defaultValue={company?.cuit ?? ''} className={inputClass} />
          </Field>
          <Field label="Condición fiscal" htmlFor="taxCondition">
            <select id="taxCondition" name="taxCondition" defaultValue={company?.tax_condition ?? ''} className={selectClass}>
              <option value="">Seleccioná una opción</option>
              <option value="responsable_inscripto">Responsable Inscripto</option>
              <option value="monotributista">Monotributista</option>
              <option value="exento">Exento</option>
              <option value="consumidor_final">Consumidor Final</option>
            </select>
          </Field>
          <Field label="Domicilio" htmlFor="address">
            <input id="address" name="address" defaultValue={company?.address ?? ''} className={inputClass} />
          </Field>
          <Field label="Actividad / rubro" htmlFor="industry">
            <input id="industry" name="industry" defaultValue={company?.industry ?? ''} className={inputClass} />
          </Field>
          <Field label="Frecuencia estimada de importación" htmlFor="importFrequency">
            <select
              id="importFrequency"
              name="importFrequency"
              defaultValue={company?.import_frequency ?? ''}
              className={selectClass}
            >
              <option value="">Seleccioná una opción</option>
              <option value="primera_vez">Es mi primera importación</option>
              <option value="ocasional">Ocasional (algunas veces al año)</option>
              <option value="mensual">Mensual</option>
              <option value="semanal">Semanal o más frecuente</option>
            </select>
          </Field>
          <Field label="Modalidad habitual" htmlFor="usualTransportMode">
            <select
              id="usualTransportMode"
              name="usualTransportMode"
              defaultValue={company?.usual_transport_mode ?? ''}
              className={selectClass}
            >
              <option value="">Seleccioná una opción</option>
              <option value="maritima">Marítima</option>
              <option value="aerea">Aérea</option>
              <option value="terrestre">Terrestre</option>
              <option value="mixta">Mixta / no lo sé aún</option>
            </select>
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Productos que suele importar" htmlFor="usualProducts">
            <textarea
              id="usualProducts"
              name="usualProducts"
              rows={2}
              defaultValue={company?.usual_products ?? ''}
              className={textareaClass}
            />
          </Field>
        </div>
      </Card>

      {state?.message && <p className="text-sm font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg p-3">{state.message}</p>}
      {state?.error && <p className="text-sm font-medium text-rose-700 bg-rose-50 border border-rose-100 rounded-lg p-3">{state.error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar perfil'}
      </Button>
    </form>
  );
}
