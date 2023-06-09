import dotenv from "dotenv";
import { compile, packForDeployment } from "./compile.js";
import { createFunction, updateFunction } from "./functions.js";
import { functionNameFromPath, getFunctionPaths } from "./utils.js";
import { waitUntilFunctionCreateComplete } from "@stedi/sdk-client-functions";
import { GetAwsAccessCommand } from "@stedi/sdk-client-exchange-credentials";

import { functionsClient } from "../clients/functions.js";
import { maxWaitTime } from "../common/constants.js";
import { requiredEnvVar } from "../common/environment.js";
import { credsClient } from "../clients/credentials.js";

const functions = functionsClient();
const credentials = credsClient();

const createOrUpdateFunction = async (
  functionName: string,
  functionPackage: Uint8Array,
  stediAccountId: string,
  environmentVariables?: Record<string, string>
) => {
  try {
    await updateFunction(
      functionName,
      functionPackage,
      stediAccountId,
      environmentVariables
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "ResourceNotFoundException"
    )
      await createFunction(
        functionName,
        functionPackage,
        stediAccountId,
        environmentVariables
      );
    else throw error;
  }
};

const resolveAccountId = async (): Promise<string> => {
  const response = await credentials.send(new GetAwsAccessCommand({}));
  if (response.webIdentityToken === undefined)
    throw new Error("failure trying to authenticate");

  const base64Payload = response.webIdentityToken.split(".")[1];
  if (base64Payload === undefined)
    throw new Error("failure trying to authenticate");

  const payload = Buffer.from(base64Payload, "base64");
  const decodedJWT = JSON.parse(payload.toString()) as Record<string, string>;

  const accountId = decodedJWT["stedi:accountId"];
  if (accountId === undefined)
    throw new Error("failure trying to determine Stedi account id");

  return accountId;
};

export const deployResources = async (pathMatch?: string) => {
  const stediApiKey = requiredEnvVar("STEDI_API_KEY");
  if (stediApiKey === "<YOUR_STEDI_API_KEY_HERE>") {
    console.log(
      `Failed: You must first set the STEDI_API_KEY environment variable in the .env file.
 
You can generate a new API key here: https://www.stedi.com/app/settings/api-keys`
    );
    process.exit(1);
  }
  const stediAccountId = await resolveAccountId();
  const functionPaths = getFunctionPaths(pathMatch);

  const FUNCTION_NAMES: string[] = [];
  const promises: Promise<unknown>[] = functionPaths.map(async (fnPath) => {
    const functionName = functionNameFromPath(fnPath);

    console.log(`Deploying ${functionName}`);

    // compiling function code
    const jsPath = await compile(fnPath);
    const code = await packForDeployment(jsPath);

    // deploying functions
    try {
      const functionPackage = new Uint8Array(code);
      const environmentVariables = dotenv.config().parsed ?? {};
      environmentVariables.NODE_OPTIONS = "--enable-source-maps";
      environmentVariables.STEDI_FUNCTION_NAME = functionName;

      await createOrUpdateFunction(
        functionName,
        functionPackage,
        stediAccountId,
        environmentVariables
      );

      await waitUntilFunctionCreateComplete(
        { client: functions, maxWaitTime },
        { functionName }
      );
      FUNCTION_NAMES.push(functionName);

      console.log(`Done ${functionName}`);
    } catch (e: unknown) {
      console.error(e);
    }
  });

  console.log("Waiting for function deploys to complete");
  await Promise.all(promises);

  console.log(`Deploy completed at: ${new Date().toLocaleString()}`);
};
