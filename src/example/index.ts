import { Client } from "discord.js";
import { CommandError, CommandManager } from "../index";
import path from "path";

const COMMAND_PREFIX = "!";
const client = new Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });
const commandManager = new CommandManager(COMMAND_PREFIX);

commandManager.verbose = true;
commandManager.registerCommands(path.resolve(__dirname, "./commands"));

commandManager.registerCommandErrorHandler((err, msg) => {
  if (err instanceof CommandError) {
    msg.channel.send(err.message);
  } else {
    console.log(err);
  }
})

commandManager.registerCommandNotFoundHandler((msg, cmdName) => {
  msg.channel.send(`Cannot find command "${cmdName}"`);
})

commandManager.registerCommandOnCooldownHandler((msg, cmd, timeLeft) => {
  const { hours, minutes, seconds } = timeLeft;
  const fmtTimeLeft = `${hours}h ${minutes}m ${seconds}s`;
  msg.channel.send(`You cannot run ${cmd.name} command for **${fmtTimeLeft}**`);
})

commandManager.registerCommandMissingPermissionHandler((msg, perms) => {
  msg.channel.send(`Missing permissions \`${perms.join(", ")}\``);
})

client.on("ready", () => console.log(client.user?.username, "is ready!"))
client.on("messageCreate", msg => commandManager.handleMessage(msg));

client.login(process.env.BOT_TOKEN);

