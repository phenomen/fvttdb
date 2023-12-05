#! /usr/bin/env node
import path from "path";
import { readdir } from "fs/promises";
import { extractPack, compilePack } from "@foundryvtt/foundryvtt-cli";
import {
	cancel,
	confirm,
	intro,
	outro,
	isCancel,
	select,
	spinner,
	text,
	multiselect
} from "@clack/prompts";

async function main() {
	const version = "1.6.0";

	let inputPathMessage;
	let inputPathDefault;
	let outputPathMessage;
	let outputPathDefault;
	let collection;
	let files;

	console.log();
	intro(`[ FoundryVTT Database Converter ${version} ]`);

	/* PROMPT: OPERATION */
	const isExtract = await select({
		message: "Do you want to extract or compile a pack?",
		options: [
			{ value: true, label: "Extract" },
			{ value: false, label: "Compile" }
		],
		initialValue: true
	});

	if (isCancel(isExtract)) {
		cancel("Operation cancelled");
		return process.exit(0);
	}

	/* PROMPT: DATABASE TYPE */
	const isNEDB = await select({
		message: "Select a database format",
		options: [
			{ value: false, label: "LevelDB" },
			{ value: true, label: "NeDB" }
		],
		initialValue: false
	});

	if (isCancel(isNEDB)) {
		cancel("Operation cancelled");
		return process.exit(0);
	}

	if (isNEDB) {
		collection = await select({
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
				{ value: "scenes", label: "Scenes" }
			],
			initialValue: "actors"
		});

		if (isCancel(collection)) {
			cancel("Operation cancelled");
			return process.exit(0);
		}
	}

	/* PROMPT: SOURCE FORMAT */
	const isYAML = await select({
		message: "Select a data source format",
		options: [
			{ value: false, label: "JSON" },
			{ value: true, label: "YAML" }
		],
		initialValue: false
	});

	if (isCancel(isYAML)) {
		cancel("Operation cancelled");
		return process.exit(0);
	}

	/* PROMPT: INPUT DIRECTORY */
	if (isExtract) {
		inputPathMessage = "Path to the Input directory with the pack";
		inputPathDefault = "./";
		outputPathMessage = `Path to the Output directory with ${isYAML ? "YAML" : "JSON"} data`;
		outputPathDefault = "./src/";
	} else {
		inputPathMessage = `Path to the Input directory with ${isYAML ? "YAML" : "JSON"} data`;
		inputPathDefault = "./src/";
		outputPathMessage = "Path to the Output compiled pack";
		outputPathDefault = "./compiled/";
	}

	const input = await text({
		message: inputPathMessage,
		initialValue: inputPathDefault
	});

	if (isCancel(input)) {
		cancel("Operation cancelled");
		return process.exit(0);
	}

	/* PROMPT: PACK */
	files = await readdir(input, { withFileTypes: true });

	const packs = await multiselect({
		message: `Select packs to ${isExtract ? "extract" : "compile"} (Space: Select; Enter: Confirm)`,
		options: files.map((file) => {
			return { value: file.name, label: file.name };
		}),
		required: true
	});

	if (isCancel(packs)) {
		cancel("Operation cancelled");
		return process.exit(0);
	}

	/* PROMPT: OUTPUT DIRECTORY */
	const output = await text({
		message: outputPathMessage,
		initialValue: outputPathDefault
	});

	if (isCancel(output)) {
		cancel("Operation cancelled");
		return process.exit(0);
	}

	/* PROMPT: CONFIRMATION */
	const shouldContinue = await confirm({
		message: `FVTTDB will ${isExtract ? "extract" : "compile"} the pack${
			packs.length > 1 ? "s" : ""
		} '${packs}' from ${input} to ${output} Do you want to continue?`
	});

	if (isCancel(shouldContinue)) {
		cancel("Operation cancelled");
		return process.exit(0);
	}

	/* OPERATION */
	const s = spinner();

	s.start(`Processing...`);

	for (let pack of packs) {
		const inputPath = path.join(input, pack);
		const outputPath = path.join(output, pack);

		if (isExtract) {
			await extractPack(inputPath, outputPath, {
				nedb: isNEDB,
				yaml: isYAML,
				collection: collection
			});
		} else {
			await compilePack(inputPath, outputPath, {
				nedb: isNEDB,
				yaml: isYAML,
				collection: collection
			});
		}
	}

	s.stop();

	outro("[ Process completed ]");

	process.exit(0);
}

main().catch(console.error);
