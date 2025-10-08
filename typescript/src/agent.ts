import {
	type DurableContext,
	withDurableExecution,
} from "@aws/durable-execution-sdk-js";
import {
	BedrockRuntimeClient,
	type ContentBlock,
	ConverseCommand,
	type Message,
	type Tool,
} from "@aws-sdk/client-bedrock-runtime";
import { MODEL } from "./utils/constants.js";
import { logger } from "./utils/logger.js";

const bedrock = new BedrockRuntimeClient({});

type AgentTool = {
	toolSpec: NonNullable<Tool["toolSpec"]>;
	execute: (
		input: Record<string, string>,
		context: DurableContext,
	) => Promise<string>;
};

const getLocationTool: AgentTool = {
	toolSpec: {
		name: "get_location",
		description: "Get the user's current location.",
		inputSchema: { json: { type: "object", properties: {} } },
	},
	execute: async () => "London, UK",
};

const getWeatherTool: AgentTool = {
	toolSpec: {
		name: "get_weather",
		description: "Get the current weather for a location.",
		inputSchema: {
			json: {
				type: "object",
				properties: { location: { type: "string" } },
				required: ["location"],
			},
		},
	},
	execute: async (input) => `The weather in ${input.location} is sunny, 72°F.`,
};

const waitForHumanReview: AgentTool = {
	toolSpec: {
		name: "wait_for_human_review",
		description:
			"Request human review and wait for response. Use when you need human approval or input.",
		inputSchema: {
			json: {
				type: "object",
				properties: { question: { type: "string" } },
				required: ["question"],
			},
		},
	},
	// Callback token not logged here - for demo purposes, access it in the console
	execute: async (input, context) =>
		context.waitForCallback<string>("human_review", async (callbackId) => {
			logger.info("Review needed", { question: input.question });
		}),
};

/**
 * Vanilla Agent Example
 *
 * Demonstrates a simple agentic loop with tool use.
 * Each LLM call and tool execution is checkpointed.
 */
export const handler = withDurableExecution(
	async (event: { prompt?: string }, context: DurableContext) => {
		const prompt =
			event.prompt ??
			"What's the weather where I am? Get human review before you return the answer";
		const messages: Message[] = [{ role: "user", content: [{ text: prompt }] }];

		const tools = [getLocationTool, getWeatherTool, waitForHumanReview];
		const toolsByName = Object.fromEntries(
			tools.map((t) => [t.toolSpec!.name, t]),
		);

		while (true) {
			const response = await context.step("converse", async () => {
				return bedrock.send(
					new ConverseCommand({
						modelId: MODEL.MEDIUM,
						messages,
						toolConfig: { tools: tools.map((t) => ({ toolSpec: t.toolSpec })) },
					}),
				);
			});

			const output = response.output!.message!;
			messages.push(output);

			if (response.stopReason === "end_turn") {
				const textBlock = output.content?.find(
					(b): b is ContentBlock.TextMember => "text" in b,
				);
				return textBlock?.text ?? "";
			}

			const toolResults: ContentBlock[] = [];
			for (const block of output.content ?? []) {
				if ("toolUse" in block && block.toolUse) {
					const { toolUseId, name, input } = block.toolUse;
					const tool = toolsByName[name!];
					const result = await context.runInChildContext(
						`tool:${name}`,
						async (childContext) => {
							return tool.execute(
								input as Record<string, string>,
								childContext,
							);
						},
					);
					toolResults.push({
						toolResult: { toolUseId, content: [{ text: result }] },
					});
				}
			}

			messages.push({ role: "user", content: toolResults });
		}
	},
);
