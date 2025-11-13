#!/usr/bin/env bun

import path from "node:path";
import { readdir } from "node:fs/promises";
import { extractPack, compilePack } from "@foundryvtt/foundryvtt-cli";
import * as p from "@clack/prompts";
import pkg from "./package.json";

async function main() {
  const version = pkg.version;

  let inputPathMessage;
  let inputPathDefault;
  let outputPathMessage;
  let outputPathDefault;
  let collection;
  let files;

  console.log();
  p.intro(`[ FoundryVTT Database Tools ${version} ]`);

  /* PROMPT: OPERATION */
  const isExtract = await p.select({
    message: "Do you want to extract or compile packs?",
    options: [
      { value: true, label: "Extract" },
      { value: false, label: "Compile" },
    ],
    initialValue: true,
  });

  if (p.isCancel(isExtract)) {
    p.cancel("Operation cancelled");
    return process.exit(0);
  }

  /* PROMPT: DATABASE TYPE */
  const isNEDB = await p.select({
    message: "Select a database format",
    options: [
      { value: false, label: "LevelDB" },
      { value: true, label: "NeDB" },
    ],
    initialValue: false,
  });

  if (p.isCancel(isNEDB)) {
    p.cancel("Operation cancelled");
    return process.exit(0);
  }

  if (isNEDB) {
    collection = await p.select({
      message:
        "Select a collection type for NeDB pack (all selected packs should have the same type)",
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

    if (p.isCancel(collection)) {
      p.cancel("Operation cancelled");
      return process.exit(0);
    }
  }

  /* PROMPT: SOURCE FORMAT */
  const isYAML = await p.select({
    message: "Select a data source format",
    options: [
      { value: false, label: "JSON" },
      { value: true, label: "YAML" },
    ],
    initialValue: false,
  });

  if (p.isCancel(isYAML)) {
    p.cancel("Operation cancelled");
    return process.exit(0);
  }

  /* PROMPT: INPUT DIRECTORY */
  if (isExtract) {
    inputPathMessage = "Path to the Input directory with packs";
    inputPathDefault = "./";
    outputPathMessage = `Path to the Output directory with ${
      isYAML ? "YAML" : "JSON"
    } data`;
    outputPathDefault = "./src/";
  } else {
    inputPathMessage = `Path to the Input directory with ${
      isYAML ? "YAML" : "JSON"
    } data`;
    inputPathDefault = "./src/";
    outputPathMessage = "Path to the Output directory with compiled packs";
    outputPathDefault = "./compiled/";
  }

  const input = await p.text({
    message: inputPathMessage,
    initialValue: inputPathDefault,
  });

  if (p.isCancel(input)) {
    p.cancel("Operation cancelled");
    return process.exit(0);
  }

  /* PROMPT: PACK */
  files = await readdir(input, { withFileTypes: true });

  const packs = (await p.multiselect({
    message: `Select packs to ${
      isExtract ? "extract" : "compile"
    } (Space: select; A: select all; Enter: confirm)`,
    options: files.map((file) => {
      return { value: file.name, label: file.name };
    }),
    required: true,
  })) as string[];

  if (p.isCancel(packs)) {
    p.cancel("Operation cancelled");
    return process.exit(0);
  }

  /* PROMPT: OUTPUT DIRECTORY */
  const output = await p.text({
    message: outputPathMessage,
    initialValue: outputPathDefault,
  });

  if (p.isCancel(output)) {
    p.cancel("Operation cancelled");
    return process.exit(0);
  }

  /* PROMPT: CONFIRMATION */
  const shouldContinue = await p.confirm({
    message: `FVTTDB will ${isExtract ? "extract" : "compile"} the pack${
      packs.length > 1 ? "s" : ""
    } '${packs}' from ${input} to ${output} Do you want to continue?`,
  });

  if (p.isCancel(shouldContinue)) {
    p.cancel("Operation cancelled");
    return process.exit(0);
  }

  /* OPERATION */
  const s = p.spinner();

  s.start("Processing...");

  for (const pack of packs) {
    const inputPath = path.join(input, pack);
    const outputPath = path.join(output, pack);

    if (isExtract) {
      await extractPack(inputPath, outputPath, {
        nedb: isNEDB,
        yaml: isYAML,
        collection: collection,
      });
    } else {
      await compilePack(inputPath, outputPath, {
        nedb: isNEDB,
        yaml: isYAML,
        collection: collection,
      });
    }
  }

  s.stop();

  p.outro("[ Process completed ]");

  process.exit(0);
}

main().catch(console.error);
