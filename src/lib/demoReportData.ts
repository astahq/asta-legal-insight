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
        description: 'CRITICAL DOCUMENT ERROR: Legal pack documents refer to entirely different property than the auction listing. The title register references a property at a different address and postcode, suggesting the wrong legal pack has been uploaded for this lot.',
        recommendation: 'DO NOT BID until the correct legal pack for 22 Waller Terrace is provided and verified. The current documents appear to relate to an entirely different property, and proceeding without the correct pack could result in purchasing a property with unknown legal encumbrances.'
      },
      {
        severity: 'critical',
        description: 'Official copy of Conveyance dated 09.08.1963 (DH56824) is incomplete — the preceding notes page is missing. These notes typically contain essential details about rights of way, easements, restrictions, or obligations that materially affect the property and any future development potential.',
        recommendation: 'Obtain the complete document with all notes pages from the seller\'s solicitor before proceeding. The missing notes could contain crucial information about access rights, shared boundary obligations, or restrictive covenants that would impact the property\'s value and usability.'
      },
      {
        severity: 'critical',
        description: 'Official copy of Conveyance dated 22.05.1981 (DH56824) is incomplete without the preceding notes page. Missing notes may contain essential details about boundary wall and fence maintenance responsibilities, party wall agreements, and shared drainage arrangements.',
        recommendation: 'Obtain complete document with all notes pages before proceeding. Boundary and party wall matters are particularly important for terraced properties where structures are shared with neighbouring houses.'
      },
      {
        severity: 'critical',
        description: 'Official copy of Transfer dated 27.07.1995 (DH56824) is incomplete without the preceding notes page. This transfer likely contains details about rights granted to or reserved by the transferor that continue to bind the property.',
        recommendation: 'Obtain complete document with all notes pages before proceeding. Rights reserved in historic transfers can significantly impact property use and future development.'
      },
      {
        severity: 'warning',
        description: 'Property sold with Limited Title Guarantee only. This means the seller makes limited promises about the title — specifically, the seller has not created any charges or encumbrances other than those disclosed, but makes no guarantees about pre-existing issues or undiscovered defects in the title history.',
        recommendation: 'Conduct comprehensive due diligence including official searches, physical inspection, and a full review of historic title documents. A limited guarantee means the seller may not compensate for undisclosed title defects that existed before their ownership.'
      },
      {
        severity: 'warning',
        description: 'Title register shows restriction: No disposition of the registered estate by the proprietor can be registered without written consent from the charge holder. This restriction means the property cannot be sold, transferred, or mortgaged without obtaining prior approval from the existing lender.',
        recommendation: 'Confirm that the charge holder\'s consent will be provided upon completion and that the existing charge will be discharged. This restriction could delay or block the transaction if the lender does not cooperate.'
      },
      {
        severity: 'info',
        description: 'Mines and minerals are excluded from the title registration as noted in the Property Register. A third party (likely the Coal Authority or historic mineral rights holder) may own sub-surface rights beneath the property.',
        recommendation: 'Given the property is in County Durham — a historic mining area — commission a Coal Authority mining search to assess risk of mine workings, subsidence, and any mine entry points near the property.'
      },
      {
        severity: 'info',
        description: 'Property is subject to rights and covenants contained in multiple historic conveyances and transfers spanning from 1963 to 1995. This creates a complex web of historic obligations that bind successive owners of the property.',
        recommendation: 'Instruct your solicitor to prepare a comprehensive schedule of all historic rights and obligations. Consider obtaining indemnity insurance for any covenants that may have been breached historically.'
      }
    ],
    description: 'Freehold title for 22 Waller Terrace, Houghton le Spring registered at HM Land Registry under Title Number DH56824. Title is absolute but subject to registered charge, restrictive covenants from multiple historic conveyances, and rights reserved in transfers dating from 1963 to 1995. Property sold with Limited Title Guarantee by executors of the deceased owner.'
  },
  ownership: {
    issues: [
      {
        severity: 'critical',
        description: 'Property is being sold by the executors of the deceased registered proprietor. A valid grant of probate is required to authorise the sale, and the executors must demonstrate they have legal authority to dispose of the property under the terms of the will or intestacy rules.',
        recommendation: 'Verify that the grant of probate has been obtained, review the will to confirm the executors have power of sale, and ensure all inheritance tax liabilities have been settled. Executor sales can face delays if estate administration is incomplete or if beneficiaries raise objections.'
      },
      {
        severity: 'warning',
        description: 'The TR1 transfer form indicates the transfer is stated as "not for money or anything that has a monetary value," suggesting this was previously a non-commercial transfer — likely an inheritance or gift between family members. This raises questions about the chain of ownership and whether proper stamp duty was paid on previous transfers.',
        recommendation: 'Investigate the full chain of ownership transfers to ensure each was properly documented and any applicable stamp duty land tax was paid. Non-monetary transfers can sometimes create gaps in the title history that could affect future dealings.'
      },
      {
        severity: 'info',
        description: 'The former registered proprietor is deceased, and the property is being transferred by their appointed executors under the authority of the grant of probate.',
        recommendation: 'Confirm all death duties, inheritance tax, and estate administration matters have been fully settled before completion. Outstanding estate liabilities could create a charge on the property.'
      }
    ],
  },
  chargesAndMoney: {
    charges: [
      {
        type: "Buyer's Premium",
        amount: "£1,140 (inc VAT)",
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
        description: 'Buyer must pay seller\'s legal costs of £1,500 + VAT and search costs of £341.82 on completion, in addition to the purchase price, buyer\'s premium (£1,140), and administration charge (£1,200). For a property at guide price of £30,000, these additional costs represent a significant proportion of the purchase price — approximately 14% in extra fees alone.',
        recommendation: 'Factor all additional costs into your total acquisition budget. At a £30,000 purchase price, total day-one costs would be approximately £37,480 including deposit, fees, and charges. Ensure mortgage or funding arrangements cover the full amount including these supplementary costs.'
      },
      {
        severity: 'warning',
        description: 'Buyer must indemnify the seller against any costs, claims, demands, or damages arising from breach of any covenants that occur after the transfer date. Given the multiple historic covenants affecting this terraced property, this ongoing indemnity obligation could expose the buyer to future claims.',
        recommendation: 'Obtain indemnity insurance to cover potential covenant breach liabilities before completion. The cost of a suitable policy should be factored into your budget and is typically a one-off premium.'
      },
      {
        severity: 'warning',
        description: 'Any additional enquiries raised after exchange of contracts will incur a fee of £500 + VAT payable to the seller\'s conveyancer, regardless of whether the enquiries are answered satisfactorily.',
        recommendation: 'Ensure all necessary enquiries about the property, its condition, boundaries, and legal status are made before exchange to avoid additional costs. Prepare a comprehensive list of questions for the seller\'s solicitor in advance.'
      },
      {
        severity: 'info',
        description: 'If the buyer defaults on completion and a notice to complete is served, the buyer becomes liable for the seller\'s solicitor costs of £350 + VAT for the initial notice plus £150 + VAT for each subsequent recalculation of the completion statement.',
        recommendation: 'Ensure all funds are readily available and complete on time to avoid penalty costs. Have your solicitor confirm completion arrangements at least 48 hours before the deadline.'
      }
    ],
  },
  covenants: 'The property is subject to multiple restrictive covenants and rights contained in historic conveyances dated 9 August 1963, 22 May 1981, and transfers dated 1994–1995. The 1963 conveyance reserved rights of way and access and contained restrictive covenants limiting the use of the property to residential purposes only. The 1981 conveyance included provisions regarding shared boundary walls, fence maintenance responsibilities, and further restrictive covenants preventing trade or business use. The land is also subject to rights granted by subsequent transfers including shared drainage and utility access easements. These covenants may restrict development, alterations to the external appearance, and any change of use. The buyer must perform and observe all covenants noted in the Charges Register and indemnify the seller against any breach costs arising after transfer.',
  tenure: 'Freehold',
  planningAndDevelopment: {
    issues: [
      {
        severity: 'warning',
        description: 'Property is located within a Conservation Area designated by Sunderland City Council in 1973. Any proposed external alterations, extensions, demolition of boundary walls or outbuildings, or changes to the roofline will require conservation area consent in addition to standard planning permission. Permitted development rights may be restricted.',
        recommendation: 'Consult with the local conservation officer at Sunderland City Council before planning any external works. Stricter controls apply within conservation areas to preserve the architectural and historic character of the neighbourhood. Budget for potential additional design costs to meet conservation requirements.'
      },
      {
        severity: 'warning',
        description: 'Property falls within an Area of Special Control for Display of Advertisements (registered 03/06/1976). This places additional restrictions on all forms of signage, business advertising boards, and external displays — including estate agent boards and any commercial signage.',
        recommendation: 'If intending to use the property for any business purpose or home working with external signage, seek specific consent from the local authority. Non-compliance with advertisement control regulations is a criminal offence.'
      },
      {
        severity: 'info',
        description: 'Multiple historic planning permissions exist for properties in Waller Terrace and the surrounding area (1982–2024), including approvals for rear extensions, loft conversions, replacement windows, and change of use applications. This indicates the local authority has been receptive to sympathetic residential improvements in the area.',
        recommendation: 'Review the specific planning permissions granted to neighbouring properties to understand what types of development the local authority has previously approved. This can guide your own improvement plans and provide useful precedent.'
      },
      {
        severity: 'info',
        description: 'The Sunderland Local Plan contains policies affecting the property including conservation area policies, green space designations, and provisions for residential development within established housing areas.',
        recommendation: 'Review the relevant local plan policies to understand development constraints and opportunities. The local plan is available from Sunderland City Council\'s planning portal.'
      },
      {
        severity: 'info',
        description: 'No pending planning applications, enforcement notices, or breach of condition notices were revealed by the local authority search for this property or immediately adjacent properties.',
        recommendation: 'Current planning status appears clear. However, always verify directly with the local authority before proceeding with any development, as the search only reflects the position at the date it was conducted.'
      }
    ],
  },
  completionAndPenaltyRisks: {
    issues: [
      {
        severity: 'critical',
        description: 'Completion must occur within 5 working days of a notice to complete being served (excluding the day of service). Time is expressly stated to be "of the essence" of the contract, meaning any failure to complete within this strict deadline constitutes a fundamental breach entitling the seller to rescind the contract and forfeit the deposit.',
        recommendation: 'Ensure all funds, mortgage offers, documents, and legal arrangements are fully prepared well in advance of the completion deadline. Have your solicitor confirm readiness at least one week before. Any delay — even by a single day — will constitute a breach of contract with severe financial penalties including loss of deposit.'
      },
      {
        severity: 'critical',
        description: 'If the seller fails to complete for any reason whatsoever, the seller\'s only obligation is to return the deposit without interest. The buyer has NO further claims, rights, remedies, or actions against the seller for losses, costs, or damages of any kind. This is an unusually one-sided clause that significantly favours the seller.',
        recommendation: 'Consider this risk very carefully before bidding. If the seller defaults, you could lose all professional fees, survey costs, legal costs, and opportunity costs with no recourse. This clause effectively means the seller can withdraw at minimal cost while the buyer bears all risk.'
      },
      {
        severity: 'warning',
        description: 'Notice to complete can be served by fax or email. A fax sent before 5pm is deemed served on the same working day; a fax sent after 5pm is deemed served on the next working day. Email is deemed served when sent, regardless of whether it is received, read, or acknowledged by the recipient.',
        recommendation: 'Monitor all communication channels constantly after exchange of contracts. The deemed service rules for email are particularly harsh — you could receive a notice to complete without knowing it, and the 5-working-day countdown begins immediately upon sending.'
      },
      {
        severity: 'warning',
        description: 'The seller is not obliged to transfer the property to anyone other than the named buyer, or at any price greater than the purchase price. The buyer cannot assign the contract, sub-sell, or declare a trust of the property prior to completion.',
        recommendation: 'If you are intending to sell on the property or involve third-party investors, you must complete the purchase first before making any onward disposal. No pre-completion dealings or "back-to-back" arrangements are permitted under these special conditions.'
      },
      {
        severity: 'warning',
        description: 'Interest rate for late completion is set at 5% per annum above the Bank of England base rate, calculated daily from the contractual completion date until actual completion.',
        recommendation: 'At current base rates, this equates to approximately 10% per annum interest on the purchase price. On a £30,000 property, this would be approximately £8.22 per day in penalty interest. Ensure completion is not delayed.'
      },
      {
        severity: 'info',
        description: 'The seller\'s conveyancer is not required to hold the signed transfer deed on the completion date. The buyer must accept an undertaking from the seller\'s solicitor to forward the transfer once it has been received and executed.',
        recommendation: 'Ensure the undertaking is from a regulated solicitor and is in standard form. While this is common practice in auction sales, verify that your lender (if applicable) will accept completion on this basis.'
      }
    ],
  },
  physicalAndEnvironmentalRisks: {
    issues: [
      {
        severity: 'warning',
        description: 'Records indicate the property is located in a Radon Affected Area as identified by Public Health England. Radon is a naturally occurring radioactive gas that seeps from the ground and can accumulate in enclosed spaces, particularly at ground floor and basement level. Prolonged exposure to elevated radon levels is the second largest cause of lung cancer after smoking.',
        recommendation: 'Commission a radon survey before completion to establish current radon levels within the property. If levels exceed the Action Level of 200 Bq/m³, radon mitigation measures such as a radon sump or positive ventilation system should be installed. Typical mitigation costs range from £800 to £1,500. Factor this into your renovation budget.'
      },
      {
        severity: 'info',
        description: 'Property is connected to mains water supply provided by Northumbrian Water. No water mains, resource mains, or discharge pipes run within the property boundaries. The property is not at risk of receiving low water pressure or flow based on the water company\'s records.',
        recommendation: 'No issues identified regarding water infrastructure. Verify the location of the water supply pipe and stopcock when inspecting the property.'
      },
      {
        severity: 'info',
        description: 'No public sewer, disposal main, lateral drain, or pumping station exists within the property boundaries or within 3 metres of any building on the property according to Northumbrian Water\'s records.',
        recommendation: 'No sewer proximity issues identified. However, confirm the location and condition of private drains, as these are the homeowner\'s responsibility to maintain and may not appear on water company records.'
      },
      {
        severity: 'info',
        description: 'No sewers or lateral drains serving the property are subject to any existing adoption agreement or pending application for adoption by the water authority.',
        recommendation: 'The drainage system appears to be a private responsibility. Budget for potential future maintenance and repair costs, particularly given the age of the property. A CCTV drain survey is recommended.'
      },
      {
        severity: 'info',
        description: 'No risk of internal flooding due to overloaded public sewers has been identified in the water company\'s records for this property or immediate area.',
        recommendation: 'Low flood risk from the public sewer system based on available records. However, given the property\'s age, check the condition of internal pipework during any survey.'
      },
      {
        severity: 'info',
        description: 'Surface water drainage charges may be applicable. The property may have a separate surface water drainage system that connects to a combined sewer or soakaway.',
        recommendation: 'Confirm with Northumbrian Water whether surface water drainage charges apply and check the condition of any soakaways or surface water drains during your property survey.'
      }
    ],
  },
  specialConditionsAndAmenities: {
    issues: [
      {
        severity: 'critical',
        description: 'Property is sold strictly in its present condition and state of repair. The buyer is deemed to have fully surveyed and inspected the property prior to bidding and purchases with complete knowledge of its condition, including any defects, disrepair, or structural issues. The buyer cannot refuse to complete or claim a price reduction based on the condition of the property.',
        recommendation: 'It is ESSENTIAL to commission a full structural survey of this terraced property before auction day. Given the guide price of £30,000 and the property\'s age, significant renovation works are likely required. Once contracts are exchanged at the fall of the gavel, you are legally bound to complete the purchase regardless of any defects subsequently discovered.'
      },
      {
        severity: 'critical',
        description: 'The buyer acknowledges that the contract has not been entered into in reliance upon any statement, representation, or promise not expressly set out in the contract or made in writing by the seller\'s solicitors. All oral statements, auction catalogue descriptions, marketing particulars, photographs, and agent representations are expressly excluded from the contract.',
        recommendation: 'Rely ONLY on written statements contained in the legal pack and formal replies to enquiries. Any verbal assurances from the auctioneer, estate agent, or seller about the property\'s condition, potential, or value are not legally binding. Verify all marketing claims independently through your own surveys and searches.'
      },
      {
        severity: 'warning',
        description: 'The buyer is deemed to purchase with full knowledge of all matters contained in the title registers, local land charges register, planning records, and all matters that would be revealed by inspection of the property or by conducting standard pre-contract searches. The buyer waives the right to raise requisitions or objections on any such matters.',
        recommendation: 'Conduct ALL searches, inspections, and surveys BEFORE bidding. After exchange, you cannot raise queries about title defects, planning issues, or property condition. This is an "as-is" purchase with no opportunity to renegotiate or withdraw based on search results.'
      },
      {
        severity: 'warning',
        description: 'The buyer confirms they have had the opportunity to inspect the registered title documents (including the title plan, restrictive covenants, and charges register) and to physically inspect the property, its boundaries, and its condition. The buyer cannot refuse to complete due to any inability to inspect or obtain a valuation prior to completion.',
        recommendation: 'Arrange a physical inspection of 22 Waller Terrace urgently if you have not yet visited. Pay particular attention to the roof, chimney stacks, party walls shared with neighbouring terraced houses, damp penetration, and the condition of any rear yard or outbuildings. You cannot use lack of access as a reason to withdraw after exchange.'
      },
      {
        severity: 'warning',
        description: 'The buyer confirms they have satisfied themselves on all planning permissions, building regulation approvals, and compliance matters, and will raise no objection nor demand any contribution from the seller regarding any planning or building regulation issues. Any indemnity insurance required must be obtained at the buyer\'s own cost.',
        recommendation: 'Conduct a full planning and building regulations search with Sunderland City Council before the auction. Check whether any previous works to the property had proper approvals. Any non-compliance issues discovered after exchange are entirely the buyer\'s financial responsibility to resolve.'
      },
      {
        severity: 'warning',
        description: 'The seller is only obliged to answer Requisitions on Title in the form of Law Society TA13 (4th Edition). The seller is not required to answer preliminary enquiries, property information forms, or any other informal questions about the property.',
        recommendation: 'Be prepared for limited information from the seller. Preliminary questions about the property\'s history, previous works, or neighbourhood issues may not be answered. Ensure the legal pack is complete and gather information through your own independent research and surveys.'
      },
      {
        severity: 'warning',
        description: 'The seller gives no warranty that the postcode DH5 8LE or any other location information is correct. The buyer must rely entirely on their own enquiries and inspection to verify the exact location and boundaries of the property.',
        recommendation: 'Verify the exact location and plot boundaries through an independent survey and cross-reference with the title plan. Do not rely on postcode or mapping data alone, as discrepancies between title plans and actual boundaries are common in older terraced housing.'
      },
      {
        severity: 'warning',
        description: 'The buyer must covenant to perform and observe any matters referenced in the Charges Register of the title and to indemnify the seller against any costs, claims, or expenses arising from any breach of these obligations occurring after the date of transfer.',
        recommendation: 'Review all charges register entries carefully with your solicitor. This ongoing indemnity obligation means you could face future claims if any historic covenants are breached — even unknowingly. Consider obtaining indemnity insurance to protect against this risk.'
      },
      {
        severity: 'info',
        description: 'The seller shall not be obliged to transfer the property in whole or in part to anyone other than the named buyer, or at any price greater than the purchase price agreed at auction.',
        recommendation: 'No flexibility on the price or transfer arrangements. You must complete the purchase at the auction price in your own name only.'
      },
      {
        severity: 'info',
        description: 'No third party shall have the right to enforce any term of this contract under the Contracts (Rights of Third Parties) Act 1999.',
        recommendation: 'Only parties named in the contract have enforceable rights. Third parties such as lenders, investors, or family members cannot enforce contract terms directly — they would need to act through the named buyer.'
      }
    ],
  },
  documents: [
    {
      name: '1770141315901-1-Official-Copy-Transfer-DH56824.pdf',
      pages: 15,
      keyFindings: 'Official copy of the transfer document for 22 Waller Terrace registered under Title Number DH56824. The transfer was executed as a non-monetary transfer (likely an inheritance), which raises questions about the chain of ownership and potential stamp duty implications. The document contains detailed provisions about the rights and obligations transferred with the property, including easements for access and drainage that benefit and burden the land.'
    },
    {
      name: '1770141315903-Auction-Special-Conditions.docx_588155_1.pdf',
      pages: 5,
      keyFindings: 'Auction special conditions set out the complete terms of sale including a strict 5-working-day completion deadline after notice to complete is served. The conditions include a buyer\'s premium of £1,140 inc VAT, an administration charge of £1,200 inc VAT, and the buyer\'s liability for the seller\'s legal costs of £1,500 plus VAT. Notably, the conditions heavily favour the seller — if the seller defaults, the buyer\'s only remedy is return of deposit without interest, with no further claims permitted.'
    },
    {
      name: '1770141315905-Grant-of-Probate-Margaret-Thompson_568796_1.pdf',
      pages: 1,
      keyFindings: 'Grant of probate issued by the Newcastle upon Tyne District Probate Registry confirming the appointment of executors with authority to administer the estate of the deceased proprietor. The grant authorises the executors to deal with the property including the power of sale. The net estate value and date of death should be cross-referenced with the transfer documents to ensure the sale is properly authorised under the terms of the will.'
    },
    {
      name: '1770141315906-Local-Search.pdf',
      pages: 21,
      keyFindings: 'Local authority search conducted with Sunderland City Council reveals the property is situated within a Conservation Area designated in 1973 and an Area of Special Control for Display of Advertisements registered in 1976. Planning history shows various permissions granted for neighbouring properties including extensions and alterations, suggesting the local authority has been receptive to sympathetic residential improvements. No pending planning applications, enforcement notices, or breach of condition notices were identified. The property falls within the local plan\'s residential development area with policies supporting appropriate housing improvements.'
    },
    {
      name: '1770141315907-MapSearch.pdf',
      pages: 1,
      keyFindings: 'Map search confirms the property location at 22 Waller Terrace, Houghton le Spring, DH5 8LE. The title plan boundaries are clearly defined showing the mid-terraced plot with rear yard. No boundary disputes or discrepancies between the title plan and OS mapping were identified. The map confirms the property\'s position within the established residential terrace.'
    },
    {
      name: '1770141315908-Official-Copy-Conveyance-09.08.1963-DH56824.pdf',
      pages: 7,
      keyFindings: 'Historic conveyance from 1963 — one of the foundational documents in the title chain. This conveyance reserved important rights of way and contained restrictive covenants that continue to bind the property today. The covenants include restrictions on use (residential only), prohibitions on external alterations without consent, and obligations regarding boundary maintenance. IMPORTANT: This document is incomplete without its preceding notes page, which may contain additional material restrictions or rights that are not visible in the copy provided. The missing notes could relate to shared access arrangements, drainage easements, or additional restrictive covenants.'
    },
    {
      name: '1770141315909-Official-Copy-Conveyance-22.05.1981-DH56824-1-.pdf',
      pages: 7,
      keyFindings: 'Conveyance from 1981 containing detailed provisions regarding shared boundary walls, party wall arrangements, and fence maintenance responsibilities between the terraced properties. The document also includes restrictive covenants preventing any trade, business, or commercial activity from the property. IMPORTANT: This document is also incomplete without its preceding notes page. For a terraced property, the missing notes regarding shared structural elements and party wall obligations could have significant implications for any planned renovation works.'
    },
    {
      name: '1770141315910-Official-Copy-Register-DH56824.pdf',
      pages: 3,
      keyFindings: 'Official copy of the title register for Title Number DH56824 showing the property held under freehold tenure. The Property Register describes the land at 22 Waller Terrace with mines and minerals excluded. The Proprietorship Register shows the property owned by the deceased proprietor with a restriction preventing disposition without charge holder consent. The Charges Register contains entries for a registered charge and references to the restrictive covenants from the 1963 and 1981 conveyances. The register confirms that the property is subject to numerous historic rights and obligations.'
    },
    {
      name: '1770141315911-Official-Copy-Transfer-27.07.1995-DH56824.pdf',
      pages: 10,
      keyFindings: 'Transfer document from 1995 containing details of rights granted over and reserved from the property during a previous change of ownership. The transfer includes easements for shared access and utility services that benefit and burden the property. This document forms part of the chain showing how rights have accumulated over successive transfers. IMPORTANT: This document is incomplete without its preceding notes page, which may contain additional rights or restrictions not visible in the available copy.'
    },
    {
      name: '1770141315912-Title-plan.pdf',
      pages: 1,
      keyFindings: 'Title plan issued by HM Land Registry showing the registered extent of the property at 22 Waller Terrace edged in red. The plan shows the mid-terrace position with shared party walls on both sides, a small rear yard, and access to the rear lane. The title plan boundaries should be cross-referenced with the actual physical boundaries during an on-site inspection to identify any encroachments or discrepancies.'
    },
    {
      name: '1770141315913-TR1_588156_1.pdf',
      pages: 4,
      keyFindings: 'TR1 Land Registry transfer form prepared for the auction sale completion. The form indicates the transfer is from the executors of the deceased proprietor to the successful bidder. The consideration section will be completed with the final auction price upon exchange. The transfer includes an indemnity covenant requiring the buyer to observe all existing covenants and conditions affecting the property and to indemnify the seller (executors) against any future breach.'
    },
    {
      name: '1770141315914-Water-Drainage-Search.pdf',
      pages: 26,
      keyFindings: 'Comprehensive water and drainage search conducted with Northumbrian Water Limited. The search confirms the property is connected to the mains water supply with no water mains, resource mains, or discharge pipes running within the property boundaries. No public sewer, disposal main, lateral drain, or pumping station exists within the property boundaries or within 3 metres of the buildings. The drainage system appears to be private, which means the homeowner is responsible for all maintenance and repair costs. No risk of internal flooding from overloaded public sewers was identified. Surface water drainage charges may be applicable.'
    }
  ],
  propertyDetails: {
    propertyType: 'Terraced House',
    lotType: 'Residential Investment',
    bedrooms: 2,
    bathrooms: 1,
    size: null,
    tenure: 'Freehold',
    guidePrice: '£30,000+',
    auctionDate: '12/02/2026',
    auctionDateNote: 'Online auction ending 12th Feb 2026',
    address: '22 Waller Terrace, Houghton le Spring, Tyne and Wear, DH5 8LE',
    catalogNumber: 'Lot 12',
    description: 'A two bedroom mid-terraced house situated in a popular residential location in Houghton le Spring, County Durham. The property is understood to require a scheme of modernisation and refurbishment throughout, offering an excellent opportunity for investors or those looking to create a home to their own specification. The accommodation briefly comprises: entrance hallway, sitting room, kitchen, two bedrooms, and a bathroom. Externally there is a small rear yard with access to the rear lane. The property benefits from gas central heating and uPVC double glazing. Located within walking distance of Houghton le Spring town centre with its range of shops, schools, and transport links including regular bus services to Sunderland and Durham city centres.',
    epcRating: 'D',
    councilTax: 'Band A',
    buyersCharge: '£1,140 inc VAT',
    administrationCharge: '£1,200 inc VAT',
    administrationChargeBand: '£1,200 inc VAT'
  },
};

export const demoReport: DemoReport = {
  id: 'demo',
  property_address: '22 Waller Terrace, Houghton le Spring, DH5 8LE',
  property_url: 'https://online.auctionhouse.co.uk/lot/details/25154',
  status: 'completed',
  on_watchlist: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: null,
  documents_count: 12,
  property_value: 0,
  file_paths: [
    'demo/1770141315901-1-Official-Copy-Transfer-DH56824.pdf',
    'demo/1770141315903-Auction-Special-Conditions.docx_588155_1.pdf',
    'demo/1770141315905-Grant-of-Probate-Margaret-Thompson_568796_1.pdf',
    'demo/1770141315906-Local-Search.pdf',
    'demo/1770141315907-MapSearch.pdf',
    'demo/1770141315908-Official-Copy-Conveyance-09.08.1963-DH56824.pdf',
    'demo/1770141315909-Official-Copy-Conveyance-22.05.1981-DH56824-1-.pdf',
    'demo/1770141315910-Official-Copy-Register-DH56824.pdf',
    'demo/1770141315911-Official-Copy-Transfer-27.07.1995-DH56824.pdf',
    'demo/1770141315912-Title-plan.pdf',
    'demo/1770141315913-TR1_588156_1.pdf',
    'demo/1770141315914-Water-Drainage-Search.pdf'
  ],
  property_subtitle: 'Houghton le Spring, Tyne and Wear',
  scraped_data: {
    extract: {
      size: '',
      tenure: 'Freehold',
      address: '22 Waller Terrace, Houghton le Spring, Tyne and Wear, DH5 8LE',
      lot_type: 'Residential Investment',
      epc_rating: 'D',
      council_tax: 'Band A',
      description: 'A two bedroom mid-terraced house situated in a popular residential location in Houghton le Spring, County Durham. The property is understood to require a scheme of modernisation and refurbishment throughout, offering an excellent opportunity for investors or those looking to create a home to their own specification.',
      guide_price: '£30,000+',
      auction_date: '12/02/2026',
      buyers_charge: '£1,140 inc VAT',
      catalog_number: 'Lot 12',
      number_of_bedrooms: 2,
      number_of_bathrooms: 1,
      administration_charge_band: '£1,200 inc VAT',
    }
  },
  analysis_result: demoReportAnalysis
};
