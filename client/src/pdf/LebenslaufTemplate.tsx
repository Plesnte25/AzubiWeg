import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import "./fonts";
import type { CvContent } from "../api/types";
import { BRAND_GOLD, INK, INK_SOFT, contactParts, dateRange, formatCvDate, fullName } from "./shared";

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Inter",
    fontSize: 10.5,
    color: INK,
    lineHeight: 1.45,
  },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 18 },
  name: { fontSize: 22, fontWeight: 700, lineHeight: 1.2, marginBottom: 6 },
  headline: { fontSize: 11, color: INK_SOFT, marginBottom: 6 },
  contact: { fontSize: 9.5, color: INK_SOFT },
  photo: { width: 96, height: 123, objectFit: "cover", borderRadius: 3, marginLeft: 16 },
  section: { marginBottom: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 700,
    borderBottomWidth: 1.5,
    borderBottomColor: BRAND_GOLD,
    paddingBottom: 2,
    marginBottom: 6,
  },
  row: { flexDirection: "row", marginBottom: 6 },
  dateCell: { width: 118, fontSize: 9.5, color: INK_SOFT, paddingRight: 8 },
  content: { flex: 1 },
  entryTitle: { fontWeight: 700 },
  entrySub: { color: INK_SOFT },
  bullet: { flexDirection: "row", marginTop: 1.5 },
  bulletDot: { width: 10 },
  bulletText: { flex: 1 },
  signature: { marginTop: 24, fontSize: 10.5 },
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ left, children }: { left: string; children: React.ReactNode }) {
  return (
    <View style={styles.row} wrap={false}>
      <Text style={styles.dateCell}>{left}</Text>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

/**
 * Classic tabular German Lebenslauf: photo top-right, Persönliche Daten,
 * date column on the left, closing Ort/Datum signature line.
 */
export default function LebenslaufTemplate({
  content,
  photoDataUrl,
}: {
  content: CvContent;
  photoDataUrl?: string | null;
}) {
  const p = content.personal;
  const personalRows: [string, string | undefined][] = [
    ["Geburtsdatum", formatCvDate(p.birthDate)],
    ["Geburtsort", p.birthPlace],
    ["Staatsangehörigkeit", p.nationality],
  ];

  return (
    <Document title={`Lebenslauf ${fullName(content)}`} author={fullName(content)}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{fullName(content)}</Text>
            {p.headline && <Text style={styles.headline}>{p.headline}</Text>}
            {contactParts(content).map((line) => (
              <Text key={line} style={styles.contact}>
                {line}
              </Text>
            ))}
          </View>
          {photoDataUrl && <Image style={styles.photo} src={photoDataUrl} />}
        </View>

        {personalRows.some(([, v]) => v) && (
          <Section title="Persönliche Daten">
            {personalRows
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <Row key={label} left={label}>
                  <Text>{value}</Text>
                </Row>
              ))}
          </Section>
        )}

        {content.summary ? (
          <Section title="Profil">
            <Text>{content.summary}</Text>
          </Section>
        ) : null}

        {content.experience.length > 0 && (
          <Section title="Berufserfahrung & Praktika">
            {content.experience.map((e) => (
              <Row key={e.id} left={dateRange(e.from, e.to, e.current, "heute")}>
                <Text style={styles.entryTitle}>{e.role}</Text>
                <Text style={styles.entrySub}>{[e.company, e.location].filter(Boolean).join(", ")}</Text>
                {e.bullets.map((b, i) => (
                  <View key={i} style={styles.bullet}>
                    <Text style={styles.bulletDot}>–</Text>
                    <Text style={styles.bulletText}>{b}</Text>
                  </View>
                ))}
              </Row>
            ))}
          </Section>
        )}

        {content.education.length > 0 && (
          <Section title="Schulbildung & Ausbildung">
            {content.education.map((e) => (
              <Row key={e.id} left={dateRange(e.from, e.to, false, "heute")}>
                <Text style={styles.entryTitle}>{e.degree}</Text>
                <Text style={styles.entrySub}>{[e.institution, e.location].filter(Boolean).join(", ")}</Text>
                {e.description && <Text>{e.description}</Text>}
              </Row>
            ))}
          </Section>
        )}

        {content.languages.length > 0 && (
          <Section title="Sprachkenntnisse">
            {content.languages.map((l) => (
              <Row key={l.id} left={l.name}>
                <Text>{l.level}</Text>
              </Row>
            ))}
          </Section>
        )}

        {content.skills.length > 0 && (
          <Section title="Kenntnisse">
            <Text>{content.skills.map((s) => s.name).join(" · ")}</Text>
          </Section>
        )}

        {content.certifications.length > 0 && (
          <Section title="Zertifikate">
            {content.certifications.map((c) => (
              <Row key={c.id} left={formatCvDate(c.date)}>
                <Text>
                  <Text style={styles.entryTitle}>{c.name}</Text>
                  {c.issuer ? ` — ${c.issuer}` : ""}
                </Text>
              </Row>
            ))}
          </Section>
        )}

        {content.interests ? (
          <Section title="Interessen">
            <Text>{content.interests}</Text>
          </Section>
        ) : null}

        {(content.signature.city || content.signature.date) && (
          <Text style={styles.signature}>
            {[content.signature.city, formatCvDate(content.signature.date)].filter(Boolean).join(", ")}
          </Text>
        )}
      </Page>
    </Document>
  );
}
