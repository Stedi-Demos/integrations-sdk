import * as z from "zod";
import { EventHeaderSchema } from "./partial/event-header.js";

export const CoreFileProcessedV2EventSchema = EventHeaderSchema.extend({
  source: z.literal("stedi.core"),
  "detail-type": z.literal("file.processed.v2"),
  account: z.string(),
  detail: z.object({
    fileExecutionId: z.string(),
    processedAt: z.string(),
    partnershipId: z.string().optional(),
    connectionId: z.string().optional(),
    artifacts: z
      .array(
        z.object({
          artifactType: z
            .enum([
              "application/edi-x12",
              "application/edifact",
              "application/filepart",
              "application/json",
              "application/pdf",
              "application/xml",
              "application/zip",
              "text/csv",
              "text/psv",
              "text/tsv",
              "UNKNOWN",
            ])
            .or(z.string()),
          usage: z.enum(["input"]).or(z.string()),
          sizeBytes: z.number().int(),
          url: z.string(),
        })
      )
      .min(1),
    source: z.object({
      name: z.string(),
    }),
  }),
});

export type CoreFileProcessedV2Event = z.infer<
  typeof CoreFileProcessedV2EventSchema
>;
