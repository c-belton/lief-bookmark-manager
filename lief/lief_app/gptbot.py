import openai
import os
import dotenv
from .models import Tag, Category
import json

class GPT:
    """
    A wrapper class for the GPT. It includes methods for generating summaries, category labels, and tags based on the
    content of a tweet. Method used depends on if tweet content is parsed from link by other text parsing methods in
    the program or if the user settings selects GPT to also parse the raw text of a tweet and extract relevant metadata.
    """

    _authenticated = False # Class level authentication flag for determining if instance is authenticated

    def __init__(self, model_name):
        self.model_name = model_name

    def authenticate(self):
        if not GPT._authenticated:
            dotenv_path = dotenv.find_dotenv()
            openai.api_key = dotenv.get_key(dotenv_path, "OPENAI_API_KEY")
            GPT._authenticated = True

    def process_tweet(self, text):
        existing_categories = [category.name for category in Category.objects.all()]
        try:
            messages = [
                {
                    "role": "system",
                    "content":
                        f"""You are an expert at analyzing and processing tweets for a bookmark managing application. 
                        You: 1. Generate an accurate and concise summary describing the content of the tweet thread, 
                        2. Generate a relevant category label, and 3. Generate relevant tags for search filtering. 
                        Your response is strictly in the format of a Python dictionary as follows: 
                        {{"Summary": "Summary of Tweet", "Category": "Category Label", "Tags": "Tag1, Tag2, Tag3, etc."}} 
                        Here is a list of existing categories: {', '.join(existing_categories)}. Reuse an existing 
                        category label only if the tweet(s) you're analyzing strictly relates to that label. Do not
                        reuse any label if the topics are not directly related."""
                },
                {
                    "role": "user",
                    "content": f'Process the following tweet: {text}'
                },
            ]
            response = self._generate_chat(messages, num_tokens=300)

            summary, category_object, tag_objects = self._process_response(response)

        except openai.error.ServiceUnavailableError:
            summary = "GPT Summary currently unavailable. Try again later."
            category_object, created = Category.objects.get_or_create(name="Category Generation Error")
            tag_objects = [Tag.objects.get_or_create(name="GPT Tag Generation Error")[0]]
        return summary, category_object, tag_objects


    def parse_and_process_tweet(self, text):
        existing_categories = [category.name for category in Category.objects.all()]
        try:
            messages = [
                {
                    "role": "system",
                    "content":
                        f"""You are an expert at analyzing and processing tweets for a bookmark managing application.
                        When provided with the raw text of a tweet or thread, you are able to carefully separate 
                        metadata such as the handle of the author, the date or who they are replying to from the content 
                        itself. Based off of the content of the tweet, you: 1. Generate an accurate and concise summary 
                        describing the content of the tweet thread, 2. Generate a relevant category label, and 3. 
                        Generate relevant tags for search filtering. Your response is strictly in the format of a Python 
                        dictionary as follows: 
                        {{"Summary": "Summary of Tweet", "Text": "Text of Tweet Content without Metadata", 
                        "Date": "Date of Tweet" "Category": "Category Label", "Tags": "Tag1, Tag2, Tag3, etc."}} 
                        Here is a list of existing categories: {', '.join(existing_categories)}. Reuse an existing 
                        category label only if the tweet(s) you're analyzing directly relates to that label. Do not
                        reuse any label if the topics are not directly related."""
                },
                {
                    "role": "user",
                    "content": f'Parse and process the following tweet: {text}'
                },
            ]
            response = self._generate_chat(messages, num_tokens=600)

            summary, category_object, tag_objects = self._process_response(response)

            try:
                response_dict = json.loads(response['choices'][0]['message']['content'])
            except json.JSONDecodeError:
                return None
            raw_text = response_dict.get('Text', '').strip()
            date = response_dict.get('Date', '').strip()

        except openai.error.ServiceUnavailableError:
            summary = "GPT Summary currently unavailable. Try again later."
            category_object, created = Category.objects.get_or_create(name="Category Generation Error")
            tag_objects = [Tag.objects.get_or_create(name="GPT Tag Generation Error")[0]]
        return summary, raw_text, date, category_object, tag_objects


    def _generate_chat(self, messages, num_tokens):
        response = openai.ChatCompletion.create(
            model=self.model_name,
            messages=messages,
            max_tokens=num_tokens,
        )
        return response

    def _process_response(self, response):
        try:
            response_dict = json.loads(response['choices'][0]['message']['content'])
        except json.JSONDecodeError:
            return None

        summary = response_dict.get('Summary', '').strip()
        category_label = response_dict.get('Category', '').strip()

        # Create or get Category object
        category_object, created = Category.objects.get_or_create(name=category_label)

        tags_str = response_dict.get('Tags', '').strip()
        # Create or get Tag objects
        tags = [tag.strip().lower() for tag in tags_str.split(',')]
        tag_objects = [Tag.objects.get_or_create(name=tag_name)[0] for tag_name in tags]

        return summary, category_object, tag_objects
