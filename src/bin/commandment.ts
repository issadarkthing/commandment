#!/usr/bin/env
import fs from "fs";
import path from "path";
import chalk from "chalk";
import arg from "arg";

const args = arg({
  "--dir": String,
  "-d": "--dir",
});

const commandName = args["_"][0];
const dir = args["--dir"];

const template = `import { Message } from "discord.js";
import { Command } from "@jiman24/commandment";

export default class extends Command {
  name = "${commandName.toLowerCase()}";
  description = "To do something";

  async exec(msg: Message) {

  }
}
`;

const longDirPath = path.resolve(process.cwd(), dir || "", `${commandName}.ts`);

fs.writeFileSync(longDirPath, template);

console.log(`Successfully created ${chalk.blue(`${commandName}.ts`)} file`);
