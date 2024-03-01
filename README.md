# Glimmer

Glimmer is a simple Discord bot framework built around
[discord.js](https://discord.js.org/).

## Documentation

You can generate documentation by running the `docs` NPM script.

## Using Glimmer

To use Glimmer you must add it as a dependency, then create a `Glimmer` instance
and add modules to it (you can use `.addModules()`). As a last step, `.start()`
it.

## Modules

Glimmer is modular. This means someone can make a package containing a Glimmer
module and you can easily import its functionality into a Glimmer bot.

A Glimmer module currently supplies commands, categories of commands, and event
handlers. To create a Glimmer module, check the documentation for the `Module`
class.
