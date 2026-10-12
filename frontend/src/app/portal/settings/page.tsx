import { ThemeToggle } from "@/components/theme-toggle";
import { Button, Card, PageHeading, SectionHeading } from "@/components/ui/primitives";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeading
        title="Settings"
        subtext="Your account details, appearance and account removal."
      />

      <section>
        <SectionHeading title="Account" />
        <Card className="divide-y divide-line">
          {[
            { label: "Name", value: "Set on your profile" },
            { label: "Email address", value: "Used to sign in and for notifications" },
            { label: "Password", value: "Last changed when the account was created" },
          ].map((row) => (
            <div
              key={row.label}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div>
                <p className="text-sm font-medium text-ink">{row.label}</p>
                <p className="text-xs text-ink-subtle">{row.value}</p>
              </div>
              <Button variant="outline" size="sm">
                Change
              </Button>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionHeading
          title="Appearance"
          subtext="On a first visit the portal follows your device setting."
        />
        <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <p className="text-sm font-medium text-ink">Theme</p>
            <p className="text-xs text-ink-subtle">
              Light, dark, or match the device.
            </p>
          </div>
          <ThemeToggle />
        </Card>
      </section>

      <section>
        <SectionHeading title="Delete account" />
        <Card className="p-5">
          <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
            Deleting your account removes your access to the portal. As set out
            in the Statement of Work, your information is retained so MOC can
            contact you about future opportunities.
          </p>
          <Button variant="danger" size="sm" className="mt-4">
            Delete my account
          </Button>
        </Card>
      </section>
    </div>
  );
}
