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

    # 너무 긴 입력은 문단 단위로 나눠 처리
    paragraphs = text.split("\n")
    result = []

    for paragraph in paragraphs:
        if not paragraph.strip():
            result.append("")
            continue

        # Markdown 코드 블록은 번역하지 않음
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

    output = f"""## 🤖 3PO — 한국어 번역

### 제목

{translated_title}

### 본문

{translated_body}

---

*이 번역은 오픈소스 번역 모델을 사용해 자동으로 생성되었습니다.*
"""

    with open("translation.md", "w", encoding="utf-8") as f:
        f.write(output)

    print(output)
