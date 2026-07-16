import { describe, expect, it } from "vitest";
import { planMove } from "../src/services/applications/order.js";

describe("planMove", () => {
  const columns = {
    applied: ["a", "b", "c"],
    interview: ["x"],
    offer: [],
  };

  it("reorders within a column (down)", () => {
    expect(planMove(columns, "a", "applied", "applied", 2)).toEqual([
      { status: "applied", ids: ["b", "c", "a"] },
    ]);
  });

  it("reorders within a column (up)", () => {
    expect(planMove(columns, "c", "applied", "applied", 0)).toEqual([
      { status: "applied", ids: ["c", "a", "b"] },
    ]);
  });

  it("moves across columns, updating both", () => {
    expect(planMove(columns, "b", "applied", "interview", 1)).toEqual([
      { status: "applied", ids: ["a", "c"] },
      { status: "interview", ids: ["x", "b"] },
    ]);
  });

  it("moves into an empty column", () => {
    expect(planMove(columns, "b", "applied", "offer", 0)).toEqual([
      { status: "applied", ids: ["a", "c"] },
      { status: "offer", ids: ["b"] },
    ]);
  });

  it("moves into a column missing from the input", () => {
    expect(planMove(columns, "b", "applied", "rejected", 0)).toEqual([
      { status: "applied", ids: ["a", "c"] },
      { status: "rejected", ids: ["b"] },
    ]);
  });

  it("clamps an out-of-range index", () => {
    expect(planMove(columns, "a", "applied", "interview", 99)).toEqual([
      { status: "applied", ids: ["b", "c"] },
      { status: "interview", ids: ["x", "a"] },
    ]);
    expect(planMove(columns, "a", "applied", "interview", -5)).toEqual([
      { status: "applied", ids: ["b", "c"] },
      { status: "interview", ids: ["a", "x"] },
    ]);
  });

  it("no-op move keeps the order", () => {
    expect(planMove(columns, "b", "applied", "applied", 1)).toEqual([
      { status: "applied", ids: ["a", "b", "c"] },
    ]);
  });
});
