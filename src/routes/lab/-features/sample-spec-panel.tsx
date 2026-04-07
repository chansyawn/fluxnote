import { Trans } from "@lingui/react/macro";

export function SampleSpecPanel() {
  return (
    <section className="border-border/70 bg-card rounded-xl border p-4">
      <h2 className="text-sm font-semibold">
        <Trans id="sample.spec.title">Practices Demonstrated on This Page</Trans>
      </h2>
      <ul className="text-muted-foreground mt-3 list-disc space-y-1 pl-5 text-xs">
        <li>
          <Trans id="sample.spec.layering">
            Layering: route component calls `src/clients`, which uses `@/app/invoke`.
          </Trans>
        </li>
        <li>
          <Trans id="sample.spec.query">
            Data flow: TanStack Query handles request lifecycle and cache key changes.
          </Trans>
        </li>
        <li>
          <Trans id="sample.spec.i18n">
            Internationalization: all user-facing strings use stable Lingui explicit IDs.
          </Trans>
        </li>
        <li>
          <Trans id="sample.spec.error">
            Error semantics: backend returns `BUSINESS.*` or `INTERNAL` with structured details.
          </Trans>
        </li>
      </ul>
    </section>
  );
}
