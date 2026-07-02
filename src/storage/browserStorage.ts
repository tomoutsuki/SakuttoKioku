import type { QuizStatistics, StoredQuiz } from "../types/quiz";
import type { StorageAdapter } from "../types/storage";

const DB_NAME = "sakutto-kioku";
const DB_VERSION = 1;
const QUIZZES_STORE = "quizzes";
const STATISTICS_STORE = "statistics";
const FALLBACK_QUIZZES_KEY = "sakutto-kioku:quizzes";
const FALLBACK_STATS_KEY = "sakutto-kioku:statistics";

function supportsIndexedDb() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
  });
}

class IndexedDbAdapter implements StorageAdapter {
  private dbPromise: Promise<IDBDatabase>;

  constructor() {
    this.dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(QUIZZES_STORE)) {
          database.createObjectStore(QUIZZES_STORE, { keyPath: "id" });
        }
        if (!database.objectStoreNames.contains(STATISTICS_STORE)) {
          database.createObjectStore(STATISTICS_STORE, { keyPath: "quizId" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Could not open IndexedDB."));
    });
  }

  private async transaction(storeName: string, mode: IDBTransactionMode) {
    const database = await this.dbPromise;
    return database.transaction(storeName, mode).objectStore(storeName);
  }

  async getQuizzes() {
    const store = await this.transaction(QUIZZES_STORE, "readonly");
    return requestToPromise(store.getAll()) as Promise<StoredQuiz[]>;
  }

  async saveQuiz(quiz: StoredQuiz) {
    const store = await this.transaction(QUIZZES_STORE, "readwrite");
    await requestToPromise(store.put(quiz));
  }

  async getStatistics() {
    const store = await this.transaction(STATISTICS_STORE, "readonly");
    return requestToPromise(store.getAll()) as Promise<QuizStatistics[]>;
  }

  async saveStatistics(stats: QuizStatistics) {
    const store = await this.transaction(STATISTICS_STORE, "readwrite");
    await requestToPromise(store.put(stats));
  }
}

class LocalStorageAdapter implements StorageAdapter {
  private parse<T>(key: string): T[] {
    if (typeof window === "undefined") {
      return [];
    }

    const raw = window.localStorage.getItem(key);
    if (!raw) {
      return [];
    }

    try {
      return JSON.parse(raw) as T[];
    } catch {
      return [];
    }
  }

  private write<T extends { id?: string; quizId?: string }>(key: string, value: T, idKey: "id" | "quizId") {
    const entries = this.parse<T>(key);
    const entryId = value[idKey];
    const nextEntries = entries.filter((entry) => entry[idKey] !== entryId).concat(value);
    window.localStorage.setItem(key, JSON.stringify(nextEntries));
  }

  async getQuizzes() {
    return this.parse<StoredQuiz>(FALLBACK_QUIZZES_KEY);
  }

  async saveQuiz(quiz: StoredQuiz) {
    this.write(FALLBACK_QUIZZES_KEY, quiz, "id");
  }

  async getStatistics() {
    return this.parse<QuizStatistics>(FALLBACK_STATS_KEY);
  }

  async saveStatistics(stats: QuizStatistics) {
    this.write(FALLBACK_STATS_KEY, stats, "quizId");
  }
}

class ResilientStorageAdapter implements StorageAdapter {
  constructor(
    private readonly primary: StorageAdapter,
    private readonly fallback: StorageAdapter,
  ) {}

  private async run<T>(operation: (adapter: StorageAdapter) => Promise<T>) {
    try {
      return await operation(this.primary);
    } catch {
      return operation(this.fallback);
    }
  }

  async getQuizzes() {
    return this.run((adapter) => adapter.getQuizzes());
  }

  async saveQuiz(quiz: StoredQuiz) {
    await this.run((adapter) => adapter.saveQuiz(quiz));
  }

  async getStatistics() {
    return this.run((adapter) => adapter.getStatistics());
  }

  async saveStatistics(stats: QuizStatistics) {
    await this.run((adapter) => adapter.saveStatistics(stats));
  }
}

function createAdapter(): StorageAdapter {
  const fallback = new LocalStorageAdapter();

  if (supportsIndexedDb()) {
    try {
      return new ResilientStorageAdapter(new IndexedDbAdapter(), fallback);
    } catch {
      return fallback;
    }
  }

  return fallback;
}

export const browserStorage = createAdapter();
