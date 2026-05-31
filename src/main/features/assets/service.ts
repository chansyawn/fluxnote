import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { AppDataPaths } from "@main/core/app-data";
import type { AppDatabase } from "@main/core/database";
import {
  collectImageAssetUrls,
  getImageAssetUrl,
  type ImageUrlNode,
} from "@shared/features/block-editor/asset-urls";
import { businessError } from "@shared/ipc/result";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import { unified } from "unified";
import type { Position } from "unist";

import { assertBlockExists } from "../blocks/service";
import { nodeAssetStorage, type AssetStorage } from "./storage";
import { assetUrlScheme, extFromMimeType, sanitizeFileName, splitAssetUrl } from "./url-utils";

interface AssetServiceOptions {
  paths: AppDataPaths;
  storage?: AssetStorage;
}

export interface CreateAssetInput {
  blockId: string;
  assets: Array<{
    dataBase64: string;
    fileName?: string;
    mimeType: string;
  }>;
}

export interface CopyAssetInput {
  assetUrls: string[];
  sourceBlockId: string;
  targetBlockId: string;
}

export interface ResolveAssetInput {
  assetUrls: string[];
}

export interface ImportAssetInput {
  blockId: string;
  files: Array<{
    fileName?: string;
    fileUrl: string;
  }>;
}

interface MarkdownNode extends ImageUrlNode {
  children?: MarkdownNode[];
  position?: Position;
}

interface MarkdownImageReplacement {
  endOffset: number;
  nextUrl: string;
  startOffset: number;
}

const MARKDOWN_PARSER = unified().use(remarkParse).use(remarkGfm).use(remarkMath);
const MARKDOWN_IMAGE_DESTINATION_PREFIX_PATTERN = /]\(\s*<?$/;

function createUniqueAssetFileName(fileNameCandidate: string | null, mimeType: string): string {
  const uniquePrefix = `${Date.now()}-${crypto.randomUUID()}`;
  if (fileNameCandidate) {
    return sanitizeFileName(`${uniquePrefix}-${fileNameCandidate}`);
  }

  return sanitizeFileName(`${uniquePrefix}.${extFromMimeType(mimeType)}`);
}

function getAssetFilePath(paths: AppDataPaths, assetUrl: string): string {
  const parsed = splitAssetUrl(assetUrl);
  return path.join(paths.assetPathForBlock(parsed.blockId), sanitizeFileName(parsed.fileName));
}

function collectMarkdownImageReplacements(
  content: string,
  assetUrlMap: Map<string, string>,
): MarkdownImageReplacement[] {
  const tree = MARKDOWN_PARSER.parse(content) as MarkdownNode;
  const replacements: MarkdownImageReplacement[] = [];

  const visit = (node: MarkdownNode): void => {
    const assetUrl = getImageAssetUrl(node);
    if (assetUrl) {
      const nextUrl = assetUrlMap.get(assetUrl);
      const urlRange = nextUrl ? findMarkdownImageUrlRange(content, node, assetUrl) : null;
      if (nextUrl && urlRange) {
        replacements.push({
          endOffset: urlRange.endOffset,
          nextUrl,
          startOffset: urlRange.startOffset,
        });
      }
    }

    node.children?.forEach(visit);
  };

  visit(tree);
  return replacements;
}

function findMarkdownImageUrlRange(
  content: string,
  node: MarkdownNode,
  assetUrl: string,
): Pick<MarkdownImageReplacement, "endOffset" | "startOffset"> | null {
  const nodeStartOffset = node.position?.start.offset;
  const nodeEndOffset = node.position?.end.offset;
  if (
    typeof nodeStartOffset !== "number" ||
    typeof nodeEndOffset !== "number" ||
    nodeStartOffset >= nodeEndOffset
  ) {
    return null;
  }

  const nodeMarkdown = content.slice(nodeStartOffset, nodeEndOffset);
  let searchFrom = 0;

  while (searchFrom < nodeMarkdown.length) {
    const relativeUrlStart = nodeMarkdown.indexOf(assetUrl, searchFrom);
    if (relativeUrlStart === -1) {
      return null;
    }

    const beforeUrl = nodeMarkdown.slice(0, relativeUrlStart);
    if (MARKDOWN_IMAGE_DESTINATION_PREFIX_PATTERN.test(beforeUrl)) {
      return {
        endOffset: nodeStartOffset + relativeUrlStart + assetUrl.length,
        startOffset: nodeStartOffset + relativeUrlStart,
      };
    }

    searchFrom = relativeUrlStart + assetUrl.length;
  }

  return null;
}

function replaceMarkdownImageAssetUrls(
  content: string,
  replacements: MarkdownImageReplacement[],
): string {
  let nextContent = content;

  for (const replacement of replacements.toSorted((a, b) => b.startOffset - a.startOffset)) {
    const before = nextContent.slice(0, replacement.startOffset);
    const after = nextContent.slice(replacement.endOffset);
    nextContent = `${before}${replacement.nextUrl}${after}`;
  }

  return nextContent;
}

export async function createAsset(
  deps: AssetServiceOptions,
  db: AppDatabase,
  input: CreateAssetInput,
) {
  const storage = deps.storage ?? nodeAssetStorage;
  await assertBlockExists(db, input.blockId);

  const assets = [];
  for (const asset of input.assets) {
    const fileNameCandidate =
      asset.fileName && asset.fileName.trim().length > 0 ? asset.fileName : null;
    const fileName = createUniqueAssetFileName(fileNameCandidate, asset.mimeType);
    const blockDir = deps.paths.assetPathForBlock(input.blockId);
    const filePath = path.join(blockDir, fileName);

    await storage.writeFile(filePath, Buffer.from(asset.dataBase64, "base64"));
    assets.push({
      assetUrl: `${assetUrlScheme}${input.blockId}/${fileName}`,
      altText: fileNameCandidate ?? fileName,
    });
  }

  return {
    assets,
  };
}

export async function copyAsset(deps: AssetServiceOptions, db: AppDatabase, input: CopyAssetInput) {
  const storage = deps.storage ?? nodeAssetStorage;
  await assertBlockExists(db, input.sourceBlockId);
  await assertBlockExists(db, input.targetBlockId);

  const assets = [];
  for (const assetUrl of input.assetUrls) {
    const parsed = splitAssetUrl(assetUrl);
    if (parsed.blockId !== input.sourceBlockId) {
      throw businessError("BUSINESS.INVALID_OPERATION", "Asset source block mismatch", {
        assetBlockId: parsed.blockId,
        sourceBlockId: input.sourceBlockId,
      });
    }

    const sourcePath = path.join(
      deps.paths.assetPathForBlock(input.sourceBlockId),
      sanitizeFileName(parsed.fileName),
    );
    const targetFileName = sanitizeFileName(
      `${Date.now()}-${crypto.randomUUID()}-${parsed.fileName}`,
    );
    const targetPath = path.join(deps.paths.assetPathForBlock(input.targetBlockId), targetFileName);

    await storage.copyFile(sourcePath, targetPath);
    assets.push({
      sourceAssetUrl: assetUrl,
      assetUrl: `${assetUrlScheme}${input.targetBlockId}/${targetFileName}`,
    });
  }

  return {
    assets,
  };
}

export async function resolveAsset(
  deps: AssetServiceOptions,
  db: AppDatabase,
  input: ResolveAssetInput,
) {
  const assets = [];
  for (const assetUrl of input.assetUrls) {
    const parsed = splitAssetUrl(assetUrl);
    await assertBlockExists(db, parsed.blockId);
    assets.push({
      assetUrl,
      fileUrl: pathToFileURL(getAssetFilePath(deps.paths, assetUrl)).toString(),
    });
  }

  return { assets };
}

export async function importAsset(
  deps: AssetServiceOptions,
  db: AppDatabase,
  input: ImportAssetInput,
) {
  const storage = deps.storage ?? nodeAssetStorage;
  await assertBlockExists(db, input.blockId);

  const assets = [];
  for (const file of input.files) {
    try {
      const sourcePath = fileURLToPath(file.fileUrl);
      const sourceFileName = file.fileName?.trim() || path.basename(sourcePath);
      const targetFileName = createUniqueAssetFileName(sourceFileName, "image/png");
      const targetPath = path.join(deps.paths.assetPathForBlock(input.blockId), targetFileName);

      await storage.copyFile(sourcePath, targetPath);
      assets.push({
        assetUrl: `${assetUrlScheme}${input.blockId}/${targetFileName}`,
        fileUrl: file.fileUrl,
      });
    } catch {
      assets.push({
        assetUrl: null,
        fileUrl: file.fileUrl,
      });
    }
  }

  return { assets };
}

export async function externalizeMarkdownAssetUrls(
  deps: AssetServiceOptions,
  db: AppDatabase,
  content: string,
): Promise<string> {
  const tree = MARKDOWN_PARSER.parse(content) as MarkdownNode;
  const assetUrls = collectImageAssetUrls([tree]);
  if (assetUrls.length === 0) {
    return content;
  }

  const resolvedAssets = await resolveAsset(deps, db, { assetUrls });
  const assetUrlMap = new Map(
    resolvedAssets.assets.map((asset) => [asset.assetUrl, asset.fileUrl]),
  );
  const replacements = collectMarkdownImageReplacements(content, assetUrlMap);
  return replacements.length > 0 ? replaceMarkdownImageAssetUrls(content, replacements) : content;
}
