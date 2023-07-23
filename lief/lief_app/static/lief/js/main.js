$(document).ready(function() {

// ==========================================
// 1. INITIALIZATION
// ==========================================

    // Global variable to track selected categories or tags for advanced tag filtering
    let selectedCategory = null;
    let selectedTag = null;

    // Initialize currentPage
    let currentPage = 1;

    // Initialize sort buttons
    let sortButtons = $('.nav-link[id^="sort-"] .icon-button');

    // Initialize column visibility checkboxes
    let checkboxes = $('.column-checkbox');

    // Retrieve the selected method and model from local storage
    let selectedMethod = localStorage.getItem('selectedMethod');
    let selectedModel = localStorage.getItem('selectedModel');

    // Set default values if the selectedMethod or selectedModel is null
    if (!selectedMethod) {
        selectedMethod = 'gpt_parsing'; // Default parsing method
        localStorage.setItem('selectedMethod', selectedMethod);
    }

    if (!selectedModel) {
        selectedModel = 'gpt-3.5-turbo'; // Default GPT model
        localStorage.setItem('selectedModel', selectedModel);
    }


    // Initialize dropdown values
    $('#parsingMethodDropdown').val(selectedMethod).trigger('change');
    $('#gptModelDropdown').val(selectedModel).trigger('change');

    // On page load, initialize dynamically rendered table with any saved visibility settings
    updateTable('/get_filtered_bookmarks/', {});

    // Show the table after applying the visibility states
    $('.table').css('display', 'table');

// ==========================================
// 2. UTILITY FUNCTIONS
// ==========================================

    // Functions for creating table rows and table bodies
    function createTableRow(bookmark) {
        let categoryHTML = '';
        if (bookmark.category !== null) {
            categoryHTML = `<a href="#" class="category-name">${bookmark.category}</a>`;
        }

        let tagsHTML = '';
        //Loops over and returns all tags as html string
       bookmark.tags.forEach(tag => {
            tagsHTML += `<a href="#" class="tag-name">${tag}</a> `;
        });

        return `
            <tr id="bookmark-row-${bookmark.id}">
                <td class="summary-cell">
                    <div class="show truncated-cell" id="truncatedSummary${bookmark.id}">
                        ${formatCellText(bookmark.summary)}
                    </div>
                    <div class="collapse expanded-cell" id="expandedSummary${bookmark.id}">
                        ${formatCellText(bookmark.summary)}
                    </div>
                </td>
                <td class="text-cell">
                    <div class="show truncated-cell" id="truncatedText${bookmark.id}">
                        ${formatCellText(bookmark.text)}
                    </div>
                    <div class="collapse expanded-cell" id="expandedText${bookmark.id}">
                        ${formatCellText(bookmark.text)}
                    </div>
                </td>
                <td class="date-cell">${bookmark.date}</td>
                <td class="author-cell">
                    <a href="https://twitter.com/${bookmark.author}" target="_blank">${bookmark.author}</a>
                </td>
                <td class="category-cell">${categoryHTML}</td>
                <td class="tags-cell">${tagsHTML}</td>
                <td class="notes-cell">
                    <div class="show truncated-cell" id="truncatedNotes${bookmark.id}">
                        ${formatCellText(bookmark.notes)}
                    </div>
                    <div class="collapse expanded-cell" id="expandedNotes${bookmark.id}">
                        ${formatCellText(bookmark.notes)}
                    </div>
                </td>
                <td class="actions-cell">
                    <div class="actions-group">
                        <div class="top-actions-row">
                            <button
                            class="icon-button edit-button"
                            data-id="${bookmark.id}"
                            data-bs-toggle="modal"
                            data-bs-target="#editBookmarkModal"
                            >
                                <img src="/static/lief/icons/edit.svg" alt="More" title="Edit Bookmark">
                            </button>
                            <button
                            class="icon-button delete-button"
                            data-id="${bookmark.id}"
                            data-bs-toggle="modal"
                            data-bs-target="#confirmDeleteModal"
                            >
                                <img src="/static/lief/icons/trash.svg" alt="Delete" title="Delete Bookmark">
                            </button>
                        </div>
                        <div class="bottom-actions-row">
                            <div class="toggle-button-container">
                                <button class="icon-button toggle-button">
                                    <img
                                    id="toggleTextIcon${bookmark.id}"
                                    class="toggle-text-icon"
                                    src="/static/lief/icons/expand.svg"
                                    data-id="${bookmark.id}"
                                    title="Expand/Collapse"
                                    >
                                </button>
                            </div>
                            <div class="link-button-container">
                                <a class="icon-button link-button" href="${bookmark.link}" target="_blank">
                                    <img src="/static/lief/icons/link.svg" alt="Link" title="Go to Tweet">
                                </a>
                            </div>
                        </div>
                    </div>
                </td>
            </tr>
        `;
    }
    function createTableBody(bookmarks) {
        let tableBody = '';
        bookmarks.forEach(bookmark => {
            tableBody += createTableRow(bookmark);
        });
        return tableBody;
    }

    // General function for updating the table
    function updateTable(url, ajaxData, handleResponse) {
        // Retrieve the sort field and direction from local storage
        let savedSortField = localStorage.getItem('sort_field') || 'date';
        let savedSortDirection = localStorage.getItem('sort_direction') || '-';
        // Retrieve user pagination setting from the input box or local storage and sets that number in the UI
        let numPerPage = localStorage.getItem('numPerPage') || $('#numPerPage').val() || "10";
        $('#numPerPage').val(numPerPage);

        // Add the sort field, direction, and user pagination settings to the AJAX data
        ajaxData.sort_field = savedSortField;
        ajaxData.sort_direction = savedSortDirection;
        ajaxData.num_per_page = numPerPage;

        $.ajax({
            url: url,
            type: 'GET',
            data: ajaxData,
            success: function(response) {
                // Call the provided response handler, if one was given
                if (typeof handleResponse === 'function') {
                    handleResponse(response);
                }

                // Updates and sorts table
                updateTableWithSortedData(response);

                // Apply an expansion or contraction icon if text is truncated
                updateExpandedIconVisibility();

                // Apply column visibility settings
                applyColumnVisibilitySettings();

                // Adjusts the height of the scrollable element of the table to ensure proper formatting for table
                adjustScrollableTableHeight();

                // Updates pagination based on filtered results
                let paginationLinksHTML = createPaginationLinks(
                response.page_range,
                response.current_page,
                response.has_next,
                response.has_previous
                );
                $('#paginationLinks').html(paginationLinksHTML);
            },
            fail: function(error) {
                console.error(error);
                alert("Error Loading Bookmarks. Please refresh and try again.");
            }
        });
    }

    // Function for updating table after server has returned sorted table
    function updateTableWithSortedData(data) {
        // Convert bookmark data to HTML and replace the table body content with it
        let tableBodyHTML = createTableBody(data.bookmarks);
        // Replace the table body content with the filtered table content
        $('#bookmarksTableBody').html(tableBodyHTML);
    }

    // Function for applying expanded icon visibility
    function updateExpandedIconVisibility() {
        // Loop through each row in the table
        $('tr').each(function() {
            // Check if any of the cells in this row have content that can be expanded
            let hasExpandableContent = false;
            $(this).find('.summary-cell, .text-cell, .notes-cell').each(function() {
                // Check if the content in the cell is longer than the character limit
                let cellContent = $(this).find('.truncated-cell').text().trim();
                let isTruncated = cellContent.length > 192; // 192 char used as a proxy to estimate webkit truncation
                // If the content length exceeds the limit, stop checking other cells in the row
                if (isTruncated) {
                    hasExpandableContent = true;
                    return false;  // Breaks the jQuery .each() loop
                }
            });
            // If the row has content that can be expanded, show the arrow icon, otherwise hide it
            $(this).find('.toggle-text-icon').toggle(hasExpandableContent);
        });
    }

    // Function for applying column visibility settings after successful AJAX calls
    function applyColumnVisibilitySettings() {
        $('.column-checkbox').each(function() {
            let checkboxId = $(this).attr('id');
            let cellClass = '.' + checkboxId.replace('Toggle', '-cell');
            let savedVisibilityState;

            try {
                savedVisibilityState = localStorage.getItem(checkboxId);
                if (savedVisibilityState === null) {
                    // No saved state, default to visible
                    localStorage.setItem(checkboxId, 'true');
                    savedVisibilityState = 'true';
                }
            } catch (error) {
                console.error('Error accessing local storage:', error);
                // Handle the error (e.g., assume all checkboxes are checked or set to true)
                savedVisibilityState = 'true';
            }
            // Ensure the checkbox reflects the saved visibility state
            $(this).prop('checked', savedVisibilityState === 'true');

            $(cellClass).toggle(savedVisibilityState === 'true');
        });
    }

    // Function for adjusting the scrollable table height on table reload
    function adjustScrollableTableHeight() {
        let tableHeaderHeight = $('.table-sticky-header').outerHeight(true); // Includes margin of table header
        let stickyHeaderHeight = $('.sticky-header').outerHeight(true); // Includes margin of sticky header
        let bottomPadding = 10; // Desired bottom padding

        // Sets the height of the scrollable table
        $('.scrollable-table').css('height', 'calc(100vh - ' + tableHeaderHeight + 'px - ' + stickyHeaderHeight
        + 'px - ' + bottomPadding + 'px)');
    }

    // Function for dynamically rendering pagination links
    function createPaginationLinks(pageRange, currentPage, hasNext, hasPrevious) {
        let paginationHTML = [];

        // Add previous arrow
        if (hasPrevious) {
            paginationHTML.push('<a href="#">&lt;</a>');
        } else {
            paginationHTML.push('<span class="arrow-disabled">&lt;</span>');
        }

        // Add page numbers and ellipsis
        for (let i = 0; i < pageRange.length; i++) {
            if (pageRange[i] === "...") {
                paginationHTML.push('<span class="ellipsis">...</span>');
            } else if (pageRange[i] == currentPage) {
                paginationHTML.push('<span class="current">' + pageRange[i] + '</span>');
            } else {
                paginationHTML.push('<a href="#">' + pageRange[i] + '</a>');
            }
        }

        // Add next arrow
        if (hasNext) {
            paginationHTML.push('<a href="#">&gt;</a>');
        } else {
            paginationHTML.push('<span class="arrow-disabled">&gt;</span>');
        }

        return paginationHTML.join("");
    }

    // Function for handling a category click for category event handlers
    function handleCategoryClick(category) {
      selectedCategory = category; // Store the selected category
      currentPage = 1; // Reset currentPage
      selectedTag = null;
      $('#tag').val(''); // Clear the tag input field

      let ajaxData = {
          category: category,
          page: currentPage
      };

      // Make an AJAX GET request to the filter by category URL
      updateTable('/get_filtered_bookmarks/', ajaxData, function(data) {
          // Update the category heading
          $('#categoryHeading').text(category);
      });
    }

    // Function for formatting cells with line breaks and URLs for links in text
    function formatCellText(text) {
        // Convert newlines to breaks
        let formattedText = text.replace(/\n/g, '<br>');

        // Linkify URLs
        const urlPattern = /https?:\/\/[^\s<]+/g;  // Regex does not match < character to avoid including <br> in html
        formattedText = formattedText.replace(urlPattern, function(url) {
            return `<a href="${url}" target="_blank">${url}</a>`;
        });

        return formattedText;
    }

    // Function to attach the CSRF token to every AJAX request
    function getCsrfToken() {
        return $('input[name="csrfmiddlewaretoken"]').val();
    }

    // General function for debouncing
    function debounce(func, delay) {
      let debounceTimer;
      return function() {
        const context = this;
        const args = arguments;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => func.apply(context, args), delay);
      };
    }

// ==========================================
// 3. EVENT HANDLERS
// ==========================================

// For Filtering Bookmarks

    // Event listener for clicking the Category Label in the menu or from the table to filter by category
    $(document).on('click', '#categoriesNavLink, .category-name' , function(event) {
      event.preventDefault();
      let category = $(this).text();
      handleCategoryClick(category);
      return false;
    });

    // Event listener for typing in tags in the search input box
    $('#tag').on('input', debounce(function(event) {
        event.preventDefault();

        let tag = $(this).val();
        selectedTag = tag; // Update the selectedTag variable

        currentPage = 1; // Reset currentPage

        // Make an AJAX GET request to the server-side view for filtering bookmarks by tag
        let ajaxData = {
            tag: tag,
            page: currentPage
        };
        // Check if a category is selected
        if (selectedCategory !== null) {
            ajaxData.category = selectedCategory; // Include the selected category in the request
        }

        // Make an AJAX GET request to the filter by tag input
        updateTable('/get_filtered_bookmarks/', ajaxData);
    }, 100)); // Debounce delay

    // Event listener for clicking tags in bookmark table
    $(document).on('click', '.tag-name', function(event) {
        event.preventDefault();
        // Get the tag name from the clicked element
        let tag = $(this).text();

        selectedTag = tag; // Update the selectedTag variable
        currentPage = 1; // Reset currentPage

        // Make an AJAX GET request to the server-side view for filtering bookmarks by tag url
        let ajaxData = {
                tag: tag,
                page: currentPage
            };

       // Check if a category is selected
        if (selectedCategory !== null) {
            ajaxData.category = selectedCategory; // Include the selected category in the request
        }

        // Make an AJAX GET request to the filter by tag input
        updateTable('/get_filtered_bookmarks/', ajaxData);
        return false; // Prevent any further propagation of the event
    });

    // Event listener for clicking home and returning unfiltered but sorted table
    $('a.home-link').on('click', function(e){
        // Prevent the default behavior
        e.preventDefault();

        // Clear any selected category, tags and the tag input field and reset the category heading to "All Bookmarks"
        selectedCategory = null;
        selectedTag = null;
        $('#tag').val('');
        $('#categoryHeading').text('All Bookmarks');

        // Apply only sort settings to return an unfiltered but sorted table
        updateTable('/get_filtered_bookmarks/', {});
    });

// For Editing Bookmarks

    // Edit button click event listener to launch edit modal for editing bookmarks
    $(document).on('click', '.edit-button', function(e) {
        e.preventDefault();
        let bookmarkId = $(this).data('id');
         // Store the bookmark ID in the modal to reference with edit button later
        $('#editBookmarkModal').data('bookmarkId', bookmarkId);

        // Fetch the bookmark data for pre-filling the modal
        $.get('/get_existing_bookmark_data/' + bookmarkId + '/', function(data) {

            // Pre-fill the fields in the modal
            $('#edit-summary').val(data.summary);
            $('#edit-text').val(data.text);
            $('#edit-date').val(data.date);
            $('#edit-author').val(data.author);
            $('#edit-notes').val(data.notes);
            $('#edit-link').val(data.link);

            // Check if the category exists in the dropdown options
            if ($("#edit-category option[value='" + data.category + "']").length === 0) {
                // If not, add it
                $('#edit-category').append(new Option(data.category, data.category));
            }
            $('#edit-category').val(data.category);

            // Populate the tags in the modal
            let tagContainer = $('#edit-tags');
            tagContainer.empty();  // Clear the tag container first

            // Add each tag as a checkbox
            data.tags.forEach(function(tag) {
                let checkbox = '<div class="tag-container"><img src="/static/lief/icons/x.svg" ' +
                               'class="remove-tag-icon clickable" data-value="' + tag + '"> ' + tag + '</div>';
                tagContainer.append(checkbox);
            });
        });

        // Open the edit bookmark modal
        $('#editBookmarkModal').modal('show');
    });

    // 'Add Category' button click event listener in edit modal
    $('#add-category-button').click(function(e) {
        e.preventDefault();
        let inputField = '<input type="text" id="new-category-input" class="form-control me-2 mt-2" ' +
                          'placeholder="New Category">';
        let saveButton = '<button id="save-category-button" type="button" ' +
                         'class="btn btn-primary me-2 mt-2">Save</button>';
        let cancelButton = '<button id="cancel-category-button" type="button" ' +
                           'class="btn btn-secondary me-2 mt-2">Cancel</button>';
        // Append input field and save button to the new container div
        $('#add-category-container').append(inputField + saveButton + cancelButton);
    });

    // Event delegation used to add an event listener to the dynamically created save new category button in edit modal
    $(document).on('click', '#save-category-button', function() {
        let newCategoryName = $('#new-category-input').val();

        // Add the new category to the dropdown and select it
        let newOption = new Option(newCategoryName, newCategoryName, true, true);
        $('#edit-category').append(newOption).trigger('change');

        // Remove the input field and save and cancel buttons
        $('#new-category-input').remove();
        $('#save-category-button').remove();
        $('#cancel-category-button').remove();
    });

    // Event delegation used to add an event listener to the dynamically created cancel button in edit modal
    $(document).on('click', '#cancel-category-button', function() {
        // Remove the input field, save button, and cancel button
        $('#new-category-input').remove();
        $('#save-category-button').remove();
        $('#cancel-category-button').remove();
    });

    // Event listener for tag checkboxes
    $(document).on('click', '.remove-tag-icon', function() {
        // When an x icon next to the tag is clicked, remove it from the DOM
        $(this).parent().remove();
    });

    // Add Tag button click event listener
    $('#add-tag-button').click(function(e) {
        e.preventDefault();
        let inputField = '<input type="text" id="new-tag-input" class="form-control me-2 mt-2" placeholder="New Tag">';
        let saveButton = '<button id="save-tag-button" type="button" class="btn btn-primary me-2 mt-2">Save</button>';
        let cancelButton = '<button id="cancel-tag-button" type="button" ' +
                           'class="btn btn-secondary me-2 mt-2">Cancel</button>';
        // Append input field and save button to the new container div
        $('#add-tag-container').append(inputField + saveButton + cancelButton);
    });

    // Event listener for dynamically created Cancel button click for cancelling adding a new tag in edit modal
    $(document).on('click', '#cancel-tag-button', function(e) {
        e.preventDefault();

        // Clears the add tag container for next use
        $('#add-tag-container').empty();
    });

    // Event delegation used to add an event listener for dynamically created Save new tag button click
    $(document).on('click', '#save-tag-button', function(e) {
        e.preventDefault();

        let newTag = $('#new-tag-input').val();
        if (newTag) {  // Check if input is not empty
            // Append the new tag as an unchecked checkbox in a div to the tag container
            let checkbox = '<div class="tag-container"><img src="/static/lief/icons/x.svg" ' +
                           'class="remove-tag-icon clickable" data-value="' + newTag + '"> ' + newTag + '</div>';
            $('#edit-tags').append(checkbox);

            // Clears the add tag container for next use
            $('#add-tag-container').empty();
        }
    });

    // Save button click event listener in the edit bookmark modal
    $('#saveBookmarkButton').click(function(e) {
        e.preventDefault();

        let bookmarkId = $('#editBookmarkModal').data('bookmarkId');
        // Create a new FormData object from the edit bookmark form
        let formData = new FormData($('#editBookmarkForm')[0]);
        let dataObject = {};

        // Iterate over the FormData entries
        for (let pair of formData.entries()) {
            // Add each entry to the data object
            dataObject[pair[0]] = pair[1];
        };

        // Fetch the values of all tags reflected in the edit tags container
        let tags = [];
        $('.remove-tag-icon').each(function() {
            tags.push($(this).data('value'));
        });

        // Append the tags to the data object
        dataObject['tags'] = tags;

        // Get selected category name (instead of ID)
        let selectedCategoryName = $("#editBookmarkForm select[name='category'] option:selected").text();

        // Append the category name to the data object
        dataObject['category'] = selectedCategoryName;

        let csrfToken = $('input[name="csrfmiddlewaretoken"]').val();

        // AJAX request to save bookmark edits
        $.ajax({
            url: '/edit_bookmark/' + bookmarkId + '/',
            type: 'POST',
            // Convert the data object to a JSON string
            data: JSON.stringify(dataObject),
            contentType: 'application/json',
            headers: {
                 // Include the CSRF token in the request header
                'X-CSRFToken': csrfToken,
            },
            success: function(response) {
                $('#editBookmarkModal').modal('hide');

                // Create the new row HTML
                let newRow = createTableRow(response.bookmark);

                // Replace the old row with the new row
                $('#bookmark-row-' + bookmarkId).replaceWith(newRow);

                // Apply an expansion or contraction icon if text is truncated
                updateExpandedIconVisibility()

                // Apply column visibility settings
                applyColumnVisibilitySettings();

                // Adjusts the height of the scrollable element of the table to ensure proper formatting for table
                adjustScrollableTableHeight();
            },
            error: function(error) {
                // Handle error response here
                console.log(error);
                alert('Failed to update bookmark. Please try again.');
            }
        });
    });

// For Deleting Bookmarks
    // Click event listener for the delete buttons to prompt deletion modal
    $(document).on('click', '.delete-button', function(e) {
        e.preventDefault();
        let bookmarkId = $(this).data('id');
        $('#confirmDeleteButton').data('bookmark-id', bookmarkId);

        // Open the modal
        $('#confirmDeleteModal').modal('show');
    });

    // Add a click event listener to the confirm delete button in the modal
    $('#confirmDeleteButton').click(function() {
        let bookmarkId = $(this).data('bookmark-id');
        let csrfToken = document.querySelector('input[name="csrfmiddlewaretoken"]').value;

        // Send the AJAX request to delete the bookmark
        $.ajax({
            url: '/delete/' + bookmarkId + '/',
            type: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken(),
            },
            success: function(response) {
                if (response.success) {
                    // If the deletion was successful, remove the bookmark row from the table
                    $('#bookmark-row-' + bookmarkId).remove();
                } else {
                    // If the server responded with an error, display it
                    alert('Failed to delete bookmark. Please try again.');
                }
            },
            error: function(xhr, textStatus, errorThrown) {
                console.log(errorThrown);
                // Display an error message
                alert('Failed to delete bookmark. Please try again.');
            },
            complete: function() {
                $('#confirmDeleteModal').modal('hide');
            }
        });
    });

// For Adding Bookmarks
    // Handle submit event on the add bookmark form
    $('#addBookmarkForm').submit(function(event) {
        event.preventDefault();

        let bookmarkLink = $('#bookmarkLink').val();
        let rawText = $('#rawText').val();

        // Grey out and make the "Add Bookmark" link flash, and disable the modal pop-up
        $('#addBookmarkLink').addClass('text-muted flashing');
        $('#addBookmarkLink').removeAttr('data-bs-toggle data-bs-target');

        //Close the modal and clear the values
        $('#addBookmarkModal').modal('hide');
        $('#bookmarkLink').val('');
        $('#rawText').val('');

        // Make an AJAX POST request to the server-side view to add the bookmark
        $.ajax({
            url: '/add_bookmark/',
            type: 'POST',
            data: {
                link: bookmarkLink,
                parsing_method: selectedMethod,
                raw_text: rawText,
                gpt_model: selectedModel
            },
            headers: {
                'X-CSRFToken': getCsrfToken(),
            },
            success: function(response) {
                // Show the bookmark added notification
                $('#bookmarkAddedNotification').fadeIn().delay(2000).fadeOut();

                // Call updateTable after a delay to display the updated list of bookmarks
                setTimeout(function() {
                    updateTable('/get_filtered_bookmarks/', {});
                }, 2500);
            },
            error: function(error) {
                console.error(error);
                // Show the error notification
                $('#bookmarkErrorNotification').fadeIn().delay(2000).fadeOut();
            },
            complete: function() {
                // Re-enable "Add Bookmark" link, remove flashing and greyed out effect, and re-enable the modal pop-up
                $('#addBookmarkLink').removeClass('text-muted flashing');
                $('#addBookmarkLink').attr({'data-bs-toggle': 'modal', 'data-bs-target': '#addBookmarkModal'});
            }
        });
    });

// Sorting
    // Event listener for when sort buttons are clicked
    sortButtons.click(function() {
        // Get the id of the button that was clicked
        let buttonId = $(this).attr('id');

        // Determine the sort field and direction based on the button id
        let field = buttonId.split('-')[1];  // date, author, or category
        let direction = buttonId.split('-')[2] === 'desc' ? '-' : '+';  // '-' for desc, '' for asc

        // Save the sort settings
        localStorage.setItem('sort_field', field);
        localStorage.setItem('sort_direction', direction);

        // Apply the sort settings
        updateTable('/get_filtered_bookmarks/', {});
    });

// Pagination
    // Event listener for pagination links
    $(document).on('click', '#paginationLinks a', function(event) {
        event.preventDefault();
        let pageNumber = $(this).text() === '<' ? 'previous' :
                         $(this).text() === '>' ? 'next' : $(this).text();

        // Prepare the data for the AJAX call
        let ajaxData = {
            'page': pageNumber,
            'current_page': currentPage,
            'category': selectedCategory,
            'tag': selectedTag,
        };

        // Make the AJAX call to the server
        updateTable('/get_filtered_bookmarks/', ajaxData, function(data) {
            // Update currentPage with the current page number returned from the server
            currentPage = data.current_page;

            // Ensure currentPage is set to the first page if undefined
            if (!currentPage) {
                currentPage = 1;
            }
        });
    });

    // Event listener for updating number of pages shown based on user pagination setting selection
    $('#numPerPage').change(function() {
        try {
            localStorage.setItem('numPerPage', $(this).val());
            updateTable('/get_filtered_bookmarks/', {}, function(data) {
                currentPage = data.current_page || 1;
            });
        } catch (e) {
            console.error("Failed to save setting to localStorage:", e);
            alert("We couldn't save your settings. The default view of 10 bookmarks per page will apply.");
        }
    });

// Text Viewing
    // Function for collapse/expanding row on click of expand/collapse icon
    $(document).on('click', '.toggle-text-icon', function() {
        let rowId = $(this).data('id');
        let row = $('#bookmark-row-' + rowId);
        let icon = $(this);

        // Iterate over each pair of expanded and truncated cells in the row
        row.find('.summary-cell, .text-cell, .notes-cell').each(function() {
            let expandedCell = $(this).find('.expanded-cell');
            let truncatedCell = $(this).find('.truncated-cell');

            // Toggle classes based on whether the expanded cell is currently hidden
            if (expandedCell.hasClass('collapse')) {
                expandedCell.removeClass('collapse').addClass('show');
                truncatedCell.removeClass('show').addClass('collapse');
            } else {
                expandedCell.removeClass('show').addClass('collapse');
                truncatedCell.removeClass('collapse').addClass('show');
            }
        });

        // Change the icon based on the new state of the cells
        let newIconSrc = row.find('.expanded-cell').first().hasClass('show') ?
            '/static/lief/icons/collapse.svg' : '/static/lief/icons/expand.svg';
        icon.attr('src', newIconSrc);
    });

// Column Visibility
    // Event handler for column visibility checkbox state changes
     checkboxes.change(function() {
        // This will be called whenever a checkbox changes state

        // Get the id of the checkbox that was changed
        let checkboxId = $(this).attr('id');

        // Determine the cell class based on the checkbox id
        let cellClass = '.' + checkboxId.replace('Toggle', '-cell');

        if($(this).is(':checked')) {
            // If the checkbox is checked, show the column
            $(cellClass).show();
            localStorage.setItem(checkboxId, 'true');
        } else {
            // If the checkbox is not checked, hide the column
            $(cellClass).hide();
            localStorage.setItem(checkboxId, 'false');
        }
    });

// Settings
    // Event handler for showing settings modal when settings icon is clicked
    $('.settings-icon').click(function() {
        $('#settingsModal').modal('show');
    });

    // Function for handling the save button in the settings modal
    $('#saveSettingsButton').click(function() {
        selectedMethod = $('#parsingMethodDropdown').val();
        selectedModel = $('#gptModelDropdown').val();

        // Save the selected method and model in local storage
        localStorage.setItem('selectedMethod', selectedMethod);
        localStorage.setItem('selectedModel', selectedModel);

        // Close the modal
        $('#settingsModal').modal('hide');
    });

    // Event listener for hiding or showing the text input field depending on parsing method in settings
    $(document).on('change click', '#parsingMethodDropdown, #addBookmarkLink', function() {
        let selectedMethod = $('#parsingMethodDropdown').val();

        if (selectedMethod === 'gpt_parsing' || selectedMethod === 'raw_text_parsing') {
            $('#rawTextField').show();
        } else {
            $('#rawTextField').hide();
        }
    });
});