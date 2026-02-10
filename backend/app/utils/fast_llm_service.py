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
            search_query = (query + " scientific explanation education documentary").replace(" ", "+")
            url = f"https://www.youtube.com/results?search_query={search_query}&sp=EgIQAQ%253D%253D" # Filter for video only
            # User-Agent to avoid bot blocking sometimes
            headers = {"User-Agent": "Mozilla/5.0"}
            response = requests.get(url, headers=headers)
            
            # Search for first video ID using regex
            video_ids = re.findall(r"watch\?v=(\S{11})", response.text)
            if video_ids:
                video_id = video_ids[0]
                print(f"✅ Found video ID: {video_id}")
                return video_id
            
            print("⚠️ No video results found in HTML scraper.")
            return None
        except Exception as e:
            print(f"❌ Error fetching video: {e}")
            return None


    def get_google_image(self, query: str) -> str:
        """Fetch the first image result from Google Images via scraping"""
        try:
            print(f"🖼️ Fetching Google image for: {query}")
            search_url = f"https://www.google.com/search?site=&tbm=isch&source=hp&biw=1873&bih=990&q={query}"
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            response = requests.get(search_url, headers=headers, timeout=5)
            html = response.text
            
            # Google thumbnails often come from gstatic
            urls = re.findall(r'(https://encrypted-tbn0\.gstatic\.com/images\?q=[^"\s\\]+)', html)
            
            if urls:
                image_url = urls[0]
                # Fix any potential encoding issues or extra chars if necessary
                # Sometimes Google escapes sequences like \x3d which might need unescaping if json loaded
                # But simple regex on tbn0 usually yields a working URL.
                print(f"✅ Found Google Image URL: {image_url}")
                return image_url
            
            print("⚠️ No Google image results found.")
            return None
        except Exception as e:
            print(f"❌ Error fetching Google image: {e}")
            return None

    def get_wiki_image(self, query: str) -> str:
        """Fetch a high-resolution image from Wikipedia using the library"""
        try:
            import wikipedia
            print(f"🖼️ Fetching High-Res Wiki image for: {query}")
            
            # Search for the page
            # auto_suggest=True helps find the right page
            # limit=1 ensures we get the most relevant
            results = wikipedia.search(query, results=1)
            if not results:
                print(f"⚠️ No wiki page found for {query}")
                return None
            
            title = results[0]
            page = wikipedia.page(title, auto_suggest=True)
            
            # Get images
            images = page.images
            
            # Filter for good images (jpg/png), ignore svgs, logos, icons
            candidates = []
            for img in images:
                lower_img = img.lower()
                if lower_img.endswith(('.jpg', '.jpeg', '.png')):
                    # Exclude common noise
                    if any(x in lower_img for x in ['logo', 'icon', 'symbol', 'flag', 'map', 'svg']):
                        continue
                    candidates.append(img)
            
            if candidates:
                # heuristic: prefer images with 'upload.wikimedia.org'
                # usually the first few are the main ones
                print(f"✅ Found High-Res Wiki Image: {candidates[0]}")
                return candidates[0]
                
            print("⚠️ No suitable images found on wiki page.")
            return None
            
        except Exception as e:
            print(f"❌ Error fetching Wiki image: {e}")
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
            
            # ... (prompt construction same as before - abbreviated for diff) ...
            
            # Strict constraints for ALL languages as per user requirement
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
            
            # Enhanced system prompt to prevent key translation
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
                max_tokens=1500
            )
            response_content = completion.choices[0].message.content
            
            # Robust JSON extraction
            try:
                # Find the first { and last }
                start_idx = response_content.find('{')
                end_idx = response_content.rfind('}')
                
                if start_idx != -1 and end_idx != -1:
                    response_content = response_content[start_idx:end_idx+1]
                
                data = json.loads(response_content)
            except json.JSONDecodeError:
                print(f"❌ JSON Decode Error for {language}. Raw content: {response_content[:100]}...")
                # Fallback to manual parsing or retry could go here, but for now fallback to default
                raise Exception("Invalid JSON received from LLM")
            
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

            video_id = None
            image_url = None

            if fetch_media:
                # Fetch YouTube Video
                video_id = self.get_youtube_video(query)
                
                # Fetch Related Image
                # Try Wiki first (Higher Res), then Google
                image_url = self.get_wiki_image(query)
                if not image_url:
                    image_url = self.get_google_image(query)

            result = {
                "easy": data.get("easy", easy_def),
                "medium": data.get("medium", easy_def),
                "hard": data.get("hard", easy_def),
                "examples": examples,
                "related_words": data.get("related_words", ["Science", "Research", "Theory", "Experiment"]),
                "category": data.get("category", "General Science"),
                "video_id": video_id,
                "image_url": image_url,
                "source": "groq",
                "time_ms": int((time.time() - start_time) * 1000)
            }
            return result
        except Exception as e:
            print(f"❌ Groq Text Error: {e}")
            return self._get_fallback_explanation(query, start_time, language)

    def get_media_only(self, query: str) -> dict:
        """Fetch strictly media (video + image) for a query"""
        start_time = time.time()
        video_id = self.get_youtube_video(query)
        image_url = self.get_wiki_image(query)
        if not image_url:
            image_url = self.get_google_image(query)
            
        return {
            "video_id": video_id,
            "image_url": image_url,
            "term": query,
            "time_ms": int((time.time() - start_time) * 1000)
        }

    def _get_fallback_explanation(self, query: str, start_time: float, language: str = "English") -> dict:
        # Localized definitions for fallback
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
            "image_url": full.get("image_url"),
            "video_id": full.get("video_id")
        }
    def get_image_explanation(self, image_bytes: bytes, language: str = "English", level: str = None) -> dict:
        """Analyze image using Groq Vision model with specified difficulty level"""
        start_time = time.time()
        try:
            # Encode image to base64
            base64_image = base64.b64encode(image_bytes).decode('utf-8')
            
            # Using the working vision model
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
            
             # Clean potential markdown
            if "```json" in response_content:
                response_content = response_content.split("```json")[1].split("```")[0].strip()
            elif "```" in response_content:
                response_content = response_content.split("```")[0].strip()
                
            data = json.loads(response_content)
            
            # Fetch YouTube Video
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

llm_service = FastLLMService()
