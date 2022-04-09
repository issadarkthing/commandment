import { Message, PermissionResolvable } from "discord.js";
import { Command, Duration } from "../../index";

export default class extends Command {
  name = "ping";
  aliases = ["p"];
  usageBeforeCooldown = 3;
  cooldown: Duration = { seconds: 10 };
  description = "To do something";
  permissions: PermissionResolvable[] = ["BAN_MEMBERS", "KICK_MEMBERS"];

  exec(msg: Message) {
    msg.channel.send("pong");
  }
}
