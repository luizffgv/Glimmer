import { readdir } from "node:fs/promises";
import * as path from "node:path";
import {
  CategoryCommand,
  Command,
  NormalCommand,
  SubCommand,
} from "./command-types.js";

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
   *   Add an ES module in the given directory and default-export a
   *   {@link NormalCommand} in it. The command's default name is the name of
   *   the module without extensions.
   * ---
   * - **To add a command category:**
   *   Add an ES module in the given directory and default-export a
   *   {@link CategoryCommand} in it. The category's default name is the name
   *   of the module without extensions.
   * ---
   * - **To add subcommands inside a category:**
   *   Add a subdirectory in the given directory and name it like the category's
   *   ES module without extensions. Inside that subdirectory you'll add an ES
   *   module for each command like you'd do with normal commands, but in this
   *   case they will each export a {@link SubCommand}.
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
        command.data.setName(path.parse(file).name);

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
                if (subcommand instanceof SubCommand) {
                  command.data.addSubcommand(subcommand.data);
                  command.subcommands[subcommand.data.name] = subcommand;
                } else
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

    const files = await readdir(directory);
    const filePaths = files
      .filter((file) => file.endsWith(".js"))
      .map((file) => path.join(directory, file));

    const commands = await Promise.all(
      filePaths.map((path) => fileToCommand(path)),
    );

    return {
      commands: commands.filter(
        (command): command is NormalCommand | CategoryCommand =>
          command instanceof NormalCommand ||
          command instanceof CategoryCommand,
      ),
    };
  }

  /** List of top-level commands. */
  commands: (NormalCommand | CategoryCommand)[];

  /**
   * Creates a {@link Module | Glimmer module} with the specified contents.
   *
   * @param commands - List of top-level commands.
   */
  private constructor(commands: (NormalCommand | CategoryCommand)[]) {
    this.commands = commands;
  }
}
