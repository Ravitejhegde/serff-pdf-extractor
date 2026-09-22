import json
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

from app.domain.ports.ai_client import AIClient


# Load variables from backend/.env
ENV_FILE = Path(__file__).resolve().parents[3] / ".env"
load_dotenv(ENV_FILE, override=True)


class OpenRouterError(RuntimeError):
    """Raised when an OpenRouter request or response fails."""

    pass


class OpenRouterClient(AIClient):
    BASE_URL = "https://openrouter.ai/api/v1/chat/completions"

    def __init__(
        self,
        api_key: str | None = None,
        model: str | None = None,
    ) -> None:
        self.api_key = api_key or os.getenv(
            "OPENROUTER_API_KEY"
        )

        self.model = model or os.getenv(
            "OPENROUTER_MODEL",
            "deepseek/deepseek-chat-v3-0324",
        )

        if not self.api_key:
            raise OpenRouterError(
                "OPENROUTER_API_KEY is not configured."
            )

    def understand_section(
        self,
        heading: str,
        text: str,
    ) -> dict:
        """
        Convert extracted SERFF section text into a
        source-grounded interpretation.

        The original extracted text remains the
        authoritative source of truth.
        """

        # ---------------------------------------------------------
        # Strict source-grounded system prompt
        # ---------------------------------------------------------

        system_prompt = """
You are a strict source-grounded assistant for insurance filing review.

Your ONLY source of truth is the supplied extracted SERFF section text.

The original extracted text is authoritative.
Your response is only a presentation and interpretation layer.

STRICT RULES:

1. Report ONLY information explicitly present in the supplied
   extracted source text.

2. NEVER infer, assume, predict, calculate, or fill in missing
   information.

3. NEVER use general knowledge to add information that is not
   explicitly present in the source text.

4. NEVER use the filename as evidence.

5. NEVER infer relationships between people, dates, statuses,
   documents, companies, products, or events unless the source
   explicitly states that relationship.

6. Preserve names, dates, tracking numbers, statuses, product names,
   form numbers, regulatory terminology, and other important values
   as written in the source text.

7. If a value is not explicitly stated in the source text,
   DO NOT create or guess a value.

8. Do not resolve, correct, or reconcile contradictions.
   If the source contains conflicting information, report the
   information as it appears without choosing which value is correct.

9. The overview must describe ONLY what the section explicitly
   contains. Do not describe its probable purpose, meaning,
   implication, or significance unless the source explicitly states it.

10. Important points must be directly supported by the supplied
    source text.

11. Do not add recommendations, opinions, conclusions, or advice.

12. Do not claim that something exists, was approved, was submitted,
    was created, was received, was changed, or occurred unless the
    source explicitly states it.

13. Do not transform a source field into an additional conclusion.

    Example:
    If the source says "Submission Type: New Submission",
    do NOT conclude that the filing is "not an amendment"
    unless the source explicitly says that.

14. Do not combine separate facts into a new relationship unless
    that relationship is explicitly stated in the source.

15. Do not invent missing dates, names, statuses, identifiers,
    document types, regulatory decisions, or business meaning.

16. If there are no reliable key information items, return an empty
    key_information array.

17. If there are no reliable important points, return an empty
    important_points array.

18. Return ONLY valid JSON.

19. Return exactly this JSON structure:

{
  "overview": "Short source-grounded description.",
  "key_information": [
    {
      "label": "string",
      "value": "string"
    }
  ],
  "important_points": [
    "string"
  ]
}

20. Do not include markdown, explanations outside the JSON,
    disclaimers, or additional fields.

Accuracy is more important than completeness.
When information is uncertain or unsupported by the source text,
omit it rather than guessing.
"""

        # ---------------------------------------------------------
        # User prompt
        # ---------------------------------------------------------

        user_prompt = f"""
Section heading:
{heading}

Extracted source text:
---
{text}
---

Analyze ONLY the extracted source text above.

Return the requested JSON structure.

Do not use information outside the supplied source text.
Do not infer missing information.
Do not guess.
"""

        # ---------------------------------------------------------
        # Request headers
        # ---------------------------------------------------------

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:5173",
            "X-Title": "SERFF Filing Extractor",
        }

        # ---------------------------------------------------------
        # OpenRouter request payload
        # ---------------------------------------------------------

        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt.strip(),
                },
                {
                    "role": "user",
                    "content": user_prompt.strip(),
                },
            ],
            "temperature": 0.0,
            "max_tokens": 1200,
            "response_format": {
                "type": "json_object",
            },
        }

        # ---------------------------------------------------------
        # Send request to OpenRouter
        # ---------------------------------------------------------

        try:
            response = httpx.post(
                self.BASE_URL,
                headers=headers,
                json=payload,
                timeout=60.0,
            )

        except httpx.HTTPError as exc:
            raise OpenRouterError(
                "Unable to connect to OpenRouter."
            ) from exc

        # ---------------------------------------------------------
        # Handle OpenRouter / provider errors
        # ---------------------------------------------------------

        if response.status_code >= 400:
            error_message = None

            try:
                error_data = response.json()

                error_object = error_data.get(
                    "error",
                    {},
                )

                if not isinstance(error_object, dict):
                    error_object = {}

                error_message = error_object.get(
                    "message"
                )

                metadata = error_object.get(
                    "metadata",
                    {},
                )

                if not isinstance(metadata, dict):
                    metadata = {}

                raw_error = metadata.get(
                    "raw"
                )

                provider_name = metadata.get(
                    "provider_name"
                )

                details = []

                if provider_name:
                    details.append(
                        f"provider={provider_name}"
                    )

                if raw_error:
                    details.append(
                        f"raw={raw_error}"
                    )

                if details:
                    error_message = (
                        f"{error_message or 'OpenRouter request failed.'} "
                        f"({' | '.join(details)})"
                    )

            except (
                ValueError,
                AttributeError,
                TypeError,
            ):
                error_message = None

            raise OpenRouterError(
                f"OpenRouter request failed "
                f"with status {response.status_code}: "
                f"{error_message or 'Unknown provider error.'}"
            )

        # ---------------------------------------------------------
        # Parse successful response
        # ---------------------------------------------------------

        try:
            response_data = response.json()

            choices = response_data["choices"]

            if not choices:
                raise OpenRouterError(
                    "OpenRouter returned no choices."
                )

            message = choices[0]["message"]

            content = message["content"]

            if not isinstance(content, str):
                raise OpenRouterError(
                    "OpenRouter returned invalid content."
                )

            result = json.loads(content)

        except OpenRouterError:
            raise

        except (
            KeyError,
            IndexError,
            TypeError,
            json.JSONDecodeError,
        ) as exc:
            raise OpenRouterError(
                "OpenRouter returned an invalid response."
            ) from exc

        # ---------------------------------------------------------
        # Validate JSON object
        # ---------------------------------------------------------

        if not isinstance(result, dict):
            raise OpenRouterError(
                "OpenRouter returned an invalid JSON object."
            )

        # ---------------------------------------------------------
        # Validate expected response fields
        # ---------------------------------------------------------

        overview = result.get("overview")

        key_information = result.get(
            "key_information",
            [],
        )

        important_points = result.get(
            "important_points",
            [],
        )

        if not isinstance(overview, str):
            raise OpenRouterError(
                "OpenRouter returned an invalid overview."
            )

        if not isinstance(key_information, list):
            raise OpenRouterError(
                "OpenRouter returned invalid key_information."
            )

        if not isinstance(important_points, list):
            raise OpenRouterError(
                "OpenRouter returned invalid important_points."
            )

        for item in key_information:
            if not isinstance(item, dict):
                raise OpenRouterError(
                    "OpenRouter returned an invalid key_information item."
                )

            if not isinstance(item.get("label"), str):
                raise OpenRouterError(
                    "OpenRouter returned an invalid key_information label."
                )

            if not isinstance(item.get("value"), str):
                raise OpenRouterError(
                    "OpenRouter returned an invalid key_information value."
                )

        for point in important_points:
            if not isinstance(point, str):
                raise OpenRouterError(
                    "OpenRouter returned an invalid important_points item."
                )

        # ---------------------------------------------------------
        # Return validated result
        # ---------------------------------------------------------

        return {
            "overview": overview,
            "key_information": key_information,
            "important_points": important_points,
        }


def create_ai_client() -> AIClient:
    """
    Create the application's OpenRouter AI client.

    The rest of the application depends on the AIClient
    abstraction rather than directly depending on OpenRouter.
    """

    return OpenRouterClient()