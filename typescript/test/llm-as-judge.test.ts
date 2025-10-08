import { LocalDurableTestRunner } from "@aws/durable-execution-sdk-js-testing";
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest";
import { handler } from "../src/llm-as-judge";

let callCount = 0;

vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
	BedrockRuntimeClient: class {
		send = vi.fn().mockImplementation(() => {
			callCount++;
			if (callCount <= 2) {
				return Promise.resolve({
					output: { message: { content: [{ text: `Answer ${callCount}` }] } },
				});
			}
			return Promise.resolve({
				output: { message: { content: [{ text: "1" }] } },
			});
		});
	},
	ConverseCommand: vi.fn(),
}));

beforeAll(() => LocalDurableTestRunner.setupTestEnvironment());
afterAll(() => LocalDurableTestRunner.teardownTestEnvironment());
beforeEach(() => {
	callCount = 0;
});

describe("LLM as a Judge", () => {
	it("should get responses from multiple models and pick the best", async () => {
		const runner = new LocalDurableTestRunner({ handlerFunction: handler });

		const result = await runner.run({ payload: { question: "What is 2+2?" } });

		const output = result.getResult() as {
			question: string;
			bestAnswer: string;
		};
		expect(output.question).toBe("What is 2+2?");
		expect(output.bestAnswer).toBe("Answer 1");
	});
});
