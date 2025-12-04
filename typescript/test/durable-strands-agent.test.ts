import { LocalDurableTestRunner } from "@aws/durable-execution-sdk-js-testing";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { handler } from "../src/durable-strands-agent.js";

vi.mock("@strands-agents/sdk", () => ({
	BedrockModel: class {},
	Agent: class {
		invoke = vi.fn().mockResolvedValue({
			lastMessage: "The capital of France is Paris.",
		});
	},
}));

beforeAll(() => LocalDurableTestRunner.setupTestEnvironment());
afterAll(() => LocalDurableTestRunner.teardownTestEnvironment());

describe("Durable Strands Agent", () => {
	it("should wrap strands agent in durable step and checkpoint response", async () => {
		const runner = new LocalDurableTestRunner({ handlerFunction: handler });

		const result = await runner.run({
			payload: { prompt: "What is the capital of France?" },
		});

		expect(result.getResult()).toEqual({
			prompt: "What is the capital of France?",
			response: "The capital of France is Paris.",
		});

		const operations = result.getOperations();
		expect(operations).toHaveLength(1);
	});
});
