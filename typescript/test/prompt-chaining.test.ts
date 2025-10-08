import { LocalDurableTestRunner } from "@aws/durable-execution-sdk-js-testing";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { handler } from "../src/prompt-chaining.js";

vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
	BedrockRuntimeClient: class {
		send = vi.fn().mockResolvedValue({
			output: { message: { content: [{ text: "mocked response" }] } },
		});
	},
	ConverseCommand: vi.fn(),
}));

beforeAll(() => LocalDurableTestRunner.setupTestEnvironment());
afterAll(() => LocalDurableTestRunner.teardownTestEnvironment());

describe("Prompt Chaining", () => {
	it("should chain LLM calls and return joke with review", async () => {
		const runner = new LocalDurableTestRunner({ handlerFunction: handler });

		const result = await runner.run({ payload: { topic: "cats" } });

		expect(result.getResult()).toEqual({
			joke: "mocked response",
			review: "mocked response",
		});

		const operations = result.getOperations();
		expect(operations).toHaveLength(2);
	});
});
