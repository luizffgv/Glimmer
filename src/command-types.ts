import {
  ApplicationCommandType,
  ChatInputCommandInteraction,
  ContextMenuCommandBuilder,
  LocalizationMap,
  MessageContextMenuCommandInteraction,
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
  UserContextMenuCommandInteraction,
} from "discord.js";

/** A generic Discord command builder. */
export type CommandBuilder =
  | SlashCommandBuilder
  | SlashCommandSubcommandBuilder
  | ContextMenuCommandBuilder;

/** A generic command interaction. */
export type CommandInteraction =
  | ChatInputCommandInteraction
  | MessageContextMenuCommandInteraction
  | UserContextMenuCommandInteraction;

/** A generic handler for discord command interactions. */
export type CommandHandler<Interaction extends CommandInteraction> = (
  interaction: Interaction,
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

/**
 * Template construction parameters for {@link Command} and its subclasses.
 *
 * Unnecessary properties are removed with {@link Omit} (or {@link Pick}) and
 * some properties may have their types further specified with type
 * intersections.
 *
 * This ensures that all command constructors will have consistent parameters.
 */
export interface CommandConstructionOptionsTemplate<
  Interaction extends CommandInteraction = CommandInteraction,
> {
  /** Localizations for the name of the command. */
  nameLocalizations?: LocalizationMap;

  /** Description of the command. */
  description: string;
  /** Localizations for the description of the command. */
  descriptionLocalizations?: LocalizationMap;

  /** Options for the command. */
  options?: CommandOption[];

  /** Permissions a guild member needs to use the command. */
  memberPermissions?: Permissions | bigint | number;

  /**
   * Handler for the command. Will be called with the interaction as an argument
   * whenever a user executes the command.
   */
  handler: CommandHandler<Interaction>;
}

/** {@link Command} construction parameters. */
export type CommandConstructionOptions<Interaction extends CommandInteraction> =
  Pick<
    CommandConstructionOptionsTemplate<Interaction>,
    "nameLocalizations" | "handler"
  >;

/** {@link NormalCommand} construction parameters. */
export type NormalCommandConstructionOptions =
  CommandConstructionOptionsTemplate<ChatInputCommandInteraction>;

/** {@link CategoryCommand} construction parameters. */
export type CategoryCommandConstructionOptions = Omit<
  CommandConstructionOptionsTemplate,
  "options" | "handler"
>;

/** {@link SubCommand} construction parameters. */
export type SubCommandConstructionOptions = Omit<
  CommandConstructionOptionsTemplate<ChatInputCommandInteraction>,
  "permissions"
>;

/** {@link UserContextMenuCommand} construction parameters. */
export type UserContextMenuCommandConstructionOptions = Omit<
  CommandConstructionOptionsTemplate<UserContextMenuCommandInteraction>,
  "description" | "descriptionLocalizations"
>;

/** {@link MessageContextMenuCommand} construction parameters. */
export type MessageContextMenuCommandConstructionOptions = Omit<
  CommandConstructionOptionsTemplate<MessageContextMenuCommandInteraction>,
  "description" | "descriptionLocalizations"
>;

/** A Glimmer Discord command. */
export abstract class Command<
  Interaction extends CommandInteraction = CommandInteraction,
  Builder extends CommandBuilder = CommandBuilder,
> {
  /** Name of the command, will be automatically determined by Glimmer. */
  name: string = "";
  /** Localizations for the name of the command. */
  nameLocalizations?: LocalizationMap;

  /**
   * Handler for the command. Will be called with the interaction as an argument
   * whenever a user executes the command.
   */
  readonly handler: CommandHandler<Interaction>;

  /**
   * Constructs a {@link Command} with the given options.
   *
   * @param options - Options for the command.
   */
  protected constructor(options: CommandConstructionOptions<Interaction>) {
    ({ handler: this.handler } = options);

    if (options.nameLocalizations != undefined)
      this.nameLocalizations = options.nameLocalizations;
  }

  /**
   * Converts the command to a Discord command builder.
   *
   * @remarks
   *
   * You don't need to call this manually, as it'll be called by Glimmer.
   */
  abstract toDiscord(): Builder;
}

/** Specifies that a command requires the user to have permission to use it. */
export interface RequiresPermissions {
  /** Permissions a guild member needs to use the command. */
  memberPermissions: Permissions | bigint | number;
}

/**
 * A Glimmer Discord chat input command that is not a subcommand nor a category.
 *
 * The command's name will be set automatically when making a Glimmer module
 * from a directory.
 */
export class NormalCommand
  extends Command<ChatInputCommandInteraction, SlashCommandBuilder>
  implements RequiresPermissions
{
  /** Options for the command. */
  #options: CommandOption[];

  memberPermissions: Permissions | bigint | number;

  /** Description of the command. */
  description: string;
  /** Localizations for the description of the command. */
  descriptionLocalizations?: LocalizationMap;

  /**
   * Constructs a {@link NormalCommand} with the given options.
   *
   * @param options - Construction options for the command.
   */
  constructor(options: NormalCommandConstructionOptions) {
    super(options);

    this.description = options.description;
    if (options.descriptionLocalizations != undefined)
      this.descriptionLocalizations = options.descriptionLocalizations;

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
export class SubCommand extends Command<
  ChatInputCommandInteraction,
  SlashCommandSubcommandBuilder
> {
  /** Options for the command. */
  #options: CommandOption[];

  /** Description of the command. */
  description: string;
  /** Localizations for the description of the command. */
  descriptionLocalizations?: LocalizationMap;

  /*
   * Constructs a {@link SubCommand} with the given options.
   *
   * @param options - Construction options for the command.
   */
  constructor(options: SubCommandConstructionOptions) {
    super(options);

    this.description = options.description;
    if (options.descriptionLocalizations != undefined)
      this.descriptionLocalizations = options.descriptionLocalizations;

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
export class CategoryCommand
  extends Command<ChatInputCommandInteraction, SlashCommandBuilder>
  implements RequiresPermissions
{
  memberPermissions: Permissions | bigint | number;

  /** List of {@link SubCommand | subcommands} in the category. */
  subcommands: Record<string, SubCommand> = {};

  /** Description of the command. */
  description: string;
  /** Localizations for the description of the command. */
  descriptionLocalizations?: LocalizationMap;

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

    this.description = options.description;
    if (options.descriptionLocalizations != undefined)
      this.descriptionLocalizations = options.descriptionLocalizations;

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

/**
 * A Glimmer Discord user context menu command.
 *
 * The command's name will be set automatically when making a Glimmer module
 * from a directory.
 */
export class UserContextMenuCommand
  extends Command<UserContextMenuCommandInteraction, ContextMenuCommandBuilder>
  implements RequiresPermissions
{
  memberPermissions: Permissions | bigint | number;

  /**
   * Constructs a {@link UserContextMenuCommand} with the given parameters.
   *
   * @param options - Construction options for the command.
   */
  constructor(options: UserContextMenuCommandConstructionOptions) {
    super(options);

    this.memberPermissions = options.memberPermissions ?? 0;
  }

  toDiscord(): ContextMenuCommandBuilder {
    return new ContextMenuCommandBuilder()
      .setType(Number(ApplicationCommandType.Message))
      .setName(this.name)
      .setNameLocalizations(this.nameLocalizations ?? null)
      .setDefaultMemberPermissions(this.memberPermissions);
  }
}

/**
 * A Glimmer Discord message context menu command.
 *
 * The command's name will be set automatically when making a Glimmer module
 * from a directory.
 */
export class MessageContextMenuCommand
  extends Command<
    MessageContextMenuCommandInteraction,
    ContextMenuCommandBuilder
  >
  implements RequiresPermissions
{
  memberPermissions: Permissions | bigint | number;

  /**
   * Constructs a {@link MessageContextMenuCommand} with the given parameters.
   *
   * @param options - Construction options for the command.
   */
  constructor(options: MessageContextMenuCommandConstructionOptions) {
    super(options);

    this.memberPermissions = options.memberPermissions ?? 0;
  }

  toDiscord(): ContextMenuCommandBuilder {
    return new ContextMenuCommandBuilder()
      .setType(Number(ApplicationCommandType.Message))
      .setName(this.name)
      .setNameLocalizations(this.nameLocalizations ?? null)
      .setDefaultMemberPermissions(this.memberPermissions);
  }
}
