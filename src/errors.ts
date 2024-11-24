import { Command, CommandBuilder, CommandInteraction } from "./command-types";

type GlimmerErrorParameters<
  TInteraction extends CommandInteraction,
  TBuilder extends CommandBuilder,
> = {
  command: Command<TInteraction, TBuilder>;
  interaction: TInteraction;
  error: unknown;
};

export class GlimmerError<
  TInteraction extends CommandInteraction = CommandInteraction,
  TBuilder extends CommandBuilder = CommandBuilder,
> extends Error {
  command: Command<TInteraction, TBuilder>;
  interaction: TInteraction;
  error: unknown;

  constructor({
    command,
    interaction,
    error,
  }: GlimmerErrorParameters<TInteraction, TBuilder>) {
    super();

    this.command = command;
    this.interaction = interaction;
    this.error = error;
  }
}
