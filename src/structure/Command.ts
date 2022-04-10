import { Message, MessageEmbed, PermissionResolvable } from "discord.js";
import { DurationLikeObject } from "luxon";
import { CommandManager } from "./CommandManager";

/** Object that defines a duration */
export interface Duration extends DurationLikeObject {};

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
   * Cooldown time
   * */
  cooldown?: Duration;

  /** 
   * How many usages before command starts cooldown
   * */
  usageBeforeCooldown = 1;

  /** 
   * Disable command.
   * */
  disable = false;

  /** 
   * Add command description
   * */
  description?: string;

  /** Required permissions to run this command */
  permissions: PermissionResolvable[] = [];

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
   * Helper method to send an embed messsage.
   * @param {Message} msg - Discord.js Message object
   * @param {MessageEmbed} embed - Discord.js MessageEmbed object
   * */
  sendEmbed(msg: Message, embed: MessageEmbed) {
    return msg.channel.send({ embeds: [embed] });
  }

  /** 
   * Helper method to wrap a text message to an embed message and send it.
   * @param {Message} msg - Discord.js Message object
   * @param {string} text - Text message to be sent
   * */
  send(msg: Message, text: string) {

    const embed = new MessageEmbed()
      .setAuthor({
        name : msg.author.username,
        iconURL: msg.author.displayAvatarURL(),
      })
      .setDescription(text);

    return this.sendEmbed(msg, embed);
  }
}
