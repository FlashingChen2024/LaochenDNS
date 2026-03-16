import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppProvider, useApp } from "./AppContext";

function TestConsumer() {
  const { masterPassword, setMasterPassword } = useApp();

  return (
    <>
      <div data-testid="master-password">{masterPassword ?? "empty"}</div>
      <button type="button" onClick={() => setMasterPassword("secret-pass")}>
        set
      </button>
    </>
  );
}

describe("AppProvider", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it("does not restore the master password from sessionStorage", () => {
    sessionStorage.setItem("laochen_dns_master_password", "persisted-secret");

    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>,
    );

    expect(screen.getByTestId("master-password").textContent).toBe("empty");
  });

  it("keeps the master password only in memory", () => {
    render(
      <AppProvider>
        <TestConsumer />
      </AppProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "set" }));

    expect(screen.getByTestId("master-password").textContent).toBe("secret-pass");
    expect(sessionStorage.getItem("laochen_dns_master_password")).toBeNull();
  });
});
