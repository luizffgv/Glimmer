import { Client, ClientOptions, REST, Routes } from "discord.js";
import {
  CategoryCommand,
  Command,
  MessageContextMenuCommand,
  NormalCommand,
  UserContextMenuCommand,
} from "./command-types.js";
import { Module } from "./module.js";

export * from "./command-types.js";
export * from "./events.js";
export * from "./module.js";

/** {@link Glimmer} construction parameters. */
export interface GlimmerOptions {
  /** Discord application ID. */
  applicationId: string;
  /** Discord bot token. */
  token: string;
  /** Discord client options. */
  clientOptions: ClientOptions;
}

/**
 * A Glimmer Discord bot.
 *
 * To add Glimmer modules to the bot, use the {@link addModules} method.
 * You must call {@link refreshCommands} to send command metadata to Discord.
 *
 * @example
 * ```js
 * const bot = new Glimmer({
 *   applicationID: APPLICATION_ID,
 *   token: BOT_TOKEN,
 *   clientOptions: {
 *     intents: [],
 *   }
 * });
 *
 * bot.addModules(await Module.fromDirectory("modules/basic-commands"));
 * bot.refreshCommands();
 * bot.start();
 * ```
 */
export class Glimmer {
  #token: string;
  #applicationId: string;
  #client: Client;
  #textInputCommands: Record<string, NormalCommand | CategoryCommand> = {};
  #userContextMenuCommands: Record<string, UserContextMenuCommand> = {};
  #messageContextMenuCommands: Record<string, MessageContextMenuCommand> = {};

  /**
   * Creates a new {@link Glimmer} instance.
   *
   * @param options - Construction parameters.
   */
  constructor(options: GlimmerOptions) {
    this.#client = new Client(options.clientOptions);

    ({ applicationId: this.#applicationId, token: this.#token } = options);

    this.#client.on("ready", () => {
      console.log("Glimmer bot ready");
    });

    this.#client.on("interactionCreate", async (interaction) => {
      if (interaction.isChatInputCommand()) {
        const { [interaction.commandName]: command } = this.#textInputCommands;
        if (command == undefined) {
          console.warn(
            `Received a "${interaction.commandName}" chat input command, but there is no handler for it.`,
          );
        } else await command.handler(interaction);
      } else if (interaction.isUserContextMenuCommand()) {
        const { [interaction.commandName]: command } =
          this.#userContextMenuCommands;
        if (command == undefined) {
          console.warn(
            `Received a "${interaction.commandName}" user context menu command, but there is no handler for it.`,
          );
        } else await command.handler(interaction);
      } else if (interaction.isMessageContextMenuCommand()) {
        const { [interaction.commandName]: command } =
          this.#messageContextMenuCommands;
        if (command == undefined) {
          console.warn(
            `Received a "${interaction.commandName}" message context menu command, but there is no handler for it.`,
          );
        } else await command.handler(interaction);
      }
    });
  }

  /** Starts the bot. */
  async start(): Promise<void> {
    await this.#client.login(this.#token);
  }

  /** Adds the selected Glimmer modules to the bot. */
  addModules(...modules: Module[]): void {
    for (const module of modules) {
      for (const command of module.commands) {
        if (
          command instanceof NormalCommand ||
          command instanceof CategoryCommand
        ) {
          if (command.name in this.#textInputCommands)
            console.warn(`Overriding text input command "${command.name}"`);
          this.#textInputCommands[command.name] = command;
        } else if (command instanceof MessageContextMenuCommand) {
          if (command.name in this.#messageContextMenuCommands)
            console.warn(
              `Overriding message context menu command "${command.name}"`,
            );
          this.#messageContextMenuCommands[command.name] = command;
        } else if (command instanceof UserContextMenuCommand) {
          if (command.name in this.#userContextMenuCommands)
            console.warn(
              `Overriding message context menu command "${command.name}"`,
            );
          this.#userContextMenuCommands[command.name] = command;
        }
      }

      for (const event of module.events)
        this.#client.on(event.eventType, event.handler);
    }
  }

  /** Updates Discord with the current list of commands. */
  async refreshCommands(): Promise<void> {
    const rest = new REST({ version: "10" }).setToken(this.#token);

    await rest.put(Routes.applicationCommands(this.#applicationId), {
      body: [
        this.#textInputCommands,
        this.#userContextMenuCommands,
        this.#messageContextMenuCommands,
      ].flatMap((commands) =>
        Object.values(commands).map((command: Command) => command.toDiscord()),
      ),
    });
  }
}
