import test from "ava";
import { failureResponse } from "../failureResponse.js";

const invocationIds = {
  invocationId: "invocationId",
  namespace: "namespace",
  operationName: "operationName",
  configurationId: "configurationId",
};

test("basic", (t) => {
  const result = failureResponse({
    invocationIds,
    message: "I failed myself",
  });

  t.deepEqual(result, {
    ...invocationIds,
    output: [],
    logs: [
      {
        level: "ERROR",
        message: "I failed myself",
        details: {},
      },
    ],
    status: "ERROR",
  });
});

test("with details", (t) => {
  const result = failureResponse({
    invocationIds,
    message: "I failed myself",
    details: {
      toe: "stubbed",
      level: 4,
      describe: "worse pain imaginable",
    },
  });

  t.deepEqual(result, {
    ...invocationIds,
    output: [],
    logs: [
      {
        level: "ERROR",
        message: "I failed myself",
        details: {
          toe: "stubbed",
          level: 4,
          describe: "worse pain imaginable",
        },
      },
    ],
    status: "ERROR",
  });
});

test("with logs", (t) => {
  const result = failureResponse({
    invocationIds,
    message: "I failed myself",
    logs: [
      {
        level: "INFO",
        message: "Everything was going fine, then...",
      },
    ],
  });

  t.deepEqual(result, {
    ...invocationIds,
    output: [],
    logs: [
      {
        level: "INFO",
        message: "Everything was going fine, then...",
      },
      {
        level: "ERROR",
        message: "I failed myself",
        details: {},
      },
    ],
    status: "ERROR",
  });
});
