import { readdir } from "node:fs/promises";
import * as path from "node:path";
import {
  CategoryCommand,
  Command,
  NormalCommand,
  SubCommand,
} from "./command-types.js";
import { EventHandler } from "./events.js";
import { ClientEvents } from "discord.js";

/**
 * Creates an error message for when a module doesn't default-export a value
 * of the expected Glimmer type.
 *
 * @param file - Module path.
 * @param requiredType - Expected type of the default-exported value.
 * @returns Error message.
 */
function wrongExportMessage(file: string, requiredType: string): string {
  return `Module in "${file}" doesn't default-export an instance of ${requiredType}. Maybe it's using another version of Glimmer? If so, you need to dedupe the Glimmer package.`;
}

/**
 * A Glimmer module for integrating with a Glimmer bot.
 *
 * You can create a {@link Module} from a directory using {@link fromDirectory}.
 */
export class Module {
  /**
   * Creates a Glimmer module from a given directory.
   *
   * - **To add a command:**
   *   Add an ES module in the commands/ subdirectory and default-export a
   *   {@link NormalCommand} in it. The command's default name is the name of
   *   the module without extensions.
   * ---
   * - **To add a command category:**
   *   Add an ES module in the commands/ subdirectory and default-export a
   *   {@link CategoryCommand} in it. The category's default name is the name
   *   of the module without extensions.
   * ---
   * - **To add subcommands inside a category:**
   *   Add a subdirectory in the commands/ subdirectory and name it like the
   *   category's ES module without extensions. Inside that subdirectory you'll
   *   add an ES module for each command like you'd do with normal commands, but
   *   in this case they will each export a {@link SubCommand}.
   * ---
   * - **To add an event handler:**
   *   Add an ES module in the events/ subdirectory and default-export an
   *   {@link EventHandler} in it. The file name (excluding extensions) should
   *   be equal to the event that the handler handles.
   *
   * @param directory - Path to the directory.
   */
  static async fromDirectory(directory: string): Promise<Module> {
    /**
     * Gets a command from a file, automatically setting the command name and
     * its subcommands.
     *
     * @param file - File to get the command from.
     * @returns A {@link Command}.
     */
    async function fileToCommand(file: string): Promise<Command> {
      const { default: command } = (await import(file)) as { default: unknown };

      if (command instanceof Command) {
        command.name = path.parse(file).name;

        if (command instanceof CategoryCommand) {
          const { dir, name } = path.parse(file);
          const dirname = path.join(dir, name);

          const subcommandFiles = await readdir(dirname).catch((error) => {
            throw new TypeError(
              `Couldn't read subcommands in "${dirname}": ${error}`,
              { cause: error },
            );
          });

          await Promise.all(
            subcommandFiles
              .map((subcommandFile) => path.join(dirname, subcommandFile))
              .map(async (subcommandFile) => {
                const subcommand = await fileToCommand(subcommandFile);

                if (subcommand instanceof SubCommand)
                  command.subcommands[subcommand.name] = subcommand;
                else
                  throw new Error(
                    wrongExportMessage(subcommandFile, SubCommand.name),
                  );
              }),
          );
        }
      } else {
        throw new TypeError(wrongExportMessage(file, Command.name));
      }

      return command;
    }

    /**
     * Gets an event handler from a file.
     *
     * @param file - File to get the event handler from.
     * @returns An {@link EventHandler}.
     */
    async function fileToEventHandler(
      file: string,
    ): Promise<EventHandler<keyof ClientEvents>> {
      const { default: handler } = (await import(file)) as { default: unknown };

      if (handler instanceof EventHandler) {
        const fileName = path.parse(file).name;
        if (handler.eventType != fileName)
          throw new TypeError(
            `EventHandler exported in "${file}" handles the ${handler.eventType} event, but has the file name of another event: "${fileName}".`,
          );
        return handler;
      } else throw new TypeError(wrongExportMessage(file, EventHandler.name));
    }

    const commandsDirectory = path.join(directory, "commands");
    const commandFiles = await readdir(commandsDirectory);
    const commandFilePaths = commandFiles
      .filter((file) => file.endsWith(".js"))
      .map((file) => path.join(commandsDirectory, file));

    const commands = await Promise.all(
      commandFilePaths.map((path) => fileToCommand(path)),
    );

    const eventsDirectory = path.join(directory, "events");
    const eventFiles = await readdir(eventsDirectory);
    const eventFilePaths = eventFiles
      .filter((file) => file.endsWith(".js"))
      .map((file) => path.join(eventsDirectory, file));

    const events = await Promise.all(
      eventFilePaths.map((path) => fileToEventHandler(path)),
    );

    return new Module(
      commands.filter(
        (command): command is NormalCommand | CategoryCommand =>
          command instanceof NormalCommand ||
          command instanceof CategoryCommand,
      ),
      events,
    );
  }

  /** List of top-level commands. */
  commands: (NormalCommand | CategoryCommand)[];

  /** List of all event handlers. */
  events: EventHandler<keyof ClientEvents>[];

  /**
   * Creates a {@link Module | Glimmer module} with the specified contents.
   *
   * @param commands - List of top-level commands.
   * @param eventHandlers - List of event handlers.
   */
  private constructor(
    commands: (NormalCommand | CategoryCommand)[],
    eventHandlers: EventHandler<keyof ClientEvents>[],
  ) {
    this.commands = commands;
    this.events = eventHandlers;
  }
}
