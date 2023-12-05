#! /usr/bin/env node
import path from "path";
import { readdir } from "fs/promises";
import { extractPack, compilePack } from "@foundryvtt/foundryvtt-cli";
import { cancel, confirm, intro, isCancel, select, spinner, text } from "@clack/prompts";

async function main() {
	const version = "1.5.1";

	let inputPathMessage;
	let inputPathDefault;
	let outputPathMessage;
	let outputPathDefault;
	let collection;
	let files;

	console.log();
	intro(`[ FoundryVTT Database Converter ${version} ]`);

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
			message: "Select a collection type for NeDB pack",
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

	files = await readdir(input, { withFileTypes: false });

	/* remove extension */
	files = files.map((file) => {
		return file.replace(/\.[^/.]+$/, "");
	});

	const pack = await select({
		message: `Select a pack to ${isExtract ? "extract" : "compile"}`,
		options: files.map((file) => {
			return { value: file, label: file };
		})
	});

	if (isCancel(pack)) {
		cancel("Operation cancelled");
		return process.exit(0);
	}

	const output = await text({
		message: outputPathMessage,
		initialValue: outputPathDefault
	});

	if (isCancel(output)) {
		cancel("Operation cancelled");
		return process.exit(0);
	}

	const inputPath = path.join(input, pack + (isExtract && isNEDB ? ".db" : ""));
	const outputPath = path.join(output, pack + (!isExtract && isNEDB ? ".db" : ""));

	const shouldContinue = await confirm({
		message: `FVTTDB will ${
			isExtract ? "extract" : "compile"
		} the pack '${pack}' from ${inputPath} to ${outputPath} Do you want to continue?`
	});

	if (isCancel(shouldContinue)) {
		cancel("Operation cancelled");
		return process.exit(0);
	}

	const s = spinner();

	if (isExtract) {
		s.start(`Extracting the pack...`);
		await extractPack(inputPath, outputPath, {
			nedb: isNEDB,
			yaml: isYAML,
			collection: collection
		});
	} else {
		s.start(`Compiling the pack...`);
		await compilePack(inputPath, outputPath, {
			nedb: isNEDB,
			yaml: isYAML,
			collection: collection
		});
	}

	s.stop("Done!");
	intro(`[ Process completed ]`);
	process.exit(0);
}

main().catch(console.error);
