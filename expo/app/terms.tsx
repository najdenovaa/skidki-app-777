import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { LEGAL_META, LEGAL_BLOCKS } from "@/constants/legalContent";
import type { LegalBlock } from "@/constants/legalContent";

function Section({ title, paragraphs, subheadings }: LegalBlock) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {paragraphs.map((p, i) => (
        <Text key={`p${i}`} style={styles.para}>{p}</Text>
      ))}
      {subheadings?.map((sh, si) => (
        <View key={`sh${si}`}>
          <Text style={styles.subheading}>{sh.title}</Text>
          {sh.paragraphs.map((p, pi) => (
            <Text key={`shp${pi}`} style={styles.para}>{p}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

export default function TermsScreen() {
  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: LEGAL_META.title,
          headerStyle: { backgroundColor: Colors.background },
          headerShadowVisible: false,
          headerTintColor: Colors.text,
        }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{LEGAL_META.title}</Text>
          <Text style={styles.subtitle}>{LEGAL_META.subtitle}</Text>
        </View>

        {LEGAL_BLOCKS.map((block, i) => (
          <Section key={i} {...block} />
        ))}

        <View style={styles.bottom} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: {
    paddingTop: 8,
    paddingBottom: 24,
    gap: 6,
  },
  title: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: -0.2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: Colors.text,
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
    letterSpacing: -0.2,
    marginTop: 10,
    marginBottom: 4,
  },
  para: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  bottom: { height: 60 },
});
