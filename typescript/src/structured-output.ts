import {
	type DurableContext,
	withDurableExecution,
} from "@aws/durable-execution-sdk-js";
import { z } from "zod";
import { MODEL } from "./utils/constants.js";
import { converse } from "./utils/converse.js";

const ExtractedContact = z.object({
	name: z.string(),
	email: z.string(),
	company: z.string(),
});

async function extractContact(text: string) {
	const raw = await converse(
		MODEL.SMALL,
		`Extract contact info as JSON with keys "name", "email", "company": ${text}`,
	);
	const match = raw.match(/\{[^}]+\}/);
	if (!match) throw new Error("No JSON found in response");
	return ExtractedContact.parse(JSON.parse(match[0]));
}

export const handler = withDurableExecution(
	async (event: { text?: string }, context: DurableContext) => {
		const text =
			event.text ?? "John Smith from Acme Corp, email: john@acme.com";
		return await context.step("extract", () => extractContact(text));
	},
);
