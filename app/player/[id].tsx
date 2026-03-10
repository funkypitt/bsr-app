import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { WebView } from "react-native-webview";
import * as api from "../../src/api/client";
import { colors, spacing, typography } from "../../src/theme";
import type { Loan } from "../../src/types";

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const webRef = useRef<WebView>(null);
  const positionInterval = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const loans = await api.getLoans();
        const found = loans.find((l) => l.id === id);
        if (found) {
          setLoan(found);
        } else {
          setError("Emprunt non trouvé");
        }
      } catch {
        setError("Impossible de charger le lecteur");
      }
      setLoading(false);
    })();

    return () => {
      clearInterval(positionInterval.current);
    };
  }, [id]);

  // Save position periodically via injected JS
  useEffect(() => {
    if (!loan) return;
    positionInterval.current = setInterval(() => {
      webRef.current?.injectJavaScript(`
        (function() {
          try {
            const audio = document.querySelector('audio');
            if (audio && audio.currentTime > 0) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'position',
                position: audio.currentTime
              }));
            }
          } catch(e) {}
        })();
        true;
      `);
    }, 10000);

    return () => clearInterval(positionInterval.current);
  }, [loan]);

  const handleMessage = async (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "position" && id) {
        const positions = JSON.parse(
          (await AsyncStorage.getItem("playback_positions")) || "{}"
        );
        positions[id] = data.position;
        await AsyncStorage.setItem(
          "playback_positions",
          JSON.stringify(positions)
        );
        // Also try server-side save
        api.saveProgression(id, data.position);
      }
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Chargement du lecteur...</Text>
      </View>
    );
  }

  if (error || !loan) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error || "Erreur inconnue"}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={2}>
          {loan.title}
        </Text>
        <Text style={styles.author}>{loan.author}</Text>
        {loan.narrator ? (
          <Text style={styles.narrator}>Lu par {loan.narrator}</Text>
        ) : null}
      </View>
      <WebView
        ref={webRef}
        source={{ uri: loan.streamUrl }}
        style={styles.webview}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        startInLoadingState
        renderLoading={() => (
          <View style={styles.webviewLoading}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorText: { ...typography.body, color: colors.primary, textAlign: "center" },
  header: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { ...typography.subtitle, marginBottom: 2 },
  author: { ...typography.caption },
  narrator: { ...typography.caption, color: colors.textLight },
  webview: { flex: 1 },
  webviewLoading: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
});
