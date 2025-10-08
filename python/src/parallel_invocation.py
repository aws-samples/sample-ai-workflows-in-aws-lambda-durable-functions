from aws_durable_execution_sdk_python import DurableContext, durable_execution

from src.utils.constants import MODEL
from src.utils.converse import converse

PROMPTS = [
    "Explain the benefits of",
    "Describe the challenges of",
    "Summarize the future of",
]


@durable_execution
def handler(event: dict, context: DurableContext):
    event = event or {}
    topic = event.get("topic", "artificial intelligence")

    result = context.map(
        PROMPTS,
        lambda ctx, prompt, idx, items: {
            "prompt": prompt,
            "response": converse(MODEL["SMALL"], f"{prompt} {topic}"),
        },
        "Get perspectives",
    )

    return {"topic": topic, "perspectives": result.get_results()}
