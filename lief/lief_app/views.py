from django.shortcuts import render
from .models import Bookmark, Category, Tag
from django.core.paginator import Paginator
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from django.db import transaction, IntegrityError
from .gptbot import GPT
from .utils import extract_date_from_text, clean_tweet_text, bookmark_to_dict, createPaginationLinks
import json
from datetime import datetime


def home(request):
    categories = Category.objects.all()
    category_name = request.GET.get('category')  # Get the category parameter from the GET request
    tag_name = request.GET.get('tag')  # Get the tag parameter from the GET request
    sort_field = request.GET.get('sort_field', 'date') # Default to 'date' if no sort_field is provided
    sort_direction = request.GET.get('sort_direction', '-') # Default to '-' if no sort_direction is provided

    num_per_page = int(request.GET.get('num_per_page', 10))

    order_by_field = "category__name" if sort_field == "category" else sort_field
    order = sort_direction + order_by_field if sort_direction == '-' else order_by_field
    bookmarks = Bookmark.objects.order_by(order)

    # If a category name is provided, filter the bookmarks by the given category
    if category_name:
        bookmarks = bookmarks.filter(category__name=category_name)

    # If a tag name is provided, filter the bookmarks by the given tag
    if tag_name:
        bookmarks = bookmarks.filter(tags__name__icontains=tag_name)

    # Pagination
    # Create a Paginator object based on pagination passed by user's front end settings
    paginator = Paginator(bookmarks, num_per_page)

    # Get the current page number from the GET request
    page_number = request.GET.get('page')
    # Get a Page object representing the current page
    page_obj = paginator.get_page(page_number)

    # Page range generation
    # Get the total number of pages
    num_pages = paginator.num_pages
    # Get the current page number
    current_page = page_obj.number

    # If the total number of pages is less than or equal to 6
    # Then the page range is simply all the page numbers from 1 to num_pages
    if num_pages <= 6:
        page_range = range(1, num_pages + 1)
    else:
        # If the current page is one of the first two or one of the last two
        # The page range includes the first three, an ellipsis, and the last three
        if current_page <= 2 or current_page >= num_pages - 1:
            page_range = list(range(1, 4)) + ['...'] + list(range(num_pages - 2, num_pages + 1))
        else:
            # Otherwise, page range includes first page, an ellipsis, current page and 1 page on either side...
            # ...Another ellipsis, and the last page
            page_range = [1, '...'] + list(range(current_page - 1, current_page + 2)) + ['...', num_pages]

    if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        bookmarks_list = [bookmark_to_dict(bookmark) for bookmark in page_obj.object_list]

        return JsonResponse({
            'bookmarks': bookmarks_list,
            'current_page': page_obj.number,
            'has_previous': page_obj.has_previous(),
            'has_next': page_obj.has_next(),
            'previous_page_number': page_obj.previous_page_number() if page_obj.has_previous() else None,
            'next_page_number': page_obj.next_page_number() if page_obj.has_next() else None,
            'page_range': createPaginationLinks(page_obj.number, paginator.num_pages),
        })

    # Render the home.html template with the required context variables
    return render(request, 'home.html', {'categories': categories, 'page_obj': page_obj,
                                         'selected_category': category_name or 'All Bookmarks',
                                         'page_range': page_range})


def add_bookmark(request):
    if request.method == 'POST':
        try:
            link = request.POST.get('link')
            selected_method = request.POST.get('parsing_method')
            selected_model = request.POST.get('gpt_model')
            author = link.split("/")[-3]

            # Create a new GPT instance
            gpt = GPT(model_name=selected_model)

            # Checks to see if the GPT instance has been authenticated already and authenticates only if it hasn't
            if not GPT._authenticated:
                gpt.authenticate()

            if selected_method == 'get_request_parsing': # Method disabled for public version, but get request approach is ideal

                # Extract the tweet or thread, author and date from the original tweet link
                text, author, date = "Tweet parsing method disabled for public version. No tweet available.", "Disabled", ""

                if text == "Invalid tweet or thread URL":
                    # Handle the case where the URL is not a tweet or a thread
                    return JsonResponse({'error': 'Invalid tweet or thread URL'})

                # Process the tweet using the GPT model
                summary, category, tags = gpt.process_tweet(text)

            elif selected_method == 'gpt_parsing':
                # Extract raw text from post request
                raw_text = request.POST.get('raw_text')

                # Process the tweet using the GPT model directly
                summary, text, date, category, tags = gpt.parse_and_process_tweet(raw_text)

            elif selected_method == 'raw_text_parsing':
                # Extract the raw text from the post request
                raw_text = request.POST.get('raw_text')

                # Extract date, and clean the text using functions
                date = extract_date_from_text(raw_text)
                text = clean_tweet_text(raw_text)

                # Process the cleaned tweet text using the GPT model
                summary, category, tags = gpt.process_tweet(text)

            else:
                # Handle invalid parsing method
                return JsonResponse({'error': 'Invalid parsing method'})

            # Create a new bookmark and save it
            bookmark = Bookmark(
                text=text,
                link=link,
                author=author,
                date=date,
                summary=summary,
                category=category
            )
            bookmark.save()

            # Add the tags to the bookmark
            bookmark.tags.set(tags)

            # Return a JSON response to indicate the success
            return JsonResponse({'success': True})

        except Exception as e:  # Catch-all for unexpected errors
            return JsonResponse({'error': 'An unexpected error occurred while adding the bookmark.'}, status=500)

    # Return a JSON response with an error if the request is not a POST
    return JsonResponse({'error': 'Invalid request method'})

@transaction.atomic
def update_bookmark(request, bookmark_id):
    if request.method == 'POST':
        try:
            # Load the JSON data from the request body
            data = json.loads(request.body)

            bookmark = get_object_or_404(Bookmark, pk=bookmark_id)

            # Save the old category and tags
            old_category = bookmark.category
            old_tags = list(bookmark.tags.all())  # We make a copy of the queryset

            # Update the bookmark's fields from the form data
            bookmark.summary = data.get('summary')
            bookmark.text = data.get('text')
            bookmark.link = data.get('link')
            bookmark.author = data.get('author')
            # Must get date from JS front end as string and convert it back to datetime object for Django DB to handle
            date_string = data.get('date')
            bookmark.date = datetime.strptime(date_string, "%Y-%m-%d")
            bookmark.notes = data.get('notes')

            # Update the bookmark's category using the Category model
            category_name = data.get('category')
            if category_name:
                category, created = Category.objects.get_or_create(name=category_name)
                bookmark.category = category

            # Update the bookmark's tags
            bookmark.tags.clear()
            tags = data.get('tags')
            for tag_name in tags:
                tag, created = Tag.objects.get_or_create(name=tag_name.lower())
                bookmark.tags.add(tag)

            # Save the bookmark
            bookmark.save()

            # Check if the old category is still being used by any other bookmarks
            if old_category and old_category != bookmark.category and \
                    Bookmark.objects.filter(category=old_category).count() == 0:
                old_category.delete()

            # Check if old tags are still being used  by any other bookmarks
            for old_tag in old_tags:
                if old_tag not in bookmark.tags.all() and \
                        Bookmark.objects.filter(tags__name=old_tag.name).count() == 0:
                    old_tag.delete()

            # Convert the bookmark to a dictionary and return it in the response
            bookmark_dict = bookmark_to_dict(bookmark)
            return JsonResponse({'bookmark': bookmark_dict})
        except IntegrityError:  # Catches database-related errors
            return JsonResponse({'error': 'Failed to update bookmark due to a database error.'}, status=500)
        except Exception as e:  # General catch-all
            return JsonResponse({'error': f'An unexpected error occurred: {str(e)}'}, status=500)
    else:
        return JsonResponse({'error': 'Invalid request method'}, status=400)


@csrf_exempt
@require_POST
def delete_bookmark(request, bookmark_id):
    try:
        bookmark = Bookmark.objects.get(id=bookmark_id)
        bookmark.delete()
        return JsonResponse({"success": True})
    except Bookmark.DoesNotExist:
        return JsonResponse({"success": False}, status=404)


def get_filtered_bookmarks(request):
    if request.method == "GET":
        tag_name = request.GET.get('tag', None)
        category_name = request.GET.get('category', None)
        page_number = request.GET.get('page', 1)
        sort_field = request.GET.get('sort_field', 'date')
        sort_direction = request.GET.get('sort_direction', '-')

        # Applying pagination Settings
        num_per_page = int(request.GET.get('num_per_page', 10))

        order_by_field = "category__name" if sort_field == "category" else sort_field
        order = sort_direction + order_by_field if sort_direction == '-' else order_by_field

        if category_name:
            # If a category is selected, filter bookmarks by category
            bookmarks = Bookmark.objects.filter(category__name=category_name).order_by(order)
        else:
            # If no category is selected, return all bookmarks
            bookmarks = Bookmark.objects.all().order_by(order)

        if tag_name and tag_name.strip():
            # Filter bookmarks by tag name within the selected category or across all categories
            bookmarks = bookmarks.filter(tags__name__startswith=tag_name)

        paginator = Paginator(bookmarks, num_per_page)

        # Handle 'previous' and 'next'
        if page_number == 'previous':
            page_number = max(1, int(request.GET.get('current_page', 1)) - 1)
        elif page_number == 'next':
            page_number = min(paginator.num_pages, int(request.GET.get('current_page', 1)) + 1)

        page_obj = paginator.get_page(page_number)

        bookmarks_list = [bookmark_to_dict(bookmark) for bookmark in page_obj.object_list]

        return JsonResponse({
            'bookmarks': bookmarks_list,
            'current_page': page_obj.number,
            'has_previous': page_obj.has_previous(),
            'has_next': page_obj.has_next(),
            'previous_page_number': page_obj.previous_page_number() if page_obj.has_previous() else None,
            'next_page_number': page_obj.next_page_number() if page_obj.has_next() else None,
            'page_range': createPaginationLinks(page_obj.number, paginator.num_pages),
        })

    return JsonResponse({"error": "Not a valid request or no tag or category given for filtering"}, status=400)


def get_existing_bookmark_data(request, bookmark_id):
    bookmark = get_object_or_404(Bookmark, pk=bookmark_id)
    tags = [tag.name for tag in bookmark.tags.all()]
    data = {
        "summary": bookmark.summary,
        "text": bookmark.text,
        "link": bookmark.link,
        "author": bookmark.author,
        "date": bookmark.date.strftime('%Y-%m-%d'), # format date to string in the correct format
        "category": bookmark.category.name if bookmark.category else None,  # handle possible null category
        'tags': tags,
        'notes': bookmark.notes,
    }
    return JsonResponse(data)