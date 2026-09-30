/**
 * A2 checked exercises (KNOWN_ISSUES #38) — same format and authoring rules as syllabus-checks-a1.ts: a real lesson
 * per topic and a check_set that tests that lesson (80 % to pass); speaking topics are recordings.
 */
import { checks, gap, hintGap, listen, pick, read, speak, type Authored } from "./syllabus-checks-kit.js";

// ── grammar ──────────────────────────────────────────────────────────────────

const GRAMMAR: Record<string, Authored> = {
  "Dative articles": {
    learningOutcome: "I can use the dative articles for the indirect object and after dative prepositions.",
    resourceBody:
      "The dative answers Wem? (to/for whom) — usually the person who receives something.\n" +
      "der → dem · das → dem · die → der · plural die → den (+ -n on the noun)\n" +
      "ein → einem · eine → einer · kein → keinem / keiner / keinen · mein → meinem / meiner / meinen\n\n" +
      "Ich gebe dem Mann das Buch. · Sie schenkt der Freundin Blumen. · Er hilft dem Kind. · Wir zeigen den Kindern den Park.\n" +
      "Plural nouns add -n unless they already end in -n or -s: die Kinder → den Kindern, die Autos → den Autos.",
    guidedPractice: "Say who you give what to: Ich gebe meinem Bruder …, meiner Mutter …, meinen Freunden …",
    ...checks("Setze den Artikel im Dativ ein.", [
      gap("Ich gebe ___ Mann das Geld. (der)", "dem"),
      gap("Sie hilft ___ Frau. (die)", "der"),
      gap("Er zeigt ___ Kind das Bild. (das)", "dem"),
      gap("Wir schenken ___ Kindern Bücher. (die, Plural)", "den"),
      gap("Ich schreibe ___ Freundin eine E-Mail. (eine)", "einer"),
      gap("Er antwortet ___ Kollegen nicht. (sein, masc.)", "seinem"),
    ]),
  },
  "Dative pronouns": {
    learningOutcome: "I can use mir, dir, ihm, ihr, uns, euch, ihnen and Ihnen.",
    resourceBody:
      "ich → mir · du → dir · er/es → ihm · sie → ihr · wir → uns · ihr → euch · sie → ihnen · Sie → Ihnen\n\n" +
      "Kannst du mir helfen? · Das Buch gehört ihm. · Wie geht es Ihnen? · Ich schreibe ihr morgen. · Gefällt euch die Wohnung?\n" +
      "Word order with two objects: a dative noun comes before an accusative noun (Ich gebe dem Mann das Buch), but an accusative pronoun comes before a dative pronoun (Ich gebe es ihm).",
    guidedPractice: "Answer with pronouns: Hilfst du deiner Schwester? Schmeckt dem Kind die Suppe? Gehört das Auto euren Eltern?",
    ...checks("Setze das Pronomen im Dativ ein.", [
      gap("Kannst du ___ bitte helfen? (ich)", "mir"),
      gap("Wie geht es ___? (Sie, formal)", "Ihnen"),
      gap("Das Handy gehört Lukas. Es gehört ___.", "ihm"),
      gap("Ich rufe Anna an und sage ___ die Uhrzeit.", "ihr"),
      gap("Die Kinder haben Hunger. Ich gebe ___ Brot.", "ihnen"),
      pick("Ich gebe dem Mann das Buch. → mit Pronomen:", ["Ich gebe ihm es.", "Ich gebe es ihm.", "Ich gebe ihn es."], 1),
    ]),
  },
  "Verbs with dative": {
    learningOutcome: "I can use the common verbs that take a dative object.",
    resourceBody:
      "Some verbs take a dative object, not an accusative one — learn them as a group:\n" +
      "helfen (help) · danken (thank) · gefallen (please → like) · gehören (belong to) · schmecken (taste) · passen (fit/suit) · antworten (answer) · gratulieren (congratulate) · fehlen (be missing)\n\n" +
      "Ich helfe dir. · Ich danke Ihnen. · Die Wohnung gefällt mir. (= I like the flat.) · Das Buch gehört meiner Schwester.\n" +
      "Mit gefallen/schmecken/gehören the thing is the subject: Die Schuhe gefallen mir (plural verb because of die Schuhe).",
    guidedPractice: "Say what you like with gefallen, what tastes good with schmecken, and who you help at home.",
    ...checks("Ergänze.", [
      gap("Ich helfe ___ Nachbarin. (meine)", "meiner"),
      gap("Der Film hat ___ gut gefallen. (ich)", "mir"),
      pick("Die Schuhe ___ mir sehr.", ["gefällt", "gefallen", "gefällst"], 1),
      gap("Wem gehört das Fahrrad? — Es gehört ___ Lehrer. (der)", "dem"),
      pick("Which verb takes an accusative object?", ["helfen", "danken", "sehen"], 2),
      gap("Schmeckt ___ die Pizza? (du)", "dir"),
    ]),
  },
  "Dative prepositions": {
    learningOutcome: "I can use aus, bei, mit, nach, seit, von and zu with the dative.",
    resourceBody:
      "These prepositions always take the dative: aus, bei, mit, nach, seit, von, zu (+ gegenüber).\n" +
      "aus dem Haus · bei der Arbeit · mit dem Bus · nach dem Essen · seit einem Jahr · von meinem Vater · zu der Ärztin\n" +
      "Contractions: bei dem → beim · von dem → vom · zu dem → zum · zu der → zur\n" +
      "seit + dative + present tense = since/for: Ich wohne seit zwei Jahren hier. (not \"habe gewohnt\")",
    guidedPractice: "Say how long you've lived and learned German (seit), how you travel (mit) and where you go after work (zu).",
    ...checks("Setze die richtige Form ein.", [
      gap("Ich fahre mit ___ Fahrrad zur Arbeit. (das)", "dem"),
      gap("Ich wohne seit zwei ___ in Köln. (Jahr, Plural)", "Jahren"),
      gap("Nach ___ Kurs gehe ich einkaufen. (der)", "dem"),
      gap("Heute gehe ich ___ Ärztin. (zu + der)", "zur"),
      gap("Das Geschenk ist ___ meinem Bruder. (from)", "von"),
      gap("Ich komme gerade ___ Supermarkt. (von + dem)", "vom"),
    ]),
  },
  "wo? + dative": {
    learningOutcome: "I can say where something is with a two-way preposition + dative.",
    resourceBody:
      "Two-way prepositions: in, an, auf, über, unter, vor, hinter, neben, zwischen.\n" +
      "Wo? (location, no movement) → dative: Die Katze sitzt auf dem Tisch. · Das Bild hängt an der Wand. · Ich bin im Büro. · Das Auto steht vor dem Haus. · Der Schlüssel liegt unter den Zeitungen.\n" +
      "Contractions: in dem → im · an dem → am.",
    guidedPractice: "Describe where five things are in your room, each with a different preposition.",
    ...checks("Wo ist das? Setze die richtige Form ein.", [
      gap("Die Katze liegt auf ___ Sofa. (das)", "dem"),
      gap("Das Bild hängt an ___ Wand. (die)", "der"),
      gap("Ich arbeite heute ___ Büro. (in + dem)", "im"),
      gap("Das Fahrrad steht hinter ___ Haus. (das)", "dem"),
      gap("Die Schuhe sind unter ___ Bett. (das)", "dem"),
      gap("Der Supermarkt ist neben ___ Apotheke. (die)", "der"),
    ]),
  },
  "wohin? + accusative": {
    learningOutcome: "I can say where something or someone goes with a two-way preposition + accusative.",
    resourceBody:
      "Same prepositions (in, an, auf, über, unter, vor, hinter, neben, zwischen) — but with movement to a place, Wohin? → accusative:\n" +
      "Ich gehe ins Kino (in das). · Ich lege das Buch auf den Tisch. · Er hängt das Bild an die Wand. · Wir fahren an den See.\n" +
      "Compare: Wo bist du? — Im Kino. (dative) · Wohin gehst du? — Ins Kino. (accusative)\n" +
      "Contractions: in das → ins · an das → ans.",
    guidedPractice: "Tidy a room aloud: Ich lege …, ich stelle …, ich hänge … — each with wohin + accusative.",
    ...checks("Wohin? Setze die richtige Form ein.", [
      gap("Heute Abend gehen wir ___ Kino. (in + das)", "ins"),
      gap("Ich lege das Handy auf ___ Tisch. (der)", "den"),
      gap("Er hängt die Jacke an ___ Haken. (der)", "den"),
      gap("Am Wochenende fahren wir an ___ Meer. (das)", "das"),
      pick("Wo ist Anna? — Sie ist ___ Garten.", ["in den", "im", "ins"], 1),
      pick("Wohin geht Anna? — Sie geht ___ Garten.", ["in den", "im", "in dem"], 0),
    ]),
  },
  "Position verbs": {
    learningOutcome: "I can tell the placing verbs (stellen, legen, setzen, hängen) from the state verbs (stehen, liegen, sitzen, hängen).",
    resourceBody:
      "Putting something somewhere (movement, wohin + accusative) → regular verbs:\n" +
      "stellen (upright) · legen (flat) · setzen (seat) · hängen — Ich stelle die Flasche auf den Tisch.\n" +
      "Where it is (state, wo + dative) → irregular verbs:\n" +
      "stehen · liegen · sitzen · hängen — Die Flasche steht auf dem Tisch.\n" +
      "Perfekt: gestellt/gestanden · gelegt/gelegen · gesetzt/gesessen · gehängt/gehangen.",
    guidedPractice: "Say where things are (steht/liegt/hängt) and then where you put them (stelle/lege/hänge).",
    ...checks("stellen oder stehen, legen oder liegen …?", [
      pick("Ich ___ das Buch auf den Tisch.", ["lege", "liege", "setze"], 0),
      pick("Das Buch ___ auf dem Tisch.", ["legt", "liegt", "stellt"], 1),
      pick("Die Vase ___ auf dem Regal.", ["stellt", "steht", "setzt"], 1),
      pick("Ich ___ die Vase auf das Regal.", ["stehe", "stelle", "sitze"], 1),
      pick("Das Kind ___ auf dem Stuhl.", ["setzt", "sitzt", "legt"], 1),
      gap("Die Mutter ___ das Kind auf den Stuhl. (seat — setzen)", "setzt"),
    ]),
  },
  "Irregular participles": {
    learningOutcome: "I can form the Partizip II of the common irregular verbs.",
    resourceBody:
      "Irregular (strong) verbs: ge- + stem (often with a vowel change) + -en.\n" +
      "essen → gegessen · trinken → getrunken · nehmen → genommen · schreiben → geschrieben · lesen → gelesen · sehen → gesehen\n" +
      "finden → gefunden · helfen → geholfen · sprechen → gesprochen · treffen → getroffen · schlafen → geschlafen · geben → gegeben\n" +
      "with sein: gehen → gegangen · kommen → gekommen · fahren → gefahren · bleiben → geblieben · fliegen → geflogen\n" +
      "Mixed: bringen → gebracht · denken → gedacht · wissen → gewusst · kennen → gekannt.",
    guidedPractice: "Say one sentence in the Perfekt for each: essen, schreiben, treffen, gehen, bringen.",
    ...checks("Setze das Partizip II ein.", [
      hintGap("Ich habe einen Brief ___.", "schreiben", "geschrieben"),
      hintGap("Wir haben uns im Café ___.", "treffen", "getroffen"),
      hintGap("Hast du den Schlüssel ___?", "finden", "gefunden"),
      hintGap("Er hat mir sehr ___.", "helfen", "geholfen"),
      hintGap("Sie hat Blumen ___.", "bringen", "gebracht"),
      hintGap("Ich habe das nicht ___.", "wissen", "gewusst"),
    ]),
  },
  "Participles of separable & -ieren verbs": {
    learningOutcome: "I can form the Partizip II of separable, inseparable and -ieren verbs.",
    resourceBody:
      "Separable: ge- goes between prefix and stem: einkaufen → eingekauft · anrufen → angerufen · aufstehen → aufgestanden · mitbringen → mitgebracht\n" +
      "Inseparable (be-, ver-, er-, ent-, emp-, ge-, zer-, miss-): no ge-: bezahlen → bezahlt · verstehen → verstanden · erzählen → erzählt · bekommen → bekommen\n" +
      "-ieren: no ge-, ends in -t: studieren → studiert · telefonieren → telefoniert · reparieren → repariert · passieren → passiert",
    guidedPractice: "Tell your morning in the Perfekt using aufstehen, einkaufen, bezahlen and telefonieren.",
    ...checks("Setze das Partizip II ein.", [
      hintGap("Ich habe dich gestern ___.", "anrufen", "angerufen"),
      hintGap("Wir haben schon ___.", "bezahlen", "bezahlt"),
      hintGap("Sie hat in Berlin Informatik ___.", "studieren", "studiert"),
      hintGap("Hast du die Aufgabe ___?", "verstehen", "verstanden"),
      hintGap("Er hat einen Kuchen ___.", "mitbringen", "mitgebracht"),
      hintGap("Der Mechaniker hat das Auto ___.", "reparieren", "repariert"),
    ]),
  },
  "haben or sein?": {
    learningOutcome: "I can choose between haben and sein in the Perfekt.",
    resourceBody:
      "sein: verbs of movement from A to B (gehen, fahren, fliegen, laufen, kommen, umziehen), change of state (aufstehen, einschlafen, aufwachen, sterben, werden), and sein, bleiben, passieren.\n" +
      "haben: everything else — including verbs with an accusative object and most reflexive verbs.\n" +
      "Ich bin nach Hamburg gefahren. (movement) · Ich habe das Auto in die Garage gefahren. (object → haben)\n" +
      "Ich bin eingeschlafen. · Ich habe geschlafen. (no change of state)",
    guidedPractice: "Tell your weekend in eight Perfekt sentences and check each auxiliary against the rule.",
    ...checks("haben oder sein? Setze die richtige Form ein.", [
      gap("Wir ___ letztes Jahr nach Wien umgezogen.", "sind"),
      gap("Ich ___ gestern lange geschlafen.", "habe"),
      gap("Das Kind ___ um neun Uhr eingeschlafen.", "ist"),
      gap("Er ___ Arzt geworden.", "ist"),
      gap("Ich ___ meinen Freund zum Bahnhof gefahren.", "habe"),
      gap("Was ___ gestern passiert?", "ist"),
    ]),
  },
  "Präteritum of modals": {
    learningOutcome: "I can use the Präteritum of the modal verbs to talk about the past.",
    resourceBody:
      "For modals, the Präteritum is used even in speech (not the Perfekt):\n" +
      "können → konnte · müssen → musste · wollen → wollte · dürfen → durfte · sollen → sollte · mögen → mochte\n" +
      "Endings: ich konnte · du konntest · er konnte · wir konnten · ihr konntet · sie konnten (no umlaut!)\n" +
      "Gestern musste ich lange arbeiten. · Als Kind durfte ich nicht allein in die Stadt. · Wir wollten ins Kino, aber es war zu spät.",
    guidedPractice: "Say what you could, had to, wanted to and weren't allowed to do as a child.",
    ...checks("Setze das Modalverb im Präteritum ein.", [
      hintGap("Gestern ___ ich nicht kommen.", "können", "konnte"),
      hintGap("Wir ___ zwei Stunden warten.", "müssen", "mussten"),
      hintGap("Als Kind ___ ich Pilot werden.", "wollen", "wollte"),
      hintGap("___ du als Kind lange fernsehen?", "dürfen", "Durftest"),
      hintGap("Der Arzt sagte, ich ___ im Bett bleiben.", "sollen", "sollte"),
      pick("„Ich musste arbeiten“ means …", ["I have to work.", "I had to work.", "I must have worked."], 1),
    ]),
  },
  Comparative: {
    learningOutcome: "I can compare two things with the comparative + als.",
    resourceBody:
      "Adjective + -er + als: klein → kleiner als · schnell → schneller als · teuer → teurer als\n" +
      "Many one-syllable adjectives take an umlaut: alt → älter · groß → größer · jung → jünger · warm → wärmer · kurz → kürzer\n" +
      "Irregular: gut → besser · viel → mehr · gern → lieber · hoch → höher\n" +
      "Berlin ist größer als München. · Ich trinke lieber Tee als Kaffee. · Mein Bruder ist zwei Jahre älter als ich.",
    guidedPractice: "Compare your home town and your German town in five sentences.",
    ...checks("Setze den Komparativ ein.", [
      hintGap("Der Zug ist ___ als der Bus.", "schnell", "schneller"),
      hintGap("Mein Bruder ist ___ als ich.", "alt", "älter"),
      hintGap("Heute ist das Wetter ___ als gestern.", "gut", "besser"),
      hintGap("Ich trinke ___ Tee als Kaffee.", "gern", "lieber"),
      hintGap("In Berlin wohnen ___ Menschen als in Hamburg.", "viel", "mehr"),
      pick("Correct:", ["Anna ist größer wie Paul.", "Anna ist größer als Paul.", "Anna ist mehr groß als Paul."], 1),
    ]),
  },
  Superlative: {
    learningOutcome: "I can say something is the most … with am -sten or der/die/das -ste.",
    resourceBody:
      "After a verb: am + adjective + -(e)sten: am schnellsten · am größten · am ältesten · am teuersten\n" +
      "Before a noun: der/die/das + -(e)ste: der schnellste Zug · die größte Stadt · das beste Essen\n" +
      "-est after d, t, s, ß, z: am ältesten, am heißesten, am kürzesten\n" +
      "Irregular: gut → am besten · viel → am meisten · gern → am liebsten · hoch → am höchsten",
    guidedPractice: "Name the biggest city, your favourite food and the thing you do most often — with superlatives.",
    ...checks("Setze den Superlativ ein.", [
      hintGap("Im Juli ist es am ___.", "heiß", "heißesten"),
      hintGap("Welches Essen schmeckt dir am ___?", "gut", "besten"),
      hintGap("Ich lese am ___ Krimis.", "gern", "liebsten"),
      hintGap("Berlin ist die ___ Stadt in Deutschland.", "groß", "größte"),
      hintGap("Die Zugspitze ist der ___ Berg Deutschlands.", "hoch", "höchste"),
      hintGap("Wer arbeitet am ___?", "viel", "meisten"),
    ]),
  },
  "so … wie / als": {
    learningOutcome: "I can say two things are equal (so … wie) or different (-er als).",
    resourceBody:
      "Equal: (genau)so + adjective + wie: Paul ist so groß wie Tim. · Die Jacke ist genauso teuer wie die Hose.\n" +
      "Not equal: nicht so + adjective + wie: Der Bus ist nicht so schnell wie der Zug.\n" +
      "Different: comparative + als: Der Zug ist schneller als der Bus.\n" +
      "Rule of thumb: basic adjective → wie, -er form → als.",
    guidedPractice: "Compare two people you know three times: so … wie, nicht so … wie, and -er als.",
    ...checks("wie oder als?", [
      gap("Mein Handy ist so alt ___ deins.", "wie"),
      gap("Mein Handy ist älter ___ deins.", "als"),
      gap("Das Hotel war nicht so gut ___ im Katalog.", "wie"),
      gap("Sie spricht besser Deutsch ___ ich.", "als"),
      gap("Tim ist genauso groß ___ sein Vater.", "wie"),
      gap("Heute ist es kälter ___ gestern.", "als"),
    ]),
  },
  "After definite articles": {
    learningOutcome: "I can put the right ending on an adjective after der/die/das.",
    resourceBody:
      "After der/die/das (and dieser, jeder, welcher) the adjective ends in -e or -en:\n" +
      "-e: nominative singular (der große Mann, die kleine Wohnung, das neue Auto) and accusative die/das (die kleine Wohnung, das neue Auto)\n" +
      "-en: everything else — accusative masculine (den großen Mann), all dative (dem großen Mann, der kleinen Wohnung) and all plural (die neuen Autos)\n" +
      "Ich kaufe den blauen Pullover. · Mit dem neuen Auto fahren wir. · Die alten Häuser sind schön.",
    guidedPractice: "Describe five objects with der/die/das + adjective, then use them in the accusative.",
    ...checks("Setze die Adjektivendung ein. (Write the whole adjective.)", [
      hintGap("Der ___ Mann ist mein Onkel.", "alt", "alte"),
      hintGap("Ich nehme den ___ Pullover.", "blau", "blauen"),
      hintGap("Das ___ Auto gehört mir.", "neu", "neue"),
      hintGap("Wir wohnen in der ___ Wohnung im dritten Stock.", "klein", "kleinen"),
      hintGap("Die ___ Häuser sind sehr teuer.", "modern", "modernen"),
      hintGap("Kennst du die ___ Kollegin?", "neu", "neue"),
    ]),
  },
  "After indefinite articles": {
    learningOutcome: "I can put the right ending on an adjective after ein/eine/kein/mein.",
    resourceBody:
      "After ein, kein and the possessives, the adjective shows the gender where the article can't:\n" +
      "nominative: ein großer Mann · eine kleine Wohnung · ein neues Auto\n" +
      "accusative: einen großen Mann · eine kleine Wohnung · ein neues Auto\n" +
      "dative: einem großen Mann · einer kleinen Wohnung · einem neuen Auto — all -en\n" +
      "plural with keine/meine: keine neuen Autos (-en)\n" +
      "Remember: -er (masc.) and -es (neuter) appear after ein because ein doesn't show the gender.",
    guidedPractice: "Describe your ideal flat with ein/eine + adjectives in the nominative and the accusative.",
    ...checks("Setze die Adjektivendung ein. (Write the whole adjective.)", [
      hintGap("Das ist ein ___ Film.", "gut", "guter"),
      hintGap("Ich suche eine ___ Wohnung.", "günstig", "günstige"),
      hintGap("Er hat ein ___ Fahrrad.", "neu", "neues"),
      hintGap("Wir haben einen ___ Garten.", "groß", "großen"),
      hintGap("Sie wohnt in einer ___ Stadt.", "klein", "kleinen"),
      hintGap("Das sind meine ___ Schuhe.", "neu", "neuen"),
    ]),
  },
  "weil & denn": {
    learningOutcome: "I can give reasons with weil (verb at the end) and denn (verb in position 2).",
    resourceBody:
      "weil starts a subordinate clause — the conjugated verb goes to the end:\n" +
      "Ich lerne Deutsch, weil ich in Deutschland arbeiten möchte. · Ich komme nicht, weil ich krank bin.\n" +
      "denn joins two main clauses — normal word order, verb in position 2:\n" +
      "Ich lerne Deutsch, denn ich möchte in Deutschland arbeiten.\n" +
      "Comma before both. Warum? — Weil … (a weil-clause alone can answer a question).",
    guidedPractice: "Give three reasons why you learn German — once with weil, once with denn.",
    ...checks("Wähle den richtigen Satz.", [
      pick("I'm staying at home because I'm ill.", ["Ich bleibe zu Hause, weil ich bin krank.", "Ich bleibe zu Hause, weil ich krank bin.", "Ich bleibe zu Hause, denn ich krank bin."], 1),
      pick("… because I want to work in Germany.", ["…, denn ich möchte in Deutschland arbeiten.", "…, denn ich in Deutschland arbeiten möchte.", "…, weil ich möchte in Deutschland arbeiten."], 0),
      gap("Ich trinke Kaffee, weil ich sehr müde ___. (sein)", "bin"),
      gap("Sie kommt später, denn sie ___ noch arbeiten. (müssen)", "muss"),
      pick("Warum lernst du so viel?", ["Weil ich habe morgen eine Prüfung.", "Weil ich morgen eine Prüfung habe.", "Denn ich morgen eine Prüfung habe."], 1),
      gap("Er ist froh, ___ er die Prüfung bestanden hat. (weil / denn)", "weil"),
    ]),
  },
  "dass-clauses": {
    learningOutcome: "I can report thoughts and statements with dass (verb at the end).",
    resourceBody:
      "dass introduces what someone thinks, says, knows or hopes — the verb goes to the end:\n" +
      "Ich glaube, dass er heute kommt. · Sie sagt, dass sie keine Zeit hat. · Ich hoffe, dass du bald gesund bist.\n" +
      "With a modal or Perfekt, the conjugated verb is last: Ich weiß, dass er gut kochen kann. · Ich denke, dass sie schon gegangen ist.\n" +
      "Typical openers: Ich finde / glaube / denke / hoffe / weiß / bin sicher, dass …",
    guidedPractice: "Make four dass-sentences: something you hope, think, know and find.",
    ...checks("Ergänze den dass-Satz.", [
      pick("I think that the course is good.", ["Ich finde, dass der Kurs ist gut.", "Ich finde, dass der Kurs gut ist.", "Ich finde, dass ist der Kurs gut."], 1),
      gap("Ich hoffe, dass du morgen Zeit ___. (haben)", "hast"),
      gap("Er sagt, dass er nicht kommen ___. (können)", "kann"),
      pick("I know that she has already left.", ["Ich weiß, dass sie schon gegangen ist.", "Ich weiß, dass sie ist schon gegangen.", "Ich weiß, dass sie schon ist gegangen."], 0),
      gap("Ich glaube, ___ das Geschäft heute geschlossen ist.", "dass"),
      gap("Weißt du, dass Anna nächste Woche ___? (umziehen — separable, one word)", "umzieht"),
    ]),
  },
  "wenn-clauses": {
    learningOutcome: "I can express conditions and repeated situations with wenn.",
    resourceBody:
      "wenn = if (condition) or whenever (repeated) — verb at the end:\n" +
      "Wenn das Wetter gut ist, gehen wir schwimmen. · Ich rufe dich an, wenn ich zu Hause bin.\n" +
      "When the wenn-clause comes first, the main clause starts with the verb: Wenn ich Zeit habe, lese ich. (verb – verb)\n" +
      "wenn for repeated or future events, als for one single event in the past: Als ich Kind war, … (A2: recognise).",
    guidedPractice: "Complete: Wenn ich Zeit habe, … / Wenn es regnet, … / Ich bin froh, wenn …",
    ...checks("Wähle den richtigen Satz / ergänze.", [
      pick("If I have time, I'll come.", ["Wenn ich Zeit habe, ich komme.", "Wenn ich Zeit habe, komme ich.", "Wenn ich habe Zeit, komme ich."], 1),
      gap("Wenn es morgen ___, bleiben wir zu Hause. (regnen)", "regnet"),
      gap("Ich trinke immer Tee, wenn ich krank ___. (sein)", "bin"),
      gap("Wenn du Hilfe brauchst, ___ mich an! (rufen — du, imperative)", "ruf", "rufe"),
      pick("Wenn ich müde bin, …", ["… ich gehe früh ins Bett.", "… gehe ich früh ins Bett.", "… früh ins Bett ich gehe."], 1),
      gap("Sag mir Bescheid, ___ du fertig bist.", "wenn"),
    ]),
  },
  "Main-clause connectors": {
    learningOutcome: "I can link sentences with deshalb, trotzdem, dann and außerdem (verb straight after).",
    resourceBody:
      "These adverbs take position 1, so the verb comes right after them, then the subject:\n" +
      "deshalb (that's why): Ich bin krank, deshalb bleibe ich zu Hause.\n" +
      "trotzdem (nevertheless): Es regnet, trotzdem gehen wir spazieren.\n" +
      "dann (then): Zuerst frühstücke ich, dann fahre ich zur Arbeit.\n" +
      "außerdem (besides): Die Wohnung ist hell, außerdem hat sie einen Balkon.\n" +
      "Compare weil (verb at the end) and denn/aber/und (no effect on word order).",
    guidedPractice: "Make one sentence with each connector about your week.",
    ...checks("Ergänze.", [
      pick("Ich habe keine Zeit, deshalb …", ["… ich komme nicht.", "… komme ich nicht.", "… nicht komme ich."], 1),
      gap("Das Essen war teuer, ___ war es nicht gut. (besides)", "außerdem"),
      gap("Es ist kalt, ___ gehe ich ohne Jacke raus. (nevertheless)", "trotzdem"),
      gap("Mein Zug hatte Verspätung, ___ bin ich zu spät gekommen. (that's why)", "deshalb", "deswegen", "darum"),
      pick("Zuerst kaufe ich ein, …", ["… dann ich koche.", "… dann koche ich.", "… ich koche dann."], 1),
      gap("Sie ist müde, trotzdem ___ sie weiter. (arbeiten)", "arbeitet"),
    ]),
  },
  "Accusative reflexives": {
    learningOutcome: "I can use reflexive verbs with mich, dich, sich, uns, euch.",
    resourceBody:
      "Reflexive pronouns (accusative): ich → mich · du → dich · er/sie/es → sich · wir → uns · ihr → euch · sie/Sie → sich\n" +
      "sich freuen (auf/über) · sich treffen · sich anmelden · sich beeilen · sich vorstellen · sich ärgern · sich ausruhen · sich verabreden\n" +
      "Ich freue mich auf das Wochenende. · Wir treffen uns um acht. · Du musst dich beim Bürgeramt anmelden. · Beeil dich!",
    guidedPractice: "Say what you're looking forward to, when you meet friends, and where you had to register.",
    ...checks("Setze das Reflexivpronomen ein.", [
      gap("Ich freue ___ auf den Urlaub.", "mich"),
      gap("Wir treffen ___ um 18 Uhr am Bahnhof.", "uns"),
      gap("Er muss ___ beim Bürgeramt anmelden.", "sich"),
      gap("Beeil ___, der Bus kommt! (du)", "dich"),
      gap("Freut ihr ___ auf die Party?", "euch"),
      gap("Darf ich ___ vorstellen? Mein Name ist Rao.", "mich"),
    ]),
  },
  "Dative reflexives": {
    learningOutcome: "I can use dative reflexives when there is also an accusative object.",
    resourceBody:
      "When the sentence already has an accusative object, the reflexive pronoun is dative. Only ich and du change:\n" +
      "ich → mir · du → dir · (er/sie/es → sich · wir → uns · ihr → euch · sie → sich)\n" +
      "Ich wasche mich. (accusative — no other object) → Ich wasche mir die Hände. (dative — die Hände is the object)\n" +
      "Ich putze mir die Zähne. · Kämmst du dir die Haare? · Ich kaufe mir ein neues Handy. · Ich wünsche mir Frieden.",
    guidedPractice: "Describe your morning routine with mir: Ich putze mir …, ich wasche mir …",
    ...checks("mich oder mir? dich oder dir?", [
      gap("Ich putze ___ die Zähne.", "mir"),
      gap("Ich wasche ___ jeden Morgen. (no other object)", "mich"),
      gap("Hast du ___ die Hände gewaschen?", "dir"),
      gap("Ich kaufe ___ morgen einen neuen Laptop.", "mir"),
      gap("Ärgerst du ___ oft?", "dich"),
      gap("Was wünschst du ___ zum Geburtstag?", "dir"),
    ]),
  },
  "Common verb + preposition pairs": {
    learningOutcome: "I can use the everyday verbs that need a fixed preposition.",
    resourceBody:
      "Learn the preposition with the verb (+ case):\n" +
      "warten auf + Akk. · sich freuen auf + Akk. (future) / über + Akk. (now) · sich interessieren für + Akk. · denken an + Akk.\n" +
      "sich kümmern um + Akk. · sprechen mit + Dat. / über + Akk. · Angst haben vor + Dat. · teilnehmen an + Dat. · sich bewerben um + Akk.\n" +
      "Ich warte auf den Bus. · Ich interessiere mich für Technik. · Ich denke oft an meine Familie. · Sie kümmert sich um die Kinder.\n" +
      "Questions: Worauf wartest du? · Wofür interessierst du dich? (things) — Auf wen? (people)",
    guidedPractice: "Say what you're waiting for, interested in and often think of.",
    ...checks("Setze die Präposition ein.", [
      gap("Ich warte schon 20 Minuten ___ den Bus.", "auf"),
      gap("Interessierst du dich ___ Fußball?", "für"),
      gap("Ich denke oft ___ meine Familie in Indien.", "an"),
      gap("Wer kümmert sich ___ die Kinder?", "um"),
      gap("Ich habe Angst ___ der Prüfung.", "vor"),
      gap("Ich freue mich schon ___ den Urlaub im Sommer.", "auf"),
    ]),
  },
  "würde, könnte, hätte": {
    learningOutcome: "I can make polite requests and wishes with würde, könnte and hätte.",
    resourceBody:
      "Konjunktiv II for politeness and wishes:\n" +
      "können → ich könnte, du könntest, Sie könnten · haben → ich hätte, du hättest · werden → ich würde, du würdest, Sie würden\n" +
      "Könnten Sie mir bitte helfen? · Ich hätte gern einen Kaffee. · Würden Sie das Fenster schließen?\n" +
      "Wishes: Ich würde gern nach Kanada reisen. · Ich hätte gern mehr Zeit.\n" +
      "Advice: An deiner Stelle würde ich zum Arzt gehen.",
    guidedPractice: "Make three polite requests at an office and say two wishes with würde gern.",
    ...checks("Ergänze höflich.", [
      gap("___ Sie mir bitte helfen? (können)", "Könnten"),
      gap("Ich ___ gern ein Glas Wasser. (haben)", "hätte"),
      gap("___ Sie bitte das Fenster schließen? (werden)", "Würden"),
      gap("An deiner Stelle ___ ich mehr schlafen.", "würde"),
      pick("Which is the most polite?", ["Gib mir das Salz!", "Ich will das Salz.", "Könnten Sie mir bitte das Salz geben?"], 2),
      gap("Wir ___ gern im Sommer nach Italien fahren. (werden)", "würden"),
    ]),
  },
  "Future with werden": {
    learningOutcome: "I can talk about plans and predictions with werden + infinitive.",
    resourceBody:
      "werden: ich werde · du wirst · er/sie/es wird · wir werden · ihr werdet · sie werden\n" +
      "Future = werden (position 2) + infinitive (end): Ich werde nächstes Jahr eine Ausbildung machen. · Morgen wird es regnen.\n" +
      "In everyday speech the present + a time word is more common: Morgen fahre ich nach Berlin.\n" +
      "werden alone = become: Ich werde Mechatroniker.",
    guidedPractice: "Say three plans for next year and one prediction about the weather with werden.",
    ...checks("Setze werden in der richtigen Form ein.", [
      gap("Ich ___ nächstes Jahr in Deutschland arbeiten.", "werde"),
      gap("Morgen ___ es sonnig. (it)", "wird"),
      gap("___ du am Samstag zur Party kommen?", "Wirst"),
      gap("Wir ___ im Mai umziehen.", "werden"),
      pick("„Sie wird Ärztin.“ means …", ["She will be a doctor one day (becomes).", "She is a doctor.", "She was a doctor."], 0),
      pick("Where does the infinitive go?  Ich werde morgen … ", ["right after werde", "at the end of the sentence", "before werde"], 1),
    ]),
  },
  "Recognizing the genitive": {
    learningOutcome: "I can recognise the genitive and understand who owns what.",
    resourceBody:
      "The genitive shows possession (of the …) — at A2 you mostly need to recognise it:\n" +
      "der/das → des + -(e)s on the noun: das Auto des Mannes · das Ende des Films\n" +
      "die / plural → der: die Tasche der Frau · die Zimmer der Kinder\n" +
      "Names: Annas Buch (no apostrophe) · In speech Germans often use von + dative: das Auto von meinem Vater.\n" +
      "After wegen, während, trotz: wegen des Wetters (because of the weather), während der Arbeit.",
    guidedPractice: "Rewrite with von + dative: das Haus meines Onkels, die Farbe des Autos, das Zimmer der Tochter.",
    ...checks("Was bedeutet das? / Wähle die richtige Form.", [
      pick("„das Auto des Lehrers“ =", ["the teacher's car", "the car for the teacher", "the teacher in the car"], 0),
      pick("„wegen des Regens“ =", ["despite the rain", "because of the rain", "during the rain"], 1),
      pick("Mit von: „das Handy meiner Schwester“ =", ["das Handy von meiner Schwester", "das Handy von meine Schwester", "das Handy zu meiner Schwester"], 0),
      pick("Correct genitive:", ["die Tasche des Frau", "die Tasche der Frau", "die Tasche dem Frau"], 1),
      gap("Das ist Marias Wohnung = Das ist die Wohnung ___ Maria.", "von"),
      pick("„während der Arbeit“ =", ["after work", "during work", "because of work"], 1),
    ]),
  },
};

// ── vocabulary ───────────────────────────────────────────────────────────────

const VOCAB: Record<string, Authored> = {
  "School & courses": {
    learningOutcome: "I can talk about a course, lessons, homework and exams.",
    resourceBody:
      "der Kurs, -e · der Unterricht (lessons) · die Stunde (lesson hour) · die Hausaufgabe, -n · die Prüfung, -en · das Zeugnis (certificate/report)\n" +
      "der Kursleiter / die Kursleiterin · der Teilnehmer / die Teilnehmerin (participant) · die Anmeldung (registration)\n" +
      "sich anmelden für · teilnehmen an · eine Prüfung machen / bestehen (pass) / nicht bestehen (fail) · wiederholen (repeat) · fehlen (be absent)\n" +
      "Ich besuche einen Deutschkurs. · Der Unterricht beginnt um neun. · Ich habe die Prüfung bestanden!",
    guidedPractice: "Describe your German course: when, how often, how many participants, which exam.",
    ...checks("Ergänze.", [
      gap("Ich habe die B1-Prüfung ___! (passed)", "bestanden"),
      gap("Ich muss mich bis Freitag für den Kurs ___. (register)", "anmelden"),
      gap("Heute war ich krank und habe im Unterricht ___. (was absent)", "gefehlt"),
      gap("Nach dem Kurs bekommt man ein ___. (certificate)", "Zeugnis", "Zertifikat"),
      pick("„die Teilnehmer“ are …", ["the teachers", "the participants", "the exams"], 1),
      gap("Hast du die ___ schon gemacht? — Nein, ich mache sie heute Abend. (homework)", "Hausaufgaben", "Hausaufgabe"),
    ]),
  },
  "Office life": {
    learningOutcome: "I can name office things and everyday office tasks.",
    resourceBody:
      "der Schreibtisch · der Drucker (printer) · der Bildschirm (screen) · die Besprechung (meeting) · der Termin · die Kantine (canteen) · die Pause\n" +
      "der Chef / die Chefin · der Kollege / die Kollegin · die Abteilung (department) · die Unterlagen (documents)\n" +
      "eine E-Mail schicken / beantworten · einen Termin vereinbaren · etwas ausdrucken (print) · kopieren · ablegen (file) · Überstunden machen (overtime)\n" +
      "Ich habe um zehn eine Besprechung. · Der Drucker funktioniert nicht. · Können Sie mir die Unterlagen schicken?",
    guidedPractice: "Describe a morning at an office: what you do first, who you meet, what you print.",
    ...checks("Ergänze.", [
      gap("Der ___ ist kaputt, ich kann nichts ausdrucken. (printer)", "Drucker"),
      gap("Um 10 Uhr haben wir eine ___ mit dem Team. (meeting)", "Besprechung"),
      gap("Mittags essen wir in der ___. (canteen)", "Kantine"),
      gap("Frau Weber arbeitet in einer anderen ___. (department)", "Abteilung"),
      pick("„Überstunden machen“ =", ["to take a break", "to work overtime", "to go home early"], 1),
      gap("Können Sie mir die ___ per E-Mail schicken? (documents)", "Unterlagen"),
    ]),
  },
  "Working conditions": {
    learningOutcome: "I can talk about pay, hours, holidays and contracts.",
    resourceBody:
      "der Arbeitsvertrag (contract) · das Gehalt (salary) · der Lohn (wage) · brutto / netto · die Arbeitszeit · Vollzeit / Teilzeit\n" +
      "der Urlaub (30 Tage Urlaub) · die Probezeit (probation) · die Schicht (shift): Frühschicht, Spätschicht, Nachtschicht\n" +
      "befristet (fixed-term) / unbefristet (permanent) · kündigen (resign / give notice) · die Kündigung\n" +
      "Ich arbeite Vollzeit, 40 Stunden pro Woche. · Ich verdiene 2.800 Euro brutto. · Die Probezeit dauert sechs Monate.",
    guidedPractice: "Describe a job you'd like: hours, shifts, holidays, salary, contract type.",
    ...checks("Ergänze.", [
      gap("Ich arbeite 20 Stunden pro Woche, also ___. (part-time)", "Teilzeit"),
      gap("Die ___ dauert sechs Monate. (probation)", "Probezeit"),
      pick("netto means …", ["before tax", "after tax and deductions", "per hour"], 1),
      gap("Mein Vertrag ist ___ — er endet im Dezember. (fixed-term)", "befristet"),
      gap("Diese Woche habe ich ___: von 22 bis 6 Uhr. (night shift)", "Nachtschicht"),
      gap("Ich habe einen neuen Job gefunden und meine alte Stelle ___. (quit)", "gekündigt"),
    ]),
  },
  "At the doctor": {
    learningOutcome: "I can handle the words for a doctor's visit.",
    resourceBody:
      "die Praxis · der Hausarzt / die Hausärztin (GP) · der Facharzt (specialist) · das Wartezimmer · die Sprechstunde (office hours)\n" +
      "die Versichertenkarte / Krankenkassenkarte · das Rezept (prescription) · die Überweisung (referral) · die Untersuchung (examination)\n" +
      "Was fehlt Ihnen? (What's wrong?) · Seit wann haben Sie die Beschwerden? · Ich habe Fieber / Husten / Schnupfen / Halsschmerzen.\n" +
      "Der Arzt untersucht mich. · Ich bekomme ein Rezept. · Ich muss zum Facharzt — ich brauche eine Überweisung.",
    guidedPractice: "Play a short visit: say what's wrong and since when, then the doctor's answer.",
    ...checks("Ergänze.", [
      gap("Bitte nehmen Sie im ___ Platz. (waiting room)", "Wartezimmer"),
      gap("Für das Medikament brauchen Sie ein ___. (prescription)", "Rezept"),
      gap("Ich schreibe Ihnen eine ___ zum Hautarzt. (referral)", "Überweisung"),
      pick("„Was fehlt Ihnen?“ =", ["What are you missing?", "What's wrong with you?", "Where does it hurt?"], 1),
      gap("Haben Sie Ihre ___ dabei? (health insurance card)", "Versichertenkarte", "Krankenkassenkarte", "Gesundheitskarte"),
      gap("Ich habe 39 Grad ___. (fever)", "Fieber"),
    ]),
  },
  "Pharmacy & medicine": {
    learningOutcome: "I can buy medicine and understand how to take it.",
    resourceBody:
      "die Apotheke · das Medikament, -e · die Tablette, -n · der Saft (syrup) · die Salbe (ointment) · die Tropfen (drops) · das Pflaster (plaster)\n" +
      "rezeptpflichtig (prescription only) · rezeptfrei (over the counter) · die Packungsbeilage (leaflet) · die Nebenwirkung (side effect)\n" +
      "dreimal täglich · vor / nach dem Essen · auf nüchternen Magen (on an empty stomach) · mit Wasser einnehmen\n" +
      "Haben Sie etwas gegen Kopfschmerzen? · Nehmen Sie zweimal täglich eine Tablette nach dem Essen.",
    guidedPractice: "Ask for something against a cold and repeat the instructions back.",
    ...checks("Ergänze.", [
      gap("Haben Sie etwas ___ Halsschmerzen? (against)", "gegen"),
      gap("Nehmen Sie die Tabletten dreimal ___. (daily)", "täglich"),
      pick("rezeptfrei =", ["needs a prescription", "no prescription needed", "free of charge"], 1),
      gap("Lesen Sie bitte die ___: Dort stehen die Nebenwirkungen. (leaflet)", "Packungsbeilage"),
      gap("Für die Wunde brauche ich ein ___. (plaster)", "Pflaster"),
      pick("„nach dem Essen einnehmen“ =", ["take before eating", "take after eating", "take instead of eating"], 1),
    ]),
  },
  "Krankmeldung & insurance basics": {
    learningOutcome: "I can call in sick correctly and understand the basic insurance words.",
    resourceBody:
      "sich krankmelden: call your employer before work starts on day 1.\n" +
      "die Arbeitsunfähigkeitsbescheinigung (AU, sick note) from the doctor — usually needed from day 4 (or earlier if the contract says so); today it is sent electronically (eAU), you just have to go to the doctor.\n" +
      "die Krankenkasse (health insurer) · gesetzlich (public) / privat versichert · der Beitrag (contribution) · die Lohnfortzahlung (employer pays up to 6 weeks)\n" +
      "Ich bin krank und kann heute nicht kommen. · Ich bin bis Freitag krankgeschrieben.",
    guidedPractice: "Say your sick call in full: who you are, that you're ill, how long, and that the AU follows.",
    ...checks("Ergänze / wähle.", [
      gap("Ich muss mich heute bei meinem Chef ___. (report sick — one word)", "krankmelden"),
      gap("Der Arzt hat mich bis Freitag ___. (put on sick leave)", "krankgeschrieben"),
      pick("When do you tell your employer you are ill?", ["after 3 days", "on the first day, before work starts", "when you're back"], 1),
      pick("Die „Krankenkasse“ is …", ["a hospital", "the health insurance fund", "a pharmacy"], 1),
      gap("Die Arbeitsunfähigkeitsbescheinigung heißt kurz ___.", "AU"),
      pick("Lohnfortzahlung: the employer keeps paying you for up to …", ["6 days", "6 weeks", "6 months"], 1),
    ]),
  },
  "Apartment search": {
    learningOutcome: "I can understand and use the words of a flat search.",
    resourceBody:
      "die Wohnung · das Zimmer · die WG (Wohngemeinschaft, flat share) · die Anzeige (ad) · der Vermieter / die Vermieterin (landlord) · der Makler (agent)\n" +
      "die Besichtigung (viewing) · möbliert (furnished) · der Quadratmeter (qm/m²) · die Etage / der Stock · der Aufzug · der Balkon\n" +
      "Abbreviations: 2-Zi.-Whg. = 2-room flat · EBK = fitted kitchen · NK = extra costs · KM/WM = cold/warm rent · ab sofort = available now\n" +
      "Ich suche eine Zweizimmerwohnung. · Ist die Wohnung noch frei? · Wann kann ich sie besichtigen?",
    guidedPractice: "Write your search ad in three lines: what, where, how much, from when.",
    ...checks("Ergänze / wähle.", [
      gap("Ist die Wohnung noch ___? (available)", "frei"),
      gap("Wann ist die ___? Ich möchte die Wohnung gern sehen. (viewing)", "Besichtigung"),
      pick("„EBK“ in an ad =", ["with balcony", "fitted kitchen", "extra costs"], 1),
      pick("Eine WG is …", ["a house", "a flat share", "a hotel"], 1),
      gap("Die Wohnung ist ___ — Bett und Schrank sind schon da. (furnished)", "möbliert"),
      gap("Die Wohnung hat 60 ___. (m²)", "Quadratmeter", "qm", "m²"),
    ]),
  },
  "Rent & costs": {
    learningOutcome: "I can understand rent, extra costs and deposit.",
    resourceBody:
      "die Miete · die Kaltmiete (rent without extras) · die Nebenkosten (extras: water, rubbish, caretaker) · die Warmmiete (= Kaltmiete + Nebenkosten + heating)\n" +
      "die Kaution (deposit, max. 3 Kaltmieten) · der Strom (electricity, usually separate) · die Heizkosten · die Abrechnung (annual statement) · die Nachzahlung (back payment)\n" +
      "Die Kaltmiete beträgt 600 €, die Nebenkosten 150 €. · Strom zahle ich extra. · Die Kaution bekomme ich beim Auszug zurück.",
    guidedPractice: "Calculate a warm rent aloud: Die Kaltmiete ist …, dazu kommen … Nebenkosten, also …",
    ...checks("Ergänze / wähle.", [
      pick("Kaltmiete 700 € + Nebenkosten 180 € =", ["Warmmiete 880 €", "Kaution 880 €", "Strom 880 €"], 0),
      gap("Die ___ ist 1.500 Euro — die bekomme ich später zurück. (deposit)", "Kaution"),
      gap("___ ist nicht in der Warmmiete — den zahle ich extra. (electricity)", "Strom"),
      pick("The deposit may be at most …", ["one month's cold rent", "three months' cold rent", "six months' warm rent"], 1),
      gap("Nach der Abrechnung muss ich 90 Euro nachzahlen — das ist eine ___. (back payment)", "Nachzahlung"),
      pick("Nebenkosten include …", ["furniture", "water and rubbish collection", "the deposit"], 1),
    ]),
  },
  "Moving & living together": {
    learningOutcome: "I can talk about moving and about neighbours and house rules.",
    resourceBody:
      "umziehen (move house): Ich bin letztes Jahr umgezogen. · der Umzug · einziehen / der Einzug · ausziehen / der Auszug\n" +
      "der Nachbar / die Nachbarin · die Hausordnung (house rules) · die Ruhezeit (quiet hours, often 22–6 Uhr and Sunday) · der Hausmeister (caretaker)\n" +
      "der Müll: Restmüll · Biomüll · Papier · Gelber Sack · den Müll trennen\n" +
      "sich ummelden (register the new address, within 2 weeks) · das Bürgeramt",
    guidedPractice: "Tell a neighbour you've just moved in, ask about the quiet hours and the rubbish.",
    ...checks("Ergänze.", [
      gap("Wir ___ nächste Woche in eine größere Wohnung um. (ziehen)", "ziehen"),
      gap("Nach dem Umzug muss man sich beim Bürgeramt ___. (re-register)", "ummelden"),
      gap("Die ___ ist von 22 bis 6 Uhr — dann bitte leise sein. (quiet hours)", "Ruhezeit", "Nachtruhe"),
      gap("Die Heizung ist kaputt — ich rufe den ___ an. (caretaker)", "Hausmeister"),
      pick("„Ausziehen“ in a housing context =", ["to move out", "to move in", "to take a shower"], 0),
      gap("In der ___ steht, wann man Musik machen darf. (house rules)", "Hausordnung"),
    ]),
  },
  Banking: {
    learningOutcome: "I can handle the words for an account, cards and transfers.",
    resourceBody:
      "das Konto (account) · ein Konto eröffnen (open) · das Girokonto (current account) · die Bank · die Filiale (branch)\n" +
      "die Bankkarte / EC-Karte / Girocard · die Kreditkarte · die PIN · der Geldautomat (ATM) · Geld abheben (withdraw) · einzahlen (deposit)\n" +
      "die Überweisung (transfer) · überweisen · die IBAN · der Dauerauftrag (standing order) · die Lastschrift (direct debit) · der Kontoauszug (statement)\n" +
      "Ich möchte ein Konto eröffnen. · Die Miete zahle ich per Dauerauftrag.",
    guidedPractice: "Explain how you pay rent, phone and shopping: Dauerauftrag, Lastschrift, Karte.",
    ...checks("Ergänze.", [
      gap("Ich möchte ein Konto ___. (open)", "eröffnen"),
      gap("Am ___ hebe ich 50 Euro ab. (ATM)", "Geldautomaten", "Geldautomat", "Automaten"),
      gap("Ich ___ Ihnen das Geld heute noch. (transfer)", "überweise"),
      gap("Die Miete zahle ich jeden Monat automatisch per ___. (standing order)", "Dauerauftrag"),
      pick("„Geld abheben“ =", ["withdraw money", "deposit money", "save money"], 0),
      gap("Für eine Überweisung brauche ich Ihre ___. (account number, 4 letters)", "IBAN"),
    ]),
  },
  "Offices & paperwork": {
    learningOutcome: "I can deal with the offices and forms of everyday German bureaucracy.",
    resourceBody:
      "das Amt / die Behörde (office, authority) · das Bürgeramt (registration) · die Ausländerbehörde (immigration office) · das Jobcenter · das Finanzamt\n" +
      "das Formular (form) · ein Formular ausfüllen (fill in) · unterschreiben (sign) · die Unterschrift · der Antrag (application) · einen Antrag stellen\n" +
      "die Aufenthaltserlaubnis (residence permit) · die Anmeldebescheinigung · die Steuer-ID · der Termin · die Wartenummer · die Frist (deadline)\n" +
      "Füllen Sie bitte das Formular aus und unterschreiben Sie hier.",
    guidedPractice: "Say which office you go to for registration, residence permit and taxes.",
    ...checks("Ergänze.", [
      gap("Bitte füllen Sie das ___ aus. (form)", "Formular"),
      gap("Und hier bitte ___. (sign)", "unterschreiben"),
      gap("Für die Aufenthaltserlaubnis gehe ich zur ___. (immigration office)", "Ausländerbehörde"),
      gap("Ich muss einen ___ auf Kindergeld stellen. (application)", "Antrag"),
      pick("Die „Frist“ is …", ["the fee", "the deadline", "the waiting number"], 1),
      pick("Where do you register your address?", ["beim Finanzamt", "beim Bürgeramt", "beim Jobcenter"], 1),
    ]),
  },
  "Phone & internet": {
    learningOutcome: "I can talk about phone contracts, calls and internet.",
    resourceBody:
      "das Handy · der Handyvertrag · die Prepaidkarte · die SIM-Karte · das Guthaben (credit) · aufladen (top up) · das Datenvolumen (data)\n" +
      "der Internetanschluss (connection) · das WLAN · der Router · der Anbieter (provider) · die Laufzeit (contract term) · kündigen\n" +
      "anrufen · zurückrufen · auflegen (hang up) · die Mailbox · Ich habe keinen Empfang. (no signal) · Der Akku ist leer.\n" +
      "Der Vertrag hat eine Laufzeit von 24 Monaten.",
    guidedPractice: "Explain your phone setup: contract or prepaid, how much data, which provider.",
    ...checks("Ergänze.", [
      gap("Mein Guthaben ist leer — ich muss die Karte ___. (top up)", "aufladen"),
      gap("Hier im Keller habe ich keinen ___. (signal)", "Empfang"),
      gap("Kannst du mich später ___? (call back)", "zurückrufen"),
      gap("Der ___ ist leer, ich muss das Handy laden. (battery)", "Akku"),
      pick("„Laufzeit 24 Monate“ =", ["24 months' contract term", "24 months free", "24 GB data"], 0),
      gap("Wie ist das ___-Passwort? (Wi-Fi)", "WLAN"),
    ]),
  },
  "Expressing feelings": {
    learningOutcome: "I can say how I feel and why.",
    resourceBody:
      "froh / glücklich · traurig · wütend / sauer (angry) · nervös · gestresst · enttäuscht (disappointed) · einsam (lonely) · stolz (proud) · überrascht\n" +
      "sich freuen über/auf · sich ärgern über (be annoyed about) · Angst haben vor · sich Sorgen machen um (worry about) · Heimweh haben (be homesick)\n" +
      "Ich bin enttäuscht, weil … · Ich ärgere mich über den Lärm. · Ich mache mir Sorgen um meine Mutter. · Ich bin stolz auf dich!",
    guidedPractice: "Say three feelings from this week and give a reason for each with weil.",
    ...checks("Ergänze.", [
      gap("Ich vermisse meine Familie — ich habe ___. (homesick)", "Heimweh"),
      gap("Ich habe die Stelle nicht bekommen. Ich bin sehr ___. (disappointed)", "enttäuscht"),
      gap("Ich mache mir ___ um meinen Vater, er ist krank. (worries)", "Sorgen"),
      gap("Du hast die Prüfung bestanden? Ich bin so ___ auf dich! (proud)", "stolz"),
      gap("Ich ärgere mich ___ den Lärm von nebenan.", "über"),
      pick("„sauer“ (about a person) =", ["angry", "tired", "sad"], 0),
    ]),
  },
  "Giving opinions": {
    learningOutcome: "I can give, agree with and disagree with an opinion.",
    resourceBody:
      "Opinion: Ich finde, … · Ich glaube / denke / meine, … · Meiner Meinung nach … (+ verb next) · Für mich ist …\n" +
      "Agree: Da hast du recht. · Das stimmt. · Ich bin deiner Meinung. · Genau!\n" +
      "Disagree: Das finde ich nicht. · Da bin ich anderer Meinung. · Das stimmt nicht ganz. · Ja, aber …\n" +
      "Arguments: Ein Vorteil / Nachteil ist, dass … · einerseits … andererseits …\n" +
      "Meiner Meinung nach ist das Leben in der Stadt zu teuer.",
    guidedPractice: "Give your opinion on living in a city vs. a village, with one pro, one con and a conclusion.",
    ...checks("Ergänze / wähle.", [
      gap("Meiner ___ nach ist Fahrradfahren gesund.", "Meinung"),
      pick("Meiner Meinung nach …", ["… das ist falsch.", "… ist das falsch.", "… falsch das ist."], 1),
      gap("Da hast du ___! Ich finde das auch. (right)", "recht", "Recht"),
      gap("Da bin ich ___ Meinung. (of a different)", "anderer"),
      gap("Ein ___ ist, dass es billig ist. (advantage)", "Vorteil"),
      gap("Einerseits ist es teuer, ___ ist es sehr praktisch.", "andererseits"),
    ]),
  },
  "Invitations & celebrations": {
    learningOutcome: "I can invite, accept, decline and congratulate.",
    resourceBody:
      "die Einladung · einladen (zu) · die Feier / die Party · der Geburtstag · die Hochzeit (wedding) · Weihnachten · Silvester (New Year's Eve) · Ostern\n" +
      "Ich lade dich zu meiner Geburtstagsfeier ein. · Hast du am Samstag Zeit?\n" +
      "Accept: Gern, ich komme! · Decline: Leider kann ich nicht, weil … · Ich sage Bescheid. (I'll let you know)\n" +
      "Congratulate: Herzlichen Glückwunsch zum Geburtstag! · Alles Gute! · Frohe Weihnachten! · Guten Rutsch! (for New Year)",
    guidedPractice: "Invite a colleague to a party, then decline an invitation politely with a reason.",
    ...checks("Ergänze / wähle.", [
      gap("Ich ___ dich zu meiner Party ein. (einladen)", "lade"),
      gap("Herzlichen ___ zum Geburtstag!", "Glückwunsch"),
      pick("What do you say on 31 December?", ["Frohe Ostern!", "Guten Rutsch!", "Gute Besserung!"], 1),
      pick("Polite decline:", ["Nein.", "Leider kann ich nicht, ich muss arbeiten.", "Keine Lust."], 1),
      gap("Meine Schwester heiratet — ich gehe zur ___. (wedding)", "Hochzeit"),
      gap("Ich weiß es noch nicht, ich sage dir morgen ___. (let you know)", "Bescheid"),
    ]),
  },
  "Eating out": {
    learningOutcome: "I can book a table, order, complain and pay in a restaurant.",
    resourceBody:
      "einen Tisch reservieren (für vier Personen, um 19 Uhr) · die Speisekarte · die Vorspeise (starter) · das Hauptgericht (main) · die Nachspeise / der Nachtisch\n" +
      "vegetarisch · scharf (spicy) · Was empfehlen Sie? · Ich nehme … · Ich hätte gern …\n" +
      "Complain: Das Essen ist kalt. · Das habe ich nicht bestellt.\n" +
      "Pay: Die Rechnung, bitte. · Zusammen oder getrennt? · Stimmt so. (keep the change) · das Trinkgeld (tip, ~5–10 %)",
    guidedPractice: "Book a table by phone, then order a starter, main course and drink.",
    ...checks("Ergänze.", [
      gap("Ich möchte einen Tisch für vier Personen ___. (book)", "reservieren"),
      gap("Als ___ nehme ich eine Suppe. (starter)", "Vorspeise"),
      gap("Was ___ Sie? — Der Fisch ist heute sehr gut. (recommend)", "empfehlen"),
      pick("„Zusammen oder getrennt?“ asks …", ["if you want to sit together", "if you pay together or separately", "if you want dessert"], 1),
      gap("Das Essen ist sehr ___ — zu viel Chili! (spicy)", "scharf"),
      gap("Ich gebe zehn Prozent ___. (tip)", "Trinkgeld"),
    ]),
  },
  "Holidays & booking": {
    learningOutcome: "I can book a trip and a room and talk about holidays.",
    resourceBody:
      "der Urlaub · die Reise · buchen (book) · die Buchung · das Reisebüro · die Unterkunft (accommodation) · die Ferienwohnung · die Jugendherberge\n" +
      "das Einzelzimmer / Doppelzimmer · mit Frühstück / Halbpension · die Übernachtung (night) · einchecken / auschecken · stornieren (cancel)\n" +
      "Ich möchte ein Doppelzimmer für drei Nächte buchen. · Ist das Frühstück inklusive? · Ich muss die Buchung leider stornieren.",
    guidedPractice: "Book a room by phone: dates, type of room, breakfast, price.",
    ...checks("Ergänze.", [
      gap("Ich möchte ein ___ für zwei Personen. (double room)", "Doppelzimmer"),
      gap("Eine ___ kostet 85 Euro. (one night's stay)", "Übernachtung"),
      gap("Ist das Frühstück ___? (included)", "inklusive", "inbegriffen"),
      gap("Ich bin krank und muss die Buchung ___. (cancel)", "stornieren"),
      pick("„Halbpension“ =", ["breakfast + dinner", "only breakfast", "half price"], 0),
      gap("Bis wann muss ich morgen ___? (check out)", "auschecken"),
    ]),
  },
  "Nature & recycling": {
    learningOutcome: "I can talk about nature, the environment and sorting rubbish.",
    resourceBody:
      "die Natur · die Umwelt (environment) · der Wald · der See · der Berg · das Klima · die Luft · der Umweltschutz (protection)\n" +
      "der Müll / Abfall · Müll trennen (sort) · die Mülltonne · der Restmüll · der Biomüll · das Altpapier · der Gelbe Sack / die Gelbe Tonne (packaging) · der Glascontainer\n" +
      "das Pfand (deposit on bottles, 25 ct) · die Pfandflasche · sparen (Energie / Wasser sparen) · wegwerfen\n" +
      "Joghurtbecher kommen in den Gelben Sack, Zeitungen ins Altpapier, Kartoffelschalen in den Biomüll.",
    guidedPractice: "Walk through your kitchen: which bin gets what?",
    ...checks("Wohin kommt das? / Ergänze.", [
      pick("eine leere Joghurtverpackung →", ["Biomüll", "Gelber Sack", "Altpapier"], 1),
      pick("Kartoffelschalen und Apfelreste →", ["Biomüll", "Glascontainer", "Gelber Sack"], 0),
      pick("alte Zeitungen →", ["Restmüll", "Altpapier", "Biomüll"], 1),
      gap("Für die Flasche bekomme ich 25 Cent ___ zurück. (deposit)", "Pfand"),
      gap("In Deutschland muss man den Müll ___. (sort)", "trennen"),
      gap("Wir müssen die ___ schützen. (environment)", "Umwelt", "Natur"),
    ]),
  },
};

// ── reading ──────────────────────────────────────────────────────────────────

const READING: Record<string, Authored> = {
  "Ads & short articles": read(
    "Kleinanzeigen",
    "1) Verkaufe Kinderfahrrad, 20 Zoll, blau, kaum benutzt, 60 €. Nur Abholung in Mainz-Kastel. Tel. 0176 4418 203 (ab 18 Uhr).\n\n" +
      "2) Nachhilfe in Mathe und Englisch für Schüler der Klassen 5–10. Studentin, erfahren und geduldig. 15 € pro Stunde. Auch online möglich. E-Mail: lena.mathe@web.de\n\n" +
      "3) Suche Mitfahrgelegenheit von Frankfurt nach Köln am Freitag, 14. Juni, morgens. Beteilige mich an den Benzinkosten. Nichtraucher. Bitte SMS an 0151 2290 877.\n\n" +
      "4) Stadtbibliothek: Ab 1. Juli neue Öffnungszeiten. Die Bibliothek ist dann montags geschlossen, dafür samstags von 10 bis 16 Uhr geöffnet. Die Ausleihe bleibt kostenlos.",
    [
      gap("Das Fahrrad kostet ___ Euro.", "60"),
      pick("Wann soll man wegen des Fahrrads anrufen?", ["vormittags", "ab 18 Uhr", "am Wochenende"], 1),
      pick("Anzeige 2: Die Nachhilfe gibt es …", ["nur zu Hause", "auch online", "nur für Klasse 11–13"], 1),
      gap("Die Person in Anzeige 3 möchte nach ___ fahren.", "Köln"),
      pick("Was ändert sich in der Bibliothek?", ["Sie ist montags zu und samstags offen.", "Die Ausleihe kostet Geld.", "Sie schließt im Juli."], 0),
      pick("Die Person in Anzeige 3 …", ["bietet eine Fahrt an", "sucht eine Fahrt und zahlt für Benzin mit", "verkauft ein Auto"], 1),
    ],
    "I can find the key facts in small ads and short notices.",
  ),
  "Read a semi-formal email": read(
    "E-Mail an die Kursleiterin",
    "Liebe Frau Hoffmann,\n\nleider kann ich am Donnerstag nicht zum Unterricht kommen, weil ich einen Termin bei der Ausländerbehörde habe. Der Termin ist um 10:30 Uhr und ich weiß nicht, wie lange es dauert.\n\nKönnten Sie mir bitte sagen, welche Seiten wir im Buch machen? Dann kann ich die Aufgaben zu Hause machen. Außerdem möchte ich fragen, ob die Prüfung wirklich am 12. Mai ist oder ob sich das Datum geändert hat.\n\nVielen Dank im Voraus!\n\nViele Grüße\nAhmed Karimi",
    [
      pick("Warum schreibt Ahmed?", ["Er ist krank.", "Er hat einen Termin bei einer Behörde.", "Er möchte den Kurs wechseln."], 1),
      gap("Der Termin ist um ___ Uhr.", "10:30", "10.30"),
      pick("Was möchte Ahmed wissen? (1)", ["welche Seiten die Klasse macht", "wo die Behörde ist", "wie viel der Kurs kostet"], 0),
      gap("Die Prüfung ist vielleicht am 12. ___.", "Mai"),
      pick("Wie beginnt die E-Mail?", ["Sehr geehrte Frau Hoffmann", "Liebe Frau Hoffmann", "Hallo Frau Hoffmann"], 1),
      pick("Ahmed will die Aufgaben …", ["nicht machen", "zu Hause machen", "am Freitag abgeben"], 1),
    ],
    "I can understand the reason and the questions in a semi-formal email.",
  ),
  "Read a short apartment listing": read(
    "Wohnungsanzeige",
    "Helle 2-Zi.-Whg. in Nürnberg-Gostenhof, 3. OG ohne Aufzug, 58 m², Wohnküche mit EBK, Bad mit Wanne, Südbalkon. Ruhige Lage, 5 Min. zur U-Bahn. KM 690 €, NK 170 €, Kaution 2 Monatskaltmieten. Frei ab 1.8. Haustiere nicht erlaubt. Besichtigung am Samstag, 13. Juli, 11–12 Uhr. Kontakt: Hausverwaltung Brandt, Tel. 0911 5673 20.",
    [
      gap("Die Wohnung hat ___ Quadratmeter.", "58"),
      pick("In welchem Stock liegt die Wohnung?", ["im Erdgeschoss", "im 3. Stock", "im 5. Stock"], 1),
      pick("Gibt es einen Aufzug?", ["ja", "nein", "Das steht nicht im Text."], 1),
      pick("Wie hoch ist die Warmmiete ohne Strom?", ["690 €", "860 €", "1.380 €"], 1),
      gap("Die Kaution ist ___ Monatskaltmieten.", "2", "zwei"),
      pick("Ein Mann mit Hund …", ["kann die Wohnung mieten", "darf den Hund nicht mitbringen", "muss mehr Kaution zahlen"], 1),
    ],
    "I can read a flat ad with its abbreviations and work out the costs.",
  ),
  "Read a doctor's note": read(
    "Hinweise von Dr. Yilmaz",
    "Patientin: Maria Lopez\nDiagnose: Bronchitis\n\nSie sind vom 3. bis zum 9. März arbeitsunfähig. Die Arbeitsunfähigkeitsbescheinigung wird elektronisch an Ihre Krankenkasse geschickt.\n\nMedikamente: Hustensaft dreimal täglich 10 ml nach dem Essen. Antibiotikum: morgens und abends eine Tablette, sieben Tage lang — bitte auch nehmen, wenn es Ihnen schon besser geht.\n\nTrinken Sie viel (Tee, Wasser), bleiben Sie zu Hause und rauchen Sie nicht. Wenn das Fieber über 39 Grad steigt, kommen Sie bitte sofort wieder in die Praxis. Kontrolltermin: Montag, 10. März, 8:15 Uhr.",
    [
      gap("Maria hat eine ___.", "Bronchitis"),
      gap("Sie ist bis zum ___. März krankgeschrieben.", "9"),
      pick("Wie oft nimmt sie den Hustensaft?", ["einmal täglich", "zweimal täglich", "dreimal täglich"], 2),
      pick("Das Antibiotikum nimmt sie …", ["bis es ihr besser geht", "sieben Tage lang", "nur abends"], 1),
      pick("Wann soll sie sofort in die Praxis kommen?", ["bei Fieber über 39 Grad", "wenn sie hustet", "am Wochenende"], 0),
      pick("Die AU-Bescheinigung …", ["bringt Maria zur Krankenkasse", "schickt die Praxis elektronisch", "braucht sie nicht"], 1),
    ],
    "I can understand the dates, doses and warnings on a doctor's note.",
  ),
  "Read a bank statement or account summary": read(
    "Kontoauszug Juni",
    "Girokonto Nr. DE44 5001 0517 0012 3456 78 — Kontoinhaber: Kofi Mensah\nAlter Kontostand 01.06.: 412,50 €\n\n01.06. Gehalt Firma Brenner GmbH +2.150,00 €\n02.06. Dauerauftrag Miete Wohnbau Süd −780,00 €\n05.06. Lastschrift Stadtwerke (Strom) −62,00 €\n09.06. Kartenzahlung REWE −47,35 €\n14.06. Geldautomat Sparkasse Am Markt −100,00 €\n20.06. Lastschrift Handyvertrag −19,99 €\n27.06. Überweisung von Ama Mensah +50,00 €\n\nNeuer Kontostand 30.06.: 1.603,16 €",
    [
      gap("Kofi bekommt sein Gehalt von der Firma ___.", "Brenner", "Brenner GmbH"),
      gap("Die Miete ist ___ Euro.", "780", "780,00"),
      pick("Wie bezahlt Kofi den Strom?", ["per Lastschrift", "bar", "per Kreditkarte"], 0),
      pick("Was hat Kofi am 14.06. gemacht?", ["Geld eingezahlt", "Geld abgehoben", "im Supermarkt bezahlt"], 1),
      pick("Wer hat Kofi 50 Euro überwiesen?", ["die Stadtwerke", "Ama Mensah", "die Firma Brenner"], 1),
      pick("Der Kontostand am Ende des Monats ist …", ["höher als am Anfang", "niedriger als am Anfang", "gleich"], 0),
    ],
    "I can read the incomings, outgoings and balance on a bank statement.",
  ),
  "Read a short news article": read(
    "Neue Radwege in Freiburg",
    "Freiburg. Die Stadt Freiburg baut in diesem Jahr zwölf Kilometer neue Radwege. Das hat der Bürgermeister am Montag erklärt. Die Arbeiten beginnen im April und sollen im November fertig sein. Die Kosten liegen bei 4,5 Millionen Euro; die Hälfte bezahlt das Land Baden-Württemberg. Schon heute fahren in Freiburg mehr als 30 Prozent der Menschen mit dem Fahrrad zur Arbeit. Autofahrer müssen während der Bauarbeiten mit Staus rechnen, besonders in der Innenstadt. Nicht alle sind zufrieden: Einige Geschäfte in der Altstadt haben Angst, dass weniger Kunden kommen.",
    [
      gap("Die Stadt baut ___ Kilometer neue Radwege.", "zwölf", "12"),
      gap("Die Arbeiten sollen im ___ fertig sein.", "November"),
      pick("Wer bezahlt die Hälfte der Kosten?", ["die Stadt", "das Land Baden-Württemberg", "die Geschäfte"], 1),
      pick("Wie viele Menschen fahren schon mit dem Rad zur Arbeit?", ["weniger als 10 %", "mehr als 30 %", "die Hälfte"], 1),
      pick("Was ist ein Problem während der Bauarbeiten?", ["Staus in der Innenstadt", "keine Busse", "hohe Mieten"], 0),
      pick("Warum sind einige Geschäfte unzufrieden?", ["Sie müssen mitbezahlen.", "Sie haben Angst vor weniger Kunden.", "Sie wollen mehr Parkplätze bauen."], 1),
    ],
    "I can pick out who, what, when and how much in a short news report.",
  ),
  "Read an opinion column": read(
    "Meine Meinung: Brauchen Kinder ein Handy?",
    "Viele Eltern fragen sich: Ab wann braucht ein Kind ein Handy? Meine Tochter ist neun, und fast alle Kinder in ihrer Klasse haben schon eins. Einerseits ist ein Handy praktisch: Das Kind kann die Eltern anrufen, wenn der Bus nicht kommt. Andererseits sitzen viele Kinder stundenlang vor dem Bildschirm und spielen weniger draußen. Meiner Meinung nach reicht für Grundschulkinder ein einfaches Handy ohne Internet. Ein Smartphone sollten Kinder erst mit zwölf Jahren bekommen — und dann mit klaren Regeln, zum Beispiel: kein Handy beim Essen und nicht nach 20 Uhr.\n— Sabine Krüger, Mutter und Lehrerin",
    [
      gap("Die Tochter der Autorin ist ___ Jahre alt.", "neun", "9"),
      pick("Ein Vorteil laut Text:", ["Kinder lernen besser.", "Das Kind kann die Eltern anrufen.", "Handys sind billig."], 1),
      pick("Ein Nachteil laut Text:", ["Kinder spielen weniger draußen.", "Handys gehen oft kaputt.", "Die Schule verbietet Handys."], 0),
      pick("Was denkt die Autorin über Grundschulkinder?", ["Sie brauchen ein Smartphone.", "Ein einfaches Handy ohne Internet reicht.", "Sie brauchen gar kein Handy."], 1),
      gap("Ein Smartphone erst mit ___ Jahren.", "zwölf", "12"),
      pick("Welche Regel nennt sie?", ["kein Handy in der Schule", "kein Handy beim Essen", "nur eine Stunde am Tag"], 1),
    ],
    "I can tell the writer's opinion from the arguments for and against.",
  ),
  "Read a travel brochure": read(
    "Rügen — Urlaub an der Ostsee",
    "Die Insel Rügen ist Deutschlands größte Insel. Hier finden Sie lange Sandstrände, weiße Kreidefelsen und ruhige Wälder. Unser Angebot: 5 Nächte im Hotel Seeblick in Binz, Doppelzimmer mit Meerblick, Halbpension, ab 489 € pro Person. Kinder unter 6 Jahren übernachten kostenlos. Inklusive: Fahrradverleih und eine Schifffahrt zu den Kreidefelsen. Die Anreise ist bequem mit dem Zug über Stralsund. Beste Reisezeit: Mai bis September. Buchung im Reisebüro Sonnenschein oder online.",
    [
      pick("Rügen ist …", ["eine Stadt", "eine Insel", "ein Berg"], 1),
      gap("Das Hotel liegt in ___.", "Binz"),
      gap("Das Angebot kostet ab ___ Euro pro Person.", "489"),
      pick("Was ist im Preis inklusive?", ["Mittagessen", "Fahrradverleih und eine Schifffahrt", "die Zugfahrt"], 1),
      pick("Kinder unter 6 Jahren …", ["zahlen die Hälfte", "übernachten kostenlos", "dürfen nicht mitkommen"], 1),
      pick("„Halbpension“ heißt hier:", ["Frühstück und Abendessen", "nur Frühstück", "halber Preis"], 0),
    ],
    "I can find price, inclusions and travel details in a brochure.",
  ),
  "Read a complaint letter": read(
    "Beschwerde",
    "Sehr geehrte Damen und Herren,\n\nam 3. Mai habe ich in Ihrem Online-Shop eine Kaffeemaschine (Modell Aroma 300) für 129 Euro bestellt. Die Lieferung ist erst am 17. Mai gekommen, also zwei Wochen später als versprochen. Leider funktioniert die Maschine nicht: Das Wasser wird nicht heiß. Außerdem war der Karton beschädigt.\n\nIch möchte die Maschine zurückschicken und bitte Sie, mir den Kaufpreis zu erstatten. Bitte schicken Sie mir ein Rücksendeetikett.\n\nMit freundlichen Grüßen\nElena Petrova",
    [
      gap("Elena hat eine ___ bestellt.", "Kaffeemaschine"),
      gap("Die Maschine hat ___ Euro gekostet.", "129"),
      pick("Wann ist die Lieferung gekommen?", ["pünktlich", "eine Woche zu spät", "zwei Wochen zu spät"], 2),
      pick("Was ist das Problem mit der Maschine?", ["Sie ist zu laut.", "Das Wasser wird nicht heiß.", "Sie hat die falsche Farbe."], 1),
      pick("Was möchte Elena?", ["eine neue Maschine", "ihr Geld zurück", "einen Gutschein"], 1),
      pick("Was soll der Shop schicken?", ["ein Rücksendeetikett", "eine Rechnung", "einen Techniker"], 0),
    ],
    "I can understand what went wrong and what the writer wants in a complaint.",
  ),
  "Read an invitation": read(
    "Einladung zum Sommerfest",
    "Liebe Nachbarinnen und Nachbarn,\n\nwir laden Sie herzlich zu unserem Sommerfest im Hof der Lindenstraße 12 ein! Es findet am Samstag, 22. Juni, ab 15 Uhr statt. Für Kinder gibt es Spiele und ein Kinderschminken. Um 18 Uhr machen wir den Grill an. Getränke und Würstchen gibt es von uns — bitte bringen Sie einen Salat oder einen Kuchen mit. Bei Regen feiern wir im Gemeinschaftsraum im Keller.\n\nBitte sagen Sie bis zum 15. Juni Bescheid, ob Sie kommen, und schreiben Sie Ihren Namen auf die Liste im Treppenhaus.\n\nIhre Hausgemeinschaft",
    [
      gap("Das Fest ist am Samstag, 22. ___.", "Juni"),
      gap("Das Fest beginnt um ___ Uhr.", "15"),
      pick("Was sollen die Gäste mitbringen?", ["Getränke", "einen Salat oder einen Kuchen", "Würstchen"], 1),
      pick("Was passiert, wenn es regnet?", ["Das Fest fällt aus.", "Man feiert im Keller.", "Man feiert eine Woche später."], 1),
      pick("Wie sagt man zu?", ["per E-Mail", "auf der Liste im Treppenhaus", "beim Hausmeister"], 1),
      gap("Man soll bis zum ___. Juni Bescheid sagen.", "15"),
    ],
    "I can find the time, place and what's expected from me in an invitation.",
  ),
  "Read a report of a past event": read(
    "Unser Betriebsausflug",
    "Am letzten Freitag hat unsere Firma einen Ausflug an den Bodensee gemacht. Um 7 Uhr sind wir mit dem Bus in Stuttgart losgefahren. Zuerst haben wir in Meersburg die Burg besichtigt, dann sind wir mit dem Schiff zur Insel Mainau gefahren. Dort haben wir im Restaurant zu Mittag gegessen und danach den großen Blumenpark angesehen. Am Nachmittag hat es leider stark geregnet, deshalb sind wir früher als geplant zurückgefahren. Trotzdem waren alle zufrieden. Um 19 Uhr waren wir wieder in Stuttgart. Nächstes Jahr möchten wir nach München fahren.",
    [
      gap("Die Firma ist an den ___ gefahren.", "Bodensee"),
      gap("Der Bus ist um ___ Uhr losgefahren.", "7", "sieben"),
      pick("Was haben sie in Meersburg gemacht?", ["die Burg besichtigt", "zu Mittag gegessen", "einen Blumenpark gesehen"], 0),
      pick("Wie sind sie zur Insel Mainau gekommen?", ["mit dem Bus", "mit dem Schiff", "zu Fuß"], 1),
      pick("Warum sind sie früher zurückgefahren?", ["Der Bus war kaputt.", "Es hat stark geregnet.", "Alle waren müde."], 1),
      gap("Nächstes Jahr möchten sie nach ___ fahren.", "München"),
    ],
    "I can follow the order of events in a report written in the past.",
  ),
  "Read a comparison of two products": read(
    "Test: zwei Staubsauger",
    "Der Clean X ist mit 89 Euro billiger als der PowerMax (149 Euro). Der PowerMax ist aber leiser und saugt besser, besonders auf Teppichen. Der Clean X ist leichter — nur 3 Kilo, der PowerMax wiegt 5 Kilo. Beide Geräte haben ein Kabel; der Akku-Staubsauger ist in diesem Test nicht dabei. Die Garantie ist beim PowerMax mit fünf Jahren länger als beim Clean X (zwei Jahre). Unser Fazit: Für eine kleine Wohnung ohne Teppich reicht der Clean X. Wer viele Teppiche hat, sollte lieber den PowerMax kaufen.",
    [
      pick("Welcher Staubsauger ist billiger?", ["der Clean X", "der PowerMax", "beide kosten gleich viel"], 0),
      pick("Welcher ist leiser?", ["der Clean X", "der PowerMax"], 1),
      gap("Der Clean X wiegt nur ___ Kilo.", "3", "drei"),
      gap("Die Garantie beim PowerMax ist ___ Jahre.", "fünf", "5"),
      pick("Für wen ist der Clean X gut?", ["für eine große Wohnung mit Teppichen", "für eine kleine Wohnung ohne Teppich", "für Büros"], 1),
      pick("Richtig oder falsch? „Der PowerMax ist ein Akku-Staubsauger.“", ["richtig", "falsch"], 1),
    ],
    "I can follow a comparison with comparatives and see which product wins where.",
  ),
  "Read a recycling guide": read(
    "Mülltrennung — so geht's",
    "Gelbe Tonne: Verpackungen aus Plastik und Metall, z. B. Joghurtbecher, Konservendosen, Folien. Bitte leer, aber nicht spülen.\n" +
      "Blaue Tonne (Papier): Zeitungen, Kartons, Papiertüten. Keine Taschentücher und kein Backpapier!\n" +
      "Braune Tonne (Bio): Obst- und Gemüsereste, Kaffeesatz, Eierschalen, Gartenabfälle. Kein Fleisch, keine Plastiktüten.\n" +
      "Schwarze Tonne (Restmüll): Taschentücher, Windeln, Staubsaugerbeutel, Backpapier.\n" +
      "Glas: in den Container — weiß, grün und braun getrennt. Einwurf nur werktags von 7 bis 20 Uhr.\n" +
      "Batterien und Elektrogeräte gehören nicht in die Tonne: Bringen Sie sie zum Wertstoffhof.",
    [
      pick("Konservendosen gehören in die …", ["gelbe Tonne", "blaue Tonne", "schwarze Tonne"], 0),
      pick("Benutzte Taschentücher gehören in die …", ["blaue Tonne", "braune Tonne", "schwarze Tonne"], 2),
      gap("Eierschalen kommen in die ___ Tonne.", "braune"),
      pick("Darf man Glas am Sonntag einwerfen?", ["ja", "nein"], 1),
      gap("Alte Batterien bringt man zum ___.", "Wertstoffhof"),
      pick("Joghurtbecher muss man …", ["spülen", "nicht spülen, nur leer machen", "in den Biomüll werfen"], 1),
    ],
    "I can use a sorting guide to decide which bin something goes in.",
  ),
  "Read a work schedule": read(
    "Dienstplan Pflegestation 3, KW 24",
    "Mo: Früh (6–14 Uhr): Anna, Jonas · Spät (14–22 Uhr): Mehmet, Lisa · Nacht (22–6 Uhr): Olga\n" +
      "Di: Früh: Anna, Lisa · Spät: Jonas, Mehmet · Nacht: Olga\n" +
      "Mi: Früh: Mehmet, Lisa · Spät: Anna, Jonas · Nacht: Peter\n" +
      "Do: Früh: Mehmet, Jonas · Spät: Anna, Lisa · Nacht: Peter\n" +
      "Fr: Früh: Anna, Mehmet · Spät: Lisa, Peter · Nacht: Olga\n\n" +
      "Hinweis: Jonas hat am Freitag Urlaub. Tausch nur nach Absprache mit der Stationsleitung (Frau Berger). Teambesprechung am Mittwoch um 13:30 Uhr — Frühschicht und Spätschicht bitte beide teilnehmen.",
    [
      pick("Wann arbeitet Olga am Montag?", ["Frühschicht", "Spätschicht", "Nachtschicht"], 2),
      gap("Die Spätschicht beginnt um ___ Uhr.", "14"),
      pick("Wer arbeitet am Mittwoch in der Nachtschicht?", ["Olga", "Peter", "Lisa"], 1),
      pick("Warum arbeitet Jonas am Freitag nicht?", ["Er ist krank.", "Er hat Urlaub.", "Er hat getauscht."], 1),
      gap("Wer eine Schicht tauschen will, fragt Frau ___.", "Berger"),
      pick("Wann ist die Teambesprechung?", ["Montag 13:30", "Mittwoch 13:30", "Freitag 14:00"], 1),
    ],
    "I can read a shift plan and find who works when.",
  ),
  "Read a short biography covering the past": read(
    "Eine Frau, die Geschichte schrieb: Lise Meitner",
    "Lise Meitner wurde 1878 in Wien geboren. Damals durften Mädchen in Österreich nicht das Gymnasium besuchen, deshalb hat sie privat gelernt. 1901 hat sie an der Universität Wien Physik studiert. 1907 ist sie nach Berlin gegangen und hat dort über 30 Jahre mit dem Chemiker Otto Hahn zusammengearbeitet. 1938 musste sie Deutschland verlassen, weil sie jüdische Wurzeln hatte. Sie ist nach Schweden geflohen. Dort hat sie erklärt, wie die Kernspaltung funktioniert. Den Nobelpreis dafür hat 1945 aber nur Otto Hahn bekommen. Lise Meitner ist 1968 in England gestorben.",
    [
      gap("Lise Meitner wurde in ___ geboren.", "Wien"),
      pick("Warum hat sie privat gelernt?", ["Sie war krank.", "Mädchen durften nicht aufs Gymnasium.", "Die Schule war zu teuer."], 1),
      gap("Sie hat ___ studiert.", "Physik"),
      gap("Sie hat mit Otto ___ zusammengearbeitet.", "Hahn"),
      pick("Wohin ist sie 1938 geflohen?", ["nach England", "nach Schweden", "nach Österreich"], 1),
      pick("Wer hat 1945 den Nobelpreis bekommen?", ["Lise Meitner", "Otto Hahn", "beide"], 1),
    ],
    "I can follow a life story told in the Perfekt and Präteritum.",
  ),
  "Read a restaurant review": read(
    "Bewertung: Trattoria da Luca ★★★☆☆",
    "Wir waren am Samstagabend zu viert in der Trattoria da Luca. Wir hatten reserviert, trotzdem mussten wir zwanzig Minuten auf unseren Tisch warten. Das Essen war aber sehr gut: Die Pizza war dünn und knusprig, die Lasagne hausgemacht. Nur die Pasta mit Meeresfrüchten war leider etwas zu salzig. Der Kellner war freundlich, aber sehr langsam, weil das Restaurant voll war. Die Preise sind fair: Eine Pizza kostet zwischen 9 und 13 Euro. Mein Tipp: Unter der Woche kommen, dann ist es ruhiger. Zum Nachtisch unbedingt das Tiramisu probieren!",
    [
      pick("Wie viele Personen waren im Restaurant?", ["zwei", "vier", "sechs"], 1),
      gap("Sie mussten ___ Minuten auf den Tisch warten.", "zwanzig", "20"),
      pick("Welches Essen war nicht so gut?", ["die Pizza", "die Lasagne", "die Pasta mit Meeresfrüchten"], 2),
      pick("Warum war der Kellner langsam?", ["Er war neu.", "Das Restaurant war voll.", "Er war unfreundlich."], 1),
      gap("Zum Nachtisch soll man das ___ probieren.", "Tiramisu"),
      pick("Der Tipp des Autors:", ["am Wochenende kommen", "unter der Woche kommen", "nicht reservieren"], 1),
    ],
    "I can separate the good and the bad points in a review.",
  ),
  "Read a housing contract excerpt": read(
    "Aus dem Mietvertrag",
    "§ 3 Miete: Die monatliche Kaltmiete beträgt 720 Euro. Dazu kommt eine Vorauszahlung für Nebenkosten und Heizung von 190 Euro. Die Miete ist bis zum dritten Werktag des Monats auf das Konto des Vermieters zu überweisen.\n" +
      "§ 4 Kaution: Der Mieter zahlt eine Kaution von 2.160 Euro. Sie kann in drei Monatsraten gezahlt werden.\n" +
      "§ 7 Kündigung: Der Mieter kann mit einer Frist von drei Monaten kündigen. Die Kündigung muss schriftlich erfolgen.\n" +
      "§ 9 Haustiere: Kleine Tiere (z. B. Fische, Hamster) sind erlaubt. Für Hunde und Katzen braucht der Mieter die Erlaubnis des Vermieters.\n" +
      "§ 11 Schönheitsreparaturen: Beim Auszug muss die Wohnung sauber und ohne Schäden übergeben werden.",
    [
      gap("Die Kaltmiete beträgt ___ Euro.", "720"),
      pick("Bis wann muss die Miete bezahlt sein?", ["bis zum 1. des Monats", "bis zum dritten Werktag", "bis zum Monatsende"], 1),
      pick("Die Kaution kann man …", ["nur auf einmal zahlen", "in drei Raten zahlen", "bar beim Einzug zahlen"], 1),
      gap("Die Kündigungsfrist ist ___ Monate.", "drei", "3"),
      pick("Wie muss man kündigen?", ["per Telefon", "schriftlich", "persönlich"], 1),
      pick("Darf man eine Katze haben?", ["ja, immer", "nur mit Erlaubnis des Vermieters", "nein, nie"], 1),
    ],
    "I can find rent, deposit, notice period and rules in a rental contract.",
  ),
  "Read a phone or internet contract": read(
    "Tarifübersicht: FlexNet 100",
    "Internet-Flatrate mit bis zu 100 MBit/s. Monatlicher Preis: in den ersten 12 Monaten 24,99 €, danach 39,99 €. Mindestlaufzeit: 24 Monate. Einmaliger Anschlusspreis: 69,99 € (entfällt bei Online-Bestellung). Der WLAN-Router ist für 4,99 € im Monat mietbar. Kündigung: nach Ende der Mindestlaufzeit monatlich möglich. Bei Umzug: Nimmt der Kunde den Vertrag mit und ist am neuen Wohnort kein Anschluss verfügbar, kann er mit einer Frist von einem Monat kündigen. Kundenservice: täglich 8–22 Uhr.",
    [
      gap("Im ersten Jahr kostet der Tarif ___ Euro im Monat.", "24,99"),
      gap("Ab dem 13. Monat kostet er ___ Euro.", "39,99"),
      gap("Die Mindestlaufzeit ist ___ Monate.", "24"),
      pick("Wann muss man den Anschlusspreis nicht zahlen?", ["bei Online-Bestellung", "im ersten Monat", "nie"], 0),
      pick("Der Router …", ["ist gratis", "kostet 4,99 € im Monat extra", "ist im Anschlusspreis enthalten"], 1),
      pick("Bei einem Umzug ohne Anschluss am neuen Ort …", ["zahlt man weiter bis zum Ende", "kann man mit einem Monat Frist kündigen", "bekommt man Geld zurück"], 1),
    ],
    "I can find the real monthly price, the term and the exit rules in a contract.",
  ),
  "Read a short story about feelings": read(
    "Der erste Winter",
    "Als Ravi im November nach Hamburg kam, war alles neu und aufregend. Aber nach ein paar Wochen wurde es dunkel und kalt, und Ravi fühlte sich einsam. Er vermisste seine Familie und das Essen seiner Mutter. Abends saß er oft allein in seinem kleinen Zimmer und hatte Heimweh. Im Deutschkurs war er nervös, weil er Angst vor Fehlern hatte. Eines Tages lud ihn seine Kollegin Frieda zu einem Spieleabend ein. Zuerst wollte er nicht gehen, aber dann ging er doch. Es war ein wunderbarer Abend: Alle waren freundlich, und er lachte viel. Auf dem Heimweg war Ravi glücklich. Zum ersten Mal fühlte sich Hamburg ein bisschen wie Zuhause an.",
    [
      gap("Ravi ist im ___ nach Hamburg gekommen.", "November"),
      pick("Wie fühlte sich Ravi nach ein paar Wochen?", ["glücklich", "einsam", "wütend"], 1),
      pick("Warum war er im Deutschkurs nervös?", ["Er hatte Angst vor Fehlern.", "Der Lehrer war streng.", "Er kam immer zu spät."], 0),
      gap("Seine Kollegin ___ lud ihn ein.", "Frieda"),
      pick("Wollte Ravi sofort zum Spieleabend gehen?", ["ja", "nein, zuerst nicht"], 1),
      pick("Wie endet die Geschichte?", ["Ravi fährt nach Hause zu seiner Familie.", "Ravi fühlt sich in Hamburg ein bisschen zu Hause.", "Ravi bleibt allein."], 1),
    ],
    "I can follow how a character's feelings change through a story.",
  ),
  "Read a public notice about weather warnings": read(
    "Unwetterwarnung für Sachsen",
    "Der Deutsche Wetterdienst warnt für Mittwoch, 14. August, vor schweren Gewittern in ganz Sachsen. Ab 15 Uhr sind Starkregen, Hagel und Sturmböen bis 100 km/h möglich. Die Warnung gilt bis Donnerstag, 6 Uhr.\n\nBitte beachten Sie: Bleiben Sie während des Gewitters in Gebäuden. Parken Sie Ihr Auto nicht unter Bäumen. Nehmen Sie Gegenstände vom Balkon, z. B. Blumentöpfe und Stühle. Meiden Sie Keller und Unterführungen, weil sie schnell voll Wasser laufen können. Die Stadtwerke Dresden schließen am Mittwoch alle Freibäder schon um 14 Uhr. Aktuelle Informationen gibt es im Radio und in der Warn-App NINA.",
    [
      pick("Wovor warnt der Wetterdienst?", ["vor Schnee", "vor schweren Gewittern", "vor Hitze"], 1),
      gap("Die Gewitter sind ab ___ Uhr möglich.", "15"),
      gap("Die Warnung gilt bis Donnerstag, ___ Uhr.", "6"),
      pick("Wo soll man das Auto nicht parken?", ["in der Garage", "unter Bäumen", "vor dem Haus"], 1),
      pick("Warum soll man Keller meiden?", ["Sie können schnell voll Wasser laufen.", "Dort gibt es keinen Handyempfang.", "Sie sind geschlossen."], 0),
      pick("Die Freibäder schließen am Mittwoch um …", ["14 Uhr", "15 Uhr", "18 Uhr"], 0),
    ],
    "I can understand what a weather warning tells me to do.",
  ),
};

// ── listening ────────────────────────────────────────────────────────────────

const LISTENING: Record<string, Authored> = {
  "Everyday conversations": listen(
    "Drei kurze Gespräche",
    "Where is each conversation, and what's the key detail?",
    "– Entschuldigung, fährt dieser Bus zum Hauptbahnhof?\n– Nein, da müssen Sie die Linie 12 nehmen. Die Haltestelle ist gleich gegenüber.\n– Danke schön!\n\n" +
      "– Guten Morgen, ich hätte gern sechs Brötchen und ein Vollkornbrot.\n– Das Vollkornbrot ist leider schon ausverkauft. Möchten Sie ein Dinkelbrot?\n– Ja, gut, dann nehme ich das.\n\n" +
      "– Hallo Frau Schulz, können Sie heute mein Paket annehmen? Ich bin erst um sieben zu Hause.\n– Natürlich, klingeln Sie einfach heute Abend bei mir.",
    [
      gap("Zum Hauptbahnhof fährt die Linie ___.", "12", "zwölf"),
      pick("Wo ist die Haltestelle?", ["gleich gegenüber", "am Bahnhof", "hinter dem Supermarkt"], 0),
      gap("Die Kundin kauft ___ Brötchen.", "sechs", "6"),
      pick("Welches Brot nimmt sie?", ["Vollkornbrot", "Dinkelbrot", "kein Brot"], 1),
      pick("Was soll Frau Schulz machen?", ["ein Paket annehmen", "ein Paket abschicken", "zur Post gehen"], 0),
    ],
    "I can follow short everyday exchanges and catch the key detail.",
  ),
  "Listen to someone talking about their past": listen(
    "Wie ich nach Deutschland kam",
    "Where did she grow up, what did she do, and when did she come?",
    "Ich bin in einem kleinen Dorf in Vietnam aufgewachsen. Nach der Schule bin ich nach Hanoi gezogen und habe dort Hotelfach gelernt. Fünf Jahre lang habe ich an der Rezeption in einem großen Hotel gearbeitet. Dort habe ich viele deutsche Gäste kennengelernt, und so habe ich angefangen, Deutsch zu lernen. 2022 bin ich dann nach Deutschland gekommen, für eine Ausbildung als Köchin in Leipzig. Am Anfang war es schwer, besonders das Wetter! Aber jetzt habe ich schon meine Prüfung bestanden und arbeite in einem Restaurant.",
    [
      pick("Wo ist sie aufgewachsen?", ["in Hanoi", "in einem Dorf in Vietnam", "in Leipzig"], 1),
      gap("Sie hat ___ Jahre an der Rezeption gearbeitet.", "fünf", "5"),
      pick("Warum hat sie Deutsch gelernt?", ["wegen der deutschen Gäste im Hotel", "in der Schule", "wegen ihres Mannes"], 0),
      gap("Sie ist ___ nach Deutschland gekommen.", "2022"),
      pick("Welche Ausbildung hat sie gemacht?", ["Hotelfachfrau", "Köchin", "Krankenpflegerin"], 1),
      pick("Was war am Anfang schwer?", ["die Arbeit", "das Wetter", "die Wohnung"], 1),
    ],
    "I can follow the stages of someone's life story in the Perfekt.",
  ),
  "Listen to people making plans": listen(
    "Kino oder Konzert?",
    "What do they decide, when and where do they meet?",
    "– Hast du am Freitag Zeit? Wir könnten ins Kino gehen.\n– Freitag geht leider nicht, da muss ich lange arbeiten. Wie wäre es mit Samstag?\n– Samstag ist gut. Aber im Kino läuft gerade nichts Interessantes. Im Stadtpark ist am Samstag ein Konzert, eine Jazzband spielt.\n– Oh, das klingt super! Wann fängt es an?\n– Um acht. Sollen wir vorher etwas essen?\n– Gute Idee. Treffen wir uns um halb sieben vor dem Café Linde?\n– Perfekt, bis Samstag!",
    [
      pick("Warum geht Freitag nicht?", ["Sie ist krank.", "Sie muss lange arbeiten.", "Sie hat schon einen Termin beim Arzt."], 1),
      pick("Was machen sie am Samstag?", ["Sie gehen ins Kino.", "Sie gehen zu einem Jazzkonzert.", "Sie gehen tanzen."], 1),
      gap("Das Konzert ist im ___.", "Stadtpark"),
      pick("Wann beginnt das Konzert?", ["um 18:30", "um 20 Uhr", "um 19 Uhr"], 1),
      gap("Sie treffen sich vor dem Café ___.", "Linde"),
      pick("Um wie viel Uhr treffen sie sich?", ["um 18:30", "um 19:30", "um 20 Uhr"], 0),
    ],
    "I can follow a conversation where people suggest, reject and agree on plans.",
  ),
  "Listen to someone comparing two things": listen(
    "Welches Handy?",
    "Which phone is better at what, and which one does he choose?",
    "Ich brauche ein neues Handy und habe zwei Modelle verglichen. Das Nova 8 kostet 299 Euro, das Stella X 449 Euro, also ist das Nova viel günstiger. Die Kamera vom Stella ist besser, das stimmt, aber ich mache nicht so viele Fotos. Wichtiger ist für mich der Akku: Beim Nova hält er fast zwei Tage, beim Stella nur einen Tag. Das Stella ist etwas leichter und schöner, aber das Nova ist robuster. Am Ende habe ich das Nova gekauft — es ist nicht so elegant wie das Stella, aber für mich ist es das beste Handy.",
    [
      gap("Das Nova 8 kostet ___ Euro.", "299"),
      pick("Welches Handy hat die bessere Kamera?", ["das Nova 8", "das Stella X"], 1),
      pick("Was ist für den Sprecher am wichtigsten?", ["die Kamera", "der Akku", "die Farbe"], 1),
      pick("Beim Nova hält der Akku …", ["einen Tag", "fast zwei Tage", "eine Woche"], 1),
      pick("Welches ist leichter?", ["das Nova 8", "das Stella X"], 1),
      pick("Welches Handy hat er gekauft?", ["das Nova 8", "das Stella X", "keins"], 0),
    ],
    "I can follow a comparison and understand the final choice.",
  ),
  "Listen to someone expressing feelings": listen(
    "Ein schwieriger Tag",
    "How does she feel, and why?",
    "– Du siehst traurig aus. Was ist los?\n– Ach, ich habe heute eine Absage bekommen. Ich hatte mich so auf die Stelle im Krankenhaus gefreut.\n– Oh nein, das tut mir leid. Hast du einen Grund bekommen?\n– Sie sagen, mein Deutsch ist noch nicht gut genug. Ich bin wirklich enttäuscht, und ein bisschen wütend auch, weil ich so viel gelernt habe.\n– Das verstehe ich. Aber du hast in den letzten Monaten so viel geschafft! Ich bin sicher, beim nächsten Mal klappt es.\n– Danke, das hilft mir. Morgen schreibe ich die nächste Bewerbung.",
    [
      pick("Was hat sie bekommen?", ["eine Zusage", "eine Absage", "eine Einladung"], 1),
      gap("Die Stelle war im ___.", "Krankenhaus"),
      pick("Welcher Grund wurde genannt?", ["Sie hat keine Erfahrung.", "Ihr Deutsch ist noch nicht gut genug.", "Die Stelle ist schon weg."], 1),
      gap("Sie ist sehr ___ und ein bisschen wütend.", "enttäuscht"),
      pick("Wie reagiert der Freund?", ["Er macht ihr Mut.", "Er kritisiert sie.", "Er lacht."], 0),
      pick("Was macht sie morgen?", ["Sie ruft das Krankenhaus an.", "Sie schreibt die nächste Bewerbung.", "Sie macht Urlaub."], 1),
    ],
    "I can understand how someone feels and the reason behind it.",
  ),
  "Listen to an opinion discussion": listen(
    "Homeoffice — ja oder nein?",
    "What does each person think, and why?",
    "– Ich finde Homeoffice super. Ich spare jeden Tag eine Stunde Fahrzeit und kann in Ruhe arbeiten.\n– Das stimmt, aber mir fehlen die Kollegen. Zu Hause bin ich oft allein, und die Kommunikation ist schwieriger.\n– Na ja, man kann ja telefonieren oder Videokonferenzen machen.\n– Das ist nicht dasselbe. Außerdem arbeite ich zu Hause oft länger, weil ich nicht aufhören kann.\n– Hm, da hast du recht, das kenne ich auch. Vielleicht ist die beste Lösung eine Mischung: zwei Tage zu Hause, drei Tage im Büro.\n– Ja, damit bin ich einverstanden.",
    [
      pick("Was ist für die erste Person ein Vorteil?", ["Sie spart Fahrzeit.", "Sie verdient mehr.", "Sie sieht die Kollegen."], 0),
      gap("Sie spart jeden Tag eine ___ Fahrzeit.", "Stunde"),
      pick("Was fehlt der zweiten Person zu Hause?", ["der Computer", "die Kollegen", "die Ruhe"], 1),
      pick("Welches Problem nennt die zweite Person noch?", ["Sie arbeitet zu Hause oft länger.", "Das Internet ist langsam.", "Die Kinder stören."], 0),
      pick("Welche Lösung finden sie?", ["nur Homeoffice", "nur Büro", "zwei Tage zu Hause, drei im Büro"], 2),
      pick("Am Ende sind beide …", ["einverstanden", "wütend", "unsicher"], 0),
    ],
    "I can follow two opinions with their arguments and the compromise.",
  ),
  "Listen to a travel or holiday conversation": listen(
    "Zurück aus dem Urlaub",
    "Where did she go, how, and what went well or badly?",
    "– Na, wie war dein Urlaub?\n– Toll! Wir waren zehn Tage in Portugal, in Lissabon und dann an der Algarve.\n– Seid ihr geflogen?\n– Ja, von Frankfurt nach Lissabon. Und dort haben wir ein Auto gemietet.\n– Und das Wetter?\n– Fast immer Sonne, nur am ersten Tag hat es geregnet. Das Hotel an der Algarve war super, direkt am Strand. Nur das Essen im Hotel war nicht so gut, deshalb haben wir meistens in kleinen Restaurants im Dorf gegessen.\n– Das klingt schön. Ich fahre im September nach Kroatien.",
    [
      gap("Der Urlaub hat ___ Tage gedauert.", "zehn", "10"),
      gap("Sie waren in ___.", "Portugal", "Lissabon"),
      pick("Wie sind sie gereist?", ["mit dem Zug", "mit dem Flugzeug und dann mit einem Mietauto", "mit dem Bus"], 1),
      pick("Wann hat es geregnet?", ["am ersten Tag", "am letzten Tag", "nie"], 0),
      pick("Was war nicht so gut?", ["das Hotel", "das Essen im Hotel", "der Strand"], 1),
      gap("Die andere Person fährt im September nach ___.", "Kroatien"),
    ],
    "I can follow a holiday story: where, how, and what was good or bad.",
  ),
  "Listen to a complaint at a shop or restaurant": listen(
    "Reklamation",
    "What's wrong, and how is it solved?",
    "– Guten Tag, ich habe diese Jacke letzte Woche hier gekauft. Leider ist der Reißverschluss schon kaputt.\n– Oh, das tut mir leid. Haben Sie den Kassenbon dabei?\n– Ja, hier.\n– Danke. Möchten Sie eine neue Jacke oder Ihr Geld zurück?\n– Gibt es die Jacke noch in Größe M, in Schwarz?\n– Einen Moment … Nein, in Schwarz leider nicht mehr, nur in Dunkelblau.\n– Hm, dann hätte ich lieber mein Geld zurück.\n– Kein Problem. Das sind 89 Euro, ich buche sie auf Ihre Karte zurück.",
    [
      pick("Was ist kaputt?", ["der Reißverschluss", "die Tasche", "ein Knopf"], 0),
      pick("Wann hat der Kunde die Jacke gekauft?", ["gestern", "letzte Woche", "letzten Monat"], 1),
      gap("Die Verkäuferin fragt nach dem ___.", "Kassenbon"),
      pick("Welche Farbe gibt es noch?", ["Schwarz", "Dunkelblau", "Grau"], 1),
      pick("Was möchte der Kunde am Ende?", ["eine neue Jacke", "sein Geld zurück", "einen Gutschein"], 1),
      gap("Die Jacke hat ___ Euro gekostet.", "89"),
    ],
    "I can follow a complaint and understand the solution offered.",
  ),
  "Listen to an invitation being made": listen(
    "Einladung zum Geburtstag",
    "What's the occasion, when, where, and what should the guest bring?",
    "– Hallo Deniz, ich werde am 14. dreißig und möchte ein bisschen feiern. Hast du Lust zu kommen?\n– Oh, herzlichen Glückwunsch schon mal! Wann genau?\n– Am Samstag ab acht Uhr abends, bei mir zu Hause. Meine Adresse ist jetzt Gartenstraße 5, ich bin ja umgezogen.\n– Stimmt! Soll ich etwas mitbringen?\n– Wenn du willst, einen Salat. Getränke habe ich genug.\n– Mache ich. Darf ich meine Freundin mitbringen?\n– Klar, gern!",
    [
      gap("Die Person wird ___ Jahre alt.", "dreißig", "30"),
      pick("Wann ist die Feier?", ["am Freitag um acht", "am Samstag ab acht Uhr abends", "am Sonntagmittag"], 1),
      gap("Die neue Adresse ist ___ 5.", "Gartenstraße"),
      pick("Was soll Deniz mitbringen?", ["Getränke", "einen Salat", "einen Kuchen"], 1),
      pick("Darf Deniz jemanden mitbringen?", ["ja", "nein"], 0),
    ],
    "I can catch the date, place and requests in a spoken invitation.",
  ),
  "Listen to a description of an apartment": listen(
    "Meine neue Wohnung",
    "How big, which rooms, what's good or bad?",
    "Meine neue Wohnung ist in der Südstadt, im zweiten Stock. Sie hat drei Zimmer, eine Küche, ein Bad und einen kleinen Balkon. Insgesamt sind es 72 Quadratmeter. Das Wohnzimmer ist groß und hell, mit zwei Fenstern nach Süden. Das Schlafzimmer ist ruhig, weil es zum Hof liegt. Das dritte Zimmer benutze ich als Arbeitszimmer. Die Küche ist leider ziemlich klein, und es gibt keine Spülmaschine. Die Miete ist 950 Euro warm. Zur Arbeit fahre ich nur zehn Minuten mit dem Rad.",
    [
      pick("In welchem Stock liegt die Wohnung?", ["im ersten", "im zweiten", "im dritten"], 1),
      gap("Die Wohnung hat ___ Quadratmeter.", "72"),
      pick("Warum ist das Schlafzimmer ruhig?", ["Es liegt zum Hof.", "Es hat neue Fenster.", "Es liegt im Keller."], 0),
      pick("Wofür benutzt er das dritte Zimmer?", ["als Gästezimmer", "als Arbeitszimmer", "als Kinderzimmer"], 1),
      pick("Was ist ein Nachteil?", ["kein Balkon", "die kleine Küche ohne Spülmaschine", "die hohe Miete"], 1),
      gap("Die Warmmiete ist ___ Euro.", "950"),
    ],
    "I can picture an apartment from a spoken description.",
  ),
  "Listen to a banking conversation": listen(
    "Ein Konto eröffnen",
    "What does he need, what does it cost, when does the card come?",
    "– Guten Tag, ich möchte ein Girokonto eröffnen.\n– Gern. Haben Sie Ihren Pass und Ihre Meldebescheinigung dabei?\n– Den Pass ja, aber die Meldebescheinigung habe ich vergessen.\n– Die brauchen wir leider. Sie können sie aber auch per E-Mail schicken.\n– Gut. Was kostet das Konto?\n– Das Konto kostet 4,90 Euro im Monat. Für Auszubildende unter 25 ist es kostenlos.\n– Ich bin Azubi und 23 Jahre alt.\n– Wunderbar, dann zahlen Sie nichts. Die Karte kommt in etwa einer Woche per Post, die PIN kommt in einem separaten Brief.",
    [
      pick("Was hat der Kunde vergessen?", ["den Pass", "die Meldebescheinigung", "sein Handy"], 1),
      pick("Wie kann er das Dokument nachreichen?", ["per E-Mail", "per Fax", "nur persönlich"], 0),
      gap("Das Konto kostet normalerweise ___ Euro im Monat.", "4,90"),
      pick("Wie viel zahlt der Kunde?", ["4,90 Euro", "nichts", "2,45 Euro"], 1),
      gap("Der Kunde ist ___ Jahre alt.", "23", "dreiundzwanzig"),
      pick("Wie kommt die PIN?", ["mit der Karte", "in einem separaten Brief", "per SMS"], 1),
    ],
    "I can follow the steps and costs of opening a bank account.",
  ),
  "Listen to a conversation about recycling": listen(
    "Wohin damit?",
    "Which bin gets what?",
    "– Sag mal, wo kommt die Pizzaschachtel hin? Ins Altpapier?\n– Nur wenn sie sauber ist. Wenn noch Käse und Fett dran sind, kommt sie in den Restmüll.\n– Ah, okay. Und die leeren Flaschen?\n– Die Pfandflaschen bringen wir zum Supermarkt zurück, da bekommen wir Geld. Die Weinflaschen kommen in den Glascontainer an der Ecke.\n– Und die alte Lampe?\n– Die darf nicht in die Tonne. Die bringen wir am Samstag zum Wertstoffhof, zusammen mit den alten Batterien.",
    [
      pick("Wohin kommt eine fettige Pizzaschachtel?", ["ins Altpapier", "in den Restmüll", "in den Biomüll"], 1),
      pick("Was macht man mit den Pfandflaschen?", ["in den Glascontainer werfen", "zum Supermarkt zurückbringen", "in den Gelben Sack werfen"], 1),
      gap("Die Weinflaschen kommen in den ___.", "Glascontainer"),
      gap("Die Lampe bringen sie zum ___.", "Wertstoffhof"),
      pick("Wann fahren sie dorthin?", ["am Freitag", "am Samstag", "heute"], 1),
    ],
    "I can follow a conversation about sorting rubbish.",
  ),
  "Listen to someone narrating last year's events": listen(
    "Mein Jahr",
    "What happened in which month?",
    "Letztes Jahr war ein besonderes Jahr für mich. Im Januar habe ich meinen Deutschkurs angefangen, jeden Abend nach der Arbeit. Im April habe ich die A2-Prüfung bestanden, das war ein toller Tag! Im Sommer bin ich mit meiner Schwester nach Österreich gefahren, wir waren in den Bergen wandern. Im Oktober bin ich umgezogen, weil meine alte Wohnung zu klein war. Und im Dezember habe ich endlich die Zusage für meine Ausbildung als Elektroniker bekommen. Ich beginne im August.",
    [
      pick("Was ist im Januar passiert?", ["Er hat den Deutschkurs angefangen.", "Er ist umgezogen.", "Er hat die Prüfung gemacht."], 0),
      pick("Wann hat er die A2-Prüfung bestanden?", ["im Januar", "im April", "im Oktober"], 1),
      gap("Im Sommer ist er nach ___ gefahren.", "Österreich"),
      pick("Warum ist er umgezogen?", ["Die Wohnung war zu teuer.", "Die Wohnung war zu klein.", "Er hatte eine neue Arbeit."], 1),
      gap("Er macht eine Ausbildung als ___.", "Elektroniker"),
      pick("Wann beginnt die Ausbildung?", ["im Dezember", "im Januar", "im August"], 2),
    ],
    "I can put the events of someone's year in order.",
  ),
  "Listen to a radio advertisement": listen(
    "Radiowerbung",
    "What's being sold, until when, and for how much?",
    "Frische Brötchen, leckerer Kuchen und der beste Kaffee der Stadt — das gibt es bei Bäckerei Sonnenkorn! Jetzt neu: unsere Filiale am Marktplatz. Zur Eröffnung am Samstag bekommt jeder Kunde einen Kaffee gratis. Und die ganze Woche gilt: Kaufen Sie fünf Brötchen und bezahlen Sie nur vier! Wir haben montags bis samstags von 6 bis 19 Uhr geöffnet, sonntags von 7 bis 12 Uhr. Bäckerei Sonnenkorn — frisch gebacken, mit Liebe gemacht.",
    [
      gap("Die Bäckerei heißt ___.", "Sonnenkorn"),
      pick("Wo ist die neue Filiale?", ["am Bahnhof", "am Marktplatz", "im Einkaufszentrum"], 1),
      pick("Was bekommt man am Samstag gratis?", ["ein Brötchen", "einen Kaffee", "ein Stück Kuchen"], 1),
      pick("Das Angebot die ganze Woche:", ["fünf Brötchen kaufen, vier bezahlen", "zwei Brötchen gratis", "Kuchen zum halben Preis"], 0),
      pick("Wann ist sonntags geöffnet?", ["gar nicht", "von 7 bis 12 Uhr", "von 6 bis 19 Uhr"], 1),
    ],
    "I can catch the offer, place and times in a radio ad.",
  ),
  "Listen to a conversation about household chores": listen(
    "Wer macht was?",
    "Who takes which chore?",
    "– Wir müssen mal besprechen, wer was im Haushalt macht. Ich habe diese Woche schon zweimal gekocht und das Bad geputzt.\n– Stimmt, sorry. Ich kann ab jetzt jeden Samstag staubsaugen und den Müll rausbringen.\n– Gut. Und die Wäsche?\n– Die Wäsche wasche ich nicht so gern … Kann ich stattdessen einkaufen gehen?\n– Okay, dann mache ich die Wäsche und du gehst einkaufen. Und das Geschirr?\n– Wer kocht, spült nicht. Einverstanden?\n– Einverstanden!",
    [
      pick("Was hat die erste Person diese Woche schon gemacht?", ["gekocht und das Bad geputzt", "eingekauft", "gestaubsaugt"], 0),
      pick("Was macht die zweite Person jeden Samstag?", ["kochen", "staubsaugen und den Müll rausbringen", "Wäsche waschen"], 1),
      pick("Wer macht die Wäsche?", ["die erste Person", "die zweite Person", "beide zusammen"], 0),
      pick("Was macht die zweite Person statt der Wäsche?", ["kochen", "einkaufen", "spülen"], 1),
      pick("Die Regel für das Geschirr:", ["Wer kocht, spült auch.", "Wer kocht, spült nicht.", "Sie spülen immer zusammen."], 1),
    ],
    "I can follow who agrees to do which household task.",
  ),
  "Listen to someone requesting information by phone": listen(
    "Anruf bei der Volkshochschule",
    "Which course, when, how much, how to register?",
    "– Volkshochschule Bremen, Sie sprechen mit Frau Krause.\n– Guten Tag, mein Name ist Singh. Ich interessiere mich für einen Computerkurs für Anfänger. Wann beginnt der nächste Kurs?\n– Der nächste Kurs beginnt am 3. März. Er findet immer dienstags von 18 bis 20 Uhr statt, zehn Wochen lang.\n– Und was kostet er?\n– 120 Euro. Mit einem Bremen-Pass zahlen Sie nur die Hälfte.\n– Wie kann ich mich anmelden?\n– Am einfachsten online auf unserer Webseite, oder persönlich bei uns im Büro.\n– Vielen Dank, dann melde ich mich online an.",
    [
      pick("Welchen Kurs sucht Herr Singh?", ["einen Deutschkurs", "einen Computerkurs für Anfänger", "einen Kochkurs"], 1),
      gap("Der Kurs beginnt am 3. ___.", "März"),
      pick("Wann ist der Kurs?", ["montags 18–20 Uhr", "dienstags 18–20 Uhr", "samstags 10–12 Uhr"], 1),
      gap("Der Kurs kostet ___ Euro.", "120"),
      pick("Mit dem Bremen-Pass zahlt man …", ["nichts", "die Hälfte", "20 Euro mehr"], 1),
      pick("Wie meldet sich Herr Singh an?", ["per Telefon", "online", "per Post"], 1),
    ],
    "I can get the details I asked for in a phone call.",
  ),
  "Listen to people discussing weekend plans": listen(
    "Was machen wir am Wochenende?",
    "What's the plan for Saturday and for Sunday?",
    "– Was machen wir am Wochenende? Das Wetter soll schön werden.\n– Am Samstag möchte ich gern Fahrrad fahren, zum Baggersee. Da können wir auch schwimmen.\n– Gute Idee, aber vormittags muss ich noch einkaufen. Fahren wir um eins los?\n– Okay, um eins. Und am Sonntag?\n– Am Sonntag hat meine Oma Geburtstag, da gehen wir mittags zu ihr zum Essen.\n– Stimmt, das hatte ich vergessen. Dann bleiben wir am Sonntagabend einfach zu Hause und schauen einen Film.",
    [
      pick("Wie soll das Wetter werden?", ["schön", "regnerisch", "kalt"], 0),
      gap("Am Samstag fahren sie mit dem Fahrrad zum ___.", "Baggersee"),
      pick("Warum fahren sie erst um eins los?", ["Sie muss vormittags einkaufen.", "Sie schlafen lange.", "Der See öffnet erst um eins."], 0),
      pick("Was ist am Sonntagmittag?", ["Oma hat Geburtstag.", "Sie gehen ins Kino.", "Sie fahren wieder zum See."], 0),
      pick("Was machen sie am Sonntagabend?", ["Sie gehen aus.", "Sie schauen zu Hause einen Film.", "Sie besuchen Freunde."], 1),
    ],
    "I can follow a plan for two days and who does what when.",
  ),
};

// ── speaking ─────────────────────────────────────────────────────────────────

const SPEAKING: Record<string, Authored> = {
  "Phone conversations": speak(
    "Ruf bei einer Firma an: Stell dich vor, frag nach Herrn Becker, er ist nicht da — hinterlass eine Nachricht mit deiner Nummer und bitte um Rückruf.",
    "Guten Tag, hier spricht … · Könnte ich bitte mit … sprechen? · Wann ist er wieder erreichbar? · Kann ich eine Nachricht hinterlassen? · Könnte er mich bitte zurückrufen? · Meine Nummer ist … · Vielen Dank, auf Wiederhören!",
    "Guten Tag, hier spricht Aisha Bello. Könnte ich bitte mit Herrn Becker sprechen? … Ach so, er ist in einer Besprechung. Kann ich eine Nachricht hinterlassen? Es geht um meine Bewerbung. Könnte er mich bitte heute Nachmittag zurückrufen? Meine Nummer ist 0176 55 23 419. Vielen Dank, auf Wiederhören!",
    "I can make a work phone call, leave a message and spell out my number.",
  ),
  "Talk about your past": speak(
    "Erzähl in 6–8 Sätzen von deiner Kindheit und Schulzeit: Wo bist du aufgewachsen? Was hast du gern gemacht? Was durftest/musstest du?",
    "Ich bin in … aufgewachsen. · Als Kind habe ich gern … · Ich bin … zur Schule gegangen. · Mein Lieblingsfach war … · Ich musste / durfte … · Nach der Schule habe ich …",
    "Ich bin in Lahore aufgewachsen, in einer großen Familie. Als Kind habe ich sehr gern Cricket gespielt. Ich bin zwölf Jahre zur Schule gegangen, mein Lieblingsfach war Mathe. Ich musste jeden Tag mit dem Bus fahren, das hat eine Stunde gedauert. Am Wochenende durfte ich mit meinen Cousins spielen. Nach der Schule habe ich eine Ausbildung als Elektriker gemacht.",
    "I can talk about my childhood and school days in the Perfekt, with musste/durfte.",
  ),
  "Doctor's appointment": speak(
    "Ruf in einer Hausarztpraxis an: Du hast seit drei Tagen Fieber und Husten. Bitte um einen Termin, möglichst heute, und frag, was du mitbringen musst.",
    "Ich möchte gern einen Termin machen. · Ich habe seit … Tagen … · Geht es heute noch? · Ich kann ab … Uhr. · Muss ich etwas mitbringen? · Ich bin gesetzlich versichert bei …",
    "Guten Morgen, mein Name ist Chen Li. Ich möchte gern einen Termin machen. Ich habe seit drei Tagen Fieber und starken Husten. Geht es heute noch? … Um 11:30 Uhr? Ja, das passt. Muss ich etwas mitbringen? … Gut, meine Versichertenkarte bringe ich mit. Vielen Dank, bis später!",
    "I can describe my symptoms on the phone and get an appointment.",
  ),
  "Apartment viewing": speak(
    "Du bist bei einer Wohnungsbesichtigung. Stell dem Vermieter fünf Fragen: Nebenkosten, Kaution, Einzug, Haustiere, Waschmaschine.",
    "Wie hoch sind die Nebenkosten? · Ist der Strom dabei? · Wie hoch ist die Kaution? · Ab wann ist die Wohnung frei? · Sind Haustiere erlaubt? · Wo kann ich die Waschmaschine anschließen? · Ich habe großes Interesse.",
    "Die Wohnung gefällt mir sehr. Darf ich ein paar Fragen stellen? Wie hoch sind die Nebenkosten, und ist der Strom dabei? Wie hoch ist die Kaution? Ab wann ist die Wohnung frei? Ich habe eine kleine Katze — sind Haustiere erlaubt? Und wo kann ich die Waschmaschine anschließen? Ich habe großes Interesse und kann Ihnen die Unterlagen gleich schicken.",
    "I can ask the important questions at a flat viewing.",
  ),
  "Make plans together": speak(
    "Plane mit einem Freund einen Ausflug am Wochenende: Schlag etwas vor, reagier auf einen Gegenvorschlag, einigt euch auf Tag, Uhrzeit und Treffpunkt. (Play both roles.)",
    "Hast du am … Zeit? · Wollen wir … ? · Wie wäre es mit …? · Das geht leider nicht, weil … · Lieber … · Gute Idee! · Wann/Wo treffen wir uns? · Abgemacht!",
    "Hast du am Samstag Zeit? Wollen wir zum See fahren? … Ach, du musst am Samstag arbeiten? Wie wäre es dann mit Sonntag? … Super. Wann treffen wir uns? Um zehn am Bahnhof? … Lieber um halb elf? Okay, abgemacht! Ich bringe etwas zu essen mit.",
    "I can suggest, reject and agree on a plan with someone.",
  ),
  "Compare two things or people": speak(
    "Vergleiche zwei Städte, die du kennst (z. B. deine Heimatstadt und deine Stadt in Deutschland): Größe, Wetter, Preise, Leben. Sag am Ende, wo du lieber wohnst.",
    "… ist größer / kleiner / teurer als … · … ist (nicht) so … wie … · Am besten gefällt mir … · Ein Vorteil von … ist … · Ich wohne lieber in …, weil …",
    "Chennai ist viel größer als Kassel — dort wohnen über zehn Millionen Menschen. In Chennai ist es wärmer, aber auch lauter. Das Essen ist in Chennai billiger als hier. Kassel ist nicht so groß wie Chennai, aber es ist grüner und ruhiger. Am besten gefallen mir hier die Parks. Im Moment wohne ich lieber in Kassel, weil ich hier meine Ausbildung mache.",
    "I can compare two places with comparatives and so … wie.",
  ),
  "Describe your ideal apartment": speak(
    "Beschreib deine Traumwohnung: Lage, Zimmer, Größe, Einrichtung, Miete. Benutze Adjektive mit Endungen.",
    "Meine Traumwohnung liegt … · Sie hat … Zimmer, eine große Küche, einen sonnigen Balkon … · Im Wohnzimmer steht ein bequemes Sofa. · Sie sollte nicht mehr als … kosten.",
    "Meine Traumwohnung liegt in einer ruhigen Straße, aber nah am Zentrum. Sie hat drei helle Zimmer, eine große Küche mit einem langen Tisch und einen sonnigen Balkon. Im Wohnzimmer steht ein bequemes Sofa. Im Arbeitszimmer habe ich einen großen Schreibtisch am Fenster. Sie sollte nicht mehr als 900 Euro warm kosten.",
    "I can describe a place in detail with adjective endings.",
  ),
  "Talk about your typical work day": speak(
    "Beschreib einen normalen Arbeitstag (oder Kurstag) von morgens bis abends, mit Uhrzeiten und Verbindungswörtern (zuerst, dann, danach, deshalb).",
    "Ich stehe um … auf. · Zuerst … dann … danach … · Um … fängt meine Schicht an. · In der Pause … · Nach der Arbeit … · Deshalb bin ich abends …",
    "Ich stehe um fünf Uhr auf, weil meine Frühschicht um sechs anfängt. Zuerst trinke ich einen Kaffee, dann fahre ich mit dem Rad zum Krankenhaus. Zuerst gibt es die Übergabe, danach helfe ich den Patienten beim Waschen. In der Pause esse ich mit meinen Kollegen in der Kantine. Um 14 Uhr ist Feierabend. Deshalb habe ich nachmittags Zeit für meinen Deutschkurs.",
    "I can describe my working day in order with times and connectors.",
  ),
  "Discuss your feelings about something": speak(
    "Erzähl von einem Ereignis, das dich sehr froh, traurig oder nervös gemacht hat. Wie hast du dich gefühlt und warum?",
    "Ich war sehr froh / enttäuscht / nervös, als … · Ich habe mich gefreut über … · Ich hatte Angst vor … · Ich habe mir Sorgen gemacht um … · Am Ende …",
    "Letzten Monat hatte ich mein erstes Vorstellungsgespräch auf Deutsch. Ich war sehr nervös, weil ich Angst vor Fehlern hatte. Am Abend vorher habe ich schlecht geschlafen. Aber das Gespräch war freundlich, und ich habe fast alles verstanden. Eine Woche später habe ich eine Zusage bekommen. Ich habe mich riesig gefreut und war auch ein bisschen stolz auf mich.",
    "I can describe how something made me feel and why.",
  ),
  "Give your opinion on a topic": speak(
    "Thema: „Sollten alle Geschäfte auch am Sonntag öffnen?“ Sag deine Meinung, nenn ein Argument dafür und eins dagegen und komm zu einem Schluss.",
    "Meiner Meinung nach … · Ich finde (nicht), dass … · Ein Vorteil ist, dass … · Ein Nachteil ist, dass … · Einerseits … andererseits … · Deshalb …",
    "Ich finde, dass die Geschäfte am Sonntag nicht öffnen sollten. Einerseits ist es praktisch, weil viele Menschen unter der Woche lange arbeiten. Andererseits müssten dann die Verkäuferinnen auch am Sonntag arbeiten, und sie brauchen einen freien Tag mit ihrer Familie. Meiner Meinung nach ist ein ruhiger Tag für alle wichtig. Deshalb bin ich dagegen.",
    "I can give and justify an opinion with a pro and a con.",
  ),
  "Talk about a weekend trip": speak(
    "Erzähl von einem Ausflug oder einer kurzen Reise: wohin, mit wem, wie, was ihr gemacht habt, was gut und was nicht so gut war.",
    "Letztes Wochenende bin ich nach … gefahren. · Wir sind mit dem Zug … · Zuerst haben wir … · Das Wetter war … · Am besten hat mir … gefallen. · Leider …",
    "Letztes Wochenende bin ich mit zwei Freunden nach Heidelberg gefahren. Wir sind mit dem Zug gefahren, das hat eine Stunde gedauert. Zuerst haben wir das Schloss besichtigt, dann sind wir am Neckar spazieren gegangen. Am besten hat mir die Altstadt gefallen. Leider hat es am Sonntag geregnet, deshalb sind wir früh zurückgefahren.",
    "I can tell a short trip story in the Perfekt.",
  ),
  "Explain a problem to a landlord": speak(
    "Ruf deinen Vermieter an: Die Heizung in deiner Wohnung funktioniert seit gestern nicht. Beschreib das Problem und bitte darum, dass schnell jemand kommt.",
    "Ich wohne in der …straße, 2. Stock. · Ich habe ein Problem: … funktioniert nicht / ist kaputt. · Seit … · Könnten Sie bitte einen Handwerker schicken? · Wann kann jemand kommen? · Ich bin ab … zu Hause.",
    "Guten Tag, Herr Wagner, hier ist Nuri Demir aus der Bergstraße 4, zweiter Stock. Ich habe ein Problem: Die Heizung funktioniert seit gestern Abend nicht mehr, und es ist sehr kalt in der Wohnung. Könnten Sie bitte schnell einen Handwerker schicken? Ich bin ab 15 Uhr zu Hause. Wann kann jemand kommen?",
    "I can report a problem in my flat and ask for a repair.",
  ),
  "Talk about banking and paying bills": speak(
    "Erklär, wie du deine Rechnungen bezahlst: Miete, Strom, Handy, Einkäufe. Welche Karte, welches Konto, Dauerauftrag oder Lastschrift?",
    "Ich habe ein Girokonto bei … · Die Miete zahle ich per Dauerauftrag. · Strom und Handy werden per Lastschrift abgebucht. · Im Supermarkt zahle ich mit Karte / bar. · Einmal im Monat schaue ich auf den Kontoauszug.",
    "Ich habe ein Girokonto bei der Sparkasse. Die Miete zahle ich jeden Monat per Dauerauftrag, am ersten des Monats. Strom und Handy werden per Lastschrift abgebucht. Im Supermarkt zahle ich meistens mit der Girocard, nur auf dem Markt zahle ich bar. Einmal im Monat kontrolliere ich meinen Kontoauszug in der App.",
    "I can explain how I manage my bank account and bills.",
  ),
  "Invite someone to a celebration": speak(
    "Lade eine Kollegin zu deiner Geburtstagsfeier ein: Anlass, Tag, Uhrzeit, Ort, was sie mitbringen kann. Dann spiel ihre Antwort: Sie sagt höflich ab, mit Grund.",
    "Ich möchte dich zu … einladen. · Die Feier ist am … um … bei mir / im … · Kannst du … mitbringen? · Sag mir bitte bis … Bescheid. — Danke für die Einladung! Leider kann ich nicht, weil …",
    "Hallo Julia! Ich werde nächsten Samstag dreißig und möchte dich zu meiner Party einladen. Wir feiern ab sieben Uhr bei mir zu Hause. Wenn du willst, kannst du einen Salat mitbringen. Sag mir bitte bis Mittwoch Bescheid. — Oh, vielen Dank für die Einladung! Leider kann ich nicht kommen, weil ich an dem Wochenende bei meinen Eltern bin. Aber ich wünsche dir eine tolle Feier!",
    "I can invite someone and politely decline an invitation.",
  ),
  "Discuss recycling and the environment": speak(
    "Erzähl, wie du Müll trennst und was du für die Umwelt tust. Wie ist das in deinem Heimatland im Vergleich?",
    "Ich trenne den Müll: Papier kommt …, Plastik kommt … · Pfandflaschen bringe ich … · Ich fahre mit dem Rad, um … · In meinem Heimatland … · Ich finde, dass …",
    "Ich trenne den Müll ganz genau: Papier kommt in die blaue Tonne, Verpackungen in den Gelben Sack und Essensreste in den Biomüll. Pfandflaschen bringe ich zum Supermarkt zurück. Ich fahre meistens mit dem Rad, weil das besser für die Umwelt ist. In meinem Heimatland trennt man den Müll nicht so genau wie hier. Ich finde, dass das System in Deutschland am Anfang kompliziert, aber gut ist.",
    "I can describe my recycling habits and compare them with home.",
  ),
  "Talk about your favorite restaurant": speak(
    "Beschreib dein Lieblingsrestaurant: Wo ist es, was für Essen gibt es, was bestellst du immer, wie sind die Preise und warum magst du es?",
    "Mein Lieblingsrestaurant ist … · Es liegt … · Dort gibt es … Küche. · Ich bestelle immer … · Die Preise sind … · Mir gefällt, dass …",
    "Mein Lieblingsrestaurant ist ein kleines äthiopisches Restaurant in der Altstadt. Dort isst man mit den Händen, mit Injera-Brot. Ich bestelle immer das vegetarische Gericht mit Linsen — es ist scharf und sehr lecker. Die Preise sind fair, ein Hauptgericht kostet etwa 14 Euro. Mir gefällt, dass die Besitzer so freundlich sind und dass es dort gemütlich ist.",
    "I can describe a place I like with reasons.",
  ),
  "Describe symptoms and ask for medicine": speak(
    "Du bist in der Apotheke. Beschreib deine Beschwerden (Halsschmerzen, Schnupfen, leichtes Fieber) und frag nach einem Medikament und wie du es nehmen sollst.",
    "Ich habe seit … Halsschmerzen / Schnupfen / Fieber. · Haben Sie etwas gegen …? · Brauche ich ein Rezept? · Wie oft muss ich das nehmen? · Vor oder nach dem Essen? · Gibt es Nebenwirkungen?",
    "Guten Tag, ich habe seit zwei Tagen Halsschmerzen und Schnupfen, und heute habe ich auch leichtes Fieber. Haben Sie etwas gegen Halsschmerzen? … Brauche ich dafür ein Rezept? … Gut. Wie oft muss ich die Tabletten nehmen? … Dreimal täglich nach dem Essen, okay. Gibt es Nebenwirkungen? … Vielen Dank!",
    "I can describe symptoms at the pharmacy and understand the instructions.",
  ),
  "Talk about your commute and transport options": speak(
    "Beschreib deinen Weg zur Arbeit oder zum Kurs: Wie fährst du, wie lange dauert es, was kostet es? Vergleiche mit einer anderen Möglichkeit.",
    "Ich fahre mit dem Bus / der S-Bahn / dem Rad zur … · Ich muss einmal umsteigen. · Die Fahrt dauert … · Ich habe ein Deutschlandticket für … Euro. · Mit dem Auto wäre es schneller, aber … · Deshalb …",
    "Ich fahre jeden Tag mit der S-Bahn zur Arbeit. Ich muss am Hauptbahnhof einmal umsteigen, und die Fahrt dauert ungefähr 40 Minuten. Ich habe ein Deutschlandticket, das ist günstiger als eine Monatskarte. Mit dem Auto wäre es schneller, aber das Parken in der Stadt ist sehr teuer. Im Sommer fahre ich manchmal mit dem Rad, das dauert länger, aber es ist gesund.",
    "I can describe and compare how I get to work.",
  ),
  "Explain what you did last year": speak(
    "Erzähl von deinem letzten Jahr: drei bis vier wichtige Ereignisse, mit Monaten, und wie du dich dabei gefühlt hast.",
    "Im Januar habe ich … · Im Frühling bin ich … · Im Sommer … · Das war …, weil … · Am Ende des Jahres … · Ich bin stolz, dass …",
    "Letztes Jahr war sehr voll. Im Januar habe ich mit dem A2-Kurs angefangen. Im Mai bin ich in eine neue Wohnung umgezogen, das war anstrengend, aber schön. Im Sommer hat mich meine Mutter zum ersten Mal in Deutschland besucht — ich war so glücklich! Im November habe ich die A2-Prüfung bestanden. Ich bin stolz, dass ich so viel geschafft habe.",
    "I can tell the main events of a year in order and say how I felt.",
  ),
  "Give advice using würde/sollte": speak(
    "Ein Freund sagt: „Ich finde keine Wohnung und bin total gestresst.“ Gib ihm vier Ratschläge mit „Du solltest …“ und „An deiner Stelle würde ich …“.",
    "Du solltest … · Du könntest … · An deiner Stelle würde ich … · Vielleicht wäre es besser, … · Hast du schon mal … probiert?",
    "Das tut mir leid! Du solltest jeden Tag die neuen Anzeigen lesen und schnell anrufen. An deiner Stelle würde ich auch in WG-Gruppen suchen. Du könntest deine Kollegen fragen, vielleicht kennt jemand eine Wohnung. Und du solltest alle Unterlagen schon fertig haben, zum Beispiel die Gehaltsnachweise. Vielleicht wäre es besser, erst mal ein Zimmer zu nehmen.",
    "I can give advice politely with sollte, könnte and würde.",
  ),
  "Talk about household chores and furniture": speak(
    "Beschreib dein Zimmer oder deine Wohnung: Wo steht/liegt/hängt was? Dann sag, welche Hausarbeiten du machst und wie oft.",
    "Das Bett steht an der Wand. · Der Teppich liegt vor dem Sofa. · Das Bild hängt über dem Schreibtisch. · Ich sauge einmal pro Woche Staub. · Ich putze das Bad … · Den Müll bringe ich … raus.",
    "In meinem Zimmer steht das Bett an der Wand, neben dem Fenster. Vor dem Bett liegt ein kleiner Teppich. Über dem Schreibtisch hängt ein Foto von meiner Familie, und der Laptop steht auf dem Schreibtisch. Einmal pro Woche sauge ich Staub und putze das Bad. Den Müll bringe ich jeden zweiten Tag raus, und ich koche fast jeden Abend.",
    "I can describe where furniture is (wo + dative) and talk about chores.",
  ),
};

export const A2_CHECKS: Record<string, Authored> = { ...GRAMMAR, ...VOCAB, ...READING, ...LISTENING, ...SPEAKING };
