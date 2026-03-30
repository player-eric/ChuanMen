/**
 * Check if a user can see a private event.
 * Returns true if user is allowed to see the event.
 *
 * Rules:
 * - Non-private events are always visible (returns true)
 * - Private events are visible only to: host, co-hosts, and signups (any non-cancelled status)
 * - If no userId provided, private events are hidden
 */
export function canSeeEvent(event: any, userId: string | undefined): boolean {
  // Not private → always visible
  if (!event.isPrivate) return true;
  // Private + no user → hidden
  if (!userId) return false;
  // Host can always see
  if (event.hostId === userId) return true;
  // Co-host can see
  if (event.coHosts?.some((ch: any) => ch.userId === userId)) return true;
  // Signup (any active status) can see
  if (event.signups?.some((s: any) => s.userId === userId)) return true;
  return false;
}

/**
 * Check if a user can see a postcard linked to a private event.
 * If postcard has no event link, it's always visible.
 * If linked event is private, only participants can see.
 */
export function canSeePostcard(postcard: any, userId: string | undefined): boolean {
  if (!postcard.event) return true;
  return canSeeEvent(postcard.event, userId);
}

/**
 * Check if a user can see a screened movie event.
 * For movies' screenedEvents list, filter out private events the user can't see.
 */
export function canSeeScreenedEvent(screenedEvent: any, userId: string | undefined): boolean {
  if (!screenedEvent.event) return true;
  return canSeeEvent(screenedEvent.event, userId);
}
