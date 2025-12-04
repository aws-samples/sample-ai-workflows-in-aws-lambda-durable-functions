# AI Workflows in AWS Lambda Durable Functions

![CI status badge](https://github.com/aws-samples/sample-durable-executions-with-ai/actions/workflows/ci.yml/badge.svg)

> [!NOTE]
> This is a sample project demonstrating AI workflow patterns with AWS Lambda durable functions and Amazon Bedrock.

## What is this repository?

This repository contains example implementations of common AI workflow patterns using AWS Lambda durable functions.

Patterns included:
- Prompt Chaining
- Human Review
- LLM as Judge
- Agent with Tools
- Parallel Invocation
- Structured Output
- Durable Strands Agent

All examples are implemented in both Python and TypeScript.

## What is AWS Lambda durable functions?

[AWS Lambda durable functions](https://aws.amazon.com/lambda/lambda-durable-functions/) enable you to build resilient multi-step applications that can execute for up to one year while maintaining progress despite interruptions.

Durable functions enables:
- **Checkpointing** - Automatically save progress at each step
- **Replay** - Resume from the last checkpoint after error
- **Suspension** - Pause execution (e.g., for human review) without incurring compute charges
- **Familiar programming model** - Write sequential code using the durable execution SDK in Python or TypeScript
- **Local Testing** - Test your Lambda durable functions locally using the TypeScript or Python Local Test Runner

## Why durable functions for AI workflows?

- **Long-running operations** - LLM calls can take seconds to minutes; multi-step workflows may span hours or days waiting for human review
- **Non-deterministic outputs** - LLMs are non deterministic. They will return different results to the same prompt. Using checkpointing, you can convert your workflow to retry deterministically.
- **Expensive retries** - Re-running failed workflows creates additional cost and increases execution time. Durable functions resume from the last checkpoint after a retry.
- **Human-in-the-loop** - Workflows can suspend whilst awaiting human approval without consuming compute resources
- **Complex orchestration** - Workflows with agent loops, parallel model calls, and chained prompts are expressed as simple sequential code

## Example Patterns

### 1. Prompt Chaining

Sequential LLM calls where each step builds on the previous one.
- Automatically retries failed LLM calls
- Checkpoints each response for deterministic replay

```python
joke = context.step(
    lambda _: converse(MODEL["SMALL"], f"Make a joke about {topic}"),
    "generate joke",
)
review = context.step(
    lambda _: converse(MODEL["SMALL"], f'Rate this joke 1-10: "{joke}"'),
    "review joke",
)
```

[TypeScript](typescript/src/prompt-chaining.ts) | [Python](python/src/prompt_chaining.py)

### 2. Human Review

Pause workflow for human approval before continuing.
- Suspends execution whilst awaiting human review.
- Resumes with approval, rejection, or custom response data

```python
extracted_fields = context.step(
    lambda _: converse(MODEL["MEDIUM"], f'Extract key fields from: "{document}"'),
    "extract fields",
)
review_result = context.wait_for_callback(
    lambda callback_id: send_for_review(callback_id, document, extracted_fields),
    "Await Human review",
    WaitForCallbackConfig(timeout=Duration.from_days(7)),
)
```

[TypeScript](typescript/src/human-review.ts) | [Python](python/src/human_review.py)

### 3. LLM as Judge

Get multiple AI responses in parallel, then use another LLM to pick the best one.
- Checkpoints candidate answers and final selection
- Replay returns the same result without re-executing LLM calls

```python
result = context.map(
    MODELS,
    lambda ctx, model_id, idx, items: {
        "modelId": model_id,
        "answer": converse(model_id, question),
    },
    "Get candidate answers",
)
judgment = context.step(lambda _: judge_responses(result.get_results()), "judge")
```

[TypeScript](typescript/src/llm-as-judge.ts) | [Python](python/src/llm_as_judge.py)

### 4. Agent with Tools

Agentic loop where the LLM can call tools, including tools that suspend for human input.
- Checkpoints each model and tool call for deterministic replay
- Tools can suspend the agent to wait for external input

```python
# Tools can use durable context features via run_in_child_context
for block in output.get("content", []):
    if "toolUse" in block:
        tool_use = block["toolUse"]
        tool = tools_by_name[tool_use["name"]]
        result = context.run_in_child_context(
            lambda child_ctx: tool.execute(tool_use.get("input", {}), child_ctx),
            f"tool:{tool_use['name']}",
        )
```

[TypeScript](typescript/src/agent.ts) | [Python](python/src/agent.py)

### 5. Parallel Invocation

Run multiple prompts simultaneously with individual checkpointing.
- Faster execution through concurrent LLM calls
- Each response is checkpointed independently
```python
result = context.map(
    PROMPTS,
    lambda ctx, prompt, idx, items: {
        "prompt": prompt,
        "response": converse(MODEL["SMALL"], f"{prompt} {topic}"),
    },
    "Get perspectives",
)
```

[TypeScript](typescript/src/parallel-invocation.ts) | [Python](python/src/parallel_invocation.py)

### 6. Structured Output

Get JSON output from an LLM and validate it against a schema.
- Automatic retry on validation errors
- Schema enforcement with Pydantic (Python) or Zod (TypeScript)

```python
class ExtractedContact(BaseModel):
    name: str
    email: str
    company: str

def extract_contact(text: str) -> dict:
    raw = converse(MODEL["SMALL"], f'Extract contact info as JSON: {text}')
    return ExtractedContact(**json.loads(parse_json(raw))).model_dump()

return context.step(lambda _: extract_contact(text), "extract")
```

[TypeScript](typescript/src/structured-output.ts) | [Python](python/src/structured_output.py)

### 7. Durable Strands Agent

Wrap a Strands agent in a durable step for checkpointing.
- Agent response is checkpointed after successful completion
- On replay, returns the same result without re-executing the agent
- Useful as part of larger workflows for deterministic replay

```typescript
const response = await context.step("strands agent", async () => {
    const agent = new Agent({ model: new BedrockModel() });
    const result = await agent.invoke(prompt);
    return result.lastMessage;
});
```

[TypeScript](typescript/src/durable-strands-agent.ts) | [Python](python/src/durable_strands_agent.py)

## Prerequisites

- Node.js 22+ / Python 3.14+
- AWS account with Bedrock model access
- AWS SAM CLI v1.150.0+ (for deployment)

## Quick Start

```bash
# Clone the repository
git clone https://github.com/aws-samples/sample-durable-executions-with-ai.git
cd sample-durable-executions-with-ai

# Choose your language
cd python  # or cd typescript

# See language-specific README for setup and running examples
```

- [Python README](python/README.md)
- [TypeScript README](typescript/README.md)

## Project Structure

```
.
├── python/                # Python implementations
│   ├── src/               # Example patterns
│   └── tests/             # Unit tests
├── typescript/            # TypeScript implementations
│   ├── src/               # Example patterns
│   └── tests/             # Unit tests
└── README.md
```

## Resources

- [AWS Lambda durable functions](https://aws.amazon.com/lambda/lambda-durable-functions/)
- [Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/durable-functions.html)
- [Durable Execution SDK for JavaScript](https://github.com/aws/aws-durable-execution-sdk-js)
- [Durable Execution SDK for Python](https://github.com/aws/aws-durable-execution-sdk-python)

## Contributing

See [CONTRIBUTING](CONTRIBUTING.md) for guidelines on how to contribute to this project.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.
