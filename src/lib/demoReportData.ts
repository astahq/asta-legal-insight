export interface ReportIssue {
  severity: 'critical' | 'warning' | 'info';
  text: string;
  recommendation?: string;
}

export interface Charge {
  type: string;
  name?: string;
  amount?: string;
  date?: string;
  paidOff?: string;
  description?: string;
}

export interface Document {
  name: string;
  pages: number;
  keyFindings: string;
}

export interface PropertyDetails {
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  size?: string;
  guidePrice?: string;
  auctionDate?: string;
  auctionDateNote?: string;
  address?: string;
  catalogNumber?: string;
  description?: string;
  lotType?: string;
  epcRating?: string;
  councilTax?: string;
  buyersCharge?: string;
  administrationChargeBand?: string;
}

export interface ReportAnalysis {
  title: {
    issues: ReportIssue[];
    description: string;
  };
  ownership: {
    issues: ReportIssue[];
  };
  chargesAndMoney: {
    charges: Charge[];
    issues: ReportIssue[];
  };
  covenants: string;
  tenure: string;
  planningAndDevelopment: {
    issues: ReportIssue[];
  };
  completionAndPenaltyRisks: {
    issues: ReportIssue[];
  };
  physicalAndEnvironmentalRisks: {
    issues: ReportIssue[];
  };
  specialConditionsAndAmenities: {
    issues: ReportIssue[];
  };
  documents: Document[];
  propertyDetails: PropertyDetails;
}

export const demoReportAnalysis: ReportAnalysis = {
  title: {
    issues: [
      { severity: 'critical', text: 'Critical: Title is unregistered' },
    ],
    description: 'First registration required on completion. Delays common, additional costs £1.5k-£4k, risk of lost priority searches.',
  },
  ownership: {
    issues: [
      { severity: 'warning', text: 'Sold by LPA receiver' },
      { severity: 'warning', text: 'Three beneficial owners' },
    ],
  },
  chargesAndMoney: {
    charges: [
      { type: 'Mortgage', name: 'Halifax plc', amount: '£220,000', date: '8 Jan 2018', paidOff: 'No' },
      { type: 'Statutory', name: 'HMRC', amount: '£12,500', date: '18 Nov 2023', paidOff: 'No' },
      { type: 'Legal', name: 'County Court Business Centre (West)', amount: '£8,750', date: '3 Feb 2024', paidOff: 'Yes' },
    ],
    issues: [
      { severity: 'warning', text: 'Multiple Charges: Suggests financial distress, complex discharge process' },
    ],
  },
  covenants: 'None',
  tenure: 'Freehold',
  planningAndDevelopment: {
    issues: [
      { severity: 'warning', text: 'PD rights partially removed' },
    ],
  },
  completionAndPenaltyRisks: {
    issues: [
      { severity: 'critical', text: 'Late penalty: 1% of purchase price + VAT if you miss by even 1 hour → Estimated penalty on this lot: £4,250 - £5,500 (min £600 + VAT)' },
      { severity: 'warning', text: 'Completion: 20 working days from auction date (not 28/56)' },
      { severity: 'warning', text: 'Seller can serve notice after 1200 hours on day 20 – no grace period' },
    ],
  },
  physicalAndEnvironmentalRisks: {
    issues: [
      { severity: 'warning', text: 'EPC rating E' },
      { severity: 'warning', text: 'Japanese knotweed noted (2022 survey)' },
    ],
  },
  specialConditionsAndAmenities: {
    issues: [
      { severity: 'critical', text: 'General Conditions G1.6 and G11 excluded' },
      { severity: 'warning', text: 'General Condition G9 excluded – no misdescription protection' },
      { severity: 'warning', text: 'Seller reserves right to materially vary the draft TR1 before completion → Lenders may refuse funding or require re-approval at last minute' },
    ],
  },
  documents: [
    { name: '1 Official Copy – Transfer – LT356710.pdf', pages: 8, keyFindings: 'Unregistered title - 3 charges' },
    { name: 'Auction Special Conditions.docx_588155_1.pdf', pages: 17, keyFindings: '20-day completion - 1% penalty - G9 excluded' },
    { name: 'Grant of Probate_588796_1.pdf', pages: 12, keyFindings: '-' },
    { name: 'Local Search.pdf', pages: 2, keyFindings: 'Subsidence risk - mining area' },
    { name: 'MapSearch.pdf', pages: 4, keyFindings: 'MapSearch.pdf' },
    { name: 'Official Copy (Conveya...08.1963 – LT356710.pdf', pages: 5, keyFindings: '-' },
    { name: 'Official Copy (Conveya...1981 – LT356710 (1).pdf', pages: 6, keyFindings: '-' },
    { name: 'Official Copy (Register) – LT356710.pdf', pages: 12, keyFindings: '-' },
    { name: 'Official Copy (Transfer)...071995 – LT356710.pdf', pages: 20, keyFindings: 'Title number - registered owners' },
    { name: 'Title plan.pdf', pages: 15, keyFindings: 'Plan boundaries' },
    { name: 'TR1_588156_1.pdf', pages: 13, keyFindings: 'Seller can vary wording' },
    { name: 'Water & Drainage Search.pdf', pages: 34, keyFindings: 'Mains drainage confirmed' },
  ],
  propertyDetails: {
    propertyType: 'Semi-Detached',
    bedrooms: 4,
    bathrooms: 2,
    size: '1,332 sq ft',
    guidePrice: '£630,000',
    auctionDate: '23 October 2025',
    auctionDateNote: '(in two days)',
  },
};
