import { deployResources } from "../deploy/deploy-resources.js";

export const command = "deploy";

export const desc = "Deploys resources to Stedi";

export const builder = {
  path: {
    default: "",
    describe:
      "deploy a subset of resources by specifying a folder path containing functions to deploy",
  },
};

export const handler = async (argv: { path?: string }) => {
  console.log(`Deploying...`);
  await deployResources(argv.path);
};
