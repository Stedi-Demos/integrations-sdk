import * as cp from "child_process";
import { analyzeMetafile, build } from "esbuild";
import * as fs from "fs";
import JSZip from "jszip";
import os from "os";
import path from "path";

export const compile = async (
  buildPath: string,
  externals: string[] = [],
  debug = false
): Promise<string> => {
  const searchValue = `${path.sep}src${path.sep}`;
  const replaceValue = `${path.sep}dist${path.sep}src${path.sep}`;
  const pathParts = buildPath
    .replace(searchValue, replaceValue)
    .split(path.sep);
  pathParts.pop(); // discard input file name

  pathParts.push("index.mjs");
  const outputPath = pathParts.join(path.sep);

  const result = await build({
    metafile: true,
    entryPoints: [buildPath],
    outfile: outputPath,
    platform: "node",
    format: "esm",
    target: "node18",
    minify: false,
    sourcemap: true,
    bundle: true,
    keepNames: true,
    banner: {
      // workaround for using dotenv with esbuild & esm: https://github.com/evanw/esbuild/issues/1921
      js: "import { createRequire } from 'module';const require = createRequire(import.meta.url);",
    },
    mainFields: ["module", "main"],
    external: externals,
  });

  if (debug) {
    const text = await analyzeMetafile(result.metafile);
    console.log(text);
  }
  return outputPath;
};

const pkg = {
  name: "stedi-deps",
  version: "1.0.0",
  description:
    "This package contains the dependencies needed at runtime, that cannot be bundled",
  dependencies: {
    "@stedi/integrations-sdk": "*",
  },
};

export const packForDeployment = async (
  javascriptPath: string,
  packageJSON: object | undefined
) => {
  const dir = `${os.tmpdir()}${path.sep}idk-deploy`;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir);
  fs.writeFileSync(
    `${dir}${path.sep}package.json`,
    JSON.stringify(packageJSON ?? pkg, null, 2)
  );

  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  cp.spawnSync(npm, ["install", "--production"], {
    cwd: dir,
  });

  const zip = getZipOfFolder(dir);
  zip.file("index.mjs", fs.readFileSync(javascriptPath, "utf-8"), {
    date: new Date(1977, 1, 1, 0, 0, 0, 0),
  });
  zip.file("index.mjs.map", fs.readFileSync(`${javascriptPath}.map`, "utf-8"), {
    date: new Date(1977, 1, 1, 0, 0, 0, 0),
  });

  return await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: {
      level: 9,
    },
  });
};

const getFilePathsRecursively = (dir: string): string[] => {
  // returns a flat array of absolute paths of all files recursively contained in the dir
  let results: string[] = [];
  const list = fs.readdirSync(dir);

  let pending = list.length;
  if (!pending) return results;

  for (let file of list) {
    file = path.resolve(dir, file);

    const stat: fs.Stats = fs.lstatSync(file);

    if (stat.isDirectory()) {
      results = results.concat(getFilePathsRecursively(file));
    } else {
      results.push(file);
    }

    if (!--pending) return results;
  }

  return results;
};

const getZipOfFolder = (dir: string): JSZip => {
  // returns a JSZip instance filled with contents of dir.

  const allPaths = getFilePathsRecursively(dir);
  const expectedNodeModulesDirectory = `node_modules${path.sep}`;

  if (!allPaths.some((path) => path.includes(expectedNodeModulesDirectory)))
    throw new Error(
      "There was an issue installing the dependencies using your local npm installation, please check your .npmrc and try again."
    );

  const zip = new JSZip();
  for (const filePath of allPaths) {
    // let addPath = path.relative(path.join(dir, '..'), filePath); // use this instead if you want the source folder itself in the zip
    const addPath = path.relative(dir, filePath); // use this instead if you don't want the source folder itself in the zip
    const data = fs.readFileSync(filePath);
    const stat = fs.lstatSync(filePath);
    const permissions = stat.mode;

    if (stat.isSymbolicLink()) {
      zip.file(addPath, fs.readlinkSync(filePath), {
        unixPermissions: parseInt("120755", 8), // This permission can be more permissive than necessary for non-executables but we don't mind.
        dir: stat.isDirectory(),
      });
    } else {
      zip.file(addPath, data, {
        unixPermissions: permissions,
        dir: stat.isDirectory(),
      });
    }
  }

  return zip;
};
