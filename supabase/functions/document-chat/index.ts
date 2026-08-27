import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// deno-lint-ignore no-explicit-any
function formatAnalysisResult(analysis: any): string {
  if (!analysis || typeof analysis !== "object") return "";

  const parts: string[] = [];

  // Title
  if (analysis.title) {
    parts.push(`[Title]`);
    if (analysis.title.description) {
      parts.push(analysis.title.description);
    }
    if (Array.isArray(analysis.title.issues)) {
      for (const issue of analysis.title.issues) {
        parts.push(
          `- [${issue.severity}] ${issue.description || issue.text || ""}${issue.recommendation ? ` (Recommendation: ${issue.recommendation})` : ""}`,
        );
      }
    }
    parts.push("");
  }

  // Ownership
  if (analysis.ownership?.issues?.length) {
    parts.push(`[Ownership]`);
    for (const issue of analysis.ownership.issues) {
      parts.push(
        `- [${issue.severity}] ${issue.description || issue.text || ""}${issue.recommendation ? ` (Recommendation: ${issue.recommendation})` : ""}`,
      );
    }
    parts.push("");
  }

  // Charges and Money
  if (analysis.chargesAndMoney) {
    parts.push(`[Charges and Money]`);
    if (Array.isArray(analysis.chargesAndMoney.charges)) {
      for (const charge of analysis.chargesAndMoney.charges) {
        parts.push(
          `- ${charge.type}: ${charge.amount}${charge.description ? ` - ${charge.description}` : ""}`,
        );
      }
    }
    if (Array.isArray(analysis.chargesAndMoney.issues)) {
      for (const issue of analysis.chargesAndMoney.issues) {
        parts.push(
          `- [${issue.severity}] ${issue.description || issue.text || ""}${issue.recommendation ? ` (Recommendation: ${issue.recommendation})` : ""}`,
        );
      }
    }
    parts.push("");
  }

  // Covenants
  if (analysis.covenants) {
    parts.push(`[Covenants]`);
    parts.push(
      typeof analysis.covenants === "string"
        ? analysis.covenants
        : JSON.stringify(analysis.covenants),
    );
    parts.push("");
  }

  // Tenure
  if (analysis.tenure) {
    parts.push(`[Tenure]`);
    parts.push(
      typeof analysis.tenure === "string"
        ? analysis.tenure
        : JSON.stringify(analysis.tenure),
    );
    parts.push("");
  }

  // Property Details
  if (analysis.propertyDetails) {
    parts.push(`[Property Details]`);
    for (const [key, value] of Object.entries(analysis.propertyDetails)) {
      if (value !== null && value !== undefined && value !== "") {
        parts.push(`${key}: ${value}`);
      }
    }
    parts.push("");
  }

  // Sections with issues pattern
  const issueSections = [
    { key: "planningAndDevelopment", label: "Planning and Development" },
    {
      key: "completionAndPenaltyRisks",
      label: "Completion and Penalty Risks",
    },
    {
      key: "physicalAndEnvironmentalRisks",
      label: "Physical and Environmental Risks",
    },
    {
      key: "specialConditionsAndAmenities",
      label: "Special Conditions and Amenities",
    },
  ];

  for (const { key, label } of issueSections) {
    // deno-lint-ignore no-explicit-any
    const section = (analysis as any)[key];
    if (section?.issues?.length) {
      parts.push(`[${label}]`);
      for (const issue of section.issues) {
        parts.push(
          `- [${issue.severity}] ${issue.description || issue.text || ""}${issue.recommendation ? ` (Recommendation: ${issue.recommendation})` : ""}`,
        );
      }
      parts.push("");
    }
  }

  // Documents summary
  if (Array.isArray(analysis.documents) && analysis.documents.length > 0) {
    parts.push(`[Documents in Legal Pack]`);
    for (const doc of analysis.documents) {
      parts.push(
        `- ${doc.name} (${doc.pages} pages)${doc.keyFindings && doc.keyFindings !== "No key findings available." && doc.keyFindings !== "No text content available." ? `: ${doc.keyFindings}` : ""}`,
      );
    }
    parts.push("");
  }

  return parts.join("\n");
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Received request body:", JSON.stringify(body));

    const { messages, reportId } = body;

    if (!messages || !reportId) {
      console.error("Missing required fields:", {
        messages: !!messages,
        reportId: !!reportId,
      });
      return new Response(
        JSON.stringify({ error: "messages and reportId are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Document chat request for report: ${reportId}`);

    // deno-lint-ignore no-explicit-any
    let report: {
      property_address: string;
      scraped_data: any;
      analysis_result: any;
    } | null = null;
    let documents: Array<{ file_name: string; extracted_text: string }> = [];
    let sections: Array<{ section_key: string; content: string }> = [];

    if (reportId === "demo") {
      report = {
        property_address: "1 Official Copy - Transfer - LT356710",
        scraped_data: {
          extract: {
            address: "123 Sample Street, Example Town, Demo County, AB1 2CD",
            description:
              "A two bedroom ground floor flat, situated in Example Town, Demo County.",
            tenure: "Leasehold",
            guide_price: "£160,000",
            lot_type: "Ground Floor Flat",
            number_of_bedrooms: 2,
            number_of_bathrooms: 1,
          },
        },
        analysis_result: null,
      };
      documents = [
        {
          file_name: "1770141315901-1-Official-Copy-Transfer-LT356710.pdf",
          extracted_text:
            "Official copy of transfer document for demo property. Title number LT356710. Transfer document shows property transfer details and legal obligations. Property is being sold with Limited Title Guarantee. Buyer assumes certain risks regarding title and cannot raise requisitions on matters that would be revealed by searches or inspection.",
        },
        {
          file_name:
            "1770141315903-Auction-Special-Conditions.docx_588155_1.pdf",
          extracted_text:
            "Auction special conditions outlining terms of sale, completion requirements, and buyer obligations. Standard auction terms apply with specific conditions for this property. Completion must occur within 5 working days of notice to complete being served. Buyer must pay sellers legal costs and search costs on completion.",
        },
        {
          file_name: "1770141315910-Official-Copy-Register-LT356710.pdf",
          extracted_text:
            "Official copy of register for Title Number LT356710. Register includes details of land and estate, proprietorship, and charges affecting the land. Property held under leasehold tenure. Title register shows restriction: No disposition can be registered without written consent from charge holder. Property is subject to rights and covenants from multiple historic conveyances.",
        },
        {
          file_name: "1770141315914-Water-Drainage-Search.pdf",
          extracted_text:
            "Property connected to mains water supply. No water mains, resource mains, or discharge pipes within property boundaries. Property not at risk of receiving low water pressure or flow. No public sewer, disposal main, lateral drain, or pumping station within property boundaries. No risk of internal flooding due to overloaded public sewers identified.",
        },
      ];
      sections = [
        {
          section_key: "title",
          content:
            "The title of the property is registered and generally in good order, with one outstanding charge requiring discharge on completion. Property sold with Limited Title Guarantee.",
        },
        { section_key: "tenure", content: "Leasehold" },
        {
          section_key: "covenants",
          content:
            "Restrictive covenants apply to the property. The property must not be used for commercial purposes without consent from the original developer. External alterations and extensions require prior approval.",
        },
      ];
    } else {
      const { data: reportData, error: reportError } = await supabase
        .from("reports")
        .select("property_address, scraped_data, analysis_result")
        .eq("id", reportId)
        .eq("user_id", user.id)
        .single();

      if (reportError) {
        console.error("Error fetching report:", reportError);
        throw new Error("Report not found");
      }
      report = reportData;

      const { data: docsData, error: docsError } = await supabase
        .from("documents")
        .select("file_name, extracted_text")
        .eq("report_id", reportId);

      if (docsError) {
        console.error("Error fetching documents:", docsError);
      } else {
        documents = docsData || [];
      }

      // Only fetch report_sections if analysis_result is not available
      if (!report.analysis_result) {
        const { data: sectionsData, error: sectionsError } = await supabase
          .from("report_sections")
          .select("section_key, content")
          .eq("report_id", reportId);

        if (sectionsError) {
          console.error("Error fetching sections:", sectionsError);
        } else {
          sections = sectionsData || [];
        }
      }
    }

    // Build document context from actual database records
    let documentContext = `Property: ${report.property_address}\n\n`;

    // Add scraped data if available
    if (report.scraped_data) {
      const scraped = report.scraped_data as {
        markdown?: string;
        metadata?: { title?: string; description?: string };
        extract?: Record<string, unknown>;
      };
      if (scraped.metadata?.description) {
        documentContext += `Listing Description: ${scraped.metadata.description}\n\n`;
      }
      if (scraped.extract) {
        documentContext += `Property Listing Details:\n`;
        for (const [key, value] of Object.entries(scraped.extract)) {
          if (value !== null && value !== undefined) {
            documentContext += `${key}: ${value}\n`;
          }
        }
        documentContext += `\n`;
      }
      if (scraped.markdown) {
        documentContext += `Listing Content:\n${scraped.markdown.slice(0, 10000)}\n\n`;
      }
    }

    // Add analysis_result as primary analysis source (compact, structured)
    if (report.analysis_result) {
      const analysisText = formatAnalysisResult(report.analysis_result);
      if (analysisText) {
        documentContext += `\n\nComplete Analysis Results:\n${analysisText}\n`;
      }
    }

    // Add extracted document text (with per-doc limit to avoid context overflow)
    const maxDocsTextTotal = 80000;
    let docsTextUsed = 0;
    if (documents && documents.length > 0) {
      const perDocLimit = Math.floor(maxDocsTextTotal / documents.length);
      documentContext += `\nDocuments in this legal pack:\n`;
      for (const doc of documents) {
        documentContext += `\n--- ${doc.file_name} ---\n`;
        if (doc.extracted_text) {
          const text = doc.extracted_text.slice(0, perDocLimit);
          documentContext += `${text}\n`;
          docsTextUsed += text.length;
        } else {
          documentContext += `(Text not yet extracted)\n`;
        }
      }
    }

    // Fallback: Add report_sections if no analysis_result
    if (!report.analysis_result && sections && sections.length > 0) {
      documentContext += `\n\nAnalysis Results:\n`;
      for (const section of sections) {
        let sectionText = section.content;
        // Section content may be stored as JSON string from process-legal-pack
        try {
          const parsed = JSON.parse(section.content);
          if (parsed && typeof parsed === "object") {
            const textParts: string[] = [];
            if (parsed.summary) textParts.push(parsed.summary);
            if (parsed.details) textParts.push(parsed.details);
            if (Array.isArray(parsed.issues) && parsed.issues.length > 0) {
              textParts.push(
                "Issues: " +
                  parsed.issues
                    .map(
                      (i: { severity?: string; text?: string }) =>
                        `[${i.severity || "info"}] ${i.text || ""}`,
                    )
                    .join("; "),
              );
            }
            sectionText = textParts.join("\n");
          }
        } catch {
          // content is plain text, use as-is
        }
        documentContext += `\n[${section.section_key}]\n${sectionText}\n`;
      }
    }

    console.log(
      `Document context length: ${documentContext.length} chars (docs text: ${docsTextUsed} chars)`,
    );
    console.log(`Messages count: ${messages?.length || 0}`);
    console.log(
      `Has analysis_result: ${!!report.analysis_result}, sections count: ${sections.length}`,
    );

    // Build system prompt with document context
    const systemPrompt = `You are an expert legal document analyst assistant for property auction due diligence. You help users understand the documents in their property legal pack.

You have access to the following document analysis:

${documentContext}

Instructions:
- Answer questions based ONLY on the document information provided above
- Be specific and cite document names when referencing information
- If information is not available in the documents, clearly state "I don't have enough information about that in the provided documents"
- Highlight any risks, concerns, or important findings
- Be concise but thorough
- Use plain language to explain legal terms when needed
- If asked about something not covered in the documents, explain what type of document might contain that information`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limits exceeded, please try again later.",
          }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({ error: "Failed to get AI response" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log("Streaming response started");

    const transformState = {
      buffer: "",
    };

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        const chunkText = decoder.decode(chunk, { stream: true });
        transformState.buffer += chunkText;

        const lines = transformState.buffer.split("\n");
        transformState.buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.trim() === "") continue;
          if (line.startsWith(":")) continue;
          if (!line.startsWith("data: ")) continue;

          const data = line.slice(6).trim();
          if (data === "[DONE]") {
            continue;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;

            if (content !== undefined && content !== null && content !== "") {
              controller.enqueue(encoder.encode(String(content)));
            }
          } catch (e) {
            console.error("Error parsing SSE data:", e, "Data:", data);
          }
        }
      },
      flush(controller) {
        const encoder = new TextEncoder();
        if (transformState.buffer.trim()) {
          const line = transformState.buffer.trim();
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data !== "[DONE]") {
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (
                  content !== undefined &&
                  content !== null &&
                  content !== ""
                ) {
                  controller.enqueue(encoder.encode(String(content)));
                }
              } catch (e) {
                console.error("Error parsing final buffer:", e);
              }
            }
          }
        }
      },
    });

    const transformedStream = response.body?.pipeThrough(transformStream);

    return new Response(transformedStream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Document chat error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error stack:", errorStack);
    return new Response(
      JSON.stringify({
        error: errorMessage,
        stack: errorStack,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
