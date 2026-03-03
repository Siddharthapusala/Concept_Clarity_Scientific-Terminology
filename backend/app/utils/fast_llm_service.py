import os
import json
import time
import base64
import requests
import re
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

    def get_youtube_video(self, query: str) -> str:
        """Fetch the first YouTube video result for a query via scraping"""
        try:
            print(f"🎬 Fetching video for: {query}")
            refined_query = f"{query} science biology"
            search_query = refined_query.replace(" ", "+")
            url = f"https://www.youtube.com/results?search_query={search_query}&sp=EgIQAQ%253D%253D"
            headers = {"User-Agent": "Mozilla/5.0"}
            response = requests.get(url, headers=headers)
            
            video_ids = re.findall(r"watch\?v=(\S{11})", response.text)
            if video_ids:
                video_id = video_ids[0]
                print(f"✅ Found video ID: {video_id}")
                return video_id
            
            print("⚠️ No video results found.")
            return None
        except Exception as e:
            print(f"❌ Error fetching video: {e}")
            return None

    def get_fast_explanation(self, query: str, language: str = "English", fetch_media: bool = True) -> dict:
        """Get explanation in <1 second using Groq"""
        start_time = time.time()
        try:
            lang_instruction = ""
            if language.lower() == "telugu":
                lang_instruction = "IMPORTANT: Provide the output in Telugu script (తెలుగు). Do not use English transliteration. Ensure the JSON is valid."
            elif language.lower() == "hindi":
                lang_instruction = "IMPORTANT: Provide the output in Hindi script (देवनागरी). Do not use English transliteration."
            
            line_constraint = (
                "Easy: Exactly 2 sentences/lines.\n"
                "Medium: Exactly 4 sentences/lines.\n"
                "Hard: Exactly 6-8 sentences/lines.\n"
                "Examples: Exactly 2 items."
            )

            prompt = (
                f"Explain '{query}' at three levels in {language} ({lang_instruction}). Return STRICT JSON only. "
                f"JSON Keys must be in English ('easy', 'medium', 'hard', 'examples', 'related_words', 'translated_term', 'core_term'). "
                f"Values MUST be in {language} script, EXCEPT 'core_term' which MUST be the single most relevant scientific English term (e.g. 'Cell structure'). "
                f"\nRequirements:\n{line_constraint}\n"
                f"Format: "
                f"{{"
                f"  \"core_term\": \"[Single scientific English term]\", "
                f"  \"translated_term\": \"[The translation of '{query}' in {language}]\", "
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
            

            system_prompt = (
                f"You are a strict science tutor fluent in {language}. "
                f"You must output valid JSON. "
                f"IMPORTANT: JSON Keys must be in English. Values must be in {language}. "
                f"If the user query has a typo (e.g., 'pyysics'), assume the correct scientific term (e.g., 'Physics') and explain that term. "
                f"Do not output English text for the explanations."
                f"If {language} is Telugu, use legible and standard Telugu grammar."
            )
            
            completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                model=self.text_model,
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=4000
            )
            response_content = completion.choices[0].message.content
            
            try:
                start_idx = response_content.find('{')
                end_idx = response_content.rfind('}')
                if start_idx != -1 and end_idx != -1:
                    response_content = response_content[start_idx:end_idx+1]
                data = json.loads(response_content)
            except json.JSONDecodeError:
                print(f"❌ JSON Decode Error for {language}")
                raise Exception("Invalid JSON received from LLM")
            
            easy_def = data.get("easy") or data.get("medium") or f"{query} involves complex scientific principles."
            examples = data.get("examples", [])
            if not examples or len(examples) < 2:
                if language.lower() == "telugu":
                    examples = [f"{query} యొక్క నిజ జీవిత ఉదాహరణ 1", f"{query} యొక్క నిజ జీవిత ఉదాహరణ 2"]
                elif language.lower() == "hindi":
                    examples = [f"{query} का वास्तविक जीवन उदाहरण 1", f"{query} का वास्तविक जीवन उदाहरण 2"]
                else:
                    examples = [f"Real-world example of {query} 1", f"Real-world example of {query} 2"]

            video_id = None

            if fetch_media:
                media_query = data.get("core_term", query)
                video_id = self.get_youtube_video(media_query)

            result = {
                "translated_term": data.get("translated_term", query),
                "core_term": data.get("core_term", query),
                "easy": data.get("easy", easy_def),
                "medium": data.get("medium", easy_def),
                "hard": data.get("hard", easy_def),
                "examples": examples,
                "related_words": data.get("related_words", ["Science", "Research", "Theory", "Experiment"]),
                "category": data.get("category", "General Science"),
                "video_id": video_id,
                "source": "groq",
                "time_ms": int((time.time() - start_time) * 1000)
            }
            return result
        except Exception as e:
            import traceback
            print(f"❌ Groq Text Error: {e}")
            print(traceback.format_exc())
            return self._get_fallback_explanation(query, start_time, language)

    def get_media_only(self, query: str) -> dict:
        """Fetch strictly media (video) for a query"""
        start_time = time.time()
        video_id = self.get_youtube_video(query)
            
        return {
            "video_id": video_id,
            "term": query,
            "time_ms": int((time.time() - start_time) * 1000)
        }

    def _get_fallback_explanation(self, query: str, start_time: float, language: str = "English") -> dict:
        lang_lower = language.lower()
        
        if lang_lower == "telugu":
            definition = f"'{query}' అనేది ఒక శాస్త్రీయ భావన. దీని గురించి సమాచారం సేకరిస్తున్నాము. దయచేసి కాసేపు ఆగి ప్రయత్నించండి."
            examples = [f"{query} యొక్క ఉదాహరణ", "మరొక ఉదాహరణ"]
            related = ["శాస్త్రం", "పరిశోధన", "సిద్ధాంతం"]
        elif lang_lower == "hindi":
            definition = f"'{query}' एक वैज्ञानिक अवधारणा है। हम इसके बारे में जानकारी प्राप्त कर रहे हैं। कृपया कुछ समय बाद पुनः प्रयास करें।"
            examples = [f"{query} का उदाहरण", "एक और उदाहरण"]
            related = ["विज्ञान", "अनुसंधान", "सिद्धांत"]
        else:
            definition = f"{query} is a scientific concept. It is interesting."
            examples = [f"Study of {query}", f"Application of {query}"]
            related = ["Science", "Theory", "Hypothesis", "Experiment", "Research"]

        return {
            "easy": definition,
            "medium": definition,
            "hard": definition,
            "examples": examples,
            "related_words": related,
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
            "related_words": full.get("related_words", []),
            "video_id": full.get("video_id")
        }
    def get_image_explanation(self, image_bytes: bytes, language: str = "English", level: str = None) -> dict:
        """Analyze image using Groq Vision model with specified difficulty level"""
        start_time = time.time()
        try:
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            
            vision_model = "meta-llama/llama-4-maverick-17b-128e-instruct"
            
            lang_instruction = ""
            if language.lower() == "telugu":
                lang_instruction = "IMPORTANT: Provide the output in Telugu script (తెలుగు). Do not use English transliteration."
            elif language.lower() == "hindi":
                lang_instruction = "IMPORTANT: Provide the output in Hindi script (देवनागरी). Do not use English transliteration."

            level_instruction = ""
            if level:
                if level.lower() == "easy":
                    level_instruction = "Explanation Level: SIMPLE/EASY. Use basic vocabulary suitable for a beginner or child. Keep it short (2-3 sentences)."
                elif level.lower() == "medium":
                    level_instruction = "Explanation Level: MEDIUM. Use standard high-school level scientific terminology. Detailed but clear (4-5 sentences)."
                elif level.lower() == "hard":
                    level_instruction = "Explanation Level: HARD/ADVANCED. Use academic/technical language. Provide in-depth scientific detail and context (6-8 sentences)."

            prompt = (
                f"Analyze this image and explain the scientific concept shown in {language} ({lang_instruction}). "
                f"{level_instruction} "
                f"Return STRICT JSON only. "
                f"Format: "
                f"{{"
                f"  \"term\": \"[Name of the concept in {language}]\", "
                f"  \"definition\": \"[Clear explanation in {language} matching the requested level]\", "
                f"  \"related_words\": [\"[Word 1]\", \"[Word 2]\"] "
                f"}}"
            )

            chat_completion = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                },
                            },
                        ],
                    }
                ],
                model="meta-llama/llama-4-maverick-17b-128e-instruct",
                temperature=0.7,
                max_tokens=1024,
                response_format={"type": "json_object"},
            )
            
            response_content = chat_completion.choices[0].message.content
            
            if "```json" in response_content:
                response_content = response_content.split("```json")[1].split("```")[0].strip()
            elif "```" in response_content:
                response_content = response_content.split("```")[0].strip()
            data = json.loads(response_content)
            
            video_id = self.get_youtube_video(data.get("term", "Science"))

            result = {
                "term": data.get("term", "Image Analysis"),
                "definition": data.get("definition", "Detailed scientific explanation provided by AI."),
                "history_id": None, # Will be set by route if user logged in
                "related_words": data.get("related_words", []),
                "video_id": video_id,
                "source": "groq_vision",
                "confidence": "high",
                "time_ms": int((time.time() - start_time) * 1000)
            }
            return result

        except Exception as e:
            print(f"❌ Groq Vision Error: {e}")
            return {
                "term": "Error",
                "definition": "Unable to analyze image at this time.",
                "source": "error",
                "confidence": "low"
            }

    def generate_quiz(self, terms: list, level: str = "medium", language: str = "English", num_questions: int = 5) -> dict:
        """Generate a quiz based on provided terms and difficulty level."""
        start_time = time.time()
        try:
            lang_instruction = ""
            if language.lower() == "telugu":
                lang_instruction = "IMPORTANT: Provide the questions and answers in Telugu script (తెలుగు). Do not use English transliteration."
            elif language.lower() == "hindi":
                lang_instruction = "IMPORTANT: Provide the questions and answers in Hindi script (देवनागरी). Do not use English transliteration."

            level_instruction = ""
            if level.lower() == "easy":
                level_instruction = "Questions should be simple, foundational, and easy to answer. Suitable for school students."
            elif level.lower() == "medium":
                level_instruction = "Questions should be moderately difficult, testing conceptual understanding."
            elif level.lower() == "hard":
                level_instruction = "Questions should be advanced, tricky, application-based, and meant for a deep understanding."

            terms_str = ", ".join(terms) if terms else "General Science, Physics, Biology"

            prompt = (
                f"Generate a {num_questions}-question multiple choice quiz about the following topics: {terms_str}. "
                f"Ensure the questions are highly varied, random, and different from typical standard questions to prevent repetition across multiple runs. "
                f"The target language is {language}. {lang_instruction} "
                f"Difficulty level: {level}. {level_instruction} "
                f"Return STRICT JSON only. "
                f"JSON Keys MUST be in English. The content of questions, options, answer, and explanation MUST be in {language} script. "
                f"Format EXACTLY like this:\n"
                f"{{\n"
                f"  \"questions\": [\n"
                f"    {{\n"
                f"      \"question\": \"[Question text here]\",\n"
                f"      \"options\": [\"[Option A]\", \"[Option B]\", \"[Option C]\", \"[Option D]\"],\n"
                f"      \"answer\": \"[The exact text of the correct option from the options listed]\",\n"
                f"      \"explanation\": \"[A brief 1-2 sentence explanation of why this answer is correct]\",\n"
                f"      \"topic\": \"[A 1-2 word specific subtopic this question relates to (e.g., 'Thermodynamics', 'Genetics')]\"\n"
                f"    }}\n"
                f"  ]\n"
                f"}}"
            )

            system_prompt = (
                f"You are an expert science teacher creating a quiz in {language}. "
                f"You MUST strictly output valid JSON containing EXACTLY {num_questions} questions. "
                f"Failure to provide exactly {num_questions} questions will result in a system error."
            )

            if num_questions <= 5:
                max_tokens = 1500
            elif num_questions <= 10:
                max_tokens = 3000
            else:
                max_tokens = 6000

            completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                model=self.text_model,
                response_format={"type": "json_object"},
                temperature=0.6,
                max_tokens=max_tokens
            )

            response_content = completion.choices[0].message.content
            
            try:
                start_idx = response_content.find('{')
                end_idx = response_content.rfind('}')
                if start_idx != -1 and end_idx != -1:
                    response_content = response_content[start_idx:end_idx+1]
                data = json.loads(response_content)
                if "questions" not in data or not isinstance(data["questions"], list):
                    raise ValueError("JSON missing 'questions' array")
                
                received_count = len(data["questions"])
                if received_count != num_questions:
                    print(f"⚠️ LLM returned {received_count} instead of {num_questions}. Prompting for strictness.")
            except Exception:
                raise Exception("Invalid JSON received from LLM for Quiz")

            return {
                "quiz": data["questions"][:num_questions],
                "source": "groq",
                "time_ms": int((time.time() - start_time) * 1000)
            }

        except Exception as e:
            print(f"❌ Groq Quiz Generation Error: {e}")
    def transcribe_audio(self, audio_bytes: bytes, language: str = "en") -> dict:
        """Transcribe audio using Groq Whisper model"""
        start_time = time.time()
        try:
            import tempfile
            with tempfile.NamedTemporaryFile(delete=False, suffix=".webm") as tmp:
                tmp.write(audio_bytes)
                tmp_path = tmp.name

            try:
                with open(tmp_path, "rb") as file:
                    transcription = self.client.audio.transcriptions.create(
                        file=(tmp_path, file.read()),
                        model="whisper-large-v3",
                        prompt=f"The audio is about scientific concepts in {language}.",
                        response_format="json",
                        language=language if language in ["en", "te", "hi"] else "en"
                    )
                return {
                    "text": transcription.text,
                    "time_ms": int((time.time() - start_time) * 1000)
                }
            finally:
                if os.path.exists(tmp_path):
                    os.remove(tmp_path)
        except Exception as e:
            print(f"❌ Groq Transcription Error: {e}")
            return {"error": str(e)}

llm_service = FastLLMService()
