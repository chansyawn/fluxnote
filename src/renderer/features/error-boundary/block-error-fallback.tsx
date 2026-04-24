import { Trans } from "@lingui/react/macro";
import { toErrorMessage } from "@renderer/features/error-boundary/error-utils";
import { Button } from "@renderer/ui/components/button";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@renderer/ui/components/item";
import { AlertTriangleIcon, LoaderCircleIcon, RefreshCwIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import type { FallbackProps } from "react-error-boundary";

interface BlockErrorFallbackProps extends FallbackProps {
  blockId: string;
  onDeleteBlock: (blockId: string) => Promise<void> | void;
}

export function BlockErrorFallback({
  error,
  resetErrorBoundary,
  blockId,
  onDeleteBlock,
}: BlockErrorFallbackProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <Item
      className="bg-card text-card-foreground rounded-xl p-4"
      data-note-block-id={blockId}
      role="status"
      variant="outline"
    >
      <ItemMedia
        className="bg-destructive/15 text-destructive mt-0.5 rounded-lg p-2"
        variant="icon"
      >
        <AlertTriangleIcon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          <Trans id="error.block.title">This block failed to render</Trans>
        </ItemTitle>
        <ItemDescription className="line-clamp-none leading-relaxed">
          <Trans id="error.block.description">
            Retry this block, or delete it if the content is corrupted.
          </Trans>
        </ItemDescription>
        <ItemDescription className="line-clamp-1 font-mono text-[11px] break-all">
          {toErrorMessage(error)}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="ml-auto shrink-0 flex-col items-stretch">
        <Button
          className="gap-1"
          size="sm"
          variant="secondary"
          onClick={() => {
            resetErrorBoundary();
          }}
        >
          <RefreshCwIcon className="size-3" />
          <Trans id="error.block.retry">Retry block</Trans>
        </Button>
        <Button
          className="gap-1"
          disabled={isDeleting}
          size="sm"
          variant="destructive"
          onClick={() => {
            setIsDeleting(true);
            void Promise.resolve(onDeleteBlock(blockId)).finally(() => {
              setIsDeleting(false);
            });
          }}
        >
          {isDeleting ? (
            <LoaderCircleIcon className="size-3 animate-spin" />
          ) : (
            <Trash2Icon className="size-3" />
          )}
          <Trans id="error.block.delete">Delete block</Trans>
        </Button>
      </ItemActions>
    </Item>
  );
}
