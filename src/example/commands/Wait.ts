import { Message } from "discord.js";
import { Command } from "../../index";


export default class extends Command {
  name = "wait";
  block = true;

  private sleep(ms: number) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    })
  }

  async exec(msg: Message, args: string[]) {

    msg.channel.sendTyping();
    const [ms] = args;

    await this.sleep(parseInt(ms))
    msg.channel.send("done");
  }
}
