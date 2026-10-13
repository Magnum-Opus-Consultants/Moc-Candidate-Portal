"""
Django settings for the Canadite Portal backend.

Values that differ between machines or environments are read from the
environment (see .env.example); everything else is safe to keep in source.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

load_dotenv(BASE_DIR / ".env")


def env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


def env_list(name: str, default: str = "") -> list[str]:
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]


# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "django-insecure-p4-pb(7uccy2dg5-hcj_ud(#5d$!cx&9*pt@o^3n43f*m_j@9(",
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = env_bool("DJANGO_DEBUG", True)

ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")


# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "api",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


# Database
# https://docs.djangoproject.com/en/6.1/ref/settings/#databases

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}


# Password validation
# https://docs.djangoproject.com/en/6.1/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


# Internationalization
# https://docs.djangoproject.com/en/6.1/topics/i18n/

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.1/howto/static-files/

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"


# Email
# https://docs.djangoproject.com/en/6.1/topics/email/#topic-email-configuration

# Email delivery (Django 6 MAILERS). Console by default, so development needs no
# credentials and the welcome email just prints to the log. To send for real,
# set DJANGO_EMAIL_BACKEND to the SMTP backend and supply the moc-pty.com
# credentials. Microsoft 365: smtp.office365.com:587, STARTTLS, and an app
# password if basic SMTP auth is disabled on the mailbox.
#
# The host, port and credentials go inside OPTIONS, in lower case: Django
# passes OPTIONS straight to the backend's constructor and ignores any other
# key in the mailer config. Spelling them HOST/PORT at the top level looks
# right but is dropped, and the SMTP backend then refuses to start with
# "OPTIONS must define 'host'" — which would only surface in production,
# since development takes the console branch below.
# Microsoft Graph (the MOC Workspace's mail app) is the production sender: a
# client-credentials app with the Mail.Send application permission, sending as
# GRAPH_MAILBOX. Only GRAPH_CLIENT_SECRET is secret — the client and tenant ids
# are not. See api/graph_email.py.
GRAPH_CLIENT_ID = os.getenv("GRAPH_CLIENT_ID", "43fbe5a9-6b5b-4c81-9067-7aff9ac3ed5a")
GRAPH_TENANT_ID = os.getenv("GRAPH_TENANT_ID", "b1504b1d-d096-409a-a0f0-6cc546dde993")
GRAPH_CLIENT_SECRET = os.getenv("GRAPH_CLIENT_SECRET", "")
GRAPH_MAILBOX = os.getenv("GRAPH_MAILBOX", "Ethan.Sevenster@moc-pty.com")

_EMAIL_BACKEND = os.getenv("DJANGO_EMAIL_BACKEND", "")
if "graph" in _EMAIL_BACKEND.lower():
    MAILERS = {"default": {"BACKEND": _EMAIL_BACKEND}}
elif "smtp" in _EMAIL_BACKEND:
    MAILERS = {
        "default": {
            "BACKEND": _EMAIL_BACKEND,
            "OPTIONS": {
                "host": os.getenv("DJANGO_EMAIL_HOST", "smtp.office365.com"),
                "port": int(os.getenv("DJANGO_EMAIL_PORT", "587")),
                "use_tls": env_bool("DJANGO_EMAIL_USE_TLS", True),
                "username": os.getenv("DJANGO_EMAIL_HOST_USER", ""),
                "password": os.getenv("DJANGO_EMAIL_HOST_PASSWORD", ""),
            },
        }
    }
else:
    MAILERS = {
        "default": {"BACKEND": "django.core.mail.backends.console.EmailBackend"}
    }


# Django REST Framework
# https://www.django-rest-framework.org/api-guide/settings/

REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}


# CORS — the Next.js dev server runs on a different origin than Django.
# https://github.com/adamchainz/django-cors-headers

CORS_ALLOWED_ORIGINS = env_list(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000",
)
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS
AUTH_USER_MODEL = "api.User"

DEFAULT_FROM_EMAIL = os.getenv(
    "DJANGO_DEFAULT_FROM_EMAIL",
    "Magnum Opus Consultants <careers@moc-pty.com>",
)
