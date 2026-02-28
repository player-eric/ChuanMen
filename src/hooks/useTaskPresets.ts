import { useEffect, useState } from 'react';
import { fetchTaskPresets, type TaskPresetRow } from '@/lib/domainApi';

/** Module-level cache so the fetch only happens once across all components */
let cache: Record<string, string[]> | null = null;
let fetching: Promise<Record<string, string[]>> | null = null;

function loadOnce(): Promise<Record<string, string[]>> {
  if (cache) return Promise.resolve(cache);
  if (fetching) return fetching;
  fetching = fetchTaskPresets()
    .then((rows) => {
      const map: Record<string, string[]> = {};
      for (const r of rows) map[r.tag] = r.roles;
      cache = map;
      return map;
    })
    .catch(() => { fetching = null; return {} as Record<string, string[]>; });
  return fetching;
}

/** Returns cached task presets as Record<tag, roles[]>. Fetches once on first use. */
export function useTaskPresets(): Record<string, string[]> {
  const [presets, setPresets] = useState<Record<string, string[]>>(cache ?? {});
  useEffect(() => {
    if (cache) { setPresets(cache); return; }
    loadOnce().then(setPresets);
  }, []);
  return presets;
}
