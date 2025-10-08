import {
	BedrockRuntimeClient,
	ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";

const bedrock = new BedrockRuntimeClient({});

export async function converse(
	modelId: string,
	prompt: string,
): Promise<string> {
	const response = await bedrock.send(
		new ConverseCommand({
			modelId,
			messages: [{ role: "user", content: [{ text: prompt }] }],
		}),
	);
	return response.output?.message?.content?.[0].text ?? "";
}
