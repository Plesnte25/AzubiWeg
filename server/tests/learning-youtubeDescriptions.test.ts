import { describe, expect, it } from "vitest";
import { cleanDescriptions, parseShortDescription, parseVideosResponse } from "../src/services/learning/youtubeDescriptions.js";

// the shape of the "A1 (Free Course) | Learn German" playlist's descriptions (2026-09-29)
const PROMO = `#LearnGermanOriginal #LearnGerman #germanlevela1
Master German faster with our A1 companion materials! 🚀
*Use Code A1LG10 and get a 10% discount on all A1 Products*
Get your copies here: www.patreon.com/learngerman/shop`;
const OUTRO = `If you have any questions or comments, feel free to write!

Related Videos:
Lesson 10 - Sentence Structure (Part 2):   https://youtu.be/ZNc0y2Dy5N8

NEW!!!
Download worksheet for FREE here:
https://www.patreon.com/posts/29357513
Please SUBSCRIBE to our channel on YouTube and start learning German today!`;
const lesson = (n: number, body: string) => `${PROMO}\n\nLearn German Lesson ${n} - Topic ${n}\n\n${body}\n\n${OUTRO}`;

describe("cleanDescriptions", () => {
  it("keeps the lesson part and drops what every video repeats", () => {
    const [first] = cleanDescriptions([
      lesson(9, "The main things covered are:\n•        Correct placement of the verb.\n--   What is a Subject?"),
      lesson(10, "In lesson 10 you learn the three pronouns ich, du and Sie."),
      lesson(12, "In Lesson 12 you conjugate haben and sein."),
    ]);
    expect(first).toBe("Learn German Lesson 9 - Topic 9\n\nThe main things covered are:\n• Correct placement of the verb.\n• What is a Subject?");
  });

  it("drops a line that joins boilerplate sentences, even if that exact line appears once", () => {
    const promo = "Complement your learning with our NEW A1 Coursebook.\n*Use Code A1LG10 and get 10% off*";
    const cleaned = cleanDescriptions([
      `${promo}\n\nLesson 1 is about greetings in German.`,
      `${promo}\n\nLesson 2 is about common phrases.`,
      `Complement your learning with our NEW A1 Coursebook. *Use Code A1LG10 and get 10% off*\n\nLesson 6 is about introducing yourself.`,
    ]);
    expect(cleaned[2]).toBe("Lesson 6 is about introducing yourself.");
  });

  it("cuts at Related Videos and drops link, hashtag and download lines even with nothing to compare", () => {
    const [only] = cleanDescriptions([`#German #A1\nLesson 3 covers numbers from 1 to 20.\nSee https://example.com/x\nDownload TRANSCRIPT here:\n\nRelated Videos:\nLesson 4: https://youtu.be/abc`]);
    expect(only).toBe("Lesson 3 covers numbers from 1 to 20.");
  });

  it("returns null when nothing useful is left or there was no description", () => {
    expect(cleanDescriptions([null, "#tag #tag2", "short"])).toEqual([null, null, null]);
  });
});

describe("parseShortDescription", () => {
  it("reads the escaped description out of the player JSON", () => {
    const html = `…"videoId":"abc","shortDescription":"Lesson 1 \\u2014 Greetings\\nBegr\\u00fc\\u00dfungen \\"hi\\"","isCrawlable":true…`;
    expect(parseShortDescription(html)).toBe('Lesson 1 — Greetings\nBegrüßungen "hi"');
    expect(parseShortDescription("<html>no player</html>")).toBeNull();
  });
});

describe("parseVideosResponse", () => {
  it("maps video ids to their descriptions, skipping empty ones", () => {
    const body = { items: [{ id: "n6db5VSUm2o", snippet: { description: "Lesson 9 …" } }, { id: "x", snippet: { description: "  " } }, { snippet: {} }] };
    expect([...parseVideosResponse(body)]).toEqual([["n6db5VSUm2o", "Lesson 9 …"]]);
    expect(parseVideosResponse({ error: { code: 403 } }).size).toBe(0);
  });
});
