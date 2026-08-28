import type { Page } from "playwright";
import type { IrasDsrBatchJob, IrasDsrProduct } from "@/lib/iras/dsr/batch-plan";
import {
  monthYearDisplayMatches,
  monthYearDisplayValue,
  monthYearInputValue,
  monthYearOptionPatterns,
  monthYearShortDisplayValue,
} from "@/lib/iras/dsr/batch-plan";

const MONTH_FULL = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}

export function resolveIrasDsrProductUiLabel(product: IrasDsrProduct): string {
  return product === "HSD" ? "HS" : "MS";
}

export function irasDsrProductUiLabels(product: IrasDsrProduct): string[] {
  const uiLabel = resolveIrasDsrProductUiLabel(product);
  return product === "HSD" ? [uiLabel, "HSD"] : [uiLabel];
}

function optionMatchesMonthYear(optionText: string, month: number, year: number): boolean {
  const normalized = normalizeText(optionText);
  if (!normalized.includes(String(year))) return false;

  const patterns = monthYearOptionPatterns(month, year).map(normalizeText);
  return patterns.some(
    (pattern) => normalized === pattern || normalized.includes(pattern) || pattern.includes(normalized)
  );
}

async function closeOpenMuiMenus(page: Page): Promise<void> {
  await page.keyboard.press("Escape").catch(() => undefined);
  await page.waitForTimeout(200);
}

function isMonthComboboxText(text: string): boolean {
  return /^[A-Za-z]+\s+\d{4}$/.test(text.trim());
}

function isProductComboboxText(text: string): boolean {
  const normalized = text.trim();
  return /select an option/i.test(normalized) || /^MS$/i.test(normalized) || /^HS$/i.test(normalized);
}

async function findProductCombobox(page: Page) {
  const muiSelect = page
    .locator('.MuiSelect-select, [role="combobox"]')
    .filter({ hasText: /select an option|^MS$|^HS$/i });
  if ((await muiSelect.count()) > 0) {
    return muiSelect.first();
  }

  const comboboxes = page.getByRole("combobox");
  const comboboxCount = await comboboxes.count();

  for (let index = 0; index < comboboxCount; index += 1) {
    const combobox = comboboxes.nth(index);
    const text = (await combobox.innerText().catch(() => "")).trim();
    if (isProductComboboxText(text) && !isMonthComboboxText(text)) {
      return combobox;
    }
  }

  if (comboboxCount >= 2) {
    return comboboxes.nth(1);
  }

  return null;
}

async function isProductSelected(page: Page, uiLabel: string): Promise<boolean> {
  const combobox = await findProductCombobox(page);
  if (!combobox) return false;

  const text = (await combobox.innerText().catch(() => "")).trim();
  return new RegExp(`^${uiLabel}$`, "i").test(text);
}

async function openProductMuiMenu(page: Page): Promise<void> {
  await closeOpenMuiMenus(page);

  const combobox = await findProductCombobox(page);
  if (combobox) {
    await combobox.scrollIntoViewIfNeeded().catch(() => undefined);
    await combobox.click({ force: true });
    await page.waitForTimeout(300);
    return;
  }

  const productTrigger = page.getByText(/select an option/i).first();
  if ((await productTrigger.count()) > 0) {
    await productTrigger.click({ force: true });
    await page.waitForTimeout(300);
    return;
  }

  throw new Error("Product MUI combobox not found");
}

async function waitForProductMenu(page: Page): Promise<void> {
  const menuSelectors = [
    '#menu-Select\\ an\\ Option',
    '[id^="menu-"][id*="Option"]',
    ".MuiPopover-root .MuiMenu-list",
    ".MuiMenu-root .MuiList-root",
    '[role="listbox"]',
  ];

  for (const selector of menuSelectors) {
    const menu = page.locator(selector).last();
    try {
      await menu.waitFor({ state: "visible", timeout: 4_000 });
      return;
    } catch {
      // try next selector
    }
  }

  throw new Error("MUI product menu did not open");
}

async function clickMuiMenuOption(page: Page, uiLabel: string): Promise<void> {
  await waitForProductMenu(page);

  const visiblePopover = page.locator(".MuiPopover-root:visible, .MuiMenu-root:visible").last();
  const optionPatterns = [
    visiblePopover.locator(".MuiMenuItem-root").filter({ hasText: new RegExp(`^${uiLabel}$`, "i") }),
    visiblePopover.locator('[role="option"]').filter({ hasText: new RegExp(`^${uiLabel}$`, "i") }),
    visiblePopover.locator('[role="menuitem"]').filter({ hasText: new RegExp(`^${uiLabel}$`, "i") }),
    page.getByRole("option", { name: uiLabel, exact: true }),
    page.getByRole("menuitem", { name: uiLabel, exact: true }),
    page.locator("li").filter({ hasText: new RegExp(`^${uiLabel}$`, "i") }),
  ];

  for (const option of optionPatterns) {
    if ((await option.count()) === 0) continue;
    await option.first().click({ force: true });
    return;
  }

  throw new Error(`MUI menu option ${uiLabel} not found`);
}

async function selectProductViaKeyboard(page: Page, uiLabel: string): Promise<boolean> {
  await closeOpenMuiMenus(page);
  await openProductMuiMenu(page);

  const listbox = page.getByRole("listbox").last();
  if ((await listbox.count()) > 0) {
    const option = listbox
      .locator('[role="option"], [role="menuitem"], li')
      .filter({ hasText: new RegExp(`^${uiLabel}$`, "i") })
      .first();
    if ((await option.count()) > 0) {
      await option.click({ force: true });
      return isProductSelected(page, uiLabel);
    }
  }

  await page.keyboard.type(uiLabel, { delay: 40 });
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  return isProductSelected(page, uiLabel);
}

async function selectProductViaMuiMenu(page: Page, uiLabel: string): Promise<boolean> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    await closeOpenMuiMenus(page);
    await openProductMuiMenu(page);
    await clickMuiMenuOption(page, uiLabel);
    await page.waitForTimeout(300);

    if (await isProductSelected(page, uiLabel)) {
      return true;
    }
  }

  return false;
}

async function selectProductViaDom(page: Page, uiLabel: string): Promise<boolean> {
  return page.evaluate((label) => {
    const target = label.trim().toLowerCase();
    const normalize = (value: string) => value.trim().toLowerCase();

    const selects = Array.from(document.querySelectorAll("select"));
    const productSelect =
      selects.find((select) => {
        const texts = Array.from(select.options).map((option) => normalize(option.text));
        return texts.includes("ms") && texts.includes("hs");
      }) ??
      selects.find((select) => {
        const texts = Array.from(select.options).map((option) => normalize(option.text));
        return texts.includes("ms") || texts.includes("hs");
      });

    if (!productSelect) return false;

    const option = Array.from(productSelect.options).find(
      (entry) => normalize(entry.text) === target || normalize(entry.value) === target
    );
    if (!option) return false;

    productSelect.value = option.value;
    productSelect.dispatchEvent(new Event("input", { bubbles: true }));
    productSelect.dispatchEvent(new Event("change", { bubbles: true }));
    productSelect.dispatchEvent(new Event("blur", { bubbles: true }));
    return normalize(productSelect.options[productSelect.selectedIndex]?.text ?? "") === target;
  }, uiLabel);
}

async function selectProductViaPlaywrightSelect(page: Page, uiLabel: string): Promise<boolean> {
  const productSelect = page
    .locator("select")
    .filter({ has: page.locator("option", { hasText: /^MS$/i }) })
    .filter({ has: page.locator("option", { hasText: /^HS$/i }) });

  if ((await productSelect.count()) > 0) {
    await productSelect.first().selectOption({ label: uiLabel });
    return true;
  }

  const fallbackSelect = page.locator("select").filter({
    has: page.locator("option", { hasText: new RegExp(`^${uiLabel}$`, "i") }),
  });

  if ((await fallbackSelect.count()) === 0) {
    return false;
  }

  await fallbackSelect.first().selectOption({ label: uiLabel });
  return true;
}

async function selectProductViaDropdownClick(page: Page, uiLabel: string): Promise<boolean> {
  await page.keyboard.press("Escape").catch(() => undefined);

  const openers = [
    page.getByRole("button", { name: /select an option/i }),
    page.locator("select").filter({ has: page.locator("option", { hasText: /^(MS|HS)$/i }) }),
    page.getByText(/select an option/i),
  ];

  for (const opener of openers) {
    if ((await opener.count()) === 0) continue;

    await opener.first().click({ force: true });
    await page.waitForTimeout(400);

    const menuScopes = [
      page.locator(".dropdown-menu.show"),
      page.locator(".dropdown.open .dropdown-menu"),
      page.locator("[role='listbox']"),
      page.locator(".mat-select-panel"),
      page.locator("select").filter({ has: page.locator("option", { hasText: /^(MS|HS)$/i }) }),
    ];

    for (const menu of menuScopes) {
      if ((await menu.count()) === 0) continue;

      const option = menu.getByText(uiLabel, { exact: true });
      if ((await option.count()) === 0) continue;

      await option.first().click({ force: true });
      return true;
    }

    const globalOption = page
      .locator("a, button, li, span, div, option")
      .filter({ hasText: new RegExp(`^${uiLabel}$`, "i") });

    if ((await globalOption.count()) > 0) {
      await globalOption.first().click({ force: true });
      return true;
    }
  }

  return false;
}

export async function selectDsrProduct(page: Page, product: IrasDsrBatchJob["product"]): Promise<void> {
  const uiLabel = resolveIrasDsrProductUiLabel(product);
  const strategies = [
    () => selectProductViaMuiMenu(page, uiLabel),
    () => selectProductViaKeyboard(page, uiLabel),
    () => selectProductViaDom(page, uiLabel),
    () => selectProductViaPlaywrightSelect(page, uiLabel),
    () => selectProductViaDropdownClick(page, uiLabel),
  ];

  let lastError: unknown = null;

  for (const strategy of strategies) {
    try {
      if (await strategy()) {
        if (await isProductSelected(page, uiLabel)) {
          return;
        }
      }
    } catch (error) {
      lastError = error;
      await closeOpenMuiMenus(page);
    }
  }

  if (lastError instanceof Error) {
    throw new Error(`Could not select product ${product} (${uiLabel}) on the DSR page: ${lastError.message}`);
  }

  throw new Error(`Could not select product ${product} (${uiLabel}) on the DSR page`);
}

async function readDisplayedMonthYear(page: Page): Promise<string | null> {
  const textInputs = page.locator('input[type="text"]');
  const textInputCount = await textInputs.count();

  for (let index = 0; index < textInputCount; index += 1) {
    const field = textInputs.nth(index);
    const value = (await field.inputValue().catch(() => "")).trim();
    if (/^[A-Za-z]+\s+\d{4}$/.test(value)) return value;
  }

  const monthCombobox = page.getByRole("combobox").first();
  if ((await monthCombobox.count()) > 0) {
    const text = (await monthCombobox.innerText().catch(() => "")).trim();
    if (/^[A-Za-z]+\s+\d{4}$/.test(text)) return text;
  }

  return null;
}

async function findMonthInput(page: Page) {
  const textInputs = page.locator('input[type="text"]');
  const textInputCount = await textInputs.count();

  for (let index = 0; index < textInputCount; index += 1) {
    const field = textInputs.nth(index);
    const value = (await field.inputValue().catch(() => "")).trim();
    if (/^[A-Za-z]+\s+\d{4}$/.test(value)) return field;
  }

  const monthCombobox = page.getByRole("combobox").first();
  if ((await monthCombobox.count()) > 0) {
    return monthCombobox;
  }

  return null;
}

async function selectMuiMonthYearViaCalendar(page: Page, month: number, year: number): Promise<boolean> {
  const monthInput = await findMonthInput(page);
  if (!monthInput) return false;

  await closeOpenMuiMenus(page);
  await monthInput.click();
  await page.waitForTimeout(400);

  const calendar = page.locator(".MuiPickersPopper-root, .MuiPopover-root, .MuiDateCalendar-root").last();
  const yearButton = calendar.getByRole("button", { name: String(year) });
  if ((await yearButton.count()) > 0) {
    await yearButton.first().click();
    await page.waitForTimeout(200);
  }

  const monthLabels = [MONTH_FULL[month - 1], MONTH_SHORT[month - 1]].filter(Boolean);
  for (const label of monthLabels) {
    const monthButton = calendar.getByRole("button", { name: new RegExp(`^${label}$`, "i") });
    if ((await monthButton.count()) === 0) continue;
    await monthButton.first().click();
    await page.waitForTimeout(200);
    if (await verifyDsrMonthYear(page, month, year)) {
      return true;
    }
  }

  return false;
}

async function fillMonthFieldValue(page: Page, field: ReturnType<Page["locator"]>, value: string): Promise<boolean> {
  await field.click({ clickCount: 3 });
  await field.fill(value);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(200);
  await closeOpenMuiMenus(page);
  return true;
}

async function selectMuiMonthYear(page: Page, month: number, year: number): Promise<boolean> {
  await closeOpenMuiMenus(page);

  const monthInput = await findMonthInput(page);
  if (monthInput) {
    await fillMonthFieldValue(page, monthInput, monthYearDisplayValue(month, year));
    if (await verifyDsrMonthYear(page, month, year)) {
      return true;
    }

    await fillMonthFieldValue(page, monthInput, monthYearShortDisplayValue(month, year));
    if (await verifyDsrMonthYear(page, month, year)) {
      return true;
    }
  }

  if (await selectMuiMonthYearViaCalendar(page, month, year)) {
    return true;
  }

  const monthCombobox = page.getByRole("combobox").first();
  if ((await monthCombobox.count()) > 0) {
    await monthCombobox.click();
    await page.keyboard.press("Control+A").catch(() => undefined);
    await page.keyboard.type(monthYearShortDisplayValue(month, year), { delay: 20 });
    await page.keyboard.press("Enter");
    await closeOpenMuiMenus(page);
    return verifyDsrMonthYear(page, month, year);
  }

  return false;
}

async function selectMonthViaDom(page: Page, month: number, year: number): Promise<boolean> {
  const monthInputValue = monthYearInputValue(month, year);
  const monthDisplayValue = monthYearDisplayValue(month, year);

  return page.evaluate(
    ({ inputValue, displayValue }) => {
      const monthInput = document.querySelector('input[type="month"]') as HTMLInputElement | null;
      if (monthInput) {
        monthInput.value = inputValue;
        monthInput.dispatchEvent(new Event("input", { bubbles: true }));
        monthInput.dispatchEvent(new Event("change", { bubbles: true }));
        return true;
      }

      const inputs = Array.from(document.querySelectorAll("input"));
      for (const input of inputs) {
        const containerText = input.closest("div, label, td, th, .form-group")?.textContent ?? "";
        const placeholder = input.getAttribute("placeholder") ?? "";
        if (!/select a month/i.test(containerText) && !/month/i.test(placeholder)) {
          continue;
        }

        input.focus();
        input.value = displayValue;
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        input.dispatchEvent(new Event("blur", { bubbles: true }));
        return true;
      }

      return false;
    },
    { inputValue: monthInputValue, displayValue: monthDisplayValue }
  );
}

async function fillMonthInput(page: Page, month: number, year: number): Promise<boolean> {
  if (await selectMuiMonthYear(page, month, year)) {
    return true;
  }

  if (await selectMonthViaDom(page, month, year)) {
    return true;
  }

  const monthInputValue = monthYearInputValue(month, year);
  const monthDisplayValue = monthYearDisplayValue(month, year);

  const monthPicker = page.locator('input[type="month"]');
  if ((await monthPicker.count()) > 0) {
    await monthPicker.first().fill(monthInputValue);
    return true;
  }

  const labeledInputs = [
    page.getByLabel(/select a month/i),
    page.locator('input[placeholder*="Month" i]'),
    page.locator('input[placeholder*="month" i]'),
  ];

  for (const input of labeledInputs) {
    if ((await input.count()) === 0) continue;
    const field = input.first();
    await field.click();
    await field.fill(monthDisplayValue);
    await page.keyboard.press("Tab");
    return true;
  }

  const textInputs = page.locator('input[type="text"], input:not([type])');
  const textInputCount = await textInputs.count();

  for (let index = 0; index < textInputCount; index += 1) {
    const field = textInputs.nth(index);
    const value = await field.inputValue().catch(() => "");
    const placeholder = (await field.getAttribute("placeholder")) ?? "";
    const ariaLabel = (await field.getAttribute("aria-label")) ?? "";

    if (
      /month/i.test(placeholder) ||
      /month/i.test(ariaLabel) ||
      /[A-Za-z]+\s20\d{2}/.test(value)
    ) {
      await field.click();
      await field.fill("");
      await field.fill(monthDisplayValue);
      await page.keyboard.press("Tab");
      return true;
    }
  }

  return false;
}

async function selectFromOptions(
  page: Page,
  matcher: (optionText: string) => boolean,
  fieldLabel: string
): Promise<void> {
  const selects = page.locator("select");
  const selectCount = await selects.count();

  for (let index = 0; index < selectCount; index += 1) {
    const select = selects.nth(index);
    const options = await select.locator("option").allTextContents();
    const match = options.find(matcher);
    if (!match) continue;

    await select.selectOption({ label: match }).catch(async () => {
      const optionValue = await select
        .locator("option")
        .filter({ hasText: match })
        .first()
        .getAttribute("value");
      if (optionValue) {
        await select.selectOption(optionValue);
        return;
      }
      throw new Error(`Unable to select ${fieldLabel}: ${match}`);
    });
    return;
  }

  throw new Error(`Could not find ${fieldLabel} dropdown on the DSR page`);
}

export async function verifyDsrMonthYear(page: Page, month: number, year: number): Promise<boolean> {
  const textInputs = page.locator('input[type="text"]');
  const textInputCount = await textInputs.count();

  for (let index = 0; index < textInputCount; index += 1) {
    const field = textInputs.nth(index);
    const value = (await field.inputValue().catch(() => "")).trim();
    if (!/^[A-Za-z]+\s+\d{4}$/.test(value)) continue;
    if (monthYearDisplayMatches(value, month, year)) return true;
  }

  const monthCombobox = page.getByRole("combobox").first();
  if ((await monthCombobox.count()) > 0) {
    const text = (await monthCombobox.innerText().catch(() => "")).trim();
    if (monthYearDisplayMatches(text, month, year)) return true;
  }

  return false;
}

export async function selectDsrMonthYear(page: Page, month: number, year: number): Promise<void> {
  if (await fillMonthInput(page, month, year)) {
    if (await verifyDsrMonthYear(page, month, year)) {
      return;
    }
  }

  await selectFromOptions(
    page,
    (optionText) => optionMatchesMonthYear(optionText, month, year),
    `month (${month}/${year})`
  );

  if (!(await verifyDsrMonthYear(page, month, year))) {
    const displayed = await readDisplayedMonthYear(page);
    throw new Error(
      displayed
        ? `Could not set month to ${monthYearDisplayValue(month, year)} on the DSR page (field shows ${displayed})`
        : `Could not set month to ${monthYearDisplayValue(month, year)} on the DSR page`
    );
  }
}

export async function clickDsrSubmit(page: Page): Promise<void> {
  const submitButton = page.getByRole("button", { name: /^submit$/i }).first();
  if ((await submitButton.count()) > 0) {
    await submitButton.waitFor({ state: "visible", timeout: 10_000 });
    await submitButton.click();
    return;
  }

  const genericSubmit = page
    .getByRole("button", { name: /submit|generate|view report|search/i })
    .first();
  if ((await genericSubmit.count()) > 0) {
    await genericSubmit.waitFor({ state: "visible", timeout: 10_000 });
    await genericSubmit.click();
    return;
  }

  const submitInput = page.locator('input[type="submit"], button[type="submit"]').first();
  if ((await submitInput.count()) > 0) {
    await submitInput.waitFor({ state: "visible", timeout: 10_000 });
    await submitInput.click();
    return;
  }

  throw new Error("Could not find the DSR Submit button on the page");
}

export async function submitDsrBatchJob(page: Page, job: IrasDsrBatchJob): Promise<void> {
  await selectDsrMonthYear(page, job.month, job.year);
  await page.waitForTimeout(500);
  await selectDsrProduct(page, job.product);
  await page.waitForTimeout(500);
  await clickDsrSubmit(page);
}

export function findLikelyDsrPage(pages: Page[]): Page | null {
  for (const page of pages) {
    const url = page.url().toLowerCase();
    if (
      url.includes("daily-sales-report") ||
      url.includes("dsr") ||
      url.includes("dailysales") ||
      url.includes("daily-sales")
    ) {
      return page;
    }
  }

  return pages[0] ?? null;
}
