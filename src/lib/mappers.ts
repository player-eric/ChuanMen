/**
 * Shared data mappers — Single Source of Truth for entity mapping.
 *
 * ALL data mapping in loaders/components MUST use these functions.
 * Never manually construct { name: x.name, avatar: x.avatar } inline.
 * When a field is missing from the UI, fix the mapper — not the call site.
 */

/** Map a raw user-like object to standard { id, name, avatar } shape */
export function mapUser(raw: any): { id: string; name: string; avatar?: string } {
  if (!raw) return { id: '', name: '?', avatar: undefined };
  return {
    id: raw.id ?? '',
    name: raw.name ?? '?',
    avatar: raw.avatar ?? undefined,
  };
}

/** Map a list of objects with nested .user to user brief array */
export function mapUsers(
  list: any[],
  userKey = 'user',
): { id: string; name: string; avatar?: string }[] {
  return (list ?? [])
    .map((item) => mapUser(item[userKey] ?? item))
    .filter((u) => u.name !== '?');
}

/** Map a list to { name, avatar } array (for AvaStack display) */
export function mapPeople(
  list: any[],
  userKey = 'user',
): { name: string; avatar?: string }[] {
  return mapUsers(list, userKey).map(({ name, avatar }) => ({ name, avatar }));
}
