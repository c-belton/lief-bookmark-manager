import datetime, re


# Raw Text Parsing Custom Functions
def extract_date_from_text(text):
    """
    Extracts date from the raw text of a tweet
    """
    lines = text.split('\n')
    for line in lines:
        # Check if the line has a date with year
        if re.match(r'^\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b \d{1,2}, \d{4}$', line.strip()):
            date = datetime.datetime.strptime(line.strip(), '%b %d, %Y').date()
            return date
        # If the date doesn't have a year, append the current year
        elif re.match(r'^\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b \d{1,2}$', line.strip()):
            date = datetime.datetime.strptime(line.strip(), '%b %d').date()
            date = date.replace(year=datetime.datetime.now().year)
            return date
    # if no date is found return today's date
    return datetime.date.today()


def clean_tweet_text(text):
    """
    Remove any metadata lines from the raw text of a tweet
    """
    # Split the text into lines
    lines = text.split('\n')

    # Initialize metadata_end as -1
    metadata_end = -1
    # Initialize a flag to indicate whether we are in the metadata section
    in_metadata = False

    # If the tweet is a reply, find the last '@mention' or 'and x others' and return everything after it
    if 'Replying to' in text:
        for i, line in enumerate(lines):
            if 'Replying to' in line:
                # The 'Replying to' line, so the metadata ends in the next line(s) with '@mention' or 'and x others'
                metadata_end = i + 1
                in_metadata = True  # Start of metadata
            elif in_metadata and (re.match('@', line.strip()) or line.strip() == '' or line.strip() == 'and'):
                # This is a line with '@mention', a blank line, or the word and that comes after the 'Replying to' line
                metadata_end = i + 1
            elif in_metadata and (re.match('and \d+ others', line.strip())):
                # A line with 'and x others' that comes after the 'Replying to' line and indicates the end of the loop
                metadata_end = i + 1
                in_metadata = False
                break
            elif in_metadata and not (
                    re.match('@', line.strip()) or line.strip() == '' or re.match('and \d+ others', line.strip())):
                # This is a line without '@mention' or 'and x others' and it's not a blank line that comes after the
                # 'Replying to' line, so metadata has ended
                in_metadata = False

        cleaned_text = '\n'.join(lines[metadata_end:])
    else:
        # If the tweet is not a reply, return everything after the fourth line
        cleaned_text = '\n'.join(lines[4:])

    return cleaned_text.strip()  # Use strip to remove any leading or trailing whitespace


def bookmark_to_dict(bookmark):
    return {
        "id": bookmark.id,
        "text": bookmark.text,
        "link": bookmark.link,
        "author": bookmark.author,
        "summary": bookmark.summary,
        "notes": bookmark.notes,
        "date": bookmark.date.strftime("%b %d, %Y"),  # format the date as a string
        "category": bookmark.category.name if bookmark.category else None,  # handle possible null category
        "tags": [tag.name for tag in bookmark.tags.all()]  # get the names of all tags
    }

def createPaginationLinks(current_page, num_pages):
    if num_pages <= 6:
        page_range = range(1, num_pages + 1)
    else:
        if current_page <= 2 or current_page >= num_pages - 1:
            page_range = list(range(1, 4)) + ['...'] + list(range(num_pages - 2, num_pages + 1))
        else:
            page_range = [1, '...'] + list(range(current_page - 1, current_page + 2)) + ['...', num_pages]

    # Convert the range to a list of strings, because JSON does not support non-string keys
    return [str(i) for i in page_range]

