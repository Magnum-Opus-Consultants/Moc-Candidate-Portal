from django.urls import path

from . import auth_views, oauth_views, views

app_name = "api"

urlpatterns = [
    path("health/", views.health, name="health"),
    path("options/", views.profile_options, name="profile-options"),
    # Authentication (email/password) and account management.
    path("auth/register/", auth_views.register, name="auth-register"),
    path("auth/login/", auth_views.login_view, name="auth-login"),
    path("auth/logout/", auth_views.logout_view, name="auth-logout"),
    path("auth/me/", auth_views.me, name="auth-me"),
    path(
        "auth/verify/resend/",
        auth_views.resend_verification,
        name="auth-verify-resend",
    ),
    path(
        "auth/verify/<str:uidb64>/<str:token>/",
        auth_views.verify_email,
        name="auth-verify",
    ),
    path(
        "auth/password-reset/",
        auth_views.request_password_reset,
        name="auth-password-reset",
    ),
    path(
        "auth/password-reset/confirm/",
        auth_views.confirm_password_reset,
        name="auth-password-reset-confirm",
    ),
    path("auth/providers/", oauth_views.providers, name="auth-providers"),
    path(
        "auth/linkedin/start/", oauth_views.linkedin_start, name="auth-linkedin-start"
    ),
    path(
        "auth/linkedin/callback/",
        oauth_views.linkedin_callback,
        name="auth-linkedin-callback",
    ),
    path(
        "manager/applications/<int:application_id>/status/",
        views.manager_application_status,
        name="manager-application-status",
    ),
    path("auth/google/start/", oauth_views.google_start, name="auth-google-start"),
    path(
        "auth/google/callback/",
        oauth_views.google_callback,
        name="auth-google-callback",
    ),
    path("account/profile/", auth_views.update_profile, name="account-profile"),
    path("account/email/", auth_views.change_email, name="account-email"),
    path("account/password/", auth_views.change_password, name="account-password"),
    path("account/delete/", auth_views.delete_account, name="account-delete"),
    # Public job browsing — no account required.
    path("jobs/", views.job_list, name="job-list"),
    path("jobs/suggest/", views.job_suggestions, name="job-suggest"),
    path("jobs/categories/", views.job_categories, name="job-categories"),
    path("jobs/<int:job_id>/", views.job_detail, name="job-detail"),
    path("jobs/<int:job_id>/apply/", views.apply_to_job, name="job-apply"),
    path("jobs/<int:job_id>/save/", views.toggle_saved_job, name="job-save"),
    # Job seeker portal.
    path("candidate/dashboard/", views.candidate_dashboard, name="candidate-dashboard"),
    path("candidate/profile/", views.candidate_profile, name="candidate-profile"),
    path(
        "candidate/profile/photo/",
        views.candidate_photo,
        name="candidate-photo",
    ),
    path(
        "candidate/profile/cv/",
        views.candidate_cv_upload,
        name="candidate-cv-upload",
    ),
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
    path("candidate/cv/", views.candidate_branded_cv, name="candidate-cv"),
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
    path(
        "manager/jobs/delete/",
        views.manager_jobs_delete,
        name="manager-jobs-delete",
    ),
    path(
        "manager/jobs/create/",
        views.manager_job_create,
        name="manager-job-create",
    ),
    path("manager/jobs/<int:job_id>/", views.manager_job_detail, name="manager-job-detail"),
    path(
        "manager/jobs/<int:job_id>/status/",
        views.manager_job_status,
        name="manager-job-status",
    ),
    path(
        "manager/jobs/<int:job_id>/publish/",
        views.manager_job_publish,
        name="manager-job-publish",
    ),
    path(
        "manager/jobs/<int:job_id>/update/",
        views.manager_job_update,
        name="manager-job-update",
    ),
    path(
        "manager/jobs/<int:job_id>/duplicate/",
        views.manager_job_duplicate,
        name="manager-job-duplicate",
    ),
    path(
        "manager/jobs/<int:job_id>/delete/",
        views.manager_job_delete,
        name="manager-job-delete",
    ),
    path("manager/candidates/", views.manager_candidates, name="manager-candidates"),
    path(
        "manager/candidates/<int:candidate_id>/bookmark/",
        views.manager_candidate_bookmark,
        name="manager-candidate-bookmark",
    ),
    path(
        "manager/candidates/<int:candidate_id>/shortlist/",
        views.manager_candidate_shortlist,
        name="manager-candidate-shortlist",
    ),
    path(
        "manager/candidates/<int:candidate_id>/",
        views.manager_candidate_detail,
        name="manager-candidate-detail",
    ),
    path(
        "manager/candidates/<int:candidate_id>/comments/",
        views.manager_candidate_comment,
        name="manager-candidate-comment",
    ),
    path(
        "manager/candidates/<int:candidate_id>/comments/<int:comment_id>/delete/",
        views.manager_candidate_comment_delete,
        name="manager-candidate-comment-delete",
    ),
    path("manager/emails/", views.automatic_emails, name="manager-emails"),
    path(
        "manager/emails/create/",
        views.automatic_email_create,
        name="manager-email-create",
    ),
    path(
        "manager/emails/<int:email_id>/save/",
        views.automatic_email_save,
        name="manager-email-save",
    ),
    path(
        "manager/emails/<int:email_id>/delete/",
        views.automatic_email_delete,
        name="manager-email-delete",
    ),
]
