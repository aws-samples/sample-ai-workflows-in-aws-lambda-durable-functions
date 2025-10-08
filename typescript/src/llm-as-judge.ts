import {
	type DurableContext,
	withDurableExecution,
} from "@aws/durable-execution-sdk-js";
import { MODEL } from "./utils/constants.js";
import { converse } from "./utils/converse.js";

const MODELS = [MODEL.SMALL, MODEL.MEDIUM];

/**
 * LLM as a Judge Example
 *
 * Demonstrates getting responses from multiple LLMs in parallel,
 * then using another LLM to determine the best answer.
 * The entire evaluation is wrapped in a child context for checkpointing.
 */
export const handler = withDurableExecution(
	async (event: { question?: string }, context: DurableContext) => {
		const question =
			event.question ?? "Write an 100 word summary on the great fire of London";

		// Wrap entire evaluation in a child context
		const result = await context.map(
			"Get candidate answers",
			MODELS,
			async (_, modelId) => ({
				modelId,
				answer: await converse(modelId, question),
			}),
			{ itemNamer: (item) => `candidate-${item}` },
		);

		const candidates = result.getResults();

		// Judge picks the best answer
		const judgment = await context.step("judge", async () => {
			const prompt = `Question: "${question}"

Responses:
${candidates.map((r, i) => `${i + 1}. (Model: ${r.modelId}) ${r.answer}`).join("\n")}

Which response is best? Reply with JSON: {"bestIndex": <1-based index>, "reasoning": "<why>"}`;

			const response = await converse(MODEL.SMALL, prompt);
			const parsed = JSON.parse(response.match(/\{[\s\S]*\}/)?.[0] ?? "{}");
			const bestIndex = (parsed.bestIndex ?? 1) - 1;
			const best = candidates[bestIndex] ?? candidates[0];

			return {
				bestAnswer: best.answer,
				reasoning: parsed.reasoning ?? "",
				sourceModel: best.modelId,
			};
		});

		return { question, ...judgment };
	},
);
