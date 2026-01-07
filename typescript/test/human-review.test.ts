import {
	LocalDurableTestRunner,
	WaitingOperationStatus,
} from "@aws/durable-execution-sdk-js-testing";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { handler } from "../src/human-review.js";

vi.mock("@aws-sdk/client-bedrock-runtime", () => ({
	BedrockRuntimeClient: class {
		send = vi.fn().mockResolvedValue({
			output: { message: { content: [{ text: '{"amount": "$1,234.56"}' }] } },
		});
	},
	ConverseCommand: vi.fn(),
}));

beforeAll(() =>
	LocalDurableTestRunner.setupTestEnvironment({ skipTime: true }),
);
afterAll(() => LocalDurableTestRunner.teardownTestEnvironment());

describe("Human Review", () => {
	it("should approve after human review callback", async () => {
		const runner = new LocalDurableTestRunner({ handlerFunction: handler });

		const callbackOp = runner.getOperation("Await Human review");

		const resultPromise = runner.run({ payload: { document: "Invoice #123" } });

		await callbackOp.waitForData(WaitingOperationStatus.SUBMITTED);
		await callbackOp.sendCallbackSuccess(JSON.stringify({ approved: true }));

		const result = await resultPromise;

		expect(result.getResult()).toEqual({
			status: "approved",
			extractedFields: '{"amount": "$1,234.56"}',
		});
	});

	it("should reject when human review denies", async () => {
		const runner = new LocalDurableTestRunner({ handlerFunction: handler });

		const callbackOp = runner.getOperation("Await Human review");

		const resultPromise = runner.run();

		await callbackOp.waitForData(WaitingOperationStatus.SUBMITTED);
		await callbackOp.sendCallbackSuccess(
			JSON.stringify({ approved: false, notes: "Invalid document" }),
		);

		const result = await resultPromise;

		expect(result.getResult()).toEqual({
			status: "rejected",
			notes: "Invalid document",
			extractedFields: '{"amount": "$1,234.56"}',
		});
	});
});
