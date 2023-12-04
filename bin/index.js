#! /usr/bin/env node
import path from "path";
import { Command } from "commander";
import { extractPack, compilePack } from "@foundryvtt/foundryvtt-cli";
import { intro, isCancel, cancel, text, select, spinner } from "@clack/prompts";

async function main() {
  if (process.argv.length > 2) {
    await launchWithArgs();
  } else {
    await launchWithoutArgs();
  }

  /* FUNCTIONS */

  async function extract(input, output, nedb, collection) {
    await extractPack(input, output, {
      nedb: nedb,
      collection: collection,
    });
  }

  async function compile(input, output, nedb, collection) {
    await compilePack(input, output, {
      nedb: nedb,
      collection: collection,
    });
  }

  async function launchWithArgs() {
    const program = new Command();

    program
      .option("-e, --extract", "Extract pack")
      .option("-c, --compile", "Compile pack")
      .option("-p, --pack <name>", "Name of the pack")
      .option("-n, --nedb", "Is the pack in the NEDB format?")
      .option("-t, --type [type]", "Type of the NEDB pack collection");

    program.parse(process.argv);

    const options = program.opts();

    if (!options.extract && !options.compile) {
      throw new Error(
        "You need to specify either extract or compile operation"
      );
    }

    if (!options.pack) {
      throw new Error("No pack specified");
    }

    if (options.nedb && !options.type) {
      throw new Error("NEDB requires a collection type specified");
    }

    if (options.extract) {
      const input = path.normalize(
        `./${options.pack}${options.nedb ? ".db" : ""}`
      );
      const output = path.normalize(`./json/${options.pack}`);
      await extract(input, output, options.nedb, options.type);
    }

    if (options.compile) {
      const input = path.normalize(`./json/${options.pack}`);
      const output = path.normalize(
        `./compiled/${options.pack}${options.nedb ? ".db" : ""}`
      );
      await compile(input, output, options.nedb, options.type);
    }

    console.log("Done!");

    process.exit(0);
  }

  async function launchWithoutArgs() {
    console.log();
    intro(`[ FoundryVTT Database Converter 1.0.2 ]`);

    const isExtract = await select({
      message: "Do you want to extract or compile a pack?",
      options: [
        { value: true, label: "Extract" },
        { value: false, label: "Compile" },
      ],
      initialValue: true,
    });

    if (isCancel(isExtract)) {
      cancel("Operation cancelled");
      return process.exit(0);
    }

    const pack = await text({
      message: "Enter the name of the pack",
      placeholder:
        "Can be a file name or a directory name, including subdirectories. Do not include the .db extension!",
    });

    if (isCancel(pack)) {
      cancel("Operation cancelled");
      return process.exit(0);
    }

    const isNEDB = await select({
      message: "Select a database type of the pack",
      options: [
        { value: false, label: "LevelDB" },
        { value: true, label: "NeDB" },
      ],
      initialValue: false,
    });

    if (isCancel(isNEDB)) {
      cancel("Operation cancelled");
      return process.exit(0);
    }

    let collection;

    if (isNEDB) {
      collection = await select({
        message: "Select a collection type for NeDB pack.",
        options: [
          { value: "actors", label: "Actors" },
          { value: "adventures", label: "Adventures" },
          { value: "cards", label: "Cards" },
          { value: "items", label: "Items" },
          { value: "journal", label: "Journal Entries" },
          { value: "macros", label: "Macros" },
          { value: "playlists", label: "Playlists" },
          { value: "tables", label: "Roll Tables" },
          { value: "scenes", label: "Scenes" },
        ],
        initialValue: "actors",
      });

      if (isCancel(collection)) {
        cancel("Operation cancelled");
        return process.exit(0);
      }
    }

    const s = spinner();

    if (isExtract) {
      s.start(`Extracting the pack "${pack}"...`);
      const input = path.normalize(`./${pack}${isNEDB ? ".db" : ""}`);
      const output = path.normalize(`./json/${pack}`);
      await extract(input, output, isNEDB, collection);
      s.stop("Extracted!");
    } else {
      s.start(`Compiling the pack "${pack}"...`);
      const input = path.normalize(`./json/${pack}`);
      const output = path.normalize(`./compiled/${pack}${isNEDB ? ".db" : ""}`);
      await compile(input, output, isNEDB, collection);
      s.stop("Compiled!");
    }

    intro(`[ Process completed ]`);
    process.exit(0);
  }
}
main().catch(console.error);
