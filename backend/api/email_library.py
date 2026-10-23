"""The Client's automated email library — 13 templates, as supplied.

The wording is the Client's and is reproduced as written. It lives here as
data rather than in a migration so the seed can be re-run when the library
is revised, and so a hiring manager editing an email in the portal is
editing a row that started from this text rather than from something a
developer paraphrased.

Placeholders use the portal's own ``{name}`` form rather than the library's
``{{name}}``: ``automatic_mail.render`` reads single braces, and converting
once here is better than teaching the renderer a second syntax.

Where a template's trigger fires for more than one situation — account
created by password or by Google, an application moving to one status or
another — ``conditions`` narrows it, so each email goes out for its own
case only.
"""

from .models import EmailTrigger

# event, label, trigger, conditions, subject, preheader, body
LIBRARY: list[dict] = [
    # --- Account and access ---------------------------------------------
    {
        "event": "welcome_verify_email",
        "label": "01 | Welcome / Verify email address",
        "trigger": EmailTrigger.ACCOUNT_CREATED,
        "conditions": {"provider": "password"},
        "subject": "You're in! One quick thing before we get started",
        "preheader": "Welcome to MOC. Let's get your account verified and ready to go.",
        "body": """Hi {preferred_name},

Welcome to MOC! Good to have you here.

You've just taken the first step towards connecting with international employers looking for South African professionals like you.

Before you start exploring, there's one small thing to take care of.

Verify your email address using the button below.

[Verify My Email]({verify_url})

Once that's done, you can build your professional profile, explore available roles and apply for positions that suit your experience and career goals.

And here's something worth knowing about us: MOC isn't just a recruitment platform. When you're successfully placed, we become your South African employer, with a team here to support you.

We're looking forward to getting to know you.

See you inside!""",
    },
    {
        "event": "verification_link_resend",
        "label": "02 | Verification link resend",
        "trigger": EmailTrigger.EMAIL_VERIFICATION_RESENT,
        "conditions": {},
        "subject": "Fresh link, coming right up",
        "preheader": "Here's your new email verification link.",
        "body": """Hi {preferred_name},

Need another verification link? No problem.

We've generated a fresh one for you.

Click below to verify your email address and activate your account.

[Verify My Email]({verify_url})

If you didn't request this, you can safely ignore this email.

Having trouble getting in? Just reply here and we'll help you out.""",
    },
    {
        "event": "welcome_social_signup",
        "label": "03 | Welcome / Google or LinkedIn sign-up",
        "trigger": EmailTrigger.ACCOUNT_CREATED,
        "conditions": {"provider": "social"},
        "subject": "Welcome to MOC. You're officially in!",
        "preheader": "Your account is ready. Time to put your experience to work.",
        "body": """Hi {preferred_name},

Well, look who's here. Welcome to MOC!

You've successfully signed up using {provider_label}, which means your account is already verified and ready to go. No extra steps needed.

Now comes the good part.

Your MOC profile is your introduction to international employers. The more we know about your skills, experience and career goals, the better we can match you with relevant roles.

Start building your profile, have a look around and see what's out there.

[Complete My Profile]({profile_url})

One thing to know about us: we're not a job board that disappears once you've been hired. If you're successfully placed, MOC becomes your South African employer, providing the employment structure and ongoing support behind your role.

A new chapter might start with something as simple as a completed profile.

We're glad you're here.""",
    },
    {
        "event": "password_reset_request",
        "label": "04 | Password reset request",
        "trigger": EmailTrigger.PASSWORD_RESET_REQUESTED,
        "conditions": {},
        "subject": "Let's get you back into your account",
        "preheader": "Reset your password using this link. It expires in one hour.",
        "body": """Hi {preferred_name},

Forgotten your password? Happens to the best of us.

Click below to create a new one.

[Reset My Password]({reset_url})

This link expires in 1 hour.

If you didn't request a password reset, you can ignore this email. Your current password will remain unchanged.

Need a hand? Reply to this email and we'll help.""",
    },
    {
        "event": "password_changed",
        "label": "05 | Password changed confirmation",
        "trigger": EmailTrigger.PASSWORD_CHANGED,
        "conditions": {},
        "subject": "Your password has been updated",
        "preheader": "A quick confirmation that your MOC account password has changed.",
        "body": """Hi {preferred_name},

Just confirming that your MOC account password was successfully changed on {date}.

You're all set to sign in using your new password.

[Sign In]({signin_url})

Didn't make this change?

Please reply to this email immediately so our team can assist you with securing your account.""",
    },
    {
        "event": "account_deleted",
        "label": "06 | Account deleted",
        "trigger": EmailTrigger.ACCOUNT_DELETED,
        "conditions": {},
        "subject": "Your MOC account has been deleted",
        "preheader": "Your portal account has been removed. Here's what happens to your information.",
        "body": """Hi {preferred_name},

Your MOC Candidate Portal account has been successfully deleted.

You can no longer sign in or access the profile associated with this account.

Here's something important about your personal information.

Although your portal account has been deleted, MOC retains your candidate details so that we can contact you about future employment opportunities that may suit your experience.

If you would prefer that we remove your personal information entirely, simply reply to this email and request full removal. Our team will assist you with the process, subject to any information we are legally required to retain.

Thank you for spending some time with us.

We wish you all the best with whatever comes next.""",
    },
    # --- Profile progress ------------------------------------------------
    {
        "event": "profile_incomplete",
        "label": "07 | Finish your profile",
        "trigger": EmailTrigger.PROFILE_INCOMPLETE,
        "conditions": {},
        "subject": "You've started something. Let's finish it.",
        "preheader": "Your profile is {profile_percentage}% complete. A few more details could make a difference.",
        "body": """Hi {preferred_name},

You've made a start on your MOC profile, but there's still a little more to tell us.

Right now, you're sitting at {profile_percentage}% complete, and your profile status is {profile_status}.

Here's why that matters.

Our matching engine uses the information in your profile to identify roles that fit your skills, qualifications and experience.

It can only match you based on what you've filled in.

So, if something important is missing, like your work history, technical skills or qualifications, you could be missing out on relevant matches.

The good news? You don't need to start over. Just pick up where you left off.

Here's what still needs your attention:

{missing_sections}

[Finish My Profile]({profile_url})

Think of your profile as your professional introduction. You want it to give the full picture, not just the highlights.

And once you reach 80% completion, there's a little extra waiting for you: a free, professionally formatted MOC CV generated using your profile details.

You're already on your way. Let's get the rest in place.""",
    },
    {
        "event": "profile_cv_unlocked",
        "label": "08 | Profile passed 80% / CV unlocked",
        "trigger": EmailTrigger.PROFILE_CV_UNLOCKED,
        "conditions": {},
        "subject": "Look at that. You've unlocked your free CV!",
        "preheader": "Your profile has passed 80%. Your MOC-branded CV is ready to download.",
        "body": """Hi {preferred_name},

Now we're talking!

Your MOC profile has just reached {profile_percentage}% completion, and that means you've unlocked something useful.

Your very own MOC-branded CV. On us.

We've made it easy to turn the information in your profile into a professionally formatted CV, without the headache of starting from a blank document.

No copying and pasting your entire career history into another template. Just your information, presented neatly and ready to download.

[Download My Free CV]({cv_url})

And there's another benefit to getting this far.

Your more complete profile gives our matching engine a much clearer picture of your experience, helping it identify relevant opportunities.

Of course, 80% doesn't have to be the finish line. You can always keep improving your profile as your experience grows.

Nice work getting this far. We hope the CV comes in handy!""",
    },
    # --- Applications ----------------------------------------------------
    {
        "event": "application_received",
        "label": "09 | Application submitted",
        "trigger": EmailTrigger.APPLICATION_RECEIVED,
        "conditions": {},
        "subject": "Application received: {job_title}",
        "preheader": "Your application is in. Here's what happens next.",
        "body": """Hi {preferred_name},

And just like that, your application is in!

We've successfully received your application for {job_title}.

You can officially cross "submit application" off your to-do list.

Your application details

Position: {job_title}
Reference: {job_reference}

So, what happens now?

Our recruitment team will review your application against the requirements of the role.

If your experience and qualifications align with what the employer is looking for, we'll be in touch about the next step.

You can also keep an eye on your application status through the MOC Candidate Portal.

[View My Application]({application_url})

We know how frustrating it can be to send an application into the world and wonder where it went. That's why we'll keep you informed when there's a change to your application status.

For now, you've done your part.

Thanks for putting your name forward. We appreciate the time and effort that goes into every application.""",
    },
    {
        "event": "application_shortlisted",
        "label": "10 | Application shortlisted",
        "trigger": EmailTrigger.APPLICATION_STATUS_CHANGED,
        "conditions": {"status": "shortlisted"},
        "subject": "Good news, {preferred_name}. You've been shortlisted!",
        "preheader": "Your application for {job_title} has made it to the next stage.",
        "body": """Hi {preferred_name},

We've got some good news for you.

You've been shortlisted for {job_title}!

Your application has made it through the initial review, and your experience has stood out as a potential match for the role.

That's a good step forward, and one worth recognising.

Here's where things stand:

Position: {job_title}
Reference: {job_reference}
Status: Shortlisted

What happens next?

Your application will move through the next stage of the recruitment process. This may involve a more detailed review or an invitation to interview.

There's nothing you need to do right now. We'll contact you when there's an update or when we need anything further.

[View My Application]({application_url})

We know job searching can feel like a lot of waiting, so we're glad we get to share a positive update with you today.

Well done on making it this far. We're rooting for you!""",
    },
    {
        "event": "application_interview",
        "label": "11 | Interview invitation",
        "trigger": EmailTrigger.APPLICATION_STATUS_CHANGED,
        "conditions": {"status": "interview"},
        "subject": "Interview invitation: {job_title}",
        "preheader": "The employer would like to meet you. Let's find a time that works.",
        "body": """Hi {preferred_name},

We have some good news to share.

The employer has reviewed your application for {job_title} and would like to meet you for an interview.

It's a positive next step, and an opportunity for both sides to get to know each other a little better.

Let's get a time in the diary.

Could you please reply to this email with 2 to 3 dates and times that would suit you for an interview?

As this role involves an international employer, we'll coordinate across time zones and confirm the final interview time in South African Standard Time (SAST) as well, so there's no confusion.

For reference, the role's working arrangements are:

Working hours: {working_hours}
Employer time zone: {employer_timezone}
Work setup: {work_setup}

A quick word before your interview

You don't need to have a perfectly rehearsed answer to every possible question.

Be prepared to talk about the work you've done, the decisions you've made and the experience you'd bring to the role. Specific examples are often far more useful than polished speeches.

And remember, this is your opportunity to learn about the employer too.

Once we've received your availability, we'll coordinate the arrangements and share the confirmed details with you.

We look forward to helping you take the next step.""",
    },
    {
        "event": "application_unsuccessful",
        "label": "12 | Application not successful",
        "trigger": EmailTrigger.APPLICATION_STATUS_CHANGED,
        # "Regardless of reason or recruitment stage", per the library — so
        # every status that ends an application without an offer, not one.
        "conditions": {"status": ["rejected", "job_closed"]},
        "subject": "An update on your application for {job_title}",
        "preheader": "We wanted to let you know the outcome of your application.",
        "body": """Hi {preferred_name},

Thank you for the time and effort you've put into your application for {job_title}.

We wanted to let you know that your application will not be moving forward.

We understand this may be disappointing news, particularly when you've invested time in the process.

Recruitment decisions can involve several factors, including the requirements of the role, the employer's circumstances and changes to their hiring plans. This outcome is not necessarily a reflection of your abilities or professional experience.

We also know that an application represents more than a CV. There's thought, preparation and hope behind it, and we don't take that lightly.

Your MOC profile will remain active, and you can continue to explore and apply for other available positions.

If you have any questions about this update, you're welcome to reply to this email.

Thank you again for considering this opportunity and for allowing us to get to know you through the process.""",
    },
    # --- Job alerts -------------------------------------------------------
    {
        "event": "new_job_published",
        "label": "13 | New matching role published",
        "trigger": EmailTrigger.NEW_JOB_PUBLISHED,
        "conditions": {},
        "subject": "{preferred_name}, this role looks like your kind of thing",
        "preheader": "A new {job_title} position matches your profile. Come have a look.",
        "body": """Hi {preferred_name},

Something new just landed on the MOC Candidate Portal, and we thought of you.

We've found a newly published role that matches information in your professional profile.

The role: {job_title}

Here's a quick look at the details:

Position: {job_title}
Reference: {job_reference}
Employment type: {employment_type}
Work setup: {work_setup}
Working hours: {working_hours}
Employer time zone: {employer_timezone}
Applications close: {closing_date}

Why are you receiving this?

Our matching engine identified a connection between this position and the skills, qualifications or experience listed in your MOC profile.

It doesn't mean every requirement will necessarily be a perfect match, but we think it's worth a closer look.

[Explore This Role]({job_url})

See something you like? Read through the full requirements and apply if it feels right for you.

And if this one isn't quite your thing, no stress. Keeping your profile up to date helps us identify other roles that may be a better fit.

Here's to finding work worth doing!""",
    },
]
