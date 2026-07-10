'use client';

import { useState } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function DocumentPreviewLink({ filePath }: { filePath: string }) {
  const [loading, setLoading] = useState(false);

  async function open() {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage.from('simulation-documents').createSignedUrl(filePath, 60);
      if (!error && data) window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button type="button" onClick={open} disabled={loading} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline disabled:opacity-50">
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
      Ver documento
    </button>
  );
}
