import {
  StediPluginInvocationIdentifiers,
  StediPluginInvocationResult,
} from "../types.js";

interface FailureResponseParams {
  invocationIds: StediPluginInvocationIdentifiers;
  message: string;
  details?: Record<string, unknown>;
  logs?: StediPluginInvocationResult["logs"];
}

export const failureResponse = ({
  invocationIds,
  message,
  details = {},
  logs = [],
}: FailureResponseParams): StediPluginInvocationResult => {
  logs.push({
    level: "ERROR",
    message,
    details,
  });

  return {
    invocationId: invocationIds.invocationId,
    namespace: invocationIds.namespace,
    operationName: invocationIds.operationName,
    configurationId: invocationIds.configurationId,
    status: "ERROR",
    output: [],
    logs,
  };
};
