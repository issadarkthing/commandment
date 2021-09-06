import { Message } from "discord.js";
import { Command } from "../../index";

export default class extends Command {
  name = "ping";
  aliases = ["p"];

  exec(msg: Message, args: string[]) {
    msg.channel.send("pong");
  }
}
