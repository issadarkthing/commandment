import { Message, PermissionResolvable } from "discord.js";
import { Command, Duration, Exec } from "../../index";
import { postExec } from "../exec/postExec";
import { checkArgs, preExec } from "../exec/preExec";

export default class extends Command {
  name = "ping";
  aliases = ["p"];
  usageBeforeCooldown = 3;
  cooldown: Duration = { seconds: 10 };
  description = "To do something";
  permissions: PermissionResolvable[] = ["BAN_MEMBERS", "KICK_MEMBERS"];
  preExec: Exec[] = [preExec, checkArgs];
  postExec: Exec[] = [postExec];

  exec(msg: Message) {
    msg.channel.send("pong");
  }
}
