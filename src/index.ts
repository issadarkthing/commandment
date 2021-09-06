import chalk from "chalk";
import { oneLine } from "common-tags";
import { Message } from "discord.js";
import fs from "fs";
import path from "path";
import util from "util";
import { sha1 } from "./utils";
import { performance } from "perf_hooks";

/**
 * Command is abstract class that should be extended to make your own custom
 * command. It is also need to be exported as default when using
 * `registerCommands`.
 * */
export abstract class Command {
  /** Command name. This will be used to identify command. */
  abstract name: string;
  /**
   * Array of aliases for the command. This is optional, you can omit this if
   * you don't want any aliases for a particular command.
   * */
  aliases: string[] = [];
  /**
   * Blocks command if there's already an instance of it running under the same
   * user
   * */
  block = false;

  /** This is where your main logic should reside for a particular command. */
  abstract exec(msg: Message, args: string[]): unknown | Promise<unknown>;
}

interface CommandLog {
  name: string;
  aliases: string[];
  timeTaken: number;
}

const readdir = util.promisify(fs.readdir);

/** CommandManager stores all your commands */
export class CommandManager {
  private commands = new Map<string, Command>();
  private blockList = new Set<string>();
  private commandRegisterLog: CommandLog[] = [];
  /** Show command logging */
  verbose = false;
  /** Bot's prefix */
  public prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  /** Register a singular command */
  registerCommand(name: string, cmd: Command) {
    if (this.commands.has(name)) {
      throw new Error(`command "${name}" has already been defined`);
    }

    this.commands.set(name, cmd);
  }

  /**
   * Register commands from the whole directory. All command files should
   * default export the Command class.
   *
   * @example
   * const commandManager = new CommandManager("!");
   * commandManager.registerCommands(path.join(__dirname, "./commands"));
   * */
  async registerCommands(dir: string) {
    this.verbose &&
      console.log(`=== ${chalk.blue("Registering command(s)")} ===`);

    const files = await readdir(dir);
    const initial = performance.now();
    for (const file of files) {
      const initial = performance.now();
      const filePath = path.join(dir, file);
      // eslint-disable-next-line
      const cmdFile = require(filePath);
      const command: Command = new cmdFile.default();
      const now = performance.now();
      const timeTaken = now - initial;

      this.commandRegisterLog.push({
        name: command.name,
        aliases: command.aliases,
        timeTaken,
      })

      this.registerCommand(command.name, command);
      command.aliases.forEach(alias => this.registerCommand(alias, command));
    }

    const now = performance.now();
    const timeTaken = (now - initial).toFixed(4);

    if (this.verbose) {
      this.commandRegisterLog.sort((a, b) => b.timeTaken - a.timeTaken);

      for (const log of this.commandRegisterLog) {
        const timeTaken = log.timeTaken.toFixed(4);
        const aliases = log.aliases.join(", ");
        console.log(
          `${chalk.yellow(`[${timeTaken} ms]`)} ${log.name}\t\t${aliases}`
        );
      }

      const commandCount = this.commandRegisterLog.length;
      console.log(
        oneLine`Loading ${chalk.green(commandCount)} command(s) took
        ${chalk.yellow(timeTaken, "ms")}`
      );
    }
  }

  /** This should be attached to the "messageCreate" event */
  async handleMessage(msg: Message) {
    const words = msg.content.split(' ');
    const cmd = words[0];
    const args = words.slice(1);

    if (!cmd.startsWith(this.prefix) || msg.author.bot) return;

    const command = this.commands.get(cmd.replace(this.prefix, ""));
    if (!command)
      return;

    try {
      const initial = performance.now();
      const printTimeTaken = () => {
        const timeTaken = (performance.now() - initial).toFixed(4);
        this.verbose && console.log(
          oneLine`${chalk.blue(command.name)} command took
          ${chalk.yellow(timeTaken, "ms")} to complete`
        )
      }

      if (command.block) {
        const id = `${command.name}_${msg.author.id}`;
        if (this.blockList.has(id)) {
          msg.channel.send(
            `There's already an instance of ${command.name} command running`
          );
        } else {
          this.blockList.add(id);
          await command.exec(msg, args);
          this.blockList.delete(id);
          printTimeTaken();
        }
        return;
      }

      await command.exec(msg, args);
      printTimeTaken();

    } catch (err) {
      const commandName = command.name;
      const argList = args.join(", ");
      const time = (new Date()).toString();
      const stackTrace = (err as Error).stack!;
      const checksum = sha1(stackTrace);

      console.error(chalk.red("=== Error ==="));
      console.error(chalk.yellow("Command:"), commandName);
      console.error(chalk.yellow("Args:"), argList);
      console.error(chalk.yellow("Time:"), chalk.magenta(time));
      console.error(chalk.yellow("Checksum:"), checksum);
      console.error(chalk.yellow("Caused by:"), msg.author.username);
      console.error(err)

    }
  }
}
