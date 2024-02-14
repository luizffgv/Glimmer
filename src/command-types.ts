import {
  ChatInputCommandInteraction,
  LocalizationMap,
  Permissions,
  SlashCommandAttachmentOption,
  SlashCommandBooleanOption,
  SlashCommandBuilder,
  SlashCommandChannelOption,
  SlashCommandIntegerOption,
  SlashCommandMentionableOption,
  SlashCommandNumberOption,
  SlashCommandRoleOption,
  SlashCommandStringOption,
  SlashCommandSubcommandBuilder,
  SlashCommandUserOption,
} from "discord.js";

/** A handler for a Discord command. */
export type CommandHandler = (
  interaction: ChatInputCommandInteraction,
) => Promise<void>;

/** All Discord command option types. */
export type CommandOption =
  | SlashCommandBooleanOption
  | SlashCommandUserOption
  | SlashCommandChannelOption
  | SlashCommandRoleOption
  | SlashCommandAttachmentOption
  | SlashCommandMentionableOption
  | SlashCommandStringOption
  | SlashCommandIntegerOption
  | SlashCommandNumberOption;

/**
 * Adds options to a Discord command.
 *
 * @param command - Discord command builder to add options to.
 * @param option - Option to add.
 */
function addOption(
  command: SlashCommandBuilder | SlashCommandSubcommandBuilder,
  option: CommandOption,
): void {
  if (option instanceof SlashCommandBooleanOption)
    command.addBooleanOption(option);
  else if (option instanceof SlashCommandUserOption)
    command.addUserOption(option);
  else if (option instanceof SlashCommandChannelOption)
    command.addChannelOption(option);
  else if (option instanceof SlashCommandRoleOption)
    command.addRoleOption(option);
  else if (option instanceof SlashCommandAttachmentOption)
    command.addAttachmentOption(option);
  else if (option instanceof SlashCommandMentionableOption)
    command.addMentionableOption(option);
  else if (option instanceof SlashCommandStringOption)
    command.addStringOption(option);
  else if (option instanceof SlashCommandIntegerOption)
    command.addIntegerOption(option);
  else command.addNumberOption(option);
}

/** {@link Command} construction parameters. */
export interface CommandConstructionOptions {
  /** Localizations for the name of the command. */
  nameLocalizations?: LocalizationMap;

  /** Description of the command. */
  description: string;
  /** Localizations for the description of the command. */
  descriptionLocalizations?: LocalizationMap;

  /** Options for the command. */
  options?: CommandOption[];

  /**
   * Handler for the command. Will be called with the interaction as an argument
   * whenever a user executes the command.
   */
  handler: CommandHandler;
}

/**
 * Additional permissions option for merging with
 * {@link CommandConstructionOptions}
 */
export interface PermissionsOption {
  /** Permissions a guild member needs to use the command. */
  memberPermissions?: Permissions | bigint | number;
}

/** {@link NormalCommand} construction parameters. */
export type NormalCommandConstructionOptions = CommandConstructionOptions &
  PermissionsOption;

/** {@link CategoryCommand} construction parameters. */
export type CategoryCommandConstructionOptions = Omit<
  CommandConstructionOptions,
  "options" | "handler"
> &
  PermissionsOption;

/** {@link SubCommand} construction parameters. */
export type SubCommandConstructionOptions = CommandConstructionOptions;

/** A Glimmer Discord command. */
export abstract class Command {
  /** Name of the command, will be automatically determined by Glimmer. */
  name: string = "";
  /** Localizations for the name of the command. */
  nameLocalizations?: LocalizationMap;

  /** Description of the command. */
  description: string;
  /** Localizations for the description of the command. */
  descriptionLocalizations?: LocalizationMap;

  /**
   * Handler for the command. Will be called with the interaction as an argument
   * whenever a user executes the command.
   */
  readonly handler: CommandHandler;

  /**
   * Constructs a {@link Command} with the given options.
   *
   * @param options - Options for the command.
   */
  protected constructor(options: CommandConstructionOptions) {
    ({ description: this.description, handler: this.handler } = options);

    if (options.nameLocalizations != undefined)
      this.nameLocalizations = options.nameLocalizations;

    if (options.descriptionLocalizations != undefined)
      this.descriptionLocalizations = options.descriptionLocalizations;
  }

  /**
   * Converts the command to a Discord command builder.
   *
   * @remarks
   *
   * You don't need to call this manually, as it'll be called by Glimmer.
   */
  abstract toDiscord(): SlashCommandBuilder | SlashCommandSubcommandBuilder;
}

/** A command that requires the user to have permission to use it. */
export interface CommandWithPermissions extends Command {
  /** Permissions a guild member needs to use the command. */
  memberPermissions: Permissions | bigint | number;
}

/**
 * A Glimmer Discord command that is not a subcommand nor a category.
 *
 * The command's name will be set automatically when making a Glimmer module
 * from a directory.
 */
export class NormalCommand extends Command implements CommandWithPermissions {
  /** Options for the command. */
  #options: CommandOption[];

  memberPermissions: Permissions | bigint | number;

  /**
   * Constructs a {@link NormalCommand} with the given options.
   *
   * @param options - Construction options for the command.
   */
  constructor(options: NormalCommandConstructionOptions) {
    super(options);

    this.memberPermissions = options.memberPermissions ?? 0;

    this.#options = options.options ?? [];
  }

  toDiscord(): SlashCommandBuilder {
    const builder = new SlashCommandBuilder();

    builder
      .setName(this.name)
      .setNameLocalizations(this.nameLocalizations ?? null)
      .setDescription(this.description)
      .setDescriptionLocalizations(this.descriptionLocalizations ?? null)
      .setDefaultMemberPermissions(this.memberPermissions);

    for (const option of this.#options) addOption(builder, option);

    return builder;
  }

  /**
   * Makes a {@link SubCommand} version of this command.
   *
   * The new {@link SubCommand | subcommand} will have no permission
   * requirements as {@link SubCommand | subcommands} can't have them.
   *
   * @remarks
   * You can use this when manipulating modules to move a command to a category.
   *
   * @returns {@link SubCommand} version of the command.
   */
  toSubCommand(): SubCommand {
    const parameters: SubCommandConstructionOptions = {
      description: this.description,
      handler: this.handler,
      options: this.#options,
    };

    if (this.nameLocalizations != undefined)
      parameters.nameLocalizations = this.nameLocalizations;
    if (this.descriptionLocalizations != undefined)
      parameters.descriptionLocalizations = this.descriptionLocalizations;

    const newCommand = new SubCommand(parameters);
    newCommand.name = this.name;

    return newCommand;
  }
}

/**
 * A Glimmer Discord command under a category.
 *
 * The subcommand's name will be set automatically when making a Glimmer module
 * from a directory.
 */
export class SubCommand extends Command {
  /** Options for the command. */
  #options: CommandOption[];

  /*
   * Constructs a {@link SubCommand} with the given options.
   *
   * @param options - Construction options for the command.
   */
  constructor(options: SubCommandConstructionOptions) {
    super(options);

    this.#options = options.options ?? [];
  }

  toDiscord(): SlashCommandSubcommandBuilder {
    const builder = new SlashCommandSubcommandBuilder();

    builder
      .setName(this.name)
      .setNameLocalizations(this.nameLocalizations ?? null)
      .setDescription(this.description)
      .setDescriptionLocalizations(this.descriptionLocalizations ?? null);

    for (const option of this.#options) addOption(builder, option);

    return builder;
  }

  /**
   * Makes a {@link NormalCommand} version of this subcommand.
   *
   * @remarks
   * You can use this when manipulating modules to move a subcommand out of a
   * category.
   *
   * @param memberPermissions - Permissions needed for using the new command.
   * @returns {@link NormalCommand} version of the subcommand.
   */
  toNormalCommand(
    memberPermissions?: Permissions | bigint | number,
  ): NormalCommand {
    const parameters: NormalCommandConstructionOptions = {
      description: this.description,
      handler: this.handler,
      options: this.#options,
    };

    if (this.nameLocalizations != undefined)
      parameters.nameLocalizations = this.nameLocalizations;
    if (this.descriptionLocalizations != undefined)
      parameters.descriptionLocalizations = this.descriptionLocalizations;
    if (memberPermissions != undefined)
      parameters.memberPermissions = memberPermissions;

    const newCommand = new NormalCommand(parameters);
    newCommand.name = this.name;

    return newCommand;
  }
}

/**
 * A Glimmer Discord command that is a category containing
 * {@link SubCommand | subcommands}.
 *
 * The category's name and subcommands will be set automatically when making a
 * Glimmer module from a directory.
 */
export class CategoryCommand extends Command implements CommandWithPermissions {
  memberPermissions: Permissions | bigint | number;

  /** List of {@link SubCommand | subcommands} in the category. */
  subcommands: Record<string, SubCommand> = {};

  /**
   * Constructs a {@link CategoryCommand} with the given parameters.
   *
   * The command handler will be automatically generated.
   *
   * @param options - Construction options for the command.
   */
  constructor(options: CategoryCommandConstructionOptions) {
    super({
      handler: async (
        interaction: ChatInputCommandInteraction,
      ): Promise<void> => {
        const subcommand = interaction.options.getSubcommand(true);
        const handler = this.subcommands[subcommand]?.handler;
        if (handler == undefined)
          console.warn(
            `Subcommand "${subcommand}" was called but category "${this.name}" has no handlers for it.`,
          );
        else await handler(interaction);
      },
      ...options,
    });

    this.memberPermissions = options.memberPermissions ?? 0;
  }

  toDiscord(): SlashCommandBuilder {
    const builder = new SlashCommandBuilder();

    builder
      .setName(this.name)
      .setNameLocalizations(this.nameLocalizations ?? null)
      .setDescription(this.description)
      .setDescriptionLocalizations(this.descriptionLocalizations ?? null)
      .setDefaultMemberPermissions(this.memberPermissions);

    for (const subcommand of Object.values(this.subcommands))
      builder.addSubcommand(subcommand.toDiscord());

    return builder;
  }
}
