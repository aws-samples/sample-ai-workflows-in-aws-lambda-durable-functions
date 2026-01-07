import {
	LocalDurableTestRunner,
	WaitingOperationStatus,
} from "@aws/durable-execution-sdk-js-testing";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { handler } from "../src/agent.js";

let callCount = 0;

vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
	BedrockRuntimeClient: class {
		send = vi.fn().mockImplementation(() => {
			callCount++;
			if (callCount === 1) {
				return Promise.reject(new Error("Throttled"));
			}
			if (callCount === 2) {
				return Promise.resolve({
					stopReason: "tool_use",
					output: {
						message: {
							role: "assistant",
							content: [
								{
									toolUse: { toolUseId: "1", name: "get_location", input: {} },
								},
							],
						},
					},
				});
			}
			if (callCount === 3) {
				return Promise.resolve({
					stopReason: "tool_use",
					output: {
						message: {
							role: "assistant",
							content: [
								{
									toolUse: {
										toolUseId: "2",
										name: "get_weather",
										input: { location: "London, UK" },
									},
								},
							],
						},
					},
				});
			}
			if (callCount === 4) {
				return Promise.resolve({
					stopReason: "tool_use",
					output: {
						message: {
							role: "assistant",
							content: [
								{
									toolUse: {
										toolUseId: "3",
										name: "wait_for_human_review",
										input: { question: "Is this weather correct?" },
									},
								},
							],
						},
					},
				});
			}
			return Promise.resolve({
				stopReason: "end_turn",
				output: {
					message: {
						role: "assistant",
						content: [{ text: "The weather in London is sunny, 72°F." }],
					},
				},
			});
		});
	},
	ConverseCommand: vi.fn(),
	Tool: vi.fn(),
	Message: vi.fn(),
	ContentBlock: vi.fn(),
}));

beforeAll(() =>
	LocalDurableTestRunner.setupTestEnvironment({ skipTime: true }),
);
afterAll(() => LocalDurableTestRunner.teardownTestEnvironment());
beforeEach(() => {
	callCount = 0;
});

describe("Agent", () => {
	it("should execute tools including human review and return final response", async () => {
		const runner = new LocalDurableTestRunner({ handlerFunction: handler });

		const callbackOp = runner.getOperation("human_review");
		const resultPromise = runner.run({
			payload: { prompt: "What's the weather?" },
		});

		await callbackOp.waitForData(WaitingOperationStatus.SUBMITTED);
		await callbackOp.sendCallbackSuccess("Approved");

		const result = await resultPromise;

		expect(result.getResult()).toBe("The weather in London is sunny, 72°F.");
	});
});
