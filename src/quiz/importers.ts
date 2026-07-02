import JSZip from "jszip";
import type { ImportOutcome, StoredQuiz } from "../types/quiz";
import { normalizeAssetPath } from "../utils/quizIdentity";
import { buildStoredQuiz, parseQuizDocument } from "./validation";

function fileToDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function createZipCollectionId() {
  return `zip-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getZipCollectionName(fileName: string) {
  const normalized = fileName.replace(/\.zip$/i, "").trim();
  return normalized || "Imported ZIP";
}

async function importJsonQuiz(file: File): Promise<ImportOutcome> {
  const parsed = parseQuizDocument(await file.text());
  if (!parsed.quiz) {
    return {
      importedQuizzes: [],
      errors: parsed.errors,
    };
  }

  const stored = buildStoredQuiz(parsed.quiz, "json", {});
  if (!stored.quiz) {
    return {
      importedQuizzes: [],
      errors: stored.errors,
    };
  }

  return {
    importedQuizzes: [stored.quiz],
    errors: [],
  };
}

interface QuizPackageDescriptor {
  folderPrefix: string;
  sourceEntryPath: string;
  quizEntryPath: string;
}

function normalizeZipPath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\/+/, "");
}

function getZipQuizDescriptors(zip: JSZip) {
  const matches = Object.keys(zip.files)
    .filter((path) => normalizeZipPath(path).split("/").pop()?.toLowerCase() === "quiz.json")
    .filter((path) => !zip.files[path]?.dir)
    .map<QuizPackageDescriptor>((entryPath) => {
      const normalized = normalizeZipPath(entryPath);
      const slashIndex = normalized.lastIndexOf("/");
      return {
        sourceEntryPath: entryPath,
        quizEntryPath: normalized,
        folderPrefix: slashIndex >= 0 ? normalized.slice(0, slashIndex + 1) : "",
      };
    });

  return matches;
}

async function collectAssets(zip: JSZip, folderPrefix: string) {
  const assets: Record<string, string> = {};

  const assetEntries = Object.keys(zip.files).filter((path) => {
    const normalized = normalizeZipPath(path);
    const entry = zip.files[path];
    return (
      !entry?.dir &&
      normalized.startsWith(folderPrefix) &&
      normalized.split("/").pop()?.toLowerCase() !== "quiz.json"
    );
  });

  await Promise.all(
    assetEntries.map(async (entryPath) => {
      const entry = zip.file(entryPath);
      if (!entry) {
        return;
      }
      const blob = await entry.async("blob");
      const relativePath = normalizeAssetPath(entryPath.slice(folderPrefix.length));
      assets[relativePath] = await fileToDataUrl(blob);
    }),
  );

  return assets;
}

async function importZipQuizzes(file: File): Promise<ImportOutcome> {
  try {
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const descriptors = getZipQuizDescriptors(zip);

    if (descriptors.length === 0) {
      return {
        importedQuizzes: [],
        errors: ['The ZIP archive does not contain a "quiz.json" file.'],
      };
    }

    const importedQuizzes: StoredQuiz[] = [];
    const errors: string[] = [];
    const collectionId = createZipCollectionId();
    const collectionName = getZipCollectionName(file.name);

    for (const descriptor of descriptors) {
      const quizEntry = zip.file(descriptor.sourceEntryPath);
      if (!quizEntry) {
        errors.push(`Could not read "${descriptor.quizEntryPath}" from the ZIP archive.`);
        continue;
      }

      const parsed = parseQuizDocument(await quizEntry.async("text"));
      if (!parsed.quiz) {
        const packageName = descriptor.folderPrefix || "root package";
        parsed.errors.forEach((error) => errors.push(`${packageName}: ${error}`));
        continue;
      }

      const assets = await collectAssets(zip, descriptor.folderPrefix);
      const stored = buildStoredQuiz(parsed.quiz, "zip", assets, {
        collectionId,
        collectionName,
      });

      if (!stored.quiz) {
        const packageName = descriptor.folderPrefix || "root package";
        stored.errors.forEach((error) => errors.push(`${packageName}: ${error}`));
        continue;
      }

      importedQuizzes.push(stored.quiz);
    }

    return {
      importedQuizzes,
      errors,
    };
  } catch {
    return {
      importedQuizzes: [],
      errors: ["The selected file is not a valid ZIP archive or is corrupted."],
    };
  }
}

export async function importQuizFile(file: File): Promise<ImportOutcome> {
  if (file.name.toLowerCase().endsWith(".json")) {
    return importJsonQuiz(file);
  }

  if (file.name.toLowerCase().endsWith(".zip")) {
    return importZipQuizzes(file);
  }

  return {
    importedQuizzes: [],
    errors: ["Please select a .json quiz file or a .zip quiz package."],
  };
}
