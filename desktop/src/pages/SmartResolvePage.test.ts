import { describe, expect, it } from "vitest";
import { buildRecordConflictKey } from "./SmartResolvePage";

describe("buildRecordConflictKey", () => {
  it("normalizes host names and record types", () => {
    expect(buildRecordConflictKey("WWW", "a")).toBe(buildRecordConflictKey("www", "A"));
  });

  it("distinguishes different record types on the same host", () => {
    expect(buildRecordConflictKey("www", "A")).not.toBe(buildRecordConflictKey("www", "TXT"));
  });
});
