import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Book } from "./types";

const STORE_KEY = "book_cache";

// In-memory cache for fast synchronous reads
const books = new Map<string, Book>();

export function storeBook(book: Book): void {
  books.set(book.id, book);
  // Also persist to AsyncStorage (fire-and-forget)
  AsyncStorage.getItem(STORE_KEY).then((raw) => {
    const cache = raw ? JSON.parse(raw) : {};
    cache[book.id] = book;
    AsyncStorage.setItem(STORE_KEY, JSON.stringify(cache));
  }).catch(() => {});
}

export function getStoredBook(id: string): Book | undefined {
  return books.get(id);
}

export async function getStoredBookAsync(id: string): Promise<Book | undefined> {
  // Try in-memory first
  const mem = books.get(id);
  if (mem) return mem;
  // Fallback to AsyncStorage
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (raw) {
      const cache = JSON.parse(raw);
      if (cache[id]) {
        books.set(id, cache[id]); // warm the in-memory cache
        return cache[id];
      }
    }
  } catch {}
  return undefined;
}
