import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import "./fonts";
import type { CvContent } from "../api/types";
import { contactParts, dateRange, formatCvDate, fullName } from "./shared";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Inter",
    fontSize: 10.5,
    color: "#111111",
    lineHeight: 1.45,
  },
  name: { fontSize: 20, fontWeight: 700, lineHeight: 1.2, marginBottom: 4 },
  contact: { fontSize: 9.5, color: "#444444", marginTop: 2, marginBottom: 14 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    marginTop: 10,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  entry: { marginBottom: 6 },
  entryHead: { flexDirection: "row", justifyContent: "space-between" },
  entryTitle: { fontWeight: 700 },
  entrySub: { color: "#444444" },
  date: { color: "#444444", fontSize: 9.5 },
  bullet: { flexDirection: "row", marginTop: 1.5 },
  bulletDot: { width: 10 },
  bulletText: { flex: 1 },
});

/**
 * Single-column ATS-friendly template: plain uppercase section headers, text
 * bullets, no graphics — and deliberately no photo, birth data, or
 * nationality even when present in the content (anglosphere/ATS norms).
 */
export default function AtsTemplate({ content }: { content: CvContent }) {
  return (
    <Document title={`CV ${fullName(content)}`} author={fullName(content)}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{fullName(content)}</Text>
        {content.personal.headline && <Text>{content.personal.headline}</Text>}
        <Text style={styles.contact}>{contactParts(content).join("  ·  ")}</Text>

        {content.summary ? (
          <View>
            <Text style={styles.sectionTitle}>Summary</Text>
            <Text>{content.summary}</Text>
          </View>
        ) : null}

        {content.experience.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Experience</Text>
            {content.experience.map((e) => (
              <View key={e.id} style={styles.entry} wrap={false}>
                <View style={styles.entryHead}>
                  <Text style={styles.entryTitle}>{e.role}</Text>
                  <Text style={styles.date}>{dateRange(e.from, e.to, e.current, "present")}</Text>
                </View>
                <Text style={styles.entrySub}>{[e.company, e.location].filter(Boolean).join(", ")}</Text>
                {e.bullets.map((b, i) => (
                  <View key={i} style={styles.bullet}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {content.education.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Education</Text>
            {content.education.map((e) => (
              <View key={e.id} style={styles.entry} wrap={false}>
                <View style={styles.entryHead}>
                  <Text style={styles.entryTitle}>{e.degree}</Text>
                  <Text style={styles.date}>{dateRange(e.from, e.to, false, "present")}</Text>
                </View>
                <Text style={styles.entrySub}>{[e.institution, e.location].filter(Boolean).join(", ")}</Text>
                {e.description && <Text>{e.description}</Text>}
              </View>
            ))}
          </View>
        )}

        {content.skills.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Skills</Text>
            <Text>{content.skills.map((s) => s.name).join(", ")}</Text>
          </View>
        )}

        {content.languages.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Languages</Text>
            <Text>{content.languages.map((l) => `${l.name} (${l.level})`).join(", ")}</Text>
          </View>
        )}

        {content.certifications.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Certifications</Text>
            {content.certifications.map((c) => (
              <Text key={c.id}>
                {c.name}
                {c.issuer ? ` — ${c.issuer}` : ""}
                {c.date ? ` (${formatCvDate(c.date)})` : ""}
              </Text>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
