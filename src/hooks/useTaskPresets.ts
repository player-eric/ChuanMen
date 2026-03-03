import { useEffect, useState } from 'react';
import { fetchTaskPresets, type TaskPresetRoleItem } from '@/lib/domainApi';

export interface PresetRole {
  role: string;
  description: string;
}

/** Normalize a role item (string or { role, description }) to PresetRole */
function normalizeRole(item: TaskPresetRoleItem): PresetRole {
  if (typeof item === 'string') return { role: item, description: '' };
  return { role: item.role, description: item.description ?? '' };
}

/** Module-level cache so the fetch only happens once across all components */
let cache: Record<string, PresetRole[]> | null = null;
let fetching: Promise<Record<string, PresetRole[]>> | null = null;

function loadOnce(): Promise<Record<string, PresetRole[]>> {
  if (cache) return Promise.resolve(cache);
  if (fetching) return fetching;
  fetching = fetchTaskPresets()
    .then((rows) => {
      const map: Record<string, PresetRole[]> = {};
      for (const r of rows) {
        const roles = Array.isArray(r.roles) ? r.roles : [];
        map[r.tag] = roles.map(normalizeRole);
      }
      cache = map;
      return map;
    })
    .catch(() => { fetching = null; return {} as Record<string, PresetRole[]>; });
  return fetching;
}

/** Returns cached task presets as Record<tag, PresetRole[]>. Fetches once on first use. */
export function useTaskPresets(): Record<string, PresetRole[]> {
  const [presets, setPresets] = useState<Record<string, PresetRole[]>>(cache ?? {});
  useEffect(() => {
    if (cache) { setPresets(cache); return; }
    loadOnce().then(setPresets);
  }, []);
  return presets;
}
