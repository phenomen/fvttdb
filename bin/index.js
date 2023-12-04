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
      .option("-i, --input <path>", "Input path")
      .option("-o, --output <path>", "Output path")
      .option("-n, --nedb", "Is the pack in the NEDB format?")
      .option("-t, --type [type]", "Type of the NEDB pack collection");

    program.parse(process.argv);

    const options = program.opts();

    if (!options.extract && !options.compile) {
      throw new Error(
        "You need to specify either extract or compile operation"
      );
    }

    if (options.nedb && !options.type) {
      throw new Error("NEDB requires a collection type specified");
    }

    const input = path.normalize(
      options.input +
        "/" +
        options.pack +
        (options.extract && options.nedb ? ".db" : "")
    );

    const output = path.normalize(options.output + "/" + options.pack);

    if (options.extract) {
      await extract(input, output, options.nedb, options.type);
    } else if (options.compile) {
      await compile(input, output, options.nedb, options.type);
    }

    console.log("Done!");

    process.exit(0);
  }

  async function launchWithoutArgs() {
    let inputPathMessage;
    let inputPathDefault;
    let outputPathMessage;
    let outputPathDefault;
    let collection;

    console.log();
    intro(`[ FoundryVTT Database Converter 1.1.0 ]`);

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
      message: "Name of the pack",
    });

    if (isCancel(pack)) {
      cancel("Operation cancelled");
      return process.exit(0);
    }

    if (isExtract) {
      inputPathMessage = "Input path to the pack directory";
      inputPathDefault = "./packs/";
      outputPathMessage = "Output path to the directory with JSON data";
      outputPathDefault = "./json/";
    } else {
      inputPathMessage = "Input path to the directory with JSON data";
      inputPathDefault = "./json/";
      outputPathMessage = "Output path to the compiled pack";
      outputPathDefault = "./compiled/";
    }

    const input = await text({
      message: inputPathMessage,
      initialValue: inputPathDefault,
    });

    if (isCancel(input)) {
      cancel("Operation cancelled");
      return process.exit(0);
    }

    const output = await text({
      message: outputPathMessage,
      initialValue: outputPathDefault,
    });

    if (isCancel(output)) {
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

    const inputPath = path.normalize(
      input + "/" + pack + (isExtract && isNEDB ? ".db" : "")
    );
    const outputPath = path.normalize(output + "/" + pack);

    const s = spinner();

    if (isExtract) {
      s.start(`Extracting the pack...`);
      await extract(inputPath, outputPath, isNEDB, collection);
    } else {
      s.start(`Compiling the pack...`);
      await compile(inputPath, outputPath, isNEDB, collection);
    }
    s.stop("Compiled!");

    intro(`[ Process completed ]`);
    process.exit(0);
  }
}
main().catch(console.error);
