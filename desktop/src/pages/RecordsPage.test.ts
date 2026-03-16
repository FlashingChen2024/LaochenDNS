import { beforeEach, describe, expect, it } from "vitest";
import { readDomainsCache } from "./RecordsPage";

describe("readDomainsCache", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("collects domain rows from scoped cache keys and prefers the newest entry", () => {
    localStorage.setItem(
      "laochen_dns_domains_cache_v1:all:",
      JSON.stringify({
        updatedAt: 1,
        rows: [
          {
            provider: "cloudflare",
            name: "old.example.com",
            provider_id: "zone-1",
            status: "ok",
            records_count: 1,
            last_changed_at: null,
          },
        ],
      }),
    );

    localStorage.setItem(
      "laochen_dns_domains_cache_v1:cloudflare:example",
      JSON.stringify({
        updatedAt: 2,
        rows: [
          {
            provider: "cloudflare",
            name: "new.example.com",
            provider_id: "zone-1",
            status: "ok",
            records_count: 2,
            last_changed_at: null,
          },
        ],
      }),
    );

    expect(readDomainsCache()).toEqual([
      {
        provider: "cloudflare",
        name: "new.example.com",
        provider_id: "zone-1",
        status: "ok",
        records_count: 2,
        last_changed_at: null,
      },
    ]);
  });
});
