import { Trans } from "@lingui/react/macro";
import { AboutSettingsSection } from "@renderer/routes/preferences/-features/about-settings-section";
import { AppSettingsSection } from "@renderer/routes/preferences/-features/app-settings-section";
import { AutoArchiveSettingsSection } from "@renderer/routes/preferences/-features/auto-archive-settings-section";
import { MarkdownSettingsSection } from "@renderer/routes/preferences/-features/markdown-settings-section";
import { ShortcutSettingsSection } from "@renderer/routes/preferences/-features/shortcut-settings";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/preferences/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-2 py-3 sm:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">
            <Trans id="preferences.title">Preferences</Trans>
          </h1>
        </div>

        <div className="flex flex-col gap-2">
          <AppSettingsSection />
          <MarkdownSettingsSection />
          <AutoArchiveSettingsSection />
          <ShortcutSettingsSection />
          <AboutSettingsSection />
        </div>
      </section>
    </div>
  );
}
