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

type AccItem = { q: string; a: string };

const FAQ: AccItem[] = [
  {
    q: "Preciso abrir MEI para dirigir pelo Paraúna Mobi?",
    a: "Sim, é recomendado. A atividade de transporte remunerado de passageiros (CNAE 4929-9/01) se enquadra no Simples Nacional como MEI. O teto de faturamento do MEI é de R$ 81.000/ano (R$ 6.750/mês).",
  },
  {
    q: "Quanto pago de imposto como MEI?",
    a: "O valor mensal do MEI para transporte é de aproximadamente R$ 67,00 por mês, que inclui INSS (12%), ICMS ou ISS (5%). Esse valor pode variar conforme o município.",
  },
  {
    q: "Como declaro meus ganhos no Imposto de Renda?",
    a: "Na declaração anual de IRPF, informe os rendimentos recebidos como motorista de aplicativo. Guarde comprovantes de ganhos e deduza despesas como combustível, manutenção e depreciação do veículo.",
  },
  {
    q: "Tenho direito ao INSS como motorista de app?",
    a: "Sim. Como MEI, você contribui automaticamente para o INSS e tem direito a aposentadoria por idade, auxílio-doença, salário-maternidade e pensão por morte.",
  },
  {
    q: "Posso deduzir despesas com o veículo?",
    a: "Sim. Despesas com combustível, manutenção, seguro, IPVA e depreciação do veículo podem ser deduzidas proporcionalmente do lucro tributável. Guarde sempre as notas fiscais.",
  },
];

function AccordionItem({ item, open, onToggle }: { item: AccItem; open: boolean; onToggle: () => void }) {
  const colors = useColors();
  return (
    <View>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [acc.row, { opacity: pressed ? 0.7 : 1 }]}
      >
        <Text style={[acc.q, { color: colors.foreground }]}>{item.q}</Text>
        <Feather name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
      </Pressable>
      {open && (
        <View style={[acc.answer, { backgroundColor: colors.muted }]}>
          <Text style={[acc.a, { color: colors.foreground }]}>{item.a}</Text>
        </View>
      )}
    </View>
  );
}

const acc = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, gap: 12 },
  q: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  answer: { paddingHorizontal: 16, paddingVertical: 14 },
  a: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
});

type BenefitItem = {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  desc: string;
  color: string;
};

const BENEFITS: BenefitItem[] = [
  { icon: "shield", title: "INSS Simplificado", desc: "Contribuição mensal de ~R$67 garante aposentadoria e benefícios", color: "#3B82F6" },
  { icon: "heart", title: "Auxílio-Doença", desc: "Em caso de incapacidade temporária, receba benefício do INSS", color: "#EF4444" },
  { icon: "dollar-sign", title: "Deduções Fiscais", desc: "Combustível, manutenção e depreciação são dedutíveis", color: "#00D26A" },
  { icon: "user-check", title: "Liberdade de horário", desc: "Trabalhe quando quiser sem vínculo empregatício", color: "#8B5CF6" },
  { icon: "trending-up", title: "Crescimento progressivo", desc: "Quanto mais corridas, mais visibilidade e avaliações positivas", color: "#F59E0B" },
];

export default function DriverTaxScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top;

  const openMei = () => Linking.openURL("https://www.gov.br/empresas-e-negocios/pt-br/empreendedor").catch(() => {});
  const openReceita = () => Linking.openURL("https://www.gov.br/receitafederal/pt-br").catch(() => {});

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Impostos e Benefícios</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>

        <View style={[styles.banner, { backgroundColor: colors.foreground }]}>
          <View style={[styles.bannerIcon, { backgroundColor: colors.accent }]}>
            <Feather name="briefcase" size={24} color={colors.accentForeground} />
          </View>
          <Text style={[styles.bannerTitle, { color: colors.background }]}>Fique em dia com o fisco</Text>
          <Text style={[styles.bannerSub, { color: colors.background, opacity: 0.7 }]}>
            Informações sobre MEI, imposto de renda e benefícios para motoristas parceiros
          </Text>
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Seus benefícios</Text>
        <View style={styles.benefitsGrid}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={[styles.benefitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.benefitIcon, { backgroundColor: b.color + "22" }]}>
                <Feather name={b.icon} size={18} color={b.color} />
              </View>
              <Text style={[styles.benefitTitle, { color: colors.foreground }]}>{b.title}</Text>
              <Text style={[styles.benefitDesc, { color: colors.mutedForeground }]}>{b.desc}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Perguntas frequentes</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {FAQ.map((item, i) => (
            <View key={i}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <AccordionItem
                item={item}
                open={openIndex === i}
                onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              />
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Links úteis</Text>
        <View style={[styles.group, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Pressable
            onPress={openMei}
            style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={[styles.linkIcon, { backgroundColor: "#3B82F622" }]}>
              <Feather name="external-link" size={16} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.linkTitle, { color: colors.foreground }]}>Portal do Empreendedor (MEI)</Text>
              <Text style={[styles.linkSub, { color: colors.mutedForeground }]}>gov.br — Abra ou gerencie seu MEI</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Pressable
            onPress={openReceita}
            style={({ pressed }) => [styles.linkRow, { opacity: pressed ? 0.7 : 1 }]}
          >
            <View style={[styles.linkIcon, { backgroundColor: "#00D26A22" }]}>
              <Feather name="file-text" size={16} color="#00D26A" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.linkTitle, { color: colors.foreground }]}>Receita Federal</Text>
              <Text style={[styles.linkSub, { color: colors.mutedForeground }]}>Declaração de IR e consultas fiscais</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        </View>

        <View style={[styles.disclaimer, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="alert-circle" size={14} color={colors.mutedForeground} />
          <Text style={[styles.disclaimerTxt, { color: colors.mutedForeground }]}>
            As informações acima são apenas orientativas. Consulte um contador ou a Receita Federal para orientações personalizadas.
          </Text>
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
  benefitsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 24 },
  benefitCard: { width: "47%", padding: 14, borderRadius: 16, borderWidth: 1, gap: 8 },
  benefitIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  benefitTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  benefitDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  group: { borderRadius: 18, borderWidth: 1, overflow: "hidden", marginBottom: 20 },
  divider: { height: 1 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
  linkIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  linkTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  linkSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  disclaimer: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1 },
  disclaimerTxt: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
