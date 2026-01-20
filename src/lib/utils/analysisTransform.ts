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

  const getValue = (value: unknown): string | undefined => {
    if (value === null || value === undefined) return undefined;
    const str = String(value);
    return str === "null" ? undefined : str;
  };

  const getNumber = (value: unknown, fallback?: number): number | undefined => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "number") return value;
    const str = String(value);
    if (str === "null") return fallback;
    const parsed = parseInt(str, 10);
    return isNaN(parsed) ? fallback : parsed;
  };

  const lotType = getValue(raw.lot_type);
  return {
    address: getValue(raw.address),
    propertyType: lotType,
    lotType: lotType,
    bedrooms: getNumber(raw.number_of_bedrooms),
    bathrooms: getNumber(raw.number_of_bathrooms, 1),
    size: getValue(raw.size),
    tenure: getValue(raw.tenure),
    guidePrice: getValue(raw.guide_price),
    auctionDate: getValue(raw.auction_date),
    catalogNumber: getValue(raw.catalog_number),
    description: getValue(raw.description),
    epcRating: getValue(raw.epc_rating),
    councilTax: getValue(raw.council_tax),
    buyersCharge: getValue(raw.buyers_charge),
    administrationChargeBand: getValue(raw.administration_charge_band),
  };
}

function getPropertyDetails(report: unknown): PropertyDetails {
  if (!isRecord(report)) return {};

  if (isRecord(report.scraped_data) && isRecord(report.scraped_data.extract)) {
    return transformPropertyDetails(report.scraped_data.extract);
  }

  if (isRecord(report.analysis_result) && isRecord(report.analysis_result.propertyDetails)) {
    return transformPropertyDetails(report.analysis_result.propertyDetails);
  }

  return {};
}

export function transformAnalysisResult(
  raw: unknown,
  report?: unknown
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

  const propertyDetails = report ? getPropertyDetails(report) : transformPropertyDetails(raw.propertyDetails);

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
