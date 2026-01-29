import os
import json
import time
import base64
from groq import Groq
from dotenv import load_dotenv
load_dotenv()
class FastLLMService:
    """Fast LLM service using Groq API for <1s responses"""
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            print("❌ GROQ_API_KEY not found in environment!")
        else:
            print(f"✅ Groq Service Initialized (Key: {self.api_key[:5]}...)")
        self.client = Groq(api_key=self.api_key)
        self.text_model = "llama-3.3-70b-versatile"
        self.fast_text_model = "llama-3.1-8b-instant"
    def get_fast_explanation(self, query: str) -> dict:
        """Get explanation in <1 second using Groq"""
        start_time = time.time()
        try:
            prompt = (
                f"Explain '{query}' at three levels. Return STRICT JSON only. "
                f"Easy: Exactly 2 lines. 1 Example. "
                f"Medium: Exactly 4 lines. 1 Example. "
                f"Hard: Exactly 6-8 lines. 2 Examples. "
                f"Format: "
                f"{{"
                f"  \"easy\": \"Line 1. Line 2.\", "
                f"  \"medium\": \"Line 1. Line 2. Line 3. Line 4.\", "
                f"  \"hard\": \"Line 1... Line 8.\", "
                f"  \"examples\": [\"Example 1\", \"Example 2\"], "
                f"  \"related_words\": [\"Word 1\", \"Word 2\", \"Word 3\", \"Word 4\", \"Word 5\"] "
                f"}}"
                f"Ensure examples are real-world and concrete. Provide 5-7 related scientific terms."
            )
            completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a precise science tutor. You MUST follow line counts strictly. Easy=2 lines, Medium=4 lines, Hard=6-8 lines."},
                    {"role": "user", "content": prompt}
                ],
                model=self.text_model,
                response_format={"type": "json_object"},
                temperature=0.3, # Low temp for adherence to constraints
                max_tokens=1024
            )
            response_content = completion.choices[0].message.content
            data = json.loads(response_content)
            result = {
                "easy": data.get("easy", f"{query} is a scientific concept."),
                "medium": data.get("medium", f"{query} is a scientific concept used in research."),
                "hard": data.get("hard", f"{query} is a complex scientific concept involving advanced mechanisms."),
                "examples": data.get("examples", [f"Example of {query}"]),
                "related_words": data.get("related_words", ["Science", "Research", "Theory", "Experiment"]),
                "category": data.get("category", "General Science"),
                "source": "groq",
                "time_ms": int((time.time() - start_time) * 1000)
            }
            return result
        except Exception as e:
            print(f"❌ Groq Text Error: {e}")
            return self._get_fallback_explanation(query, start_time)

    def _get_fallback_explanation(self, query: str, start_time: float) -> dict:
        return {
            "easy": f"{query} is a scientific concept. It is interesting.",
            "medium": f"{query} is an important concept in science. It helps us understand the world. It is studied widely. It has many applications.",
            "hard": f"{query} is a complex concept studied by scientists. It involves intricate mechanisms and theories. Research is ongoing in this field. It has significant implications. Advanced studies explore its properties. It connects to other fundamental laws.",
            "examples": [f"Study of {query}", f"Application of {query}"],
            "related_words": ["Science", "Theory", "Hypothesis", "Experiment", "Research"],
            "category": "Science",
            "source": "fallback",
            "time_ms": int((time.time() - start_time) * 1000)
        }
    def get_level_details(self, query: str, level: str) -> dict:
        """Helper to get just one level if requested"""
        full = self.get_fast_explanation(query)
        return {
            "text": full.get(level, full.get("easy")),
            "examples": full.get("examples", []),
            "related_words": full.get("related_words", [])
        }
llm_service = FastLLMService()
