"""URL configuration for the Canadite Portal backend.

The front end owns every user-facing page; Django serves the API and admin only.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("api.urls")),
]
