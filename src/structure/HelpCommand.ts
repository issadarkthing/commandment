import { Command } from "../index";
import { Message, MessageEmbed } from "discord.js";

/** 
 * Built in help command that shows all registered commands
 * @class
 * */
export class Help extends Command {
  name = "help";
  aliases = ["h"];
  description = "show all commands and it's description";

  async exec(msg: Message) {
    const commands = this.commandManager.commands.values();

    let helpText = "";
    const done = new Set<string>();

    for (const command of commands) {

      if (command.disable)
        continue;

      if (done.has(command.name)) {
        continue
      } else {
        done.add(command.name);
      }

      helpText += 
        `\n**${command.name}**: \`${command.description || "none"}\``;

    }

    const embed = new MessageEmbed()
      .setTitle("Help")
      .setDescription(helpText)

    this.sendEmbed(msg, embed);
  }
}
