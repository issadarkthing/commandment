import chalk from "chalk";
import { oneLine } from "common-tags";
import { Message } from "discord.js";
import fs from "fs";
import path from "path";
import util from "util";
import { sha1 } from "./utils";
import { performance } from "perf_hooks";
import { Command } from "./Command";

interface CommandLog {
  name: string;
  aliases: string[];
  timeTaken: number;
}

const readdir = util.promisify(fs.readdir);

/** 
 * CommandManager stores all your commands 
 * @class
 * */
export class CommandManager {
  private commands = new Map<string, Command>();
  private blockList = new Set<string>();
  private throttleList = new Map<string, number>();
  private commandRegisterLog: CommandLog[] = [];
  private commandNotFoundHandler?: (msg: Message, name: string) => void;
  private commandOnThrottleHandler?: (
    msg: Message,
    command: Command,
    timeLeft: number
  ) => void;
  /**
   * Show command logging
   * @member {boolean} verbose
   * */
  verbose = false;
  /**
   * Bot's prefix
   * @member {string} prefix
   * */
  public prefix: string;

  /**
   * @param {string} prefix - The bot's prefix
   * */
  constructor(prefix: string) {
    this.prefix = prefix;
  }

  /**
   * Register a singular command
   * @param {string} name - The name of the command
   * @param {Command} cmd - The subclass of Command
   * */
  registerCommand(name: string, cmd: Command) {
    if (this.commands.has(name)) {
      throw new Error(`command "${name}" has already been defined`);
    }

    this.commands.set(name, cmd);
  }

  /**
   * Register handler for command not found error. By default, the error will be
   * ignored.
   * @param {Function} fn - Function to be executed when command not found error
   * occurs
   * */
  registerCommandNotFoundHandler(fn: (msg: Message, cmdName: string) => void) {
    this.commandNotFoundHandler = fn;
  }

  /**
   * Register handler for command is on throttle. By default, the command will
   * continue be blocked without any message.
   * @param {Function} fn - Function to be executed when command is on throttle
   * */
  registerCommandOnThrottleHandler(
    fn: (msg: Message, cmd: Command, timeLeft: number) => void,
  ) {
    this.commandOnThrottleHandler = fn;
  }

  /**
   * Register commands from the whole directory. All command files should
   * default export the Command class.
   *
   * @param {string} dir - Directory where all the command files reside.
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
      // skip .d.ts files
      if (file.endsWith(".d.ts")) continue;

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
      });

      this.registerCommand(command.name, command);
      command.aliases.forEach((alias) => this.registerCommand(alias, command));
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

  /**
   * This should be attached to the "messageCreate" event
   * @param {Message} msg - discord's Message object
   * */
  async handleMessage(msg: Message) {
    const words = msg.content.split(" ");
    const cmd = words[0];
    const args = words.slice(1);

    if (!cmd.startsWith(this.prefix) || msg.author.bot) return;

    const commandName = cmd.replace(this.prefix, "");
    const command = this.commands.get(commandName);
    if (!command) {
      this.commandNotFoundHandler &&
        this.commandNotFoundHandler(msg, commandName);
      return;
    }

    if (command.throttle !== 0) {
      const id = `${commandName}/${msg.author.id}`;

      if (this.throttleList.has(id)) {
        const timeLeft = this.throttleList.get(id)! - Date.now();
        this.commandOnThrottleHandler &&
          this?.commandOnThrottleHandler(msg, command, timeLeft);

        this.verbose &&
          console.log(
            `${chalk.blue(command.name)} command is blocked due to throttling`
          );
        return;
      }

      this.throttleList.set(id, Date.now() + command.throttle);

      if (command.throttle < 0)
        throw new Error(
          `${command.name}: throttle time cannot be less than zero`
        );

      setTimeout(() => this.throttleList.delete(id), command.throttle);
    }

    try {
      const initial = performance.now();
      const printTimeTaken = () => {
        const timeTaken = (performance.now() - initial).toFixed(4);
        this.verbose &&
          console.log(
            oneLine`${chalk.blue(command.name)} command took
          ${chalk.yellow(timeTaken, "ms")} to complete`
          );
      };

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
      const time = new Date().toString();
      const stackTrace = (err as Error).stack!;
      const checksum = sha1(stackTrace);

      console.error(chalk.red("=== Error ==="));
      console.error(chalk.yellow("Command:"), commandName);
      console.error(chalk.yellow("Args:"), argList);
      console.error(chalk.yellow("Time:"), chalk.magenta(time));
      console.error(chalk.yellow("Checksum:"), checksum);
      console.error(chalk.yellow("Caused by:"), msg.author.username);
      console.error(err);
    }
  }
}
