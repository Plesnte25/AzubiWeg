/**
 * B1 checked exercises (KNOWN_ISSUES #38) — same format and authoring rules as syllabus-checks-a1.ts: a real lesson
 * per topic and a check_set that tests that lesson (80 % to pass); speaking topics are recordings. B1 items lean on
 * whole-clause choices (word order, tense sequence) and on inference in reading and listening, not just single forms.
 */
import { checks, gap, hintGap, listen, pick, read, speak, type Authored } from "./syllabus-checks-kit.js";

// ── grammar ──────────────────────────────────────────────────────────────────

const GRAMMAR: Record<string, Authored> = {
  "All cases with definite articles": {
    learningOutcome: "I can decline adjectives after der/die/das in all four cases, including the genitive.",
    resourceBody:
      "After der/die/das, dieser, jeder, welcher, alle: only two endings, -e and -en.\n" +
      "-e: the five \"basic\" slots — nom. masc./fem./neut. sing. (der alte Mann, die neue Stelle, das kleine Kind) and acc. fem./neut. (die neue Stelle, das kleine Kind)\n" +
      "-en: everything else — acc. masc. (den alten Mann), all dative (dem alten Mann, der neuen Stelle), all genitive (des alten Mannes, der neuen Stelle), all plural (die neuen Kollegen)\n" +
      "Genitive masc./neut. nouns add -(e)s: wegen des schlechten Wetters · das Ende des langen Tages.",
    guidedPractice: "Take „der neue Kollege“ through all four cases in sentences of your own.",
    ...checks("Schreib das Adjektiv mit der richtigen Endung.", [
      hintGap("Wegen des ___ Wetters fiel das Fest aus.", "schlecht", "schlechten"),
      hintGap("Ich habe mit der ___ Kollegin gesprochen.", "neu", "neuen"),
      hintGap("Das ___ Kind schläft schon.", "klein", "kleine"),
      hintGap("Kennst du den ___ Mann dort?", "alt", "alten"),
      hintGap("Die Ergebnisse der ___ Prüfungen kommen morgen.", "schriftlich", "schriftlichen"),
      hintGap("Sie hat die ___ Stelle in München angenommen.", "neu", "neue"),
    ]),
  },
  "All cases with indefinite & no article": {
    learningOutcome: "I can decline adjectives after ein/kein/mein and with no article.",
    resourceBody:
      "After ein/kein/mein the adjective shows the gender where the article can't: ein alter Freund · ein neues Auto (nom./acc. neut.); otherwise like after der: einen alten Freund, mit einem alten Freund, meiner neuen Stelle.\n" +
      "No article: the adjective takes the article's ending itself: frischer Kaffee (der), frische Milch (die), frisches Brot (das), mit frischem Brot (dem), frische Brötchen (plural).\n" +
      "Exception — genitive masc./neut. without article: -en (trotz starken Regens), because the noun already shows -s.\n" +
      "Typical no-article phrases: bei gutem Wetter · mit freundlichen Grüßen · Guten Tag!",
    guidedPractice: "Write a shopping list with no articles, then say what you buy: Ich kaufe frisches Brot, …",
    ...checks("Schreib das Adjektiv mit der richtigen Endung.", [
      hintGap("Bei ___ Wetter gehen wir wandern.", "gut", "gutem"),
      hintGap("Ich trinke morgens ___ Kaffee.", "schwarz", "schwarzen"),
      hintGap("Mit ___ Grüßen, Anna Weber", "freundlich", "freundlichen"),
      hintGap("Er ist ein ___ Freund von mir.", "alt", "alter"),
      hintGap("Das Hotel bietet ___ Brot zum Frühstück.", "frisch", "frisches"),
      hintGap("Trotz ___ Regens fuhren wir los.", "stark", "starken"),
    ]),
  },
  "Präteritum: regular verbs": {
    learningOutcome: "I can form and read the Präteritum of regular verbs.",
    resourceBody:
      "Regular verbs: stem + -te + ending: ich machte · du machtest · er machte · wir machten · ihr machtet · sie machten\n" +
      "Stem ending in -t/-d or a consonant cluster: + -ete: arbeiten → arbeitete · warten → wartete · öffnen → öffnete\n" +
      "Separable verbs split as in the present: aufhören → hörte … auf · einkaufen → kaufte … ein\n" +
      "The Präteritum is the written narrative tense (reports, stories, news); in speech you use the Perfekt, except sein, haben and the modals.",
    guidedPractice: "Rewrite five sentences of your last diary entry from Perfekt into Präteritum.",
    ...checks("Setze das Verb im Präteritum ein.", [
      hintGap("Früher ___ sie in einer Bäckerei.", "arbeiten", "arbeitete"),
      hintGap("Wir ___ eine Stunde auf den Zug.", "warten", "warteten"),
      hintGap("Er ___ jeden Samstag auf dem Markt ein.", "einkaufen", "kaufte"),
      hintGap("Als Kind ___ ich sehr gern Fußball.", "spielen", "spielte"),
      hintGap("Die Firma ___ im Jahr 2019 eine neue Filiale.", "eröffnen", "eröffnete"),
      hintGap("___ du damals schon in Berlin?", "wohnen", "Wohntest"),
    ]),
  },
  "Präteritum: irregular & mixed verbs": {
    learningOutcome: "I can recognise and use the Präteritum of common irregular and mixed verbs.",
    resourceBody:
      "Irregular (strong): vowel change, no -te; ich/er have no ending: gehen → ging · kommen → kam · sehen → sah · finden → fand · sprechen → sprach · schreiben → schrieb · fahren → fuhr · bleiben → blieb · stehen → stand · nehmen → nahm · geben → gab · helfen → half\n" +
      "Endings: ich ging · du gingst · er ging · wir gingen · ihr gingt · sie gingen\n" +
      "Mixed: vowel change + -te: bringen → brachte · denken → dachte · wissen → wusste · kennen → kannte · rennen → rannte\n" +
      "werden → wurde · sein → war · haben → hatte",
    guidedPractice: "Retell a fairy tale you know in eight sentences in the Präteritum.",
    ...checks("Setze das Verb im Präteritum ein.", [
      hintGap("Gestern ___ ich einen alten Freund in der Stadt.", "treffen", "traf"),
      hintGap("Sie ___ nicht, wo der Schlüssel war.", "wissen", "wusste"),
      hintGap("Er ___ den ganzen Tag im Bett.", "bleiben", "blieb"),
      hintGap("Wir ___ mit dem Zug nach Wien.", "fahren", "fuhren"),
      hintGap("Ich ___ lange über das Angebot nach.", "nachdenken", "dachte"),
      hintGap("Der Chef ___ mit allen Mitarbeitern.", "sprechen", "sprach"),
    ]),
  },
  Plusquamperfekt: {
    learningOutcome: "I can use the Plusquamperfekt for what happened before another past event.",
    resourceBody:
      "Form: hatte/war (Präteritum) + Partizip II — the same haben/sein choice as in the Perfekt.\n" +
      "Ich hatte schon gegessen. · Sie war schon gegangen.\n" +
      "Use: the earlier of two past events: Als ich am Bahnhof ankam, war der Zug schon abgefahren. (first the train left, then I arrived)\n" +
      "Typical with nachdem and schon/bereits: Nachdem er die Prüfung bestanden hatte, feierte er.",
    guidedPractice: "Write three sentences: Als ich ankam, hatte/war … schon …",
    ...checks("Setze hatte/war + Partizip ein oder wähle.", [
      pick("Als ich ins Kino kam, …", ["… hat der Film schon angefangen.", "… hatte der Film schon angefangen.", "… fängt der Film schon an."], 1),
      gap("Als wir ankamen, ___ der Zug schon abgefahren.", "war"),
      gap("Sie konnte nicht einschlafen, weil sie zu viel Kaffee getrunken ___.", "hatte"),
      hintGap("Nachdem er den Vertrag ___ hatte, fing er an.", "unterschreiben", "unterschrieben"),
      pick("Which happened first? „Ich war müde, weil ich schlecht geschlafen hatte.“", ["I was tired.", "I slept badly."], 1),
      gap("Er ___ schon nach Hause gegangen, als ich anrief.", "war"),
    ]),
  },
  "nachdem, als, während": {
    learningOutcome: "I can link past events with nachdem, als and während and use the right tense sequence.",
    resourceBody:
      "als: a single event or period in the past: Als ich in Indien lebte, … · Als ich ankam, …\n" +
      "wenn: repeated past events (every time) or present/future: Immer wenn ich ihn traf, … \n" +
      "während: at the same time: Während ich kochte, telefonierte er.\n" +
      "nachdem: one step further back — nachdem-clause Plusquamperfekt, main clause Präteritum/Perfekt: Nachdem ich gegessen hatte, ging ich spazieren. (present: Nachdem ich gegessen habe, gehe ich …)\n" +
      "bevor: the reverse: Bevor ich ging, schloss ich die Tür ab.",
    guidedPractice: "Tell the story of your arrival in Germany with als, während, nachdem and bevor.",
    ...checks("als, wenn, während, nachdem oder bevor?", [
      gap("___ ich zehn Jahre alt war, zogen wir nach Delhi.", "Als"),
      gap("___ ich das Formular ausgefüllt hatte, schickte ich es ab.", "Nachdem"),
      gap("___ die Kinder schliefen, räumten wir die Küche auf.", "Während"),
      gap("Immer ___ ich meine Oma besuchte, backte sie Kuchen.", "wenn"),
      pick("Nachdem sie die Prüfung bestanden …, feierte sie.", ["hat", "hatte", "habe"], 1),
      gap("Mach bitte das Licht aus, ___ du gehst.", "bevor", "wenn"),
    ]),
  },
  "Present & past passive": {
    learningOutcome: "I can form the passive in the present and Präteritum and say what is done, not who does it.",
    resourceBody:
      "Present passive: werden + Partizip II: Das Paket wird heute geliefert. · Die Briefe werden sortiert.\n" +
      "Präteritum passive: wurde + Partizip II: Das Haus wurde 1905 gebaut. · Die Gäste wurden begrüßt.\n" +
      "(Perfekt passive: ist … worden — Das Haus ist renoviert worden.)\n" +
      "Active → passive: the accusative object becomes the subject: Man repariert das Auto. → Das Auto wird repariert.\n" +
      "Used in instructions, reports, processes: Zuerst wird das Wasser gekocht, dann werden die Nudeln hinzugefügt.",
    guidedPractice: "Describe how coffee is made or how an application is processed, in the passive.",
    ...checks("Setze die Passivform ein.", [
      gap("Das Paket ___ morgen geliefert. (present)", "wird"),
      gap("Die Brücke ___ im Jahr 1890 gebaut. (Präteritum)", "wurde"),
      hintGap("Die Bewerbungen werden am Montag ___.", "prüfen", "geprüft"),
      gap("In Deutschland ___ viel Müll recycelt. (present)", "wird"),
      pick("Man renoviert die Schule. → Passiv:", ["Die Schule wird renoviert.", "Die Schule wurde renoviert.", "Die Schule renoviert."], 0),
      gap("Die Gäste ___ vom Chef begrüßt. (Präteritum, plural)", "wurden"),
    ]),
  },
  "Passive with modals": {
    learningOutcome: "I can use the passive with modal verbs for rules and requirements.",
    resourceBody:
      "Modal (position 2) + Partizip II + werden (end):\n" +
      "Der Antrag muss bis Freitag eingereicht werden. · Hier darf nicht geraucht werden. · Das kann nicht repariert werden. · Die Rechnung soll sofort bezahlt werden.\n" +
      "Past: Der Antrag musste eingereicht werden.\n" +
      "In a subordinate clause the modal goes to the very end: …, dass der Antrag eingereicht werden muss.\n" +
      "Very common in forms, rules and job descriptions.",
    guidedPractice: "Write five house rules or workplace rules with muss/darf nicht … werden.",
    ...checks("Ergänze.", [
      pick("The form must be signed.", ["Das Formular muss unterschrieben werden.", "Das Formular muss unterschreiben werden.", "Das Formular wird unterschrieben müssen."], 0),
      gap("Hier darf nicht geraucht ___.", "werden"),
      hintGap("Die Rechnung muss innerhalb von 14 Tagen ___ werden.", "bezahlen", "bezahlt"),
      gap("Die Maschine ___ leider nicht repariert werden. (can)", "kann"),
      pick("Ich weiß, dass der Antrag …", ["… muss eingereicht werden.", "… eingereicht werden muss.", "… eingereicht muss werden."], 1),
      gap("Der Bericht ___ gestern fertig geschrieben werden. (had to)", "musste"),
    ]),
  },
  "Agent with von / durch": {
    learningOutcome: "I can name the agent in a passive sentence and know when to leave it out.",
    resourceBody:
      "von + dative: the person or thing who does the action: Das Buch wurde von Goethe geschrieben. · Die Mail wurde vom Chef geschickt.\n" +
      "durch + accusative: the means or cause (often an event or process): Die Stadt wurde durch ein Erdbeben zerstört. · Der Fehler wurde durch einen Test entdeckt.\n" +
      "Leave the agent out when it's obvious, unknown or unimportant: Mein Fahrrad wurde gestohlen. (by someone) · Die Post wird am Morgen gebracht.",
    guidedPractice: "Write three passive news headlines, one with von, one with durch, one without an agent.",
    ...checks("von oder durch? / Wähle.", [
      gap("Das Bild wurde ___ Picasso gemalt.", "von"),
      gap("Das Dorf wurde ___ eine Überschwemmung zerstört.", "durch"),
      gap("Die Entscheidung wurde von ___ Chefin getroffen. (die)", "der"),
      gap("Viele Arbeitsplätze wurden ___ die Digitalisierung verändert.", "durch"),
      pick("Mein Fahrrad wurde gestohlen. — Why no agent?", ["The thief is unknown.", "It's grammatically forbidden.", "Bicycles never take von."], 0),
      gap("Die Mail wurde ___ Chef geschickt. (von + dem — one word)", "vom"),
    ]),
  },
  "wäre, hätte, würde, könnte": {
    learningOutcome: "I can form the Konjunktiv II and use it for politeness and hypotheses.",
    resourceBody:
      "Own forms (common verbs): sein → wäre · haben → hätte · können → könnte · müssen → müsste · dürfen → dürfte · sollen → sollte · wissen → wüsste · werden → würde\n" +
      "Endings: ich wäre · du wärst · er wäre · wir wären · ihr wärt · sie wären\n" +
      "All other verbs: würde + infinitive: Ich würde gern kommen.\n" +
      "Politeness: Könnten Sie …? · Hätten Sie kurz Zeit? · Wäre es möglich, dass …? · Ich hätte eine Frage.\n" +
      "Hypothesis: Das wäre toll! · Ohne dich hätte ich das nicht geschafft.",
    guidedPractice: "Make five polite requests to an office with könnten, hätten and wäre es möglich.",
    ...checks("Setze die Konjunktiv-II-Form ein.", [
      hintGap("___ Sie kurz Zeit für mich?", "haben", "Hätten"),
      hintGap("Es ___ schön, wenn du kommst.", "sein", "wäre"),
      hintGap("___ du mir bitte helfen?", "können", "Könntest"),
      hintGap("Ich ___ gern wissen, wann der Kurs beginnt.", "werden", "würde", "möchte"),
      hintGap("Wir ___ eigentlich früher gehen.", "müssen", "müssten"),
      hintGap("Wenn ich das nur ___!", "wissen", "wüsste"),
    ]),
  },
  "Unreal conditions (present)": {
    learningOutcome: "I can talk about imagined situations in the present with wenn + Konjunktiv II.",
    resourceBody:
      "Wenn + Konjunktiv II (end), Konjunktiv II (verb first in the main clause):\n" +
      "Wenn ich mehr Zeit hätte, würde ich mehr lesen. (I don't have more time.)\n" +
      "Wenn ich du wäre, würde ich die Stelle annehmen.\n" +
      "Without wenn, verb first: Hätte ich mehr Geld, würde ich reisen.\n" +
      "Compare the real condition: Wenn ich Zeit habe, lese ich. (possible, indicative)",
    guidedPractice: "Complete: Wenn ich im Lotto gewinnen würde, … / Wenn ich Bundeskanzler wäre, …",
    ...checks("Ergänze.", [
      gap("Wenn ich mehr Geld ___, würde ich ein Auto kaufen. (haben)", "hätte"),
      gap("Wenn ich du ___, würde ich zum Arzt gehen. (sein)", "wäre"),
      pick("If I had time, I would come.", ["Wenn ich Zeit habe, komme ich.", "Wenn ich Zeit hätte, würde ich kommen.", "Wenn ich Zeit hätte, ich würde kommen."], 1),
      pick("Which sentence is unreal?", ["Wenn es regnet, bleibe ich zu Hause.", "Wenn es regnen würde, bliebe ich zu Hause."], 1),
      gap("Wenn er besser Deutsch ___, fände er schneller eine Stelle. (können)", "könnte"),
      gap("___ ich mehr Zeit, würde ich Gitarre lernen. (haben — verb first, no wenn)", "Hätte"),
    ]),
  },
  "Unreal conditions (past)": {
    learningOutcome: "I can talk about what would have happened with hätte/wäre + Partizip II.",
    resourceBody:
      "Konjunktiv II past: hätte/wäre + Partizip II (haben/sein as in the Perfekt).\n" +
      "Wenn ich das gewusst hätte, wäre ich früher gekommen. (I didn't know; I didn't come earlier.)\n" +
      "Wenn wir den Bus genommen hätten, hätten wir den Zug nicht verpasst.\n" +
      "Regret: Ich hätte mehr lernen sollen. (modal: hätte + infinitive + modal infinitive)\n" +
      "Without wenn: Hätte ich das gewusst, wäre ich gekommen.",
    guidedPractice: "Say three things you would have done differently: Wenn ich … hätte, wäre/hätte ich …",
    ...checks("hätte oder wäre?", [
      gap("Wenn ich das gewusst ___, wäre ich gekommen.", "hätte"),
      gap("Wenn wir früher losgefahren wären, ___ wir den Zug nicht verpasst.", "hätten"),
      gap("Wenn sie den Bus genommen hätte, ___ sie pünktlich gewesen.", "wäre"),
      gap("Ohne deine Hilfe ___ ich die Prüfung nicht bestanden.", "hätte"),
      pick("„Ich hätte mehr lernen sollen.“ means …", ["I should have studied more.", "I will study more.", "I had to study more."], 0),
      gap("Wenn er nicht so schnell gefahren ___, hätte er keinen Unfall gehabt.", "wäre"),
    ]),
  },
  "Wishes & advice": {
    learningOutcome: "I can express wishes and give advice with the Konjunktiv II.",
    resourceBody:
      "Wishes: Ich wünschte, ich hätte mehr Zeit. · Wenn ich doch nur mehr Zeit hätte! · Ich hätte gern … · Es wäre schön, wenn …\n" +
      "Past regret: Ich wünschte, ich hätte früher angefangen.\n" +
      "Advice: Du solltest … · An deiner Stelle würde ich … · Es wäre besser, wenn du … · Du könntest …\n" +
      "Softened criticism: Du hättest mich anrufen sollen.",
    guidedPractice: "Give a friend who is stressed at work four pieces of advice using different forms.",
    ...checks("Ergänze.", [
      gap("Ich wünschte, ich ___ mehr Zeit für meine Familie. (haben)", "hätte"),
      gap("An deiner ___ würde ich mit dem Chef sprechen.", "Stelle"),
      gap("Du ___ weniger Kaffee trinken. (advice: sollen)", "solltest"),
      gap("Wenn ich doch nur schon B1 ___! (können)", "könnte"),
      pick("„Du hättest mich anrufen sollen.“ =", ["You should call me.", "You should have called me.", "You called me."], 1),
      gap("Es ___ besser, wenn wir früher losfahren. (sein)", "wäre"),
    ]),
  },
  "Nominative, accusative & dative": {
    learningOutcome: "I can build relative clauses with der/die/das in the nominative, accusative and dative.",
    resourceBody:
      "The relative pronoun takes gender and number from the noun it refers to, and its case from its role in the relative clause. Verb at the end.\n" +
      "nom.: der / die / das / die (pl.) — Der Mann, der dort steht, ist mein Chef.\n" +
      "acc.: den / die / das / die — Der Film, den ich gesehen habe, war gut.\n" +
      "dat.: dem / der / dem / denen (!) — Die Kollegin, der ich geholfen habe, … · Die Kinder, denen ich Deutsch beibringe, …",
    guidedPractice: "Describe three colleagues with a relative clause each — one nom., one acc., one dat.",
    ...checks("Setze das Relativpronomen ein.", [
      gap("Das ist der Kollege, ___ mir immer hilft.", "der"),
      gap("Der Laptop, ___ ich gekauft habe, ist schon kaputt.", "den"),
      gap("Die Frau, ___ ich die Wohnung zeige, kommt aus Polen.", "der"),
      gap("Das Buch, ___ du mir empfohlen hast, ist super.", "das"),
      gap("Die Kinder, ___ wir helfen, sind neu in der Klasse.", "denen"),
      pick("Die Stadt, in der …", ["… ich wohne, ist schön.", "… wohne ich, ist schön.", "… ich wohne ist schön,"], 0),
    ]),
  },
  "Genitive: dessen / deren": {
    learningOutcome: "I can use dessen and deren to show whose.",
    resourceBody:
      "dessen = whose, for a masculine or neuter noun: Der Mann, dessen Auto hier parkt, … · Das Kind, dessen Eltern arbeiten, …\n" +
      "deren = whose, for a feminine or plural noun: Die Frau, deren Sohn Arzt ist, … · Die Nachbarn, deren Hund bellt, …\n" +
      "The choice depends on the owner (the noun before the comma), not on the thing owned.\n" +
      "The noun after dessen/deren has no article; an adjective takes the no-article ending: der Kollege, dessen neues Auto …",
    guidedPractice: "Describe three people by something they own: Die Frau, deren …",
    ...checks("dessen oder deren?", [
      gap("Der Mann, ___ Fahrrad gestohlen wurde, ging zur Polizei.", "dessen"),
      gap("Die Kollegin, ___ Sohn krank ist, arbeitet heute von zu Hause.", "deren"),
      gap("Das Kind, ___ Mutter Ärztin ist, will auch Ärztin werden.", "dessen"),
      gap("Die Nachbarn, ___ Hund immer bellt, ziehen aus.", "deren"),
      gap("Die Firma, ___ Chef ich kenne, sucht Azubis.", "deren"),
      pick("What decides dessen vs. deren?", ["the owner's gender/number", "the owned thing's gender", "the case of the sentence"], 0),
    ]),
  },
  "With prepositions": {
    learningOutcome: "I can build relative clauses with a preposition in front of the pronoun.",
    resourceBody:
      "The preposition goes before the relative pronoun and decides its case:\n" +
      "Die Kollegin, mit der ich arbeite, … (mit + dat.) · Der Kurs, für den ich mich angemeldet habe, … (für + acc.) · Das Haus, in dem ich wohne, … · Die Freunde, mit denen ich reise, …\n" +
      "With verbs + preposition: sich freuen auf → Die Reise, auf die ich mich freue, … · sprechen über → Das Thema, über das wir gesprochen haben, …\n" +
      "For places, wo is also possible: Die Stadt, in der / wo ich wohne.",
    guidedPractice: "Write three sentences about people and things you care about with mit der, auf den, über das.",
    ...checks("Setze Präposition + Relativpronomen ein.", [
      gap("Das ist die Kollegin, ___ ich jeden Tag arbeite. (mit)", "mit der"),
      gap("Der Urlaub, ___ ich mich freue, beginnt morgen. (sich freuen auf)", "auf den"),
      gap("Die Wohnung, ___ wir wohnen, ist zu klein. (in)", "in der"),
      gap("Das Thema, ___ wir gesprochen haben, war interessant. (sprechen über)", "über das"),
      gap("Die Freunde, ___ ich nach Spanien fahre, kommen aus Bonn. (mit)", "mit denen"),
      gap("Der Chef, ___ ich mich geärgert habe, hat sich entschuldigt. (sich ärgern über)", "über den"),
    ]),
  },
  "Infinitive with zu": {
    learningOutcome: "I can use zu + infinitive after verbs, adjectives and nouns.",
    resourceBody:
      "After many verbs: versuchen, vergessen, anfangen, aufhören, vorhaben, beschließen, hoffen, bitten: Ich versuche, jeden Tag zu lernen.\n" +
      "After Es ist + adjective: Es ist wichtig, pünktlich zu sein. · Es ist schwer, eine Wohnung zu finden.\n" +
      "After nouns: Ich habe keine Zeit / Lust / die Möglichkeit, … zu …\n" +
      "Separable verbs: zu goes in the middle: anzurufen, einzukaufen, aufzustehen.\n" +
      "No zu after modals and after lassen, gehen, sehen, hören: Ich muss arbeiten. · Ich gehe schwimmen.",
    guidedPractice: "Say five things: Ich habe vor, … / Ich vergesse oft, … / Es ist schwer, …",
    ...checks("Ergänze mit zu + Infinitiv (oder ohne zu).", [
      hintGap("Ich habe vergessen, dich ___.", "anrufen", "anzurufen"),
      hintGap("Es ist wichtig, pünktlich ___.", "sein", "zu sein"),
      hintGap("Hast du Lust, heute Abend ___?", "ausgehen", "auszugehen"),
      hintGap("Ich muss morgen früh ___.", "aufstehen", "aufstehen"),
      hintGap("Sie hat angefangen, Spanisch ___.", "lernen", "zu lernen"),
      hintGap("Er versucht, mit dem Rauchen ___.", "aufhören", "aufzuhören"),
    ]),
  },
  "um / statt / ohne … zu": {
    learningOutcome: "I can express purpose (um … zu), alternatives (statt … zu) and omission (ohne … zu).",
    resourceBody:
      "um … zu = in order to: Ich lerne Deutsch, um in Deutschland zu arbeiten.\n" +
      "statt … zu = instead of: Statt zu lernen, sieht er fern.\n" +
      "ohne … zu = without: Er ging, ohne sich zu verabschieden.\n" +
      "Only when both clauses have the same subject. With different subjects use damit / statt dass / ohne dass: Ich erkläre es langsam, damit du es verstehst.",
    guidedPractice: "Say why you do three things with um … zu, and one thing you do instead of something else.",
    ...checks("um, statt oder ohne?", [
      gap("Ich spare Geld, ___ ein Auto zu kaufen.", "um"),
      gap("Er ging nach Hause, ___ sich zu verabschieden.", "ohne"),
      gap("___ zu arbeiten, spielt er am Handy.", "Statt", "Anstatt"),
      gap("Sie macht einen Kurs, ___ bessere Chancen zu haben.", "um"),
      pick("Different subjects: Ich spreche langsam, …", ["… um du mich verstehst.", "… damit du mich verstehst.", "… um mich zu verstehen."], 1),
      gap("Er hat den Vertrag unterschrieben, ___ ihn zu lesen.", "ohne"),
    ]),
  },
  "obwohl & trotzdem": {
    learningOutcome: "I can express contrast with obwohl (verb end) and trotzdem (verb next).",
    resourceBody:
      "obwohl = although, subordinate clause, verb at the end: Obwohl es regnet, gehen wir spazieren. · Ich gehe zur Arbeit, obwohl ich krank bin.\n" +
      "trotzdem = nevertheless, adverb in position 1 or 3, verb in position 2: Es regnet. Trotzdem gehen wir spazieren. / Wir gehen trotzdem spazieren.\n" +
      "trotz + genitive = despite (a noun): Trotz des Regens gehen wir spazieren.\n" +
      "Same meaning, three structures — choose by what follows.",
    guidedPractice: "Say the same idea three ways: obwohl, trotzdem, trotz + Genitiv.",
    ...checks("Wähle / ergänze.", [
      pick("Although he is tired, he keeps working.", ["Obwohl er müde ist, arbeitet er weiter.", "Obwohl er ist müde, arbeitet er weiter.", "Trotzdem er müde ist, arbeitet er weiter."], 0),
      pick("Sie hat wenig Zeit. …", ["Trotzdem sie hilft mir.", "Trotzdem hilft sie mir.", "Obwohl hilft sie mir."], 1),
      gap("___ des schlechten Wetters fand das Fest statt.", "Trotz"),
      gap("Ich habe die Stelle bekommen, ___ ich wenig Erfahrung habe.", "obwohl"),
      gap("Das Essen war teuer. Wir sind ___ oft hingegangen.", "trotzdem"),
      gap("Obwohl er viel gelernt ___, hat er die Prüfung nicht bestanden. (haben)", "hat", "hatte"),
    ]),
  },
  "damit & sodass": {
    learningOutcome: "I can tell purpose (damit) from result (sodass).",
    resourceBody:
      "damit = so that (purpose, intention): Ich schreibe es auf, damit ich es nicht vergesse.\n" +
      "Same subject → um … zu is more elegant: Ich schreibe es auf, um es nicht zu vergessen.\n" +
      "sodass / so …, dass = so that / with the result that (consequence, not intention): Es regnete stark, sodass das Spiel ausfiel. · Er war so müde, dass er sofort einschlief.\n" +
      "Test: was it intended? → damit. Did it just happen as a result? → sodass.",
    guidedPractice: "Write two damit-sentences about your study habits and two sodass-sentences about a bad day.",
    ...checks("damit oder sodass (so … dass)?", [
      gap("Ich stelle den Wecker, ___ ich nicht verschlafe.", "damit"),
      gap("Der Zug hatte Verspätung, ___ ich den Termin verpasste.", "sodass", "so dass"),
      gap("Sprich bitte lauter, ___ alle dich hören.", "damit"),
      gap("Sie war so nervös, ___ sie nicht schlafen konnte.", "dass"),
      pick("Ich spare Geld, … (same subject, purpose)", ["… um ein Auto zu kaufen.", "… sodass ich ein Auto kaufe.", "… damit ein Auto kaufen."], 0),
      gap("Der Chef erklärt es zweimal, ___ die Azubis es verstehen.", "damit"),
    ]),
  },
  "je … desto": {
    learningOutcome: "I can express proportional comparisons with je … desto/umso.",
    resourceBody:
      "je + comparative + subject … verb (end), desto/umso + comparative + verb + subject:\n" +
      "Je mehr ich lerne, desto besser verstehe ich. · Je länger ich hier wohne, umso wohler fühle ich mich.\n" +
      "Je früher, desto besser. (short form)\n" +
      "Word order: je-clause = subordinate (verb last); desto-clause = verb right after the comparative.",
    guidedPractice: "Make three je … desto sentences about learning German.",
    ...checks("Ergänze.", [
      gap("___ mehr ich übe, desto sicherer werde ich.", "Je"),
      gap("Je länger ich warte, ___ nervöser werde ich.", "desto", "umso"),
      pick("The more you read, the more words you know.", ["Je mehr du liest, desto mehr Wörter kennst du.", "Je mehr du liest, desto mehr Wörter du kennst.", "Je mehr liest du, desto mehr kennst du Wörter."], 0),
      hintGap("Je ___ die Wohnung, desto höher die Miete.", "groß", "größer"),
      pick("„Je früher, desto besser“ =", ["the earlier the better", "early is better than late sometimes", "earlier than better"], 0),
      hintGap("Je älter er wird, desto ___ wird er.", "ruhig", "ruhiger"),
    ]),
  },
  "Two-part connectors": {
    learningOutcome: "I can link ideas with entweder … oder, weder … noch, sowohl … als auch, nicht nur … sondern auch, zwar … aber.",
    resourceBody:
      "entweder … oder = either … or: Entweder wir fahren mit dem Zug oder wir nehmen das Auto.\n" +
      "weder … noch = neither … nor: Ich habe weder Zeit noch Geld.\n" +
      "sowohl … als auch = both … and: Sie spricht sowohl Englisch als auch Französisch.\n" +
      "nicht nur … sondern auch = not only … but also: Er ist nicht nur freundlich, sondern auch kompetent.\n" +
      "zwar … aber = admittedly … but: Die Wohnung ist zwar klein, aber sehr günstig.",
    guidedPractice: "Describe your German course with each connector once.",
    ...checks("Ergänze das fehlende Wort.", [
      gap("Ich habe weder Hunger ___ Durst.", "noch"),
      gap("Sie spricht sowohl Deutsch ___ auch Arabisch.", "als"),
      gap("___ du kommst pünktlich oder wir fahren ohne dich.", "Entweder"),
      gap("Die Stelle ist nicht nur gut bezahlt, ___ auch interessant.", "sondern"),
      gap("Der Kurs ist ___ teuer, aber sehr gut.", "zwar"),
      pick("„Ich habe weder ein Auto noch ein Fahrrad.“ =", ["I have a car and a bike.", "I have neither a car nor a bike.", "I have either a car or a bike."], 1),
    ]),
  },
  "Indirect questions": {
    learningOutcome: "I can ask politely and report questions with ob and question words (verb at the end).",
    resourceBody:
      "W-questions: the question word becomes the conjunction, verb to the end: Wann beginnt der Kurs? → Können Sie mir sagen, wann der Kurs beginnt?\n" +
      "Yes/no questions: ob: Ist die Wohnung noch frei? → Ich möchte wissen, ob die Wohnung noch frei ist.\n" +
      "Typical openers: Wissen Sie, …? · Können Sie mir sagen, …? · Ich frage mich, … · Ich weiß nicht, …\n" +
      "Punctuation: a question mark only if the whole sentence is a question.",
    guidedPractice: "Turn five questions to an office into polite indirect ones.",
    ...checks("Ergänze die indirekte Frage.", [
      gap("Können Sie mir sagen, ___ der Zug abfährt? (Wann fährt der Zug ab?)", "wann"),
      gap("Ich weiß nicht, ___ er heute kommt. (Kommt er heute?)", "ob"),
      pick("Wo ist das Bürgeramt? → Wissen Sie, …", ["… wo ist das Bürgeramt?", "… wo das Bürgeramt ist?", "… ob das Bürgeramt ist?"], 1),
      pick("Muss ich einen Termin machen? → Ich möchte wissen, …", ["… ob ich einen Termin machen muss.", "… ob muss ich einen Termin machen.", "… dass ich einen Termin machen muss."], 0),
      gap("Ich frage mich, ___ die Miete so hoch ist. (Why?)", "warum", "wieso", "weshalb"),
      gap("Weißt du, ___ viel das Ticket kostet?", "wie"),
    ]),
  },
  "Reporting statements": {
    learningOutcome: "I can report what someone said with dass and recognise the Konjunktiv I in news.",
    resourceBody:
      "Everyday speech: Er sagt, dass er keine Zeit hat. / Er sagt, er hat keine Zeit. (indicative, pronouns change!)\n" +
      "Direct: Anna: „Ich komme morgen.“ → Anna sagt, dass sie morgen kommt.\n" +
      "Commands: „Ruf mich an!“ → Er sagt, dass ich ihn anrufen soll.\n" +
      "News and formal texts use Konjunktiv I (recognise it): Der Minister sagte, er sei zufrieden. Die Firma habe keine Probleme. Man werde prüfen …\n" +
      "sei / habe / werde / könne signal: this is what someone else said, not the reporter's own claim.",
    guidedPractice: "Report three things your teacher or boss said today using dass and soll.",
    ...checks("Wähle / ergänze.", [
      pick("Anna: „Ich bin krank.“ → Anna sagt, …", ["… dass ich krank bin.", "… dass sie krank ist.", "… dass sie ist krank."], 1),
      pick("Der Chef: „Schreiben Sie den Bericht!“ → Der Chef sagt, dass ich den Bericht schreiben …", ["soll", "muss werden", "will"], 0),
      pick("„Der Minister sagte, er sei zufrieden.“ — sei is …", ["Konjunktiv I: reported speech", "a spelling mistake", "the future tense"], 0),
      gap("Tom: „Ich habe keine Zeit.“ → Tom sagt, er ___ keine Zeit. (indicative)", "hat"),
      gap("„Die Firma habe keine Schulden“, so der Sprecher. — habe = Konjunktiv I of ___.", "haben"),
      gap("Mein Vermieter sagt, ___ die Heizung morgen repariert wird.", "dass"),
    ]),
  },
  "Genitive forms": {
    learningOutcome: "I can form the genitive of articles, adjectives and nouns.",
    resourceBody:
      "masc./neut.: des / eines / meines + noun + -(e)s: des Mannes · des Kindes · eines Freundes · meines Bruders · des Autos\n" +
      "-es after one syllable or -s/-ß/-z sounds: des Hauses, des Tages; -s after longer words: des Lehrers, des Computers\n" +
      "fem./plural: der / einer / meiner (no noun ending): der Frau · einer Kollegin · der Kinder · meiner Eltern\n" +
      "Adjectives: always -en: des neuen Chefs · der alten Stadt\n" +
      "n-declension nouns: -n/-en: des Kollegen, des Kunden, des Namens",
    guidedPractice: "Say whose things are around you: das Handy meines Bruders, die Tasche meiner Mutter …",
    ...checks("Setze die Genitivform ein.", [
      gap("Das Auto ___ Nachbarn ist neu. (der Nachbar — article)", "des"),
      gap("Die Wohnung meiner ___ ist groß. (Eltern)", "Eltern"),
      hintGap("Das ist das Fahrrad meines ___.", "Bruder", "Bruders"),
      hintGap("Am Ende des ___ war ich müde.", "Tag", "Tages", "Tags"),
      gap("Die Tasche ___ Kollegin liegt hier. (eine)", "einer"),
      hintGap("Die Meinung des ___ Chefs ist wichtig.", "neu", "neuen"),
    ]),
  },
  "Genitive prepositions": {
    learningOutcome: "I can use wegen, trotz, während, innerhalb and außerhalb with the genitive.",
    resourceBody:
      "wegen (because of): wegen des Streiks · wegen der Hitze\n" +
      "trotz (despite): trotz des Regens · trotz der Kosten\n" +
      "während (during): während der Arbeit · während des Urlaubs\n" +
      "innerhalb / außerhalb (within / outside): innerhalb einer Woche · außerhalb der Öffnungszeiten\n" +
      "statt (instead of): statt eines Briefes\n" +
      "In speech wegen/trotz often take the dative (wegen dem Wetter) — in writing, use the genitive.",
    guidedPractice: "Rewrite with a genitive preposition: Weil es regnet, … → Wegen des Regens …",
    ...checks("Ergänze Präposition oder Artikel.", [
      gap("___ des Streiks fahren heute keine Busse. (because of)", "Wegen"),
      gap("Trotz ___ Regens gingen wir spazieren.", "des"),
      gap("Bitte antworten Sie ___ einer Woche. (within)", "innerhalb"),
      gap("Während ___ Arbeit darf man nicht privat telefonieren. (die)", "der"),
      pick("Weil es sehr heiß war, … =", ["Wegen der Hitze …", "Trotz der Hitze …", "Während der Hitze …"], 0),
      gap("___ der Öffnungszeiten erreichen Sie uns per E-Mail. (outside)", "Außerhalb"),
    ]),
  },
  "n-declension": {
    learningOutcome: "I can use the weak masculine nouns (n-Deklination) correctly.",
    resourceBody:
      "Some masculine nouns add -(e)n in every case except the nominative singular:\n" +
      "der Kollege → den/dem/des Kollegen · der Kunde → den Kunden · der Mensch → den Menschen · der Nachbar → den Nachbarn · der Student → den Studenten · der Praktikant → den Praktikanten · der Herr → den Herrn\n" +
      "Recognise them: masculine and ending in -e (Kollege, Kunde, Junge) or -ant/-ent/-ist (Praktikant, Student, Polizist), plus Mensch, Herr, Nachbar, Bär.\n" +
      "der Name: den Namen, des Namens (special).",
    guidedPractice: "Write four sentences with Kollege, Kunde, Nachbar, Praktikant in the accusative or dative.",
    ...checks("Setze die richtige Form ein.", [
      hintGap("Ich habe dem ___ die Rechnung geschickt.", "Kunde", "Kunden"),
      hintGap("Kennst du den neuen ___?", "Kollege", "Kollegen"),
      hintGap("Wir fragen unseren ___ nach dem Schlüssel.", "Nachbar", "Nachbarn"),
      hintGap("Sehr geehrter ___ Schmidt, …", "Herr", "Herr"),
      hintGap("Der Chef spricht mit dem ___.", "Praktikant", "Praktikanten"),
      pick("Which is an n-declension noun?", ["der Lehrer", "der Student", "der Tisch"], 1),
    ]),
  },
  "Pronominal adverbs": {
    learningOutcome: "I can use da(r)- and wo(r)- + preposition for things and ideas.",
    resourceBody:
      "For things/ideas, replace preposition + pronoun with da(r)- + preposition: Ich warte auf den Bus. → Ich warte darauf. · Ich denke an die Prüfung. → Ich denke daran.\n" +
      "Questions: wo(r)- + preposition: Worauf wartest du? · Wofür interessierst du dich? · Worüber sprecht ihr?\n" +
      "-r- before a vowel: darauf, daran, darüber, worum; no -r- before a consonant: damit, dafür, wofür.\n" +
      "People keep preposition + pronoun: Ich warte auf ihn. · Auf wen wartest du?\n" +
      "Announcing a clause: Ich freue mich darauf, dich zu sehen.",
    guidedPractice: "Answer with pronominal adverbs: Interessierst du dich für Politik? Denkst du oft an deine Heimat?",
    ...checks("Ergänze.", [
      gap("Wartest du auf den Bus? — Ja, ich warte ___.", "darauf"),
      gap("___ interessierst du dich? — Für Technik.", "Wofür"),
      gap("___ habt ihr gesprochen? — Über den Urlaub.", "Worüber"),
      gap("Denkst du an den Termin? — Ja, ich denke ___.", "daran"),
      pick("Wartest du auf Anna? — Ja, ich warte …", ["darauf", "auf sie", "worauf"], 1),
      gap("Ich freue mich ___, dich bald zu sehen. (sich freuen auf)", "darauf"),
    ]),
  },
  "Participles as adjectives": {
    learningOutcome: "I can use Partizip I and II as adjectives.",
    resourceBody:
      "Partizip I = infinitive + -d (active, happening now): lachen → lachend: die lachenden Kinder (the children who are laughing) · die steigenden Preise\n" +
      "Partizip II (passive/completed): reparieren → repariert: das reparierte Auto (the car that has been repaired) · die bestellten Waren\n" +
      "Both take normal adjective endings.\n" +
      "Frequent in written German: die laufende Woche · der ausgefüllte Antrag · die folgenden Informationen · das beigefügte Dokument",
    guidedPractice: "Turn relative clauses into participle adjectives: das Kind, das weint → das weinende Kind.",
    ...checks("Setze das Partizip mit Endung ein.", [
      hintGap("Die ___ Kinder spielen im Garten.", "lachen — Partizip I", "lachenden"),
      hintGap("Bitte schicken Sie uns den ___ Antrag.", "ausfüllen — Partizip II", "ausgefüllten"),
      hintGap("Das ___ Auto kann abgeholt werden.", "reparieren — Partizip II", "reparierte"),
      hintGap("Wegen der ___ Preise sparen viele Menschen.", "steigen — Partizip I", "steigenden"),
      pick("„die gestohlene Tasche“ =", ["the bag that is stealing", "the bag that was stolen", "the bag that will be stolen"], 1),
      hintGap("Bitte lesen Sie die ___ Informationen.", "folgen — Partizip I", "folgenden"),
    ]),
  },
  TeKaMoLo: {
    learningOutcome: "I can order time, reason, manner and place in the middle of a sentence.",
    resourceBody:
      "In the Mittelfeld, adverbials usually follow Temporal – Kausal – Modal – Lokal (when – why – how – where):\n" +
      "Ich fahre morgen (Te) wegen eines Termins (Ka) mit dem Zug (Mo) nach Köln (Lo).\n" +
      "Any one of them can move to position 1 for emphasis: Morgen fahre ich wegen eines Termins mit dem Zug nach Köln.\n" +
      "Not every sentence has all four; the order of those present stays the same.",
    guidedPractice: "Build three sentences with at least three adverbials each, then move one to the front.",
    ...checks("Wähle die natürliche Reihenfolge.", [
      pick("Choose:", ["Ich fahre mit dem Bus morgen zur Arbeit.", "Ich fahre morgen mit dem Bus zur Arbeit.", "Ich fahre zur Arbeit mit dem Bus morgen."], 1),
      pick("Choose:", ["Sie bleibt heute wegen der Grippe zu Hause.", "Sie bleibt zu Hause heute wegen der Grippe.", "Sie bleibt wegen der Grippe zu Hause heute."], 0),
      pick("Choose:", ["Wir sind schnell gestern nach Hause gegangen.", "Wir sind gestern schnell nach Hause gegangen.", "Wir sind nach Hause gestern schnell gegangen."], 1),
      pick("„mit dem Fahrrad“ is …", ["temporal", "kausal", "modal", "lokal"], 2),
      pick("„wegen des Staus“ is …", ["temporal", "kausal", "modal", "lokal"], 1),
      pick("Choose:", ["Er arbeitet seit März aus Interesse freiwillig im Tierheim.", "Er arbeitet im Tierheim freiwillig seit März aus Interesse.", "Er arbeitet aus Interesse im Tierheim seit März freiwillig."], 0),
    ]),
  },
  "Pronoun order": {
    learningOutcome: "I can order noun and pronoun objects correctly.",
    resourceBody:
      "Two nouns: dative before accusative: Ich gebe dem Kunden die Rechnung.\n" +
      "Two pronouns: accusative before dative: Ich gebe sie ihm.\n" +
      "Pronoun + noun: the pronoun comes first: Ich gebe ihm die Rechnung. · Ich gebe sie dem Kunden.\n" +
      "Short rule: pronouns before nouns; among pronouns, accusative first.",
    guidedPractice: "Replace step by step: Ich schicke der Chefin den Bericht → … ihr den Bericht → … ihn der Chefin → … ihn ihr.",
    ...checks("Wähle die richtige Reihenfolge.", [
      pick("I give the customer the invoice.", ["Ich gebe die Rechnung dem Kunden.", "Ich gebe dem Kunden die Rechnung."], 1),
      pick("I give it (die Rechnung) to him.", ["Ich gebe ihm sie.", "Ich gebe sie ihm."], 1),
      pick("I give him the invoice.", ["Ich gebe ihm die Rechnung.", "Ich gebe die Rechnung ihm."], 0),
      pick("I send it (den Bericht) to the boss (die Chefin).", ["Ich schicke der Chefin ihn.", "Ich schicke ihn der Chefin."], 1),
      pick("Kannst du … zeigen? (it = das Foto, me)", ["mir es", "es mir"], 1),
      pick("Hast du … schon erzählt? (her = ihr, the news = die Neuigkeit)", ["ihr die Neuigkeit", "die Neuigkeit ihr"], 0),
    ]),
  },
  "Futur I & II": {
    learningOutcome: "I can use Futur I for plans and guesses and recognise Futur II for guesses about the past.",
    resourceBody:
      "Futur I: werden + infinitive: Ich werde im Herbst eine Ausbildung beginnen. (plan/promise)\n" +
      "Guess about now: Er wird (wohl) krank sein. = He's probably ill.\n" +
      "Futur II: werden + Partizip II + haben/sein: Bis Juni werde ich die Prüfung bestanden haben. (completed by a future point)\n" +
      "Guess about the past: Sie wird den Zug verpasst haben. = She's probably missed the train.\n" +
      "Signal words for guesses: wohl, sicher, bestimmt, wahrscheinlich.",
    guidedPractice: "Make two plans (Futur I) and two guesses about why a friend hasn't replied (Futur II).",
    ...checks("Ergänze / wähle.", [
      gap("Nächstes Jahr ___ ich in München arbeiten.", "werde"),
      pick("„Er wird wohl krank sein.“ =", ["He will be ill.", "He's probably ill.", "He was ill."], 1),
      gap("Bis Freitag werde ich den Bericht geschrieben ___.", "haben"),
      gap("Sie ist nicht da. Sie wird den Bus verpasst ___.", "haben"),
      gap("Bis Mitternacht werden alle Gäste gegangen ___.", "sein"),
      pick("„Bis 2027 werde ich die Ausbildung abgeschlossen haben.“ is …", ["Futur I", "Futur II", "Perfekt"], 1),
    ]),
  },
};

// ── vocabulary ───────────────────────────────────────────────────────────────

const VOCAB: Record<string, Authored> = {
  "Bewerbung vocabulary": {
    learningOutcome: "I can use the vocabulary of a German job or Ausbildung application.",
    resourceBody:
      "die Bewerbung · sich bewerben um (+ Akk.) / bei (+ Firma) · die Stellenanzeige · die Stelle / der Ausbildungsplatz\n" +
      "die Bewerbungsunterlagen: das Anschreiben (cover letter) · der Lebenslauf (CV) · die Zeugnisse (certificates) · das Bewerbungsfoto (optional)\n" +
      "das Vorstellungsgespräch (interview) · die Zusage (acceptance) · die Absage (rejection) · die Stärken / Schwächen · die Berufserfahrung · die Kenntnisse (skills)\n" +
      "Hiermit bewerbe ich mich um den Ausbildungsplatz als … · Über eine Einladung zu einem Vorstellungsgespräch freue ich mich sehr.",
    guidedPractice: "Say the first and last sentence of your Anschreiben aloud.",
    ...checks("Ergänze.", [
      gap("Hiermit bewerbe ich mich ___ den Ausbildungsplatz als Mechatroniker.", "um"),
      gap("Im ___ stehen meine Ausbildung und meine Berufserfahrung. (CV)", "Lebenslauf"),
      gap("Das ___ ist der Brief, in dem ich meine Motivation erkläre. (cover letter)", "Anschreiben"),
      gap("Ich wurde zu einem ___ eingeladen! (interview)", "Vorstellungsgespräch"),
      pick("„Leider müssen wir Ihnen mitteilen, …“ usually starts …", ["eine Zusage", "eine Absage", "eine Einladung"], 1),
      gap("Ich habe gute ___ in Excel und Word. (skills/knowledge)", "Kenntnisse"),
    ]),
  },
  "The dual training system": {
    learningOutcome: "I can explain how the dual Ausbildung works and its key terms.",
    resourceBody:
      "Dual = two places of learning: der Betrieb / Ausbildungsbetrieb (practical, ~3–4 days a week) and die Berufsschule (theory, 1–2 days or in blocks = Blockunterricht).\n" +
      "der/die Auszubildende (Azubi) · der Ausbilder / die Ausbilderin · der Ausbildungsvertrag · die Ausbildungsvergütung (monthly pay, legal minimum)\n" +
      "Duration usually 3 years (2–3,5), can be shortened (verkürzen). Exams are run by the Kammer: IHK (industry/trade) or HWK (crafts).\n" +
      "die Zwischenprüfung (midway) · die Abschlussprüfung (final) → der Gesellenbrief / Facharbeiterbrief",
    guidedPractice: "Explain the dual system to a friend at home in five sentences.",
    ...checks("Ergänze / wähle.", [
      gap("Die Theorie lernt man in der ___.", "Berufsschule"),
      gap("Das monatliche Geld für Azubis heißt ___. (one word)", "Ausbildungsvergütung", "Vergütung"),
      pick("Who organises the exams for an industrial Ausbildung?", ["die Berufsschule", "die IHK", "der Betrieb"], 1),
      pick("A craft Ausbildung (e.g. Tischler) is under the …", ["IHK", "HWK", "Agentur für Arbeit"], 1),
      gap("In der Mitte der Ausbildung gibt es eine ___. (midway exam)", "Zwischenprüfung"),
      pick("„Blockunterricht“ means …", ["school in blocks of several weeks", "a lesson that was cancelled", "a building block course"], 0),
    ]),
  },
  "Rights & duties as an Azubi": {
    learningOutcome: "I can name an apprentice's main rights and duties.",
    resourceBody:
      "Rights: die Ausbildungsvergütung · mind. 24 Werktage Urlaub (more if under 18) · kostenlose Ausbildungsmittel (tools, materials) · Freistellung für die Berufsschule · ein Zeugnis am Ende · only tasks that serve the training (no ausbildungsfremde Tätigkeiten)\n" +
      "Duties: die Lernpflicht (learn actively) · die Berufsschulpflicht · das Berichtsheft / der Ausbildungsnachweis führen · Weisungen befolgen (follow instructions) · die Schweigepflicht (confidentiality) · sich krankmelden\n" +
      "die Probezeit: 1–4 months, either side can end the contract without reason. After it, the Azubi can resign only with 4 weeks' notice to give up the training or change career, or without notice for a serious reason.",
    guidedPractice: "List three rights and three duties and say which matter most to you.",
    ...checks("Ergänze / wähle.", [
      gap("Azubis müssen ein ___ führen, in dem sie notieren, was sie gelernt haben.", "Berichtsheft"),
      pick("During the Probezeit …", ["only the company can end the contract", "both sides can end it without a reason", "nobody can end it"], 1),
      pick("Must the Azubi pay for the tools needed?", ["yes", "no — the company provides them free"], 1),
      pick("Is the Azubi allowed to miss Berufsschule to work in the company?", ["yes, if the boss asks", "no — Berufsschule is compulsory and the company must release them"], 1),
      gap("Über Firmengeheimnisse darf man nicht sprechen — das ist die ___.", "Schweigepflicht"),
      gap("Die Probezeit dauert mindestens einen und höchstens ___ Monate.", "vier", "4"),
    ]),
  },
  "Amtsdeutsch survival kit": {
    learningOutcome: "I can understand the key words of official letters.",
    resourceBody:
      "der Antrag (application) · beantragen · der Bescheid (official decision) · der Nachweis (proof) · nachweisen · die Frist (deadline) · fristgerecht (on time)\n" +
      "der Widerspruch (formal objection) · Widerspruch einlegen · die Rechtsbehelfsbelehrung (how to object, at the end of a Bescheid)\n" +
      "die Unterlagen einreichen (submit documents) · vorlegen (present) · die Bearbeitung (processing) · zuständig (responsible) · die Sachbearbeiterin (case worker)\n" +
      "Typical: Bitte reichen Sie die fehlenden Unterlagen innerhalb von 14 Tagen ein. · Gegen diesen Bescheid können Sie innerhalb eines Monats Widerspruch einlegen.",
    guidedPractice: "Translate the two typical sentences into plain everyday German.",
    ...checks("Was bedeutet das? / Ergänze.", [
      gap("Gegen den Bescheid kann man ___ einlegen. (formal objection)", "Widerspruch"),
      pick("„Bitte reichen Sie die Unterlagen ein.“ =", ["Please collect the documents.", "Please submit the documents.", "Please sign the documents."], 1),
      gap("Für das Wohngeld muss ich einen ___ stellen. (application)", "Antrag"),
      pick("Der „Bescheid“ is …", ["the form you fill in", "the official decision you receive", "the waiting number"], 1),
      gap("Bitte legen Sie einen ___ über Ihr Einkommen vor. (proof)", "Nachweis"),
      pick("Wer ist „zuständig“?", ["the person or office responsible", "the person who is absent", "the person who pays"], 0),
    ]),
  },
  "Visa & residence": {
    learningOutcome: "I can use the vocabulary of visas and residence permits.",
    resourceBody:
      "das Visum (national visa, D-Visum) · die Botschaft / das Konsulat · der Aufenthaltstitel / die Aufenthaltserlaubnis (residence permit) · der elektronische Aufenthaltstitel (eAT card)\n" +
      "die Ausländerbehörde · die Anmeldung beim Bürgeramt (within 2 weeks of moving in) · die Wohnungsgeberbestätigung (landlord's confirmation)\n" +
      "das Sperrkonto (blocked account, proof of funds) · die Verpflichtungserklärung (formal guarantee by a sponsor) · VIDEX (online visa application form)\n" +
      "verlängern (extend) · ablaufen (expire) · die Fiktionsbescheinigung (interim certificate while an extension is being processed)",
    guidedPractice: "Explain the steps from visa application to residence permit in order.",
    ...checks("Ergänze / wähle.", [
      gap("Für die Anmeldung braucht man eine ___ vom Vermieter.", "Wohnungsgeberbestätigung"),
      gap("Meine Aufenthaltserlaubnis läuft bald ab — ich muss sie ___. (extend)", "verlängern"),
      pick("Das „Sperrkonto“ proves …", ["that you have enough money", "that you have a job", "that you speak German"], 0),
      pick("Where do you apply for a national visa from abroad?", ["beim Bürgeramt", "bei der deutschen Botschaft / dem Konsulat", "bei der IHK"], 1),
      gap("Das Online-Formular für das Visum heißt ___.", "VIDEX"),
      pick("While your extension is processed you get a …", ["Fiktionsbescheinigung", "Verpflichtungserklärung", "Wohnungsgeberbestätigung"], 0),
    ]),
  },
  "Contracts & insurance": {
    learningOutcome: "I can understand contract and insurance vocabulary.",
    resourceBody:
      "der Vertrag · abschließen (conclude) · unterschreiben · kündigen · die Kündigungsfrist · die Laufzeit · sich automatisch verlängern · die Klausel · das Kleingedruckte (small print)\n" +
      "die Versicherung · der Beitrag (premium) · der Versicherungsfall / Schaden · den Schaden melden · die Selbstbeteiligung (excess)\n" +
      "Types: die Krankenversicherung (compulsory) · die Haftpflichtversicherung (liability — highly recommended) · die Hausratversicherung (contents) · die Kfz-Versicherung (car, compulsory for car owners)\n" +
      "das Widerrufsrecht: 14 days to cancel contracts made online or at the door.",
    guidedPractice: "Explain which insurances you have or need, and why.",
    ...checks("Ergänze / wähle.", [
      pick("You break a friend's laptop by accident. Which insurance pays?", ["Hausratversicherung", "Haftpflichtversicherung", "Krankenversicherung"], 1),
      pick("Your own flat is burgled. Which insurance pays for your things?", ["Hausratversicherung", "Haftpflichtversicherung", "Kfz-Versicherung"], 0),
      gap("Die ___ beträgt drei Monate zum Ende der Laufzeit. (notice period)", "Kündigungsfrist"),
      gap("Den monatlichen Betrag für eine Versicherung nennt man ___.", "Beitrag"),
      gap("Online-Verträge kann man innerhalb von ___ Tagen widerrufen.", "14", "vierzehn"),
      pick("„Selbstbeteiligung 150 €“ means …", ["you pay the first 150 € of each claim", "the insurance costs 150 € a year", "you get 150 € back"], 0),
    ]),
  },
  "Workplace communication": {
    learningOutcome: "I can handle instructions, feedback, conflicts and small talk at work.",
    resourceBody:
      "Instructions: die Anweisung · Könnten Sie bitte …? · Bis wann soll das fertig sein? · Habe ich Sie richtig verstanden, dass …?\n" +
      "Feedback: das Feedback / die Rückmeldung · loben (praise) · die Kritik · konstruktiv · Mir ist aufgefallen, dass … · Beim nächsten Mal …\n" +
      "Conflict: der Konflikt · das Missverständnis · sich beschweren · ein Gespräch suchen · eine Lösung finden · der Kompromiss\n" +
      "Small talk: Wie war Ihr Wochenende? · Schönes Wetter heute! · Na, wieder zurück aus dem Urlaub?\n" +
      "Du or Sie: wait until the older/senior person offers the du (Wollen wir uns duzen?).",
    guidedPractice: "Ask your supervisor to clarify an unclear task, politely, in three sentences.",
    ...checks("Ergänze / wähle.", [
      gap("Habe ich Sie richtig ___, dass der Bericht bis Freitag fertig sein soll?", "verstanden"),
      gap("Das war ein ___ — ich dachte, Sie meinten Montag. (misunderstanding)", "Missverständnis"),
      pick("Who usually offers the du at work?", ["the younger/junior person", "the older or senior person", "anyone, any time"], 1),
      gap("Die Chefin hat mich für meine Arbeit ___. (praised)", "gelobt"),
      pick("A polite way to criticise:", ["Das ist falsch.", "Mir ist aufgefallen, dass hier noch Fehler sind.", "Das machst du immer schlecht."], 1),
      gap("Wir haben keine perfekte Lösung, aber einen ___ gefunden.", "Kompromiss"),
    ]),
  },
  "Money & taxes": {
    learningOutcome: "I can read the basic terms of a payslip and the tax system.",
    resourceBody:
      "brutto (gross) − Steuern − Sozialabgaben = netto (net)\n" +
      "die Gehaltsabrechnung / Lohnabrechnung (payslip) · die Lohnsteuer · der Solidaritätszuschlag (mostly gone) · die Kirchensteuer (only church members)\n" +
      "Sozialversicherung: Kranken-, Pflege-, Renten-, Arbeitslosenversicherung — shared roughly half-half with the employer\n" +
      "die Steuerklasse (I single, III/V or IV/IV married) · die Steuer-ID · die Steuererklärung (tax return) · die Rückerstattung (refund) · absetzen (deduct): Fahrtkosten, Arbeitsmittel",
    guidedPractice: "Explain the path from brutto to netto using the words above.",
    ...checks("Ergänze / wähle.", [
      gap("Mein ___ ist 3.000 €, aber ich bekomme nur 2.050 € aufs Konto. (gross)", "Brutto", "Bruttogehalt", "Bruttolohn"),
      gap("Die Kosten für den Arbeitsweg kann man von der Steuer ___. (deduct)", "absetzen"),
      pick("A single person without children is usually in Steuerklasse …", ["I", "III", "V"], 0),
      pick("Who pays the social insurance contributions?", ["only the employee", "only the employer", "employee and employer, roughly half each"], 2),
      gap("Mit der ___ bekommt man oft Geld zurück. (tax return)", "Steuererklärung"),
      pick("Kirchensteuer is paid by …", ["everyone", "only members of a church", "only employers"], 1),
    ]),
  },
  "The health system": {
    learningOutcome: "I can explain how to use the German health system.",
    resourceBody:
      "gesetzlich (GKV, most people) vs. privat versichert (PKV) · die Krankenkasse · die Gesundheitskarte / Versichertenkarte\n" +
      "der Hausarzt first → die Überweisung (referral) → der Facharzt (specialist). For eye doctor / gynaecologist no referral is needed.\n" +
      "der Notdienst / ärztlicher Bereitschaftsdienst: 116 117 (evenings, weekends, not life-threatening) · der Notruf 112 (emergency) · die Notaufnahme (A&E)\n" +
      "die Vorsorge (check-ups), die Impfung, die Zuzahlung (co-payment, e.g. 5–10 € per prescription), die Krankschreibung",
    guidedPractice: "Explain what to do if you get ill on Saturday night — not an emergency.",
    ...checks("Wähle / ergänze.", [
      pick("You have a high fever on Sunday, not life-threatening. Call …", ["112", "116 117", "110"], 1),
      pick("Chest pain and difficulty breathing. Call …", ["112", "116 117", "your Hausarzt next week"], 0),
      gap("Für den Facharzt brauche ich oft eine ___ vom Hausarzt.", "Überweisung"),
      gap("Für ein Rezept zahle ich eine ___ von 5 bis 10 Euro. (co-payment)", "Zuzahlung"),
      pick("Most employees are …", ["privat versichert", "gesetzlich versichert", "not insured"], 1),
      gap("Regelmäßige Check-ups nennt man ___.", "Vorsorge", "Vorsorgeuntersuchungen", "Vorsorgeuntersuchung"),
    ]),
  },
  "Environment & sustainability": {
    learningOutcome: "I can discuss environmental topics with the key vocabulary.",
    resourceBody:
      "die Umwelt · der Umweltschutz · der Klimawandel · die Erderwärmung · die CO₂-Emissionen · der Treibhauseffekt\n" +
      "die Energie: erneuerbare Energien (Sonne, Wind, Wasser) · die Solaranlage · das Kohlekraftwerk · der Atomausstieg · Energie sparen / verschwenden (waste)\n" +
      "nachhaltig (sustainable) · die Nachhaltigkeit · regional / saisonal einkaufen · Plastik vermeiden (avoid) · wiederverwenden (reuse) · der ökologische Fußabdruck\n" +
      "Es ist höchste Zeit, … · Jeder Einzelne kann …",
    guidedPractice: "Name three things you do and three things politics should do for the climate.",
    ...checks("Ergänze.", [
      gap("Sonne und Wind sind ___ Energien. (renewable)", "erneuerbare"),
      gap("Erdbeeren im Juni sind ___ — im Dezember nicht. (seasonal)", "saisonal"),
      gap("Der ___ ist eine der größten Herausforderungen unserer Zeit. (climate change)", "Klimawandel"),
      gap("Wir sollten Plastik ___. (avoid)", "vermeiden"),
      pick("„nachhaltig“ =", ["sustainable", "expensive", "afterwards"], 0),
      gap("Das Licht brennt die ganze Nacht — so ___ man Energie. (wastes)", "verschwendet"),
    ]),
  },
  "News & politics basics": {
    learningOutcome: "I can understand the basic vocabulary of news and German politics.",
    resourceBody:
      "die Nachrichten · die Schlagzeile (headline) · berichten über · laut (+ Dat.) = according to · die Umfrage (poll)\n" +
      "die Wahl · wählen · die Bundestagswahl (every 4 years) · die Partei · die Regierung (government) · die Opposition · der Bundeskanzler / die Bundeskanzlerin · der Bundestag (parliament) · die Bundesländer (16 states)\n" +
      "das Gesetz (law) · beschließen · die Demokratie · die Meinungsfreiheit · die Pressefreiheit · demonstrieren\n" +
      "Laut einer Umfrage sind 60 % der Deutschen für das Gesetz.",
    guidedPractice: "Summarise a headline you saw today in two German sentences.",
    ...checks("Ergänze / wähle.", [
      gap("Der ___ ist das deutsche Parlament.", "Bundestag"),
      gap("Deutschland hat 16 ___.", "Bundesländer", "Länder"),
      gap("___ einer Umfrage sind viele Menschen unzufrieden. (according to)", "Laut"),
      pick("Wie oft ist die Bundestagswahl?", ["alle 2 Jahre", "alle 4 Jahre", "alle 6 Jahre"], 1),
      gap("Das Parlament hat ein neues ___ beschlossen. (law)", "Gesetz"),
      pick("„die Schlagzeile“ =", ["the headline", "the opposition", "the demonstration"], 0),
    ]),
  },
  "Media & data": {
    learningOutcome: "I can talk about social media, online services and data protection.",
    resourceBody:
      "die sozialen Medien · posten · teilen (share) · der Beitrag (post) · folgen · der Nutzer / die Nutzerin · das Konto / Profil · sich einloggen / abmelden\n" +
      "der Datenschutz (data protection) · die DSGVO (GDPR) · personenbezogene Daten · die Einwilligung (consent) · zustimmen · widersprechen · löschen (delete)\n" +
      "die Cookies · das Passwort · die Zwei-Faktor-Authentifizierung · die Falschmeldung / Fake News · seriös (reliable) · die Quelle (source)\n" +
      "Nach der DSGVO dürfen Sie verlangen, dass Ihre Daten gelöscht werden.",
    guidedPractice: "Explain how you protect your data online in four sentences.",
    ...checks("Ergänze / wähle.", [
      gap("Die europäische Datenschutz-Grundverordnung heißt kurz ___.", "DSGVO"),
      gap("Ich möchte, dass Sie meine Daten ___. (delete)", "löschen"),
      gap("Ohne meine ___ darf die Firma meine Daten nicht weitergeben. (consent)", "Einwilligung", "Zustimmung"),
      pick("Before sharing a surprising news post, you should check …", ["how many likes it has", "the source", "the colour of the picture"], 1),
      gap("Ich habe den Artikel mit meinen Freunden ___. (shared)", "geteilt"),
      pick("„personenbezogene Daten“ =", ["personal data", "company data", "public data"], 0),
    ]),
  },
  "Living in Germany": {
    learningOutcome: "I can talk about German traditions, holidays and intercultural situations.",
    resourceBody:
      "Feiertage: Neujahr · Ostern · der Tag der Arbeit (1. Mai) · der Tag der Deutschen Einheit (3. Oktober) · Weihnachten (24.–26.12.) · Silvester — some differ by Bundesland\n" +
      "Traditions: der Adventskalender · der Weihnachtsmarkt · der Karneval / Fasching · das Oktoberfest · Kaffee und Kuchen · Pünktlichkeit\n" +
      "Everyday rules: die Sonntagsruhe (shops closed, no loud work) · die Mülltrennung · Termine machen · Schuhe ausziehen (often)\n" +
      "Intercultural: das Missverständnis · direkt / indirekt · höflich · Das ist bei uns anders. · Das war mir fremd, aber inzwischen …",
    guidedPractice: "Compare one German tradition with a tradition from your home country.",
    ...checks("Ergänze / wähle.", [
      gap("Am 3. Oktober feiert man den Tag der Deutschen ___.", "Einheit"),
      pick("On Sundays in Germany …", ["most shops are closed", "all shops are open late", "only supermarkets close"], 0),
      gap("Im Dezember gehen viele Menschen auf den ___. (Christmas market)", "Weihnachtsmarkt"),
      gap("Der 31. Dezember heißt ___.", "Silvester"),
      pick("Are all public holidays the same in every Bundesland?", ["yes", "no, some differ"], 1),
      gap("In Köln und Mainz feiert man im Februar ___. (carnival)", "Karneval", "Fasching", "Fastnacht"),
    ]),
  },
  Mobility: {
    learningOutcome: "I can talk about public transport tickets, driving licences and getting around.",
    resourceBody:
      "der ÖPNV (öffentlicher Personennahverkehr: buses, trams, U-/S-Bahn) · das Abo (subscription) · das Deutschlandticket (monthly, all local transport nationwide) · die Monatskarte · entwerten (validate) · schwarzfahren (ride without a ticket) → das erhöhte Beförderungsentgelt (60 €)\n" +
      "der Fernverkehr (ICE/IC) · die BahnCard · der Sparpreis · die Verspätung · der Anschluss (connection) · der Schienenersatzverkehr (replacement bus)\n" +
      "der Führerschein · umschreiben lassen (convert a foreign licence — usually within 6 months of residence) · die Fahrschule · die theoretische / praktische Prüfung\n" +
      "das Carsharing · das Lastenrad · der Radweg",
    guidedPractice: "Explain how you'd travel from your town to Berlin, cheaply and quickly.",
    ...checks("Ergänze / wähle.", [
      pick("The Deutschlandticket is valid on …", ["all ICE trains", "all local and regional transport", "only buses in your city"], 1),
      gap("Wer ohne Ticket fährt, fährt ___.", "schwarz"),
      gap("Wegen Bauarbeiten gibt es ___: Busse statt Züge.", "Schienenersatzverkehr"),
      gap("Meinen indischen Führerschein muss ich ___ lassen. (convert)", "umschreiben"),
      pick("„Ich habe meinen Anschluss verpasst.“ =", ["I missed my connection.", "I lost my ticket.", "I missed my stop."], 0),
      pick("Ohne Ticket erwischt? Du zahlst meistens …", ["10 €", "60 €", "500 €"], 1),
    ]),
  },
  "Opinion phrases": {
    learningOutcome: "I can introduce, structure and contrast opinions.",
    resourceBody:
      "Giving: Meiner Meinung nach … · Ich bin der Meinung / Ansicht, dass … · Ich vertrete die Auffassung, dass … · Aus meiner Sicht …\n" +
      "Structuring: Zunächst … · Außerdem … · Ein weiterer Punkt ist … · Schließlich … · Zusammenfassend lässt sich sagen …\n" +
      "Contrasting: einerseits … andererseits · im Gegensatz dazu · dagegen · allerdings · jedoch\n" +
      "Hedging: Ich bin mir nicht sicher, ob … · Es kommt darauf an, …\n" +
      "Word order: Meiner Meinung nach IST … (verb next) · Ich bin der Meinung, dass … IST (verb at the end).",
    guidedPractice: "Structure a 5-sentence opinion on homeschooling with zunächst, außerdem, allerdings, zusammenfassend.",
    ...checks("Ergänze.", [
      gap("Ich bin der ___, dass Kinder weniger Hausaufgaben brauchen.", "Meinung", "Ansicht", "Auffassung"),
      gap("Aus meiner ___ ist das ein guter Vorschlag.", "Sicht"),
      gap("___ lässt sich sagen, dass beide Seiten Recht haben. (in summary)", "Zusammenfassend"),
      pick("Meiner Meinung nach …", ["… das Gesetz ist sinnvoll.", "… ist das Gesetz sinnvoll.", "… sinnvoll ist das Gesetz ist."], 1),
      gap("Die Stadt ist teuer. Im ___ dazu ist das Land günstig.", "Gegensatz"),
      gap("Ob das gut ist? Es kommt darauf ___.", "an"),
    ]),
  },
  "Agreeing & disagreeing": {
    learningOutcome: "I can agree, partly agree and disagree politely with reasons.",
    resourceBody:
      "Agree: Da stimme ich dir/Ihnen zu. · Da hast du völlig recht. · Genau so sehe ich das auch. · Das ist ein gutes Argument.\n" +
      "Partly: Da hast du teilweise recht, aber … · Im Prinzip ja, aber … · Das stimmt zwar, aber …\n" +
      "Disagree: Da bin ich anderer Meinung. · Das sehe ich anders. · Da muss ich widersprechen. · Ich bezweifle, dass … (I doubt that …)\n" +
      "Interrupt/continue: Darf ich kurz etwas dazu sagen? · Lass mich bitte ausreden.",
    guidedPractice: "React to „Autos sollten in der Innenstadt verboten werden“ once agreeing, once partly, once disagreeing.",
    ...checks("Ergänze / wähle.", [
      gap("Da stimme ich dir ___.", "zu"),
      gap("Das sehe ich ___. (differently)", "anders"),
      gap("Ich ___, dass das funktioniert. (I doubt)", "bezweifle"),
      pick("Partial agreement:", ["Genau so sehe ich das.", "Im Prinzip ja, aber das ist zu teuer.", "Da muss ich widersprechen."], 1),
      gap("Lass mich bitte ___! (let me finish speaking)", "ausreden"),
      pick("Strongest disagreement:", ["Da hast du teilweise recht.", "Da muss ich widersprechen.", "Das ist ein gutes Argument."], 1),
    ]),
  },
};

// ── reading ──────────────────────────────────────────────────────────────────

const READING: Record<string, Authored> = {
  "Summarize articles": read(
    "Vier-Tage-Woche im Test",
    "Seit Januar testen 45 deutsche Unternehmen die Vier-Tage-Woche. Die Mitarbeitenden arbeiten dabei nur noch 32 Stunden, bekommen aber das gleiche Gehalt wie vorher. Nach sechs Monaten zieht die Universität Münster, die den Versuch begleitet, eine erste Bilanz: Die meisten Beschäftigten fühlen sich weniger gestresst und sind seltener krank. Die Produktivität ist in vielen Firmen gleich geblieben, in einigen sogar gestiegen. Allerdings gibt es auch Probleme: Besonders kleine Betriebe im Handwerk und in der Pflege haben Schwierigkeiten, weil Kunden und Patienten jeden Tag versorgt werden müssen. Dort mussten die Schichtpläne komplett neu organisiert werden. Zwei Drittel der Unternehmen wollen das Modell nach dem Test beibehalten. Die Forscher warnen jedoch davor, die Ergebnisse zu verallgemeinern: Die Firmen hatten sich freiwillig gemeldet und waren von Anfang an offen für die Idee.",
    [
      pick("Which sentence summarises the article best?", ["The four-day week failed in most companies.", "A test shows mostly positive results, but it doesn't suit every sector and can't be generalised easily.", "All German companies must introduce the four-day week."], 1),
      gap("Die Mitarbeitenden arbeiten ___ Stunden pro Woche.", "32"),
      pick("Was ist mit dem Gehalt?", ["Es ist gesunken.", "Es ist gleich geblieben.", "Es ist gestiegen."], 1),
      pick("Wo gibt es die meisten Probleme?", ["in großen Büros", "in kleinen Betrieben im Handwerk und in der Pflege", "an Universitäten"], 1),
      pick("Warum warnen die Forscher?", ["Die Firmen waren freiwillig dabei und schon offen für die Idee.", "Der Test war zu kurz.", "Die Zahlen sind falsch."], 0),
      pick("Wie viele Firmen wollen das Modell behalten?", ["ein Drittel", "die Hälfte", "zwei Drittel"], 2),
    ],
    "I can identify the main message and key details that belong in a summary.",
  ),
  "Read a travel blog entry": read(
    "Mit dem Nachtzug nach Wien — Blog von Jana",
    "Eigentlich wollte ich fliegen, aber dann entschied ich mich für den Nachtzug — und ich bereue es nicht! Um 20:15 Uhr stieg ich in Hamburg ein. Ich hatte ein Bett im Liegewagen gebucht, zusammen mit fünf anderen Reisenden. Zuerst war ich skeptisch, ob ich überhaupt schlafen würde, aber das gleichmäßige Rattern wirkte wie ein Schlaflied. Nachdem der Schaffner unsere Tickets kontrolliert hatte, unterhielt ich mich noch lange mit einer Studentin aus Graz, die mir viele Tipps für Wien gab. Um 9:30 Uhr kamen wir mit einer Stunde Verspätung an — das war der einzige Nachteil. Dafür hatte ich ein Hotel gespart und war ausgeschlafen. Mein Fazit: Der Nachtzug ist nicht der schnellste Weg, aber der entspannteste. Und für das Klima ist er auch besser. Beim nächsten Mal buche ich allerdings ein Schlafwagenabteil — mit eigenem Waschbecken!",
    [
      pick("Wie wollte Jana ursprünglich reisen?", ["mit dem Auto", "mit dem Flugzeug", "mit dem Bus"], 1),
      gap("Sie ist in ___ eingestiegen.", "Hamburg"),
      pick("Wie hat sie im Zug geschlafen?", ["schlecht, es war zu laut", "gut, das Rattern wirkte wie ein Schlaflied", "gar nicht"], 1),
      gap("Die Studentin kam aus ___.", "Graz"),
      pick("Was war der einzige Nachteil?", ["das Essen", "die Verspätung", "die anderen Reisenden"], 1),
      pick("Was macht sie beim nächsten Mal anders?", ["Sie fliegt.", "Sie bucht ein Schlafwagenabteil.", "Sie fährt tagsüber."], 1),
    ],
    "I can follow a personal travel account and the writer's evaluation.",
  ),
  "Read an academic-style article": read(
    "Mehrsprachigkeit und das Gehirn",
    "Lange Zeit glaubte man, dass Kinder durch das gleichzeitige Lernen mehrerer Sprachen überfordert würden. Neuere Studien zeigen jedoch das Gegenteil. Mehrsprachige Menschen wechseln ständig zwischen ihren Sprachen und müssen dabei die gerade nicht benötigte Sprache unterdrücken. Dieses tägliche Training stärkt offenbar die sogenannten exekutiven Funktionen, also die Fähigkeit, Aufmerksamkeit zu steuern und schnell zwischen Aufgaben zu wechseln. Eine kanadische Studie ergab außerdem, dass bei zweisprachigen Personen Symptome einer Demenz im Durchschnitt vier bis fünf Jahre später auftraten. Allerdings sind die Ergebnisse nicht eindeutig: Andere Forschergruppen konnten die Vorteile nicht in allen Tests bestätigen. Kritiker weisen darauf hin, dass Faktoren wie Bildung und Einkommen die Ergebnisse beeinflussen könnten. Einig sind sich die Forscher aber in einem Punkt: Mehrsprachigkeit schadet nicht.",
    [
      pick("Was glaubte man früher?", ["Mehrsprachigkeit überfordert Kinder.", "Mehrsprachigkeit macht intelligent.", "Kinder können keine Sprachen lernen."], 0),
      pick("Warum werden die exekutiven Funktionen trainiert?", ["weil Mehrsprachige die gerade nicht benötigte Sprache unterdrücken müssen", "weil sie mehr lesen", "weil sie mehr schlafen"], 0),
      gap("Laut einer kanadischen Studie traten Demenz-Symptome vier bis ___ Jahre später auf.", "fünf", "5"),
      pick("Sind die Ergebnisse eindeutig?", ["ja, alle Studien bestätigen sie", "nein, andere Gruppen konnten sie nicht immer bestätigen", "Das steht nicht im Text."], 1),
      pick("Welche Faktoren könnten die Ergebnisse beeinflussen?", ["Alter und Geschlecht", "Bildung und Einkommen", "Wohnort und Wetter"], 1),
      pick("Worin sind sich alle einig?", ["Mehrsprachigkeit schadet nicht.", "Mehrsprachigkeit verhindert Demenz.", "Kinder sollten nur eine Sprache lernen."], 0),
    ],
    "I can follow a structured argument with evidence, limits and conclusion.",
  ),
  "Read a text about life goals": read(
    "Was will ich im Leben?",
    "Mit 25 habe ich mir zum ersten Mal ernsthaft Gedanken über meine Ziele gemacht. Bis dahin hatte ich einfach getan, was meine Familie von mir erwartete: Ich hatte BWL studiert und arbeitete in einer Bank. Das Geld war gut, aber ich war nicht glücklich. Ich wünschte, ich hätte früher auf mein Bauchgefühl gehört. Denn eigentlich hatte ich schon immer gern mit den Händen gearbeitet. Also habe ich mit 27 gekündigt und eine Ausbildung als Tischlerin begonnen. Viele Freunde hielten mich für verrückt. Heute, fünf Jahre später, habe ich meine eigene kleine Werkstatt. Ich verdiene weniger als in der Bank, aber ich gehe jeden Morgen gern zur Arbeit. Mein nächstes Ziel: in drei Jahren selbst Lehrlinge ausbilden. Und irgendwann möchte ich ein Jahr mit dem Wohnmobil durch Skandinavien reisen.",
    [
      pick("Warum hat sie BWL studiert?", ["weil sie Zahlen liebt", "weil ihre Familie es erwartete", "weil sie reich werden wollte"], 1),
      pick("Wie fühlte sie sich in der Bank?", ["glücklich", "nicht glücklich", "gestresst, aber zufrieden"], 1),
      gap("Mit 27 begann sie eine Ausbildung als ___.", "Tischlerin"),
      pick("Wie reagierten viele Freunde?", ["Sie fanden es mutig.", "Sie hielten sie für verrückt.", "Sie machten dasselbe."], 1),
      pick("Verdient sie heute mehr als früher?", ["ja", "nein, weniger"], 1),
      pick("Was ist ihr nächstes Ziel?", ["Lehrlinge ausbilden", "zurück in die Bank", "ein Studium"], 0),
    ],
    "I can follow someone's life decisions, reasons and goals.",
  ),
  "Read a film or book review": read(
    "Rezension: „Das Haus am See“ (Roman)",
    "In ihrem neuen Roman erzählt Miriam Lenz die Geschichte dreier Schwestern, die sich nach dem Tod ihrer Mutter im alten Familienhaus am Chiemsee wiedertreffen. Schnell wird klar, dass jede von ihnen ein Geheimnis hat. Die Stärke des Buches liegt in den Figuren: Die drei Frauen sind so lebendig beschrieben, dass man meint, sie persönlich zu kennen. Besonders die jüngste Schwester Lotte, die als Krankenpflegerin in London arbeitet, wächst einem ans Herz. Weniger überzeugend ist der Mittelteil, der sich mit zu vielen Rückblenden in die Länge zieht. Wer Geduld hat, wird aber mit einem überraschenden Ende belohnt. Fazit: kein perfektes, aber ein berührendes Buch — ideal für lange Herbstabende. Vier von fünf Sternen.",
    [
      pick("Worum geht es?", ["um drei Schwestern und ihre Geheimnisse", "um eine Reise nach London", "um einen Kriminalfall"], 0),
      gap("Das Haus liegt am ___.", "Chiemsee"),
      pick("Was ist die größte Stärke laut Rezension?", ["die Figuren", "der Mittelteil", "die Länge"], 0),
      gap("Die jüngste Schwester heißt ___.", "Lotte"),
      pick("Was kritisiert die Rezension?", ["das Ende", "den Mittelteil mit zu vielen Rückblenden", "die Sprache"], 1),
      pick("Die Gesamtbewertung ist …", ["negativ", "gemischt, aber eher positiv", "begeistert ohne Kritik"], 1),
    ],
    "I can separate plot, praise and criticism in a review.",
  ),
  "Read a debate or opinion-forum thread": read(
    "Forum: Sollte das Handy in der Schule verboten werden?",
    "Mama_von_3: Ja, unbedingt! Meine Kinder kommen nach der Schule nach Hause und haben in den Pausen nur auf das Display gestarrt. Die Kinder sollen miteinander reden und spielen.\n\n" +
      "Lehrer_Kai: Ein komplettes Verbot halte ich für falsch. Wir müssen den Schülern beibringen, verantwortungsvoll mit Medien umzugehen — das geht nicht, wenn wir die Geräte einfach wegsperren. Im Unterricht nutzen wir Handys manchmal sogar für Recherchen.\n\n" +
      "Schülerin_Emma: Ich finde, im Unterricht sollte das Handy aus sein, klar. Aber in den Pausen? Da ist es meine Freizeit. Außerdem brauche ich es, um meine Eltern zu erreichen.\n\n" +
      "Opa_Heinz: Zu meiner Zeit gab es keine Handys und wir haben trotzdem alles gelernt. Ich bin für ein Verbot, aber mit Ausnahmen für Notfälle.",
    [
      pick("Wer ist klar für ein Verbot, ohne Einschränkung?", ["Mama_von_3", "Lehrer_Kai", "Schülerin_Emma"], 0),
      pick("Was ist Kais Hauptargument?", ["Kinder sollen lernen, verantwortungsvoll mit Medien umzugehen.", "Handys sind zu teuer.", "Kinder brauchen Handys für Spiele."], 0),
      pick("Wofür nutzt Kai Handys im Unterricht?", ["für Spiele", "für Recherchen", "gar nicht"], 1),
      pick("Was möchte Emma?", ["ein komplettes Verbot", "Handy aus im Unterricht, aber erlaubt in den Pausen", "Handys überall erlaubt"], 1),
      pick("Opa Heinz ist …", ["gegen ein Verbot", "für ein Verbot mit Ausnahmen für Notfälle", "unentschieden"], 1),
      gap("Emma braucht das Handy, um ihre ___ zu erreichen.", "Eltern"),
    ],
    "I can tell apart several positions in a discussion thread.",
  ),
  "Read about a workplace conflict case study": read(
    "Fallbeispiel: Streit um den Dienstplan",
    "In einem Pflegeheim in Kassel kam es zu Spannungen im Team. Die Stationsleitung, Frau Brandt, erstellte die Dienstpläne jeden Monat allein. Mehrere Mitarbeitende beklagten, dass immer dieselben Kolleginnen am Wochenende arbeiten mussten, während andere fast nie eingeteilt wurden. Besonders die Pflegekraft Dilara K., die zwei kleine Kinder hat, fühlte sich ungerecht behandelt, weil ihre Wünsche nicht berücksichtigt wurden. Statt direkt mit Frau Brandt zu sprechen, beschwerten sich einige beim Heimleiter. Das verschlechterte die Stimmung zusätzlich. Schließlich wurde ein Gespräch mit einer externen Mediatorin organisiert. Das Ergebnis: Die Dienstpläne werden nun gemeinsam im Team besprochen, und es gibt eine transparente Regel, nach der jeder höchstens zwei Wochenenden pro Monat arbeitet. Wünsche können bis zum 15. des Vormonats eingetragen werden.",
    [
      pick("Was war das Problem?", ["Die Dienstpläne waren ungerecht verteilt.", "Es gab zu wenig Personal.", "Das Gehalt war zu niedrig."], 0),
      pick("Warum fühlte sich Dilara ungerecht behandelt?", ["Ihre Wünsche wurden nicht berücksichtigt.", "Sie verdiente weniger.", "Sie durfte keinen Urlaub nehmen."], 0),
      pick("Was machte die Situation schlimmer?", ["Einige beschwerten sich beim Heimleiter statt mit Frau Brandt zu sprechen.", "Frau Brandt kündigte.", "Dilara wurde krank."], 0),
      gap("Das Gespräch führte eine externe ___.", "Mediatorin"),
      gap("Jeder arbeitet höchstens ___ Wochenenden pro Monat.", "zwei", "2"),
      gap("Wünsche kann man bis zum ___. des Vormonats eintragen.", "15"),
    ],
    "I can follow the cause, escalation and resolution of a workplace conflict.",
  ),
  "Read about the dual training (Ausbildung) system": read(
    "Die duale Ausbildung",
    "In Deutschland machen jedes Jahr rund 470.000 junge Menschen eine duale Ausbildung. „Dual“ bedeutet, dass die Ausbildung an zwei Lernorten stattfindet: im Betrieb und in der Berufsschule. Im Betrieb lernen die Auszubildenden die Praxis, in der Berufsschule die Theorie sowie allgemeine Fächer wie Deutsch und Wirtschaft. Die Ausbildung dauert je nach Beruf zwei bis dreieinhalb Jahre. Mit Abitur oder guten Leistungen kann sie verkürzt werden. Anders als bei einem Studium bekommen Azubis vom ersten Tag an Geld: die Ausbildungsvergütung. Seit 2020 gibt es dafür eine gesetzliche Mindestvergütung. Am Ende steht eine Abschlussprüfung vor der zuständigen Kammer, zum Beispiel der IHK oder der Handwerkskammer. Viele Betriebe übernehmen ihre Azubis danach. Auch für Menschen aus dem Ausland ist die Ausbildung ein beliebter Weg nach Deutschland — Voraussetzung ist meistens ein Deutschniveau von B1 oder B2.",
    [
      pick("Was bedeutet „dual“?", ["zwei Berufe gleichzeitig", "zwei Lernorte: Betrieb und Berufsschule", "zwei Prüfungen"], 1),
      gap("Jedes Jahr beginnen rund ___ junge Menschen eine duale Ausbildung.", "470.000"),
      pick("Wie lange dauert die Ausbildung?", ["ein Jahr", "zwei bis dreieinhalb Jahre", "fünf Jahre"], 1),
      pick("Wann kann man verkürzen?", ["mit Abitur oder guten Leistungen", "nie", "nur im Handwerk"], 0),
      gap("Seit ___ gibt es eine gesetzliche Mindestvergütung.", "2020"),
      pick("Welches Deutschniveau braucht man meistens aus dem Ausland?", ["A2", "B1 oder B2", "C2"], 1),
    ],
    "I can read an explainer about the Ausbildung and pick out the facts that concern me.",
  ),
  "Read about Azubi rights and duties": read(
    "Deine Rechte und Pflichten als Azubi — FAQ",
    "Muss ich Überstunden machen? Grundsätzlich nur in Ausnahmefällen. Überstunden müssen bezahlt oder mit Freizeit ausgeglichen werden.\n\n" +
      "Darf mein Chef mich zum Putzen oder Kaffeekochen schicken? Nur wenn es zur Ausbildung gehört. Ausbildungsfremde Tätigkeiten sind nicht erlaubt.\n\n" +
      "Muss ich das Berichtsheft in meiner Freizeit schreiben? Nein. Das Berichtsheft (Ausbildungsnachweis) wird während der Arbeitszeit geführt. Ohne vollständiges Berichtsheft wirst du aber nicht zur Abschlussprüfung zugelassen.\n\n" +
      "Was passiert, wenn ich krank bin? Du musst deinen Betrieb sofort informieren — am ersten Tag, vor Arbeitsbeginn. Ab dem vierten Tag brauchst du eine ärztliche Bescheinigung, falls dein Vertrag nichts anderes sagt.\n\n" +
      "Wie viel Urlaub habe ich? Das steht im Ausbildungsvertrag. Erwachsene haben mindestens 24 Werktage; bist du unter 18, sind es mehr.",
    [
      pick("Überstunden …", ["sind normal und unbezahlt", "müssen bezahlt oder mit Freizeit ausgeglichen werden", "sind verboten"], 1),
      pick("Darf der Chef dich regelmäßig zum Putzen schicken, wenn das nicht zur Ausbildung gehört?", ["ja", "nein"], 1),
      pick("Wann schreibt man das Berichtsheft?", ["in der Freizeit", "während der Arbeitszeit", "nur am Wochenende"], 1),
      pick("Was passiert ohne vollständiges Berichtsheft?", ["Man bekommt weniger Geld.", "Man wird nicht zur Abschlussprüfung zugelassen.", "Nichts."], 1),
      gap("Eine ärztliche Bescheinigung braucht man ab dem ___ Tag.", "vierten", "4."),
      gap("Erwachsene haben mindestens ___ Werktage Urlaub.", "24"),
    ],
    "I can find specific answers about my rights and duties in an FAQ.",
  ),
  "Read a Bescheid or official notice": read(
    "Bescheid über Wohngeld",
    "Sehr geehrter Herr Osei,\n\nauf Ihren Antrag vom 12.03. wird Ihnen für den Zeitraum vom 01.04. bis zum 31.03. des Folgejahres Wohngeld in Höhe von monatlich 187,00 Euro bewilligt. Die Zahlung erfolgt jeweils zum Monatsanfang auf das von Ihnen angegebene Konto.\n\n" +
      "Sie sind verpflichtet, uns jede Änderung Ihres Einkommens oder Ihrer Miete unverzüglich mitzuteilen. Zu Unrecht erhaltene Beträge müssen zurückgezahlt werden.\n\n" +
      "Für eine Weiterbewilligung stellen Sie bitte spätestens zwei Monate vor Ablauf des Bewilligungszeitraums einen neuen Antrag.\n\n" +
      "Rechtsbehelfsbelehrung: Gegen diesen Bescheid können Sie innerhalb eines Monats nach Bekanntgabe Widerspruch einlegen. Der Widerspruch ist schriftlich oder zur Niederschrift bei der Wohngeldstelle einzureichen.",
    [
      pick("Wurde der Antrag angenommen?", ["ja", "nein", "teilweise abgelehnt"], 0),
      gap("Herr Osei bekommt monatlich ___ Euro.", "187,00", "187"),
      pick("Wie lange gilt die Bewilligung?", ["einen Monat", "ein Jahr", "unbegrenzt"], 1),
      pick("Was muss Herr Osei sofort melden?", ["jede Änderung von Einkommen oder Miete", "jeden Urlaub", "jeden Arztbesuch"], 0),
      pick("Wann muss er den nächsten Antrag stellen?", ["nach Ablauf", "spätestens zwei Monate vor Ablauf", "sofort"], 1),
      pick("Wie lange hat er Zeit für einen Widerspruch?", ["zwei Wochen", "einen Monat", "zwei Monate"], 1),
    ],
    "I can find the decision, the amount, my obligations and the deadlines in a Bescheid.",
  ),
  "Read a health-system explainer": read(
    "Krank — wohin?",
    "Wer in Deutschland krank wird, geht normalerweise zuerst zum Hausarzt. Die Hausärztin kennt die Krankengeschichte und überweist bei Bedarf an einen Facharzt. Ohne Überweisung ist der Termin beim Facharzt zwar oft möglich, aber die Wartezeit ist häufig länger. Direkt ohne Überweisung gehen kann man zum Beispiel zum Augenarzt oder zur Frauenärztin.\n\n" +
      "Nachts und am Wochenende, wenn die Praxen geschlossen sind, hilft der ärztliche Bereitschaftsdienst unter der Nummer 116 117. Er ist für Erkrankungen gedacht, die nicht lebensbedrohlich sind, aber nicht bis zum nächsten Werktag warten können. In echten Notfällen — etwa bei Brustschmerzen, Atemnot oder starken Blutungen — wählt man die 112 oder fährt in die Notaufnahme eines Krankenhauses.\n\n" +
      "Gesetzlich Versicherte zahlen für Arztbesuche nichts. Für Medikamente auf Rezept fällt meist eine Zuzahlung von fünf bis zehn Euro an. Kinder und Jugendliche unter 18 sind davon befreit.",
    [
      pick("Wohin geht man normalerweise zuerst?", ["in die Notaufnahme", "zum Hausarzt", "zum Facharzt"], 1),
      pick("Für welchen Arzt braucht man keine Überweisung?", ["Augenarzt", "Kardiologe", "Orthopäde"], 0),
      gap("Die Nummer des Bereitschaftsdienstes ist ___.", "116 117", "116117"),
      pick("Bei Atemnot wählt man …", ["116 117", "112", "die Nummer des Hausarztes"], 1),
      pick("Was zahlen gesetzlich Versicherte für den Arztbesuch?", ["10 Euro", "nichts", "die Hälfte"], 1),
      pick("Wer zahlt keine Zuzahlung für Medikamente?", ["Rentner", "Kinder und Jugendliche unter 18", "Studierende"], 1),
    ],
    "I can understand how to use the health system from an explainer.",
  ),
  "Read an environmental-policy article": read(
    "Pfand auf alle Getränkeflaschen?",
    "Seit 2003 gibt es in Deutschland ein Pfand auf viele Einwegflaschen und Dosen. Seit 2022 gilt es auch für fast alle Plastikflaschen, zum Beispiel für Saft. Nur Milchprodukte in Plastikflaschen sind erst seit 2024 dabei. Das System gilt als Erfolg: Rund 98 Prozent der Pfandflaschen werden zurückgegeben. Umweltverbände fordern jetzt, das Pfand auch auf Weinflaschen und Glasbehälter für Lebensmittel auszuweiten. Der Handel ist dagegen: Die Rücknahmeautomaten müssten umgebaut werden, und die Lager seien schon jetzt zu klein. Die Bundesregierung will bis Ende des Jahres entscheiden. Kritiker weisen außerdem darauf hin, dass das eigentliche Ziel sein sollte, weniger Einwegverpackungen zu produzieren — und mehr Mehrwegflaschen zu nutzen, die bis zu fünfzig Mal wieder befüllt werden können.",
    [
      gap("Seit ___ gibt es Pfand auf fast alle Plastikflaschen.", "2022"),
      gap("Rund ___ Prozent der Pfandflaschen werden zurückgegeben.", "98"),
      pick("Was fordern Umweltverbände?", ["Pfand auch auf Weinflaschen und Lebensmittelgläser", "kein Pfand mehr", "höheres Pfand auf Dosen"], 0),
      pick("Warum ist der Handel dagegen?", ["Automaten müssten umgebaut werden und die Lager sind zu klein.", "Die Kunden wollen es nicht.", "Es ist zu billig."], 0),
      pick("Was ist laut Kritikern das eigentliche Ziel?", ["weniger Einwegverpackungen und mehr Mehrweg", "mehr Automaten", "Glas verbieten"], 0),
      gap("Mehrwegflaschen kann man bis zu ___ Mal befüllen.", "fünfzig", "50"),
    ],
    "I can follow a policy debate: status quo, proposal, objections and criticism.",
  ),
  "Read a text with Konjunktiv II (advice or wishes)": read(
    "Leserbrief und Antwort",
    "Liebe Frau Dr. Winter, ich bin vor einem Jahr für die Arbeit nach Deutschland gekommen. Ich wünschte, ich hätte mehr Freunde hier. Meine Kollegen sind nett, aber nach der Arbeit geht jeder nach Hause. Wenn ich besser Deutsch sprechen könnte, wäre alles leichter. Was würden Sie mir raten? — Samir, 29\n\n" +
      "Lieber Samir, das geht vielen so! An Ihrer Stelle würde ich einem Verein beitreten — Sportvereine, Chöre oder die Freiwillige Feuerwehr sind ideal, weil man dort regelmäßig dieselben Leute trifft. Sie könnten auch ein Sprachcafé besuchen oder einen Tandempartner suchen. Und warum laden Sie nicht einmal Ihre Kollegen zum Essen ein? Viele Deutsche wirken am Anfang reserviert, aber sie würden sich über eine Einladung freuen. Es wäre auch gut, wenn Sie Geduld mit sich hätten: Freundschaften brauchen hier oft etwas Zeit, aber sie halten dann meist lange.",
    [
      pick("Was wünscht sich Samir?", ["mehr Geld", "mehr Freunde", "eine neue Arbeit"], 1),
      pick("„Wenn ich besser Deutsch sprechen könnte, wäre alles leichter“ — spricht Samir gut Deutsch?", ["ja", "nicht so gut, wie er möchte"], 1),
      gap("Frau Dr. Winter würde einem ___ beitreten.", "Verein"),
      pick("Warum sind Vereine ideal?", ["Man trifft regelmäßig dieselben Leute.", "Sie sind kostenlos.", "Man lernt dort Grammatik."], 0),
      pick("Was sagt sie über viele Deutsche?", ["Sie sind unfreundlich.", "Sie wirken reserviert, freuen sich aber über Einladungen.", "Sie mögen keine Ausländer."], 1),
      gap("Sie rät ihm, ___ mit sich zu haben.", "Geduld"),
    ],
    "I can understand wishes and advice expressed with the Konjunktiv II.",
  ),
  "Read a narrative using Plusquamperfekt": read(
    "Der verlorene Schlüssel",
    "Als Marta an diesem Abend nach Hause kam, war es schon dunkel. Sie suchte in ihrer Tasche nach dem Schlüssel, aber er war nicht da. Sie erinnerte sich: Am Morgen hatte sie die Tasche gewechselt, weil die alte kaputt gegangen war. Den Schlüssel hatte sie in der alten Tasche vergessen — und die hatte sie im Büro gelassen. Ihr Mitbewohner war am Nachmittag zu seinen Eltern gefahren. Nachdem sie zwanzig Minuten vor der Tür gestanden hatte, rief sie den Schlüsseldienst an. Der Mann verlangte 150 Euro. Da fiel ihr ein, dass sie ihrer Nachbarin, Frau Kaya, im Sommer einen Ersatzschlüssel gegeben hatte. Zum Glück war Frau Kaya zu Hause. Marta sagte den Schlüsseldienst ab und bedankte sich am nächsten Tag mit einem selbst gebackenen Kuchen.",
    [
      pick("Warum hatte Marta den Schlüssel nicht?", ["Sie hatte ihn verloren.", "Er war in der alten Tasche im Büro.", "Der Mitbewohner hatte ihn."], 1),
      pick("Warum hatte sie die Tasche gewechselt?", ["Die alte war kaputt gegangen.", "Die neue war schöner.", "Sie hatte eine neue geschenkt bekommen."], 0),
      pick("Wo war der Mitbewohner?", ["im Büro", "bei seinen Eltern", "bei Frau Kaya"], 1),
      gap("Sie stand ___ Minuten vor der Tür.", "zwanzig", "20"),
      gap("Der Schlüsseldienst wollte ___ Euro.", "150"),
      pick("Which happened FIRST?", ["Marta called the locksmith.", "Marta gave her neighbour a spare key.", "Marta changed her bag."], 1),
    ],
    "I can put events in order when a story uses the Plusquamperfekt.",
  ),
  "Read a persuasive essay": read(
    "Warum wir mehr Fahrradstraßen brauchen",
    "Unsere Innenstädte sind voll mit Autos — und trotzdem kommt kaum jemand schnell voran. Ich bin überzeugt, dass mehr Fahrradstraßen die Lösung sind. Erstens ist das Fahrrad auf Strecken unter fünf Kilometern oft schneller als das Auto, weil man keinen Parkplatz suchen muss. Zweitens ist Radfahren gesund: Wer täglich 30 Minuten radelt, senkt sein Risiko für Herz-Kreislauf-Erkrankungen deutlich. Drittens profitieren alle von weniger Lärm und sauberer Luft. Natürlich gibt es Gegenargumente. Handwerker und ältere Menschen sind auf das Auto angewiesen. Doch gerade für sie wären weniger Staus ein Vorteil. Auch das Argument, der Einzelhandel verliere Kunden, hält einer Prüfung nicht stand: Studien zeigen, dass Radfahrer zwar weniger pro Einkauf ausgeben, aber häufiger kommen. Deshalb fordere ich: Die Stadt sollte in den nächsten fünf Jahren jede zweite Nebenstraße zur Fahrradstraße machen.",
    [
      pick("Was ist die These des Autors?", ["Wir brauchen mehr Parkplätze.", "Mehr Fahrradstraßen sind die Lösung.", "Autos sollten verboten werden."], 1),
      gap("Auf Strecken unter ___ Kilometern ist das Rad oft schneller.", "fünf", "5"),
      pick("Welches Gegenargument nennt der Autor?", ["Radfahren ist gefährlich.", "Handwerker und ältere Menschen brauchen das Auto.", "Fahrräder sind teuer."], 1),
      pick("Wie antwortet er auf das Gegenargument?", ["Für sie wären weniger Staus ein Vorteil.", "Sie sollen den Bus nehmen.", "Er ignoriert es."], 0),
      pick("Was sagen Studien über Radfahrer im Einzelhandel?", ["Sie kaufen gar nichts.", "Sie geben pro Einkauf weniger aus, kommen aber häufiger.", "Sie geben mehr aus als Autofahrer."], 1),
      pick("Was fordert er konkret?", ["jede zweite Nebenstraße zur Fahrradstraße machen", "eine City-Maut", "kostenlose Fahrräder"], 0),
    ],
    "I can identify thesis, arguments, counter-arguments and demand in a persuasive text.",
  ),
  "Read an article about workplace communication": read(
    "Feedback richtig geben",
    "In vielen deutschen Unternehmen gilt eine direkte Kommunikation als professionell. Das kann für Menschen aus anderen Kulturen zunächst unhöflich wirken. Wenn eine Vorgesetzte sagt: „Der Bericht hat noch Fehler“, ist das meist keine persönliche Kritik, sondern eine sachliche Information. Trotzdem gibt es Regeln für gutes Feedback. Experten empfehlen die sogenannte Sandwich-Methode kaum noch, weil das Lob in der Mitte oft untergeht. Besser sei es, konkret zu beschreiben, was man beobachtet hat, welche Wirkung es hatte und was man sich für die Zukunft wünscht. Also nicht: „Du bist immer unpünktlich“, sondern: „Du bist diese Woche zweimal zu spät gekommen. Dadurch musste das Team warten. Ich wünsche mir, dass du pünktlich bist oder vorher Bescheid gibst.“ Ich-Botschaften und konkrete Beispiele machen es dem anderen leichter, Kritik anzunehmen.",
    [
      pick("Wie gilt direkte Kommunikation in vielen deutschen Firmen?", ["als unhöflich", "als professionell", "als verboten"], 1),
      pick("„Der Bericht hat noch Fehler“ ist meist …", ["persönliche Kritik", "eine sachliche Information", "ein Witz"], 1),
      pick("Warum empfehlen Experten die Sandwich-Methode kaum noch?", ["Das Lob in der Mitte geht oft unter.", "Sie ist zu direkt.", "Sie dauert zu lange."], 0),
      pick("Was ist die empfohlene Reihenfolge?", ["Beobachtung – Wirkung – Wunsch", "Lob – Kritik – Lob", "Kritik – Strafe – Lob"], 0),
      gap("___ und konkrete Beispiele machen es leichter, Kritik anzunehmen.", "Ich-Botschaften"),
      pick("Welcher Satz ist gutes Feedback?", ["„Du bist immer unpünktlich.“", "„Du bist diese Woche zweimal zu spät gekommen.“"], 1),
    ],
    "I can understand advice about communication styles at work.",
  ),
  "Read a rental or insurance contract": read(
    "Auszug: Haftpflichtversicherung, Tarif Basis",
    "§ 1 Versicherungsschutz: Versichert sind Schäden, die Sie als Privatperson anderen Personen fahrlässig zufügen, bis zu einer Deckungssumme von 10 Millionen Euro.\n" +
      "§ 2 Selbstbeteiligung: Pro Schadensfall tragen Sie 150 Euro selbst.\n" +
      "§ 3 Ausschlüsse: Nicht versichert sind vorsätzlich verursachte Schäden, Schäden an geliehenen oder gemieteten Sachen (außer Mietsachschäden an Wohnräumen) sowie Schäden durch Kraftfahrzeuge.\n" +
      "§ 4 Beitrag und Laufzeit: Der Jahresbeitrag beträgt 49 Euro. Der Vertrag läuft ein Jahr und verlängert sich automatisch um ein weiteres Jahr, wenn er nicht drei Monate vor Ablauf gekündigt wird.\n" +
      "§ 5 Schadensmeldung: Schäden sind innerhalb einer Woche schriftlich oder online zu melden.",
    [
      gap("Die Deckungssumme ist ___ Millionen Euro.", "10", "zehn"),
      pick("Sie werfen aus Versehen die Brille eines Freundes herunter (Schaden 300 €). Wie viel zahlt die Versicherung?", ["300 €", "150 €", "nichts"], 1),
      pick("Sie beschädigen absichtlich ein fremdes Auto. Zahlt die Versicherung?", ["ja", "nein, vorsätzliche Schäden sind ausgeschlossen"], 1),
      pick("Sie haben sich ein Fahrrad geliehen und es beschädigt. Ist das versichert?", ["ja", "nein"], 1),
      gap("Der Jahresbeitrag ist ___ Euro.", "49"),
      pick("Wann muss man kündigen, damit sich der Vertrag nicht verlängert?", ["einen Monat vor Ablauf", "drei Monate vor Ablauf", "jederzeit"], 1),
    ],
    "I can apply the terms of a contract to concrete situations.",
  ),
  "Read a text about integration and living in Germany": read(
    "Angekommen?",
    "Priya lebt seit vier Jahren in Stuttgart und arbeitet als Softwareentwicklerin. „Beruflich war der Anfang leicht“, erzählt sie, „weil in meiner Firma viel Englisch gesprochen wird. Aber genau das war auch das Problem: Ich habe lange kaum Deutsch gebraucht.“ Erst als sie beim Elternabend im Kindergarten ihrer Tochter kaum etwas verstand, entschloss sie sich, ernsthaft Deutsch zu lernen. Heute spricht sie auf B2-Niveau und engagiert sich im Elternbeirat. „Integration ist keine Einbahnstraße“, sagt sie. „Ich muss die Sprache lernen und die Regeln verstehen, aber die Gesellschaft muss mich auch lassen.“ Negative Erfahrungen hat sie vor allem bei der Wohnungssuche gemacht: Auf viele Bewerbungen bekam sie keine Antwort. Trotzdem fühlt sie sich inzwischen zu Hause. „Wenn ich im Urlaub in Indien bin, vermisse ich nach zwei Wochen die Ruhe am Sonntag“, lacht sie.",
    [
      pick("Warum war der berufliche Anfang leicht?", ["In der Firma wird viel Englisch gesprochen.", "Sie sprach schon perfekt Deutsch.", "Ihr Chef kommt auch aus Indien."], 0),
      pick("Was war der Auslöser, ernsthaft Deutsch zu lernen?", ["ein Elternabend im Kindergarten", "eine Prüfung", "ein Arztbesuch"], 0),
      gap("Heute spricht sie auf ___-Niveau.", "B2"),
      pick("„Integration ist keine Einbahnstraße“ bedeutet:", ["Beide Seiten müssen etwas tun.", "Integration ist unmöglich.", "Nur die Migranten müssen sich anpassen."], 0),
      pick("Wo hat sie negative Erfahrungen gemacht?", ["bei der Arbeit", "bei der Wohnungssuche", "im Kindergarten"], 1),
      pick("Was vermisst sie im Urlaub in Indien?", ["das Essen", "die Ruhe am Sonntag", "ihre Kollegen"], 1),
    ],
    "I can follow a personal account of integration, including nuance and irony.",
  ),
  "Read a data-privacy notice": read(
    "Datenschutzhinweise — Fitnessstudio FitPlus",
    "Wir verarbeiten Ihre personenbezogenen Daten (Name, Adresse, Geburtsdatum, Bankverbindung) zur Durchführung Ihres Mitgliedsvertrags. Beim Check-in speichern wir Datum und Uhrzeit Ihres Besuchs; diese Daten werden nach 30 Tagen gelöscht.\n\n" +
      "Mit Ihrer ausdrücklichen Einwilligung senden wir Ihnen unseren Newsletter. Diese Einwilligung können Sie jederzeit widerrufen, z. B. über den Link am Ende jeder E-Mail.\n\n" +
      "Eine Weitergabe an Dritte erfolgt nur, soweit dies gesetzlich vorgeschrieben ist oder zur Vertragserfüllung nötig ist (z. B. an unsere Bank für den Lastschrifteinzug).\n\n" +
      "Nach Vertragsende werden Ihre Daten gelöscht, soweit keine gesetzlichen Aufbewahrungsfristen bestehen (für Rechnungen: 10 Jahre).\n\n" +
      "Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Beschwerde bei der zuständigen Aufsichtsbehörde.",
    [
      pick("Wofür werden Name und Bankverbindung verarbeitet?", ["für Werbung", "für den Mitgliedsvertrag", "für Partnerfirmen"], 1),
      gap("Check-in-Daten werden nach ___ Tagen gelöscht.", "30"),
      pick("Bekommen Sie den Newsletter automatisch?", ["ja", "nein, nur mit Einwilligung"], 1),
      pick("Wie kann man den Newsletter abbestellen?", ["nur per Brief", "über den Link in jeder E-Mail", "gar nicht"], 1),
      pick("An wen werden Daten zum Beispiel weitergegeben?", ["an Werbefirmen", "an die Bank für die Lastschrift", "an andere Mitglieder"], 1),
      gap("Rechnungen werden ___ Jahre aufbewahrt.", "10", "zehn"),
    ],
    "I can find what data is used, why, for how long and what my rights are.",
  ),
  "Read a news article about taxes or salary": read(
    "Mindestlohn steigt",
    "Der gesetzliche Mindestlohn in Deutschland steigt zum 1. Januar von 12,82 auf 13,90 Euro pro Stunde. Das hat die Mindestlohnkommission beschlossen, in der Arbeitgeber und Gewerkschaften vertreten sind. Rund sechs Millionen Beschäftigte profitieren von der Erhöhung, vor allem in der Gastronomie, im Einzelhandel und in der Reinigungsbranche. Die Gewerkschaften hatten 15 Euro gefordert und kritisieren die Erhöhung als zu niedrig, da die Lebenshaltungskosten stark gestiegen seien. Arbeitgeberverbände warnen dagegen, dass kleine Betriebe die höheren Kosten kaum tragen könnten und Arbeitsplätze verloren gehen könnten. Auch Minijobber profitieren: Die Verdienstgrenze für Minijobs ist an den Mindestlohn gekoppelt und steigt deshalb automatisch mit. Für Auszubildende gilt der Mindestlohn nicht — für sie gibt es eine eigene Mindestvergütung.",
    [
      gap("Der Mindestlohn steigt auf ___ Euro pro Stunde.", "13,90"),
      pick("Wer entscheidet über den Mindestlohn?", ["die Bundesregierung allein", "die Mindestlohnkommission mit Arbeitgebern und Gewerkschaften", "die Gerichte"], 1),
      gap("Rund ___ Millionen Beschäftigte profitieren.", "sechs", "6"),
      pick("Was kritisieren die Gewerkschaften?", ["Die Erhöhung ist zu niedrig.", "Die Erhöhung ist zu hoch.", "Der Termin ist zu spät."], 0),
      pick("Was befürchten Arbeitgeberverbände?", ["mehr Bürokratie", "Verlust von Arbeitsplätzen in kleinen Betrieben", "höhere Steuern"], 1),
      pick("Gilt der Mindestlohn für Azubis?", ["ja", "nein, für sie gibt es eine eigene Mindestvergütung"], 1),
    ],
    "I can follow a news report with figures and opposing positions.",
  ),
  "Read an opinion piece with connectors": read(
    "Kommentar: Homeoffice für alle?",
    "Seit der Pandemie arbeiten viele Menschen regelmäßig von zu Hause. Einerseits spart das Zeit und Geld für den Arbeitsweg, andererseits fehlt vielen der Kontakt zu den Kollegen. Zwar zeigen Studien, dass die Produktivität im Homeoffice nicht sinkt, dennoch berichten gerade junge Beschäftigte, dass sie ohne das Büro weniger lernen. Nicht nur die Arbeitnehmer, sondern auch die Unternehmen profitieren: Sie brauchen weniger Bürofläche. Allerdings darf man nicht vergessen, dass Homeoffice ein Privileg ist: Eine Pflegekraft oder ein Bäcker kann nicht von zu Hause arbeiten. Je mehr über Homeoffice diskutiert wird, desto größer wird deshalb die Gefahr einer Spaltung der Arbeitswelt. Meiner Meinung nach sollte man weder alle ins Büro zurückholen noch das Büro abschaffen. Stattdessen brauchen wir flexible Modelle — und einen Ausgleich für diejenigen, die kein Homeoffice machen können, zum Beispiel mehr Urlaubstage.",
    [
      pick("„Einerseits … andererseits“ introduces …", ["two contrasting sides", "a list of examples", "a time sequence"], 0),
      pick("Was berichten junge Beschäftigte?", ["Sie lernen ohne Büro weniger.", "Sie sind produktiver.", "Sie verdienen mehr."], 0),
      pick("Warum profitieren auch Unternehmen?", ["Sie brauchen weniger Bürofläche.", "Sie zahlen weniger Gehalt.", "Sie brauchen weniger Mitarbeiter."], 0),
      pick("Warum ist Homeoffice ein „Privileg“?", ["Nicht alle Berufe können von zu Hause arbeiten.", "Es ist teuer.", "Nur Chefs dürfen es."], 0),
      gap("Man sollte ___ alle ins Büro zurückholen noch das Büro abschaffen.", "weder"),
      pick("Welchen Ausgleich schlägt der Autor vor?", ["mehr Gehalt", "mehr Urlaubstage", "kostenlose Tickets"], 1),
    ],
    "I can follow an argument through its connectors and find the author's position.",
  ),
  "Read an interview transcript": read(
    "Interview mit einer Pflege-Azubi",
    "Frage: Frau Mendoza, Sie kommen aus Kolumbien und machen seit einem Jahr eine Ausbildung zur Pflegefachfrau. Warum gerade Deutschland?\n" +
      "Mendoza: In Kolumbien hatte ich schon als Pflegehelferin gearbeitet. Eine Freundin hat mir erzählt, dass Deutschland dringend Pflegekräfte sucht und die Ausbildung bezahlt wird. Das hat mich überzeugt.\n" +
      "Frage: Was war am Anfang am schwierigsten?\n" +
      "Mendoza: Ganz klar die Sprache, vor allem der Dialekt der älteren Patienten hier in Bayern! In der Berufsschule verstehe ich inzwischen fast alles, aber am Telefon habe ich immer noch Schwierigkeiten.\n" +
      "Frage: Und was gefällt Ihnen besonders?\n" +
      "Mendoza: Die Arbeit mit den Menschen. Und dass ich hier viel Verantwortung bekomme. In meinem Team fühle ich mich sehr wohl.\n" +
      "Frage: Was möchten Sie nach der Ausbildung machen?\n" +
      "Mendoza: Ich möchte mich auf Intensivpflege spezialisieren. Und irgendwann möchte ich meine Mutter nach Deutschland einladen, damit sie sieht, wo ich lebe.",
    [
      gap("Frau Mendoza kommt aus ___.", "Kolumbien"),
      pick("Was hat sie in ihrer Heimat gemacht?", ["Sie war Lehrerin.", "Sie war Pflegehelferin.", "Sie hat studiert."], 1),
      pick("Wie hat sie von der Ausbildung erfahren?", ["durch eine Freundin", "im Internet", "von einer Agentur"], 0),
      pick("Was war am Anfang am schwierigsten?", ["das Wetter", "die Sprache, besonders der Dialekt", "die Kollegen"], 1),
      pick("Wo hat sie noch Schwierigkeiten?", ["in der Berufsschule", "am Telefon", "im Team"], 1),
      gap("Sie möchte sich auf ___ spezialisieren.", "Intensivpflege"),
    ],
    "I can follow questions and answers in an interview and find specific information.",
  ),
  "Read a formal letter example": read(
    "Kündigung eines Fitnessvertrags",
    "Tomasz Wiśniewski\nLindenallee 8\n50668 Köln\n\nFitPlus GmbH\nKundenservice\nPostfach 1120\n50001 Köln\n\nKöln, 3. März\n\nKündigung meines Mitgliedsvertrags, Mitgliedsnummer 45-2291\n\nSehr geehrte Damen und Herren,\n\nhiermit kündige ich meinen Mitgliedsvertrag fristgerecht zum 31. Mai. Da ich aus beruflichen Gründen nach Hamburg umziehe, kann ich Ihr Studio leider nicht mehr nutzen.\n\nBitte bestätigen Sie mir die Kündigung und das Vertragsende schriftlich. Außerdem widerrufe ich meine Einzugsermächtigung zum Vertragsende.\n\nFür die gute Betreuung in den letzten zwei Jahren möchte ich mich herzlich bedanken.\n\nMit freundlichen Grüßen\nTomasz Wiśniewski",
    [
      pick("Was ist der Zweck des Briefes?", ["eine Beschwerde", "eine Kündigung", "eine Bewerbung"], 1),
      gap("Der Vertrag endet am 31. ___.", "Mai"),
      pick("Warum kündigt Tomasz?", ["Das Studio ist zu teuer.", "Er zieht beruflich nach Hamburg.", "Er ist unzufrieden."], 1),
      pick("Was möchte er von FitPlus?", ["eine schriftliche Bestätigung", "Geld zurück", "einen Rückruf"], 0),
      pick("Welche Formel steht am Ende eines formellen Briefs?", ["Liebe Grüße", "Mit freundlichen Grüßen", "Tschüss"], 1),
      pick("Where does the subject line (Betreff) stand?", ["after the date, before the greeting", "at the very end", "above the sender's address"], 0),
    ],
    "I can recognise the structure and formulas of a formal letter.",
  ),
};

// ── listening ────────────────────────────────────────────────────────────────

const LISTENING: Record<string, Authored> = {
  "Radio & TV news": listen(
    "Nachrichten um 12",
    "Three reports: what happened, where, and one number each?",
    "Hier sind die Nachrichten. Berlin: Der Bundestag hat heute ein neues Gesetz zur Förderung von Wärmepumpen beschlossen. Hausbesitzer sollen künftig bis zu 70 Prozent der Kosten erstattet bekommen. Die Opposition kritisiert, dass Mieter kaum profitieren.\n" +
      "Frankfurt: Wegen eines Warnstreiks fallen morgen am Flughafen fast alle Flüge aus. Die Gewerkschaft fordert acht Prozent mehr Lohn. Reisende sollen sich vorab bei ihrer Fluggesellschaft informieren.\n" +
      "Und nun das Wetter: Im Norden bleibt es regnerisch bei Höchstwerten um 14 Grad, im Süden scheint die Sonne bei bis zu 22 Grad.",
    [
      pick("Was hat der Bundestag beschlossen?", ["ein Gesetz zur Förderung von Wärmepumpen", "höhere Mieten", "neue Flughäfen"], 0),
      gap("Hausbesitzer bekommen bis zu ___ Prozent der Kosten erstattet.", "70", "siebzig"),
      pick("Was kritisiert die Opposition?", ["Mieter profitieren kaum.", "Das Gesetz ist zu teuer.", "Es kommt zu spät."], 0),
      pick("Warum fallen morgen Flüge aus?", ["wegen des Wetters", "wegen eines Warnstreiks", "wegen Bauarbeiten"], 1),
      gap("Die Gewerkschaft fordert ___ Prozent mehr Lohn.", "acht", "8"),
      pick("Wo ist es morgen am wärmsten?", ["im Norden", "im Süden"], 1),
    ],
    "I can follow short news reports and catch the key facts and figures.",
  ),
  "Listen to a travel story": listen(
    "Pech und Glück in Portugal",
    "What went wrong, and how did it turn out?",
    "Letzten Sommer bin ich allein nach Portugal geflogen. Schon am Flughafen in Lissabon fing das Chaos an: Mein Koffer war nicht angekommen! Er war in Madrid geblieben, weil ich dort umgestiegen war. Die Frau am Schalter versprach mir, dass er am nächsten Tag ins Hotel gebracht würde. Also kaufte ich mir eine Zahnbürste und ein T-Shirt und ging erst mal essen. In dem kleinen Restaurant saß ein älteres Ehepaar aus Porto am Nebentisch. Als sie hörten, was passiert war, luden sie mich spontan ein, am Wochenende zu ihnen zu kommen. Der Koffer kam übrigens erst nach drei Tagen. Aber ohne dieses Pech hätte ich nie die beiden kennengelernt — wir schreiben uns heute noch.",
    [
      pick("Was war das Problem am Flughafen?", ["Der Flug hatte Verspätung.", "Der Koffer war nicht angekommen.", "Der Pass war weg."], 1),
      gap("Der Koffer war in ___ geblieben.", "Madrid"),
      pick("Was kaufte sie zuerst?", ["eine Zahnbürste und ein T-Shirt", "einen neuen Koffer", "ein Handy"], 0),
      gap("Das Ehepaar kam aus ___.", "Porto"),
      pick("Wann kam der Koffer?", ["am nächsten Tag", "nach drei Tagen", "gar nicht"], 1),
      pick("Wie bewertet sie das Pech am Ende?", ["negativ — der Urlaub war schlecht", "positiv — sonst hätte sie das Paar nicht kennengelernt", "Sie sagt nichts dazu."], 1),
    ],
    "I can follow a narrated travel story and the speaker's evaluation.",
  ),
  "Listen to an academic-style talk": listen(
    "Vortrag: Warum wir vergessen",
    "What is the forgetting curve, and what helps against it?",
    "Meine Damen und Herren, heute geht es um die Frage, warum wir so viel vergessen. Schon im 19. Jahrhundert hat der Psychologe Hermann Ebbinghaus die sogenannte Vergessenskurve beschrieben. Er lernte sinnlose Silben und prüfte dann, wie viel er noch wusste. Das Ergebnis: Schon nach zwanzig Minuten hatte er fast die Hälfte vergessen, nach einem Tag etwa zwei Drittel. Was bedeutet das für uns? Erstens: Wiederholung ist entscheidend — und zwar in wachsenden Abständen, also nach einem Tag, nach drei Tagen, nach einer Woche. Man nennt das verteiltes Lernen. Zweitens: Wir behalten Dinge besser, wenn wir sie mit etwas verbinden, das wir schon kennen. Und drittens: Sich selbst abzufragen ist wirksamer als den Text nur noch einmal zu lesen. Zum Schluss ein Tipp: Schlafen Sie genug. Im Schlaf werden neue Informationen im Gedächtnis gefestigt.",
    [
      gap("Die Vergessenskurve beschrieb der Psychologe Hermann ___.", "Ebbinghaus"),
      pick("Was lernte er für sein Experiment?", ["Gedichte", "sinnlose Silben", "Vokabeln"], 1),
      pick("Wie viel hatte er nach einem Tag etwa vergessen?", ["ein Drittel", "die Hälfte", "zwei Drittel"], 2),
      pick("Was ist „verteiltes Lernen“?", ["Wiederholung in wachsenden Abständen", "Lernen in der Gruppe", "an verschiedenen Orten lernen"], 0),
      pick("Was ist wirksamer als nochmal lesen?", ["sich selbst abfragen", "laut lesen", "Musik hören"], 0),
      pick("Warum ist Schlaf wichtig?", ["Neue Informationen werden gefestigt.", "Man lernt im Schlaf neue Wörter.", "Man vergisst Unwichtiges schneller."], 0),
    ],
    "I can follow a structured talk and note its main points.",
  ),
  "Listen to a discussion about life goals": listen(
    "Was wollt ihr in fünf Jahren?",
    "What does each person want, and why?",
    "– Wo seht ihr euch eigentlich in fünf Jahren?\n– Ich hoffe, dass ich bis dahin meinen Meister gemacht habe. Dann könnte ich mich selbstständig machen. Das war schon immer mein Traum.\n– Für mich ist Karriere gar nicht so wichtig. Ich möchte lieber in Teilzeit arbeiten und mehr Zeit für meine Kinder haben. Wenn ich jetzt nicht Zeit mit ihnen verbringe, bereue ich das später.\n– Das verstehe ich. Ich weiß ehrlich gesagt noch nicht genau, was ich will. Vielleicht ein Jahr ins Ausland, nach Kanada. Aber meine Eltern finden, ich sollte erst die Ausbildung abschließen.\n– Das würde ich auch sagen! Mit einem Abschluss hast du es im Ausland viel leichter.",
    [
      pick("Was möchte die erste Person?", ["den Meister machen und sich selbstständig machen", "ins Ausland gehen", "in Teilzeit arbeiten"], 0),
      pick("Warum möchte die zweite Person in Teilzeit arbeiten?", ["mehr Zeit für die Kinder", "ein Studium", "gesundheitliche Gründe"], 0),
      gap("Die dritte Person möchte vielleicht nach ___.", "Kanada"),
      pick("Was denken die Eltern der dritten Person?", ["Sie soll sofort gehen.", "Sie soll erst die Ausbildung abschließen.", "Sie soll studieren."], 1),
      pick("Wie reagiert die erste Person darauf?", ["Sie stimmt den Eltern zu.", "Sie widerspricht.", "Sie sagt nichts."], 0),
    ],
    "I can follow several people's goals and the reasons behind them.",
  ),
  "Listen to a film or media review": listen(
    "Kinotipp der Woche",
    "What's the film about, what's good, what's weak, and the verdict?",
    "Unser Kinotipp der Woche ist „Die letzte Fahrt“, der neue Film von Regisseurin Anna Petersen. Erzählt wird die Geschichte eines alten Busfahrers, der an seinem letzten Arbeitstag vor der Rente noch einmal seine Strecke durch das Ruhrgebiet fährt. Dabei begegnet er Fahrgästen, die ihn über die Jahre begleitet haben. Hauptdarsteller Werner Kühn spielt großartig — er braucht oft nur einen Blick, um zu zeigen, was er fühlt. Wunderschön sind auch die Bilder. Etwas schwächer ist die Musik, die an manchen Stellen zu dick aufträgt. Und in der zweiten Hälfte hätte der Film zwanzig Minuten kürzer sein können. Trotzdem: ein warmherziger, stiller Film, den man sich im Kino ansehen sollte. Ab Donnerstag in den Kinos.",
    [
      pick("Worum geht es im Film?", ["um einen Busfahrer an seinem letzten Arbeitstag", "um einen Unfall", "um eine Familie im Urlaub"], 0),
      pick("Wo spielt der Film?", ["in Berlin", "im Ruhrgebiet", "in Bayern"], 1),
      gap("Der Hauptdarsteller heißt Werner ___.", "Kühn"),
      pick("Was wird besonders gelobt?", ["die Schauspielleistung und die Bilder", "die Musik", "die Länge"], 0),
      pick("Was wird kritisiert?", ["die Musik und die Länge der zweiten Hälfte", "die Schauspieler", "die Geschichte"], 0),
      pick("Das Fazit ist …", ["negativ", "positiv trotz Schwächen", "neutral"], 1),
    ],
    "I can follow a spoken review and its overall verdict.",
  ),
  "Listen to a debate": listen(
    "Debatte: Sollte der öffentliche Nahverkehr kostenlos sein?",
    "Who argues what, and what's the main counter-argument?",
    "– Ich bin klar dafür. Wenn Busse und Bahnen kostenlos wären, würden viel mehr Menschen das Auto stehen lassen. Das wäre gut fürs Klima und gegen Staus.\n– Das klingt schön, aber wer soll das bezahlen? Der Nahverkehr kostet Milliarden. Am Ende zahlen es alle über Steuern — auch Menschen auf dem Land, wo kaum ein Bus fährt.\n– Aber das Auto wird doch auch mit Steuergeld subventioniert: Straßen, Parkplätze …\n– Das stimmt schon. Trotzdem glaube ich, das größere Problem ist nicht der Preis, sondern das Angebot. Wenn der Bus nur einmal pro Stunde fährt, nimmt ihn niemand, auch wenn er kostenlos ist.\n– Da hast du einen Punkt. Vielleicht müsste man beides machen: günstiger und besser.\n– Damit kann ich leben. Aber zuerst das Angebot!",
    [
      pick("Welches Argument nennt die erste Person?", ["Mehr Menschen würden das Auto stehen lassen.", "Busse sind zu voll.", "Tickets sind zu kompliziert."], 0),
      pick("Was ist das Gegenargument der zweiten Person?", ["Die Finanzierung — alle zahlen über Steuern.", "Busse sind unsicher.", "Niemand will Bus fahren."], 0),
      pick("Was ist laut der zweiten Person das größere Problem?", ["der Preis", "das Angebot", "die Sauberkeit"], 1),
      pick("Worauf einigen sie sich am Ende?", ["kostenlos, sofort", "günstiger und besser — aber zuerst das Angebot", "alles bleibt, wie es ist"], 1),
      gap("Auf dem Land fährt kaum ein ___.", "Bus"),
    ],
    "I can follow arguments and counter-arguments in a spoken debate.",
  ),
  "Listen to an interview about an Ausbildung": listen(
    "Azubi-Interview: Elektroniker",
    "What does he do, what's hard, what's good?",
    "– Leon, du machst eine Ausbildung zum Elektroniker für Energie- und Gebäudetechnik. Wie sieht dein Alltag aus?\n– Ich bin drei Tage in der Woche auf Baustellen, meistens in neuen Wohnhäusern. Da verlege ich Kabel, installiere Steckdosen und Sicherungskästen. Zwei Tage bin ich in der Berufsschule.\n– Was ist schwierig?\n– Am Anfang die Theorie, vor allem Mathe und Elektrotechnik. Und im Winter ist es auf den Baustellen oft eiskalt.\n– Und was gefällt dir?\n– Dass ich am Ende des Tages sehe, was ich geschafft habe. Und die Übernahmechancen sind super — mein Betrieb hat alle Azubis vom letzten Jahr übernommen.\n– Wie viel verdienst du?\n– Im zweiten Lehrjahr 1.050 Euro brutto.",
    [
      pick("Wo arbeitet Leon meistens?", ["in Büros", "auf Baustellen in neuen Wohnhäusern", "in Fabriken"], 1),
      pick("Wie viele Tage ist er in der Berufsschule?", ["einen", "zwei", "drei"], 1),
      pick("Was war am Anfang schwierig?", ["die Theorie, vor allem Mathe und Elektrotechnik", "die Kollegen", "der Arbeitsweg"], 0),
      pick("Was gefällt ihm?", ["Er sieht am Ende des Tages, was er geschafft hat.", "Er arbeitet allein.", "Er hat viel Urlaub."], 0),
      gap("Im zweiten Lehrjahr verdient er ___ Euro brutto.", "1.050", "1050"),
      pick("Wie sind die Übernahmechancen?", ["schlecht", "sehr gut", "unklar"], 1),
    ],
    "I can follow an interview about a training programme.",
  ),
  "Listen to a doctor discussing the healthcare system": listen(
    "Eine Hausärztin erzählt",
    "What problems does she describe, and what does she recommend?",
    "Ich bin seit zwanzig Jahren Hausärztin auf dem Land. In den letzten Jahren hat sich viel verändert. Das größte Problem ist der Ärztemangel: Viele Kollegen gehen in Rente, und junge Ärzte wollen lieber in der Stadt arbeiten. Deshalb habe ich oft über sechzig Patienten am Tag. Gleichzeitig kommen viele Menschen in die Notaufnahme, obwohl sie gar kein Notfall sind — zum Beispiel mit einer Erkältung. Dafür gibt es eigentlich den Bereitschaftsdienst unter 116 117, aber den kennen viele nicht. Was ich mir wünsche? Mehr Digitalisierung, damit weniger Zeit für Papierkram draufgeht. Seit es das E-Rezept gibt, ist es schon etwas besser geworden. Und ich rate allen: Gehen Sie zur Vorsorge! Viele Krankheiten kann man früh viel besser behandeln.",
    [
      pick("Wo arbeitet die Ärztin?", ["in der Stadt", "auf dem Land", "im Krankenhaus"], 1),
      pick("Was ist das größte Problem?", ["der Ärztemangel", "zu wenig Geld", "zu wenige Patienten"], 0),
      gap("Sie hat oft über ___ Patienten am Tag.", "sechzig", "60"),
      pick("Was kritisiert sie an der Notaufnahme?", ["Viele kommen, obwohl sie kein Notfall sind.", "Sie ist zu klein.", "Sie ist nachts geschlossen."], 0),
      pick("Was hat die Situation schon etwas verbessert?", ["das E-Rezept", "neue Krankenhäuser", "höhere Gehälter"], 0),
      pick("Was rät sie allen?", ["zur Vorsorge zu gehen", "in die Stadt zu ziehen", "privat versichert zu sein"], 0),
    ],
    "I can follow a professional's account of problems and recommendations.",
  ),
  "Listen to an environmental discussion": listen(
    "Klimaschutz im Alltag",
    "What does each person do, and where do they disagree?",
    "– Ich versuche wirklich, klimafreundlich zu leben: Ich fahre Rad, esse kaum Fleisch und kaufe Kleidung second hand.\n– Das ist toll, aber ehrlich gesagt glaube ich, dass der Einzelne wenig ändern kann. Die großen Emissionen kommen von der Industrie und vom Energiesektor.\n– Klar, die Politik muss handeln. Aber wenn viele Einzelne etwas ändern, verändert sich auch die Nachfrage. Und die Unternehmen reagieren darauf.\n– Mag sein. Ich fliege trotzdem einmal im Jahr zu meiner Familie nach Brasilien — darauf verzichte ich nicht.\n– Das verlangt auch niemand. Es geht ja nicht um Perfektion. Man könnte zum Beispiel den Flug kompensieren oder seltener, dafür länger fliegen.\n– Hm, länger bleiben — das wäre eigentlich keine schlechte Idee.",
    [
      pick("Was macht die erste Person NICHT?", ["Rad fahren", "viel Fleisch essen", "second hand kaufen"], 1),
      pick("Was glaubt die zweite Person?", ["Der Einzelne kann wenig ändern.", "Jeder muss aufs Fliegen verzichten.", "Die Industrie tut genug."], 0),
      pick("Wie argumentiert die erste Person dagegen?", ["Viele Einzelne verändern die Nachfrage.", "Die Industrie ist unwichtig.", "Politik ist egal."], 0),
      gap("Die zweite Person fliegt einmal im Jahr nach ___.", "Brasilien"),
      pick("Welche Idee findet die zweite Person am Ende gut?", ["seltener, aber länger zu fliegen", "gar nicht mehr zu fliegen", "mit dem Schiff zu fahren"], 0),
    ],
    "I can follow a discussion with different views on the same issue.",
  ),
  "Listen to someone giving advice": listen(
    "Tipps für das Vorstellungsgespräch",
    "Which tips does the coach give, and in what order?",
    "Viele fragen mich: Wie bereite ich mich am besten auf ein Vorstellungsgespräch vor? Erstens: Informieren Sie sich gründlich über die Firma. Was stellt sie her, wie viele Mitarbeiter hat sie? Wenn Sie das nicht wissen, wirkt es, als wären Sie nicht interessiert. Zweitens: Üben Sie die typischen Fragen laut, zum Beispiel „Erzählen Sie etwas über sich“ oder „Warum möchten Sie diesen Beruf lernen?“. Am besten mit einem Freund. Drittens: Seien Sie pünktlich — aber nicht zu früh. Zehn Minuten vorher ist ideal. An Ihrer Stelle würde ich den Weg am Tag davor einmal abfahren. Und zuletzt: Bereiten Sie selbst zwei, drei Fragen vor, etwa zu den Übernahmechancen. Das zeigt echtes Interesse. Wer keine Fragen hat, wirkt oft unvorbereitet.",
    [
      pick("Was ist der erste Tipp?", ["sich über die Firma informieren", "pünktlich sein", "Fragen vorbereiten"], 0),
      pick("Wie soll man die typischen Fragen üben?", ["schriftlich", "laut, am besten mit einem Freund", "gar nicht"], 1),
      gap("Man sollte ___ Minuten vorher da sein.", "zehn", "10"),
      pick("Was würde der Coach am Tag davor machen?", ["den Weg einmal abfahren", "früh schlafen gehen", "die Firma anrufen"], 0),
      pick("Welche Frage könnte man selbst stellen?", ["zu den Übernahmechancen", "zum Gehalt des Chefs", "zu den Urlaubsplänen der Kollegen"], 0),
      pick("Wie wirkt jemand ohne eigene Fragen?", ["selbstbewusst", "unvorbereitet", "höflich"], 1),
    ],
    "I can follow a sequence of advice and the reasons given.",
  ),
  "Listen to someone describing a hypothetical situation": listen(
    "Was wäre, wenn …?",
    "What would she do, and why?",
    "Wenn ich eine Million Euro gewinnen würde? Hm, zuerst würde ich meinen Eltern ein Haus kaufen, denn sie haben ihr ganzes Leben lang in einer kleinen Mietwohnung gewohnt. Dann würde ich meinen Job nicht kündigen — ich mag meine Arbeit als Erzieherin wirklich. Aber ich würde vielleicht nur noch drei Tage pro Woche arbeiten. Mit dem Rest des Geldes würde ich eine Weltreise machen, ungefähr ein halbes Jahr. Am liebsten würde ich nach Neuseeland und Japan fahren. Und einen Teil würde ich spenden, zum Beispiel an ein Kinderhospiz. Ehrlich gesagt: Wenn ich darüber nachdenke, wäre mein Leben gar nicht so anders. Ich hätte nur weniger Sorgen.",
    [
      pick("Was würde sie zuerst machen?", ["eine Weltreise", "ihren Eltern ein Haus kaufen", "kündigen"], 1),
      pick("Würde sie ihren Job kündigen?", ["ja", "nein, aber weniger arbeiten"], 1),
      gap("Sie ist von Beruf ___.", "Erzieherin"),
      pick("Wie lange würde die Weltreise dauern?", ["zwei Wochen", "ungefähr ein halbes Jahr", "ein Jahr"], 1),
      gap("Sie möchte am liebsten nach Neuseeland und ___.", "Japan"),
      pick("Was sagt sie am Ende?", ["Ihr Leben wäre ganz anders.", "Ihr Leben wäre gar nicht so anders, nur mit weniger Sorgen.", "Sie möchte kein Geld gewinnen."], 1),
    ],
    "I can follow someone describing an imagined situation in the Konjunktiv II.",
  ),
  "Listen to a story told in the past tense": listen(
    "Die Geschichte vom Stromausfall",
    "What happened, in what order?",
    "Es war an einem Winterabend vor drei Jahren. Wir hatten gerade mit dem Abendessen angefangen, als plötzlich das Licht ausging. Zuerst dachten wir, eine Sicherung sei herausgesprungen. Aber als mein Mann in den Keller ging, merkte er, dass im ganzen Viertel kein Strom war. Die Heizung funktionierte nicht, das Handy hatte nur noch zehn Prozent Akku. Also zündeten wir Kerzen an und holten alle Decken aus dem Schrank. Unsere Kinder fanden das großartig! Wir spielten Karten, und mein Mann erzählte Geschichten von seiner Kindheit in Ghana, die die Kinder noch nie gehört hatten. Nach vier Stunden kam der Strom zurück. Die Kinder waren fast enttäuscht. Noch heute sagen sie: Das war der schönste Abend im ganzen Winter.",
    [
      pick("Wann war der Stromausfall?", ["letzten Sommer", "an einem Winterabend vor drei Jahren", "gestern"], 1),
      pick("Was dachten sie zuerst?", ["Eine Sicherung sei herausgesprungen.", "Das ganze Land habe keinen Strom.", "Die Kinder hätten gespielt."], 0),
      gap("Das Handy hatte nur noch ___ Prozent Akku.", "zehn", "10"),
      pick("Woher kommt der Mann?", ["aus Ghana", "aus Kenia", "aus Nigeria"], 0),
      pick("Wie lange dauerte der Stromausfall?", ["eine Stunde", "vier Stunden", "die ganze Nacht"], 1),
      pick("Wie fanden die Kinder den Abend?", ["langweilig", "gruselig", "großartig — der schönste Abend im Winter"], 2),
    ],
    "I can follow a story told in the Präteritum and Plusquamperfekt.",
  ),
  "Listen to an argument for and against something": listen(
    "Pro und Contra: Uniformen in der Schule",
    "Which arguments are for, which against, and what's the conclusion?",
    "Sollten Schülerinnen und Schüler in Deutschland Schuluniformen tragen? Dafür spricht, dass Kleidung dann kein Statussymbol mehr ist. Kinder aus ärmeren Familien würden nicht wegen billiger Kleidung ausgelacht. Außerdem stärkt eine Uniform das Gemeinschaftsgefühl, und morgens spart man Zeit. Dagegen spricht vor allem, dass Kleidung ein Ausdruck der Persönlichkeit ist — gerade für Jugendliche. Zudem kostet eine Uniform Geld, was für Familien mit mehreren Kindern eine Belastung sein kann. Kritiker sagen auch, dass Unterschiede trotzdem sichtbar bleiben, zum Beispiel an Schuhen, Handys oder Taschen. Mein Fazit: Eine einheitliche Schulkleidung, etwa ein T-Shirt mit Schullogo, das die Schule bezahlt, wäre ein guter Kompromiss.",
    [
      pick("Welches ist ein Argument DAFÜR?", ["Kleidung ist kein Statussymbol mehr.", "Kleidung zeigt die Persönlichkeit.", "Uniformen kosten Geld."], 0),
      pick("Welches ist ein Argument DAGEGEN?", ["Man spart morgens Zeit.", "Kleidung ist Ausdruck der Persönlichkeit.", "Das Gemeinschaftsgefühl wird stärker."], 1),
      pick("Woran bleiben Unterschiede laut Kritikern sichtbar?", ["an Schuhen, Handys oder Taschen", "an den Noten", "an der Frisur"], 0),
      pick("Was ist das Fazit?", ["Uniformen sofort einführen", "ein T-Shirt mit Schullogo, das die Schule bezahlt", "alles bleibt wie es ist"], 1),
      gap("Für Familien mit mehreren Kindern kann eine Uniform eine ___ sein.", "Belastung"),
    ],
    "I can separate pro and contra arguments and identify the conclusion.",
  ),
  "Listen to a news report": listen(
    "Bericht: Hochwasser in Niederbayern",
    "What happened, how many were affected, and what happens next?",
    "Nach tagelangem Starkregen sind in Niederbayern mehrere Flüsse über die Ufer getreten. Besonders betroffen ist die Stadt Deggendorf, wo die Donau einen Pegelstand von über sieben Metern erreichte. Rund 2.000 Menschen mussten ihre Häuser verlassen und wurden in Turnhallen und Schulen untergebracht. Verletzt wurde nach bisherigen Informationen niemand. Hunderte Helfer von Feuerwehr, Technischem Hilfswerk und Bundeswehr sind im Einsatz und füllen Sandsäcke. Die Bahnstrecke zwischen Passau und Regensburg ist gesperrt. Der Wetterdienst rechnet ab morgen mit einer Entspannung. Die Landesregierung hat angekündigt, betroffenen Familien schnell und unbürokratisch mit einer Soforthilfe von bis zu 5.000 Euro zu helfen.",
    [
      gap("Besonders betroffen ist die Stadt ___.", "Deggendorf"),
      pick("Wie hoch war der Pegel der Donau?", ["über sieben Meter", "über drei Meter", "über zehn Meter"], 0),
      gap("Rund ___ Menschen mussten ihre Häuser verlassen.", "2.000", "2000", "zweitausend"),
      pick("Gab es Verletzte?", ["ja, viele", "nach bisherigen Informationen nicht", "Das wird nicht gesagt."], 1),
      pick("Welche Bahnstrecke ist gesperrt?", ["München–Nürnberg", "Passau–Regensburg", "Deggendorf–München"], 1),
      pick("Wie viel Soforthilfe gibt es?", ["bis zu 500 €", "bis zu 5.000 €", "bis zu 50.000 €"], 1),
    ],
    "I can follow a longer news report with facts, figures and next steps.",
  ),
  "Listen to a discussion about integration": listen(
    "Was hilft beim Ankommen?",
    "What helped each person, and what was difficult?",
    "– Was hat euch am meisten geholfen, als ihr nach Deutschland gekommen seid?\n– Bei mir war es der Sportverein. Ich spiele Handball, und nach dem Training gehen wir immer zusammen etwas trinken. Da habe ich mehr Deutsch gelernt als im Kurs.\n– Bei mir waren es die Nachbarn. Eine ältere Dame hat mir am Anfang alles erklärt: Mülltrennung, Hausordnung, wo der Arzt ist. Ohne sie wäre ich verloren gewesen.\n– Und was war schwierig?\n– Die Bürokratie! Ich musste für jeden Antrag drei andere Dokumente mitbringen, und die Termine bei der Ausländerbehörde waren monatelang ausgebucht.\n– Für mich war es eher, dass man mich oft auf Englisch angesprochen hat, obwohl ich Deutsch üben wollte.",
    [
      pick("Was hat der ersten Person am meisten geholfen?", ["der Sportverein", "der Deutschkurs", "die Arbeit"], 0),
      gap("Die erste Person spielt ___.", "Handball"),
      pick("Wer hat der zweiten Person geholfen?", ["eine ältere Nachbarin", "der Chef", "ein Lehrer"], 0),
      pick("Was war bei der Ausländerbehörde schwierig?", ["Die Termine waren monatelang ausgebucht.", "Niemand sprach Englisch.", "Sie war zu weit weg."], 0),
      pick("Was hat eine Person gestört?", ["Man sprach sie oft auf Englisch an, obwohl sie Deutsch üben wollte.", "Niemand hat mit ihr gesprochen.", "Das Essen."], 0),
    ],
    "I can follow people sharing experiences and compare them.",
  ),
  "Listen to someone explaining a contract": listen(
    "Der Ausbildungsvertrag",
    "What are the key terms: duration, probation, pay, holidays?",
    "So, Herr Nguyen, bevor Sie unterschreiben, gehe ich den Ausbildungsvertrag noch einmal mit Ihnen durch. Die Ausbildung beginnt am 1. August und dauert drei Jahre. Die Probezeit beträgt vier Monate — in dieser Zeit können beide Seiten ohne Angabe von Gründen kündigen. Ihre wöchentliche Arbeitszeit sind 39 Stunden, die Berufsschulzeit zählt dazu. Die Vergütung beträgt im ersten Jahr 1.020 Euro, im zweiten 1.090 und im dritten 1.180 Euro brutto. Sie haben 28 Urlaubstage im Jahr, die Sie aber möglichst in den Schulferien nehmen sollten. Arbeitskleidung und Werkzeug bekommen Sie von uns. Haben Sie noch Fragen? Nein? Dann brauche ich hier Ihre Unterschrift — und weil Sie noch nicht achtzehn sind, auch die Unterschrift Ihrer Eltern.",
    [
      pick("Wie lange dauert die Ausbildung?", ["zwei Jahre", "drei Jahre", "dreieinhalb Jahre"], 1),
      gap("Die Probezeit beträgt ___ Monate.", "vier", "4"),
      pick("Zählt die Berufsschule zur Arbeitszeit?", ["ja", "nein"], 0),
      gap("Im ersten Jahr verdient er ___ Euro brutto.", "1.020", "1020"),
      gap("Er hat ___ Urlaubstage im Jahr.", "28", "achtundzwanzig"),
      pick("Warum müssen auch die Eltern unterschreiben?", ["weil er noch nicht achtzehn ist", "weil sie bezahlen", "weil es immer so ist"], 0),
    ],
    "I can follow someone explaining the terms of a contract.",
  ),
  "Listen to a conversation about taxes and salary": listen(
    "Die erste Gehaltsabrechnung",
    "Why is netto so much lower, and what can she do?",
    "– Schau mal, meine erste Gehaltsabrechnung! Brutto 2.600 Euro, aber netto nur 1.740. Wo ist der Rest?\n– Das sind die Steuern und Sozialabgaben. Die Lohnsteuer, dann Renten-, Kranken-, Pflege- und Arbeitslosenversicherung.\n– Und warum zahle ich Kirchensteuer? Ich gehe nie in die Kirche!\n– Bist du bei der Anmeldung als Mitglied eingetragen worden? Dann musst du das beim Finanzamt korrigieren lassen — oder austreten, falls du Mitglied bist.\n– Oh, das prüfe ich. Kann ich sonst noch etwas tun?\n– Mach auf jeden Fall eine Steuererklärung. Du bist erst im Mai eingestiegen, deshalb wurde zu viel Lohnsteuer abgezogen. Und die Fahrtkosten zur Arbeit kannst du auch absetzen. Viele bekommen mehrere Hundert Euro zurück.",
    [
      gap("Das Bruttogehalt ist ___ Euro.", "2.600", "2600"),
      gap("Netto bekommt sie ___ Euro.", "1.740", "1740"),
      pick("Warum zahlt sie Kirchensteuer?", ["Sie ist vielleicht als Kirchenmitglied eingetragen.", "Alle zahlen Kirchensteuer.", "Wegen ihres Arbeitgebers."], 0),
      pick("Warum wurde zu viel Lohnsteuer abgezogen?", ["weil sie erst im Mai eingestiegen ist", "weil sie in Steuerklasse V ist", "weil sie Kinder hat"], 0),
      pick("Was kann sie noch absetzen?", ["die Fahrtkosten zur Arbeit", "ihre Miete", "ihren Urlaub"], 0),
      pick("Was rät der Freund?", ["eine Steuererklärung zu machen", "den Job zu wechseln", "nichts zu tun"], 0),
    ],
    "I can follow a conversation about a payslip and tax refund.",
  ),
  "Listen to a structured opinion piece": listen(
    "Kommentar: Mehr Pausen für Schüler",
    "What's the position, the three arguments and the demand?",
    "Ich möchte heute ein Thema ansprechen, das oft vergessen wird: Pausen in der Schule. Meine These ist: Schülerinnen und Schüler brauchen mehr und längere Pausen. Dafür gibt es drei Gründe. Erstens zeigen Studien, dass die Konzentration nach etwa 45 Minuten deutlich nachlässt. Eine kurze Bewegungspause steigert die Leistung danach messbar. Zweitens sind Pausen soziale Zeit: Hier lösen Kinder Konflikte, schließen Freundschaften und lernen, Regeln auszuhandeln. Drittens bewegen sich Kinder heute ohnehin zu wenig. Natürlich kann man einwenden, dass dann weniger Zeit für den Unterricht bleibt. Aber was nützen mehr Stunden, wenn niemand mehr zuhört? Deshalb fordere ich: mindestens eine 30-minütige Bewegungspause pro Schultag — und zwar draußen.",
    [
      pick("Was ist die These?", ["Schüler brauchen mehr und längere Pausen.", "Die Schule sollte länger dauern.", "Pausen sollten abgeschafft werden."], 0),
      gap("Nach etwa ___ Minuten lässt die Konzentration nach.", "45", "fünfundvierzig"),
      pick("Was ist das zweite Argument?", ["Pausen sind soziale Zeit.", "Pausen sparen Geld.", "Lehrer brauchen Pausen."], 0),
      pick("Welchen Einwand nennt der Sprecher?", ["Es bleibt weniger Zeit für den Unterricht.", "Kinder wollen keine Pausen.", "Pausen sind gefährlich."], 0),
      gap("Er fordert eine ___-minütige Bewegungspause pro Tag.", "30", "dreißig"),
      pick("Wo soll die Pause stattfinden?", ["im Klassenzimmer", "draußen", "in der Turnhalle"], 1),
    ],
    "I can follow a structured spoken argument: thesis, reasons, objection, demand.",
  ),
  "Listen to a formal phone call with an office": listen(
    "Anruf beim Bürgeramt",
    "What does the caller need, what must he bring, and when?",
    "– Bürgeramt Mitte, Sie sprechen mit Frau Albers.\n– Guten Tag, mein Name ist Rahimi. Ich bin vor zwei Wochen umgezogen und müsste mich ummelden. Brauche ich dafür einen Termin?\n– Ja, ohne Termin geht es leider nicht. Der nächste freie Termin wäre am Dienstag, den 18., um 9:40 Uhr.\n– Das passt. Was muss ich mitbringen?\n– Ihren Pass oder Personalausweis, die Wohnungsgeberbestätigung von Ihrem Vermieter und, falls vorhanden, Ihren Aufenthaltstitel.\n– Kostet die Ummeldung etwas?\n– Nein, die ist kostenlos. Aber beachten Sie bitte: Eigentlich muss man sich innerhalb von zwei Wochen ummelden. Bringen Sie also den Mietvertrag mit, damit wir das Einzugsdatum sehen.\n– Gut, vielen Dank!\n– Gern. Auf Wiederhören.",
    [
      pick("Was möchte Herr Rahimi?", ["sich ummelden", "einen Pass beantragen", "ein Auto anmelden"], 0),
      pick("Braucht er einen Termin?", ["ja", "nein"], 0),
      gap("Der Termin ist um ___ Uhr.", "9:40", "9.40"),
      gap("Vom Vermieter braucht er die ___.", "Wohnungsgeberbestätigung"),
      pick("Was kostet die Ummeldung?", ["10 Euro", "nichts", "Das wird nicht gesagt."], 1),
      pick("Warum soll er den Mietvertrag mitbringen?", ["damit man das Einzugsdatum sieht", "als Adressnachweis für die Bank", "für die Steuer"], 0),
    ],
    "I can follow a formal phone call and note what I need to do.",
  ),
  "Listen to a panel discussion": listen(
    "Podium: Fachkräfte aus dem Ausland",
    "What does each panellist see as the main challenge?",
    "– Frau Dr. Koch, Sie vertreten die Arbeitgeber. Wo liegt das Hauptproblem?\n– Ganz klar bei der Anerkennung der Abschlüsse. Eine Krankenpflegerin aus den Philippinen wartet oft über ein Jahr, bis sie in ihrem Beruf arbeiten darf. Das ist viel zu lang.\n– Herr Yıldız, Sie beraten Zugewanderte. Sehen Sie das auch so?\n– Die Anerkennung ist ein Problem, ja. Aber genauso wichtig ist die Sprache. Viele Programme bieten Kurse nur bis B1 an, im Beruf braucht man aber oft B2 — und die Fachsprache.\n– Frau Berger, Sie sind Personalchefin in einem Klinikum. Was ist Ihre Erfahrung?\n– Bei uns scheitert es selten an der Fachlichkeit, sondern am Ankommen: Wohnungen sind knapp, und ohne Wohnung bleibt niemand. Wir haben deshalb eigene Apartments für neue Kolleginnen angemietet.\n– Drei Perspektiven, drei Probleme. Vielen Dank!",
    [
      pick("Was ist für Frau Dr. Koch das Hauptproblem?", ["die Anerkennung der Abschlüsse", "die Sprache", "die Wohnungen"], 0),
      pick("Wie lange wartet eine Pflegerin oft auf die Anerkennung?", ["einen Monat", "über ein Jahr", "fünf Jahre"], 1),
      pick("Was betont Herr Yıldız?", ["Die Sprache ist genauso wichtig — man braucht oft B2 und Fachsprache.", "Die Anerkennung ist kein Problem.", "Die Gehälter sind zu niedrig."], 0),
      pick("Woran scheitert es laut Frau Berger oft?", ["an der Fachlichkeit", "am Ankommen, besonders an Wohnungen", "an der Bürokratie"], 1),
      gap("Das Klinikum hat eigene ___ für neue Kolleginnen angemietet.", "Apartments"),
    ],
    "I can follow several speakers in a panel and tell their positions apart.",
  ),
};

// ── speaking ─────────────────────────────────────────────────────────────────

const SPEAKING: Record<string, Authored> = {
  "Job interview practice": speak(
    "Beantworte drei typische Fragen aus einem Vorstellungsgespräch, je 30–60 Sekunden: 1) Erzählen Sie etwas über sich. 2) Warum möchten Sie diesen Beruf lernen? 3) Was sind Ihre Stärken und Schwächen?",
    "Mein Name ist … und ich komme aus … · Ich habe … gelernt / gearbeitet. · Mich interessiert dieser Beruf, weil … · Eine meiner Stärken ist …, zum Beispiel … · Eine Schwäche ist …, aber ich arbeite daran, indem …",
    "Mein Name ist Arjun Mehta, ich bin 24 und komme aus Pune. Dort habe ich zwei Jahre in einer Autowerkstatt gearbeitet. Seit einem Jahr lebe ich in Deutschland und lerne intensiv Deutsch. Ich möchte Kfz-Mechatroniker werden, weil ich schon als Kind gern an Motoren geschraubt habe und die Technik sich so schnell entwickelt — besonders bei Elektroautos. Eine meiner Stärken ist Genauigkeit: In der Werkstatt habe ich nie einen Arbeitsschritt übersprungen. Eine Schwäche ist, dass ich manchmal zu lange an einem Problem arbeite, bevor ich um Hilfe frage. Daran arbeite ich, indem ich mir ein Zeitlimit setze.",
    "I can answer the standard interview questions with examples.",
  ),
  "Give a short presentation": speak(
    "Halte eine 2-Minuten-Präsentation zum Thema „Mein Heimatland“ (oder ein anderes Thema): Einleitung, drei Punkte, Schluss. Benutze Strukturwörter.",
    "Ich möchte heute über … sprechen. · Mein Vortrag hat drei Teile: … · Zuerst … · Zweitens … · Ein weiterer Punkt ist … · Zum Schluss … · Zusammenfassend kann man sagen … · Haben Sie Fragen?",
    "Ich möchte heute über mein Heimatland Ghana sprechen. Mein Vortrag hat drei Teile: Geografie, Kultur und Wirtschaft. Zuerst zur Geografie: Ghana liegt in Westafrika am Atlantik und hat etwa 33 Millionen Einwohner. Zweitens die Kultur: Es gibt über siebzig Sprachen, aber die Amtssprache ist Englisch. Sehr wichtig sind Familie und Musik. Ein weiterer Punkt ist die Wirtschaft: Ghana exportiert vor allem Gold und Kakao — vielleicht ist in Ihrer Schokolade Kakao aus Ghana! Zusammenfassend kann man sagen: Ghana ist ein vielfältiges, gastfreundliches Land. Vielen Dank. Haben Sie Fragen?",
    "I can give a short structured presentation with an introduction, main points and conclusion.",
  ),
  "Discuss & defend an opinion": speak(
    "Thema: „Jeder sollte ein soziales Jahr machen.“ Sag deine Meinung mit zwei Argumenten. Dann reagiere auf den Einwand „Das kostet junge Menschen ein Jahr ihres Lebens.“",
    "Ich bin der Meinung, dass … · Erstens … Zweitens … · Ich verstehe den Einwand, aber … · Das sehe ich anders, denn … · Man darf nicht vergessen, dass …",
    "Ich bin der Meinung, dass ein soziales Jahr für alle sinnvoll wäre. Erstens lernen junge Menschen Bereiche kennen, die sie sonst nie sehen würden, zum Beispiel die Pflege oder die Arbeit mit Behinderten. Zweitens stärkt es den Zusammenhalt in der Gesellschaft. Ich verstehe den Einwand, dass es ein Jahr kostet. Aber man darf nicht vergessen, dass viele danach viel besser wissen, was sie beruflich wollen — und so vielleicht kein falsches Studium anfangen. Deshalb ist es für mich kein verlorenes, sondern ein gewonnenes Jahr.",
    "I can state an opinion, support it and respond to an objection.",
  ),
  "Phone calls with offices": speak(
    "Ruf bei der Ausländerbehörde an: Deine Aufenthaltserlaubnis läuft in sechs Wochen ab. Frag nach einem Termin zur Verlängerung, welche Unterlagen du brauchst und was passiert, wenn der Termin erst nach Ablauf ist.",
    "Guten Tag, mein Name ist …, mein Aktenzeichen ist … · Ich rufe an, weil … · Ich hätte gern einen Termin für … · Welche Unterlagen muss ich mitbringen? · Was passiert, wenn …? · Könnten Sie das bitte wiederholen? · Darf ich das kurz zusammenfassen: …",
    "Guten Tag, mein Name ist Fatima Idrissi. Ich rufe an, weil meine Aufenthaltserlaubnis am 30. Juni abläuft und ich sie verlängern möchte. Ich hätte gern einen Termin. … Erst am 15. Juli? Was passiert, wenn der Termin nach dem Ablauf ist? … Ah, ich bekomme eine Fiktionsbescheinigung, wenn ich den Antrag rechtzeitig online stelle. Und welche Unterlagen brauche ich? … Darf ich kurz zusammenfassen: Pass, biometrisches Foto, Arbeitsvertrag, die letzten drei Gehaltsabrechnungen und Mietvertrag. Vielen Dank!",
    "I can handle a formal phone call with an office, including clarifying and summarising.",
  ),
  "Tell a travel story": speak(
    "Erzähl von einer Reise, bei der etwas Unerwartetes passiert ist (1–2 Minuten). Benutze Präteritum/Perfekt und mindestens einmal Plusquamperfekt oder nachdem.",
    "Vor … Jahren bin ich nach … gefahren. · Eigentlich hatten wir geplant, … · Plötzlich … · Nachdem wir … hatten, … · Zum Glück … · Am Ende … · Im Nachhinein …",
    "Vor zwei Jahren bin ich mit meinem Bruder in die Alpen gefahren. Eigentlich hatten wir geplant, auf einen Berg zu wandern und oben in einer Hütte zu übernachten. Nachdem wir drei Stunden gelaufen waren, zog plötzlich ein Gewitter auf. Wir hatten die Wettervorhersage nicht genau gelesen! Zum Glück fanden wir eine kleine Kapelle, in der wir warten konnten. Dort trafen wir eine Familie aus Holland, die uns Tee aus ihrer Thermoskanne gab. Am Ende kamen wir erst im Dunkeln bei der Hütte an. Im Nachhinein war es das beste Abenteuer der ganzen Reise.",
    "I can narrate a past experience with clear sequence using several past tenses.",
  ),
  "Discuss an academic or work-related article": speak(
    "Fasse einen Artikel, den du kürzlich gelesen hast (oder „Vier-Tage-Woche im Test“ aus dem Leseteil), in 4–5 Sätzen zusammen und sag dann deine Meinung dazu.",
    "In dem Artikel geht es um … · Der Autor / Die Studie zeigt, dass … · Ein wichtiges Ergebnis ist … · Allerdings … · Ich finde den Artikel interessant, weil … · Mich überzeugt nicht, dass …",
    "In dem Artikel geht es um einen Test mit der Vier-Tage-Woche in 45 deutschen Firmen. Die Mitarbeitenden arbeiteten 32 Stunden bei gleichem Gehalt. Ein wichtiges Ergebnis ist, dass sie weniger gestresst und seltener krank waren, während die Produktivität gleich blieb. Allerdings hatten kleine Betriebe in der Pflege und im Handwerk Probleme. Ich finde das Ergebnis interessant, aber mich überzeugt nicht ganz, dass man es verallgemeinern kann — die Firmen haben sich ja freiwillig gemeldet.",
    "I can summarise an article and comment on it critically.",
  ),
  "Talk about your life goals and plans": speak(
    "Sprich über deine Ziele: Was möchtest du in 1, 5 und 10 Jahren erreicht haben? Was musst du dafür tun? Benutze Futur I/II und Konjunktiv II.",
    "In einem Jahr werde ich … · Bis … werde ich … abgeschlossen haben. · Dafür muss ich … · Mein Traum wäre es, … · Wenn alles klappt, … · Falls nicht, …",
    "In einem Jahr werde ich hoffentlich meine B2-Prüfung bestanden und einen Ausbildungsplatz als Pflegefachmann gefunden haben. Dafür lerne ich jeden Tag eine Stunde und schreibe gerade Bewerbungen. In fünf Jahren werde ich die Ausbildung abgeschlossen haben und vielleicht eine Weiterbildung zur Intensivpflege machen. Mein Traum wäre es, in zehn Jahren eine Station zu leiten. Wenn alles klappt, möchte ich dann auch meine Eltern nach Deutschland holen. Falls nicht, würde ich sie wenigstens jedes Jahr besuchen.",
    "I can describe my short- and long-term goals and how I'll reach them.",
  ),
  "Discuss a film, book or piece of media": speak(
    "Stell einen Film, eine Serie oder ein Buch vor: Worum geht es? Was hat dir gefallen, was nicht? Würdest du es empfehlen, und wem?",
    "Ich möchte … vorstellen. · Es geht um … · Die Hauptfigur ist … · Besonders gut gefallen hat mir … · Weniger überzeugend fand ich … · Ich würde es allen empfehlen, die …",
    "Ich möchte die Serie „Dark“ vorstellen. Es geht um vier Familien in einer kleinen deutschen Stadt, in der Kinder verschwinden — und es stellt sich heraus, dass es mit Zeitreisen zu tun hat. Besonders gut gefallen hat mir die Atmosphäre: Alles ist düster und spannend. Weniger überzeugend fand ich, dass es so viele Figuren gibt, dass man manchmal den Überblick verliert. Ich würde die Serie allen empfehlen, die komplizierte Geschichten mögen — und sie ist auch gut zum Deutschlernen, weil die Schauspieler klar sprechen.",
    "I can present and evaluate a film, series or book.",
  ),
  "Debate a controversial topic": speak(
    "Thema: „Sollte das Wahlalter auf 16 gesenkt werden?“ Vertrete eine Seite mit drei Argumenten. Nenne ein Gegenargument und widerlege es.",
    "Ich bin klar dafür / dagegen, weil … · Das wichtigste Argument ist … · Hinzu kommt … · Gegner sagen oft, dass … Das stimmt aber nicht, denn … · Deshalb …",
    "Ich bin klar dafür, das Wahlalter auf 16 zu senken. Das wichtigste Argument ist, dass Entscheidungen über Klima oder Rente vor allem die Zukunft junger Menschen betreffen. Hinzu kommt, dass Sechzehnjährige schon arbeiten und Steuern zahlen können. Drittens würde es das Interesse an Politik früh fördern. Gegner sagen oft, dass Jugendliche zu unreif seien. Das stimmt aber nicht: Studien zeigen, dass sie sich genauso gut informieren wie ältere Erstwähler. Deshalb sollten wir ihnen die Stimme geben.",
    "I can argue one side of a debate and refute a counter-argument.",
  ),
  "Explain a workplace conflict and its resolution": speak(
    "Beschreib einen Konflikt bei der Arbeit (real oder erfunden): Was ist passiert, wie hast du reagiert, wie wurde er gelöst, was hast du gelernt?",
    "Es gab einmal ein Problem mit … · Es ging darum, dass … · Zuerst habe ich … · Dann haben wir ein Gespräch geführt. · Wir haben uns darauf geeinigt, dass … · Seitdem … · Ich habe gelernt, dass …",
    "In meinem letzten Job gab es ein Problem mit einem Kollegen. Es ging darum, dass er seine Aufgaben oft nicht fertig machte und ich sie am Ende übernehmen musste. Zuerst habe ich nichts gesagt, aber ich wurde immer wütender. Dann habe ich ihn um ein Gespräch gebeten und ruhig erklärt, wie es mir damit geht. Es stellte sich heraus, dass er zu Hause große Probleme hatte. Wir haben uns darauf geeinigt, dass er mir Bescheid sagt, wenn er etwas nicht schafft, und wir haben es mit der Chefin besprochen. Ich habe gelernt, dass man Konflikte früh ansprechen sollte.",
    "I can describe a conflict, its resolution and what I learned.",
  ),
  "Talk about your Ausbildung and training program": speak(
    "Beschreib eine Ausbildung, die du machst oder machen möchtest: Beruf, Dauer, Betrieb und Berufsschule, typische Aufgaben, was dich reizt.",
    "Ich mache / möchte eine Ausbildung als … machen. · Sie dauert … Jahre. · Im Betrieb … · In der Berufsschule lernt man … · Typische Aufgaben sind … · Mich reizt besonders, dass …",
    "Ich möchte eine Ausbildung als Fachinformatiker für Systemintegration machen. Sie dauert drei Jahre. Im Betrieb würde ich Netzwerke einrichten, Computer für neue Mitarbeitende vorbereiten und Kollegen bei Problemen helfen. In der Berufsschule lernt man Theorie, zum Beispiel über Netzwerktechnik, IT-Sicherheit und Wirtschaft. Am Ende macht man eine Prüfung bei der IHK. Mich reizt besonders, dass man jeden Tag neue Probleme löst und dass IT-Fachleute in Deutschland sehr gesucht werden.",
    "I can explain an Ausbildung in detail and why it interests me.",
  ),
  "Discuss your rights and duties as an Azubi": speak(
    "Ein neuer Azubi fragt dich: „Was darf mein Chef von mir verlangen, und was nicht?“ Erkläre ihm drei Rechte und drei Pflichten.",
    "Du hast das Recht auf … · Dein Betrieb muss … · Du musst … · Du darfst nicht … · Wenn …, dann solltest du … · Bei Problemen kannst du dich an … wenden.",
    "Also, du hast das Recht auf eine Ausbildungsvergütung und auf mindestens 24 Werktage Urlaub. Dein Betrieb muss dich für die Berufsschule freistellen und dir Werkzeug kostenlos geben. Und er darf dich nicht nur putzen oder Kaffee kochen lassen, wenn das nichts mit der Ausbildung zu tun hat. Aber du hast auch Pflichten: Du musst zur Berufsschule gehen, dein Berichtsheft führen und dich am ersten Tag vor Arbeitsbeginn krankmelden, wenn du krank bist. Bei Problemen kannst du dich an die Ausbildungsberatung der IHK wenden.",
    "I can explain an apprentice's rights and duties to someone else.",
  ),
  "Explain a bureaucratic process to someone": speak(
    "Erkläre einer Freundin, die neu in Deutschland ist, Schritt für Schritt, wie die Anmeldung beim Bürgeramt funktioniert.",
    "Zuerst musst du … · Dafür brauchst du … · Dann … · Wichtig ist, dass … · Danach bekommst du … · Pass auf, dass … · Das brauchst du später für …",
    "Zuerst musst du online einen Termin beim Bürgeramt buchen — das solltest du sofort machen, weil es oft lange dauert. Du musst dich nämlich innerhalb von zwei Wochen nach dem Einzug anmelden. Dafür brauchst du deinen Pass und die Wohnungsgeberbestätigung von deinem Vermieter. Beim Termin füllst du ein Formular aus, oder die Sachbearbeiterin macht das mit dir. Danach bekommst du die Meldebescheinigung. Pass gut darauf auf, denn du brauchst sie später für das Bankkonto, die Steuer-ID und die Ausländerbehörde.",
    "I can explain a bureaucratic process clearly in steps.",
  ),
  "Talk about your health and the healthcare system": speak(
    "Vergleiche das Gesundheitssystem in Deutschland mit dem in deinem Heimatland: Versicherung, Arztbesuch, Kosten, Wartezeiten. Was gefällt dir, was nicht?",
    "In Deutschland ist man … versichert. · Zuerst geht man zum … · Im Vergleich zu … · Ein Vorteil ist … · Ein Nachteil ist … · Mich überrascht, dass …",
    "In Deutschland ist fast jeder krankenversichert, meistens gesetzlich. Man geht zuerst zum Hausarzt, der einen bei Bedarf zum Facharzt überweist. Im Vergleich zu Indien muss man hier für den Arztbesuch nichts bezahlen, was ich super finde. Ein Nachteil sind die Wartezeiten: Auf einen Termin beim Facharzt habe ich drei Monate gewartet. In Indien geht man in eine private Klinik und kommt am selben Tag dran — aber man muss alles selbst bezahlen. Mich überrascht, wie viel man hier am Telefon regeln muss.",
    "I can compare healthcare systems and evaluate them.",
  ),
  "Discuss environmental issues": speak(
    "Sprich über ein Umweltproblem (z. B. Plastikmüll, Klimawandel, Verkehr): Ursachen, Folgen und was Politik und Einzelne tun könnten.",
    "Ein großes Problem ist … · Das liegt vor allem daran, dass … · Die Folgen sind … · Die Politik müsste … · Jeder Einzelne könnte … · Ich selbst versuche …",
    "Ein großes Problem ist der Plastikmüll in den Meeren. Das liegt vor allem daran, dass viele Länder keine gute Müllentsorgung haben und dass weltweit viel zu viel Einwegplastik produziert wird. Die Folgen sind schlimm: Tiere sterben, und Mikroplastik landet in unserem Essen. Die Politik müsste Einwegplastik stärker verbieten und Mehrwegsysteme fördern. Jeder Einzelne könnte beim Einkaufen eigene Taschen und Dosen mitbringen. Ich selbst versuche, nur noch Leitungswasser zu trinken, statt Plastikflaschen zu kaufen.",
    "I can discuss causes, effects and solutions of an environmental problem.",
  ),
  "Give advice using Konjunktiv II": speak(
    "Eine Freundin möchte ihre Ausbildung abbrechen, weil sie sich mit ihrem Ausbilder nicht versteht. Gib ihr Rat mit mindestens vier verschiedenen Konjunktiv-II-Formen.",
    "An deiner Stelle würde ich … · Du solltest … · Du könntest … · Es wäre besser, wenn … · Hättest du schon mal …? · Ich an deiner Stelle hätte …",
    "Oh, das ist schwierig. An deiner Stelle würde ich nicht sofort abbrechen. Du solltest erst einmal in Ruhe mit deinem Ausbilder sprechen und konkret sagen, was dich stört. Wenn das nicht hilft, könntest du dich an die Ausbildungsberatung der Kammer wenden — die vermitteln bei Konflikten. Es wäre auch gut, wenn du mit anderen Azubis redest, vielleicht geht es ihnen genauso. Und falls es wirklich nicht klappt, wäre ein Wechsel in einen anderen Betrieb besser als ein kompletter Abbruch.",
    "I can give tactful, varied advice using the Konjunktiv II.",
  ),
  "Describe a hypothetical situation": speak(
    "Was würdest du tun, wenn du ein Jahr lang nicht arbeiten müsstest und genug Geld hättest? Erzähl mindestens sechs Sätze im Konjunktiv II.",
    "Wenn ich … hätte / müsste, würde ich … · Zuerst würde ich … · Dann … · Am liebsten würde ich … · Ich könnte endlich … · Das wäre …",
    "Wenn ich ein Jahr lang nicht arbeiten müsste, würde ich zuerst drei Monate lang meine Familie in Marokko besuchen, weil ich sie so selten sehe. Dann würde ich einen richtigen Kochkurs machen — am liebsten in Italien. Ich könnte endlich die Bücher lesen, die seit Jahren in meinem Regal stehen. Außerdem würde ich ehrenamtlich in einem Tierheim helfen. Und am Ende würde ich vielleicht mit dem Fahrrad an der Donau entlangfahren. Das wäre ein perfektes Jahr!",
    "I can describe an imagined situation fluently with the Konjunktiv II.",
  ),
  "Narrate a story using different past tenses": speak(
    "Erzähl eine kurze Geschichte (z. B. „Der schlimmste Tag meines Lebens“). Benutze Präteritum, Perfekt und Plusquamperfekt und Wörter wie als, nachdem, bevor, während.",
    "Es war an einem … · Als ich … · Ich hatte gerade …, als … · Nachdem ich … hatte, … · Während … · Bevor ich … konnte, … · Am Ende …",
    "Es war an einem Montag im Winter. Als ich morgens aufwachte, merkte ich, dass mein Wecker nicht geklingelt hatte. Ich hatte ihn am Abend vorher ausgeschaltet! Nachdem ich mich in fünf Minuten angezogen hatte, rannte ich zum Bus — aber der fuhr mir vor der Nase weg. Während ich auf den nächsten wartete, fing es an zu schneien. Bevor ich im Büro ankam, rief ich meine Chefin an. Sie lachte nur: „Heute ist doch Feiertag!“ Ich hatte es komplett vergessen.",
    "I can tell a story with a clear time sequence using several past tenses.",
  ),
  "Argue for and against an idea": speak(
    "Thema: „Sollten Supermärkte am Sonntag öffnen dürfen?“ Nenne zwei Argumente dafür, zwei dagegen und komm zu einem begründeten Schluss.",
    "Für … spricht, dass … · Ein weiteres Argument dafür ist … · Dagegen spricht … · Außerdem darf man nicht vergessen, dass … · Wenn ich alles abwäge, … · Deshalb bin ich …",
    "Für die Sonntagsöffnung spricht, dass viele Menschen unter der Woche lange arbeiten und kaum Zeit zum Einkaufen haben. Ein weiteres Argument dafür ist, dass Geschäfte mehr Umsatz machen könnten. Dagegen spricht, dass die Beschäftigten im Handel dann auch am Sonntag arbeiten müssten und weniger Zeit für ihre Familien hätten. Außerdem darf man nicht vergessen, dass ein gemeinsamer Ruhetag wichtig für die Gesellschaft ist. Wenn ich alles abwäge, bin ich gegen eine generelle Öffnung — aber für Ausnahmen, zum Beispiel an Bahnhöfen.",
    "I can present both sides of an issue and reach a reasoned conclusion.",
  ),
  "Talk about news and current events": speak(
    "Berichte über eine Nachricht, die du diese Woche gehört oder gelesen hast: Was ist passiert, wer ist betroffen, was sind die Folgen? Sag, was du davon hältst.",
    "Ich habe gelesen / gehört, dass … · Laut … · Betroffen sind vor allem … · Das bedeutet, dass … · Kritiker sagen … · Ich persönlich finde …",
    "Ich habe diese Woche gelesen, dass der Mindestlohn im Januar auf 13,90 Euro steigt. Laut der Mindestlohnkommission profitieren davon rund sechs Millionen Beschäftigte, vor allem in der Gastronomie und im Einzelhandel. Die Gewerkschaften kritisieren, dass die Erhöhung zu niedrig sei, weil das Leben so teuer geworden ist. Die Arbeitgeber dagegen befürchten, dass kleine Betriebe Probleme bekommen. Ich persönlich finde die Erhöhung richtig, aber ich verstehe auch die Sorgen der kleinen Bäckereien.",
    "I can report a news item and give my view on it.",
  ),
  "Discuss integration and living in Germany": speak(
    "Sprich über deine Erfahrungen (oder die eines Bekannten) beim Ankommen in Deutschland: Was war schwierig, was hat geholfen, was sollte sich ändern?",
    "Am Anfang war es schwierig, … · Besonders geholfen hat mir … · Ich hätte mir gewünscht, dass … · Was sich ändern sollte: … · Heute fühle ich mich …",
    "Am Anfang war es schwierig, Kontakte zu knüpfen. Die Leute waren höflich, aber distanziert. Besonders geholfen hat mir ein Sprachcafé in der Stadtbibliothek, wo ich jede Woche Deutsche getroffen habe, die Englisch oder Spanisch lernen wollten. Ich hätte mir gewünscht, dass die Behörden mehr Informationen auf Englisch geben — die ersten Monate waren sehr stressig. Was sich ändern sollte: Die Anerkennung von Abschlüssen müsste viel schneller gehen. Heute fühle ich mich in Leipzig zu Hause, auch wenn ich das Meer vermisse.",
    "I can talk about integration with personal examples and suggestions.",
  ),
  "Explain a contract or insurance policy": speak(
    "Erkläre einem Freund die wichtigsten Punkte seines neuen Handyvertrags oder einer Haftpflichtversicherung: Kosten, Laufzeit, Kündigung, was abgedeckt ist und was nicht.",
    "Der Vertrag kostet … im Monat. · Die Mindestlaufzeit ist … · Du kannst … kündigen. · Abgedeckt ist … · Nicht abgedeckt ist … · Pass auf, dass …",
    "Also, deine Haftpflichtversicherung kostet 49 Euro im Jahr. Sie zahlt, wenn du aus Versehen etwas kaputt machst, das anderen gehört — zum Beispiel die Brille eines Freundes. Du zahlst aber pro Schaden 150 Euro selbst. Nicht abgedeckt sind Schäden, die du absichtlich machst, und Sachen, die du dir geliehen hast. Der Vertrag läuft ein Jahr und verlängert sich automatisch. Pass auf, dass du mindestens drei Monate vorher kündigst, wenn du wechseln willst.",
    "I can explain the key terms of a contract in plain words.",
  ),
  "Talk about your taxes and salary": speak(
    "Erkläre, wie eine Gehaltsabrechnung aufgebaut ist und warum netto weniger ist als brutto. Sag auch, wann sich eine Steuererklärung lohnt.",
    "Auf der Abrechnung steht zuerst das Bruttogehalt. · Davon gehen … ab. · Die Sozialabgaben sind … · Übrig bleibt das Nettogehalt. · Eine Steuererklärung lohnt sich, wenn …",
    "Auf der Gehaltsabrechnung steht zuerst das Bruttogehalt, zum Beispiel 2.600 Euro. Davon gehen die Lohnsteuer und, wenn man Mitglied ist, die Kirchensteuer ab. Dazu kommen die Sozialabgaben: Renten-, Kranken-, Pflege- und Arbeitslosenversicherung, die sich Arbeitnehmer und Arbeitgeber ungefähr teilen. Übrig bleibt das Nettogehalt, hier etwa 1.740 Euro. Eine Steuererklärung lohnt sich besonders, wenn man mitten im Jahr angefangen hat oder einen langen Arbeitsweg hat, weil man dann oft Geld zurückbekommt.",
    "I can explain a payslip and the basics of German taxes.",
  ),
  "Give a structured opinion using connectors": speak(
    "Thema: „Sollte Deutsch schon im Heimatland gelernt werden, bevor man nach Deutschland kommt?“ Gib eine strukturierte Meinung (1–2 Min.) mit mindestens fünf verschiedenen Konnektoren.",
    "Zunächst … · Einerseits … andererseits … · Zwar …, aber … · Nicht nur …, sondern auch … · Obwohl … · Deshalb … · Zusammenfassend …",
    "Zunächst muss man sagen, dass Deutschkenntnisse für ein Visum oft sowieso nötig sind. Einerseits ist es sinnvoll, schon im Heimatland zu lernen, weil man dann in Deutschland schneller arbeiten kann. Andererseits lernt man eine Sprache am besten dort, wo sie gesprochen wird. Zwar sind Kurse im Heimatland oft günstiger, aber sie sind nicht immer gut. Man lernt in Deutschland nicht nur die Sprache, sondern auch die Kultur. Obwohl ich selbst in Indien bis A2 gelernt habe, habe ich hier am meisten gelernt. Zusammenfassend würde ich sagen: Die Grundlagen zu Hause, den Rest in Deutschland.",
    "I can structure a spoken opinion with a range of connectors.",
  ),
};

export const B1_CHECKS: Record<string, Authored> = { ...GRAMMAR, ...VOCAB, ...READING, ...LISTENING, ...SPEAKING };
