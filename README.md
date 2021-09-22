# Commandment
Simple [discord.js](https://discord.js.org/#/) command framework.


## Why
Because I find myself repeating over and over again doing command handling. This
library will certainly reduce the development time with powerful command
handling for the bot.

## Features
- one command per file
- multiple instance blocking i.e. prevent user from running the same command
  while the other command is still running
- lightweight
- easy to use
- command throttling

## Installing
```sh
$ npm install @jiman24/commandment
```

## Documentation
You can read about the documentation [here](https://commandment.vercel.app/)

## Example
`index.ts`
```ts
import { Client } from "discord.js";
import { CommandManager } from "../index";
import path from "path";

const COMMAND_PREFIX = "!";
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });
const commandManager = new CommandManager(COMMAND_PREFIX);

commandManager.verbose = true;
commandManager.registerCommands(path.resolve(__dirname, "./commands"));

commandManager.registerCommandNotFoundHandler((msg, cmdName) => {
  msg.channel.send(`Cannot find command "${cmdName}"`);
})

commandManager.registerCommandOnThrottleHandler((msg, cmd, timeLeft) => {
  const time = (timeLeft / 1000).toFixed(2);
  msg.channel.send(`You cannot run ${cmd.name} command after ${time} s`);
})

client.on("ready", () => console.log(client.user?.username, "is ready!"))
client.on("messageCreate", msg => commandManager.handleMessage(msg));

client.login(process.env.BOT_TOKEN);
```

`commands/Ping.ts`
```ts
import { Message } from "discord.js";
import { Command } from "../../index";

export default class extends Command {
  name = "ping";
  aliases = ["p"];
  throttle = 10 * 1000; // 10 seconds

  exec(msg: Message, args: string[]) {
    msg.channel.send("pong");
  }
}
```

`commands/Wait.ts`
```ts
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
```
