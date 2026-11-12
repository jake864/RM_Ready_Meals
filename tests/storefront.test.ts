import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React from "react";
import { meals, packs } from "../lib/catalog";
import { nextBatch } from "../lib/domain";
test("customer builds exact mixed pack, inspects allergens, and reviews guest checkout", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost",
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    sessionStorage: dom.window.sessionStorage,
  });
  const { render, fireEvent, within, cleanup } =
    await import("@testing-library/react");
  const { default: Storefront } = await import("../components/Storefront");
  const ui = render(
    React.createElement(Storefront, {
      menu: meals,
      packs,
      batch: {
        ...nextBatch(new Date("2026-11-12")),
        id: "preview",
        suspended: false,
      },
    }),
  );
  const review = ui.getByRole("button", {
    name: /Review your pack/,
  }) as HTMLButtonElement;
  assert.ok(review.disabled);
  fireEvent.click(
    ui.getByRole("button", { name: "Add Beef Ragu Protein Pasta" }),
  );
  fireEvent.click(
    ui.getByRole("button", { name: "Add Ayam Kecap Chicken & Rice" }),
  );
  fireEvent.click(ui.getByRole("button", { name: "Add Beef Rendang & Rice" }));
  assert.equal(review.disabled, false);
  assert.ok(
    (
      ui.getByRole("button", {
        name: "Add High-Protein Nasi Goreng",
      }) as HTMLButtonElement
    ).disabled,
  );
  fireEvent.click(
    ui.getByRole("button", { name: "View Beef Ragu Protein Pasta" }),
  );
  let modal = ui.getByRole("dialog");
  assert.ok(within(modal).getByText("Allergen information · unverified"));
  assert.match(modal.textContent || "", /Nutrition unverified/);
  fireEvent.keyDown(document, { key: "Escape" });
  assert.equal(ui.queryByRole("dialog"), null);
  fireEvent.click(review);
  modal = ui.getByRole("dialog");
  assert.ok(within(modal).getByText("1 × Beef Ragu Protein Pasta"));
  assert.ok(within(modal).getByLabelText("Full name"));
  assert.ok(within(modal).getByLabelText("Email"));
  assert.ok(within(modal).getByLabelText("Phone"));
  assert.ok(within(modal).getByText("$42.00"));
  fireEvent.click(
    within(modal).getByRole("button", { name: "Close checkout" }),
  );
  fireEvent.click(ui.getByRole("button", { name: /5RM/ }));
  assert.ok(review.disabled);
  assert.match(ui.getByText(/meals selected/).textContent || "", /0 \/ 5/);
  cleanup();
  dom.window.close();
});
test("sample kitchen renders production quantities, customer dockets and print action", async () => {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost",
  });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
  });
  let printCalls = 0;
  dom.window.print = () => {
    printCalls++;
  };
  const { render, fireEvent, within, cleanup } =
    await import("@testing-library/react");
  const { default: Admin } = await import("../components/Admin");
  const ui = render(React.createElement(Admin));
  fireEvent.click(ui.getByRole("button", { name: "Explore sample kitchen" }));
  assert.ok(
    ui.getByText(
      "SAMPLE WORKSPACE · Fictional orders. Editing and physical printer integration are disabled.",
    ),
  );
  assert.ok(ui.getByText("$122.00"));
  fireEvent.click(ui.getByRole("button", { name: "Kitchen" }));
  const recipe = ui
    .getByText("Beef Ragu Protein Pasta")
    .closest(".kitchen-card") as HTMLElement;
  assert.ok(within(recipe).getByText("3"));
  fireEvent.click(ui.getByRole("button", { name: "Print production sheet ↗" }));
  assert.equal(printCalls, 1);
  fireEvent.click(ui.getByRole("button", { name: "Dockets" }));
  assert.equal(ui.container.querySelectorAll(".docket").length, 3);
  fireEvent.change(ui.getByLabelText("Customer"), {
    target: { value: "sample-001" },
  });
  assert.equal(ui.container.querySelectorAll(".docket").length, 1);
  assert.ok(ui.getByRole("heading", { name: "Alex Morgan" }));
  assert.ok(ui.getByText("□ 2 × Beef Ragu Protein Pasta"));
  cleanup();
  dom.window.close();
});
