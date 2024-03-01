import { Awaitable, ClientEvents } from "discord.js";

/** A Glimmer event handler. */
export class EventHandler<EventType extends keyof ClientEvents> {
  /** Type of event this handler is supposed to handle. */
  eventType: EventType;

  /** Function for handling a Discord event. */
  handler: (...arguments_: ClientEvents[EventType]) => Awaitable<void>;

  /**
   * Creates a new Glimmer event handler.
   *
   * @param handler - Function for handling a Discord event.
   */
  constructor(
    eventType: EventType,
    handler: (...arguments_: ClientEvents[EventType]) => Awaitable<void>,
  ) {
    this.eventType = eventType;
    this.handler = handler;
  }
}
