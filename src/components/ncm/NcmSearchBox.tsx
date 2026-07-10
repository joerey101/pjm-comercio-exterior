'use client';

import { useEffect, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { searchNcmPositions, type NcmSearchResultDto } from '@/app/actions/ncm';
import { inputClass } from '@/components/ui/Field';
import { NcmResultList } from './NcmResultList';

export function NcmSearchBox({ onSelect }: { onSelect: (result: NcmSearchResultDto) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NcmSearchResultDto[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      return;
    }
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      searchNcmPositions(query)
        .then((r) => setResults(r))
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function handleQueryChange(next: string) {
    setQuery(next);
    if (next.trim().length < 2) setResults([]);
  }

  return (
    <div>
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        {loading && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />}
        <input
          className={inputClass + ' pl-9 pr-9'}
          placeholder="Buscar por código NCM (8471.30.12) o palabra clave (notebooks, textil...)"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
      </div>
      <div className="mt-2">
        <NcmResultList results={results} onSelect={onSelect} />
      </div>
      {query.trim().length >= 2 && !loading && results.length === 0 && (
        <p className="text-xs text-slate-400 mt-2">
          No encontramos posiciones activas para &ldquo;{query}&rdquo;. Podés cargar el código manualmente abajo.
        </p>
      )}
    </div>
  );
}
