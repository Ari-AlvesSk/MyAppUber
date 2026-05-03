import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const NOTIF_KEY = "rideshare:notifications:v1";

type NotifGroup = {
  title: string;
  items: { id: string; label: string; desc: string; icon: keyof typeof Feather.glyphMap; tint: string }[];
};

const GROUPS: NotifGroup[] = [
  {
    title: "Corridas",
    items: [
      { id: "ride_confirmed", label: "Corrida confirmada", desc: "Quando sua corrida for aceita por um motorista", icon: "check-circle", tint: "#00D26A" },
      { id: "driver_arriving", label: "Motorista a caminho", desc: "Quando o motorista estiver se aproximando", icon: "navigation", tint: "#3B82F6" },
      { id: "ride_completed", label: "Corrida concluída", desc: "Resumo e recibo da corrida", icon: "flag", tint: "#8B5CF6" },
    ],
  },
  {
    title: "Promoções",
    items: [
      { id: "promos", label: "Promoções e ofertas", desc: "Descontos e cupons exclusivos para você", icon: "tag", tint: "#F59E0B" },
      { id: "news", label: "Novidades do RideShare", desc: "Novos recursos e atualizações do app", icon: "bell", tint: "#EC4899" },
    ],
  },
  {
    title: "Relatórios",
    items: [
      { id: "weekly", label: "Resumo semanal", desc: "Relatório de corridas e gastos por semana", icon: "bar-chart-2", tint: "#06B6D4" },
    ],
  },
];

const DEFAULT_STATE: Record<string, boolean> = {
  ride_confirmed: true,
  driver_arriving: true,
  ride_completed: true,
  promos: false,
  news: false,
  weekly: false,
};

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [prefs, setPrefs] = useState<Record<string, boolean>>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top;

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((raw) => {
      if (raw) {
        try { setPrefs({ ...DEFAULT_STATE, ...JSON.parse(raw) }); } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const toggle = async (id: string) => {
    if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
    const next = { ...prefs, [id]: !prefs[id] };
    setPrefs(next);
    await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(next));
  };

  const enabledCount = Object.values(prefs).filter(Boolean).length;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Notificações</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
        {/* Status */}
        <View style={[styles.statusBox, { backgroundColor: colors.accent + "18", borderColor: colors.accent + "44" }]}>
          <Feather name="bell" size={20} color={colors.accent} />
          <Text style={[styles.statusTxt, { color: colors.foreground }]}>
            {enabledCount} {enabledCount === 1 ? "tipo ativo" : "tipos ativos"} de notificação
          </Text>
        </View>

        {loaded && GROUPS.map((g) => (
          <View key={g.title}>
            <Text style={[styles.groupTitle, { color: colors.foreground }]}>{g.title}</Text>
            <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {g.items.map((item, i) => (
                <Pressable
                  key={item.id}
                  onPress={() => toggle(item.id)}
                  style={[
                    styles.row,
                    i > 0 && { borderTopColor: colors.border, borderTopWidth: 1 },
                  ]}
                >
                  <View style={[styles.rowIcon, { backgroundColor: item.tint + "22" }]}>
                    <Feather name={item.icon} size={16} color={item.tint} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item.label}</Text>
                    <Text style={[styles.rowDesc, { color: colors.mutedForeground }]}>{item.desc}</Text>
                  </View>
                  <Switch
                    value={prefs[item.id] ?? false}
                    onValueChange={() => toggle(item.id)}
                    trackColor={{ false: colors.border, true: colors.accent }}
                    thumbColor="#fff"
                    ios_backgroundColor={colors.border}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        ))}

        <Text style={[styles.hint, { color: colors.mutedForeground }]}>
          As notificações push dependem das permissões do seu dispositivo. Acesse as configurações do sistema para gerenciar as permissões do aplicativo.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  content: { padding: 20, gap: 0 },
  statusBox: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 24 },
  statusTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  groupTitle: { fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10, marginTop: 4 },
  group: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 24 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  rowIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  rowDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2, lineHeight: 18 },
  hint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, textAlign: "center", paddingHorizontal: 10 },
});
