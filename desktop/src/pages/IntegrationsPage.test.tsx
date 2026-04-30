import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { IntegrationsPage } from "./IntegrationsPage";

vi.mock("../app/AppContext", () => ({
  useApp: () => ({
    masterPassword: "test-password",
    notifyError: vi.fn(),
    notifySuccess: vi.fn(),
  }),
}));

vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return {
    ...actual,
    getIntegrations: vi.fn(async () => ({
      cloudflare: { configured: false, last_verified_at: null },
      dnspod: { configured: false, last_verified_at: null },
      aliyun: { configured: false, last_verified_at: null },
      huawei: { configured: false, last_verified_at: null },
      baidu: { configured: false, last_verified_at: null },
      dnscom: { configured: false, last_verified_at: null },
      rainyun: { configured: false, last_verified_at: null },
      tencentcloud: { configured: false, last_verified_at: null },
    })),
    listDomains: vi.fn(async () => []),
    resolveErrorMessage: vi.fn((error: unknown) => String(error)),
    clearAliyun: vi.fn(),
    clearBaidu: vi.fn(),
    clearCloudflare: vi.fn(),
    clearDnscom: vi.fn(),
    clearDnspod: vi.fn(),
    clearHuawei: vi.fn(),
    clearRainyun: vi.fn(),
    clearTencentCloud: vi.fn(),
    saveAliyun: vi.fn(),
    saveBaidu: vi.fn(),
    saveCloudflare: vi.fn(),
    saveDnscom: vi.fn(),
    saveDnspod: vi.fn(),
    saveHuawei: vi.fn(),
    saveRainyun: vi.fn(),
    saveTencentCloud: vi.fn(),
    testAliyun: vi.fn(),
    testBaidu: vi.fn(),
    testCloudflare: vi.fn(),
    testDnscom: vi.fn(),
    testDnspod: vi.fn(),
    testHuawei: vi.fn(),
    testRainyun: vi.fn(),
    testTencentCloud: vi.fn(),
  };
});

describe("IntegrationsPage credential guides", () => {
  test("shows Cloudflare API Token acquisition guidance", async () => {
    render(<IntegrationsPage />);

    await userEvent.click(await screen.findByText("Cloudflare"));

    expect(screen.getByText("如何获取 API Token")).toBeTruthy();
    expect(screen.getByText("选择 Edit zone DNS 模板创建 Token。")).toBeTruthy();
    expect(screen.getByText("复制后粘贴到下方 API Token 输入框。")).toBeTruthy();
  });
});
