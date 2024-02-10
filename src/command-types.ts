import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
} from "discord.js";

/** A handler for a Discord command. */
export type CommandHandler = (
  interaction: ChatInputCommandInteraction,
) => Promise<void>;

/** A Glimmer Discord command. */
export abstract class Command {
  /**
   * Data about the command.
   *
   * @remarks
   * Glimmer will automatically set the command's default name to the name of
   * the module it's exported from.
   */
  data: SlashCommandBuilder | SlashCommandSubcommandBuilder;

  /**
   * Handler for the command. Will be called with the interaction as an argument
   * whenever a user executes the command.
   */
  handler: CommandHandler;

  /**
   * Constructs a {@link Command} with the given parameters.
   *
   * @param data - Metadata about the command.
   * @param handler - Handler for the command.
   */
  protected constructor(
    data: SlashCommandBuilder | SlashCommandSubcommandBuilder,
    handler: CommandHandler,
  ) {
    this.data = data;
    this.handler = handler;
  }
}

/**
 * A Glimmer Discord command that is not a subcommand nor a category.
 *
 * The command's name will be set automatically when making a Glimmer module
 * from a directory.
 */
export class NormalCommand extends Command {
  declare data: SlashCommandBuilder;

  /**
   * Constructs a {@link NormalCommand} with the given parameters.
   *
   * @param data - Metadata about the command.
   * @param handler - Handler for the command.
   */
  // typescript-eslint is stupid and thinks this constructor is useless because
  // all it does is refine the type and access modifier of the parent
  // constructor.
  // See https://github.com/typescript-eslint/typescript-eslint/issues/3820#issuecomment-917821240
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(data: SlashCommandBuilder, handler: CommandHandler) {
    super(data, handler);
  }
}

/**
 * A Glimmer Discord command under a category.
 *
 * The subcommand's name will be set automatically when making a Glimmer module
 * from a directory.
 */
export class SubCommand extends Command {
  declare data: SlashCommandSubcommandBuilder;

  /**
   * Constructs a {@link SubCommand} with the given parameters.
   *
   * @param data - Metadata about the subcommand.
   * @param handler - Handler for the subcommand.
   */
  // typescript-eslint is stupid and thinks this constructor is useless because
  // all it does is refine the type and access modifier of the parent
  // constructor.
  // See https://github.com/typescript-eslint/typescript-eslint/issues/3820#issuecomment-917821240
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(data: SlashCommandSubcommandBuilder, handler: CommandHandler) {
    super(data, handler);
  }
}

/**
 * A Glimmer Discord command that is a category containing
 * {@link SubCommand | subcommands}.
 *
 * The category's name and subcommands will be set automatically when making a
 * Glimmer module from a directory.
 */
export class CategoryCommand extends Command {
  subcommands: Record<string, SubCommand> = {};

  declare data: SlashCommandBuilder;

  /**
   * Constructs a {@link CategoryCommand} with the given parameters.
   *
   * The command handler will be automatically generated.
   *
   * @param data - Metadata about the category.
   */
  constructor(data: SlashCommandBuilder = new SlashCommandBuilder()) {
    super(data, async (interaction: ChatInputCommandInteraction) => {
      const subcommand = interaction.options.getSubcommand(true);
      const handler = this.subcommands[subcommand]?.handler;
      if (handler == undefined)
        console.warn(
          `Subcommand "${subcommand}" was called but category "${data.name}" has no handlers for it.`,
        );
      else await handler(interaction);
    });
  }
}
