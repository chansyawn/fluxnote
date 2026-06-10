import { Trans } from "@lingui/react/macro";
import { AboutPreferencesSection } from "@renderer/routes/preferences/-features/about-preferences-section";
import { AppPreferencesSection } from "@renderer/routes/preferences/-features/app-preferences-section";
import { AutoArchivePreferencesSection } from "@renderer/routes/preferences/-features/auto-archive-preferences-section";
import { ExternalEditPreferencesSection } from "@renderer/routes/preferences/-features/external-edit-preferences-section";
import { MarkdownPreferencesSection } from "@renderer/routes/preferences/-features/markdown-preferences-section";
import { ShortcutPreferencesSection } from "@renderer/routes/preferences/-features/shortcut-preferences";
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
      </div>

      <div className="flex flex-col gap-2">
        <AppPreferencesSection />
        <ExternalEditPreferencesSection />
        <MarkdownPreferencesSection />
        <AutoArchivePreferencesSection />
        <ShortcutPreferencesSection />
        <AboutPreferencesSection />
      </div>
    </section>
  );
}
