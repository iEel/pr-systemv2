#!/usr/bin/env node
import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildPdfQaOutputPaths,
  buildPdfVisualQaReport,
  formatPdfVisualQaMarkdown,
} from "../lib/pdf-visual-qa.ts";

function usage() {
  return `Usage:
  npm run pdf:qa -- --input <path-to-pdf> [--expected-pages 1] [--min-bytes 1024] [--output-dir output/pdf-qa] [--skip-render]

Examples:
  npm run pdf:qa -- --input storage/generated/ITPR_2606008.pdf --expected-pages 1
  npm run pdf:qa -- --input storage/template-previews/PR_STANDARD_V2_DOCX.pdf --expected-pages 1

Artifacts:
  report.json
  report.md
  page-1.png, page-2.png, ... when rendering is available
`;
}

function parseArgs(argv) {
  const args = {
    expectedPages: undefined,
    input: "",
    minBytes: 1024,
    outputDir: "output/pdf-qa",
    skipRender: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];

    if (value === "--input") {
      args.input = argv[++index] || "";
    } else if (value === "--expected-pages") {
      args.expectedPages = Number(argv[++index]);
    } else if (value === "--min-bytes") {
      args.minBytes = Number(argv[++index]);
    } else if (value === "--output-dir") {
      args.outputDir = argv[++index] || args.outputDir;
    } else if (value === "--skip-render") {
      args.skipRender = true;
    } else if (value === "--help" || value === "-h") {
      console.log(usage());
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${value}\n\n${usage()}`);
    }
  }

  if (!args.input) {
    throw new Error(`Missing required --input\n\n${usage()}`);
  }

  if (args.expectedPages !== undefined && (!Number.isInteger(args.expectedPages) || args.expectedPages < 1)) {
    throw new Error("--expected-pages must be a positive integer");
  }

  if (!Number.isFinite(args.minBytes) || args.minBytes < 1) {
    throw new Error("--min-bytes must be a positive number");
  }

  return args;
}

function hasCommand(command) {
  return Boolean(findCommand(command));
}

function findCommand(command) {
  const probe = process.platform === "win32" ? "where" : "command";
  const probeArgs = process.platform === "win32" ? [command] : ["-v", command];
  const result = spawnSync(probe, probeArgs, {
    encoding: "utf8",
    shell: process.platform !== "win32",
  });

  if (result.status !== 0) return null;

  const firstLine = result.stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean);

  if (!firstLine) return command;

  if (process.platform === "win32" && command === "pdftoppm" && /\.cmd$/i.test(firstLine)) {
    const candidates = [
      path.resolve(path.dirname(firstLine), "../native/poppler/Library/bin/pdftoppm.exe"),
      path.resolve(path.dirname(firstLine), "../Library/bin/pdftoppm.exe"),
    ];
    const binary = candidates.find((candidate) => existsSync(candidate));
    if (binary) return binary;
  }

  return firstLine;
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(command),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with ${code}: ${stderr.trim()}`));
      }
    });
  });
}

async function collectRenderedPages(directory, pagePrefix) {
  const files = await fs.readdir(directory).catch(() => []);
  const prefixName = path.basename(pagePrefix);
  const rendered = [];

  for (const file of files) {
    const match = file.match(new RegExp(`^${prefixName}-(\\d+)\\.png$`));
    if (!match) continue;

    const filePath = path.posix.join(directory.replace(/\\/g, "/"), file);
    const stats = await fs.stat(filePath);

    rendered.push({
      bytes: stats.size,
      page: Number(match[1]),
      path: filePath,
    });
  }

  return rendered.sort((left, right) => left.page - right.page);
}

async function renderPdfPages({ inputPath, outputPaths, skipRender }) {
  if (skipRender) {
    return {
      renderedPages: [],
      renderSkippedReason: "--skip-render was provided",
    };
  }

  const pdftoppmPath = findCommand("pdftoppm");

  if (!pdftoppmPath) {
    return {
      renderedPages: [],
      renderSkippedReason: "pdftoppm not found",
    };
  }

  await runCommand(pdftoppmPath, ["-png", inputPath, outputPaths.pagePrefix]);

  return {
    renderedPages: await collectRenderedPages(outputPaths.directory, outputPaths.pagePrefix),
    renderSkippedReason: undefined,
  };
}

export async function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const inputPath = path.resolve(process.cwd(), args.input);
  const pdf = await fs.readFile(inputPath);
  const outputPaths = buildPdfQaOutputPaths({
    inputPath: args.input,
    outputRoot: args.outputDir,
  });
  const absoluteOutputDirectory = path.resolve(process.cwd(), outputPaths.directory);
  const absoluteOutputPaths = {
    ...outputPaths,
    directory: absoluteOutputDirectory,
    pagePrefix: path.resolve(process.cwd(), outputPaths.pagePrefix),
    reportJsonPath: path.resolve(process.cwd(), outputPaths.reportJsonPath),
    reportMarkdownPath: path.resolve(process.cwd(), outputPaths.reportMarkdownPath),
  };

  await fs.mkdir(absoluteOutputDirectory, { recursive: true });

  const renderResult = await renderPdfPages({
    inputPath,
    outputPaths: absoluteOutputPaths,
    skipRender: args.skipRender,
  });
  const report = buildPdfVisualQaReport({
    expectedPageCount: args.expectedPages,
    fileName: path.basename(inputPath),
    minBytes: args.minBytes,
    pdf,
    renderSkippedReason: renderResult.renderSkippedReason,
    renderedPages: renderResult.renderedPages.map((page) => ({
      ...page,
      path: path.relative(process.cwd(), page.path).replace(/\\/g, "/"),
    })),
  });

  await fs.writeFile(absoluteOutputPaths.reportJsonPath, `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(absoluteOutputPaths.reportMarkdownPath, formatPdfVisualQaMarkdown(report));

  const summary = {
    report: path.relative(process.cwd(), absoluteOutputPaths.reportMarkdownPath).replace(/\\/g, "/"),
    renderedPages: report.renderedPages.length,
    status: report.status,
  };
  console.log(JSON.stringify(summary));

  if (report.status === "FAIL") {
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
