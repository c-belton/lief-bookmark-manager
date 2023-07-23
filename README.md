# Lief, a Twitter Bookmark Manager

Welcome to Lief, a Twitter bookmark manager! This application was built with the intent of managing bookmarked tweets in a local database, providing users with more contextual information and a dynamic experience than most platforms offer. It's an experiment and a reflection of my journey as an aspiring programmer.

## Application Flow

1. **Adding a Bookmark**:
    - Bookmarks can be added by submitting a tweet link or both a link and the raw text of the tweet. The choice of method depends on the backend parsing function, which can be toggled in the settings menu.

2. **Processing a Bookmark**:
    - Raw tweet text (i.e. copy and pasted directly) or extracted tweet text (parsed from a link) may be sent to a GPT model. This model does a few things:
        - Summarizes the tweet or thread.
        - Creates a category label.
        - Generates tags for filtering.
    - The extracted and generated data are then stored in the database.

3. **Viewing Bookmarks**:
    - Bookmarks are displayed in a table format. Here, you'll find the summary, full tweet text, date, author, category label, tags, and a section for notes.
    - A static sidebar includes options for sorting the table, as well as hiding/showing columns for a better viewing experience. 
    - In addition, each bookmark row has an actions cell which you can use to edit or delete a bookmark. There is also a link icon to navigate to a tweet, and, when tweets exceed a certain length, an expand/collapse icon will dynamically appear.
    - Note, due to my inexperience and technical challenges, the dynamically generated expand/collapse icon is based on a character count that approximates the actual truncation that occurs on our front end based on webkit line measurements.

4. **Editing Bookmarks**:
    - Users can edit any part of a bookmark. The edit modal offers dynamic input fields for when a new category or tag addition is necessary.

5. **Filtering Bookmarks and Sorting Bookmarks**:
    - You can filter your bookmarks by:
        - Only a category label.
        - A category label followed by tags.
    - Please note: Selecting a category after tag filtering will reset the tag filters.
    - You can also sort the bookmarks by date, category, or author.

6. **Deleting Bookmarks**:
    - An icon in the last column triggers a pop-up prompt. If confirmed, the backend deletes the bookmark, and the frontend updates accordingly.

## Minimalistic and Dynamic

A core principle during the design and development was ensuring dynamic content loading, paired with a minimalist aesthetic. I have a personal vendetta against modern JS and React, so I tortured myself by building this in jquery/AJAX and bootstrap, which I may have learned to regret.

## For Public Version Users

For those using the public version, note that web scraping methods from the link are disabled because I don't feel like having Elon sue me into oblivion or something. The best way to use this app though, is through the Twitter API or other legally permissible web scraping methods within your jurisdiction. The GPT approach in this version works, but it is limited and cannot do things like automatically detect and aggregate threaded tweets without you manually copying in the text of long threads. 

## Additional Configuration

To ensure seamless operation of the Bookmark Manager, additional setup is required:

**OpenAI API Key**: This application is intended for use with OpenAI's API. To use it:

- Obtain an API key from OpenAI.
- Securely store this API key in a local `.env` file. Ensure you have this file properly secured and never commit it to public repositories.

**PostgreSQL Credentials:** Your .env file should also contain your PostgreSQL credentials, as this application uses PostgreSQL as its primary database. Make sure you have DATABASE_URL set up with your PostgreSQL connection string.

**Django Secret Key:** For security, your Django secret key should also be stored in the .env file. Ensure you have a DJANGO_SECRET_KEY variable with your secret key value.

**Configuration in settings.py:** Ensure that the above environment variables are correctly referenced in your settings.py file. This is crucial for the application's database connections and its overall security.

Ensure you've appropriately managed and kept your .env file out of version control to protect sensitive information.

## Installation and Setup:

While Lief is a Django project and can be set up like most Django applications, here's a brief guide:

- Clone the repository to your local machine.
- Navigate to the project directory and create a virtual environment. 
- Activate the virtual environment. 
- Install the necessary packages using pip install -r requirements.txt. 
- Ensure you've set up your .env file as mentioned above. 
- Run migrations using python manage.py makemigrations and migrate. 
- Start the local server using python manage.py runserver. 
- For more detailed instructions or troubleshooting, see the official Django documentation.

## License
Lief is licensed under the MIT License. You can use, modify, and distribute the project as you please. Seethe LICENSE file in the repository.

## Acknowledgements:
Thanks to the Django team for the framework, the team at OpenAI for making these tools available, and all the devs of the libraries and tools that I was able to leverage in building Lief.