import { eslintCompatPlugin } from "@oxlint/plugins";
import type { ESTree } from "@oxlint/plugins";

function isRestrictedVitestSpecifier(specifier: string): boolean {
  return specifier === "vitest" || specifier === "@vitest" || specifier.startsWith("@vitest/");
}

function getReplacement(specifier: string): string {
  if (specifier === "vitest") {
    return "vite-plus/test";
  }

  if (specifier === "@vitest") {
    return "vite-plus/test";
  }

  if (specifier.startsWith("@vitest/")) {
    return specifier.replace(/^@vitest\//, "vite-plus/test/");
  }

  return "vite-plus/test";
}

function getMessage(specifier: string): string {
  return `Do not import from '${specifier}' directly. Import from '${getReplacement(specifier)}' instead.`;
}

export default eslintCompatPlugin({
  meta: { name: "fluxnote" },
  rules: {
    "no-vitest-import": {
      meta: {
        type: "problem",
        docs: {
          description: "Require test utilities to be imported from Vite+ entrypoints.",
          recommended: true,
        },
      },
      createOnce(context) {
        function reportRestrictedImport(node: ESTree.Node, specifier: string): void {
          if (!isRestrictedVitestSpecifier(specifier)) {
            return;
          }

          context.report({
            node,
            message: getMessage(specifier),
          });
        }

        return {
          ExportAllDeclaration(node) {
            reportRestrictedImport(node.source, node.source.value);
          },
          ExportNamedDeclaration(node) {
            if (node.source === null) {
              return;
            }

            reportRestrictedImport(node.source, node.source.value);
          },
          ImportDeclaration(node) {
            reportRestrictedImport(node.source, node.source.value);
          },
          ImportExpression(node) {
            const source = node.source;

            if (source.type !== "Literal" || typeof source.value !== "string") {
              return;
            }

            reportRestrictedImport(source, source.value);
          },
        };
      },
    },
  },
});
