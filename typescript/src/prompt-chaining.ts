import {
	type DurableContext,
	withDurableExecution,
} from "@aws/durable-execution-sdk-js";

import { MODEL } from "./utils/constants.js";
import { converse } from "./utils/converse.js";

export const handler = withDurableExecution(
	async (event: { topic?: string }, context: DurableContext) => {
		const topic = event.topic ?? "programming";

		// Step 1: Generate a joke
		const joke = await context.step("generate joke", async () => {
			return await converse(MODEL.SMALL, `Make a joke about ${topic}`);
		});

		// Step 2: Review the joke
		const review = await context.step("review joke", async () => {
			return await converse(
				MODEL.SMALL,
				`Rate this joke 1-10 and explain why: "${joke}"`,
			);
		});
		return { joke, review };
	},
);
