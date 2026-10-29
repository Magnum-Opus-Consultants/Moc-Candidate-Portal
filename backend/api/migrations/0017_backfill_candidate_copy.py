"""Fill the candidate-facing job copy for rows written before it existed.

The design system puts a hard rule on every candidate-facing job component:
never name or reveal the hiring company. The seeded descriptions all name it
outright ("... at Protea Analytics, a data and analytics company in
Johannesburg"), so this writes the anonymised version into the new fields
once rather than deriving it on every request.

Reversible by clearing the two fields: the manager-facing originals are
untouched, so nothing is lost.
"""

from django.db import migrations

from api.models import anonymise


def fill(apps, schema_editor):
    Job = apps.get_model("api", "Job")

    batch = []
    for job in Job.objects.only(
        "id", "company", "description", "about_company",
        "candidate_description", "candidate_about_company",
    ).iterator(chunk_size=500):
        description = job.candidate_description or anonymise(
            job.description, job.company
        )
        about = job.candidate_about_company or anonymise(
            job.about_company, job.company
        )
        if (
            description != job.candidate_description
            or about != job.candidate_about_company
        ):
            job.candidate_description = description
            job.candidate_about_company = about
            batch.append(job)

        if len(batch) >= 500:
            Job.objects.bulk_update(
                batch, ["candidate_description", "candidate_about_company"]
            )
            batch = []

    if batch:
        Job.objects.bulk_update(
            batch, ["candidate_description", "candidate_about_company"]
        )


def clear(apps, schema_editor):
    Job = apps.get_model("api", "Job")
    Job.objects.update(candidate_description="", candidate_about_company="")


class Migration(migrations.Migration):
    dependencies = [("api", "0016_job_candidate_about_company_and_more")]

    operations = [migrations.RunPython(fill, clear)]
