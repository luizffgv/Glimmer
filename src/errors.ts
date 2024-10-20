import { Command, CommandBuilder, CommandInteraction } from "./command-types";

type GlimmerErrorParameters<
  TInteraction extends CommandInteraction,
  TBuilder extends CommandBuilder,
> = {
  command: Command<TInteraction, TBuilder>;
  interaction: TInteraction;
};

export class GlimmerError<
  TInteraction extends CommandInteraction = CommandInteraction,
  TBuilder extends CommandBuilder = CommandBuilder,
> extends Error {
  command: Command<TInteraction, TBuilder>;
  interaction: TInteraction;

  constructor({
    command,
    interaction,
  }: GlimmerErrorParameters<TInteraction, TBuilder>) {
    super();

    this.command = command;
    this.interaction = interaction;
  }
}
