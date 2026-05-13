import { Trans } from "@lingui/react/macro";
import { useMarkdownCodeBlockPreference } from "@renderer/features/preferences/preferences-query";
import {
  SettingsGroup,
  SettingsRow,
  SettingsSection,
} from "@renderer/routes/preferences/-features/settings-list";
import { Switch } from "@renderer/ui/components/switch";
import { ListOrderedIcon, WrapTextIcon } from "lucide-react";

export function MarkdownSettingsSection() {
  const { codeBlock, patchCodeBlock } = useMarkdownCodeBlockPreference();

  return (
    <SettingsSection title={<Trans id="preferences.markdown.title">Markdown</Trans>}>
      <SettingsGroup>
        <SettingsRow
          control={
            <Switch
              checked={codeBlock.showLineNumbers}
              onCheckedChange={(checked) => {
                patchCodeBlock({ showLineNumbers: checked });
              }}
            />
          }
          description={
            <Trans id="preferences.markdown.code-block.line-numbers.description">
              Show a gutter with logical line numbers in fenced code blocks.
            </Trans>
          }
          icon={ListOrderedIcon}
          label={
            <Trans id="preferences.markdown.code-block.line-numbers.label">Show line numbers</Trans>
          }
        />
        <SettingsRow
          control={
            <Switch
              checked={codeBlock.wordWrap}
              onCheckedChange={(checked) => {
                patchCodeBlock({ wordWrap: checked });
              }}
            />
          }
          description={
            <Trans id="preferences.markdown.code-block.word-wrap.description">
              Wrap long code lines to the editor width instead of scrolling horizontally.
            </Trans>
          }
          icon={WrapTextIcon}
          label={<Trans id="preferences.markdown.code-block.word-wrap.label">Word wrap</Trans>}
        />
      </SettingsGroup>
    </SettingsSection>
  );
}
