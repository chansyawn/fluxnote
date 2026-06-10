import { HoverCard, HoverCardContent, HoverCardTrigger } from "@fluxnotes/ui/components/hover-card";
import { GlobeIcon, LaptopIcon, SquareTerminalIcon } from "@fluxnotes/ui/icons/lucide";
import { cn } from "@fluxnotes/ui/lib/utils";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { fetchUrlFavicon } from "@renderer/clients";
import type { ExternalEditTrigger } from "@shared/features/external-edit/models";
import { useQuery } from "@tanstack/react-query";
import type { ComponentProps, ReactNode } from "react";

import { AdornmentBar } from "./adornment-bar";

interface ExternalEditMetadataCardProps extends Pick<ComponentProps<"div">, "className"> {
  trigger: ExternalEditTrigger;
}

function getFileName(filePath: string): string {
  const normalizedPath = filePath.replaceAll("\\", "/");
  return normalizedPath.split("/").filter(Boolean).at(-1) ?? filePath;
}

function getUrlHost(url: string): string {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

function ImageIcon({ src }: { src: string }) {
  return <img alt="" aria-hidden="true" className="size-3 shrink-0 rounded-xs" src={src} />;
}

function BrowserFaviconIcon({ url }: { url: string | null }) {
  const { data } = useQuery({
    enabled: url !== null,
    queryFn: () => fetchUrlFavicon(url ?? ""),
    queryKey: ["url-favicon", url],
    staleTime: Number.POSITIVE_INFINITY,
  });

  return data?.faviconDataUrl ? (
    <ImageIcon src={data.faviconDataUrl} />
  ) : (
    <GlobeIcon aria-hidden="true" className="size-3 shrink-0" />
  );
}

function ExternalEditSourceIcon({ trigger }: { trigger: ExternalEditTrigger }) {
  switch (trigger.source) {
    case "cli":
      return <SquareTerminalIcon aria-hidden="true" className="size-3 shrink-0" />;
    case "focused_app":
      return trigger.appIcon ? (
        <ImageIcon src={trigger.appIcon} />
      ) : (
        <LaptopIcon aria-hidden="true" className="size-3 shrink-0" />
      );
    case "browser":
      return <BrowserFaviconIcon url={trigger.url} />;
  }
}

function ExternalEditSourceLabel({ source }: { source: ExternalEditTrigger["source"] }) {
  switch (source) {
    case "cli":
      return <Trans id="workspace.external-edit.metadata.source.cli">Command line</Trans>;
    case "focused_app":
      return <Trans id="workspace.external-edit.metadata.source.mac-accessibility">Mac App</Trans>;
    case "browser":
      return <Trans id="workspace.external-edit.metadata.source.browser">Browser</Trans>;
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
  const unknownApplicationLabel = i18n._({
    id: "workspace.external-edit.metadata.unknown-application",
    message: "Unknown application",
  });

  const appLabel =
    trigger.source === "cli"
      ? undefined
      : (trigger.appName ?? trigger.appBundleId ?? unknownApplicationLabel);
  const { label, title } = resolveHeadline(trigger, appLabel ?? unknownApplicationLabel);

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
        <ExternalEditSourceIcon trigger={trigger} />
        <span className="truncate">{label}</span>
      </AdornmentBar>
      <HoverCardContent align="start" className="w-[min(24rem,calc(100vw-2rem))]" side="bottom">
        <dl className="grid grid-cols-[fit-content(9rem)_minmax(0,1fr)] gap-x-3 gap-y-2">
          <ExternalEditMetadataItem
            label={<Trans id="workspace.external-edit.metadata.source">Source</Trans>}
            value={<ExternalEditSourceLabel source={trigger.source} />}
          />
          {trigger.source === "cli" && (
            <>
              {trigger.git && (
                <>
                  <ExternalEditMetadataItem
                    label={
                      <Trans id="workspace.external-edit.metadata.repository">Repository</Trans>
                    }
                    value={trigger.git.root}
                  />
                  {trigger.git.branch && (
                    <ExternalEditMetadataItem
                      label={<Trans id="workspace.external-edit.metadata.branch">Branch</Trans>}
                      value={trigger.git.branch}
                    />
                  )}
                </>
              )}
              <ExternalEditMetadataItem
                label={<Trans id="workspace.external-edit.metadata.cwd">Working directory</Trans>}
                value={trigger.cwd}
              />
              <ExternalEditMetadataItem
                label={<Trans id="workspace.external-edit.metadata.file">Target file</Trans>}
                value={trigger.targetFilePath}
              />
            </>
          )}
          {trigger.source === "focused_app" && (
            <ExternalEditMetadataItem
              label={<Trans id="workspace.external-edit.metadata.app">Application</Trans>}
              value={appLabel ?? unknownApplicationLabel}
            />
          )}
          {trigger.source === "browser" && (
            <>
              <ExternalEditMetadataItem
                label={<Trans id="workspace.external-edit.metadata.app">Application</Trans>}
                value={appLabel ?? unknownApplicationLabel}
              />
              {trigger.title && (
                <ExternalEditMetadataItem
                  label={<Trans id="workspace.external-edit.metadata.title">Title</Trans>}
                  value={trigger.title}
                />
              )}
              {trigger.url && (
                <ExternalEditMetadataItem
                  label={<Trans id="workspace.external-edit.metadata.url">URL</Trans>}
                  value={trigger.url}
                />
              )}
            </>
          )}
        </dl>
      </HoverCardContent>
    </HoverCard>
  );
}

function resolveHeadline(
  trigger: ExternalEditTrigger,
  appLabel: string,
): { label: string; title: string } {
  switch (trigger.source) {
    case "cli": {
      if (trigger.git) {
        const repository = getFileName(trigger.git.root);
        const label = trigger.git.branch ? `${repository} ⎇ ${trigger.git.branch}` : repository;
        return { label, title: trigger.git.root };
      }
      return { label: getFileName(trigger.targetFilePath), title: trigger.targetFilePath };
    }
    case "focused_app":
      return { label: appLabel, title: appLabel };
    case "browser": {
      const label = trigger.title ?? (trigger.url ? getUrlHost(trigger.url) : appLabel);
      return { label, title: trigger.url ?? label };
    }
  }
}
