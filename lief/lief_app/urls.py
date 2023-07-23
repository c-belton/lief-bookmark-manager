from django.urls import path
from .views import (home, add_bookmark, update_bookmark, delete_bookmark, get_existing_bookmark_data,
                    get_filtered_bookmarks)

urlpatterns = [
    path('', home, name='home'),
    path('add_bookmark/', add_bookmark, name='add_bookmark'),
    path('get_filtered_bookmarks/', get_filtered_bookmarks, name='get_filtered_bookmarks'),
    path('edit_bookmark/<int:bookmark_id>/', update_bookmark, name='update_bookmark'),
    path('get_existing_bookmark_data/<int:bookmark_id>/', get_existing_bookmark_data, name='get_existing_bookmark_data'),
    path('delete/<int:bookmark_id>/', delete_bookmark, name='delete_bookmark'),
]