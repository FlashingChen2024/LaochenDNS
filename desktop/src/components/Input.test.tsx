import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Search } from "lucide-react";
import { Input } from "./Input";

describe("Input", () => {
  test("applies container width separately from input styling", () => {
    render(
      <Input
        aria-label="Search domains"
        placeholder="搜索域名..."
        icon={<Search className="w-4 h-4" />}
        containerClassName="w-full md:w-60"
        className="font-mono"
      />,
    );

    const input = screen.getByLabelText("Search domains");
    const container = input.closest("div")?.parentElement;

    expect(container?.className).toContain("w-full md:w-60");
    expect(input.className).toContain("font-mono");
    expect(input.className).not.toContain("md:w-60");
  });
});
