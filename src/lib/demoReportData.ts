export interface ReportIssue {
  severity: 'critical' | 'warning' | 'info';
  text?: string;
  description?: string;
  recommendation?: string;
}

export interface Charge {
  type: string;
  amount?: string;
  description?: string;
  name?: string;
  date?: string;
  paidOff?: string;
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
  size?: string | null;
  tenure?: string;
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
  administrationCharge?: string;
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

export interface DemoReport {
  id: string;
  property_address: string;
  property_url: string | null;
  status: string;
  on_watchlist: boolean;
  created_at: string;
  updated_at: string;
  user_id: string | null;
  documents_count: number | null;
  property_value: number | null;
  file_paths: string[] | null;
  property_subtitle: string;
  scraped_data: {
    extract: {
      address: string;
      lot_type: string;
      number_of_bedrooms: number;
      number_of_bathrooms: number;
      size: string;
      tenure: string;
      guide_price: string;
      auction_date: string;
      catalog_number: string;
      description: string;
      epc_rating: string;
      council_tax: string;
      buyers_charge: string;
      administration_charge_band: string;
    };
  };
  analysis_result: ReportAnalysis;
}

export const demoReportAnalysis: ReportAnalysis = {
  title: {
    issues: [
      {
        severity: 'critical',
        description: 'Property sold with Full Title Guarantee - seller confirms they have the right to sell and transfer the property.',
        recommendation: 'Verify all title documents are complete and review with your solicitor before completion.'
      },
      {
        severity: 'warning',
        description: 'Title register shows one mortgage charge that requires discharge before completion.',
        recommendation: 'Obtain written confirmation from seller that mortgage will be discharged on completion.'
      }
    ],
    description: 'The title of the property is registered and generally in good order, with one outstanding charge requiring discharge on completion.'
  },
  ownership: {
    issues: [
      {
        severity: 'info',
        description: 'Property owned by single registered proprietor since 2015.',
        recommendation: 'Standard ownership structure - no additional due diligence required.'
      },
      {
        severity: 'info',
        description: 'Property previously owned by estate - probate granted in 2015.',
        recommendation: 'Verify probate documentation if required by your lender.'
      }
    ],
  },
  chargesAndMoney: {
    charges: [
      {
        type: "Buyer's Premium",
        amount: "£2,100",
        description: "Buyer's premium inclusive of VAT, payable on completion."
      },
      {
        type: "Administration Charge",
        amount: "£2,400",
        description: "Administration charge inclusive of VAT, payable on completion."
      },
      {
        type: "Mortgage Charge",
        amount: "£185,000",
        description: "Outstanding mortgage charge registered by Barclays Bank plc on 12 March 2019. Will be discharged on completion."
      }
    ],
    issues: [
      {
        severity: 'info',
        description: 'Single mortgage charge registered - standard residential mortgage. Seller confirms discharge will be arranged on completion.',
        recommendation: 'Ensure your solicitor receives confirmation of mortgage discharge before completion.'
      },
      {
        severity: 'info',
        description: 'Buyer will be responsible for buyer\'s premium (£2,100) and administration charges (£2,400) in addition to the purchase price of £425,000.',
        recommendation: 'Factor these additional costs (£4,500) into your budget calculations along with legal fees and stamp duty.'
      }
    ],
  },
  covenants: 'Restrictive covenants apply to the property. The property must not be used for commercial purposes without consent from the original developer. External alterations and extensions require prior approval. No caravans or temporary structures permitted on the land.',
  tenure: 'Freehold.',
  planningAndDevelopment: {
    issues: [
      {
        severity: 'info',
        description: 'Standard permitted development rights apply - extensions and alterations within permitted limits may not require planning permission.',
        recommendation: 'Check with local planning authority before undertaking any development work to confirm permitted development rights.'
      },
      {
        severity: 'info',
        description: 'Property not located in conservation area - standard planning restrictions apply.',
        recommendation: 'Consult with planning department regarding any proposed significant changes or extensions.'
      },
      {
        severity: 'info',
        description: 'Planning history shows extension approved in 2018 - property has been extended previously with proper permissions.',
        recommendation: 'Review planning history if considering further extensions or alterations.'
      }
    ],
  },
  completionAndPenaltyRisks: {
    issues: [
      {
        severity: 'critical',
        description: 'Late completion penalty: 1.5% of purchase price + VAT if completion is missed by even 1 hour. Estimated penalty on this lot: £6,375 - £7,650 (minimum £800 + VAT).',
        recommendation: 'Ensure all financing and legal work is completed well in advance of the completion date. Have mortgage offer and funds ready at least 5 days before completion.'
      },
      {
        severity: 'warning',
        description: 'Completion required within 28 working days from auction date (standard timeframe).',
        recommendation: 'Begin mortgage application and legal work immediately upon successful bid to ensure timely completion.'
      },
      {
        severity: 'info',
        description: 'Seller can serve notice after 12:00 hours on day 28 with 48 hours grace period for completion.',
        recommendation: 'Set reminders and have all completion documents ready at least 3 days before deadline to allow for any last-minute issues.'
      }
    ],
  },
  physicalAndEnvironmentalRisks: {
    issues: [
      {
        severity: 'warning',
        description: 'The property has an energy performance rating of D, indicating potential inefficiencies and higher running costs than more modern properties.',
        recommendation: 'Consider energy efficiency improvements such as cavity wall insulation, loft insulation, and a modern boiler to reduce bills and improve EPC rating to C or better.'
      },
      {
        severity: 'warning',
        description: 'The property produces 3.2 tonnes of CO2 annually, with potential reduction to 1.1 tonnes through recommended improvements.',
        recommendation: 'Implement recommended energy-saving measures to reduce carbon footprint and potentially increase property value.'
      },
      {
        severity: 'info',
        description: 'No Japanese knotweed or other invasive species identified in recent surveys.',
        recommendation: 'No action required regarding invasive species, but maintain vigilance during property ownership.'
      },
      {
        severity: 'info',
        description: 'Property located in stable area with no known mining history or subsidence risks.',
        recommendation: 'Standard structural survey recommended but no specific subsidence concerns identified.'
      },
      {
        severity: 'info',
        description: 'Minor damp issues identified in ground floor areas during recent survey - estimated repair cost £3,500 - £5,000.',
        recommendation: 'Obtain quotes for damp proofing works and factor into purchase budget if proceeding.'
      }
    ],
  },
  specialConditionsAndAmenities: {
    issues: [
      {
        severity: 'warning',
        description: 'General Condition G9 excluded – no misdescription protection - seller not liable for inaccuracies in property description.',
        recommendation: 'Verify all property details independently before bidding, including measurements, room sizes, and property boundaries.'
      },
      {
        severity: 'warning',
        description: 'Buyer must conduct their own searches and inspections - seller provides no warranties regarding property condition.',
        recommendation: 'Engage a qualified surveyor for a thorough inspection and commission all necessary searches including local authority, water, and environmental searches.'
      },
      {
        severity: 'info',
        description: 'Seller reserves right to vary the draft TR1 before completion with 48 hours notice - lenders should be notified of any material changes.',
        recommendation: 'Ensure your solicitor reviews any TR1 variations immediately upon receipt and confirms lender acceptance if required.'
      },
      {
        severity: 'info',
        description: 'Buyer deemed to have full knowledge of title registers and legal pack - must review all documents before bidding.',
        recommendation: 'Review title registers, legal pack, and all documentation thoroughly before bidding to understand all restrictions, obligations, and charges.'
      },
      {
        severity: 'info',
        description: 'Property benefits from good local amenities including schools, shops, and transport links within walking distance.',
        recommendation: 'Visit the area to assess local amenities and transport links to ensure they meet your requirements.'
      }
    ],
  },
  documents: [
    {
      name: 'EPC-Report-42-Maple-Grove.pdf',
      pages: 4,
      keyFindings: 'The property at 42 Maple Grove has an energy performance rating of D, valid until 18 March 2035. Properties can be let if they have an energy rating from A to E, making this property compliant for letting. The current energy score is 62, with potential improvement to a score of 82 (rating C). Average energy bills for heating, hot water, and lighting are estimated at £1,145 per year, with potential savings of £285 if energy efficiency improvements are made. The property produces 3.2 tonnes of CO2 annually, with potential reduction to 1.1 tonnes through improvements. Recommended improvements include cavity wall insulation, loft insulation, and installation of a modern condensing boiler. Financial assistance may be available for energy-saving improvements through various government schemes. The property features solid brick walls with partial insulation, which is rated poor, indicating areas for potential improvement.'
    },
    {
      name: 'Official Copy (Register) – YK789234.pdf',
      pages: 12,
      keyFindings: 'Title registered with Land Registry under title number YK789234. Property held under freehold tenure. Single mortgage charge registered by Barclays Bank plc. Restrictive covenants apply regarding commercial use and external alterations without consent.'
    },
    {
      name: 'Auction Special Conditions-42-Maple-Grove.pdf',
      pages: 17,
      keyFindings: '28-day completion period required from auction date. Late completion penalty of 1.5% of purchase price + VAT applies if completion is delayed. General Conditions G1.6 and G9 excluded. Buyer must conduct own searches and inspections. Seller reserves right to vary TR1 before completion with 48 hours notice.'
    },
    {
      name: 'TR1-Transfer-42-Maple-Grove.pdf',
      pages: 13,
      keyFindings: 'Transfer document prepared and ready for completion. Full Title Guarantee applies. Seller confirms they have the right to sell and will transfer freehold title. No material variations expected but buyer should review final version before completion.'
    },
    {
      name: 'Local Authority Search-Harrogate.pdf',
      pages: 6,
      keyFindings: 'Local authority search reveals property in residential area with no conservation restrictions. Planning history shows extension approved in 2018. No major planning applications pending. Area has good infrastructure and transport links. No known subsidence or mining issues.'
    },
    {
      name: 'Water & Drainage Search-42-Maple-Grove.pdf',
      pages: 28,
      keyFindings: 'Mains water supply confirmed by Yorkshire Water. Property connected to public sewer system. No known flooding issues in the area. Water authority confirms adequate supply capacity. Drainage system in good condition. No known issues with water pressure or quality.'
    },
    {
      name: 'Title Plan-YK789234.pdf',
      pages: 18,
      keyFindings: 'Title plan shows property boundaries clearly marked with red edging. Property includes front garden, rear garden, and off-street parking space. Boundaries match property description accurately. No boundary disputes recorded. Shared boundary with neighbouring properties clearly defined.'
    },
    {
      name: 'Environmental Search-42-Maple-Grove.pdf',
      pages: 12,
      keyFindings: 'No significant environmental risks identified. Property not located in flood risk area. No contaminated land issues recorded. No Japanese knotweed or other invasive species noted in recent surveys. Area has good air quality ratings. No known pollution sources nearby.'
    },
    {
      name: 'Structural Survey Report-2024.pdf',
      pages: 24,
      keyFindings: 'Structural survey conducted in November 2024. Property generally in good structural condition. Some minor damp issues noted in ground floor areas requiring attention. Roof in good condition with recent repairs. No major structural defects identified. Estimated repair costs: £3,500 - £5,000 for damp proofing and minor repairs.'
    }
  ],
  propertyDetails: {
    propertyType: 'Semi-Detached House',
    lotType: 'Semi-Detached House',
    bedrooms: 4,
    bathrooms: 2,
    size: '1,450 sq ft',
    tenure: 'Freehold',
    guidePrice: '£425,000',
    auctionDate: '15/03/2026 14:30',
    auctionDateNote: 'Bidding opens on the specified date and time.',
    address: '42 Maple Grove, Harrogate, North Yorkshire, HG2 8JP',
    catalogNumber: 'Lot 7',
    description: 'A well-presented semi-detached family home requiring some modernisation. This property offers excellent potential for improvement and is situated in a desirable residential area with good transport links. The property benefits from a private rear garden, off-street parking, and is within walking distance of local amenities and schools. Internal inspection is highly recommended to appreciate the full potential of this property.',
    epcRating: 'D',
    councilTax: 'D',
    buyersCharge: '£2,100 INCL VAT',
    administrationCharge: '£2,400 INCL VAT',
    administrationChargeBand: '£2,400 INCL VAT'
  },
};

export const demoReport: DemoReport = {
  id: 'demo',
  property_address: '42 Maple Grove, Harrogate, North Yorkshire, HG2 8JP - Online Auctions',
  property_url: 'https://online.auctionhouse.co.uk/lot/details/demo',
  status: 'completed',
  on_watchlist: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: null,
  documents_count: 9,
  property_value: 425000,
  file_paths: [
    'demo/EPC-Report-42-Maple-Grove.pdf',
    'demo/Official-Copy-Register-YK789234.pdf',
    'demo/Auction-Special-Conditions-42-Maple-Grove.pdf'
  ],
  property_subtitle: 'Harrogate, North Yorkshire, HG2 8JP',
  scraped_data: {
    extract: {
      address: '42 Maple Grove, Harrogate, North Yorkshire, HG2 8JP',
      lot_type: 'Semi-Detached House',
      number_of_bedrooms: 4,
      number_of_bathrooms: 2,
      size: '1,450 sq ft',
      tenure: 'Freehold',
      guide_price: '£425,000',
      auction_date: '15/03/2026 14:30',
      catalog_number: 'Lot 7',
      description: 'A well-presented semi-detached family home requiring some modernisation. This property offers excellent potential for improvement and is situated in a desirable residential area with good transport links. The property benefits from a private rear garden, off-street parking, and is within walking distance of local amenities and schools. Internal inspection is highly recommended to appreciate the full potential of this property.',
      epc_rating: 'D',
      council_tax: 'D',
      buyers_charge: '£2,100 INCL VAT',
      administration_charge_band: '£2,400 INCL VAT'
    }
  },
  analysis_result: demoReportAnalysis
};
