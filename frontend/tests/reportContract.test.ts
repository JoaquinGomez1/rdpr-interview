import { expect, test, vi } from "vitest";
import { loadReport, saveReport } from "../src/pages/root/reportApi";

const id = "04fc9ecf-4953-44e7-8a4a-728afbb1c66a";
const keys = [{ id, view: 1, caption: "Lateral finding" }];
const report = { message: "Saved findings" };

test("rejects a successful save response without a usable report ID", async () => {
  vi.stubGlobal("fetch", async () => Response.json({ id: null, report, keys }, {
    status: 201,
    headers: { "X-Request-Id": "save-request" },
  }));
  await expect(saveReport({ report: report.message, keys })).rejects.toMatchObject({
    status: 201,
    requestId: "save-request",
  });
});

test("rejects a saved key image whose view is missing from the catalog", async () => {
  vi.stubGlobal("fetch", async () => Response.json({
    report,
    keys,
    images: [{ view: 0, name: "Frontal chest", src: "/study/view-1.png" }],
  }));
  await expect(loadReport(id, new AbortController().signal)).rejects.toMatchObject({
    status: 200,
  });
});
