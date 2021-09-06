import chalk from "chalk";
import { oneLine } from "common-tags";
import { Message } from "discord.js";
import fs from "fs";
import path from "path";
import util from "util";
import { sha1 } from "./utils";
import { performance } from "perf_hooks";

export abstract class Command {
  abstract name: string;
  aliases: string[] = [];
  /** blocks command if there's already an instance of it running under the same
   * user */
  block = false;

  abstract exec(msg: Message, args: string[]): unknown | Promise<unknown>;
}

interface CommandLog {
  name: string;
  aliases: string[];
  timeTaken: number;
}

const readdir = util.promisify(fs.readdir);

export class CommandManager {
  private commands = new Map<string, Command>();
  private blockList = new Set<string>();
  private commandRegisterLog: CommandLog[] = [];
  verbose = false;
  public prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  registerCommand(name: string, cmd: Command) {
    if (this.commands.has(name)) {
      throw new Error(`command "${name}" has already been defined`);
    }

    this.commands.set(name, cmd);
  }

  async registerCommands(dir: string) {
    this.verbose && 
      console.log(`=== ${chalk.blue("Registering command(s)")} ===`)

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

  async handleMessage(msg: Message) {
    const words = msg.content.split(' ');
    const cmd = words[0];
    const args = words.slice(1);

    if (!cmd.startsWith(this.prefix) || msg.author.bot) return;

    const command = this.commands.get(cmd);
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
