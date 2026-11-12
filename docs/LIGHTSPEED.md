# Lightspeed Restaurant O-Series printing investigation

Reviewed 12 November 2026. No Rune credentials, POS calls, orders or automatic printing were used.

Official documentation describes Pass Thru Printing for O-Series API orders; it does not establish a general-purpose raw-text printer endpoint. Printing is associated with an order and configured products/production printers. RM production summaries therefore cannot safely be assumed to print as arbitrary documents through Rune's existing printer.

- [O-Series Orders API and Pass Thru Printing](https://apidoc.kounta.com/orders/) documents order creation and pass-through printing.
- [Company/site API status](https://apidoc.kounta.com/companies/) describes the pass-through printing register status when enabled.
- [Create your first O-Series add-on](https://o-series-support.lightspeedhq.com/hc/en-us/articles/31329390831771-Developers-Create-Your-First-Add-On) explains developer/API plan access and certification.
- [Production printer configuration](https://o-series-support.lightspeedhq.com/hc/en-us/articles/31329467693339-Setting-up-production-printing) describes printer setup.

## Required before connecting Rune

Confirm with Lightspeed that Rune has the required API plan/add-on permissions. Obtain approved company/site identifiers and OAuth/API access through secure settings. Confirm the pass-through register is online and its production printer routes. Establish supported product mappings and whether kitchen-only docket orders affect POS sales, tax and reporting. Confirm whether a supported non-sale document or external printer option exists for aggregate production sheets; do not fabricate zero-value sales as a workaround.

Use a separate sandbox or a vendor-approved test plan. Agree on remote idempotency and reprint handling. A timeout after submission means **unknown**, not failed: reconcile the remote order before retrying. Obtain explicit approval before creating any live Rune order or enabling automatic printing.

## Current implementation

`lib/printing.ts` defines `KitchenPrinter` and `PrintDocument`. The Lightspeed adapter returns disabled; even setting the feature flag throws a setup-required error instead of sending a POS order. The working alternative is browser printing for production sheets and customer packing dockets. `print_jobs` records deduplicated dialog requests. Explicit reprint creates a new attempt. Physical success is not asserted. Live job retries/status polling remain a future provider-specific implementation after API verification.
