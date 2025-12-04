"""
Durable Strands Agent Example

Demonstrates wrapping a Strands agent in a durable step.
The agent response is checkpointed, so on replay the same
result is returned without re-executing the agent.
"""

from aws_durable_execution_sdk_python import DurableContext, durable_execution
from strands import Agent
from strands.models import BedrockModel


def invoke_agent(prompt: str) -> str:
    agent = Agent(model=BedrockModel())
    result = agent(prompt)
    return result.message["content"][0]["text"]


@durable_execution
def handler(event: dict, context: DurableContext):
    event = event or {}
    prompt = event.get("prompt", "What is the capital of France?")

    response = context.step(lambda _: invoke_agent(prompt), "strands agent")

    return {"prompt": prompt, "response": response}
