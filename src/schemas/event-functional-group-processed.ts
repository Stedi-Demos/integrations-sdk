import * as z from "zod";
import { EventInterchangeSchema } from "./partial/event-interchange.js";
import { EventFunctionalGroupSchema } from "./partial/event-functional-group.js";
import { EventHeaderSchema } from "./partial/event-header.js";

export const CoreFunctionalGroupProcessedEventSchema = EventHeaderSchema.extend(
  {
    source: z.literal("stedi.core"),
    ["detail-type"]: z.literal("functional_group.processed"),
    detail: z.strictObject({
      version: z.literal("2023-02-13"),
      direction: z.enum(["SENT", "RECEIVED"]),
      metadata: z.object({
        processedAt: z.string(),
        fileExecutionId: z.string(),
      }),
      envelopes: z.strictObject({
        interchange: EventInterchangeSchema,
        functionalGroup: EventFunctionalGroupSchema,
      }),
      transactionSetIds: z.array(z.string()),
      transactionSetCount: z.number(),
      input: z.strictObject({
        type: z.literal("EDI/X12"),
        bucketName: z.string(),
        key: z.string(),
      }),
      partnership: z.strictObject({
        partnershipId: z.string(),
        sender: z.strictObject({
          profileId: z.string(),
          isa: z.strictObject({
            id: z.string(),
            qualifier: z.string().length(2),
          }),
        }),
        receiver: z.strictObject({
          profileId: z.string(),
          isa: z.strictObject({
            id: z.string(),
            qualifier: z.string().length(2),
          }),
        }),
      }),
    }),
  }
);

export type CoreFunctionalGroupProcessedEvent = z.infer<
  typeof CoreFunctionalGroupProcessedEventSchema
>;
