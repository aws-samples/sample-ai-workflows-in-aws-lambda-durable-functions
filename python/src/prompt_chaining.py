from aws_durable_execution_sdk_python import DurableContext, durable_execution

from src.utils.constants import MODEL
from src.utils.converse import converse


@durable_execution
def handler(event: dict, context: DurableContext):
    event = event or {}
    topic = event.get("topic", "programming")

    joke = context.step(
        lambda _: converse(MODEL["SMALL"], f"Make a joke about {topic}"),
        "generate joke",
    )

    review = context.step(
        lambda _: converse(
            MODEL["SMALL"], f'Rate this joke 1-10 and explain why: "{joke}"'
        ),
        "review joke",
    )

    return {"joke": joke, "review": review}
