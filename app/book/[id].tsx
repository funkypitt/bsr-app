import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
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

export default function BookDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [borrowing, setBorrowing] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.getBook(id).then((b) => {
      setBook(b);
      setLoading(false);
    });
  }, [id]);

  const handleBorrow = async () => {
    if (!book?.borrowUrl) return;
    setBorrowing(true);
    const ok = await api.borrowBook(book.borrowUrl);
    setBorrowing(false);
    if (ok) {
      Alert.alert("Emprunté", "Le livre a été emprunté avec succès.", [
        { text: "Écouter", onPress: () => router.push(`/player/${book.id}`) },
        { text: "OK" },
      ]);
      // Refresh book data
      const updated = await api.getBook(id!);
      if (updated) setBook(updated);
    } else {
      Alert.alert("Erreur", "Impossible d'emprunter ce livre.");
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!book) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Livre introuvable</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {book.coverUrl ? (
          <Image source={{ uri: book.coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, styles.coverPlaceholder]}>
            <Text style={styles.coverLetter}>{book.title[0]}</Text>
          </View>
        )}
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{book.author}</Text>
          {book.narrator ? (
            <Text style={styles.narrator}>Lu par {book.narrator}</Text>
          ) : null}
          {book.duration > 0 && (
            <Text style={styles.duration}>{formatDuration(book.duration)}</Text>
          )}
          {book.isAudiobook && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Livre audio</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actions}>
        {book.streamUrl ? (
          <Pressable
            style={styles.listenButton}
            onPress={() => router.push(`/player/${book.id}`)}
          >
            <Text style={styles.listenButtonText}>▶ Écouter</Text>
          </Pressable>
        ) : book.borrowUrl ? (
          <Pressable
            style={[styles.borrowButton, borrowing && { opacity: 0.7 }]}
            onPress={handleBorrow}
            disabled={borrowing}
          >
            {borrowing ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.borrowButtonText}>Emprunter</Text>
            )}
          </Pressable>
        ) : null}
      </View>

      {book.subjects.length > 0 && (
        <View style={styles.tags}>
          {book.subjects.map((s) => (
            <View key={s} style={styles.tag}>
              <Text style={styles.tagText}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {book.description ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Résumé</Text>
          <Text style={styles.description}>{book.description}</Text>
        </View>
      ) : null}

      {book.availability && (
        <View style={styles.section}>
          <Text style={styles.availabilityText}>
            {book.availability.state === "available"
              ? "Disponible"
              : "Indisponible"}
            {book.availability.until
              ? ` · Jusqu'au ${new Date(book.availability.until).toLocaleDateString("fr-CH")}`
              : ""}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorText: { ...typography.body, color: colors.textSecondary },
  header: { flexDirection: "row", gap: spacing.md },
  cover: { width: 120, height: 180, borderRadius: 8 },
  coverPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  coverLetter: { color: colors.white, fontSize: 36, fontWeight: "700" },
  headerInfo: { flex: 1, justifyContent: "center" },
  title: { ...typography.title, fontSize: 20, marginBottom: spacing.xs },
  author: { ...typography.subtitle, color: colors.textSecondary, marginBottom: 2 },
  narrator: { ...typography.caption, marginBottom: spacing.xs },
  duration: { ...typography.caption, color: colors.textLight },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
    marginTop: spacing.sm,
  },
  badgeText: { color: colors.white, fontSize: 11, fontWeight: "600" },
  actions: { marginTop: spacing.lg },
  listenButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
  },
  listenButtonText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  borrowButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
  },
  borrowButtonText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  tags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  tag: {
    backgroundColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { ...typography.caption, fontSize: 12 },
  section: { marginTop: spacing.lg },
  sectionTitle: { ...typography.subtitle, marginBottom: spacing.sm },
  description: { ...typography.body, lineHeight: 22 },
  availabilityText: { ...typography.caption, color: colors.accent },
});
