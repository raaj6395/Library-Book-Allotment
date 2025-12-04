import fs from "fs/promises";
import path from "path";
import ts from "typescript";

const exts = [".js", ".jsx", ".ts", ".tsx"]; 
const ignoreDirs = new Set(["node_modules", ".git", "dist", "build", ".vite"]);

async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) {
        yield* walk(fullPath);
      }
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      yield fullPath;
    }
  }
}

function getScriptKind(filePath) {
  if (filePath.endsWith(".tsx") || filePath.endsWith(".jsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".ts")) return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

function stripComments(code, filePath) {
  const sourceFile = ts.createSourceFile(
    filePath,
    code,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(filePath)
  );
  const printer = ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed });
  return printer.printFile(sourceFile);
}

async function processFile(filePath) {
  const original = await fs.readFile(filePath, "utf8");
  if (!original.includes("//") && !original.includes("/*")) return false;
  const stripped = stripComments(original, filePath);
  if (stripped !== original) {
    await fs.writeFile(filePath, stripped, "utf8");
    return true;
  }
  return false;
}

async function main() {
  const root = process.cwd();
  let changedCount = 0;
  for await (const filePath of walk(root)) {
    const changed = await processFile(filePath);
    if (changed) {
      changedCount += 1;
      console.log("Stripped comments:", path.relative(root, filePath));
    }
  }
  console.log(`Done. Files updated: ${changedCount}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
