import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const FAQ = [
  {
    q: "Como solicitar uma corrida?",
    a: "Na tela inicial, toque em 'Para onde?' e selecione seu destino. Escolha o tipo de corrida (Moto ou Carro) e confirme. Aguarde um motorista aceitar sua solicitação.",
  },
  {
    q: "Como cancelar uma corrida?",
    a: "Durante a busca por motorista, toque no botão 'Cancelar corrida' na tela de acompanhamento. Após um motorista aceitar, o cancelamento pode gerar cobrança de taxa.",
  },
  {
    q: "Como alterar minha forma de pagamento?",
    a: "Vá em Conta → Formas de pagamento. Lá você pode adicionar chaves Pix ou alternar entre Pix e Dinheiro como método padrão.",
  },
  {
    q: "O que fazer se o motorista não chegou?",
    a: "Verifique o status do motorista na tela da corrida. Se o motorista não chegar, cancele a corrida e tente solicitar novamente. Se o problema persistir, entre em contato com o suporte.",
  },
  {
    q: "Como funciona a avaliação do motorista?",
    a: "Ao final de cada corrida, você pode avaliar o motorista com uma nota de 1 a 5 estrelas. Suas avaliações ajudam a manter a qualidade do serviço.",
  },
  {
    q: "Onde vejo meu histórico de corridas?",
    a: "Toque na aba 'Atividade' na barra inferior. Lá você encontra todas as suas corridas passadas com detalhes de rota, valor e data.",
  },
];

export default function HelpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [expanded, setExpanded] = useState<number | null>(null);

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top;

  const openWhatsApp = () => {
    Linking.openURL("https://wa.me/5511900000000").catch(() => {});
  };
  const openEmail = () => {
    Linking.openURL("mailto:suporte@rideshare.com.br").catch(() => {});
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Ajuda e Suporte</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>

        {/* Banner */}
        <View style={[styles.banner, { backgroundColor: colors.foreground }]}>
          <View style={[styles.bannerIcon, { backgroundColor: colors.accent }]}>
            <Feather name="headphones" size={24} color={colors.accentForeground} />
          </View>
          <Text style={[styles.bannerTitle, { color: colors.background }]}>Estamos aqui para ajudar</Text>
          <Text style={[styles.bannerSub, { color: colors.background, opacity: 0.7 }]}>
            Atendimento disponível de segunda a sábado, das 7h às 22h
          </Text>
        </View>

        {/* Contatos rápidos */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Fale conosco</Text>
        <View style={styles.contactRow}>
          <Pressable
            onPress={openWhatsApp}
            style={({ pressed }) => [styles.contactBtn, { backgroundColor: "#25D36622", borderColor: "#25D36644", opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="message-circle" size={22} color="#25D366" />
            <Text style={[styles.contactLabel, { color: "#25D366" }]}>WhatsApp</Text>
            <Text style={[styles.contactSub, { color: colors.mutedForeground }]}>Chat ao vivo</Text>
          </Pressable>
          <Pressable
            onPress={openEmail}
            style={({ pressed }) => [styles.contactBtn, { backgroundColor: "#3B82F622", borderColor: "#3B82F644", opacity: pressed ? 0.7 : 1 }]}
          >
            <Feather name="mail" size={22} color="#3B82F6" />
            <Text style={[styles.contactLabel, { color: "#3B82F6" }]}>E-mail</Text>
            <Text style={[styles.contactSub, { color: colors.mutedForeground }]}>suporte@rideshare.com.br</Text>
          </Pressable>
        </View>

        {/* FAQ */}
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Perguntas frequentes</Text>
        <View style={[styles.faqList, { borderColor: colors.border }]}>
          {FAQ.map((item, i) => {
            const open = expanded === i;
            return (
              <View key={i}>
                {i > 0 && <View style={[styles.faqDivider, { backgroundColor: colors.border }]} />}
                <Pressable
                  onPress={() => setExpanded(open ? null : i)}
                  style={({ pressed }) => [styles.faqRow, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={[styles.faqQ, { color: colors.foreground }]}>{item.q}</Text>
                  <Feather name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
                </Pressable>
                {open && (
                  <View style={[styles.faqAnswer, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.faqA, { color: colors.foreground }]}>{item.a}</Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Avaliação */}
        <View style={[styles.rateBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="star" size={20} color="#F59E0B" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rateTitle, { color: colors.foreground }]}>Avaliar o app</Text>
            <Text style={[styles.rateSub, { color: colors.mutedForeground }]}>Sua opinião melhora o RideShare</Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </View>
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
  banner: { borderRadius: 22, padding: 24, alignItems: "center", gap: 10, marginBottom: 28 },
  bannerIcon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  bannerTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  bannerSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 12, marginTop: 4 },
  contactRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  contactBtn: { flex: 1, alignItems: "center", padding: 16, borderRadius: 18, borderWidth: 1, gap: 6 },
  contactLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  contactSub: { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
  faqList: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 24 },
  faqDivider: { height: 1 },
  faqRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  faqQ: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  faqAnswer: { paddingHorizontal: 16, paddingVertical: 14 },
  faqA: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  rateBox: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 16, borderWidth: 1 },
  rateTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  rateSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
