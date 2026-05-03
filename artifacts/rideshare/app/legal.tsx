import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const TERMS = `1. ACEITAÇÃO DOS TERMOS

Ao utilizar o RideShare, você concorda com estes Termos de Uso. Se não concordar, não use o serviço.

2. DESCRIÇÃO DO SERVIÇO

O RideShare é uma plataforma de intermediação entre passageiros e motoristas parceiros para prestação de serviços de transporte privado individual remunerado, conforme previsto na Lei nº 13.640/2018.

3. CADASTRO E CONTA

Para usar o serviço, você deve fornecer informações verdadeiras, completas e atualizadas. Você é responsável pela segurança de sua conta e senha.

4. USO DO SERVIÇO

É proibido usar o RideShare para fins ilegais, fraudar o sistema de pagamentos, criar contas falsas ou prejudicar outros usuários e motoristas.

5. PAGAMENTOS

Os pagamentos podem ser realizados via Pix ou dinheiro diretamente ao motorista. As tarifas são calculadas com base na distância e tipo de corrida escolhido.

6. CANCELAMENTO

Corridas podem ser canceladas antes ou após a aceitação pelo motorista. Cancelamentos frequentes ou após a chegada do motorista podem gerar taxas.

7. AVALIAÇÕES

Passageiros e motoristas podem se avaliar mutuamente após cada corrida. Avaliações devem ser honestas e respeitosas.

8. RESPONSABILIDADE

O RideShare atua como intermediador e não é responsável por danos decorrentes da prestação do serviço de transporte, que é de responsabilidade dos motoristas parceiros.

9. PRIVACIDADE

O uso de seus dados pessoais é regido pela nossa Política de Privacidade, disponível neste mesmo documento.

10. ALTERAÇÕES

Estes termos podem ser alterados a qualquer momento. O uso continuado do serviço após as alterações implica na aceitação dos novos termos.`;

const PRIVACY = `POLÍTICA DE PRIVACIDADE — RIDESHARE

Última atualização: 01 de janeiro de 2025

1. DADOS COLETADOS

Coletamos: nome completo, e-mail, telefone, localização durante corridas, histórico de viagens e informações de pagamento (apenas tipo e chave Pix, sem dados bancários completos).

2. USO DOS DADOS

Seus dados são utilizados para: processar corridas, melhorar o serviço, comunicar promoções (com seu consentimento), cumprir obrigações legais e garantir a segurança da plataforma.

3. COMPARTILHAMENTO

Compartilhamos apenas os dados necessários com motoristas para realização da corrida (nome e localização). Não vendemos seus dados a terceiros.

4. LOCALIZAÇÃO

A coleta de localização ocorre apenas durante corridas ativas. Você pode negar permissão, mas isso impedirá o uso do serviço.

5. SEGURANÇA

Utilizamos criptografia e boas práticas de segurança para proteger seus dados. Em caso de incidente, você será notificado conforme a LGPD.

6. SEUS DIREITOS (LGPD)

Você tem direito a: acessar seus dados, corrigir informações incorretas, solicitar exclusão da conta e dos dados, portabilidade e oposição ao tratamento.

7. COOKIES

Utilizamos cookies e tecnologias similares para manter sua sessão e melhorar sua experiência no aplicativo.

8. CONTATO

Para exercer seus direitos ou tirar dúvidas: privacidade@rideshare.com.br

9. MENORES

O serviço é destinado a maiores de 18 anos. Não coletamos intencionalmente dados de menores de idade.`;

export default function LegalScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [tab, setTab] = useState<"terms" | "privacy">("terms");

  const isWeb = Platform.OS === "web";
  const topPad = isWeb ? Math.max(insets.top, 24) : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.iconBtn, { backgroundColor: colors.muted, opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Termos legais</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Abas */}
      <View style={[styles.tabs, { borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        {(["terms", "privacy"] as const).map((t) => {
          const active = tab === t;
          const label = t === "terms" ? "Termos de uso" : "Privacidade";
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              style={[styles.tabBtn, active && { borderBottomColor: colors.accent, borderBottomWidth: 2 }]}
            >
              <Text style={[styles.tabTxt, { color: active ? colors.accent : colors.mutedForeground }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.docBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.docHeader}>
            <Feather
              name={tab === "terms" ? "file-text" : "shield"}
              size={20}
              color={colors.accent}
            />
            <Text style={[styles.docTitle, { color: colors.foreground }]}>
              {tab === "terms" ? "Termos de Uso — RideShare" : "Política de Privacidade — RideShare"}
            </Text>
          </View>
          <Text style={[styles.docText, { color: colors.foreground }]}>
            {tab === "terms" ? TERMS : PRIVACY}
          </Text>
        </View>

        <View style={[styles.dateBox, { backgroundColor: colors.muted }]}>
          <Feather name="calendar" size={14} color={colors.mutedForeground} />
          <Text style={[styles.dateTxt, { color: colors.mutedForeground }]}>
            Documento vigente desde 1º de janeiro de 2025
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
  tabs: { flexDirection: "row", borderBottomWidth: 1 },
  tabBtn: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabTxt: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  content: { padding: 20, gap: 16 },
  docBox: { borderRadius: 18, borderWidth: 1, padding: 20 },
  docHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  docTitle: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  docText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 22 },
  dateBox: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12 },
  dateTxt: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
