export type PrintDocument = { key: string; title: string; lines: string[] };
export interface KitchenPrinter {
  submit(
    document: PrintDocument,
  ): Promise<{ status: "submitted" | "disabled"; externalId?: string }>;
}
export class LightspeedPrinter implements KitchenPrinter {
  async submit(_document: PrintDocument): Promise<{ status: "disabled" }> {
    void _document;
    if (process.env.LIGHTSPEED_PRINTING_ENABLED === "true")
      throw new Error(
        "Lightspeed adapter requires approved Rune API access, product mapping, and sandbox verification. Live submission is not implemented.",
      );
    return { status: "disabled" };
  }
}
