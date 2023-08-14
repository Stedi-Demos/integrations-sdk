import fs from "fs";
import path from "path";

interface ResourceFile {
  basePath: string;
  fileName?: string;
}

export const functionNameFromPath = (fnPath: string): string => {
  // get function name excluding extension
  // path-a/path-b/path-never-ends/nice/function/handler.ts
  // => nice-function
  const functionName = fnPath.split(path.sep).slice(-3, -1).join("-");

  // path-a/functions/my-func/handler.ts
  // => my-func
  if (functionName.startsWith("functions-")) return functionName.slice(10);

  return functionName;
};

export const getFunctionPaths = (pathMatch?: string) => {
  const functionsRoot = `.${path.sep}src${path.sep}functions`;
  const namespaces = fs.readdirSync(functionsRoot);

  const allFunctionPaths = namespaces.reduce((paths: string[], namespace) => {
    if (fs.lstatSync(`${functionsRoot}${path.sep}${namespace}`).isFile()) {
      return paths;
    }

    return paths.concat(
      getAssetPaths({
        basePath: `${functionsRoot}${path.sep}${namespace}`,
        fileName: "handler.ts",
      })
    );
  }, []);

  return filterPaths(allFunctionPaths, pathMatch);
};

// generic asset path retrieval (internal helper used for getting function
// paths as well as resource paths for transaction sets
const getAssetPaths = (resourceFile: Required<ResourceFile>): string[] => {
  const assets = fs.readdirSync(resourceFile.basePath);

  return assets.reduce((collectedAssets: string[], assetName) => {
    // root functions
    if (assetName === resourceFile.fileName)
      return [`${resourceFile.basePath}${path.sep}${assetName}`];

    // namespaced functions
    if (
      fs
        .lstatSync(`${resourceFile.basePath}${path.sep}${assetName}`)
        .isFile() ||
      !fs.existsSync(
        `${resourceFile.basePath}${path.sep}${assetName}${path.sep}${resourceFile.fileName}`
      )
    ) {
      return collectedAssets;
    }

    return collectedAssets.concat(
      `${resourceFile.basePath}${path.sep}${assetName}${path.sep}${resourceFile.fileName}`
    );
  }, []);
};

// helper function to filter out paths that don't include the `pathMatch` string, and to check for `no match`
const filterPaths = (paths: string[], pathMatch?: string): string[] => {
  if (pathMatch) {
    paths = paths.filter((p) => p.includes(`${path.sep}${pathMatch}`));
  }

  return paths;
};
