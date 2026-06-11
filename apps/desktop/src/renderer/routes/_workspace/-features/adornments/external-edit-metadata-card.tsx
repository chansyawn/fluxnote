import { HoverCard, HoverCardContent, HoverCardTrigger } from "@fluxnotes/ui/components/hover-card";
import {
  GitBranchIcon,
  GlobeIcon,
  LaptopIcon,
  SquareTerminalIcon,
} from "@fluxnotes/ui/icons/lucide";
import { cn } from "@fluxnotes/ui/lib/utils";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { fetchUrlFavicon } from "@renderer/clients";
import type { ExternalEditOrigin } from "@shared/features/external-edit/models";
import { useQuery } from "@tanstack/react-query";
import type { ComponentProps, ReactNode } from "react";

import { AdornmentBar } from "./adornment-bar";

interface ExternalEditMetadataCardProps extends Pick<ComponentProps<"div">, "className"> {
  origin: ExternalEditOrigin;
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

function ExternalEditSourceLabel({ kind }: { kind: ExternalEditOrigin["kind"] }) {
  switch (kind) {
    case "cli":
      return <Trans id="workspace.external-edit.metadata.source.cli">Command line</Trans>;
    case "macApp":
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
      <dd className="min-w-0 break-all">{value}</dd>
    </>
  );
}

export function ExternalEditMetadataCard({ className, origin }: ExternalEditMetadataCardProps) {
  const { i18n } = useLingui();
  const unknownApplicationLabel = i18n._({
    id: "workspace.external-edit.metadata.unknown-application",
    message: "Unknown application",
  });

  const appLabel =
    origin.kind === "cli"
      ? undefined
      : (origin.app.name ?? origin.app.bundleId ?? unknownApplicationLabel);
  const { icon, label, title } = resolveHeadline(origin, appLabel ?? unknownApplicationLabel);

  return (
    <HoverCard>
      <AdornmentBar
        render={<HoverCardTrigger delay={100} closeDelay={150} />}
        className={cn(
          "text-muted-foreground flex max-w-full min-w-0 items-center gap-1.5 px-2 text-xs outline-hidden",
          className,
        )}
        title={title}
      >
        {icon}
        <span className="truncate">{label}</span>
      </AdornmentBar>
      <HoverCardContent align="start" side="bottom">
        <dl className="grid grid-cols-[fit-content(9rem)_minmax(0,1fr)] gap-x-2 gap-y-1">
          <ExternalEditMetadataItem
            label={<Trans id="workspace.external-edit.metadata.source">Source</Trans>}
            value={<ExternalEditSourceLabel kind={origin.kind} />}
          />
          {origin.kind === "cli" && (
            <>
              {origin.git && (
                <>
                  <ExternalEditMetadataItem
                    label={
                      <Trans id="workspace.external-edit.metadata.repository">Repository</Trans>
                    }
                    value={origin.git.root}
                  />
                  {origin.git.branch && (
                    <ExternalEditMetadataItem
                      label={<Trans id="workspace.external-edit.metadata.branch">Branch</Trans>}
                      value={origin.git.branch}
                    />
                  )}
                </>
              )}
              <ExternalEditMetadataItem
                label={<Trans id="workspace.external-edit.metadata.cwd">Working directory</Trans>}
                value={origin.cwd}
              />
              <ExternalEditMetadataItem
                label={<Trans id="workspace.external-edit.metadata.file">Target file</Trans>}
                value={origin.targetFilePath}
              />
            </>
          )}
          {origin.kind === "macApp" && (
            <ExternalEditMetadataItem
              label={<Trans id="workspace.external-edit.metadata.app">Application</Trans>}
              value={appLabel ?? unknownApplicationLabel}
            />
          )}
          {origin.kind === "browser" && (
            <>
              <ExternalEditMetadataItem
                label={<Trans id="workspace.external-edit.metadata.app">Application</Trans>}
                value={appLabel ?? unknownApplicationLabel}
              />
              {origin.page.title && (
                <ExternalEditMetadataItem
                  label={<Trans id="workspace.external-edit.metadata.title">Title</Trans>}
                  value={origin.page.title}
                />
              )}
              {origin.page.url && (
                <ExternalEditMetadataItem
                  label={<Trans id="workspace.external-edit.metadata.url">URL</Trans>}
                  value={origin.page.url}
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
  origin: ExternalEditOrigin,
  appLabel: string,
): { icon: ReactNode; label: ReactNode; title: string } {
  switch (origin.kind) {
    case "cli": {
      if (origin.git) {
        const repository = getFileName(origin.git.root);
        const label = origin.git.branch ? (
          <span className="flex items-center gap-1">
            {repository} <GitBranchIcon className="inline size-3 shrink-0" /> {origin.git.branch}
          </span>
        ) : (
          repository
        );
        return {
          icon: <SquareTerminalIcon className="size-3 shrink-0" />,
          label,
          title: origin.git.root,
        };
      }
      return {
        icon: <SquareTerminalIcon aria-hidden="true" className="size-3 shrink-0" />,
        label: getFileName(origin.targetFilePath),
        title: origin.targetFilePath,
      };
    }
    case "macApp":
      return {
        icon: origin.app.icon ? (
          <ImageIcon src={origin.app.icon} />
        ) : (
          <LaptopIcon aria-hidden="true" className="size-3 shrink-0" />
        ),
        label: appLabel,
        title: appLabel,
      };
    case "browser": {
      const label = origin.page.title ?? (origin.page.url ? getUrlHost(origin.page.url) : appLabel);
      return {
        icon: <BrowserFaviconIcon url={origin.page.url} />,
        label,
        title: origin.page.url ?? label,
      };
    }
  }
}
