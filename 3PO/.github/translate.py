import os
import re

import torch
from transformers import MarianMTModel, MarianTokenizer


MODEL_NAME = "Helsinki-NLP/opus-mt-tc-big-en-ko"

tokenizer = MarianTokenizer.from_pretrained(MODEL_NAME)
model = MarianMTModel.from_pretrained(MODEL_NAME)

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
model.to(device)


def translate(text: str) -> str:
    if not text.strip():
        return ""

    paragraphs = text.split("\n")
    result = []

    for paragraph in paragraphs:
        if not paragraph.strip():
            result.append("")
            continue

        if paragraph.strip().startswith("```"):
            result.append(paragraph)
            continue

        inputs = tokenizer(
            paragraph,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=512,
        ).to(device)

        with torch.no_grad():
            translated = model.generate(
                **inputs,
                max_length=512,
            )

        output = tokenizer.decode(
            translated[0],
            skip_special_tokens=True,
        )

        result.append(output)

    return "\n".join(result)


if __name__ == "__main__":
    title = os.environ.get("PR_TITLE", "")
    body = os.environ.get("PR_BODY", "")

    translated_title = translate(title)
    translated_body = translate(body)

    output = f"""## 🤖 3PO — korean translate

### name

{translated_title}

### text

{translated_body}

---

*This translation was generated automatically using an open-source translation model.*
"""

    with open("translation.md", "w", encoding="utf-8") as f:
        f.write(output)

    print(output)
