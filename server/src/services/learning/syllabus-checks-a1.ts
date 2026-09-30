/**
 * A1 checked exercises (KNOWN_ISSUES #38). Before this, 105 of the 135 A1 topics "passed" on any 12+ characters.
 * Each topic here gets a real lesson (the rule, the forms, examples — what the check tests) and a check_set that
 * tests exactly that lesson: fill-ins list every correct answer (compared without case, punctuation, ä/ae, ß/ss),
 * choices have one right option. 80 % passes. Speaking topics become recordings instead (speaking_audio).
 *
 * Authoring rules: test the topic's own skill, not incidental vocabulary; one unambiguous answer per gap, or list
 * every accepted variant; give the cue a learner needs (the infinitive, the English meaning) in the prompt.
 */
import { checks, gap, hintGap, listen, pick, read, speak, type Authored } from "./syllabus-checks-kit.js";

// ── grammar ──────────────────────────────────────────────────────────────────

const GRAMMAR: Record<string, Authored> = {
  "The German alphabet & sound system": {
    learningOutcome: "I can connect German spellings to their sounds: ei/ie, sch, ch, w, v, z, ß and the umlauts.",
    resourceBody:
      "German is spelled almost the way it sounds, once you know a handful of rules:\n" +
      "• ei sounds like English \"eye\": mein, drei. ie is a long \"ee\": Liebe, vier. (Say the second letter.)\n" +
      "• sch = \"sh\" (Schule), sp/st at the start of a word = \"shp/sht\" (Sport, Straße).\n" +
      "• w = English \"v\" (Wasser), v = usually \"f\" (Vater), z = \"ts\" (Zug), j = \"y\" (ja).\n" +
      "• ß is a sharp \"ss\" after a long vowel or ei/au: Straße, heißen. After a short vowel it's ss: Wasser, Klasse.\n" +
      "• ä, ö, ü change the vowel: Apfel → Äpfel, schon → schön, Mutter → Mütter. Without an umlaut key, write ae, oe, ue.\n" +
      "• Spelling out loud: A (ah), E (eh), I (ee), J (yot), V (fow), W (veh), Y (üpsilon), Z (tset).",
    guidedPractice: "Spell your name and your city aloud with the German letter names, then read: Wein, Wien, Schule, Straße, Zug.",
    ...checks("Wähle die richtige Antwort. (Choose the right answer.)", [
      pick("In „vier“ (four), the „ie“ sounds like …", ["ee as in 'see'", "eye as in 'my'", "two separate vowels"], 0),
      pick("In „mein“ (my), the „ei“ sounds like …", ["ee as in 'see'", "eye as in 'my'", "ay as in 'day'"], 1),
      pick("How does „Wasser“ start?", ["like English 'water'", "like English 'vase'", "like English 'fast'"], 1),
      pick("Which word is spelled correctly?", ["Strasse", "Straße", "Strase"], 1),
      gap("Without an umlaut key, „Mädchen“ is written M___dchen.", "ae"),
      pick("How do you say the letter „Z“?", ["zet", "tset", "zee"], 1),
    ]),
  },
  "sein & haben": {
    learningOutcome: "I can use every present-tense form of sein (to be) and haben (to have).",
    resourceBody:
      "sein (to be): ich bin · du bist · er/sie/es ist · wir sind · ihr seid · sie/Sie sind\n" +
      "haben (to have): ich habe · du hast · er/sie/es hat · wir haben · ihr habt · sie/Sie haben\n\n" +
      "Ich bin müde. — Du hast Zeit. — Das ist mein Bruder. — Wir haben ein Auto. — Ihr seid spät. — Sind Sie Frau Kaya?\n" +
      "Watch the traps: du hast (not habst), er hat (not habt), ihr seid (not seit).",
    guidedPractice: "Say both verbs through all persons twice, then make one true sentence each: Ich bin … / Ich habe …",
    ...checks("Setze sein oder haben in der richtigen Form ein. (Fill in sein or haben.)", [
      hintGap("Ich ___ heute zu Hause.", "sein", "bin"),
      hintGap("Du ___ einen Bruder, oder?", "haben", "hast"),
      hintGap("Mein Vater ___ Lehrer.", "sein", "ist"),
      hintGap("Wir ___ keine Zeit.", "haben", "haben"),
      hintGap("Ihr ___ sehr nett.", "sein", "seid"),
      hintGap("Frau Lang ___ zwei Kinder.", "haben", "hat"),
    ]),
  },
  "Regular conjugation": {
    learningOutcome: "I can conjugate regular verbs in the present tense.",
    resourceBody:
      "Take the infinitive, drop -en to get the stem, add the ending:\n" +
      "wohnen → wohn-: ich wohne · du wohnst · er/sie/es wohnt · wir wohnen · ihr wohnt · sie/Sie wohnen\n\n" +
      "Stems ending in -t or -d add an -e- before -st and -t: arbeiten → du arbeitest, er arbeitet, ihr arbeitet.\n" +
      "Stems ending in -s, -ß, -z only add -t for du: heißen → du heißt, tanzen → du tanzt.\n\n" +
      "Ich lerne Deutsch. — Du kommst aus Indien. — Sie macht Sport. — Wir spielen Fußball. — Arbeitest du heute?",
    guidedPractice: "Conjugate lernen, kommen and arbeiten aloud, then say where you live and what you learn.",
    ...checks("Setze das Verb in der richtigen Form ein. (Conjugate the verb.)", [
      hintGap("Ich ___ in Hamburg.", "wohnen", "wohne"),
      hintGap("Du ___ aus Indien.", "kommen", "kommst"),
      hintGap("Er ___ jeden Tag Deutsch.", "lernen", "lernt"),
      hintGap("Wir ___ am Samstag Fußball.", "spielen", "spielen"),
      hintGap("___ du heute bis fünf Uhr?", "arbeiten", "Arbeitest"),
      hintGap("Wie ___ du?", "heißen", "heißt"),
    ]),
  },
  "Stem-changing verbs": {
    learningOutcome: "I can use the vowel change in du and er/sie/es forms of stem-changing verbs.",
    resourceBody:
      "Some verbs change their stem vowel — only for du and er/sie/es. The other forms stay regular.\n" +
      "e → i: sprechen → du sprichst, er spricht · essen → du isst, er isst · geben → du gibst, er gibt · nehmen → du nimmst, er nimmt\n" +
      "e → ie: lesen → du liest, er liest · sehen → du siehst, er sieht\n" +
      "a → ä: fahren → du fährst, er fährt · schlafen → du schläfst, er schläft · laufen (au → äu) → du läufst, er läuft\n\n" +
      "But: ich spreche, wir sprechen, ihr sprecht — no change.",
    guidedPractice: "Say du and er forms of sprechen, lesen, fahren, essen, nehmen; then ask a partner: Was liest du gerade?",
    ...checks("Setze das Verb in der richtigen Form ein. (Watch the vowel.)", [
      hintGap("Sie ___ drei Sprachen.", "sprechen · she", "spricht"),
      hintGap("___ du gern Bücher?", "lesen", "Liest"),
      hintGap("Er ___ mit dem Zug nach Berlin.", "fahren", "fährt"),
      hintGap("Was ___ du zum Frühstück?", "essen", "isst"),
      hintGap("Wir ___ den Bus um acht.", "nehmen", "nehmen"),
      hintGap("Mein Sohn ___ bis zehn Uhr.", "schlafen", "schläft"),
    ]),
  },
  "wissen & möchten": {
    learningOutcome: "I can use wissen (to know a fact) and möchten (would like), including their irregular forms.",
    resourceBody:
      "wissen: ich weiß · du weißt · er/sie/es weiß · wir wissen · ihr wisst · sie/Sie wissen\n" +
      "möchten: ich möchte · du möchtest · er/sie/es möchte · wir möchten · ihr möchtet · sie/Sie möchten\n\n" +
      "Note: ich and er have the same form, with no -t: ich weiß, er weiß; ich möchte, sie möchte.\n" +
      "wissen = know a fact (Ich weiß die Antwort). A person or place you know is kennen (Ich kenne Anna).\n" +
      "möchten + noun or + infinitive at the end: Ich möchte einen Kaffee. Ich möchte Deutsch lernen.",
    guidedPractice: "Order three things politely with möchte, and answer „Weißt du, wie spät es ist?“ in two ways.",
    ...checks("Setze die richtige Form ein.", [
      hintGap("Ich ___ nicht, wo der Bahnhof ist.", "wissen", "weiß"),
      hintGap("___ du, wann der Kurs beginnt?", "wissen", "Weißt"),
      hintGap("Er ___ einen Tee, bitte.", "möchten", "möchte"),
      hintGap("___ ihr heute Abend ins Kino gehen?", "möchten", "Möchtet"),
      pick("Welches Verb passt? Ich ___ Herrn Schulz schon lange.", ["weiß", "kenne", "möchte"], 1),
      hintGap("Wir ___ die Adresse leider nicht.", "wissen", "wissen"),
    ]),
  },
  "Gender: der / die / das": {
    learningOutcome: "I can name the article of common nouns and use the reliable gender clues.",
    resourceBody:
      "Every noun has a gender: der (masculine), die (feminine), das (neuter). Learn each noun with its article.\n" +
      "Reliable clues:\n" +
      "• die: -ung (die Wohnung), -heit/-keit (die Freiheit), -ion (die Station), -schaft, -tät; most nouns in -e (die Tasche)\n" +
      "• das: -chen/-lein (das Mädchen), -um (das Zentrum), -ment; verbs as nouns (das Essen)\n" +
      "• der: days, months, seasons (der Montag, der Mai, der Sommer); -er for people doing something (der Lehrer); -ismus\n" +
      "• A compound takes the gender of its last part: die Tür + der Schlüssel → der Türschlüssel.",
    guidedPractice: "Say the article with ten objects around you. Sort them into der / die / das piles.",
    ...checks("Welcher Artikel ist richtig?", [
      pick("___ Wohnung", ["der", "die", "das"], 1),
      pick("___ Mädchen", ["der", "die", "das"], 2),
      pick("___ Montag", ["der", "die", "das"], 0),
      pick("___ Information", ["der", "die", "das"], 1),
      pick("___ Kinderzimmer (das Kind + das Zimmer)", ["der", "die", "das"], 2),
      pick("___ Lehrer", ["der", "die", "das"], 0),
    ]),
  },
  "Indefinite articles: ein / eine": {
    learningOutcome: "I can use ein/eine and know when German uses no article.",
    resourceBody:
      "Indefinite article (a/an): der → ein, das → ein, die → eine. Plural has none: Ich habe Kinder.\n" +
      "Ein Tisch, ein Buch, eine Lampe.\n\n" +
      "No article with:\n" +
      "• professions and nationalities after sein/werden: Ich bin Krankenpfleger. Sie ist Inderin.\n" +
      "• uncountable things in general: Ich trinke Kaffee. Wir brauchen Milch.\n" +
      "• names of most countries and cities: Ich komme aus Indien. (But: aus der Türkei, aus der Schweiz.)",
    guidedPractice: "Describe your room with ein/eine (Da ist ein Bett …) and say your job without an article.",
    ...checks("ein, eine — oder kein Artikel? Write „-“ if no article.", [
      gap("Das ist ___ Lampe.", "eine"),
      gap("Ich habe ___ Fahrrad.", "ein"),
      gap("Maria ist ___ Ärztin.", "-", "—", "–"),
      gap("Da ist ___ Supermarkt.", "ein"),
      gap("Ich komme aus ___ Indien.", "-", "—", "–"),
      gap("Hast du ___ Frage?", "eine"),
    ]),
  },
  "Plural forms": {
    learningOutcome: "I can form common noun plurals and know the article is always die.",
    resourceBody:
      "In the plural the article is always die. The ending depends on the noun — learn it with the noun:\n" +
      "-e: der Tag → die Tage, der Tisch → die Tische · with umlaut: der Stuhl → die Stühle\n" +
      "-(e)n: die Lampe → die Lampen, die Frau → die Frauen, die Zeitung → die Zeitungen (all -ung, -heit, -keit)\n" +
      "-er (+ umlaut): das Kind → die Kinder, das Buch → die Bücher, das Haus → die Häuser\n" +
      "-s: das Auto → die Autos, das Handy → die Handys (loanwords, words ending in a vowel)\n" +
      "no ending (-er/-el/-en nouns, sometimes umlaut): der Lehrer → die Lehrer, der Apfel → die Äpfel\n" +
      "Dictionaries show it as: der Tisch, -e · das Buch, ¨-er.",
    guidedPractice: "Count objects around you: ein Stuhl, zwei Stühle … Say five plurals aloud with die.",
    ...checks("Schreib den Plural. (Write the plural noun.)", [
      gap("das Kind → zwei ___", "Kinder"),
      gap("die Lampe → drei ___", "Lampen"),
      gap("das Auto → zwei ___", "Autos"),
      gap("der Stuhl → vier ___", "Stühle"),
      gap("das Buch → viele ___", "Bücher"),
      pick("Der Artikel im Plural ist immer …", ["der", "die", "das"], 1),
    ]),
  },
  "Negation with kein / keine": {
    learningOutcome: "I can negate nouns with kein/keine and everything else with nicht.",
    resourceBody:
      "kein replaces ein (or no article): Ich habe ein Auto → Ich habe kein Auto. Ich habe Zeit → Ich habe keine Zeit.\n" +
      "kein takes the same endings as ein: kein Tisch, kein Buch, keine Lampe, keine Kinder (plural: keine).\n" +
      "In the accusative, masculine gets -en: Ich habe keinen Bruder.\n\n" +
      "nicht negates verbs, adjectives, names and nouns with der/die/das/mein: Ich arbeite nicht. Das ist nicht teuer. Das ist nicht mein Buch.",
    guidedPractice: "Say three things you don't have (Ich habe kein…) and three things you don't do (Ich … nicht).",
    ...checks("kein, keine, keinen — oder nicht?", [
      gap("Ich habe ___ Auto.", "kein"),
      gap("Wir haben heute ___ Zeit.", "keine"),
      gap("Er hat ___ Bruder.", "keinen"),
      gap("Das ist ___ mein Handy.", "nicht"),
      gap("Sie trinkt ___ Kaffee.", "keinen"),
      gap("Ich arbeite heute ___.", "nicht"),
    ]),
  },
  "Nominative: the subject case": {
    learningOutcome: "I can find the subject of a sentence and use nominative articles and pronouns.",
    resourceBody:
      "The subject (Wer? Was? — who/what does something) is in the nominative. Nominative articles are the dictionary forms:\n" +
      "der / ein / kein (masc.) · die / eine / keine (fem.) · das / ein / kein (neut.) · die / keine (plural)\n\n" +
      "The subject doesn't have to come first — the ending tells you: Heute kommt der Lehrer. (Wer kommt? der Lehrer.)\n" +
      "After sein, the other noun is nominative too: Das ist der Chef. Er ist ein Freund.",
    guidedPractice: "Underline the subject in five sentences of your textbook and ask „Wer oder was …?“ for each.",
    ...checks("Wähle das Subjekt / den richtigen Artikel.", [
      pick("Heute kauft mein Bruder ein Auto. — Wer kauft?", ["heute", "mein Bruder", "ein Auto"], 1),
      gap("___ Kaffee ist heiß. (der/die/das)", "Der"),
      gap("Das ist ___ Tasche von Anna. (der/die/das)", "die"),
      gap("Hier wohnt ___ Familie Weber. (der/die/das)", "die"),
      pick("Morgen besucht uns der Onkel. — Wer besucht uns?", ["morgen", "uns", "der Onkel"], 2),
      gap("___ Kind spielt im Garten. (der/die/das)", "Das"),
    ]),
  },
  "Accusative articles: den / einen": {
    learningOutcome: "I can use accusative articles for the direct object — only masculine changes.",
    resourceBody:
      "The direct object (Wen? Was? — whom/what) is in the accusative. Only the masculine changes:\n" +
      "der → den · ein → einen · kein → keinen · mein → meinen\n" +
      "die, das and plural stay the same: Ich sehe die Frau, das Kind, die Kinder.\n\n" +
      "Ich kaufe einen Tisch. Wir besuchen den Onkel. Hast du keinen Hunger?\n" +
      "Verbs with an accusative object: haben, kaufen, brauchen, sehen, besuchen, trinken, essen, möchten, suchen.",
    guidedPractice: "Say what you need for a new flat: Ich brauche einen Tisch, eine Lampe, ein Bett …",
    ...checks("Setze den Artikel im Akkusativ ein.", [
      gap("Ich sehe ___ Mann. (der)", "den"),
      gap("Wir kaufen ___ Tisch. (ein)", "einen"),
      gap("Sie trinkt ___ Tee. (ein)", "einen"),
      gap("Ich brauche ___ Lampe. (eine)", "eine"),
      gap("Er besucht ___ Kind. (das)", "das"),
      gap("Hast du ___ Stift? (ein)", "einen"),
    ]),
  },
  "Accusative pronouns": {
    learningOutcome: "I can replace a direct object with mich, dich, ihn, sie, es, uns, euch, sie/Sie.",
    resourceBody:
      "nominative → accusative: ich → mich · du → dich · er → ihn · sie → sie · es → es · wir → uns · ihr → euch · sie/Sie → sie/Sie\n" +
      "Only ich, du, er, wir, ihr change form; sie, es, Sie stay the same.\n\n" +
      "Kennst du den Lehrer? — Ja, ich kenne ihn. · Wo ist die Tasche? — Ich sehe sie nicht. · Ich liebe dich. · Wir besuchen euch morgen.",
    guidedPractice: "Answer with a pronoun: Magst du den Film? Kaufst du das Buch? Besuchst du deine Eltern?",
    ...checks("Setze das Pronomen im Akkusativ ein.", [
      gap("Kennst du den Lehrer? — Ja, ich kenne ___.", "ihn"),
      gap("Wo ist die Tasche? — Ich sehe ___ nicht.", "sie"),
      gap("Ich rufe ___ morgen an. (du)", "dich"),
      gap("Besucht ihr ___ am Sonntag? (wir)", "uns"),
      gap("Das Buch ist gut. Ich kaufe ___.", "es"),
      gap("Kannst du ___ hören? (ich)", "mich"),
    ]),
  },
  "Personal pronouns": {
    learningOutcome: "I can use the subject pronouns and choose between du, ihr and Sie.",
    resourceBody:
      "ich (I) · du (you, informal) · er (he / masc. thing) · sie (she / fem. thing) · es (it / neut. thing) · wir (we) · ihr (you all, informal) · sie (they) · Sie (you, formal — singular and plural)\n\n" +
      "Pronouns follow the grammatical gender: der Tisch → er, die Lampe → sie, das Auto → es.\n" +
      "du for friends, family, children; Sie (always capital) for adults you don't know, at work, in offices.\n" +
      "sie ist (she is) vs. sie sind (they are) vs. Sie sind (you are, formal) — the verb and the capital tell you which.",
    guidedPractice: "Replace the nouns with pronouns in five sentences, and greet a stranger and a friend correctly.",
    ...checks("Setze das richtige Pronomen ein.", [
      gap("Das ist Herr Braun. ___ kommt aus Bremen.", "Er"),
      gap("Wo ist die Lampe? — ___ ist im Wohnzimmer.", "Sie"),
      gap("Das Auto ist neu. ___ ist rot.", "Es"),
      gap("Anna und ich lernen Deutsch. ___ lernen jeden Tag.", "Wir"),
      pick("At the Bürgeramt you ask the clerk: „Können ___ mir helfen?“", ["du", "ihr", "Sie"], 2),
      gap("Paul und Lisa, kommt ___ mit?", "ihr"),
    ]),
  },
  "Possessive articles": {
    learningOutcome: "I can use mein, dein, sein, ihr, unser, euer, Ihr with the right ending.",
    resourceBody:
      "ich → mein · du → dein · er/es → sein · sie → ihr · wir → unser · ihr → euer · sie → ihr · Sie → Ihr\n" +
      "They take the endings of ein: mein Vater, meine Mutter, mein Kind, meine Eltern (plural -e).\n" +
      "Accusative masculine -en: Ich besuche meinen Bruder.\n" +
      "euer drops an e before an ending: eure Wohnung.\n" +
      "Careful: sein = his, ihr = her/their, Ihr = your (formal). Peter und seine Frau · Anna und ihr Mann.",
    guidedPractice: "Introduce your family: Das ist mein …, meine …; and say one thing about a friend's family with sein/ihr.",
    ...checks("Setze den Possessivartikel ein.", [
      gap("Das ist ___ Mutter. (ich)", "meine"),
      gap("Anna und ___ Mann wohnen in Köln. (her husband)", "ihr"),
      gap("Peter besucht ___ Schwester. (his sister)", "seine"),
      gap("Wie ist ___ Name? (Sie — formal)", "Ihr"),
      gap("Ich besuche ___ Bruder. (ich, accusative)", "meinen"),
      gap("Ist das ___ Auto? (ihr — you all)", "euer"),
    ]),
  },
  "Verb in second position": {
    learningOutcome: "I can keep the conjugated verb in position 2, even when the sentence starts with time or place.",
    resourceBody:
      "In a German statement the conjugated verb is always the 2nd element (not always the 2nd word):\n" +
      "Ich | lerne | heute Deutsch.\n" +
      "Heute | lerne | ich Deutsch.  (time first → subject moves behind the verb)\n" +
      "In Berlin | wohnt | meine Schwester.\n" +
      "Nach dem Kurs | gehen | wir essen.\n" +
      "und, aber, oder don't count as a position: Ich komme, aber er bleibt.",
    guidedPractice: "Say one sentence three ways, starting with the subject, a time and a place.",
    ...checks("Wähle den richtigen Satz. (Choose the correct word order.)", [
      pick("today — I — work — from home", ["Heute ich arbeite von zu Hause.", "Heute arbeite ich von zu Hause.", "Heute ich von zu Hause arbeite."], 1),
      pick("in Köln — my brother — lives", ["In Köln wohnt mein Bruder.", "In Köln mein Bruder wohnt.", "Mein Bruder in Köln wohnt."], 0),
      pick("tomorrow — we — go — to the cinema", ["Morgen wir gehen ins Kino.", "Wir morgen gehen ins Kino.", "Morgen gehen wir ins Kino."], 2),
      gap("Am Montag ___ ich einen Termin. (haben)", "habe"),
      gap("Um acht Uhr ___ der Kurs. (beginnen)", "beginnt"),
      pick("Which sentence is wrong?", ["Jetzt esse ich.", "Ich esse jetzt.", "Jetzt ich esse."], 2),
    ]),
  },
  "Yes/no questions": {
    learningOutcome: "I can ask yes/no questions with the verb first and answer with ja, nein or doch.",
    resourceBody:
      "Yes/no questions start with the conjugated verb, then the subject:\n" +
      "Du kommst mit. → Kommst du mit?  ·  Sie wohnen in Köln. → Wohnen Sie in Köln?  ·  Hast du Zeit?\n\n" +
      "Answers: Ja, … / Nein, …\n" +
      "doch contradicts a negative question: Kommst du nicht? — Doch, ich komme! (= Yes, I am coming.)",
    guidedPractice: "Turn five statements about yourself into questions for a partner and answer them.",
    ...checks("Frage oder Antwort?", [
      pick("You want to ask whether Anna works today.", ["Anna arbeitet heute?", "Arbeitet Anna heute?", "Heute Anna arbeitet?"], 1),
      gap("___ du Kinder? (haben)", "Hast"),
      gap("___ Sie aus Spanien? (kommen, formal)", "Kommen"),
      pick("Hast du keine Zeit? — ___, ich habe Zeit!", ["Ja", "Nein", "Doch"], 2),
      pick("Bist du müde? — ___, ich bin nicht müde.", ["Ja", "Nein", "Doch"], 1),
      gap("___ ihr am Wochenende zu Hause? (sein)", "Seid"),
    ]),
  },
  "W-questions": {
    learningOutcome: "I can ask open questions with the right question word and the verb in position 2.",
    resourceBody:
      "W-word first, verb second, then the subject:\n" +
      "wer (who) · was (what) · wo (where) · woher (where from) · wohin (where to) · wann (when) · wie (how) · warum (why) · wie viel (how much) · wie alt (how old)\n\n" +
      "Woher kommst du? — Aus Indien. · Wo wohnst du? — In Stuttgart. · Wohin fährst du? — Nach Berlin.\n" +
      "Wann beginnt der Kurs? — Um neun. · Wie viel kostet das? — Drei Euro.\n" +
      "wo = location (in), wohin = direction (to), woher = origin (from).",
    guidedPractice: "Write six questions to get to know someone, each with a different W-word, and answer them.",
    ...checks("Setze das richtige Fragewort ein.", [
      gap("___ kommst du? — Aus der Türkei.", "Woher"),
      gap("___ wohnen Sie? — In München.", "Wo"),
      gap("___ beginnt der Film? — Um 20 Uhr.", "Wann"),
      gap("___ fährst du im Urlaub? — Nach Spanien.", "Wohin"),
      gap("___ kostet die Jacke? — 49 Euro.", "Wie viel", "Wieviel"),
      gap("___ lernst du Deutsch? — Weil ich in Deutschland arbeiten möchte.", "Warum", "Wieso", "Weshalb"),
    ]),
  },
  "Position of nicht": {
    learningOutcome: "I can place nicht correctly: at the end, or before what it negates.",
    resourceBody:
      "nicht negating the whole sentence goes to the end — but before a second verb part, a separable prefix, an adjective after sein, or a place/direction:\n" +
      "Ich komme nicht. · Ich kenne ihn nicht. · Ich kann heute nicht kommen. · Ich rufe dich nicht an.\n" +
      "Das ist nicht teuer. · Ich wohne nicht in Berlin. · Ich fahre nicht nach Hause.\n" +
      "Before a time or place it negates only that part: Ich komme nicht heute, sondern morgen.",
    guidedPractice: "Negate: Ich arbeite heute. Ich kann gut kochen. Ich stehe früh auf. Das Hotel ist billig.",
    ...checks("Wo steht nicht? Wähle den richtigen Satz.", [
      pick("I'm not coming today.", ["Ich komme nicht heute.", "Ich komme heute nicht.", "Ich nicht komme heute."], 1),
      pick("I can't swim.", ["Ich kann nicht schwimmen.", "Ich kann schwimmen nicht.", "Ich nicht kann schwimmen."], 0),
      pick("I'm not getting up.", ["Ich stehe auf nicht.", "Ich stehe nicht auf.", "Ich nicht stehe auf."], 1),
      pick("The flat isn't big.", ["Die Wohnung ist groß nicht.", "Die Wohnung nicht ist groß.", "Die Wohnung ist nicht groß."], 2),
      pick("I don't know him.", ["Ich kenne ihn nicht.", "Ich kenne nicht ihn.", "Ich nicht kenne ihn."], 0),
      pick("We don't live in Hamburg.", ["Wir wohnen in Hamburg nicht.", "Wir wohnen nicht in Hamburg.", "Nicht wir wohnen in Hamburg."], 1),
    ]),
  },
  "können, müssen, möchten": {
    learningOutcome: "I can conjugate können, müssen and möchten and use them with an infinitive at the end.",
    resourceBody:
      "können (can): ich kann · du kannst · er kann · wir können · ihr könnt · sie können\n" +
      "müssen (must, have to): ich muss · du musst · er muss · wir müssen · ihr müsst · sie müssen\n" +
      "möchten (would like): ich möchte · du möchtest · er möchte · wir möchten · ihr möchtet · sie möchten\n" +
      "ich and er have the same form, without -t: ich kann, er kann.\n" +
      "The second verb goes to the end as an infinitive: Ich kann gut kochen. Du musst heute arbeiten. Wir möchten ein Zimmer buchen.",
    guidedPractice: "Say three things you can do, three you must do this week, and three you would like to do.",
    ...checks("Setze das Modalverb in der richtigen Form ein.", [
      hintGap("Er ___ sehr gut Deutsch sprechen.", "können", "kann"),
      hintGap("Du ___ morgen früh aufstehen.", "müssen", "musst"),
      hintGap("Wir ___ bitte zahlen.", "möchten", "möchten"),
      hintGap("___ ihr am Samstag kommen?", "können", "Könnt"),
      hintGap("Ich ___ noch einkaufen.", "müssen", "muss"),
      pick("Where does the infinitive go?  Ich kann ___ heute ___ .", ["right after kann", "at the end of the sentence", "at the start"], 1),
    ]),
  },
  "dürfen, wollen, sollen": {
    learningOutcome: "I can use dürfen (be allowed), wollen (want) and sollen (be supposed to).",
    resourceBody:
      "dürfen (may, be allowed): ich darf · du darfst · er darf · wir dürfen · ihr dürft · sie dürfen\n" +
      "wollen (want): ich will · du willst · er will · wir wollen · ihr wollt · sie wollen\n" +
      "sollen (should, be supposed to): ich soll · du sollst · er soll · wir sollen · ihr sollt · sie sollen\n\n" +
      "Hier darf man nicht rauchen. (not allowed) · Ich will Pilot werden. (strong wish — möchten is more polite) · Der Arzt sagt, ich soll viel trinken. (someone else's advice/instruction)\n" +
      "Careful: ich will = I want (not \"I will\").",
    guidedPractice: "Write the rules of your workplace or course with darf/darf nicht, and one piece of advice with soll.",
    ...checks("Setze das Modalverb ein.", [
      hintGap("Hier ___ man nicht parken.", "dürfen", "darf"),
      hintGap("Mein Sohn ___ Fußballspieler werden.", "wollen", "will"),
      hintGap("Der Arzt sagt, ich ___ mehr schlafen.", "sollen", "soll"),
      hintGap("___ ich das Fenster öffnen?", "dürfen", "Darf"),
      hintGap("Was ___ du am Wochenende machen?", "wollen", "willst"),
      pick("„Ich will kommen“ means …", ["I will come", "I want to come", "I should come"], 1),
    ]),
  },
  "The sentence bracket": {
    learningOutcome: "I can build the verb bracket: conjugated verb in position 2, second verb at the very end.",
    resourceBody:
      "With a modal verb (and later with the Perfekt and separable verbs), the verb splits into a bracket:\n" +
      "Ich | muss | heute noch die Wohnung | putzen.\n" +
      "Position 2 = conjugated verb, end = infinitive. Everything else goes in between.\n" +
      "Am Samstag | kann | ich leider nicht | kommen.\n" +
      "In a yes/no question the modal goes first: Kannst du mir morgen helfen?",
    guidedPractice: "Rewrite with a modal: Ich lerne Deutsch (möchten). Wir arbeiten am Samstag (müssen). Du kommst mit (können)?",
    ...checks("Wähle den richtigen Satz.", [
      pick("I have to clean the flat today.", ["Ich muss putzen heute die Wohnung.", "Ich muss heute die Wohnung putzen.", "Ich heute muss die Wohnung putzen."], 1),
      pick("On Saturday I can't come.", ["Am Samstag kann ich nicht kommen.", "Am Samstag ich kann nicht kommen.", "Am Samstag kann ich kommen nicht."], 0),
      pick("Can you help me tomorrow?", ["Du kannst mir morgen helfen?", "Kannst du helfen mir morgen?", "Kannst du mir morgen helfen?"], 2),
      gap("Wir möchten am Wochenende nach Berlin ___. (fahren)", "fahren"),
      gap("Du musst den Antrag bis Freitag ___. (abgeben — one word, at the end)", "abgeben"),
    ]),
  },
  "Common separable verbs": {
    learningOutcome: "I can recognize and conjugate the everyday separable verbs.",
    resourceBody:
      "Separable verbs have a stressed prefix that goes to the end in a statement or question:\n" +
      "aufstehen → Ich stehe um sechs auf. · einkaufen → Wir kaufen am Samstag ein. · anrufen → Ich rufe dich an.\n" +
      "fernsehen → Er sieht abends fern. · mitkommen → Kommst du mit? · anfangen → Der Kurs fängt um neun an.\n" +
      "aufräumen, abholen, zurückkommen, ausgehen …\n" +
      "The verb part conjugates normally (sieht, fängt); the prefix never changes.",
    guidedPractice: "Tell your morning: Ich stehe … auf, … Then say what you do tonight with two separable verbs.",
    ...checks("Setze die fehlenden Teile ein.", [
      hintGap("Ich ___ jeden Tag um sechs Uhr auf.", "aufstehen", "stehe"),
      hintGap("Wir kaufen am Samstag im Supermarkt ___.", "einkaufen", "ein"),
      hintGap("Er ___ abends immer fern.", "fernsehen", "sieht"),
      hintGap("Kommst du heute Abend ___?", "mitkommen", "mit"),
      hintGap("Der Deutschkurs ___ um 9 Uhr an.", "anfangen", "fängt"),
      hintGap("Ich rufe dich morgen ___.", "anrufen", "an"),
    ]),
  },
  "Prefix to the end": {
    learningOutcome: "I can build full sentences with separable verbs: verb in position 2, prefix at the end.",
    resourceBody:
      "In a statement or question the prefix goes to the very end — after everything else:\n" +
      "aufstehen: Ich stehe am Montag um 6 Uhr auf.\n" +
      "einkaufen: Kaufst du heute im Supermarkt ein?\n" +
      "With a modal verb it stays together, as an infinitive at the end: Ich muss um 6 Uhr aufstehen.",
    guidedPractice: "Make full sentences: anrufen (deine Mutter, heute Abend), abholen (die Kinder, um 15 Uhr).",
    ...checks("Wähle den richtigen Satz.", [
      pick("I get up at 6 o'clock.", ["Ich aufstehe um 6 Uhr.", "Ich stehe um 6 Uhr auf.", "Ich stehe auf um 6 Uhr."], 1),
      pick("Are you going shopping today?", ["Kaufst du heute ein?", "Einkaufst du heute?", "Kaufst ein du heute?"], 0),
      pick("I have to get up early.", ["Ich muss früh auf stehen.", "Ich muss stehe früh auf.", "Ich muss früh aufstehen."], 2),
      gap("Der Zug ___ um 10:15 Uhr in Köln an. (ankommen)", "kommt"),
      gap("Ich hole meine Tochter um drei Uhr ___. (abholen)", "ab"),
    ]),
  },
  "Sie-imperative": {
    learningOutcome: "I can give formal instructions and requests: verb first + Sie.",
    resourceBody:
      "Formal imperative = the Sie form of the present, with the verb first:\n" +
      "Sie kommen mit. → Kommen Sie bitte mit!  ·  Warten Sie hier!  ·  Nehmen Sie Platz!\n" +
      "sein is irregular: Seien Sie bitte pünktlich!\n" +
      "Separable verbs: prefix at the end — Rufen Sie mich bitte an!  ·  Füllen Sie das Formular aus!\n" +
      "bitte makes it polite; it usually comes after Sie.",
    guidedPractice: "Write four instructions a doctor or an office clerk might give you, with Sie.",
    ...checks("Bilde den Imperativ mit Sie.", [
      gap("___ Sie bitte hier! (warten)", "Warten"),
      gap("___ Sie bitte Platz! (nehmen)", "Nehmen"),
      gap("Füllen Sie bitte das Formular ___! (ausfüllen)", "aus"),
      hintGap("___ Sie bitte pünktlich! (sein)", "irregular", "Seien"),
      pick("Which one is a polite formal request?", ["Sie kommen bitte mit.", "Kommen Sie bitte mit!", "Komm bitte mit!"], 1),
    ]),
  },
  "du- and ihr-imperative": {
    learningOutcome: "I can give informal instructions to one person (du) and to several people (ihr).",
    resourceBody:
      "du-imperative: du-form without -st and without du: du kommst → Komm! · du machst → Mach! · du wartest → Warte!\n" +
      "e→i verbs keep the i: du nimmst → Nimm! · du liest → Lies! · du sprichst → Sprich! · du gibst → Gib!\n" +
      "a→ä verbs lose the umlaut: du fährst → Fahr! · du schläfst → Schlaf!\n" +
      "sein → Sei ruhig!  ·  separable: Ruf mich an! · Steh auf!\n\n" +
      "ihr-imperative: the ihr form without ihr: ihr kommt → Kommt! · ihr nehmt → Nehmt! · ihr seid → Seid leise!",
    guidedPractice: "Give a friend three pieces of advice (du) and two instructions to a group of children (ihr).",
    ...checks("Bilde den Imperativ.", [
      gap("___ bitte langsamer! (sprechen — du)", "Sprich"),
      gap("___ das Buch! (lesen — du)", "Lies"),
      gap("___ mit dem Bus! (fahren — du)", "Fahr", "Fahre"),
      gap("Kinder, ___ bitte leise! (sein — ihr)", "seid"),
      gap("___ doch mit! (kommen — ihr)", "Kommt"),
      gap("___ mich morgen an! (anrufen — du)", "Ruf", "Rufe"),
    ]),
  },
  "Time: am, um, im, von … bis": {
    learningOutcome: "I can use am, um, im and von … bis for days, clock times, months and time spans.",
    resourceBody:
      "am + day / part of the day / date: am Montag, am Wochenende, am Abend, am 3. Mai\n" +
      "um + clock time: um 8 Uhr, um halb neun\n" +
      "im + month / season: im Juli, im Winter  ·  in + year is left out: 2025 (or im Jahr 2025)\n" +
      "von … bis: von 9 bis 17 Uhr, von Montag bis Freitag  ·  ab: ab Montag (from Monday on)\n" +
      "Question: Wann? — Am Freitag um 10 Uhr.",
    guidedPractice: "Say your week: Am Montag … um … Uhr; in which month is your birthday; your work hours with von … bis.",
    ...checks("am, um, im — oder von … bis?", [
      gap("Der Kurs beginnt ___ 9 Uhr.", "um"),
      gap("Ich habe ___ Montag frei.", "am"),
      gap("Mein Geburtstag ist ___ Juli.", "im"),
      gap("Wir fahren ___ Winter in die Berge.", "im"),
      gap("Das Büro ist ___ 8 bis 16 Uhr geöffnet.", "von"),
      gap("Treffen wir uns ___ Wochenende?", "am"),
    ]),
  },
  "Place: in, aus, nach, bei, zu": {
    learningOutcome: "I can say where I live, where I come from and where I go with in, aus, nach, bei and zu.",
    resourceBody:
      "Wo? (where) — in + city/country: Ich wohne in Köln / in Indien. · bei + person/company: Ich wohne bei meiner Tante. Ich arbeite bei Siemens.\n" +
      "Woher? (from where) — aus: Ich komme aus Indien / aus Mumbai / aus der Türkei.\n" +
      "Wohin? (to where) — nach + city/country without article, and nach Hause: Ich fahre nach Berlin. Ich gehe nach Hause.\n" +
      "zu + person/building/event: Ich gehe zum Arzt (zu + dem), zur Bank (zu + der), zu Anna.\n" +
      "At A1, learn these as chunks: zum Arzt, zur Arbeit, zum Bahnhof, zur Schule, bei der Arbeit.",
    guidedPractice: "Answer: Woher kommst du? Wo wohnst du? Wohin fährst du im Urlaub? Wo arbeitest du? Wohin gehst du nach dem Kurs?",
    ...checks("Setze die richtige Präposition ein.", [
      gap("Ich komme ___ Indien.", "aus"),
      gap("Wir wohnen ___ Frankfurt.", "in"),
      gap("Morgen fahre ich ___ Hamburg.", "nach"),
      gap("Ich gehe heute ___ Arzt.", "zum"),
      gap("Er arbeitet ___ einer Bank.", "bei", "in"),
      gap("Nach dem Kurs gehe ich ___ Hause.", "nach"),
    ]),
  },
  "mit & für": {
    learningOutcome: "I can use mit (with, by) and für (for) in everyday sentences.",
    resourceBody:
      "mit + dative — with / by (transport): mit dem Bus, mit der U-Bahn, mit dem Auto, mit meinem Bruder, mit mir\n" +
      "für + accusative — for: für dich, für meinen Vater, für die Familie, für eine Woche\n" +
      "But on foot: zu Fuß (not mit).\n" +
      "Ich fahre mit dem Zug nach Berlin. · Das Geschenk ist für meine Mutter. · Kommst du mit mir?",
    guidedPractice: "Say how you get to work or the course, and who you buy presents for.",
    ...checks("mit oder für?", [
      gap("Ich fahre ___ dem Bus zur Arbeit.", "mit"),
      gap("Das Geschenk ist ___ meine Mutter.", "für"),
      gap("Kommst du ___ mir ins Kino?", "mit"),
      gap("Ich suche eine Wohnung ___ zwei Personen.", "für"),
      pick("I walk to work.", ["Ich gehe mit Fuß zur Arbeit.", "Ich gehe zu Fuß zur Arbeit.", "Ich gehe für Fuß zur Arbeit."], 1),
      gap("Danke ___ die Hilfe!", "für"),
    ]),
  },
  "Perfekt with haben": {
    learningOutcome: "I can talk about the past with haben + Partizip II.",
    resourceBody:
      "Spoken past = haben (position 2) + Partizip II (at the end):  Ich habe Pizza gegessen.\n" +
      "Regular: ge- + stem + -t: machen → gemacht, kaufen → gekauft, lernen → gelernt, arbeiten → gearbeitet\n" +
      "Irregular: ge- + stem (often changed) + -en: essen → gegessen, trinken → getrunken, sehen → gesehen, schreiben → geschrieben\n" +
      "Separable: ge- in the middle: einkaufen → eingekauft, anrufen → angerufen\n" +
      "No ge- for -ieren verbs and be-/ver-/er- verbs: telefonieren → telefoniert, bezahlen → bezahlt, verstehen → verstanden",
    guidedPractice: "Say five things you did yesterday with haben: Ich habe … gemacht / gegessen / gekauft.",
    ...checks("Setze das Partizip II ein.", [
      hintGap("Ich habe gestern Fußball ___.", "spielen", "gespielt"),
      hintGap("Hast du schon ___?", "essen", "gegessen"),
      hintGap("Wir haben im Supermarkt ___.", "einkaufen", "eingekauft"),
      hintGap("Sie hat mit ihrer Mutter ___.", "telefonieren", "telefoniert"),
      hintGap("Ich habe dich nicht ___.", "verstehen", "verstanden"),
      hintGap("Er ___ einen Brief geschrieben.", "haben", "hat"),
    ]),
  },
  "Perfekt with sein": {
    learningOutcome: "I can use sein in the Perfekt for movement, change of state, and sein/bleiben.",
    resourceBody:
      "Use sein (not haben) with verbs of movement from A to B and change of state, plus sein and bleiben:\n" +
      "fahren → Ich bin nach Berlin gefahren. · gehen → Wir sind ins Kino gegangen. · kommen → Er ist spät gekommen.\n" +
      "fliegen → geflogen · laufen → gelaufen · aufstehen → Ich bin um 7 aufgestanden. · einschlafen → eingeschlafen\n" +
      "sein → Ich bin in Köln gewesen. · bleiben → Sie ist zu Hause geblieben. · passieren → Was ist passiert?\n" +
      "Tip: if you can't add an accusative object, and it's movement or change, it's sein.",
    guidedPractice: "Tell your last weekend: where you went, how you travelled, when you got up — with sein.",
    ...checks("haben oder sein? Setze die richtige Form ein.", [
      gap("Ich ___ gestern nach München gefahren.", "bin"),
      gap("Wir ___ viel Kaffee getrunken.", "haben"),
      gap("Wann ___ du heute aufgestanden?", "bist"),
      gap("Sie ___ am Wochenende zu Hause geblieben.", "ist"),
      gap("Was ___ passiert?", "ist"),
      hintGap("Er ist mit dem Flugzeug nach Rom ___.", "fliegen", "geflogen"),
    ]),
  },
  "war & hatte": {
    learningOutcome: "I can use war and hatte, the past forms of sein and haben used even in speech.",
    resourceBody:
      "For sein and haben, Germans use the Präteritum even when speaking:\n" +
      "sein: ich war · du warst · er war · wir waren · ihr wart · sie waren\n" +
      "haben: ich hatte · du hattest · er hatte · wir hatten · ihr hattet · sie hatten\n" +
      "ich and er are the same: ich war, sie war; ich hatte, er hatte.\n\n" +
      "Gestern war ich krank. · Wir hatten keine Zeit. · Wo warst du? · Hattest du einen schönen Urlaub?",
    guidedPractice: "Answer: Wo warst du letztes Wochenende? Wie war das Wetter? Hattest du Zeit für Sport?",
    ...checks("Setze war oder hatte in der richtigen Form ein.", [
      hintGap("Gestern ___ ich krank.", "sein", "war"),
      hintGap("Wir ___ keine Zeit.", "haben", "hatten"),
      hintGap("Wo ___ du am Wochenende?", "sein", "warst"),
      hintGap("___ ihr einen schönen Urlaub?", "haben", "Hattet"),
      hintGap("Das Wetter ___ toll.", "sein", "war"),
      hintGap("Er ___ gestern Geburtstag.", "haben", "hatte"),
    ]),
  },
};

// ── vocabulary themes ────────────────────────────────────────────────────────

const VOCAB: Record<string, Authored> = {
  "Introducing yourself": {
    learningOutcome: "I can give and ask for name, age, origin, home town, job and languages.",
    resourceBody:
      "Ich heiße … / Mein Name ist …  —  Wie heißen Sie? / Wie heißt du?\n" +
      "Ich bin 28 Jahre alt.  —  Wie alt bist du?\n" +
      "Ich komme aus Indien.  —  Woher kommen Sie?\n" +
      "Ich wohne in Stuttgart.  —  Wo wohnst du?\n" +
      "Ich bin Krankenpfleger. / Ich arbeite als …  —  Was sind Sie von Beruf?\n" +
      "Ich spreche Hindi, Englisch und ein bisschen Deutsch.  —  Welche Sprachen sprichst du?\n" +
      "Freut mich! (Nice to meet you.)",
    guidedPractice: "Say all six facts about yourself, then ask the matching six questions.",
    ...checks("Ergänze. (Complete.)", [
      gap("Wie ___ Sie? — Ich heiße Ravi Kumar.", "heißen"),
      gap("Wie ___ bist du? — 27.", "alt"),
      gap("___ kommen Sie? — Aus Indien.", "Woher"),
      gap("Was sind Sie von ___? — Ich bin Elektriker.", "Beruf"),
      gap("Welche ___ sprichst du? — Englisch und Tamil.", "Sprachen"),
      pick("Someone says „Ich heiße Jana.“ You answer politely:", ["Freut mich!", "Tschüss!", "Gute Nacht!"], 0),
    ]),
  },
  Family: {
    learningOutcome: "I can name family members and say my family status.",
    resourceBody:
      "die Eltern (parents): der Vater, die Mutter · die Geschwister (siblings): der Bruder, die Schwester\n" +
      "die Großeltern: der Großvater (Opa), die Großmutter (Oma) · das Kind, die Kinder: der Sohn, die Tochter\n" +
      "der Onkel, die Tante, der Cousin, die Cousine · der Mann (husband), die Frau (wife)\n" +
      "Familienstand: ledig (single), verheiratet (married), geschieden (divorced)\n" +
      "Ich habe zwei Geschwister. · Ich bin verheiratet und habe eine Tochter.",
    guidedPractice: "Draw your family tree and say one sentence for each person: Das ist mein/meine …",
    ...checks("Wer ist das? (Who is it?)", [
      gap("Die Mutter von meiner Mutter ist meine ___.", "Großmutter", "Oma"),
      gap("Der Bruder von meinem Vater ist mein ___.", "Onkel"),
      gap("Mein Bruder und meine Schwester sind meine ___.", "Geschwister"),
      gap("Ich habe einen Sohn und eine ___. (daughter)", "Tochter"),
      pick("You're not married:", ["Ich bin ledig.", "Ich bin verheiratet.", "Ich bin geschieden."], 0),
      gap("Mein Vater und meine Mutter sind meine ___.", "Eltern"),
    ]),
  },
  "Countries, nationalities & languages": {
    learningOutcome: "I can say where people come from, their nationality and the languages they speak.",
    resourceBody:
      "Ich komme aus Indien. Ich bin Inder / Inderin. Ich spreche Hindi.\n" +
      "Deutschland — Deutscher/Deutsche — Deutsch · Österreich — Österreicher/in · die Schweiz — Schweizer/in\n" +
      "die Türkei — Türke/Türkin — Türkisch · Spanien — Spanier/in — Spanisch · England — Engländer/in — Englisch\n" +
      "With article: aus der Türkei, aus der Schweiz, aus den USA. Without: aus Indien, aus Spanien.\n" +
      "Languages end in -isch (Englisch, Spanisch) — exception: Deutsch.",
    guidedPractice: "Say where you and two friends come from, your nationalities and your languages.",
    ...checks("Ergänze.", [
      gap("In Spanien spricht man ___.", "Spanisch"),
      gap("Maria kommt aus Spanien. Sie ist ___.", "Spanierin"),
      pick("Ich komme ___ Türkei.", ["aus", "aus der", "aus die"], 1),
      gap("In Österreich spricht man ___.", "Deutsch"),
      gap("Raj kommt aus Indien. Er ist ___.", "Inder"),
      pick("Which is a language?", ["Frankreich", "Französisch", "Franzose"], 1),
    ]),
  },
  "Numbers 0–1000": {
    learningOutcome: "I can read, say and write numbers up to 1000 — the units come before the tens.",
    resourceBody:
      "0 null · 1 eins · 2 zwei · 3 drei · 4 vier · 5 fünf · 6 sechs · 7 sieben · 8 acht · 9 neun · 10 zehn\n" +
      "11 elf · 12 zwölf · 13 dreizehn · 16 sechzehn · 17 siebzehn · 20 zwanzig · 30 dreißig · 60 sechzig · 70 siebzig\n" +
      "21–99: units + und + tens, one word: 21 einundzwanzig · 47 siebenundvierzig · 98 achtundneunzig\n" +
      "100 (ein)hundert · 350 dreihundertfünfzig · 1000 (ein)tausend\n" +
      "Prices: 3,50 € = drei Euro fünfzig. Phone numbers are often read in pairs: 43 21 = dreiundvierzig einundzwanzig.",
    guidedPractice: "Read your phone number, your house number and the prices on a receipt aloud.",
    ...checks("Welche Zahl? / Schreib die Zahl.", [
      pick("siebenundvierzig =", ["74", "47", "407"], 1),
      pick("dreihundertfünfzehn =", ["350", "315", "513"], 1),
      gap("21 = ___ (one word)", "einundzwanzig"),
      gap("66 = ___ (one word)", "sechsundsechzig"),
      gap("17 = ___", "siebzehn"),
      pick("„Das kostet vier Euro neunzig.“", ["4,19 €", "4,90 €", "9,40 €"], 1),
    ]),
  },
  "Telling the time": {
    learningOutcome: "I can tell and understand the time, officially and in everyday speech.",
    resourceBody:
      "Wie spät ist es? / Wie viel Uhr ist es?\n" +
      "Official (timetables, appointments): 14:30 = vierzehn Uhr dreißig · 8:05 = acht Uhr fünf\n" +
      "Everyday: 8:15 = Viertel nach acht · 8:45 = Viertel vor neun · 8:10 = zehn nach acht · 8:50 = zehn vor neun\n" +
      "halb = half TO the next hour: 8:30 = halb neun (not half eight!) · 8:25 = fünf vor halb neun\n" +
      "Um wie viel Uhr …? — Um halb acht.",
    guidedPractice: "Say your daily times both ways: when you get up, start work, eat lunch, go to bed.",
    ...checks("Wie spät ist es?", [
      pick("halb neun =", ["9:30", "8:30", "8:50"], 1),
      pick("Viertel vor drei =", ["2:45", "3:15", "3:45"], 0),
      pick("zehn nach sieben =", ["6:50", "7:10", "10:07"], 1),
      pick("16:20 in official German:", ["sechzehn Uhr zwanzig", "zwanzig nach sechzehn", "vier Uhr zwanzig"], 0),
      gap("7:30 = halb ___", "acht"),
      gap("11:15 = Viertel ___ elf", "nach"),
    ]),
  },
  "Days, months & seasons": {
    learningOutcome: "I can name days, months and seasons and say when something happens.",
    resourceBody:
      "Tage: Montag, Dienstag, Mittwoch, Donnerstag, Freitag, Samstag, Sonntag — am Montag, am Wochenende\n" +
      "Monate: Januar, Februar, März, April, Mai, Juni, Juli, August, September, Oktober, November, Dezember — im Mai\n" +
      "Jahreszeiten: der Frühling, der Sommer, der Herbst, der Winter — im Sommer\n" +
      "Dates: Heute ist der 3. Mai (der dritte Mai). · Am 24. Dezember (am vierundzwanzigsten Dezember).\n" +
      "gestern (yesterday) · heute · morgen (tomorrow) · übermorgen",
    guidedPractice: "Say your birthday, today's date, and what you do on each day of the week.",
    ...checks("Ergänze.", [
      gap("Nach Montag kommt ___.", "Dienstag"),
      gap("Der Tag vor Sonntag ist ___.", "Samstag", "Sonnabend"),
      gap("Nach März kommt ___.", "April"),
      pick("Im ___ ist es in Deutschland oft kalt und es schneit.", ["Sommer", "Winter", "Frühling"], 1),
      pick("„übermorgen“ means …", ["the day after tomorrow", "the day before yesterday", "tomorrow morning"], 0),
      gap("Der Herbst ist nach dem ___.", "Sommer"),
    ]),
  },
  "Daily routine": {
    learningOutcome: "I can describe a normal day with the routine verbs.",
    resourceBody:
      "aufstehen (get up) · duschen · sich anziehen · frühstücken · zur Arbeit fahren · arbeiten · Mittag essen\n" +
      "nach Hause kommen · einkaufen · kochen · zu Abend essen · fernsehen · ins Bett gehen · schlafen\n" +
      "Order words: zuerst (first), dann (then), danach (after that), am Abend, später\n" +
      "Ich stehe um sechs auf. Zuerst dusche ich, dann frühstücke ich. Danach fahre ich zur Arbeit.",
    guidedPractice: "Describe your day in eight sentences with zuerst, dann, danach.",
    ...checks("Ergänze die Tagesroutine.", [
      gap("Morgens um sechs stehe ich ___.", "auf"),
      gap("Um sieben ___ ich: Brot mit Käse und Kaffee. (have breakfast)", "frühstücke"),
      pick("What do you do at 22:30?", ["Ich gehe ins Bett.", "Ich stehe auf.", "Ich frühstücke."], 0),
      gap("Am Abend ___ ich Nudeln mit Gemüse. (cook)", "koche"),
      gap("Zuerst dusche ich, ___ frühstücke ich. (then)", "dann"),
      gap("Nach der Arbeit kaufe ich im Supermarkt ___.", "ein"),
    ]),
  },
  "Food & drink": {
    learningOutcome: "I can name everyday food and drinks and order in a café.",
    resourceBody:
      "Lebensmittel: das Brot, das Brötchen, die Butter, der Käse, die Wurst, das Ei, der Reis, die Nudeln, das Fleisch, der Fisch, das Gemüse, das Obst, der Apfel, die Kartoffel\n" +
      "Getränke: das Wasser, der Kaffee, der Tee, die Milch, der Saft, das Bier, der Wein\n" +
      "Mahlzeiten: das Frühstück, das Mittagessen, das Abendessen\n" +
      "Im Café: Ich hätte gern einen Kaffee. · Ich nehme ein Stück Kuchen. · Die Rechnung, bitte. · Zusammen oder getrennt?",
    guidedPractice: "Say what you eat for each meal, then order a drink and something to eat.",
    ...checks("Ergänze.", [
      gap("Ich esse morgens ein ___ mit Marmelade. (bread roll)", "Brötchen"),
      pick("Which one is Obst (fruit)?", ["die Kartoffel", "der Apfel", "der Käse"], 1),
      gap("Ich hätte gern ein Glas ___. (water)", "Wasser"),
      gap("Zum ___ esse ich meistens Reis mit Gemüse. (lunch)", "Mittagessen"),
      pick("You want to pay:", ["Die Rechnung, bitte.", "Die Speisekarte, bitte.", "Guten Appetit!"], 0),
      pick("„Zusammen oder getrennt?“ asks …", ["if you pay together or separately", "if you want a table for two", "if you want a starter"], 0),
    ]),
  },
  "Shopping & prices": {
    learningOutcome: "I can ask for products, amounts and prices, and pay.",
    resourceBody:
      "Wo finde ich …? · Haben Sie …? · Was kostet das? / Wie viel kostet …? · Das ist (zu) teuer / billig / günstig.\n" +
      "Mengen: ein Kilo, ein Pfund (500 g), 100 Gramm, ein Liter, eine Flasche, eine Packung, eine Dose, ein Stück\n" +
      "An der Kasse: Zahlen Sie bar oder mit Karte? · Brauchen Sie eine Tüte? · Der Kassenbon (receipt)\n" +
      "Das Angebot (special offer) · im Sonderangebot",
    guidedPractice: "Write a shopping list with amounts, then ask for three items and their prices.",
    ...checks("Ergänze.", [
      gap("Was ___ die Äpfel? — 2,99 € das Kilo.", "kosten"),
      gap("Eine ___ Wasser, bitte. (bottle)", "Flasche"),
      gap("Ich nehme 200 ___ Käse.", "Gramm", "g"),
      pick("„Zahlen Sie bar oder mit Karte?“", ["cash or card?", "bag or no bag?", "receipt or no receipt?"], 0),
      pick("50 € for a T-shirt is …", ["billig", "teuer", "günstig"], 1),
      gap("Ein Liter ___ kostet 1,19 €. (milk)", "Milch"),
    ]),
  },
  "Clothing & colors": {
    learningOutcome: "I can name clothes and colours and ask for a size.",
    resourceBody:
      "die Hose, die Jeans, das Hemd, die Bluse, das T-Shirt, der Pullover, die Jacke, der Mantel, das Kleid, der Rock, die Schuhe, die Socken\n" +
      "Farben: rot, blau, grün, gelb, schwarz, weiß, grau, braun, orange, rosa, lila\n" +
      "Welche Größe haben Sie? — Größe M / 40. · Kann ich das anprobieren? · Die Umkleidekabine · Das passt (gut). · Die Hose ist zu klein/groß.",
    guidedPractice: "Describe what you're wearing today with colours, and ask in a shop for a different size.",
    ...checks("Ergänze.", [
      gap("Im Winter trage ich einen warmen ___. (coat)", "Mantel"),
      gap("Schnee ist ___.", "weiß"),
      pick("You want to try a jacket on:", ["Kann ich die Jacke anprobieren?", "Kann ich die Jacke bezahlen?", "Kann ich die Jacke waschen?"], 0),
      gap("Welche ___ haben Sie? — M.", "Größe"),
      pick("Rot und Gelb zusammen ergibt …", ["Grün", "Orange", "Lila"], 1),
      gap("Die Hose ist zu klein. Sie ___ nicht. (fits)", "passt"),
    ]),
  },
  "Home & rooms": {
    learningOutcome: "I can name rooms and describe a flat and its address.",
    resourceBody:
      "die Wohnung (flat), das Haus · das Zimmer: das Wohnzimmer, das Schlafzimmer, das Kinderzimmer, die Küche, das Bad (Badezimmer), der Flur, der Balkon, der Keller\n" +
      "Eine Zweizimmerwohnung = 2 rooms + kitchen + bath. · 60 Quadratmeter (m²) · im ersten Stock (1st floor above ground) · im Erdgeschoss (ground floor)\n" +
      "Die Miete (rent) · hell, dunkel, groß, klein, ruhig, laut\n" +
      "Adresse: Ich wohne in der Goethestraße 12, 70173 Stuttgart.",
    guidedPractice: "Describe your flat: how many rooms, which floor, what you like and don't like.",
    ...checks("Ergänze.", [
      gap("Ich koche in der ___.", "Küche"),
      gap("Ich schlafe im ___.", "Schlafzimmer"),
      gap("Ich dusche im ___.", "Bad", "Badezimmer"),
      pick("„Im Erdgeschoss“ means …", ["on the ground floor", "in the basement", "under the roof"], 0),
      gap("Die ___ kostet 750 Euro im Monat. (rent)", "Miete"),
      pick("The street is quiet at night. Die Wohnung ist …", ["laut", "ruhig", "dunkel"], 1),
    ]),
  },
  "Furniture & household": {
    learningOutcome: "I can name furniture and household items and say what I need.",
    resourceBody:
      "Möbel: der Tisch, der Stuhl, das Sofa, der Sessel, das Bett, der Schrank, das Regal, der Schreibtisch, die Lampe\n" +
      "Geräte: der Kühlschrank, der Herd, der Backofen, die Waschmaschine, die Spülmaschine, der Fernseher\n" +
      "Dinge: das Glas, die Tasse, der Teller, das Messer, die Gabel, der Löffel, das Handtuch\n" +
      "Ich brauche einen Tisch und zwei Stühle. · Der Kühlschrank ist kaputt.",
    guidedPractice: "List what is in your kitchen and what you'd buy for an empty flat.",
    ...checks("Was ist das?", [
      gap("Milch und Butter sind im ___. (fridge)", "Kühlschrank"),
      gap("Ich wasche meine Kleidung in der ___.", "Waschmaschine"),
      gap("Die Bücher stehen im ___. (shelf)", "Regal"),
      pick("You eat soup with …", ["einer Gabel", "einem Löffel", "einem Messer"], 1),
      gap("Ich trinke Kaffee aus einer ___.", "Tasse"),
      pick("Where do you sleep?", ["im Bett", "im Schrank", "auf dem Herd"], 0),
    ]),
  },
  "Places in the city": {
    learningOutcome: "I can name important places in a town and say what I do there.",
    resourceBody:
      "der Bahnhof · die Haltestelle · die Apotheke · die Bank · die Post · der Supermarkt · die Bäckerei · das Krankenhaus · die Arztpraxis · das Rathaus / das Bürgeramt · die Schule · das Kino · das Restaurant · der Park\n" +
      "Medikamente kauft man in der Apotheke. · Geld holt man bei der Bank / am Geldautomaten. · Sich anmelden: beim Bürgeramt.",
    guidedPractice: "Name five places near your home and say what you do in each.",
    ...checks("Wohin gehst du?", [
      pick("You need medicine.", ["in die Bäckerei", "in die Apotheke", "ins Kino"], 1),
      pick("You register your new address (Anmeldung).", ["zum Bürgeramt", "zum Bahnhof", "zur Post"], 0),
      gap("Brot und Brötchen kaufe ich in der ___.", "Bäckerei"),
      gap("Den Zug nehme ich am ___.", "Bahnhof", "Hauptbahnhof"),
      gap("Ein Paket schicke ich bei der ___.", "Post"),
      pick("You wait for the bus at …", ["der Haltestelle", "dem Rathaus", "dem Park"], 0),
    ]),
  },
  Directions: {
    learningOutcome: "I can ask for and understand simple directions.",
    resourceBody:
      "Entschuldigung, wo ist …? / Wie komme ich zum Bahnhof?\n" +
      "geradeaus (straight on) · links / rechts · nach links abbiegen (turn left) · die erste / zweite Straße rechts\n" +
      "an der Ampel (at the traffic lights) · an der Kreuzung · gegenüber (opposite) · neben (next to) · hinter · vor\n" +
      "Es ist (nicht) weit. · Zu Fuß sind es fünf Minuten. · Nehmen Sie den Bus Nummer 5.",
    guidedPractice: "Explain the way from your home to the nearest supermarket in four steps.",
    ...checks("Ergänze.", [
      gap("Gehen Sie hier ___, dann links. (straight on)", "geradeaus"),
      gap("An der Ampel biegen Sie nach ___ ab. (right)", "rechts"),
      pick("„gegenüber vom Bahnhof“ means …", ["behind the station", "opposite the station", "inside the station"], 1),
      gap("Nehmen Sie die ___ Straße links. (first)", "erste"),
      pick("„Es ist nicht weit.“", ["It's close.", "It's far.", "It's closed."], 0),
      gap("Wie ___ ich zum Rathaus?", "komme"),
    ]),
  },
  "Transport & travel": {
    learningOutcome: "I can buy a ticket and understand departures, platforms and delays.",
    resourceBody:
      "der Zug, die S-Bahn, die U-Bahn, der Bus, die Straßenbahn, das Taxi, das Flugzeug, das Fahrrad\n" +
      "die Fahrkarte / das Ticket: einfach (one way), hin und zurück (return) · der Fahrplan (timetable)\n" +
      "die Abfahrt (departure) · die Ankunft (arrival) · das Gleis (platform) · umsteigen (change trains) · die Verspätung (delay)\n" +
      "Einmal nach Köln, bitte. Hin und zurück. · Der Zug fährt von Gleis 4 ab. · Der Zug hat 10 Minuten Verspätung.",
    guidedPractice: "Buy a return ticket to a city near you and ask about platform and changes.",
    ...checks("Ergänze.", [
      gap("Der Zug nach Berlin fährt von ___ 7 ab. (platform)", "Gleis"),
      pick("„Hin und zurück“ is a …", ["one-way ticket", "return ticket", "monthly ticket"], 1),
      gap("Der Zug hat 20 Minuten ___. (delay)", "Verspätung"),
      gap("In Frankfurt müssen Sie ___. (change trains)", "umsteigen"),
      pick("„Ankunft 14:05“ tells you when the train …", ["leaves", "arrives", "is cancelled"], 1),
      gap("Ich fahre jeden Tag mit der ___ zur Arbeit. (U-Bahn / S-Bahn)", "U-Bahn", "S-Bahn", "Straßenbahn"),
    ]),
  },
  "Weather & seasons": {
    learningOutcome: "I can describe the weather and understand a simple forecast.",
    resourceBody:
      "Wie ist das Wetter? — Es ist sonnig / warm / heiß / kalt / windig / bewölkt. · Es regnet. · Es schneit. · Es gibt ein Gewitter.\n" +
      "die Sonne, der Regen, der Schnee, der Wind, die Wolke · Es sind 25 Grad. · Es ist minus 3 Grad.\n" +
      "Im Sommer ist es warm, im Winter kalt. · Nimm einen Regenschirm mit!",
    guidedPractice: "Describe today's weather and the weather in your home country right now.",
    ...checks("Wie ist das Wetter?", [
      gap("Es ___. Nimm einen Regenschirm mit! (it's raining)", "regnet"),
      gap("Im Winter ___ es oft. (it snows)", "schneit"),
      pick("35 Grad ist …", ["kalt", "heiß", "kühl"], 1),
      pick("„Es ist bewölkt.“", ["It's cloudy.", "It's windy.", "It's sunny."], 0),
      gap("Heute scheint die ___. (sun)", "Sonne"),
      pick("Which season comes after winter?", ["der Herbst", "der Frühling", "der Sommer"], 1),
    ]),
  },
  Professions: {
    learningOutcome: "I can name common jobs and say where people work.",
    resourceBody:
      "der Arzt / die Ärztin · der Krankenpfleger / die Krankenpflegerin · der Lehrer / die Lehrerin · der Koch / die Köchin\n" +
      "der Verkäufer / die Verkäuferin · der Mechatroniker/-in · der Elektriker/-in · der Kaufmann / die Kauffrau · der Programmierer/-in\n" +
      "Feminine: usually + -in (Lehrerin), sometimes with umlaut (Ärztin, Köchin).\n" +
      "Was sind Sie von Beruf? — Ich bin Koch. (no article!) · Ich arbeite im Krankenhaus / in einem Restaurant / bei Bosch. · Ich mache eine Ausbildung als …",
    guidedPractice: "Say your job (or the Ausbildung you want) and where you'd work.",
    ...checks("Welcher Beruf?", [
      gap("Er kocht im Restaurant. Er ist ___.", "Koch"),
      gap("Sie arbeitet im Krankenhaus und hilft kranken Menschen. Sie ist ___.", "Krankenpflegerin", "Ärztin", "Krankenschwester", "Pflegefachkraft"),
      gap("Die weibliche Form von „Lehrer“ ist ___.", "Lehrerin"),
      pick("Correct answer to „Was sind Sie von Beruf?“", ["Ich bin ein Elektriker.", "Ich bin Elektriker.", "Ich habe Elektriker."], 1),
      gap("Ein ___ verkauft Kleidung im Geschäft.", "Verkäufer"),
      gap("Ich mache eine ___ als Mechatroniker. (vocational training)", "Ausbildung"),
    ]),
  },
  "Hobbies & free time": {
    learningOutcome: "I can talk about hobbies and make a plan to meet.",
    resourceBody:
      "Was machst du in deiner Freizeit? — Ich spiele Fußball. Ich lese gern. Ich höre Musik. Ich koche gern.\n" +
      "schwimmen, joggen, tanzen, wandern, Rad fahren, ins Kino gehen, Freunde treffen, reisen, fotografieren\n" +
      "gern / lieber / am liebsten: Ich schwimme gern, ich jogge lieber, am liebsten wandere ich.\n" +
      "Verabredung: Hast du am Samstag Zeit? — Ja, gern! / Leider nicht. · Wollen wir ins Kino gehen?",
    guidedPractice: "Say three hobbies with gern, and invite a friend to one activity this weekend.",
    ...checks("Ergänze.", [
      gap("Ich ___ gern im See. (swim)", "schwimme"),
      gap("Am Wochenende ___ ich gern in den Bergen. (hike)", "wandere"),
      pick("„Hast du am Freitag Zeit?“ — You can't:", ["Ja, gern!", "Leider nicht.", "Gute Idee!"], 1),
      gap("Ich spiele gern Fußball, aber ___ spiele ich Tennis. (prefer — lieber)", "lieber"),
      gap("Wollen wir ins ___ gehen? Es läuft ein neuer Film.", "Kino"),
      pick("Which one is not a free-time activity?", ["tanzen", "Rad fahren", "Miete zahlen"], 2),
    ]),
  },
  "Body parts": {
    learningOutcome: "I can name the main parts of the body.",
    resourceBody:
      "der Kopf, das Gesicht, das Auge (die Augen), das Ohr, die Nase, der Mund, der Zahn (die Zähne), der Hals\n" +
      "der Arm, die Hand, der Finger, die Schulter, der Rücken, der Bauch, das Bein, das Knie, der Fuß (die Füße)\n" +
      "Plurals you'll need: die Augen, die Ohren, die Zähne, die Hände, die Füße, die Beine.",
    guidedPractice: "Touch and name ten body parts, with their articles.",
    ...checks("Welcher Körperteil?", [
      gap("Ich sehe mit den ___.", "Augen"),
      gap("Ich höre mit den ___.", "Ohren"),
      gap("Ich putze meine ___ zweimal am Tag. (teeth)", "Zähne"),
      pick("___ Kopf", ["der", "die", "das"], 0),
      gap("Ich schreibe mit der ___.", "Hand"),
      gap("Ich gehe mit den ___. (feet)", "Füßen", "Füssen", "Beinen"),
    ]),
  },
  "Saying what hurts": {
    learningOutcome: "I can say what hurts and understand simple advice at the doctor's.",
    resourceBody:
      "Mir geht es nicht gut. · Ich bin krank. · Ich habe Kopfschmerzen / Bauchschmerzen / Halsschmerzen / Rückenschmerzen.\n" +
      "Mein Kopf / Mein Bauch tut weh. — Meine Füße tun weh. (plural: tun)\n" +
      "Ich habe Fieber / Husten / Schnupfen (a cold). · Mir ist schlecht. (I feel sick.)\n" +
      "Beim Arzt: Ich brauche einen Termin. · die Krankmeldung (sick note) · das Rezept (prescription) · Sie müssen im Bett bleiben.",
    guidedPractice: "Call the practice: say who you are, what hurts, since when, and ask for an appointment.",
    ...checks("Ergänze.", [
      gap("Ich habe ___schmerzen. Mein Kopf tut weh.", "Kopf"),
      gap("Mein Bauch ___ weh.", "tut"),
      gap("Meine Füße ___ weh.", "tun"),
      gap("Ich habe 39 Grad ___. (fever)", "Fieber"),
      pick("„Mir ist schlecht.“", ["I feel sick.", "I'm bad at it.", "It's my fault."], 0),
      pick("For your employer you need a …", ["Krankmeldung", "Rezept", "Termin"], 0),
    ]),
  },
};

// ── reading: a short text in the lesson, questions on its facts ─────────────

const READING: Record<string, Authored> = {
  "Read a short self-introduction text": read(
    "Hallo, ich bin Priya!",
    "Hallo! Ich heiße Priya Sharma und bin 26 Jahre alt. Ich komme aus Pune in Indien. Seit März wohne ich in Leipzig. Ich bin Krankenpflegerin und arbeite im Klinikum. Ich spreche Marathi, Hindi, Englisch und ein bisschen Deutsch. In meiner Freizeit koche ich gern und gehe spazieren.",
    [
      gap("Priya ist ___ Jahre alt.", "26", "sechsundzwanzig"),
      pick("Woher kommt Priya?", ["aus Leipzig", "aus Pune", "aus Mumbai"], 1),
      pick("Was ist Priya von Beruf?", ["Ärztin", "Köchin", "Krankenpflegerin"], 2),
      gap("Priya wohnt seit ___ in Leipzig.", "März"),
      pick("Welche Sprache spricht Priya nur ein bisschen?", ["Englisch", "Deutsch", "Hindi"], 1),
    ],
    "I can find name, age, origin, job and languages in a short introduction.",
  ),
  "Read a simple family description": read(
    "Meine Familie",
    "Das ist meine Familie. Mein Vater heißt Karl, er ist 58 und arbeitet bei der Post. Meine Mutter Ute ist 55 und Lehrerin. Ich habe einen Bruder und eine Schwester. Mein Bruder Jonas ist 30 und verheiratet. Er hat eine Tochter, sie heißt Mila und ist drei Jahre alt. Meine Schwester Lea ist 24 und studiert in Hamburg.",
    [
      pick("Was ist die Mutter von Beruf?", ["Postbotin", "Lehrerin", "Studentin"], 1),
      gap("Die Person im Text hat ___ Geschwister.", "zwei", "2"),
      pick("Wer ist verheiratet?", ["Jonas", "Lea", "Mila"], 0),
      gap("Mila ist ___ Jahre alt.", "drei", "3"),
      pick("Mila ist … von Jonas.", ["die Schwester", "die Tochter", "die Mutter"], 1),
      pick("Wo studiert Lea?", ["in Hamburg", "in Berlin", "bei der Post"], 0),
    ],
    "I can understand who belongs to a family and how old they are.",
  ),
  "Read a shopping receipt and price list": read(
    "Kassenbon — Supermarkt Frisch",
    "SUPERMARKT FRISCH · Filiale Südstadt\n2 x Milch 1 l ........ 2,38 €\nBrot (Vollkorn) ....... 2,49 €\nÄpfel 1 kg ............ 2,99 €\nKäse 200 g ............ 1,89 €\nKaffee 500 g .......... 5,99 €\n-----------------------------\nSUMME ................. 15,74 €\nGegeben (bar) ......... 20,00 €\nRückgeld ............... 4,26 €\nVielen Dank für Ihren Einkauf!",
    [
      gap("Wie viele Liter Milch hat die Person gekauft? ___", "2", "zwei"),
      pick("Was ist am teuersten?", ["das Brot", "der Kaffee", "die Äpfel"], 1),
      pick("Wie hat die Person bezahlt?", ["mit Karte", "bar", "mit dem Handy"], 1),
      gap("Die Person bekommt ___ Euro zurück.", "4,26", "4.26"),
      pick("Wie viel Käse hat die Person gekauft?", ["200 Gramm", "1 Kilo", "500 Gramm"], 0),
    ],
    "I can read a receipt: what was bought, how much it cost, how it was paid.",
  ),
  "Read a weather report": read(
    "Das Wetter am Wochenende",
    "Am Samstag ist es in ganz Deutschland sonnig und warm. Im Süden werden es bis zu 27 Grad, im Norden 22 Grad. Am Sonntag kommen von Westen Wolken. Am Nachmittag regnet es in Köln und Düsseldorf, und es gibt vielleicht Gewitter. Die Temperaturen fallen auf 18 bis 20 Grad. Im Osten bleibt es am Sonntag trocken.",
    [
      pick("Wie ist das Wetter am Samstag?", ["regnerisch", "sonnig und warm", "kalt und windig"], 1),
      gap("Im Süden werden es am Samstag bis zu ___ Grad.", "27", "siebenundzwanzig"),
      pick("Wo regnet es am Sonntag?", ["im Osten", "in Köln und Düsseldorf", "im Süden"], 1),
      pick("Wann regnet es am Sonntag?", ["am Morgen", "am Nachmittag", "in der Nacht"], 1),
      pick("Wo bleibt es am Sonntag trocken?", ["im Osten", "im Westen", "in Köln"], 0),
    ],
    "I can pick out temperature, sun, rain and places from a weather report.",
  ),
  "Read a short café menu": read(
    "Café Lindenblatt — Speisekarte",
    "GETRÄNKE\nKaffee 2,80 € · Cappuccino 3,40 € · Tee (verschiedene Sorten) 2,60 € · Orangensaft 0,3 l 3,20 € · Mineralwasser 0,5 l 2,90 €\nFRÜHSTÜCK (bis 11:30 Uhr)\nKleines Frühstück: Brötchen, Butter, Marmelade, Kaffee oder Tee 6,50 €\nVegetarisches Frühstück: 2 Brötchen, Käse, Gemüse, Ei, Saft 11,90 €\nKUCHEN\nApfelkuchen 3,90 € · Käsekuchen 4,20 € · mit Sahne + 0,80 €",
    [
      gap("Ein Cappuccino kostet ___ Euro.", "3,40", "3.40", "3,4"),
      pick("Bis wann gibt es Frühstück?", ["bis 11 Uhr", "bis 11:30 Uhr", "den ganzen Tag"], 1),
      pick("Was ist im kleinen Frühstück?", ["Brötchen und Kaffee oder Tee", "Käse und Ei", "Kuchen mit Sahne"], 0),
      pick("Das vegetarische Frühstück hat …", ["kein Ei", "Käse und Gemüse", "Wurst"], 1),
      gap("Sahne zum Kuchen kostet ___ Euro extra.", "0,80", "0.80", "0,8"),
    ],
    "I can read a menu for dishes, drinks, prices and times.",
  ),
  "Read a public transport timetable": read(
    "Abfahrt — Stuttgart Hbf",
    "Zeit | Zug | Nach | Über | Gleis | Hinweis\n08:12 | RE 5 | Tübingen | Esslingen, Plochingen | 3 | —\n08:20 | S 1 | Kirchheim | Bad Cannstatt | 101 | —\n08:37 | ICE 594 | München Hbf | Ulm | 14 | ca. 10 Min. später\n08:45 | RB 13 | Crailsheim | Schwäbisch Hall | 6 | Gleis 7 statt 6\n09:12 | RE 5 | Tübingen | Esslingen, Plochingen | 3 | —",
    [
      pick("Wann fährt der ICE nach München?", ["08:12", "08:37", "08:45"], 1),
      pick("Welcher Zug hat Verspätung?", ["der RE 5", "der ICE 594", "die S 1"], 1),
      gap("Der RE 5 nach Tübingen fährt von Gleis ___.", "3", "drei"),
      pick("Der RB 13 fährt heute von Gleis …", ["6", "7", "13"], 1),
      pick("Wann fährt der nächste RE nach Tübingen nach 08:12?", ["08:45", "09:12", "08:20"], 1),
    ],
    "I can read departure times, platforms and changes on a timetable.",
  ),
  "Read a simple map with directions": read(
    "Der Weg zur Sprachschule",
    "Liebe Kursteilnehmer, so finden Sie uns: Vom Hauptbahnhof gehen Sie links in die Bahnhofstraße. Gehen Sie immer geradeaus bis zur Ampel. An der Ampel gehen Sie rechts in die Schillerstraße. Nach etwa 200 Metern sehen Sie links eine Apotheke. Die Sprachschule ist direkt neben der Apotheke, im zweiten Stock. Zu Fuß brauchen Sie ungefähr zehn Minuten.",
    [
      pick("Wohin gehen Sie vom Hauptbahnhof zuerst?", ["rechts in die Schillerstraße", "links in die Bahnhofstraße", "geradeaus zur Apotheke"], 1),
      pick("Was machen Sie an der Ampel?", ["links abbiegen", "rechts abbiegen", "warten"], 1),
      gap("Die Sprachschule ist neben der ___.", "Apotheke"),
      pick("In welchem Stock ist die Schule?", ["im Erdgeschoss", "im ersten Stock", "im zweiten Stock"], 2),
      gap("Zu Fuß brauchen Sie ungefähr ___ Minuten.", "zehn", "10"),
    ],
    "I can follow written directions step by step.",
  ),
  "Read a short text about someone's daily routine": read(
    "Ein Tag von Marco",
    "Marco ist Bäcker. Er steht jeden Tag um drei Uhr auf. Zuerst trinkt er einen Kaffee, dann fährt er mit dem Fahrrad zur Bäckerei. Von vier bis zwölf Uhr backt er Brot und Brötchen. Um halb eins isst er zu Mittag. Danach schläft er zwei Stunden. Am Nachmittag geht er einkaufen oder trifft Freunde. Um neun Uhr abends geht er ins Bett.",
    [
      gap("Marco steht um ___ Uhr auf.", "drei", "3"),
      pick("Wie fährt Marco zur Arbeit?", ["mit dem Bus", "mit dem Fahrrad", "mit dem Auto"], 1),
      pick("Was macht Marco zuerst?", ["Er backt Brot.", "Er trinkt einen Kaffee.", "Er schläft."], 1),
      pick("Wann isst er zu Mittag?", ["um 12:00", "um 12:30", "um 13:30"], 1),
      pick("Was macht er nach dem Mittagessen?", ["Er schläft zwei Stunden.", "Er geht zur Arbeit.", "Er geht ins Bett."], 0),
    ],
    "I can follow the order of activities in a daily routine.",
  ),
  "Read a simple job advertisement": read(
    "Stellenanzeige",
    "Hotel Seeblick in Konstanz sucht ab 1. September eine Rezeptionistin / einen Rezeptionisten (Teilzeit, 25 Stunden pro Woche).\nIhre Aufgaben: Gäste begrüßen, Zimmer vergeben, Telefon und E-Mails beantworten.\nSie bringen mit: gute Deutschkenntnisse (B1), Englisch, Freundlichkeit.\nWir bieten: nettes Team, kostenloses Mittagessen, 28 Tage Urlaub.\nBewerbung bitte per E-Mail an: jobs@seeblick-konstanz.de",
    [
      pick("Welche Stelle ist frei?", ["Koch / Köchin", "Rezeptionist/in", "Zimmermädchen"], 1),
      gap("Die Stelle hat ___ Stunden pro Woche.", "25", "fünfundzwanzig"),
      pick("Welches Deutschniveau braucht man?", ["A1", "A2", "B1"], 2),
      gap("Man hat ___ Tage Urlaub.", "28", "achtundzwanzig"),
      pick("Wie bewirbt man sich?", ["per Telefon", "per E-Mail", "persönlich im Hotel"], 1),
    ],
    "I can find the job, hours, requirements and how to apply in a job ad.",
  ),
  "Read a short note or postcard": read(
    "Eine Postkarte aus Hamburg",
    "Liebe Sara,\nviele Grüße aus Hamburg! Ich bin seit Montag hier und bleibe bis Samstag. Das Wetter ist leider nicht so gut, es regnet oft. Aber die Stadt ist toll! Gestern war ich am Hafen und heute besuche ich ein Museum. Am Samstag fahre ich mit dem Zug zurück. Kommst du am Sonntag zum Frühstück?\nBis bald,\ndein Tom",
    [
      pick("Wer schreibt die Karte?", ["Sara", "Tom", "Hamburg"], 1),
      pick("Wie ist das Wetter?", ["sonnig", "es regnet oft", "es schneit"], 1),
      pick("Wo war Tom gestern?", ["im Museum", "am Hafen", "am Bahnhof"], 1),
      gap("Tom fährt am ___ zurück.", "Samstag", "Sonnabend"),
      pick("Was möchte Tom am Sonntag?", ["mit Sara frühstücken", "ins Museum gehen", "nach Hamburg fahren"], 0),
    ],
    "I can understand who writes a short message, what happened and what they want.",
  ),
  "Read a doctor's appointment confirmation": read(
    "Terminbestätigung",
    "Praxis Dr. med. Anna Berger · Allgemeinmedizin\nSehr geehrter Herr Okafor,\nhiermit bestätigen wir Ihren Termin am Dienstag, 14. Oktober, um 9:40 Uhr.\nBitte bringen Sie Ihre Versichertenkarte mit und kommen Sie 10 Minuten vor dem Termin.\nKönnen Sie nicht kommen? Bitte sagen Sie den Termin spätestens 24 Stunden vorher ab: Tel. 0711 45 23 18.\nAdresse: Königstraße 8, 2. Stock (Aufzug vorhanden)",
    [
      pick("An welchem Tag ist der Termin?", ["Montag, 14. Oktober", "Dienstag, 14. Oktober", "Dienstag, 4. Oktober"], 1),
      gap("Der Termin ist um ___ Uhr.", "9:40", "9.40", "09:40"),
      pick("Wann soll Herr Okafor da sein?", ["um 9:30 Uhr", "um 9:40 Uhr", "um 9:50 Uhr"], 0),
      gap("Herr Okafor soll seine ___ mitbringen.", "Versichertenkarte", "Krankenversicherungskarte", "Gesundheitskarte"),
      pick("Wann muss man spätestens absagen?", ["1 Stunde vorher", "24 Stunden vorher", "eine Woche vorher"], 1),
    ],
    "I can read the date, time, place and instructions in an appointment letter.",
  ),
  "Read a simple recipe": read(
    "Rezept: Pfannkuchen (4 Stück)",
    "Zutaten: 200 g Mehl, 2 Eier, 300 ml Milch, 1 Prise Salz, etwas Butter.\n1. Mehl, Eier, Milch und Salz in eine Schüssel geben und gut mischen.\n2. Den Teig 10 Minuten stehen lassen.\n3. Etwas Butter in einer Pfanne heiß machen.\n4. Eine Kelle Teig in die Pfanne geben und von beiden Seiten 2 Minuten backen.\n5. Mit Zucker, Apfelmus oder Marmelade servieren.",
    [
      gap("Man braucht ___ Eier.", "2", "zwei"),
      gap("Man braucht ___ Milliliter Milch.", "300", "dreihundert"),
      pick("Was macht man nach dem Mischen?", ["Den Teig sofort backen.", "Den Teig 10 Minuten stehen lassen.", "Zucker dazugeben."], 1),
      pick("Wie lange backt man jede Seite?", ["2 Minuten", "10 Minuten", "20 Minuten"], 0),
      pick("Das Rezept ist für …", ["2 Pfannkuchen", "4 Pfannkuchen", "10 Pfannkuchen"], 1),
    ],
    "I can read ingredients, amounts and the order of steps in a recipe.",
  ),
  "Read a short diary entry": read(
    "Mein Tagebuch — Dienstag",
    "Heute war ein langer Tag! Ich bin um sechs Uhr aufgestanden und habe schnell gefrühstückt. Um acht habe ich meinen ersten Deutschkurs gehabt — die Lehrerin war sehr nett. Mittags habe ich mit Ahmed in der Kantine gegessen. Am Nachmittag bin ich zum Bürgeramt gegangen und habe meine Adresse angemeldet. Das hat zwei Stunden gedauert! Am Abend habe ich meine Familie in Indien angerufen.",
    [
      pick("Wann ist die Person aufgestanden?", ["um 6 Uhr", "um 8 Uhr", "um 7 Uhr"], 0),
      pick("Was war um acht Uhr?", ["das Frühstück", "der erste Deutschkurs", "der Termin beim Bürgeramt"], 1),
      gap("Mittags hat die Person mit ___ gegessen.", "Ahmed"),
      pick("Was hat die Person beim Bürgeramt gemacht?", ["einen Pass beantragt", "die Adresse angemeldet", "einen Job gesucht"], 1),
      gap("Das hat ___ Stunden gedauert.", "zwei", "2"),
    ],
    "I can follow what happened and in what order in a short past-tense text.",
  ),
  "Read a clothing store advertisement": read(
    "Winterschlussverkauf bei Modehaus Kern",
    "Nur vom 10. bis 17. Januar!\nAlle Wintermäntel: minus 40 %\nPullover — jetzt nur 19,99 € (vorher 39,99 €)\nJeans für Damen und Herren: 2 kaufen, 1 bezahlen\nKinderschuhe ab 15 €\nÖffnungszeiten: Mo–Fr 9–20 Uhr, Sa 9–18 Uhr. Sonntag geschlossen.",
    [
      pick("Wie lange gibt es die Angebote?", ["nur am 10. Januar", "vom 10. bis 17. Januar", "den ganzen Januar"], 1),
      gap("Ein Pullover kostet jetzt ___ Euro.", "19,99", "19.99"),
      pick("Wie viel billiger sind die Wintermäntel?", ["20 %", "40 %", "50 %"], 1),
      pick("Man kauft zwei Jeans. Wie viele bezahlt man?", ["eine", "zwei", "keine"], 0),
      pick("Wann ist das Geschäft zu?", ["am Samstag", "am Sonntag", "am Freitag"], 1),
    ],
    "I can read prices, discounts, dates and opening times in an advert.",
  ),
  "Read a short biography": read(
    "Wer war Albert Einstein?",
    "Albert Einstein wurde 1879 in Ulm geboren. Als Kind wohnte er in München. Er hat in der Schweiz studiert und dort später im Patentamt in Bern gearbeitet. 1905 hat er seine berühmte Relativitätstheorie veröffentlicht. 1921 hat er den Nobelpreis für Physik bekommen. Im Jahr 1933 ist er in die USA gegangen. Er ist 1955 in Princeton gestorben.",
    [
      gap("Einstein wurde in ___ geboren.", "Ulm"),
      gap("Er wurde im Jahr ___ geboren.", "1879"),
      pick("Wo hat er studiert?", ["in München", "in der Schweiz", "in den USA"], 1),
      pick("Wofür hat er den Nobelpreis bekommen?", ["für Chemie", "für Physik", "für Frieden"], 1),
      pick("Wann ist er in die USA gegangen?", ["1905", "1921", "1933"], 2),
    ],
    "I can find the key facts about a person's life in a short text.",
  ),
  "Read a text about hobbies": read(
    "Freizeit im Sprachkurs",
    "Im Deutschkurs sprechen wir über Hobbys. Lina aus Syrien liest gern Romane, am liebsten Krimis. Kenji aus Japan spielt jeden Samstag Tischtennis in einem Verein. Er sagt, so lernt er Leute kennen. Maria aus Brasilien tanzt Salsa, weil sie Musik liebt. Und David aus Nigeria kocht gern — am Sonntag kocht er oft für alle Freunde.",
    [
      pick("Was liest Lina am liebsten?", ["Zeitungen", "Krimis", "Kochbücher"], 1),
      pick("Wann spielt Kenji Tischtennis?", ["jeden Samstag", "jeden Sonntag", "jeden Tag"], 0),
      pick("Warum spielt Kenji im Verein?", ["Er möchte Leute kennenlernen.", "Er möchte Profi werden.", "Er hat keine Zeit."], 0),
      gap("Maria tanzt ___.", "Salsa"),
      pick("Wer kocht am Sonntag für Freunde?", ["Maria", "David", "Lina"], 1),
    ],
    "I can understand what people like to do and why.",
  ),
  "Read a simple invitation": read(
    "Einladung",
    "Liebe Nachbarn,\nam Samstag, den 21. Juni, feiern wir ab 16 Uhr ein Sommerfest im Hof! Es gibt Grillwürstchen, Salate und Getränke. Bitte bringt einen Kuchen oder einen Salat mit. Für die Kinder haben wir Spiele. Bei Regen feiern wir im Gemeinschaftsraum im Erdgeschoss.\nBitte sagt bis Mittwoch Bescheid, ob ihr kommt: Familie Petrović, Wohnung 4.",
    [
      pick("Was wird gefeiert?", ["ein Geburtstag", "ein Sommerfest", "eine Hochzeit"], 1),
      gap("Das Fest beginnt um ___ Uhr.", "16", "sechzehn"),
      pick("Was sollen die Gäste mitbringen?", ["Getränke", "einen Kuchen oder Salat", "Grillwürstchen"], 1),
      pick("Wo feiert man, wenn es regnet?", ["im Hof", "im Gemeinschaftsraum", "bei Familie Petrović"], 1),
      pick("Bis wann soll man Bescheid sagen?", ["bis Mittwoch", "bis Samstag", "bis 16 Uhr"], 0),
    ],
    "I can find what, when, where and what to bring in an invitation.",
  ),
  "Read a short weekend-plan text": read(
    "Pläne fürs Wochenende",
    "Hi Nora! Am Freitagabend gehen Timo und ich ins Kino, der Film beginnt um 20:15 Uhr. Am Samstagvormittag muss ich leider arbeiten, bis 13 Uhr. Am Samstagabend möchte ich mit dir essen gehen — hast du Zeit? Am Sonntag besuche ich meine Oma in Freiburg. Ich fahre um 10 Uhr mit dem Zug. Liebe Grüße, Jana",
    [
      pick("Mit wem geht Jana ins Kino?", ["mit Nora", "mit Timo", "mit ihrer Oma"], 1),
      gap("Der Film beginnt um ___ Uhr.", "20:15", "20.15", "Viertel nach acht"),
      pick("Was macht Jana am Samstagvormittag?", ["Sie arbeitet.", "Sie besucht ihre Oma.", "Sie geht essen."], 0),
      pick("Was möchte Jana am Samstagabend?", ["mit Nora essen gehen", "ins Kino gehen", "arbeiten"], 0),
      gap("Am Sonntag fährt Jana nach ___.", "Freiburg"),
    ],
    "I can follow what is planned when, and with whom.",
  ),
  "Read a pharmacy medicine label": read(
    "Packungsbeilage (kurz)",
    "IBUfit 400 mg — gegen Kopfschmerzen, Zahnschmerzen und Fieber.\nDosierung für Erwachsene: 1 Tablette, bis zu 3 Mal am Tag. Zwischen zwei Tabletten mindestens 6 Stunden warten.\nNehmen Sie die Tabletten nach dem Essen mit einem Glas Wasser.\nNicht für Kinder unter 12 Jahren. Nicht länger als 3 Tage ohne Arzt nehmen.",
    [
      pick("Wogegen hilft das Medikament?", ["gegen Husten", "gegen Kopfschmerzen und Fieber", "gegen Allergien"], 1),
      gap("Man darf höchstens ___ Tabletten am Tag nehmen.", "3", "drei"),
      gap("Zwischen zwei Tabletten wartet man mindestens ___ Stunden.", "6", "sechs"),
      pick("Wann nimmt man die Tabletten?", ["vor dem Essen", "nach dem Essen", "in der Nacht"], 1),
      pick("Ein 10-jähriges Kind darf die Tabletten …", ["nehmen", "nicht nehmen", "nur mit Wasser nehmen"], 1),
    ],
    "I can read the dose and the most important warnings on a medicine label.",
  ),
  "Read a simple form to understand what's required": read(
    "Anmeldung beim Sportverein",
    "ANMELDEFORMULAR — TSV Grünwald\nName, Vorname: ____________\nGeburtsdatum: ____________\nStraße, Hausnummer: ____________\nPLZ, Ort: ____________\nTelefon / E-Mail: ____________\nSportart: ☐ Fußball ☐ Schwimmen ☐ Yoga\nMonatsbeitrag: Erwachsene 15 €, Kinder 8 €\nIBAN für den Beitrag: ____________\nDatum, Unterschrift: ____________",
    [
      pick("What does „Geburtsdatum“ ask for?", ["date of birth", "place of birth", "today's date"], 0),
      pick("„PLZ“ is …", ["the postcode", "the phone number", "the street"], 0),
      gap("Ein Erwachsener zahlt ___ Euro im Monat.", "15", "fünfzehn"),
      pick("What goes into „IBAN“?", ["your bank account number", "your ID number", "your tax number"], 0),
      pick("At the end you have to …", ["pay cash", "sign the form", "send a photo"], 1),
    ],
    "I can understand what a simple form asks for.",
  ),
};

// ── listening: a script played as generated audio (transcript hidden until revealed), questions on it ─────────

const LISTENING: Record<string, Authored> = {
  "Listen to someone introducing themselves": listen(
    "Neu im Team",
    "Name, age, origin, job and languages?",
    "Hallo zusammen! Ich bin Tomasz Nowak, ich bin zweiunddreißig Jahre alt und komme aus Polen, aus Krakau. Seit einem Jahr wohne ich in Dresden. Ich bin Elektriker und arbeite ab heute hier im Team. Ich spreche Polnisch, Englisch und schon ganz gut Deutsch. Am Wochenende spiele ich gern Volleyball.",
    [
      gap("Tomasz ist ___ Jahre alt.", "32", "zweiunddreißig"),
      pick("Woher kommt Tomasz?", ["aus Dresden", "aus Polen", "aus England"], 1),
      pick("Was ist er von Beruf?", ["Mechaniker", "Elektriker", "Lehrer"], 1),
      pick("Seit wann wohnt er in Dresden?", ["seit einem Monat", "seit einem Jahr", "seit zwei Jahren"], 1),
      pick("Was macht er am Wochenende gern?", ["Fußball spielen", "Volleyball spielen", "schwimmen"], 1),
    ],
    "I can catch the main facts when someone introduces themselves.",
  ),
  "Listen to a family conversation": listen(
    "Fotos von der Familie",
    "Who is in the photo, and how are they related?",
    "– Oh, ist das deine Familie?\n– Ja, das ist mein Vater, und das ist meine Mutter. Sie wohnen noch in Kenia.\n– Und wer ist der junge Mann hier?\n– Das ist mein Bruder Daniel. Er ist zwanzig und studiert Medizin.\n– Hast du auch eine Schwester?\n– Ja, Grace. Sie ist verheiratet und hat zwei Söhne. Also bin ich schon Onkel!",
    [
      pick("Wo wohnen die Eltern?", ["in Deutschland", "in Kenia", "in England"], 1),
      gap("Der Bruder heißt ___.", "Daniel"),
      pick("Was macht der Bruder?", ["Er arbeitet.", "Er studiert Medizin.", "Er geht zur Schule."], 1),
      gap("Grace hat ___ Söhne.", "zwei", "2"),
      pick("Der Sprecher ist …", ["Vater", "Onkel", "Opa"], 1),
    ],
    "I can follow who belongs to a family in a conversation.",
  ),
  "Listen to numbers and prices being read aloud": listen(
    "Am Telefon und an der Kasse",
    "Catch the phone number and the prices.",
    "Meine Handynummer ist null eins fünf sieben, dreiundzwanzig, vierundachtzig, einundsechzig. Ich wiederhole: null eins fünf sieben, dreiundzwanzig, vierundachtzig, einundsechzig.\n– Das macht zusammen siebzehn Euro fünfundvierzig.\n– Hier sind zwanzig Euro.\n– Danke, und zwei Euro fünfundfünfzig zurück.",
    [
      pick("Die Handynummer ist 0157 …", ["23 84 61", "32 48 16", "23 48 61"], 0),
      pick("Wie viel kostet alles zusammen?", ["17,45 €", "17,54 €", "71,45 €"], 0),
      gap("Die Person bezahlt mit einem ___-Euro-Schein.", "20", "zwanzig"),
      pick("Wie viel Geld bekommt die Person zurück?", ["2,45 €", "2,55 €", "3,55 €"], 1),
      pick("„vierundachtzig“ =", ["48", "84", "804"], 1),
    ],
    "I can write down phone numbers and prices I hear.",
  ),
  "Listen to the time being announced": listen(
    "Wie spät ist es?",
    "Official and everyday times.",
    "– Entschuldigung, wie spät ist es?\n– Es ist Viertel nach zehn.\n– Danke! Mein Bus fährt um halb elf.\nAm Bahnhof: Der Intercity nach Hannover, planmäßige Abfahrt vierzehn Uhr zwanzig, fährt heute um vierzehn Uhr fünfunddreißig.\n– Treffen wir uns morgen um zehn vor acht?\n– Lieber um Viertel nach acht.",
    [
      pick("Wie spät ist es im ersten Gespräch?", ["10:15", "9:45", "10:30"], 0),
      pick("Wann fährt der Bus?", ["10:30", "11:30", "10:15"], 0),
      pick("Der Intercity fährt heute um …", ["14:20", "14:35", "14:53"], 1),
      pick("Wann treffen sich die Personen morgen?", ["7:50", "8:15", "7:45"], 1),
      pick("„zehn vor acht“ =", ["7:50", "8:10", "10:08"], 0),
    ],
    "I can understand clock times said officially and in everyday German.",
  ),
  "Listen to a supermarket conversation": listen(
    "An der Käsetheke",
    "What does the customer buy, and how much?",
    "– Guten Tag, was darf es sein?\n– Ich hätte gern zweihundert Gramm Gouda.\n– Am Stück oder in Scheiben?\n– In Scheiben, bitte. Und haben Sie Mozzarella?\n– Ja, im Kühlregal dort drüben, Gang drei.\n– Danke. Was kostet der Gouda?\n– Zwei Euro neunzig. Darf es sonst noch etwas sein?\n– Nein, danke, das ist alles.",
    [
      gap("Der Kunde möchte ___ Gramm Gouda.", "200", "zweihundert"),
      pick("Wie möchte er den Käse?", ["am Stück", "in Scheiben", "gerieben"], 1),
      gap("Mozzarella ist in Gang ___.", "3", "drei"),
      pick("Was kostet der Gouda?", ["2,19 €", "2,90 €", "9,20 €"], 1),
      pick("„Darf es sonst noch etwas sein?“ means …", ["Anything else?", "Can I help you?", "Is it good?"], 0),
    ],
    "I can follow what a customer buys, how much, and where to find it.",
  ),
  "Listen to someone ordering in a café": listen(
    "Im Café",
    "What is ordered, and how do they pay?",
    "– Hallo, was möchten Sie trinken?\n– Einen Cappuccino und ein Glas Leitungswasser, bitte.\n– Möchten Sie auch etwas essen?\n– Ja, ein Stück Käsekuchen.\n– Gern.\n– … Entschuldigung, ich möchte zahlen.\n– Ein Cappuccino und ein Käsekuchen, das macht sieben Euro sechzig.\n– Acht Euro, stimmt so. Kann ich mit Karte zahlen?\n– Leider nur bar.",
    [
      pick("Was trinkt der Gast?", ["einen Kaffee und einen Saft", "einen Cappuccino und Wasser", "einen Tee"], 1),
      gap("Der Gast isst ein Stück ___.", "Käsekuchen"),
      pick("Wie viel kostet alles?", ["7,60 €", "6,70 €", "8,00 €"], 0),
      pick("Wie viel Trinkgeld gibt der Gast?", ["60 Cent", "40 Cent", "1 Euro"], 1),
      pick("Wie kann man bezahlen?", ["nur mit Karte", "nur bar", "bar oder mit Karte"], 1),
    ],
    "I can follow an order, the price and the payment in a café.",
  ),
  "Listen to a conversation about hobbies": listen(
    "Was machst du gern?",
    "Who likes what, and when?",
    "– Du, Sam, was machst du eigentlich in deiner Freizeit?\n– Ich klettere. Zweimal pro Woche gehe ich in die Kletterhalle, dienstags und freitags.\n– Cool! Ich mache lieber Musik. Ich spiele Gitarre in einer Band.\n– Echt? Wann spielt ihr?\n– Wir üben jeden Donnerstag, und am Samstag haben wir ein Konzert. Kommst du?\n– Klar, gern!",
    [
      pick("Was macht Sam?", ["Er klettert.", "Er spielt Gitarre.", "Er schwimmt."], 0),
      gap("Sam geht ___ pro Woche in die Kletterhalle.", "zweimal", "2-mal", "2 mal"),
      pick("Welches Instrument spielt die andere Person?", ["Klavier", "Gitarre", "Schlagzeug"], 1),
      pick("Wann übt die Band?", ["am Dienstag", "am Donnerstag", "am Freitag"], 1),
      pick("Was ist am Samstag?", ["ein Konzert", "ein Kletterkurs", "ein Fußballspiel"], 0),
    ],
    "I can understand who does which hobby, and when.",
  ),
  "Listen to someone describing their home": listen(
    "Meine neue Wohnung",
    "Rooms, size, floor and what's good about it.",
    "Meine neue Wohnung ist nicht groß, aber sehr schön. Sie hat zwei Zimmer, eine kleine Küche und ein Bad mit Fenster. Insgesamt sind es fünfundfünfzig Quadratmeter. Die Wohnung ist im dritten Stock — leider gibt es keinen Aufzug. Aber es gibt einen Balkon! Das Wohnzimmer ist hell, und das Schlafzimmer ist ruhig, weil es zum Hof liegt. Die Miete ist sechshundertvierzig Euro warm.",
    [
      gap("Die Wohnung hat ___ Zimmer.", "zwei", "2"),
      gap("Die Wohnung hat ___ Quadratmeter.", "55", "fünfundfünfzig"),
      pick("In welchem Stock ist die Wohnung?", ["im ersten", "im zweiten", "im dritten"], 2),
      pick("Was gibt es nicht?", ["einen Balkon", "einen Aufzug", "ein Bad mit Fenster"], 1),
      pick("Warum ist das Schlafzimmer ruhig?", ["Es liegt zum Hof.", "Es ist klein.", "Es hat kein Fenster."], 0),
    ],
    "I can understand the rooms, size, location and rent of a flat.",
  ),
  "Listen to someone talking about their job": listen(
    "Mein Beruf",
    "Job, workplace, hours and what the person likes.",
    "Ich heiße Fatima und bin Zahnmedizinische Fachangestellte. Ich arbeite in einer Zahnarztpraxis in Bremen. Ich arbeite von Montag bis Freitag, meistens von acht bis sechzehn Uhr, am Mittwoch nur bis dreizehn Uhr. Ich empfange die Patienten, mache Termine und helfe dem Zahnarzt. Die Arbeit gefällt mir, weil ich gern mit Menschen spreche.",
    [
      pick("Wo arbeitet Fatima?", ["im Krankenhaus", "in einer Zahnarztpraxis", "in einer Apotheke"], 1),
      gap("Die Praxis ist in ___.", "Bremen"),
      pick("Wie lange arbeitet sie am Mittwoch?", ["bis 13 Uhr", "bis 16 Uhr", "gar nicht"], 0),
      pick("Was macht sie nicht?", ["Termine machen", "Patienten empfangen", "Zähne ziehen"], 2),
      pick("Warum gefällt ihr die Arbeit?", ["Sie verdient gut.", "Sie spricht gern mit Menschen.", "Sie hat viel Urlaub."], 1),
    ],
    "I can understand someone's job, workplace and working hours.",
  ),
  "Listen to a doctor's appointment being booked": listen(
    "Termin in der Praxis",
    "Why, when, and what to bring?",
    "– Praxis Dr. Yilmaz, guten Morgen.\n– Guten Morgen, hier ist Chen. Ich habe seit gestern starke Rückenschmerzen. Kann ich heute noch kommen?\n– Heute ist es leider voll. Morgen um halb elf?\n– Ja, das passt.\n– Waren Sie schon einmal bei uns?\n– Nein, noch nie.\n– Dann bringen Sie bitte Ihre Versichertenkarte mit. Bis morgen, Herr Chen.",
    [
      pick("Warum ruft Herr Chen an?", ["Er hat Kopfschmerzen.", "Er hat Rückenschmerzen.", "Er braucht ein Rezept."], 1),
      pick("Seit wann hat er Schmerzen?", ["seit heute", "seit gestern", "seit einer Woche"], 1),
      pick("Wann ist der Termin?", ["heute um 10:30", "morgen um 10:30", "morgen um 11:30"], 1),
      pick("War Herr Chen schon in der Praxis?", ["ja", "nein"], 1),
      gap("Er soll seine ___ mitbringen.", "Versichertenkarte", "Krankenversicherungskarte", "Gesundheitskarte"),
    ],
    "I can understand the reason, date, time and instructions when an appointment is booked.",
  ),
  "Listen to a conversation about clothes shopping": listen(
    "Im Kleidungsgeschäft",
    "Item, size, colour and price.",
    "– Kann ich Ihnen helfen?\n– Ja, ich suche eine Winterjacke.\n– Welche Größe haben Sie?\n– Größe L.\n– Hier haben wir diese Jacke in Schwarz und in Dunkelblau.\n– Kann ich die blaue anprobieren?\n– Natürlich, die Umkleidekabine ist dort hinten.\n– … Die passt gut. Was kostet sie?\n– Sie ist im Angebot: neunundachtzig Euro statt hundertzwanzig.\n– Super, die nehme ich.",
    [
      pick("Was sucht die Kundin?", ["eine Hose", "eine Winterjacke", "einen Pullover"], 1),
      gap("Sie hat Größe ___.", "L"),
      pick("Welche Farbe probiert sie an?", ["Schwarz", "Dunkelblau", "Grau"], 1),
      pick("Was kostet die Jacke jetzt?", ["89 €", "98 €", "120 €"], 0),
      pick("Kauft sie die Jacke?", ["ja", "nein"], 0),
    ],
    "I can follow size, colour and price when someone buys clothes.",
  ),
  "Listen to a simple story about yesterday": listen(
    "Gestern",
    "What happened, in which order?",
    "Gestern war ein komischer Tag. Ich habe verschlafen und bin erst um halb neun aufgestanden. Ich habe nicht gefrühstückt und bin schnell zum Bus gelaufen — aber der Bus ist ohne mich gefahren! Also habe ich ein Taxi genommen. Im Büro habe ich dann gemerkt: Ich habe mein Handy zu Hause vergessen. Am Abend bin ich früh ins Bett gegangen.",
    [
      pick("Wann ist die Person aufgestanden?", ["um 7:30", "um 8:30", "um 9:30"], 1),
      pick("Hat die Person gefrühstückt?", ["ja", "nein"], 1),
      pick("Wie ist sie zur Arbeit gekommen?", ["mit dem Bus", "mit dem Taxi", "zu Fuß"], 1),
      gap("Sie hat ihr ___ zu Hause vergessen.", "Handy", "Telefon", "Smartphone"),
      pick("„Ich habe verschlafen“ means …", ["I overslept.", "I slept well.", "I fell asleep."], 0),
    ],
    "I can follow a short story told in the Perfekt.",
  ),
  "Listen to a conversation about weekend plans": listen(
    "Was machst du am Wochenende?",
    "What's planned, when and with whom?",
    "– Na, Lukas, was machst du am Wochenende?\n– Am Samstag helfe ich meinem Bruder beim Umzug, den ganzen Tag. Am Abend bin ich bestimmt müde.\n– Und am Sonntag?\n– Am Sonntag gehe ich mit meiner Freundin wandern, wenn das Wetter gut ist. Und du?\n– Ich habe am Samstag Geburtstag! Ich mache eine kleine Party. Du kannst gern am Sonntag nach dem Wandern vorbeikommen, um sieben.",
    [
      pick("Was macht Lukas am Samstag?", ["Er hilft beim Umzug.", "Er geht wandern.", "Er feiert Geburtstag."], 0),
      pick("Wem hilft Lukas?", ["seiner Freundin", "seinem Bruder", "seinem Vater"], 1),
      pick("Was macht er am Sonntag?", ["wandern", "arbeiten", "eine Party machen"], 0),
      pick("Wer hat am Samstag Geburtstag?", ["Lukas", "die andere Person", "die Freundin"], 1),
      gap("Die Einladung für Sonntag ist um ___ Uhr.", "sieben", "7", "19"),
    ],
    "I can understand who plans what, when and with whom.",
  ),
  "Listen to a phone call making an appointment": listen(
    "Termin beim Friseur",
    "Which day and time do they agree on?",
    "– Salon Schnittig, guten Tag.\n– Guten Tag, ich möchte einen Termin zum Haareschneiden.\n– Gern. Am Donnerstag um zehn Uhr?\n– Donnerstag kann ich leider nicht, da arbeite ich. Geht Freitag?\n– Freitag um vierzehn Uhr oder um siebzehn Uhr.\n– Siebzehn Uhr ist gut.\n– Und Ihr Name, bitte?\n– Novak, N-O-V-A-K.\n– Danke, Frau Novak, bis Freitag um siebzehn Uhr.",
    [
      pick("Warum kann Frau Novak am Donnerstag nicht?", ["Sie ist krank.", "Sie arbeitet.", "Sie hat Urlaub."], 1),
      pick("An welchem Tag ist der Termin?", ["am Donnerstag", "am Freitag", "am Samstag"], 1),
      pick("Um wie viel Uhr?", ["10 Uhr", "14 Uhr", "17 Uhr"], 2),
      pick("Wofür ist der Termin?", ["Haareschneiden", "Arzt", "Bewerbungsgespräch"], 0),
      gap("Wie schreibt man den Namen? N-O-V-A-___", "K"),
    ],
    "I can follow a phone call that sets a day and time.",
  ),
  "Listen to a public transport announcement": listen(
    "Durchsagen",
    "Platform, delay and next stop.",
    "Information zu RE 7 nach Rostock, planmäßige Abfahrt 11 Uhr 04: Dieser Zug fährt heute von Gleis 5 statt von Gleis 2. Wir bitten um Beachtung.\nIn der S-Bahn: Nächster Halt: Rathaus. Ausstieg in Fahrtrichtung links. Umsteigemöglichkeit zur U3.\nAchtung an Gleis 8: Der ICE nach Frankfurt hat heute etwa fünfzehn Minuten Verspätung.",
    [
      pick("Von welchem Gleis fährt der RE 7 heute?", ["Gleis 2", "Gleis 5", "Gleis 7"], 1),
      pick("Was ist der nächste Halt der S-Bahn?", ["Rathaus", "Rostock", "Frankfurt"], 0),
      pick("Auf welcher Seite steigt man aus?", ["links", "rechts"], 0),
      gap("Man kann in die U-Bahn-Linie U___ umsteigen.", "3", "drei"),
      pick("Wie viel Verspätung hat der ICE?", ["5 Minuten", "15 Minuten", "50 Minuten"], 1),
    ],
    "I can catch platform changes, the next stop and delays in announcements.",
  ),
  "Listen to someone describing their daily routine": listen(
    "Mein Tag als Pflegekraft",
    "The order of the day.",
    "Ich arbeite in der Frühschicht im Pflegeheim. Mein Wecker klingelt um fünf Uhr. Ich dusche schnell und trinke einen Tee — frühstücken kann ich so früh nicht. Um sechs fahre ich mit der Straßenbahn zur Arbeit. Die Schicht dauert von halb sieben bis vierzehn Uhr. Um zehn mache ich Pause und esse endlich etwas. Nach der Arbeit gehe ich einkaufen, und abends lerne ich eine Stunde Deutsch.",
    [
      pick("Wann klingelt der Wecker?", ["um 5 Uhr", "um 6 Uhr", "um 6:30 Uhr"], 0),
      pick("Was macht die Person morgens nicht?", ["duschen", "Tee trinken", "frühstücken"], 2),
      pick("Wie fährt sie zur Arbeit?", ["mit dem Bus", "mit der Straßenbahn", "mit dem Fahrrad"], 1),
      pick("Wann beginnt die Schicht?", ["um 6:00", "um 6:30", "um 7:00"], 1),
      pick("Was macht sie am Abend?", ["Sie geht einkaufen.", "Sie lernt Deutsch.", "Sie arbeitet."], 1),
    ],
    "I can follow the order of someone's day from what I hear.",
  ),
};

// ── speaking: a recording of a concrete task, with the phrases to build it from ───────────────────────────
const SPEAKING: Record<string, Authored> = {
  "Order in a café or restaurant": speak(
    "Du bist im Café. Bestelle ein Getränk und etwas zu essen, frag nach dem Preis und bezahle. (Play both roles if you like.)",
    "Ich hätte gern … / Ich nehme … · Einen Kaffee, bitte. · Haben Sie auch …? · Was kostet …? · Die Rechnung, bitte. / Ich möchte zahlen. · Zusammen, bitte. · Stimmt so.",
    "Guten Tag! Ich hätte gern einen Tee und ein Stück Apfelkuchen, bitte. … Entschuldigung, ich möchte zahlen. Was kostet das? … Sechs Euro? Hier sind sieben Euro, stimmt so.",
    "I can order food and drink and pay in a café.",
  ),
  "Handle a shopping dialogue": speak(
    "Du suchst eine Hose in Größe M. Frag, wo die Hosen sind, ob es die Hose in Blau gibt, und was sie kostet.",
    "Entschuldigung, wo finde ich …? · Haben Sie die Hose auch in Blau / in Größe M? · Kann ich sie anprobieren? · Was kostet sie? · Das ist zu teuer. · Ich nehme sie.",
    "Entschuldigung, wo finde ich Hosen? … Danke. Haben Sie diese Hose auch in Blau, in Größe M? … Kann ich sie anprobieren? … Sie passt gut. Was kostet sie? … Gut, ich nehme sie.",
    "I can ask for an item, a size, a colour and the price in a shop.",
  ),
  "Make and change appointments": speak(
    "Ruf in einer Praxis an: Mach einen Termin für Dienstagvormittag. Dann ruf wieder an und verschieb den Termin auf Donnerstag.",
    "Ich möchte einen Termin machen. · Haben Sie am Dienstag Zeit? · Geht es um 10 Uhr? · Das passt (nicht). · Ich muss den Termin leider verschieben / absagen. · Geht es am Donnerstag?",
    "Guten Tag, hier ist Aylin Demir. Ich möchte einen Termin machen, am Dienstag vormittags. … Um zehn Uhr? Das passt, danke. … Hallo, hier ist noch einmal Aylin Demir. Ich muss meinen Termin am Dienstag leider verschieben. Geht es am Donnerstag?",
    "I can make an appointment and change it by phone.",
  ),
  "Talk about your family": speak(
    "Erzähl 45 Sekunden über deine Familie: Eltern, Geschwister, wer wo wohnt und was sie machen.",
    "Meine Familie ist groß / klein. · Ich habe … Geschwister. · Mein Vater / Meine Mutter heißt … und ist … · Mein Bruder wohnt in … · Ich bin ledig / verheiratet und habe … Kinder.",
    "Meine Familie ist groß. Meine Eltern wohnen in Chennai. Mein Vater ist Ingenieur und meine Mutter ist Lehrerin. Ich habe zwei Geschwister: Mein Bruder studiert in Bangalore und meine Schwester arbeitet in Dubai. Ich bin ledig.",
    "I can describe my family in a few connected sentences.",
  ),
  "Describe your daily routine": speak(
    "Beschreib einen normalen Arbeitstag von morgens bis abends, mit Uhrzeiten und zuerst / dann / danach.",
    "Ich stehe um … auf. · Zuerst … dann … danach … · Um … Uhr fahre ich zur Arbeit. · Mittags esse ich … · Nach der Arbeit … · Um … gehe ich ins Bett.",
    "Ich stehe um halb sieben auf. Zuerst dusche ich, dann frühstücke ich. Um halb acht fahre ich mit dem Bus zur Arbeit. Ich arbeite von acht bis vier. Danach kaufe ich ein und koche. Abends lerne ich Deutsch, und um elf gehe ich ins Bett.",
    "I can describe my day in order, with times.",
  ),
  "Discuss your hobbies and free time": speak(
    "Erzähl, was du in deiner Freizeit gern machst, wann und mit wem — und frag dann jemanden nach seinen Hobbys.",
    "In meiner Freizeit … · Ich … gern / lieber / am liebsten. · Am Wochenende … · Zweimal pro Woche … · Was machst du gern? · Hast du Lust, am Samstag … ?",
    "In meiner Freizeit spiele ich gern Cricket, am Sonntag mit Freunden im Park. Ich koche auch gern, am liebsten indisches Essen. Und du? Was machst du gern? Hast du Lust, am Samstag mit mir zu kochen?",
    "I can talk about my hobbies and ask about someone else's.",
  ),
  "Ask for and give directions": speak(
    "Jemand fragt dich: „Wie komme ich zum Bahnhof?“ Erklär den Weg von deiner Wohnung aus in vier Schritten.",
    "Gehen Sie geradeaus … · Biegen Sie an der Ampel / an der Kreuzung links / rechts ab. · Nehmen Sie die erste / zweite Straße rechts. · Dann sehen Sie … · Es ist (nicht) weit — ungefähr … Minuten.",
    "Gehen Sie hier geradeaus bis zur Ampel. An der Ampel biegen Sie links ab. Dann nehmen Sie die zweite Straße rechts. Der Bahnhof ist auf der linken Seite. Zu Fuß sind es ungefähr zehn Minuten.",
    "I can give clear directions in a few steps.",
  ),
  "Talk about the weather": speak(
    "Beschreib das Wetter heute und morgen, und vergleich es mit dem Wetter in deinem Heimatland.",
    "Heute ist es sonnig / bewölkt / kalt / warm. · Es regnet / schneit. · Es sind … Grad. · Morgen wird es … · In … ist es jetzt … · Im Sommer / Winter …",
    "Heute ist es bewölkt und kühl, es sind nur zwölf Grad. Morgen regnet es vielleicht. In Indien ist es jetzt viel wärmer, ungefähr dreißig Grad. Im Winter schneit es hier, aber in meiner Stadt schneit es nie.",
    "I can describe and compare the weather.",
  ),
  "Describe your home": speak(
    "Beschreib deine Wohnung: wie viele Zimmer, welcher Stock, was es gibt, was dir gefällt und was nicht.",
    "Meine Wohnung hat … Zimmer. · Sie ist im … Stock. · Es gibt eine Küche, ein Bad und einen Balkon. · Das Wohnzimmer ist hell / groß. · Mir gefällt …, aber … · Die Miete ist …",
    "Ich wohne in einer Zweizimmerwohnung im zweiten Stock. Es gibt eine kleine Küche, ein Bad und einen Balkon. Das Wohnzimmer ist hell, aber das Schlafzimmer ist ein bisschen klein. Mir gefällt die Lage — der Supermarkt ist direkt gegenüber.",
    "I can describe my flat.",
  ),
  "Talk about your job or studies": speak(
    "Erzähl, was du beruflich machst oder machen möchtest: Beruf, Arbeitsort, Arbeitszeit, was dir gefällt.",
    "Ich bin … von Beruf. · Ich arbeite bei / in … · Ich arbeite von … bis … · Ich möchte eine Ausbildung als … machen. · Mir gefällt …, weil …",
    "Ich bin Krankenpfleger von Beruf. Jetzt lerne ich Deutsch, weil ich in Deutschland in einem Krankenhaus arbeiten möchte. Ich möchte eine Ausbildung als Pflegefachmann machen. Mir gefällt der Beruf, weil ich gern Menschen helfe.",
    "I can talk about my job, training plans and why I like them.",
  ),
  "Buy a train or bus ticket": speak(
    "Kauf am Schalter eine Fahrkarte nach Köln, hin und zurück, für morgen früh. Frag nach Gleis und Umsteigen.",
    "Einmal nach …, bitte. · Hin und zurück / nur einfach. · Für morgen früh. · Wann fährt der nächste Zug? · Muss ich umsteigen? · Von welchem Gleis? · Was kostet das?",
    "Guten Tag, einmal nach Köln, bitte, hin und zurück, für morgen früh. Wann fährt der erste Zug? … Muss ich umsteigen? … Und von welchem Gleis fährt er? … Was kostet das?",
    "I can buy a ticket and ask about times, changes and platforms.",
  ),
  "Give your phone number and address": speak(
    "Sag deinen Namen, buchstabiere ihn, und sag deine Adresse und Telefonnummer — so, wie du es am Telefon machen würdest.",
    "Mein Name ist … Ich buchstabiere: … · Ich wohne in der …straße …, (PLZ) (Stadt). · Meine Telefonnummer ist … · Numbers in pairs: 43 = dreiundvierzig.",
    "Mein Name ist Sanjay Mehta, M-E-H-T-A. Ich wohne in der Lindenstraße 14, 04109 Leipzig. Meine Handynummer ist null eins sieben sechs, zweiundvierzig, fünfundachtzig, dreizehn.",
    "I can give my name, address and phone number clearly.",
  ),
  "Small talk about where you're from": speak(
    "Jemand fragt: „Woher kommst du, und wie lange lebst du schon hier?“ Antworte und stell zwei Fragen zurück.",
    "Ich komme aus … · Das liegt im Norden / Süden von … · Ich lebe seit … Monaten / Jahren in … · Mir gefällt es hier, weil … · Und du, woher kommst du? · Wie lange wohnst du schon hier?",
    "Ich komme aus Kochi, das liegt im Süden von Indien. Ich lebe seit acht Monaten in Hannover. Mir gefällt es hier, aber das Wetter ist oft kalt! Und du, woher kommst du? Wie lange wohnst du schon hier?",
    "I can make small talk about where I'm from.",
  ),
  "Describe what you did yesterday": speak(
    "Erzähl, was du gestern gemacht hast — mindestens fünf Sätze im Perfekt, mit haben und sein.",
    "Gestern bin ich um … aufgestanden. · Ich habe … gefrühstückt / gearbeitet / eingekauft / gekocht. · Ich bin … gefahren / gegangen. · Am Abend habe ich … · Danach bin ich …",
    "Gestern bin ich um sieben aufgestanden. Ich habe gefrühstückt und bin dann zum Deutschkurs gefahren. Mittags habe ich mit einer Freundin gegessen. Am Nachmittag habe ich eingekauft, und am Abend habe ich meine Familie angerufen.",
    "I can tell what I did yesterday in the Perfekt.",
  ),
  "Talk about your weekend plans": speak(
    "Erzähl, was du am Wochenende machen möchtest und was du machen musst. Benutze möchte und muss.",
    "Am Samstag möchte ich … · Am Sonntag muss ich … · Vielleicht … · Ich habe keine Zeit, weil … · Hast du Lust, mitzukommen?",
    "Am Samstag muss ich leider arbeiten, bis zwei Uhr. Danach möchte ich einkaufen gehen. Am Sonntag möchte ich ausschlafen und dann mit Freunden in den Park gehen. Am Abend muss ich noch für den Kurs lernen.",
    "I can talk about plans and obligations with möchten and müssen.",
  ),
  "Say what you can, must and want to do": speak(
    "Sag je zwei Sätze: was du gut kannst, was du diese Woche machen musst und was du gern machen möchtest.",
    "Ich kann gut … · Ich kann nicht … · Diese Woche muss ich … · Ich möchte gern … · Remember: modal in position 2, infinitive at the end.",
    "Ich kann gut kochen und ich kann ein bisschen Gitarre spielen. Diese Woche muss ich zum Bürgeramt gehen und meine Wohnung putzen. Ich möchte gern im Sommer nach Berlin fahren und bald B1 machen.",
    "I can use können, müssen and möchten in my own sentences.",
  ),
  "Describe symptoms at the doctor's": speak(
    "Du bist beim Arzt. Sag, was dir wehtut, seit wann, und frag, ob du eine Krankmeldung bekommst.",
    "Ich habe seit … Kopfschmerzen / Halsschmerzen / Fieber. · Mein … tut weh. · Mir ist schlecht. · Ich kann nicht schlafen. · Brauche ich Medikamente? · Bekomme ich eine Krankmeldung?",
    "Guten Tag, Herr Doktor. Ich habe seit zwei Tagen starke Halsschmerzen und Fieber, ungefähr achtunddreißig Grad. Mir ist auch ein bisschen schlecht. Ich kann nicht arbeiten. Bekomme ich eine Krankmeldung für meinen Arbeitgeber?",
    "I can describe symptoms and ask for a sick note.",
  ),
  "Talk about clothes and colors you like": speak(
    "Beschreib, was du heute trägst, und was du gern trägst — mit Farben.",
    "Heute trage ich eine … Hose und einen … Pullover. · Ich trage gern … · Meine Lieblingsfarbe ist … · Im Winter trage ich … · … steht mir gut.",
    "Heute trage ich eine blaue Jeans, einen grauen Pullover und schwarze Schuhe. Ich trage gern bequeme Kleidung. Meine Lieblingsfarbe ist grün. Im Winter trage ich immer eine dicke Jacke und einen Schal.",
    "I can describe clothes and colours.",
  ),
  "Ask someone about their daily routine": speak(
    "Stell einer Person fünf Fragen zu ihrem Tagesablauf (Wann …? Was …? Wie …?), und reagiere auf die Antworten.",
    "Wann stehst du auf? · Was frühstückst du? · Wie fährst du zur Arbeit? · Wie lange arbeitest du? · Was machst du am Abend? · Reactions: Echt? · Das ist früh! · Ich auch.",
    "Wann stehst du morgens auf? … Oh, das ist früh! Was frühstückst du? … Wie fährst du zur Arbeit? … Und wie lange arbeitest du? … Was machst du am Abend?",
    "I can ask about someone's daily routine and react.",
  ),
  "Introduce a family member to someone": speak(
    "Stell einem Kollegen deine Schwester oder deinen Bruder vor: Name, Alter, Beruf, wo er/sie wohnt.",
    "Das ist mein Bruder / meine Schwester … · Er / Sie heißt … und ist … Jahre alt. · Er / Sie arbeitet als … / studiert … · Er / Sie wohnt in … · Freut mich!",
    "Darf ich vorstellen? Das ist meine Schwester Meera. Sie ist dreiundzwanzig und studiert Informatik in Berlin. Sie besucht mich dieses Wochenende. Meera, das ist mein Kollege Jonas.",
    "I can introduce a family member.",
  ),
};

export const A1_CHECKS: Record<string, Authored> = { ...GRAMMAR, ...VOCAB, ...READING, ...LISTENING, ...SPEAKING };
