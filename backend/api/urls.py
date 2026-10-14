from django.urls import path

from . import auth_views, views

app_name = "api"

urlpatterns = [
    path("health/", views.health, name="health"),
    path("options/", views.profile_options, name="profile-options"),
    # Authentication (email/password) and account management.
    path("auth/register/", auth_views.register, name="auth-register"),
    path("auth/login/", auth_views.login_view, name="auth-login"),
    path("auth/logout/", auth_views.logout_view, name="auth-logout"),
    path("auth/me/", auth_views.me, name="auth-me"),
    path("account/profile/", auth_views.update_profile, name="account-profile"),
    path("account/email/", auth_views.change_email, name="account-email"),
    path("account/password/", auth_views.change_password, name="account-password"),
    path("account/delete/", auth_views.delete_account, name="account-delete"),
    # Public job browsing — no account required.
    path("jobs/", views.job_list, name="job-list"),
    path("jobs/categories/", views.job_categories, name="job-categories"),
    path("jobs/<int:job_id>/", views.job_detail, name="job-detail"),
    path("jobs/<int:job_id>/apply/", views.apply_to_job, name="job-apply"),
    path("jobs/<int:job_id>/save/", views.toggle_saved_job, name="job-save"),
    # Job seeker portal.
    path("candidate/dashboard/", views.candidate_dashboard, name="candidate-dashboard"),
    path("candidate/profile/", views.candidate_profile, name="candidate-profile"),
    path(
        "candidate/profile/update/",
        views.update_candidate_profile,
        name="candidate-profile-update",
    ),
    path(
        "candidate/applications/",
        views.candidate_applications,
        name="candidate-applications",
    ),
    path("candidate/saved/", views.candidate_saved_jobs, name="candidate-saved"),
    path(
        "candidate/recommended/",
        views.candidate_recommended_jobs,
        name="candidate-recommended",
    ),
    path(
        "candidate/recently-viewed/",
        views.candidate_recently_viewed,
        name="candidate-recently-viewed",
    ),
    # Hiring manager portal.
    path("manager/dashboard/", views.manager_dashboard, name="manager-dashboard"),
    path("manager/jobs/", views.manager_jobs, name="manager-jobs"),
    path("manager/jobs/<int:job_id>/", views.manager_job_detail, name="manager-job-detail"),
    path("manager/candidates/", views.manager_candidates, name="manager-candidates"),
    path(
        "manager/candidates/<int:candidate_id>/",
        views.manager_candidate_detail,
        name="manager-candidate-detail",
    ),
    path("manager/emails/", views.automatic_emails, name="manager-emails"),
]
