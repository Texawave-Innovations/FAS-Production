// apps/api/src/platform/auth/events/user-logged-in.event.ts
// Trivial platform-level demo of the events/ convention documented in
// CODING_STANDARDS.md — proves EventEmitter2 wiring works end-to-end before
// any business module exists to use the real pattern (e.g.
// work-orders/events/work-order.created.event.ts).
export const AUTH_EVENTS = {
  USER_LOGGED_IN: "user.logged_in",
} as const;

export class UserLoggedInEvent {
  constructor(
    public readonly userId: number,
    public readonly organizationId: number,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
