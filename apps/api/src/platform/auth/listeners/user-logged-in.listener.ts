// apps/api/src/platform/auth/listeners/user-logged-in.listener.ts
// A separate provider from AuthService on purpose — even though it's still
// inside platform/auth for this trivial demo (no other module exists yet to
// subscribe from), it proves the wiring is a genuine decoupled
// emit-then-listen call via EventEmitter2, not AuthService reaching into
// this logic directly. A real cross-module listener (e.g. inventory
// reacting to production's work-order.completed) follows this same
// @OnEvent() shape from inside its own module instead.
import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { AUTH_EVENTS, UserLoggedInEvent } from "../events/user-logged-in.event.js";

@Injectable()
export class UserLoggedInListener {
  private readonly logger = new Logger(UserLoggedInListener.name);

  @OnEvent(AUTH_EVENTS.USER_LOGGED_IN)
  handleUserLoggedIn(event: UserLoggedInEvent): void {
    this.logger.log({
      msg: "user logged in",
      userId: event.userId,
      organizationId: event.organizationId,
      occurredAt: event.occurredAt,
    });
  }
}
