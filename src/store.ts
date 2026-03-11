import type { Book } from "./types";

// Simple in-memory store to pass book data between screens
// Avoids URL param bloat and re-fetching (OPDS detail lacks author)
const books = new Map<string, Book>();

export function storeBook(book: Book): void {
  books.set(book.id, book);
}

export function getStoredBook(id: string): Book | undefined {
  return books.get(id);
}
