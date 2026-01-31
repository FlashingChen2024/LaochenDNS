import { test, expect } from "@playwright/experimental-ct-react";
import { ModalHarness } from "./records-modal.harness";

test("新增记录成功后关闭弹窗并展示成功提示", async ({ mount }) => {
  const component = await mount(<ModalHarness mode="success" />);

  await component.getByRole("button", { name: "保存" }).click();
  await expect(component.getByText("记录新增成功")).toBeVisible();
  await expect(component.getByText("已关闭")).toBeVisible();
});

test("新增记录失败时展示错误信息且弹窗保持打开", async ({ mount }) => {
  const component = await mount(<ModalHarness mode="error" />);

  await component.getByRole("button", { name: "保存" }).click();
  await expect(component.getByText("创建失败").first()).toBeVisible();
  await expect(component.getByText("已关闭")).toHaveCount(0);
});
