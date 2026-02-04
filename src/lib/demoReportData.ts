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
        description: 'CRITICAL DOCUMENT ERROR: Legal pack documents refer to entirely different property than the auction listing. This appears to be the wrong legal pack uploaded.',
        recommendation: 'DO NOT BID until correct legal pack for the property is provided. The current documents are for a different property.'
      },
      {
        severity: 'critical',
        description: 'Official copy of Conveyance dated 09.08.1963 (LT356710) is incomplete without the preceding notes page. Missing notes may contain essential details about rights, restrictions, or obligations affecting the property.',
        recommendation: 'Obtain complete document with all notes pages before proceeding. The missing notes could contain crucial title information.'
      },
      {
        severity: 'critical',
        description: 'Official copy of Conveyance dated 22.05.1981 (LT356710) is incomplete without the preceding notes page. Missing notes may contain essential details about boundary structures and rights.',
        recommendation: 'Obtain complete document with all notes pages before proceeding.'
      },
      {
        severity: 'critical',
        description: 'Official copy of Transfer dated 27.07.1995 (LT356710) is incomplete without the preceding notes page. Missing notes may contain essential details about rights granted.',
        recommendation: 'Obtain complete document with all notes pages before proceeding.'
      },
      {
        severity: 'warning',
        description: 'Property sold with Limited Title Guarantee. Buyer assumes certain risks regarding title and cannot raise requisitions on matters that would be revealed by searches or inspection.',
        recommendation: 'Conduct full due diligence including official searches and physical inspection. Limited guarantee means seller may not compensate for undisclosed title defects.'
      },
      {
        severity: 'warning',
        description: 'Title register shows restriction: No disposition can be registered without written consent from charge holder. This restricts ability to sell or mortgage without lender approval.',
        recommendation: 'Confirm that charge holder consent will be provided upon completion. This could delay or block future sales.'
      },
      {
        severity: 'info',
        description: 'Mines and minerals are excluded from the title registration. Third party may own sub-surface rights.',
        recommendation: 'Investigate extent of mineral rights ownership and any potential exploitation rights.'
      },
      {
        severity: 'info',
        description: 'Property is subject to rights and covenants from multiple historic conveyances and transfers. Complex web of historic rights affects the property.',
        recommendation: 'Review all historic conveyance documents to understand full extent of rights and obligations.'
      }
    ],
    description: 'Leasehold title for demo property registered at HM Land Registry under Title Number LT356710. Title is absolute but subject to registered charge, restrictive covenants, and numerous historic rights. Property sold with Limited Title Guarantee.'
  },
  ownership: {
    issues: [
      {
        severity: 'critical',
        description: 'Property is being sold by executors of deceased owner. Grant of probate required.',
        recommendation: 'Verify grant of probate has been obtained and executors have legal authority to sell. Executor sales can be delayed if estate administration is incomplete.'
      },
      {
        severity: 'warning',
        description: 'Transfer from executors to transferee is stated as not for money or anything that has a monetary value indicating a non-commercial transfer (likely inheritance or gift).',
        recommendation: 'Clarify nature of transfer and ensure appropriate stamp duty and tax considerations are addressed. Non-monetary transfers can have tax implications.'
      },
      {
        severity: 'info',
        description: 'Former proprietor is deceased. Property is being transferred by executors.',
        recommendation: 'Confirm all death duties and estate matters are settled.'
      }
    ],
  },
  chargesAndMoney: {
    charges: [
      {
        type: "Buyer's Premium",
        amount: "£1,560 (inc VAT)",
        description: "Non-refundable buyer's premium payable on fall of virtual gavel"
      },
      {
        type: "Administration Charge",
        amount: "£1,200 (inc VAT)",
        description: "Non-refundable administration charge payable on fall of virtual gavel"
      },
      {
        type: "Deposit",
        amount: "10% of purchase price",
        description: "Payable immediately after exchange of contracts to auctioneers as agents for seller"
      },
      {
        type: "Seller's Legal Costs",
        amount: "£1,500 plus VAT",
        description: "Buyer liable to pay seller's legal costs associated with sale"
      },
      {
        type: "Search Costs",
        amount: "£341.82",
        description: "Buyer liable for costs incurred by seller in connection with searches supplied in auction pack"
      },
      {
        type: "Additional Enquiries Fee",
        amount: "£500 plus VAT",
        description: "Fee payable to seller's conveyancer if seller requires enquiries to be answered after exchange"
      },
      {
        type: "Notice to Complete Costs",
        amount: "£350 plus VAT (initial), £150 plus VAT (subsequent)",
        description: "Buyer's liability for seller's solicitor costs if notice to complete is served due to buyer's default"
      }
    ],
    issues: [
      {
        severity: 'critical',
        description: 'Buyer must pay seller\'s legal costs (£1,500 + VAT) and search costs (£341.82) on completion, in addition to purchase price and auction fees.',
        recommendation: 'Factor these additional costs into total acquisition budget. Total additional costs minimum £2,960 approx.'
      },
      {
        severity: 'warning',
        description: 'Buyer must indemnify seller against any costs, claims, or damages arising from breach of covenants occurring after transfer date.',
        recommendation: 'Obtain indemnity insurance to cover potential covenant breach liabilities. Cost of insurance should be factored into budget.'
      },
      {
        severity: 'warning',
        description: 'Additional enquiries after exchange will incur £500 + VAT fee payable to seller\'s conveyancer.',
        recommendation: 'Ensure all necessary enquiries are made before exchange to avoid additional costs.'
      },
      {
        severity: 'info',
        description: 'If buyer defaults and notice to complete is served, buyer must pay seller\'s solicitor costs of £350 + VAT plus £150 + VAT for each recalculation.',
        recommendation: 'Ensure funds are readily available and complete on time to avoid penalty costs.'
      }
    ],
  },
  covenants: 'The property is subject to multiple restrictive covenants and rights from historic conveyances dated 9 August 1963, 22 May 1981, and transfers dated 1994-1995. The 1963 conveyance reserved rights and contained restrictive covenants. The 1981 conveyance contained provisions regarding boundary structures and restrictive covenants. The land is also subject to rights granted by transfers. These covenants may restrict development, use, and alterations to the property. Buyer must perform and observe any covenants in the Charges Register and indemnify seller against breach costs.',
  tenure: 'Leasehold',
  planningAndDevelopment: {
    issues: [
      {
        severity: 'warning',
        description: 'Property is located within a Conservation Area designated in 1973. Any external alterations, extensions, or demolitions will likely require conservation area consent in addition to planning permission.',
        recommendation: 'Consult with local conservation officer before planning any works. Stricter controls apply to preserve character of area.'
      },
      {
        severity: 'warning',
        description: 'Property is within an Area of Special Control for Display of Advertisements (registered 03/06/1976). Restrictions apply to signage, business advertising, and external displays.',
        recommendation: 'If intending to use property for business, seek advice on advertisement restrictions. May need specific consent for any signage.'
      },
      {
        severity: 'info',
        description: 'Multiple historic planning permissions exist for the property and surrounding area (1982-2024), including for dwellinghouses, extensions, and change of use applications.',
        recommendation: 'Review all planning permissions to understand what development has been approved and what conditions may still apply.'
      },
      {
        severity: 'info',
        description: 'Local Plan contains policies affecting the property within conservation areas, open space, sport and recreation sites, and local green space designations.',
        recommendation: 'Review local plan policies to understand development constraints and opportunities for the property.'
      },
      {
        severity: 'info',
        description: 'No pending planning applications, enforcement notices, or breach of condition notices revealed by local search.',
        recommendation: 'Current planning status appears clear, but always verify with local authority before proceeding with development.'
      }
    ],
  },
  completionAndPenaltyRisks: {
    issues: [
      {
        severity: 'critical',
        description: 'Completion must occur within 5 working days of notice to complete being served (excluding day of service). Time is expressly stated to be of the essence of the contract.',
        recommendation: 'Ensure all funds, documents, and arrangements are prepared well in advance. Any delay will constitute breach of contract with severe penalties.'
      },
      {
        severity: 'critical',
        description: 'If seller fails to complete for any reason, seller only obligated to return deposit without interest. Buyer has NO further claims, rights, remedies, or actions against seller.',
        recommendation: 'This clause significantly limits seller liability. Consider this risk carefully - you could lose opportunity costs and expenses if seller defaults.'
      },
      {
        severity: 'warning',
        description: 'Notice to complete can be served by fax or email. Fax sent before 5pm is deemed served same day; after 5pm deemed served next working day. Email deemed served when sent regardless of acknowledgment.',
        recommendation: 'Check fax machines and email constantly after exchange. Deemed service rules could shorten actual completion period.'
      },
      {
        severity: 'warning',
        description: 'Seller not obliged to transfer property to anyone other than buyer or at price greater than purchase price. Buyer cannot assign, sub-sell, or declare trust of property prior to completion.',
        recommendation: 'If intending to sell on or involve third parties, must complete purchase first. No pre-completion dealings permitted.'
      },
      {
        severity: 'warning',
        description: 'Interest rate for late completion set at 5% over base rate from time to time.',
        recommendation: 'Interest could be substantial if completion delayed. Calculate potential liability based on current base rate plus 5%.'
      },
      {
        severity: 'info',
        description: 'Seller\'s conveyancer not required to hold signed transfer on completion date. Buyer must accept undertaking to forward transfer once received.',
        recommendation: 'Understand you may not receive original transfer on completion day. Ensure undertaking is from reputable solicitor.'
      }
    ],
  },
  physicalAndEnvironmentalRisks: {
    issues: [
      {
        severity: 'warning',
        description: 'Records indicate property is in a Radon Affected Area as identified by Public Health England. Radon is a radioactive gas that can pose health risks.',
        recommendation: 'Commission a radon survey and consider installation of radon mitigation measures if levels are elevated. Factor costs into budget.'
      },
      {
        severity: 'info',
        description: 'Property is connected to mains water supply. No water mains, resource mains, or discharge pipes within property boundaries.',
        recommendation: 'Verify location of water supply pipe and meter. No issues identified regarding water infrastructure.'
      },
      {
        severity: 'info',
        description: 'No public sewer, disposal main, lateral drain, or pumping station within property boundaries or within 3 metres (10 feet) of buildings.',
        recommendation: 'No sewer proximity issues. However, confirm location of private drains and sewers as these may not be recorded.'
      },
      {
        severity: 'info',
        description: 'No sewers or lateral drains serving property are subject to existing adoption agreement or application.',
        recommendation: 'Drainage system appears to be private responsibility. Budget for future maintenance costs.'
      },
      {
        severity: 'info',
        description: 'No risk of internal flooding due to overloaded public sewers identified.',
        recommendation: 'Low flood risk from public sewer system based on available records.'
      },
      {
        severity: 'info',
        description: 'Surface water drainage charge may be payable. Property may have separate surface water drainage system.',
        recommendation: 'Confirm with water authority whether surface water drainage charges apply and budget accordingly.'
      }
    ],
  },
  specialConditionsAndAmenities: {
    issues: [
      {
        severity: 'critical',
        description: 'Property is sold in its actual condition and state of repair. Buyer is deemed to have surveyed and inspected property and purchases with full knowledge of condition. Cannot refuse to complete based on condition.',
        recommendation: 'ESSENTIAL to conduct full structural survey before auction. Once contracts exchanged, you are bound to buy regardless of defects. Do not rely on any condition guarantees.'
      },
      {
        severity: 'critical',
        description: 'Buyer acknowledges contract not entered in reliance upon any statement or representation not expressly set out in contract or made in writing by seller\'s solicitors. All oral statements, advertisements, and particulars are excluded.',
        recommendation: 'Rely ONLY on written statements in legal pack. Any verbal representations from agent or seller are not legally binding. Verify all claims independently.'
      },
      {
        severity: 'warning',
        description: 'Buyer deemed to purchase with full knowledge of all matters contained in title registers, local land charges, planning matters, and all matters discoverable by inspection or searches. Cannot raise requisitions or objections.',
        recommendation: 'Conduct ALL searches and inspections BEFORE bidding. Cannot raise queries after exchange. As-is purchase with no comebacks.'
      },
      {
        severity: 'warning',
        description: 'Buyer confirms they have had opportunity to inspect registered title (including title plan and restrictive covenants) and physically inspect property. Cannot refuse to purchase due to inability to inspect or value prior to completion.',
        recommendation: 'Arrange physical inspection urgently if not yet done. Cannot use lack of access as reason to withdraw after exchange.'
      },
      {
        severity: 'warning',
        description: 'Buyer confirms they have satisfied themselves on all planning and building regulation matters and will raise no objection nor demand contribution from seller. Any indemnity policy to be obtained at buyer\'s cost.',
        recommendation: 'Conduct full planning and building regulations search before auction. Any issues discovered post-exchange are buyer\'s responsibility and cost.'
      },
      {
        severity: 'warning',
        description: 'Seller only obliged to answer Requisitions on Title in form of Law Society TA13 4th Ed. Not required to answer preliminary enquiries.',
        recommendation: 'Be prepared to ask only formal requisitions. Preliminary questions may not be answered. Ensure legal pack is complete as limited information will be provided.'
      },
      {
        severity: 'warning',
        description: 'Seller gives no warranty that postcode is correct. Buyer must rely entirely on own enquiries regarding location.',
        recommendation: 'Verify exact location and boundaries through independent survey. Do not rely on postcode alone for location verification.'
      },
      {
        severity: 'warning',
        description: 'Buyer must covenant to perform and observe any matters in Charges Register and indemnify seller against any costs arising from breach occurring after transfer.',
        recommendation: 'Review all charges register entries carefully. Ongoing indemnity obligation could create unforeseen liabilities.'
      },
      {
        severity: 'info',
        description: 'Seller shall not be obliged to transfer property in whole or part to anyone other than buyer or at price greater than purchase price.',
        recommendation: 'No flexibility on price or transfer arrangements. Must complete at auction price to named buyer only.'
      },
      {
        severity: 'info',
        description: 'No third party can enforce contract terms under Contracts (Rights of Third Parties) Act 1999.',
        recommendation: 'Only parties to contract have rights. Third parties (e.g., lenders) cannot enforce terms directly.'
      }
    ],
  },
  documents: [
    {
      name: '1770141315901-1-Official-Copy-Transfer-LT356710.pdf',
      pages: 15,
      keyFindings: 'Official copy of transfer document for demo property. Title number LT356710. Transfer document shows property transfer details and legal obligations.'
    },
    {
      name: '1770141315903-Auction-Special-Conditions.docx_588155_1.pdf',
      pages: 5,
      keyFindings: 'Auction special conditions outlining terms of sale, completion requirements, and buyer obligations. Standard auction terms apply with specific conditions for this property.'
    },
    {
      name: '1770141315905-Grant-of-Probate-Ann-Patricia-Driver_568796_1.pdf',
      pages: 1,
      keyFindings: 'Grant of probate document confirming executor authority. Document demonstrates legal authority for property sale.'
    },
    {
      name: '1770141315906-Local-Search.pdf',
      pages: 21,
      keyFindings: 'Local authority search reveals property in residential area. Planning history shows various permissions granted. No major planning applications pending. Area has good infrastructure and transport links.'
    },
    {
      name: '1770141315907-MapSearch.pdf',
      pages: 1,
      keyFindings: 'Map search confirms property location and boundaries. Property boundaries clearly defined with no disputes recorded.'
    },
    {
      name: '1770141315908-Official-Copy-Conveyance-09.08.1963-LT356710.pdf',
      pages: 7,
      keyFindings: 'Historic conveyance document from 1963. Contains important rights and restrictive covenants affecting the property. Document is incomplete without preceding notes page.'
    },
    {
      name: '1770141315909-Official-Copy-Conveyance-22.05.1981-LT356710-1-.pdf',
      pages: 7,
      keyFindings: 'Conveyance document from 1981 containing provisions regarding boundary structures and restrictive covenants. Document is incomplete without preceding notes page.'
    },
    {
      name: '1770141315910-Official-Copy-Register-LT356710.pdf',
      pages: 3,
      keyFindings: 'Official copy of register for Title Number LT356710. Register includes details of land and estate, proprietorship, and charges affecting the land. Property held under leasehold tenure. Restriction prevents disposition without written consent from charge holder.'
    },
    {
      name: '1770141315911-Official-Copy-Transfer-27.07.1995-LT356710.pdf',
      pages: 10,
      keyFindings: 'Transfer document from 1995 containing rights granted. Document is incomplete without preceding notes page. Contains important information about property rights.'
    },
    {
      name: '1770141315912-Title-plan.pdf',
      pages: 1,
      keyFindings: 'Title plan showing property boundaries clearly marked. Property boundaries match description accurately.'
    },
    {
      name: '1770141315913-TR1_588156_1.pdf',
      pages: 4,
      keyFindings: 'TR1 transfer document prepared for completion. Transfer is not for money or anything with monetary value, indicating potential inheritance or gifting arrangement.'
    },
    {
      name: '1770141315914-Water-Drainage-Search.pdf',
      pages: 26,
      keyFindings: 'Property connected to mains water supply. No water mains, resource mains, or discharge pipes within property boundaries. Property not at risk of receiving low water pressure or flow. No indication of public sewer or pumping station within property boundaries.'
    }
  ],
  propertyDetails: {
    propertyType: 'Ground Floor Flat',
    lotType: 'Ground Floor Flat',
    bedrooms: 2,
    bathrooms: 1,
    size: '',
    tenure: 'Leasehold',
    guidePrice: '£160,000',
    auctionDate: '27/01/2026',
    auctionDateNote: 'Auction ended 27th Jan 2026 13:58',
    address: '123 Sample Street, Example Town, Demo County, AB1 2CD',
    catalogNumber: 'Lot 40',
    description: 'A two bedroom ground floor flat, situated in Example Town, Demo County.',
    epcRating: '',
    councilTax: '',
    buyersCharge: '£1,560 inc VAT',
    administrationCharge: '£1,200 inc VAT',
    administrationChargeBand: '£1,200 inc VAT'
  },
};

export const demoReport: DemoReport = {
  id: 'demo',
  property_address: '1 Official Copy - Transfer - LT356710',
  property_url: 'https://online.auctionhouse.co.uk/lot/details/demo',
  status: 'completed',
  on_watchlist: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: null,
  documents_count: 12,
  property_value: 0,
  file_paths: [
    'demo/1770141315901-1-Official-Copy-Transfer-LT356710.pdf',
    'demo/1770141315903-Auction-Special-Conditions.docx_588155_1.pdf',
    'demo/1770141315905-Grant-of-Probate-Ann-Patricia-Driver_568796_1.pdf',
    'demo/1770141315906-Local-Search.pdf',
    'demo/1770141315907-MapSearch.pdf',
    'demo/1770141315908-Official-Copy-Conveyance-09.08.1963-LT356710.pdf',
    'demo/1770141315909-Official-Copy-Conveyance-22.05.1981-LT356710-1-.pdf',
    'demo/1770141315910-Official-Copy-Register-LT356710.pdf',
    'demo/1770141315911-Official-Copy-Transfer-27.07.1995-LT356710.pdf',
    'demo/1770141315912-Title-plan.pdf',
    'demo/1770141315913-TR1_588156_1.pdf',
    'demo/1770141315914-Water-Drainage-Search.pdf'
  ],
  property_subtitle: 'Demo Property Location',
  scraped_data: {
    extract: {
      size: '',
      tenure: 'Leasehold',
      address: '123 Sample Street, Example Town, Demo County, AB1 2CD',
      lot_type: 'Ground Floor Flat',
      epc_rating: '',
      council_tax: '',
      description: 'A two bedroom ground floor flat, situated in Example Town, Demo County.',
      guide_price: '£160,000',
      auction_date: '27/01/2026',
      buyers_charge: '£1,560 inc VAT',
      size_citation: '',
      catalog_number: 'Lot 40',
      tenure_citation: 'Tenure section',
      address_citation: 'Markdown content',
      lot_type_citation: 'Property description',
      number_of_bedrooms: 2,
      epc_rating_citation: '',
      number_of_bathrooms: 1,
      council_tax_citation: '',
      description_citation: 'Description section',
      guide_price_citation: 'Auction listing',
      auction_date_citation: 'Auction listing',
      buyers_charge_citation: 'Buyers Premium section',
      catalog_number_citation: 'Auction listing',
      administration_charge_band: '£1,200 inc VAT',
      number_of_bedrooms_citation: 'Listing details',
      number_of_bathrooms_citation: 'Description section',
      administration_charge_band_citation: 'Administration Charge section'
    }
  },
  analysis_result: demoReportAnalysis
};
