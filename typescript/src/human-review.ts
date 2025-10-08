import {
	type DurableContext,
	withDurableExecution,
} from "@aws/durable-execution-sdk-js";
import { z } from "zod";
import { MODEL } from "./utils/constants.js";
import { converse } from "./utils/converse.js";
import { logger } from "./utils/logger.js";

const ReviewResultSchema = z.object({
	approved: z.boolean(),
	notes: z.string().optional(),
});

/**
 * Human Review Example
 *
 * Demonstrates integrating a human review step in a generative AI workflow.
 * Uses waitForCallback to pause execution until human approval is received.
 */
export const handler = withDurableExecution(
	async (event: { document?: string }, context: DurableContext) => {
		const document = event.document ?? "Sample invoice with amount $1,234.56";

		// Step 1: Extract fields using LLM
		const extractedFields = await context.step("extract fields", async () =>
			converse(
				MODEL.MEDIUM,
				`Extract key fields from this document as JSON: "${document}"`,
			),
		);

		// Step 2: Wait for human review
		const reviewResultStr = await context.waitForCallback<string>(
			"Await Human review",
			async (callbackId) => {
				// In production, send this callbackId to a review system/email
				sendForReview(callbackId, document, extractedFields);
			},
			{ timeout: { days: 7 } },
		);
		const reviewResult = ReviewResultSchema.parse(JSON.parse(reviewResultStr));
		if (!reviewResult.approved) {
			// Step 3: Process based on review outcome
			return { status: "rejected", notes: reviewResult.notes, extractedFields };
		}
		return { status: "approved", extractedFields };
	},
);

const sendForReview = (
	callbackId: string,
	document: string,
	extractedFields: string,
) => {
	// Callback token not logged here - for demo purposes, access it in the console
	logger.info("Review required", { document, extractedFields });
};
