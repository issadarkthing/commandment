import { Message } from "discord.js";
import { CommandManager } from "./CommandManager";

/**
 * Command is an abstract class that should be extended to make your own custom
 * command. It also needs to be exported as default when using
 * `registerCommands`.
 * @class
 * */
export abstract class Command {
  /** 
   * Command name. This will be used to identify command.
   * */
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

  /**
   * Throttle time in millisecond. Negative numbers are not allowed.
   * */
  throttle = 0;

  /** 
   * Disable command.
   * */
  disable = false;

  /** 
   * Add command description
   * */
  description?: string;

  commandManager: CommandManager;

  constructor(manager: CommandManager) {
    this.commandManager = manager;
  }

  /** 
   * This is where your main logic should reside for a particular command. 
   * @param {Message} msg - Discord.js Message object
   * @param {string} args - Space seperated arguments
   * */
  abstract exec(msg: Message, args?: string[]): unknown | Promise<unknown>;

  /** 
   * Executes command regardless if argument list is needed.
   * @param {Message} msg - Discord.js Message object
   * @param {string} args - Space seperated arguments
   * */
  execute(msg: Message, args: string[]) {
    return this.exec.length === 2 ? 
      this.exec(msg, args) : this.exec(msg);
  }

  /** 
   * Releases the user from command blocking. Use this if you think the block
   * should be released early. 
   * */
  release(userID: string) {
    this.commandManager.release(`${this.name}_${userID}`);
  }
}
