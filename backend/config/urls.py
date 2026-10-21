"""URL configuration for the Canadite Portal backend.

The front end owns every user-facing page; Django serves the API and admin only.
"""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
]

# Uploaded files in development. In production these are served by the web
# server or object storage, never by Django.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
