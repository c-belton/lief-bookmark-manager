from django.db import models
from django.db.models.signals import pre_delete
from django.dispatch import receiver



class Category(models.Model):
    """
    This model represents a Category Label that can be associated with one or more bookmarked tweets.
    """
    name = models.CharField(max_length=200, unique=True)

    def __str__(self):
        return self.name


class Tag(models.Model):
    """
    This model represents a tag that can be associated with a bookmarked tweet.
    Each tag has a unique name.
    """
    name = models.CharField(max_length=255, unique=True)

    def save(self, *args, **kwargs):
        self.name = self.name.lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Bookmark(models.Model):
    """
    This model represents a bookmarked tweet. It includes the link to the tweet,
    the raw text of the tweet, a summary of the tweet, a category label,
    the date when the bookmark was created, and any associated tags.
    """
    text = models.TextField()
    link = models.URLField(max_length=200)
    author = models.CharField(max_length=200)
    summary = models.TextField(blank=True)
    date = models.DateField(auto_now_add=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)
    tags = models.ManyToManyField(Tag, blank=True)
    notes = models.TextField(blank=True)
    def __str__(self):
        return self.summary[:50]  # Return the first 50 characters of the summary


@receiver(pre_delete, sender=Bookmark)
def delete_unused_category(sender, instance, **kwargs):
    category = instance.category
    if category and Bookmark.objects.filter(category=category).count() == 1:
        category.delete()


@receiver(pre_delete, sender=Bookmark)
def delete_unused_tags(sender, instance, **kwargs):
    tags = instance.tags.all()
    for tag in tags:
        if Bookmark.objects.filter(tags=tag).count() == 1:
            tag.delete()
