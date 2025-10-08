import json

from aws_durable_execution_sdk_python import DurableContext, durable_execution
from aws_durable_execution_sdk_python.config import Duration, WaitForCallbackConfig
from pydantic import BaseModel

from src.utils.constants import MODEL
from src.utils.converse import converse


class ReviewResult(BaseModel):
    approved: bool
    notes: str | None = None


def send_for_review(callback_id: str, document: str, extracted_fields: str):
    # Callback token not logged here - for demo purposes, access it in the console
    print(f"Extracted fields: {extracted_fields}")
    print(f"Document: {document}")


@durable_execution
def handler(event: dict, context: DurableContext):
    event = event or {}
    document = event.get("document", "Sample invoice with amount $1,234.56")

    extracted_fields = context.step(
        lambda _: converse(
            MODEL["MEDIUM"],
            f'Extract key fields from this document as JSON: "{document}"',
        ),
        "extract fields",
    )

    review_result_str = context.wait_for_callback(
        lambda callback_id, _: send_for_review(callback_id, document, extracted_fields),
        "Await Human review",
        WaitForCallbackConfig(timeout=Duration.from_days(7)),
    )
    review_result_json = json.loads(review_result_str)
    review_result = ReviewResult(**review_result_json)
    if not review_result.approved:
        return {
            "status": "rejected",
            "notes": review_result.notes,
            "extractedFields": extracted_fields,
        }
    return {"status": "approved", "extractedFields": extracted_fields}
