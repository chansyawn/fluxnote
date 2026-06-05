import { Switch } from "@fluxnotes/ui/components/switch";
import { ListOrderedIcon } from "@fluxnotes/ui/icons/lucide";
import { Trans } from "@lingui/react/macro";
import { useMarkdownCodeBlockPreference } from "@renderer/features/preferences/preferences-query";
import {
  PreferencesGroup,
  PreferencesRow,
  PreferencesSection,
} from "@renderer/routes/preferences/-features/preferences-list";

export function MarkdownPreferencesSection() {
  const { codeBlock, patchCodeBlock } = useMarkdownCodeBlockPreference();

  return (
    <PreferencesSection title={<Trans id="preferences.markdown.title">Markdown</Trans>}>
      <PreferencesGroup>
        <PreferencesRow
          control={
            <Switch
              checked={codeBlock.showLineNumbers}
              onCheckedChange={(checked) => {
                patchCodeBlock({ showLineNumbers: checked });
              }}
            />
          }
          icon={<ListOrderedIcon />}
          label={
            <Trans id="preferences.markdown.code-block.line-numbers.label">Show line numbers</Trans>
          }
        />
      </PreferencesGroup>
    </PreferencesSection>
  );
}
