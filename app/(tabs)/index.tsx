import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as api from "../../src/api/client";
import { colors, spacing, typography } from "../../src/theme";
import type { Book } from "../../src/types";

function formatDuration(seconds: number): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}min` : ""}`;
  return `${m}min`;
}

function BookCard({ book }: { book: Book }) {
  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/book/${book.id}`)}
    >
      {book.coverUrl ? (
        <Image source={{ uri: book.coverUrl }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Text style={styles.coverText}>{book.title[0]}</Text>
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={2}>
          {book.title}
        </Text>
        <Text style={styles.cardAuthor} numberOfLines={1}>
          {book.author}
        </Text>
        {book.isAudiobook && (
          <View style={styles.badges}>
            <View style={styles.audioBadge}>
              <Text style={styles.audioBadgeText}>Audio</Text>
            </View>
            {book.duration > 0 && (
              <Text style={styles.duration}>
                {formatDuration(book.duration)}
              </Text>
            )}
          </View>
        )}
      </View>
    </Pressable>
  );
}

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [audioOnly, setAudioOnly] = useState(true);
  const [searched, setSearched] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout>>();

  const doSearch = useCallback(
    async (q: string, audio: boolean) => {
      if (q.trim().length < 2) {
        setResults([]);
        setSearched(false);
        return;
      }
      setLoading(true);
      setSearched(true);
      try {
        const books = await api.search(q.trim(), audio);
        setResults(books);
      } catch {
        setResults([]);
      }
      setLoading(false);
    },
    []
  );

  const onChangeText = (text: string) => {
    setQuery(text);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(text, audioOnly), 500);
  };

  const toggleAudio = (val: boolean) => {
    setAudioOnly(val);
    if (query.trim().length >= 2) doSearch(query, val);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Titre, auteur..."
          placeholderTextColor={colors.textLight}
          value={query}
          onChangeText={onChangeText}
          returnKeyType="search"
          onSubmitEditing={() => doSearch(query, audioOnly)}
          autoCorrect={false}
        />
      </View>
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Livres audio uniquement</Text>
        <Switch
          value={audioOnly}
          onValueChange={toggleAudio}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor={colors.white}
        />
      </View>

      {loading ? (
        <ActivityIndicator
          style={styles.loader}
          size="large"
          color={colors.primary}
        />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <BookCard book={item} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            searched ? (
              <Text style={styles.empty}>Aucun résultat</Text>
            ) : (
              <Text style={styles.empty}>
                Recherchez un livre par titre ou auteur
              </Text>
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchBar: { padding: spacing.md, paddingBottom: 0 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  filterLabel: { ...typography.caption, fontSize: 13 },
  loader: { marginTop: spacing.xl },
  list: { padding: spacing.md, gap: spacing.md },
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cover: { width: 80, height: 120 },
  coverPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  coverText: { color: colors.white, fontSize: 28, fontWeight: "700" },
  cardInfo: { flex: 1, padding: spacing.md, justifyContent: "center" },
  cardTitle: { ...typography.subtitle, marginBottom: 2 },
  cardAuthor: { ...typography.caption, marginBottom: spacing.sm },
  badges: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  audioBadge: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  audioBadgeText: { color: colors.white, fontSize: 11, fontWeight: "600" },
  duration: { ...typography.caption },
  empty: {
    ...typography.body,
    color: colors.textLight,
    textAlign: "center",
    marginTop: spacing.xl,
  },
});
