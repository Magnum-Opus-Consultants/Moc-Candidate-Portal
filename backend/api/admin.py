from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import (
    Activity,
    Application,
    AutomaticEmail,
    CandidateBookmark,
    CandidateProfile,
    Job,
    SavedJob,
    ShortlistEntry,
    User,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ["username", "display_name", "email", "role", "is_staff"]
    list_filter = ["role", "is_staff", "is_superuser"]
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Portal", {"fields": ("role", "phone", "theme")}),
    )


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = ["title", "company", "role_category", "status", "posted_at"]
    list_filter = ["status", "role_category", "work_setup", "employment_type"]
    search_fields = ["title", "company", "description"]


@admin.register(CandidateProfile)
class CandidateProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "headline", "role_category", "completion", "strength"]
    list_filter = ["role_category", "experience_level", "preferred_work_setup"]
    search_fields = ["user__first_name", "user__last_name", "headline"]


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ["candidate", "job", "status", "applied_at"]
    list_filter = ["status"]


@admin.register(AutomaticEmail)
class AutomaticEmailAdmin(admin.ModelAdmin):
    list_display = ["label", "event", "subject", "updated_at"]


admin.site.register([SavedJob, CandidateBookmark, ShortlistEntry, Activity])
admin.site.site_header = "MOC Candidate Portal"
admin.site.site_title = "MOC Candidate Portal"
