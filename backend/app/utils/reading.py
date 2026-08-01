import math
import re


def reading_stats(markdown: str) -> tuple[int, int]:
    """Return an approximate word/character count and reading time for Markdown."""
    text = re.sub(r"https?://\S+", "", markdown or "")
    cjk_count = len(re.findall(r"[\u3400-\u9fff]", text))
    latin_count = len(re.findall(r"[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*", text))
    word_count = cjk_count + latin_count
    reading_minutes = max(1, math.ceil(cjk_count / 400 + latin_count / 200))
    return word_count, reading_minutes
