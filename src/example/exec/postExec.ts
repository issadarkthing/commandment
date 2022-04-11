import { Message } from "discord.js";



export function postExec(msg: Message) {
  msg.channel.send("this executed after exec");
}
