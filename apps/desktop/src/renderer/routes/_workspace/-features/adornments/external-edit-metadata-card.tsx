import { HoverCard, HoverCardContent, HoverCardTrigger } from "@fluxnotes/ui/components/hover-card";
import { LaptopIcon, SquareTerminalIcon } from "@fluxnotes/ui/icons/lucide";
import { cn } from "@fluxnotes/ui/lib/utils";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import type { ExternalEditTrigger } from "@shared/features/external-edit/session-contracts";
import type { ComponentProps, ReactNode } from "react";

import { AdornmentBar } from "./adornment-bar";

interface ExternalEditMetadataCardProps extends Pick<ComponentProps<"div">, "className"> {
  trigger: ExternalEditTrigger;
}

function getFileName(filePath: string): string {
  const normalizedPath = filePath.replaceAll("\\", "/");
  return normalizedPath.split("/").filter(Boolean).at(-1) ?? filePath;
}

function ExternalEditSourceIcon({ source }: { source: ExternalEditTrigger["source"] }) {
  switch (source) {
    case "cli":
      return <SquareTerminalIcon aria-hidden="true" className="size-3 shrink-0" />;
    case "mac_accessibility":
      return <LaptopIcon aria-hidden="true" className="size-3 shrink-0" />;
  }
}

function ExternalEditSourceLabel({ source }: { source: ExternalEditTrigger["source"] }) {
  switch (source) {
    case "cli":
      return <Trans id="workspace.external-edit.metadata.source.cli">Command line</Trans>;
    case "mac_accessibility":
      return (
        <Trans id="workspace.external-edit.metadata.source.mac-accessibility">macOS input</Trans>
      );
  }
}

function ExternalEditMetadataItem({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground min-w-0 text-end wrap-break-word hyphens-auto">
        {label}
      </dt>
      <dd className="min-w-0 font-mono break-all">{value}</dd>
    </>
  );
}

export function ExternalEditMetadataCard({ className, trigger }: ExternalEditMetadataCardProps) {
  const { i18n } = useLingui();
  const macInputLabel = i18n._({
    id: "workspace.external-edit.metadata.mac-input",
    message: "macOS input",
  });
  const unknownApplicationLabel = i18n._({
    id: "workspace.external-edit.metadata.unknown-application",
    message: "Unknown application",
  });
  const title =
    trigger.source === "cli"
      ? trigger.targetFilePath
      : (trigger.appName ?? trigger.appBundleId ?? macInputLabel);
  const label = trigger.source === "cli" ? getFileName(trigger.targetFilePath) : title;

  return (
    <HoverCard>
      <AdornmentBar
        render={<HoverCardTrigger delay={100} closeDelay={150} />}
        className={cn(
          "text-muted-foreground flex max-w-full min-w-0 items-center gap-1.5 px-2 font-mono text-xs outline-hidden",
          className,
        )}
        title={title}
      >
        <ExternalEditSourceIcon source={trigger.source} />
        <span className="truncate">{label}</span>
      </AdornmentBar>
      <HoverCardContent align="start" className="w-[min(24rem,calc(100vw-2rem))]" side="bottom">
        <dl className="grid grid-cols-[fit-content(9rem)_minmax(0,1fr)] gap-x-3 gap-y-2">
          <ExternalEditMetadataItem
            label={<Trans id="workspace.external-edit.metadata.source">Source</Trans>}
            value={<ExternalEditSourceLabel source={trigger.source} />}
          />
          {trigger.source === "cli" ? (
            <>
              <ExternalEditMetadataItem
                label={<Trans id="workspace.external-edit.metadata.cwd">Working directory</Trans>}
                value={trigger.cwd}
              />
              <ExternalEditMetadataItem
                label={<Trans id="workspace.external-edit.metadata.file">Target file</Trans>}
                value={trigger.targetFilePath}
              />
            </>
          ) : (
            <>
              <ExternalEditMetadataItem
                label={<Trans id="workspace.external-edit.metadata.app">Application</Trans>}
                value={trigger.appName ?? trigger.appBundleId ?? unknownApplicationLabel}
              />
            </>
          )}
        </dl>
      </HoverCardContent>
    </HoverCard>
  );
}
