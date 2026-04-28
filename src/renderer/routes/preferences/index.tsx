import { Trans } from "@lingui/react/macro";
import { AppSettingsSection } from "@renderer/routes/preferences/-features/app-settings-section";
import { AutoArchiveSettingsSection } from "@renderer/routes/preferences/-features/auto-archive-settings-section";
import { ShortcutSettingsSection } from "@renderer/routes/preferences/-features/shortcut-settings";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/preferences/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-2 py-3 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">
          <Trans id="preferences.title">Preferences</Trans>
        </h1>
        <p className="text-muted-foreground text-xs">
          <Trans id="preferences.description">
            Configure language, auto-archive, and shortcuts.
          </Trans>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <AppSettingsSection />
        <AutoArchiveSettingsSection />
        <ShortcutSettingsSection />
      </div>
    </section>
  );
}
