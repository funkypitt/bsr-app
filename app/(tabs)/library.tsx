import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as api from "../../src/api/client";
import { storeBook } from "../../src/store";
import { colors, spacing, typography } from "../../src/theme";
import type { Loan } from "../../src/types";

function formatDuration(seconds: number): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}min` : ""}`;
  return `${m}min`;
}

function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-CH", { day: "numeric", month: "short" });
}

function LoanCard({
  loan,
  progress,
  onCancel,
}: {
  loan: Loan;
  progress: number;
  onCancel?: () => void;
}) {
  const pct = loan.duration > 0 ? Math.round((progress / loan.duration) * 100) : 0;

  return (
    <Pressable
      style={styles.card}
      onPress={() => {
        storeBook(loan);
        if (loan.isReservation) {
          router.push(`/book/${loan.id}`);
        } else if (loan.streamUrl) {
          router.push(`/player/${loan.id}`);
        } else {
          router.push(`/book/${loan.id}`);
        }
      }}
    >
      {loan.coverUrl ? (
        <Image source={{ uri: loan.coverUrl }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Text style={styles.coverLetter}>{loan.title?.[0] ?? "?"}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {loan.title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {loan.author}
        </Text>
        {loan.isReservation ? (
          <>
            <Text style={styles.reservationText}>
              File d'attente : {loan.holdPosition ?? "?"}/{loan.holdTotal ?? "?"}
            </Text>
            {loan.cancelUrl && onCancel && (
              <Pressable style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </Pressable>
            )}
          </>
        ) : (
          <>
            <Text style={styles.meta}>
              {formatDuration(loan.duration)}
              {loan.loanUntil ? ` · Jusqu'au ${formatDate(loan.loanUntil)}` : ""}
            </Text>
            {pct > 0 && (
              <View style={styles.progressContainer}>
                <View style={[styles.progressBar, { width: `${Math.min(pct, 100)}%` }]} />
              </View>
            )}
          </>
        )}
      </View>
      {!loan.isReservation && (
        <View style={styles.playButton}>
          <Text style={styles.playIcon}>▶</Text>
        </View>
      )}
      {loan.isReservation && (
        <View style={styles.waitBadge}>
          <Text style={styles.waitIcon}>⏳</Text>
        </View>
      )}
    </Pressable>
  );
}

export default function LibraryScreen() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [loansData, storedProgress] = await Promise.all([
        api.getLoans(),
        AsyncStorage.getItem("playback_positions"),
      ]);
      setLoans(loansData);
      if (storedProgress) {
        setProgress(JSON.parse(storedProgress));
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        await loadData();
      })();
      return () => { active = false; };
    }, [loadData])
  );

  const handleCancel = (loan: Loan) => {
    if (!loan.cancelUrl) return;
    Alert.alert(
      "Annuler la réservation ?",
      `Voulez-vous annuler la réservation de « ${loan.title} » ?`,
      [
        { text: "Non", style: "cancel" },
        {
          text: "Oui, annuler",
          style: "destructive",
          onPress: async () => {
            const ok = await api.cancelReservation(loan.cancelUrl!);
            if (ok) {
              setLoans((prev) => prev.filter((l) => l.id !== loan.id));
              Alert.alert("Annulée", "La réservation a été annulée.");
            } else {
              Alert.alert("Erreur", "Impossible d'annuler la réservation.");
            }
          },
        },
      ]
    );
  };

  const activeLoans = loans.filter((l) => !l.isReservation);
  const reservations = loans.filter((l) => l.isReservation);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (loans.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.empty}>Aucun emprunt en cours</Text>
        <Text style={styles.emptyHint}>
          Empruntez un livre audio depuis la recherche
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={[
          ...(activeLoans.length > 0
            ? [{ title: "Prêts", data: activeLoans }]
            : []),
          ...(reservations.length > 0
            ? [{ title: "Réservations", data: reservations }]
            : []),
        ]}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LoanCard
            loan={item}
            progress={progress[item.id] ?? 0}
            onCancel={item.isReservation ? () => handleCancel(item) : undefined}
          />
        )}
        renderSectionHeader={({ section }) => (
          <Text style={styles.sectionHeader}>{section.title}</Text>
        )}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
  list: { padding: spacing.md, gap: spacing.sm },
  sectionHeader: {
    ...typography.subtitle,
    fontSize: 13,
    color: colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
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
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  cover: { width: 70, height: 100 },
  coverPlaceholder: {
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  coverLetter: { color: colors.white, fontSize: 24, fontWeight: "700" },
  info: { flex: 1, padding: spacing.md },
  title: { ...typography.subtitle, fontSize: 15, marginBottom: 2 },
  author: { ...typography.caption, marginBottom: spacing.xs },
  meta: { ...typography.caption, fontSize: 11, color: colors.textLight },
  reservationText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.orange,
    fontWeight: "600",
  },
  cancelButton: {
    marginTop: spacing.xs,
    alignSelf: "flex-start",
  },
  cancelButtonText: {
    fontSize: 12,
    color: colors.textLight,
    textDecorationLine: "underline",
  },
  progressContainer: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginTop: spacing.sm,
    overflow: "hidden",
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  playIcon: { color: colors.white, fontSize: 16 },
  waitBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
  },
  waitIcon: { fontSize: 18 },
  empty: { ...typography.subtitle, color: colors.textSecondary, marginBottom: spacing.xs },
  emptyHint: { ...typography.caption, textAlign: "center" },
});
