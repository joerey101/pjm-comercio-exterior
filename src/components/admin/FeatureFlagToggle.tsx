'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toggleFeatureFlag } from '@/app/actions/integrations';
import type { FeatureFlagKey } from '@/types/integrations';

export function FeatureFlagToggle({ flagKey, enabled, description }: { flagKey: FeatureFlagKey; enabled: boolean; description: string | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex items-center justify-between gap-4 py-2.5 border-b border-slate-100 last:border-0 cursor-pointer">
      <div>
        <p className="text-sm font-semibold text-slate-800">{flagKey}</p>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <input
        type="checkbox"
        checked={enabled}
        disabled={isPending}
        onChange={(e) =>
          startTransition(async () => {
            await toggleFeatureFlag(flagKey, e.target.checked);
            router.refresh();
          })
        }
        className="w-5 h-5 accent-indigo-600 cursor-pointer"
      />
    </label>
  );
}
