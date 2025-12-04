import {
	type DurableContext,
	withDurableExecution,
} from "@aws/durable-execution-sdk-js";
import { Agent, BedrockModel } from "@strands-agents/sdk";

/**
 * Durable Strands Agent Example
 *
 * Demonstrates wrapping a Strands agent in a durable step.
 * The agent response is checkpointed, so on replay the same
 * result is returned without re-executing the agent.
 */
export const handler = withDurableExecution(
	async (event: { prompt?: string }, context: DurableContext) => {
		const prompt = event.prompt ?? "What is the capital of France?";

		// Wrap the Strands agent in a durable step for checkpointing
		const response = await context.step("strands agent", async () => {
			const agent = new Agent({ model: new BedrockModel() });
			const result = await agent.invoke(prompt);
			return result.lastMessage;
		});

		return { prompt, response };
	},
);
