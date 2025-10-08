import { LocalDurableTestRunner } from "@aws/durable-execution-sdk-js-testing";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { handler } from "../src/parallel-invocation.js";

vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
	BedrockRuntimeClient: class {
		send = vi.fn().mockResolvedValue({
			output: { message: { content: [{ text: "Mock response" }] } },
		});
	},
	ConverseCommand: vi.fn(),
}));

beforeAll(() => LocalDurableTestRunner.setupTestEnvironment());
afterAll(() => LocalDurableTestRunner.teardownTestEnvironment());

describe("Parallel Invocation", () => {
	it("should invoke multiple prompts in parallel", async () => {
		const runner = new LocalDurableTestRunner({ handlerFunction: handler });

		const result = await runner.run({
			payload: { topic: "quantum computing" },
		});

		const output = result.getResult();
		const operations = result.getOperations();

		expect(operations).toHaveLength(4);

		expect(output.topic).toBe("quantum computing");
		expect(output.perspectives).toHaveLength(3);
		expect(output.perspectives[0]).toHaveProperty("prompt");
		expect(output.perspectives[0]).toHaveProperty("response");
	});
});
