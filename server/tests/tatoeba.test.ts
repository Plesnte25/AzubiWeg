import { describe, expect, it } from "vitest";
import { containsPhrase, exampleScore, isSimpleExample, tokenizeGerman, usesNounForm, wordForms } from "../src/services/enrichment/tatoeba.js";

describe("tokenizeGerman", () => {
  it("lowercases and keeps umlauts and ß", () => {
    expect(tokenizeGerman("Die Straße ist schön, oder?")).toEqual(["die", "straße", "ist", "schön", "oder"]);
  });
});

describe("wordForms", () => {
  it("adds a noun's plural and declension cells without articles", () => {
    const forms = wordForms("Haus", {
      grammar: "das; Plural: die Häuser",
      declension: { dat: { sg: "dem Haus", pl: "den Häusern" }, gen: { sg: "des Hauses" } },
    });
    expect(forms.sort()).toEqual(["haus", "hauses", "häuser", "häusern"]);
  });

  it("adds a verb's present, past and participle forms but not the auxiliary", () => {
    const forms = wordForms("essen", {
      conjugation: { present: { ich: "esse", du: "isst" }, past: "aß", perfect: "hat gegessen" },
    });
    expect(forms.sort()).toEqual(["aß", "esse", "essen", "gegessen", "isst"]);
  });

  it("reads principal parts from the grammar note when there's no table", () => {
    expect(wordForms("arbeiten", { grammar: "arbeitet, arbeitete, hat gearbeitet" }).sort()).toEqual([
      "arbeiten",
      "arbeitet",
      "arbeitete",
      "gearbeitet",
    ]);
  });
});

describe("exampleScore", () => {
  it("prefers about seven words", () => {
    expect(exampleScore({ de: "Ich habe morgen früh ein Vorstellungsgespräch.", wordCount: 6 })).toBeLessThan(
      exampleScore({ de: "Wir wollen ein Sondervisum beantragen, um hierzubleiben, glaube ich jedenfalls.", wordCount: 10 }),
    );
  });

  it("penalises stock names and pre-reform spelling", () => {
    const plain = exampleScore({ de: "Es ist wichtig, dass Sie pünktlich sind.", wordCount: 7 });
    expect(exampleScore({ de: "Tom ist immer pünktlich gewesen, sagt sie.", wordCount: 7 })).toBeGreaterThan(plain);
    expect(exampleScore({ de: "Es ist wichtig, daß Sie pünktlich sind.", wordCount: 7 })).toBeGreaterThan(plain);
  });
});

describe("containsPhrase", () => {
  it("needs the phrase's words in order and adjacent", () => {
    expect(containsPhrase(tokenizeGerman("Guten Morgen, wie geht's?"), ["guten", "morgen"])).toBe(true);
    expect(containsPhrase(tokenizeGerman("Morgen ist ein guter Tag."), ["guten", "morgen"])).toBe(false);
  });
});

describe("exampleScore grim sentences", () => {
  it("prefers an everyday sentence over a grim one", () => {
    expect(exampleScore({ de: "Ihre Eltern sind beide tot.", wordCount: 5 })).toBeGreaterThan(
      exampleScore({ de: "Meine Eltern wohnen in Köln.", wordCount: 5 }),
    );
  });
});

describe("isSimpleExample", () => {
  it("accepts a short sentence in current spelling", () => {
    expect(isSimpleExample("Man soll die Schokolade im Kühlschrank aufbewahren.")).toBe(true);
  });
  it("rejects long or old-spelling quotations", () => {
    expect(isSimpleExample("Die Werkstätte sind in geringer Anzahl, und die Arbeiter nur einen Theil des Jahres beschäftigt.")).toBe(false);
    expect(isSimpleExample("Ich weiß, daß du kommst.")).toBe(false);
  });
});

describe("usesNounForm", () => {
  it("needs the capitalised form, so a noun doesn't match its verb", () => {
    expect(usesNounForm("Sie wird bis zu fünfzig Dollar zahlen.", ["zahlen"])).toBe(false);
    expect(usesNounForm("Die Zahlen sind richtig.", ["zahlen", "zahl"])).toBe(true);
    expect(usesNounForm("Sprechen Sie Französisch?", ["sprechen"], { midSentence: true })).toBe(false);
  });
});

describe("isSimpleExample alternatives", () => {
  it("rejects slash-separated alternatives", () => {
    expect(isSimpleExample("Du musst nicht Geburtstag haben / Du musst auch nicht Geburtstag feiern")).toBe(false);
  });
});
