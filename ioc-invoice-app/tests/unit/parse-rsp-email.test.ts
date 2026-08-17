import { describe, it, expect } from "vitest";
import { parseRspEmail, parseRspEmailBody, parseRspSubjectDate } from "@/lib/pad/parse-rsp-email";

const SAMPLE_BODY = `Dear Sir/Ma'am,

Price at SRI VARALAKSHMI PETROLEUMS (0000330042) on 21-06-2020 wef 06:00 Hrs is Rs 82.76/L for Petrol, Rs 85.57/L for XP, Rs 76.98/L for Diesel.

Regards,
IOCL.`;

describe("parseRspEmailBody", () => {
  it("parses IOCL price change email", () => {
    const parsed = parseRspEmailBody(SAMPLE_BODY, "330042");

    expect(parsed).not.toBeNull();
    expect(parsed!.customerName).toBe("SRI VARALAKSHMI PETROLEUMS");
    expect(parsed!.customerCode).toBe("330042");
    expect(parsed!.effectiveFrom).toBe("2020-06-21");
    expect(parsed!.effectiveTime).toBe("06:00 Hrs");
    expect(parsed!.prices).toHaveLength(2);
    expect(parsed!.prices.find((p) => p.product === "MS")?.pricePerLitre).toBe(82.76);
    expect(parsed!.prices.find((p) => p.product === "HSD")?.pricePerLitre).toBe(76.98);
  });

  it("rejects wrong customer code", () => {
    expect(parseRspEmailBody(SAMPLE_BODY, "999999")).toBeNull();
  });

  it("parses emails with spaced customer code and - IOCL footer", () => {
    const body = `Dear Sir/Ma'am,

Price at SRI VARALAKSHMI PETROLEUMS ( 0000330042) on 09-03-2021 wef 06:00 
Hrs is Rs 97.43/L for Petrol, Rs 100.26/L for XP, Rs 90.93/L for Diesel. - 
IOCL

Regards,
IOCL.`;

    const parsed = parseRspEmailBody(body, "330042");
    expect(parsed).not.toBeNull();
    expect(parsed!.effectiveFrom).toBe("2021-03-09");
    expect(parsed!.prices.find((p) => p.product === "MS")?.pricePerLitre).toBe(97.43);
    expect(parsed!.prices.find((p) => p.product === "HSD")?.pricePerLitre).toBe(90.93);
  });

  it("parses emails with Hindi disclaimer footer", () => {
    const body = `Dear Sir/Ma'am, Price at SRI VARALAKSHMI PETROLEUMS ( 0000330042) on 09-03-2021 wef 06:00 Hrs is Rs 97.43/L for Petrol, Rs 100.26/L for XP, Rs 90.93/L for Diesel. - IOCL Regards, IOCL. अस्वीकरण यह संदेश`;

    const parsed = parseRspEmailBody(body, "330042");
    expect(parsed?.effectiveFrom).toBe("2021-03-09");
    expect(parsed?.prices).toHaveLength(2);
  });

  it("parses subject date fallback", () => {
    expect(parseRspSubjectDate("Price change wef 21.06.2020 wef 06:00 Hrs")).toBe(
      "2020-06-21"
    );
  });
});
