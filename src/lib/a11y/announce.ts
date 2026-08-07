/**
 * Feed for the one polite live region (SPEC §8.5). Anything with something to
 * announce — structural commits, the multi-tab notice — calls announce();
 * the live region itself is ticket 12's, and registers here when it mounts.
 * Until then announcements drop silently, which is the correct behavior for
 * a surface that doesn't exist yet: polite, never queued, never assertive.
 */

type AnnounceSink = (message: string) => void;

let sink: AnnounceSink | null = null;

/** The live region registers itself (null to unregister on unmount). */
export function setAnnouncer(next: AnnounceSink | null): void {
	sink = next;
}

/** Announce a message politely; a no-op while no live region is mounted. */
export function announce(message: string): void {
	sink?.(message);
}
