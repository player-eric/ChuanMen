import { useEffect, useState } from 'react';
import { fetchTitleRules, type TitleRuleRow } from '@/lib/domainApi';

/** Module-level cache so the fetch only happens once across all components */
let cache: TitleRuleRow[] | null = null;
let fetching: Promise<TitleRuleRow[]> | null = null;

function loadOnce(): Promise<TitleRuleRow[]> {
  if (cache) return Promise.resolve(cache);
  if (fetching) return fetching;
  fetching = fetchTitleRules()
    .then((data) => { cache = data; return data; })
    .catch(() => { fetching = null; return [] as TitleRuleRow[]; });
  return fetching;
}

/** Returns cached title rules (stamp→name mapping). Fetches once on first use. */
export function useTitleDefs(): TitleRuleRow[] {
  const [defs, setDefs] = useState<TitleRuleRow[]>(cache ?? []);
  useEffect(() => {
    if (cache) { setDefs(cache); return; }
    loadOnce().then(setDefs);
  }, []);
  return defs;
}
