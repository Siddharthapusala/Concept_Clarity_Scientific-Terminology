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
    def get_fast_explanation(self, query: str, language: str = "English") -> dict:
        """Get explanation in <1 second using Groq"""
        start_time = time.time()
        try:
            lang_instruction = ""
            if language.lower() == "telugu":
                lang_instruction = "IMPORTANT: Provide the output in Telugu script (తెలుగు). Do not use English transliteration. Ensure the JSON is valid."
            elif language.lower() == "hindi":
                lang_instruction = "IMPORTANT: Provide the output in Hindi script (देवनागरी). Do not use English transliteration."
            
            # Strict constraints for ALL languages as per user requirement
            line_constraint = (
                "Easy: Exactly 2 sentences/lines.\n"
                "Medium: Exactly 4 sentences/lines.\n"
                "Hard: Exactly 6-8 sentences/lines.\n"
                "Examples: Exactly 2 items."
            )

            prompt = (
                f"Explain '{query}' at three levels in {language} ({lang_instruction}). Return STRICT JSON only. "
                f"JSON Keys must be in English ('easy', 'medium', 'hard', 'examples', 'related_words'). "
                f"Values MUST be in {language} script. "
                f"\nRequirements:\n{line_constraint}\n"
                f"Format: "
                f"{{"
                f"  \"easy\": \"[Explanation in {language}]\", "
                f"  \"medium\": \"[Explanation in {language}]\", "
                f"  \"hard\": \"[Explanation in {language}]\", "
                f"  \"examples\": [\"[Example 1 in {language}]\", \"[Example 2 in {language}]\"], "
                f"  \"related_words\": [\"[Word 1 in {language}]\", \"[Word 2 in {language}]\", \"[Word 3 in {language}]\", \"[Word 4 in {language}]\", \"[Word 5 in {language}]\"] "
                f"}}"
                f"MANDATORY: Provide strict line counts and at least 2 concrete examples. "
                f"Ensure examples are real-world. "
                f"CRITICAL: The content of the definitions and examples MUST be in {language}. Do not provide English text."
            )
            completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": f"You are a strict science tutor fluent in {language}. You must output valid JSON. Keys must be in English. All values (definitions, examples) MUST be written in {language} script. Do not output English text for the explanations. If {language} is Telugu, use legible and standard Telugu grammar."},
                    {"role": "user", "content": prompt}
                ],
                model=self.text_model,
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=1500
            )
            response_content = completion.choices[0].message.content
            
            # Clean potential markdown
            if "```json" in response_content:
                response_content = response_content.split("```json")[1].split("```")[0].strip()
            elif "```" in response_content:
                response_content = response_content.split("```")[0].strip()

            data = json.loads(response_content)
            
            # Ensure fallback if keys are missing but others exist
            easy_def = data.get("easy") or data.get("medium") or f"{query} involves complex scientific principles."
            
            # Ensure examples exist if LLM failed
            examples = data.get("examples", [])
            if not examples or len(examples) < 2:
                # Emergency fallback examples in target language if possible
                if language.lower() == "telugu":
                    examples = [f"{query} యొక్క నిజ జీవిత ఉదాహరణ 1", f"{query} యొక్క నిజ జీవిత ఉదాహరణ 2"]
                elif language.lower() == "hindi":
                    examples = [f"{query} का वास्तविक जीवन उदाहरण 1", f"{query} का वास्तविक जीवन उदाहरण 2"]
                else:
                    examples = [f"Real-world example of {query} 1", f"Real-world example of {query} 2"]

            result = {
                "easy": data.get("easy", easy_def),
                "medium": data.get("medium", easy_def),
                "hard": data.get("hard", easy_def),
                "examples": examples,
                "related_words": data.get("related_words", ["Science", "Research", "Theory", "Experiment"]),
                "category": data.get("category", "General Science"),
                "source": "groq",
                "time_ms": int((time.time() - start_time) * 1000)
            }
            return result
        except Exception as e:
            print(f"❌ Groq Text Error: {e}")
            return self._get_fallback_explanation(query, start_time, language)

    def _get_fallback_explanation(self, query: str, start_time: float, language: str = "English") -> dict:
        # Simple fallback does not support dynamic translation without an API
        is_pyl = language.lower() in ['telugu', 'hindi']
        note = f" (Note: Translation unavailable in fallback mode for {language})" if is_pyl else ""
        
        return {
            "easy": f"{query} is a scientific concept. It is interesting.{note}",
            "medium": f"{query} is an important concept in science. It helps us understand the world. It is studied widely. It has many applications.{note}",
            "hard": f"{query} is a complex concept studied by scientists. It involves intricate mechanisms and theories. Research is ongoing in this field. It has significant implications. Advanced studies explore its properties. It connects to other fundamental laws.{note}",
            "examples": [f"Study of {query}", f"Application of {query}"],
            "related_words": ["Science", "Theory", "Hypothesis", "Experiment", "Research"],
            "category": "Science",
            "source": "fallback",
            "time_ms": int((time.time() - start_time) * 1000)
        }
    def get_level_details(self, query: str, level: str, language: str = "English") -> dict:
        """Helper to get just one level if requested"""
        full = self.get_fast_explanation(query, language)
        if not full or not isinstance(full, dict):
            full = self._get_fallback_explanation(query, 0, language)
            
        return {
            "text": full.get(level, full.get("easy", "Definition not available.")),
            "examples": full.get("examples", []),
            "related_words": full.get("related_words", [])
        }
llm_service = FastLLMService()
