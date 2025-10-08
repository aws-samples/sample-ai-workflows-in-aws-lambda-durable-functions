import { LocalDurableTestRunner } from "@aws/durable-execution-sdk-js-testing";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { handler } from "../src/structured-output.js";

vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
	BedrockRuntimeClient: class {
		send = vi
			.fn()
			.mockResolvedValueOnce({
				output: { message: { content: [{ text: "not valid json" }] } },
			})
			.mockResolvedValueOnce({
				output: {
					message: {
						content: [
							{
								text: '{"name": "John", "email": "john@test.com", "company": "Acme"}',
							},
						],
					},
				},
			});
	},
	ConverseCommand: vi.fn(),
}));

beforeAll(() => LocalDurableTestRunner.setupTestEnvironment());
afterAll(() => LocalDurableTestRunner.teardownTestEnvironment());

describe("Structured Output", () => {
	it("should retry on invalid JSON and extract valid contact info", async () => {
		const runner = new LocalDurableTestRunner({ handlerFunction: handler });

		const result = await runner.run({
			payload: { text: "John from Acme, john@test.com" },
		});

		expect(result.getResult()).toEqual({
			name: "John",
			email: "john@test.com",
			company: "Acme",
		});
		expect(result.getOperations()).toHaveLength(1);
	});
});
