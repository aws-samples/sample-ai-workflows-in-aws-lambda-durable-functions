import {
	type DurableContext,
	withDurableExecution,
} from "@aws/durable-execution-sdk-js";
import { MODEL } from "./utils/constants.js";
import { converse } from "./utils/converse.js";

const PROMPTS = [
	"Explain the benefits of",
	"Describe the challenges of",
	"Summarize the future of",
];

/**
 * Parallel Invocation Example
 *
 * Demonstrates invoking multiple prompts at once in a workflow,
 * for either breakdown of work or requesting multiple views/approaches on a single topic.
 */
export const handler = withDurableExecution(
	async (event: { topic?: string }, context: DurableContext) => {
		const topic = event.topic ?? "artificial intelligence";

		const result = await context.map(
			"Get perspectives",
			PROMPTS,
			async (_, prompt) => ({
				prompt,
				response: await converse(MODEL.SMALL, `${prompt} ${topic}`),
			}),
			{ itemNamer: (_, i) => `prompt-${i}` },
		);

		return {
			topic,
			perspectives: result.getResults(),
		};
	},
);
