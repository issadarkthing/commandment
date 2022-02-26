import chalk from "chalk";
import { oneLine } from "common-tags";
import { Message, PermissionResolvable } from "discord.js";
import fs from "fs";
import path from "path";
import util from "util";
import { sha1 } from "./utils";
import { performance } from "perf_hooks";
import { Command } from "./Command";
import { Mutex, MutexInterface } from "async-mutex";
//@ts-ignore
import Table from "table-layout";

/** Logging info */
interface CommandLog {
  name: string;
  aliases: string[];
  /** Time taken command took to complete */
  timeTaken: number;
}

const readdir = util.promisify(fs.readdir);

/** 
 * CommandManager stores all your commands 
 * @class
 * */
export class CommandManager {
  readonly commands = new Map<string, Command>();
  private blockList = new Map<string, MutexInterface>();
  private throttleList = new Map<string, number>();
  private commandRegisterLog: CommandLog[] = [];
  private commandNotFoundHandler?: (msg: Message, name: string) => void;
  private commandOnThrottleHandler?: (
    msg: Message,
    command: Command,
    timeLeft: number
  ) => void;
  private commandErrorHandler?: (
    err: unknown, msg: Message, cmd: string, args: string[],
  ) => void;
  private missingPermissionHandler?: 
    (msg: Message, permissions: PermissionResolvable[]) => void;
  /**
   * Show command logging
   * */
  verbose = true;
  /**
   * Bot's prefix
   * */
  readonly prefix: string;

  /**
   * @param {string} prefix - The bot's prefix
   * */
  constructor(prefix: string) {
    this.prefix = prefix;
  }

  private log(...values: any[]) {
    this.verbose && console.log(...values);
  }

  /** Release user from command blocking. Use this format for id:
   * `commandName_userID` */
  release(id: string) {
    this.blockList.delete(id);
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
   * Register handler for missing permission. By default, the error will be
   * ignored.
   * @param {Function} fn - Function to be executed when permission is missing.
   * */
  registerCommandMissingPermissionHandler(
    fn: (msg: Message, permission: PermissionResolvable[]) => void,
  ) {
    this.missingPermissionHandler = fn;
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
   * Register error handler that was thrown inside Command#exec or
   * Command#execute. If command error handler is registered, all errors thrown
   * inside Command#execute will not be logged.
   * @param {Function} fn - Function to be executed when error is thrown
   * */
  registerCommandErrorHandler(fn: (error: unknown, msg: Message, command: string, args: string[]) => void): void {
    this.commandErrorHandler = fn;
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


    this.log(`=== ${chalk.blue("Registering command(s)")} ===`);

    const files = await readdir(dir);
    const initial = performance.now();
    for (const file of files) {
      // skip .d.ts files
      if (file.endsWith(".d.ts")) continue;

      const initial = performance.now();
      const filePath = path.join(dir, file);
      // eslint-disable-next-line
      const cmdFile = require(filePath);
      const command: Command = new cmdFile.default(this);
      const now = performance.now();
      const timeTaken = now - initial;

      if (command.disable) continue;

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

    this.commandRegisterLog.sort((a, b) => b.timeTaken - a.timeTaken);

    const rows: Record<string, string>[] = [];

    for (const log of this.commandRegisterLog) {
      const timeTaken = log.timeTaken.toFixed(4);
      const aliases = log.aliases.join(", ");
      const timeTakenFmt = chalk.yellow(`[${timeTaken} ms]`);

      rows.push({
        timeTakenFmt,
        name: log.name,
        aliases: `| ${aliases}`,
      });
    }

    this.log((new Table(rows)).toString());

    const commandCount = this.commandRegisterLog.length;
    this.log(
      oneLine`Loading ${chalk.green(commandCount)} command(s) took
      ${chalk.yellow(timeTaken, "ms")}`
    );
    this.log(`Command Prefix = ${this.prefix}`);
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

    if (!commandName) return;

    const command = this.commands.get(commandName);
    if (!command) {
      this.commandNotFoundHandler &&
        this.commandNotFoundHandler(msg, commandName);
      return;
    }

    const id = `${command.name}_${msg.author.id}`;

    if (!this.blockList.has(id)) {
      this.blockList.set(id, new Mutex());
    }

    if (command.throttle !== 0) {

      if (this.throttleList.has(id)) {
        const timeLeft = this.throttleList.get(id)! - Date.now();
        this.commandOnThrottleHandler &&
          this?.commandOnThrottleHandler(msg, command, timeLeft);

        this.log(
          `${chalk.blue(command.name)} command is blocked due to throttling`
        );
        return;
      }

      this.throttleList.set(id, Date.now() + command.throttle);

      if (command.throttle < 0) {
        throw new Error(
          `${command.name}: throttle time cannot be less than zero`
        );
      }

      setTimeout(() => this.throttleList.delete(id), command.throttle);
    }

    const member = msg.member;

    if (command.permissions.length > 0 && member) {

      const missingPermissions = 
        command.permissions.filter(x => !member.permissions.has(x));

      if (missingPermissions.length > 0) {
        this.missingPermissionHandler && 
          this.missingPermissionHandler(msg, missingPermissions);

        return;
      }
    }
      
    const mutex = this.blockList.get(id)!;

    if (mutex.isLocked()) {
      msg.channel.send(
        `There's already an instance of ${command.name} command running`
      );

      return;
    }
      
    const release = await mutex.acquire();

    try {

      const initial = performance.now();

      const printTimeTaken = () => {

        const timeTaken = (performance.now() - initial).toFixed(4);
        this.log(
          oneLine`${chalk.blue(command.name)} command took
          ${chalk.yellow(timeTaken, "ms")} to complete`
        );

      };



      await command.execute(msg, args);
      printTimeTaken();

    } catch (err) {

      if (this.commandErrorHandler) {
        this.commandErrorHandler(err, msg, command.name, args);
        return;
      }

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

    } finally {

      release();
    }
  }
}
