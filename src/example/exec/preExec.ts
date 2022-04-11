import { Message } from "discord.js";
import { CommandError } from "../..";



export function preExec(msg: Message) {
  msg.channel.send("This is executed before exec");
}

export function checkArgs(msg: Message, args: string[]) {
  if (args.length === 0) {
    throw new CommandError("no argument provided");
  }
}

