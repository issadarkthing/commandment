import { Message } from "discord.js";
import { Command } from "../../index";

export default class extends Command {
  name = "ping";
  aliases = ["p"];
  throttle = 10 * 1000; // 10 seconds
  description = "To do something";

  exec(msg: Message) {
    msg.channel.send("pong");
  }
}
