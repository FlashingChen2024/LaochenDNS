import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AppProvider, useApp } from "../app/AppContext";
import { RecordsPage } from "../pages/RecordsPage";
import * as api from "../lib/api";

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    listRecords: vi.fn(),
    createRecord: vi.fn(),
    updateRecord: vi.fn(),
    deleteRecord: vi.fn(),
  };
});

const mockListRecords = vi.mocked(api.listRecords);
const mockCreateRecord = vi.mocked(api.createRecord);
const mockDeleteRecord = vi.mocked(api.deleteRecord);

function RecordsRoute() {
  const { setMasterPassword } = useApp();

  useEffect(() => {
    setMasterPassword("master");
  }, [setMasterPassword]);

  return (
    <>
      <NoticeView />
      <MemoryRouter initialEntries={["/records/dnspod/123?name=example.com"]}>
        <Routes>
          <Route path="/records/:provider/:domainId" element={<RecordsPage />} />
        </Routes>
      </MemoryRouter>
    </>
  );
}

function NoticeView() {
  const { notices, dismissNotice } = useApp();
  return (
    <div>
      {notices.map((notice) => (
        <div key={notice.id}>
          <span>{notice.message}</span>
          <button onClick={() => dismissNotice(notice.id)}>关闭</button>
        </div>
      ))}
    </div>
  );
}

describe("RecordsPage modal flow", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockListRecords.mockResolvedValue([]);
  });

  it("新增记录成功后关闭弹窗并展示成功提示", async () => {
    mockCreateRecord.mockResolvedValueOnce({
      id: "1",
      provider: "dnspod",
      domain: "example.com",
      record_type: "A",
      name: "@",
      content: "1.1.1.1",
      ttl: 600,
      mx_priority: null,
      srv_priority: null,
      srv_weight: null,
      srv_port: null,
      caa_flags: null,
      caa_tag: null,
    });

    render(
      <AppProvider>
        <RecordsRoute />
      </AppProvider>,
    );

    await screen.findAllByText("暂无记录");

    await userEvent.click(screen.getByRole("button", { name: "新增记录" }));
    await userEvent.clear(screen.getByLabelText("记录值（Content）"));
    await userEvent.type(screen.getByLabelText("记录值（Content）"), "1.1.1.1");
    await userEvent.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => expect(screen.queryByLabelText("记录值（Content）")).toBeNull());
    expect(await screen.findByText("记录新增成功")).toBeTruthy();
  });

  it("新增记录失败时展示可读错误信息且弹窗不关闭", async () => {
    mockCreateRecord.mockRejectedValueOnce({ message: "创建失败" });

    render(
      <AppProvider>
        <RecordsRoute />
      </AppProvider>,
    );

    await screen.findAllByText("暂无记录");

    await userEvent.click(screen.getAllByRole("button", { name: "新增记录" })[0]);
    await userEvent.click(screen.getAllByRole("button", { name: "保存" })[0]);

    expect((await screen.findAllByText("创建失败")).length).toBeGreaterThan(0);
    expect(screen.getByLabelText("记录值（Content）")).toBeTruthy();
  });

  it("删除记录成功后展示成功提示", async () => {
    mockListRecords.mockResolvedValueOnce([
      {
        id: "10",
        provider: "dnspod",
        domain: "example.com",
        record_type: "A",
        name: "www",
        content: "1.1.1.1",
        ttl: 600,
        mx_priority: null,
        srv_priority: null,
        srv_weight: null,
        srv_port: null,
        caa_flags: null,
        caa_tag: null,
      },
    ]);
    mockDeleteRecord.mockResolvedValueOnce();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <AppProvider>
        <RecordsRoute />
      </AppProvider>,
    );

    await screen.findByText("www");
    await userEvent.click(screen.getByRole("button", { name: "删除" }));

    expect(await screen.findByText("记录删除成功")).toBeTruthy();
    confirmSpy.mockRestore();
  });
});
