import { describe, expect, it } from "vitest";
import { changeScope, connectionCount, publish, subscribe } from "../src/services/live/hub.js";

describe("changeScope", () => {
  it("broadcasts successful writes by top-level area", () => {
    expect(changeScope("POST", "/api/words", 201)).toBe("words");
    expect(changeScope("PATCH", "/api/learning/roadmap/task/3", 200)).toBe("learning");
    expect(changeScope("DELETE", "/api/notes/abc", 204)).toBe("notes");
  });
  it("ignores reads, failures, auth and the activity heartbeat", () => {
    expect(changeScope("GET", "/api/words", 200)).toBeNull();
    expect(changeScope("POST", "/api/words", 400)).toBeNull();
    expect(changeScope("POST", "/api/auth/login", 200)).toBeNull();
    expect(changeScope("POST", "/api/activity/ping", 204)).toBeNull();
    expect(changeScope("POST", "/api/authors", 200)).toBe("authors");
  });
});

describe("publish", () => {
  it("reaches the user's other tabs only, never the origin or other users", () => {
    const got: string[] = [];
    const a = subscribe("u1", { clientId: "laptop", send: () => got.push("laptop") });
    const b = subscribe("u1", { clientId: "phone", send: () => got.push("phone") });
    const c = subscribe("u2", { clientId: "other", send: () => got.push("other") });
    expect(publish("u1", "words", "laptop")).toBe(1);
    expect(got).toEqual(["phone"]);
    a();
    b();
    c();
    expect(connectionCount("u1")).toBe(0);
    expect(publish("u1", "words")).toBe(0);
  });
});
