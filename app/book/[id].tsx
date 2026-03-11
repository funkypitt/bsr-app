import { router, useLocalSearchParams, Stack } from "expo-router";
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
import { getStoredBook, getStoredBookAsync } from "../../src/store";
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
  const [returning, setReturning] = useState(false);
  const [loanStreamUrl, setLoanStreamUrl] = useState<string>("");
  const [loanReturnUrl, setLoanReturnUrl] = useState<string>("");
  const [reservation, setReservation] = useState<{
    position?: number;
    total?: number;
    cancelUrl?: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;

    (async () => {
      try {
        // 1. Get book from in-memory store, then AsyncStorage fallback
        let stored = getStoredBook(id) ?? (await getStoredBookAsync(id));

        // 2. Also fetch fresh OPDS data for current borrow/stream state
        let fresh: Book | null = null;
        try {
          fresh = await api.getBook(id);
        } catch {
          // API call failed, will use stored data
        }

        const base = stored ?? fresh;
        if (!base) {
          setLoading(false);
          return;
        }

        // Merge: prefer stored metadata (has author), fresh links
        const merged: Book = {
          ...base,
          borrowUrl: fresh?.borrowUrl || stored?.borrowUrl || "",
          returnUrl: fresh?.returnUrl || stored?.returnUrl || "",
          streamUrl: fresh?.streamUrl || stored?.streamUrl || "",
          availability: fresh?.availability || stored?.availability,
          subjects: base.subjects ?? [],
        };

        setBook(merged);

        // 3. Check if already borrowed (stream URL comes from loans)
        try {
          const loans = await api.getLoans();
          const loan = loans.find((l) => l.id === id);
          if (loan?.isReservation) {
            setReservation({
              position: loan.holdPosition,
              total: loan.holdTotal,
              cancelUrl: loan.cancelUrl,
            });
          } else if (loan) {
            if (loan.streamUrl) {
              setLoanStreamUrl(loan.streamUrl);
            }
            if (loan.returnUrl) {
              setLoanReturnUrl(loan.returnUrl);
            }
          }
        } catch {
          // ignore
        }
      } catch {
        // Outer catch: ensure we always stop loading
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleBorrow = async () => {
    if (!book?.borrowUrl) return;
    setBorrowing(true);
    const ok = await api.borrowBook(book.borrowUrl);
    setBorrowing(false);
    if (ok) {
      // Refresh loans to get the stream URL
      try {
        const loans = await api.getLoans();
        const loan = loans.find((l) => l.id === id);
        if (loan?.returnUrl) {
          setLoanReturnUrl(loan.returnUrl);
        }
        if (loan?.streamUrl) {
          setLoanStreamUrl(loan.streamUrl);
          Alert.alert("Emprunté !", "Le livre est prêt à écouter.", [
            {
              text: "Écouter",
              onPress: () => router.push(`/player/${book.id}`),
            },
            { text: "OK" },
          ]);
        } else {
          Alert.alert("Emprunté !", "Le livre a été ajouté à vos emprunts.");
        }
      } catch {
        Alert.alert("Emprunté !", "Le livre a été emprunté.");
      }
    } else {
      Alert.alert("Erreur", "Impossible d'emprunter ce livre.");
    }
  };

  const handleReturn = () => {
    const url = loanReturnUrl || book?.returnUrl;
    if (!url) return;
    Alert.alert(
      "Rendre ce livre ?",
      "Vous ne pourrez plus l'écouter après l'avoir rendu.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Rendre",
          style: "destructive",
          onPress: async () => {
            setReturning(true);
            const ok = await api.returnBook(url);
            setReturning(false);
            if (ok) {
              setLoanStreamUrl("");
              setLoanReturnUrl("");
              setBook((prev) =>
                prev ? { ...prev, streamUrl: "", returnUrl: "" } : prev
              );
              Alert.alert("Rendu", "Le livre a été rendu.");
            } else {
              Alert.alert("Erreur", "Impossible de rendre ce livre.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!book || !book.title) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Livre introuvable</Text>
        <Pressable style={styles.backLink} onPress={() => router.back()}>
          <Text style={styles.backLinkText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  const canPlay = !reservation && (!!loanStreamUrl || !!book.streamUrl);
  const canBorrow = !!book.borrowUrl && !canPlay && !reservation;
  const canReturn = !!(loanReturnUrl || book.returnUrl) && canPlay;

  return (
    <>
      <Stack.Screen options={{ title: book.title }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <View style={styles.header}>
          {book.coverUrl ? (
            <Image source={{ uri: book.coverUrl }} style={styles.cover} />
          ) : (
            <View style={[styles.cover, styles.coverPlaceholder]}>
              <Text style={styles.coverLetter}>
                {book.title?.[0] ?? "?"}
              </Text>
            </View>
          )}
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{book.title}</Text>
            {book.author ? (
              <Text style={styles.author}>{book.author}</Text>
            ) : null}
            {book.narrator ? (
              <Text style={styles.narrator}>Lu par {book.narrator}</Text>
            ) : null}
            {book.duration > 0 && (
              <Text style={styles.duration}>
                {formatDuration(book.duration)}
              </Text>
            )}
            {book.isAudiobook && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Livre audio</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          {canPlay && (
            <Pressable
              style={styles.listenButton}
              onPress={() => router.push(`/player/${book.id}`)}
            >
              <Text style={styles.listenButtonText}>▶ Écouter</Text>
            </Pressable>
          )}
          {canReturn && (
            <Pressable
              style={[styles.returnButton, returning && { opacity: 0.7 }]}
              onPress={handleReturn}
              disabled={returning}
            >
              {returning ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.returnButtonText}>Rendre ce livre</Text>
              )}
            </Pressable>
          )}
          {canBorrow && (
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
          )}
          {reservation && (
            <View style={styles.reservedBox}>
              <Text style={styles.reservedText}>
                Réservé — position {reservation.position ?? "?"}/{reservation.total ?? "?"} dans la file
              </Text>
              {reservation.cancelUrl && (
                <Pressable
                  style={styles.cancelReservation}
                  onPress={() => {
                    Alert.alert(
                      "Annuler la réservation ?",
                      `Voulez-vous annuler la réservation de « ${book.title} » ?`,
                      [
                        { text: "Non", style: "cancel" },
                        {
                          text: "Oui, annuler",
                          style: "destructive",
                          onPress: async () => {
                            const ok = await api.cancelReservation(reservation.cancelUrl!);
                            if (ok) {
                              setReservation(null);
                              Alert.alert("Annulée", "La réservation a été annulée.");
                            } else {
                              Alert.alert("Erreur", "Impossible d'annuler la réservation.");
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.cancelReservationText}>Annuler la réservation</Text>
                </Pressable>
              )}
            </View>
          )}
          {!canPlay && !canBorrow && !reservation && book.availability?.state !== "available" && (
            <View style={styles.unavailableBox}>
              <Text style={styles.unavailableText}>
                Indisponible actuellement
              </Text>
            </View>
          )}
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
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  backLink: { padding: spacing.md },
  backLinkText: { color: colors.primary, fontSize: 16, fontWeight: "600" },
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
  author: {
    ...typography.subtitle,
    color: colors.textSecondary,
    marginBottom: 2,
  },
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
  returnButton: {
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  returnButtonText: { color: colors.textSecondary, fontSize: 14, fontWeight: "600" },
  borrowButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
  },
  borrowButtonText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  reservedBox: {
    backgroundColor: "#FFF3E0",
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
  },
  reservedText: {
    ...typography.body,
    color: colors.orange,
    fontWeight: "600",
    textAlign: "center",
  },
  cancelReservation: {
    marginTop: spacing.sm,
  },
  cancelReservationText: {
    color: colors.textSecondary,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  unavailableBox: {
    backgroundColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: "center",
  },
  unavailableText: { ...typography.body, color: colors.textSecondary },
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
});
