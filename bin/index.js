#! /usr/bin/env node
import path from "path";
import { Command } from "commander";
import { extractPack, compilePack } from "@foundryvtt/foundryvtt-cli";
import {
  cancel,
  confirm,
  intro,
  isCancel,
  select,
  spinner,
  text,
} from "@clack/prompts";

async function main() {
  const version = "1.3.1";

  if (process.argv.length > 2) {
    await launchWithArgs();
  } else {
    await launchWithoutArgs();
  }

  /* FUNCTIONS */

  async function extract(input, output, nedb, type) {
    await extractPack(input, output, {
      nedb: nedb,
      collection: type,
    });
  }

  async function compile(input, output, nedb, type) {
    await compilePack(input, output, {
      nedb: nedb,
      collection: type,
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
        "You need to specify either --extract (-e) or --compile (-c) operation"
      );
    }

    if (options.nedb && !options.type) {
      throw new Error("NEDB requires a collection type specified");
    }

    const inputPath = path.join(
      options.input,
      options.pack + (options.extract && options.nedb ? ".db" : "")
    );

    const outputPath = path.join(
      options.output,
      options.pack + (!options.extract && options.nedb ? ".db" : "")
    );

    if (options.extract) {
      await extract(inputPath, outputPath, options.nedb, options.type);
    } else if (options.compile) {
      await compile(inputPath, outputPath, options.nedb, options.type);
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
    intro(`[ FoundryVTT Database Converter ${version} ]`);

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
      inputPathMessage = "Input path to the directory with the pack";
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

    const inputPath = path.join(
      input,
      pack + (isExtract && isNEDB ? ".db" : "")
    );
    const outputPath = path.join(
      output,
      pack + (!isExtract && isNEDB ? ".db" : "")
    );

    const shouldContinue = await confirm({
      message: `FVTTDB will ${
        isExtract ? "extract" : "compile"
      } the pack '${pack}' from ${inputPath} to ${outputPath} Do you want to continue?`,
    });

    if (isCancel(shouldContinue)) {
      cancel("Operation cancelled");
      return process.exit(0);
    }

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
