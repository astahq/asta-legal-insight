import {
  ReportAnalysis,
  ReportIssue,
  Charge,
  Document,
  PropertyDetails
} from "@/lib/demoReportData";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function ensureIssues(issues: unknown): ReportIssue[] {
  if (!Array.isArray(issues)) return [];
  return issues.map((issue: unknown) => {
    if (typeof issue === "string") {
      return { severity: "info" as const, text: issue };
    }
    if (!isRecord(issue)) {
      return { severity: "info" as const, text: JSON.stringify(issue) };
    }
    const severity = issue.severity as ReportIssue["severity"] | undefined;
    const text =
      (issue.text as string) || (issue.description as string) || JSON.stringify(issue);
    const recommendation = issue.recommendation as string | undefined;
    return {
      severity: severity || "info",
      text,
      ...(recommendation && { recommendation }),
    };
  });
}

function transformCharges(charges: unknown): Charge[] {
  if (!Array.isArray(charges)) return [];
  return charges.map((charge: unknown) => {
    if (!isRecord(charge)) return { type: "Unknown" };
    return {
      type: (charge.type as string) || "Unknown",
      name: charge.name as string | undefined,
      amount: charge.amount as string | undefined,
      date: charge.date as string | undefined,
      paidOff: (charge.paidOff as string) || (charge.paid_off as string) || undefined,
      description: charge.description as string | undefined,
    };
  });
}

function transformDocuments(documents: unknown): Document[] {
  if (!Array.isArray(documents)) return [];
  return documents.map((doc: unknown) => {
    if (!isRecord(doc)) return { name: "", pages: 0, keyFindings: "" };
    return {
      name: (doc.name as string) || "",
      pages: (doc.pages as number) || 0,
      keyFindings:
        (doc.keyFindings as string) || (doc.key_findings as string) || "",
    };
  });
}

function transformPropertyDetails(raw: unknown): PropertyDetails {
  if (!isRecord(raw)) {
    return {};
  }

  const getString = (key: string, altKey?: string): string | undefined => {
    const value = raw[key] || (altKey ? raw[altKey] : undefined);
    return value ? String(value) : undefined;
  };

  const getNumber = (key: string, altKey?: string): number | undefined => {
    const value = raw[key] || (altKey ? raw[altKey] : undefined);
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  };

  return {
    propertyType: getString("propertyType", "property_type"),
    bedrooms: getNumber("bedrooms", "number_of_bedrooms"),
    bathrooms: getNumber("bathrooms", "number_of_bathrooms"),
    size: getString("size"),
    guidePrice: getString("guidePrice", "guide_price"),
    auctionDate: getString("auctionDate", "auction_date"),
    auctionDateNote: getString("auctionDateNote", "auction_date_note"),
    address: getString("address"),
    catalogNumber: getString("catalogNumber", "catalog_number"),
    description: getString("description"),
    lotType: getString("lotType", "lot_type"),
    epcRating: getString("epcRating", "epc_rating"),
    councilTax: getString("councilTax", "council_tax"),
    buyersCharge: getString("buyersCharge", "buyers_charge"),
    administrationChargeBand: getString(
      "administrationChargeBand",
      "administration_charge_band"
    ),
  };
}

export function transformAnalysisResult(
  raw: unknown
): ReportAnalysis | null {
  if (!isRecord(raw)) return null;

  const getSection = (key: string) => {
    const section = raw[key];
    if (!isRecord(section)) return { issues: [], summary: "" };
    return {
      issues: ensureIssues(section.issues),
      summary: (section.summary as string) || "",
      details: (section.details as string) || "",
    };
  };

  const titleSection = getSection("title");
  const ownershipSection = getSection("ownership");
  const chargesSection = getSection("chargesAndMoney");
  const planningSection = getSection("planningAndDevelopment");
  const completionSection = getSection("completionAndPenaltyRisks");
  const physicalSection = getSection("physicalAndEnvironmentalRisks");
  const specialSection = getSection("specialConditionsAndAmenities");

  const tenure = (raw.tenure as string) || "Unknown";
  const covenants = (raw.covenants as string) || "Unknown";

  const propertyDetails = transformPropertyDetails(raw.propertyDetails);

  const titleObj = isRecord(raw.title) ? raw.title : {};
  return {
    title: {
      issues: titleSection.issues,
      description: (titleObj.description as string) || titleSection.summary || "",
    },
    ownership: {
      issues: ownershipSection.issues,
    },
    chargesAndMoney: {
      charges: isRecord(raw.chargesAndMoney)
        ? transformCharges(raw.chargesAndMoney.charges)
        : [],
      issues: chargesSection.issues,
    },
    covenants,
    tenure,
    planningAndDevelopment: {
      issues: planningSection.issues,
    },
    completionAndPenaltyRisks: {
      issues: completionSection.issues,
    },
    physicalAndEnvironmentalRisks: {
      issues: physicalSection.issues,
    },
    specialConditionsAndAmenities: {
      issues: specialSection.issues,
    },
    documents: transformDocuments(raw.documents),
    propertyDetails
  };
}
