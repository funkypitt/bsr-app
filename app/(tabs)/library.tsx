import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect, router } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as api from "../../src/api/client";
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
}: {
  loan: Loan;
  progress: number;
}) {
  const pct = loan.duration > 0 ? Math.round((progress / loan.duration) * 100) : 0;

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push(`/player/${loan.id}`)}
    >
      {loan.coverUrl ? (
        <Image source={{ uri: loan.coverUrl }} style={styles.cover} />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]}>
          <Text style={styles.coverLetter}>{loan.title[0]}</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>
          {loan.title}
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          {loan.author}
        </Text>
        <Text style={styles.meta}>
          {formatDuration(loan.duration)}
          {loan.loanUntil ? ` · Jusqu'au ${formatDate(loan.loanUntil)}` : ""}
        </Text>
        {pct > 0 && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${Math.min(pct, 100)}%` }]} />
          </View>
        )}
      </View>
      <View style={styles.playButton}>
        <Text style={styles.playIcon}>▶</Text>
      </View>
    </Pressable>
  );
}

export default function LibraryScreen() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        try {
          const [loansData, storedProgress] = await Promise.all([
            api.getLoans(),
            AsyncStorage.getItem("playback_positions"),
          ]);
          if (!active) return;
          setLoans(loansData);
          if (storedProgress) {
            setProgress(JSON.parse(storedProgress));
          }
        } catch {
          // ignore
        }
        if (active) setLoading(false);
      })();
      return () => { active = false; };
    }, [])
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={loans}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LoanCard loan={item} progress={progress[item.id] ?? 0} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.empty}>Aucun emprunt en cours</Text>
            <Text style={styles.emptyHint}>
              Empruntez un livre audio depuis la recherche
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
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
    alignItems: "center",
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
  empty: { ...typography.subtitle, color: colors.textSecondary, marginBottom: spacing.xs },
  emptyHint: { ...typography.caption, textAlign: "center" },
});
