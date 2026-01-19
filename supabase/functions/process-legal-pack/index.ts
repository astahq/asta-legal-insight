import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.3.2";
import * as mammoth from "https://esm.sh/mammoth@1.6.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SECTION_KEYS = [
  "Title",
  "Ownership",
  "Charges and Money",
  "Covenants",
  "Tenure",
  "Planning and Development",
  "Completion & Penalty Risks",
  "Physical & Environmental Risks",
  "Special Conditions & Amenities",
];

interface DocumentWithPageCount {
  id: string;
  file_name: string;
  file_path: string;
  mime_type: string | null;
  extracted_text: string;
  extracted_at: string | null;
  page_count?: number;
  [key: string]: unknown;
}

function getFileExtension(fileName: string | null | undefined) {
  const ext = (fileName || "").split(".").pop()?.toLowerCase();
  return ext || "";
}

async function extractPdfText(
  pdfData: Uint8Array
): Promise<{ text: string; pages: number }> {
  const doc = await getDocument(pdfData).promise;
  let fullText = "";

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = (content.items as Array<{ str?: string }>)
      .map((i) => i.str || "")
      .join(" ");
    fullText += pageText + "\n";
  }

  return { text: fullText.trim(), pages: doc.numPages };
}

async function extractTextFromBlob(opts: {
  blob: Blob;
  fileName: string;
  mimeType?: string | null;
}): Promise<{ text: string; pages: number }> {
  const arrayBuffer = await opts.blob.arrayBuffer();
  const ext = getFileExtension(opts.fileName);

  if (opts.mimeType === "text/plain" || ext === "txt") {
    const text = new TextDecoder().decode(arrayBuffer).trim();
    // Estimate pages for text files (assuming ~3000 chars per page)
    const estimatedPages = Math.max(1, Math.ceil(text.length / 3000));
    return { text, pages: estimatedPages };
  }

  if (opts.mimeType === "application/pdf" || ext === "pdf") {
    return await extractPdfText(new Uint8Array(arrayBuffer));
  }

  if (
    ext === "docx" ||
    opts.mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    const res = await mammoth.extractRawText({ arrayBuffer });
    const text = (res?.value || "").trim();
    // Estimate pages for docx files (assuming ~3000 chars per page)
    const estimatedPages = Math.max(1, Math.ceil(text.length / 3000));
    return { text, pages: estimatedPages };
  }

  return { text: "", pages: 0 };
}

async function generateKeyFindings(
  docName: string,
  extractedText: string,
  openaiApiKey: string
): Promise<string> {
  if (!extractedText || extractedText.trim().length === 0) {
    return "No extractable text found in document";
  }

  try {
    // Use a shorter excerpt for key findings generation to save tokens
    const textExcerpt = extractedText.slice(0, 8000);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a property law analyst. Extract the 2-3 most important findings or risks from this legal document. Format your response as plain text with each finding on a separate line. Do NOT use markdown formatting, bullet points, or numbered lists. Use simple line breaks (\\n) to separate findings. Each finding should be one concise sentence. Maximum 2-3 findings.",
          },
          {
            role: "user",
            content: `Document: ${docName}\n\nExtract the 2-3 most important findings or risks from this document. Format each finding on a separate line:\n\n${textExcerpt}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error(`Failed to generate key findings for ${docName}`);
      return "Analysis pending";
    }

    const aiResponse = await response.json();
    let findings =
      aiResponse.choices?.[0]?.message?.content?.trim() || "Analysis pending";

    // Clean up any markdown formatting that might have been returned
    findings = findings
      .replace(/\*\*/g, "") // Remove bold markdown
      .replace(/\*/g, "") // Remove italic markdown
      .replace(/^\d+\.\s*/gm, "") // Remove numbered list prefixes
      .replace(/^[-•]\s*/gm, "") // Remove bullet points
      .replace(/\n{3,}/g, "\n\n") // Normalize multiple line breaks
      .trim();

    // Ensure findings are separated by line breaks
    // Split by common separators and rejoin with line breaks
    findings = findings
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join("\n");

    return findings || "Analysis pending";
  } catch (error) {
    console.error(`Error generating key findings for ${docName}:`, error);
    return "Analysis pending";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

  if (!openaiApiKey) {
    console.error("OPENAI_API_KEY not configured");
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let reportId: string | undefined;
  let userId: string | undefined;

  try {
    const body = await req.json();
    reportId = body?.reportId;
    userId = body?.userId;

    if (!reportId || !userId) {
      return new Response(
        JSON.stringify({ error: "reportId and userId are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `Processing legal pack for report: ${reportId}, user: ${userId}`
    );

    // 1. Get report
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .eq("user_id", userId)
      .single();

    if (reportError || !report) {
      console.error("Report not found:", reportError);
      return new Response(JSON.stringify({ error: "Report not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Get all uploaded documents for this report
    const { data: docsData, error: docsError } = await supabase
      .from("documents")
      .select("*")
      .eq("report_id", reportId);

    if (docsError) {
      console.error("Error fetching documents:", docsError);
      throw docsError;
    }

    const documents = docsData || [];
    console.log(`Found ${documents.length} documents for report`);

    // 2b. Extract text from storage for any docs that haven't been extracted yet
    let extractedCount = 0;
    for (const doc of documents) {
      const needsExtraction =
        !doc.extracted_text || String(doc.extracted_text).trim().length === 0;
      if (!needsExtraction) continue;

      try {
        console.log(`Extracting text for: ${doc.file_name} (${doc.file_path})`);

        const { data: fileBlob, error: downloadError } = await supabase.storage
          .from("legal-packs")
          .download(doc.file_path);

        if (downloadError || !fileBlob) {
          console.error("Download error:", downloadError);
          continue;
        }

        const extractionResult = await extractTextFromBlob({
          blob: fileBlob,
          fileName: doc.file_name,
          mimeType: doc.mime_type,
        });

        if (extractionResult.text.trim()) {
          const cappedText = extractionResult.text.slice(0, 250_000);
          doc.extracted_text = cappedText;
          doc.extracted_at = new Date().toISOString();
          // Store page count in the document object for later use
          (doc as DocumentWithPageCount).page_count = extractionResult.pages;

          const { error: updateDocError } = await supabase
            .from("documents")
            .update({
              extracted_text: cappedText,
              extracted_at: doc.extracted_at,
            })
            .eq("id", doc.id);

          if (updateDocError) {
            console.error("Failed to update extracted text:", updateDocError);
          } else {
            extractedCount++;
          }
        } else {
          console.log(`No extractable text found for: ${doc.file_name}`);
          (doc as DocumentWithPageCount).page_count = 0;
        }
      } catch (e) {
        console.error(`Extraction failed for ${doc.file_name}:`, e);
        (doc as DocumentWithPageCount).page_count = 0;
      }
    }

    // Set default page_count for documents that already had extracted text
    for (const doc of documents) {
      const docWithPages = doc as DocumentWithPageCount;
      if (!docWithPages.page_count) {
        // If it's a PDF and we have extracted text, estimate pages
        const ext = getFileExtension(doc.file_name);
        if (
          (ext === "pdf" || doc.mime_type === "application/pdf") &&
          doc.extracted_text
        ) {
          // Rough estimate: ~3000 chars per page for PDFs
          docWithPages.page_count = Math.max(
            1,
            Math.ceil(doc.extracted_text.length / 3000)
          );
        } else if (doc.extracted_text) {
          // For other file types, estimate based on text length
          docWithPages.page_count = Math.max(
            1,
            Math.ceil(doc.extracted_text.length / 3000)
          );
        } else {
          docWithPages.page_count = 0;
        }
      }
    }

    if (extractedCount > 0) {
      console.log(`Extracted text for ${extractedCount} document(s)`);
    }

    // 3. Build combined text from all documents
    let combinedText = "";

    // Include scraped data if available
    if (report.scraped_data) {
      const scraped = report.scraped_data as {
        markdown?: string;
        metadata?: { title?: string; description?: string };
      };
      if (scraped.metadata?.title) {
        combinedText += `Property Listing Title: ${scraped.metadata.title}\n\n`;
      }
      if (scraped.metadata?.description) {
        combinedText += `Description: ${scraped.metadata.description}\n\n`;
      }
      if (scraped.markdown) {
        combinedText += `Listing Content:\n${scraped.markdown}\n\n`;
      }
    }

    // Add extracted text from documents
    if (documents && documents.length > 0) {
      for (const doc of documents) {
        if (doc.extracted_text) {
          combinedText += `\n--- Document: ${doc.file_name} ---\n${doc.extracted_text}\n`;
        }
      }
    }

    if (!combinedText.trim()) {
      console.log("No content to analyse, creating default sections");

      for (const sectionKey of SECTION_KEYS) {
        await supabase.from("report_sections").upsert(
          {
            report_id: reportId,
            user_id: userId,
            section_key: sectionKey,
            content: "Unknown - No documents provided for analysis",
            sources: null,
          },
          { onConflict: "report_id,section_key" }
        );
      }

      await supabase
        .from("reports")
        .update({ status: "completed" })
        .eq("id", reportId);

      return new Response(
        JSON.stringify({ success: true, message: "No content to analyse" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 4. Call OpenAI to generate structured analysis
    console.log(`Sending ${combinedText.length} chars to OpenAI for analysis`);

    const systemPrompt = `You are an expert UK property law analyst specializing in auction legal packs. 
Analyse the provided documents and extract information for each section.

IMPORTANT RULES:
- Only use information explicitly stated in the documents
- If information for a section is not found, respond with "Unknown"
- Be specific and cite document names when possible
- Highlight risks, concerns, and important findings
- Focus on issues that would affect a property investor's decision

For each section, provide a JSON object with:
- "summary": A brief summary (1-2 sentences)
- "issues": An array of issue objects, each with "severity" (critical/warning/info) and "text"
- "details": Any additional relevant details

Sections to analyse:
1. Title - Title registration status, any title defects, restrictions
2. Ownership - Current and previous owners, seller information
3. Charges and Money - Mortgages, charges, debts against property
4. Covenants - Restrictive covenants, obligations, rights of way
5. Tenure - Freehold/leasehold, lease terms, ground rent
6. Planning and Development - Planning permissions, building regulations, extensions
7. Completion & Penalty Risks - Completion timeline, penalties for late completion
8. Physical & Environmental Risks - Flood risk, subsidence, contamination
9. Special Conditions & Amenities - Auction special conditions, buyer's premium, excluded items`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analyse this property legal pack:\n\n${combinedText.slice(
              0,
              100000
            )}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_analysis",
              description: "Save the structured analysis for all sections",
              parameters: {
                type: "object",
                properties: {
                  sections: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        section_key: {
                          type: "string",
                          enum: SECTION_KEYS,
                        },
                        summary: { type: "string" },
                        issues: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              severity: {
                                type: "string",
                                enum: ["critical", "warning", "info"],
                              },
                              text: { type: "string" },
                            },
                            required: ["severity", "text"],
                          },
                        },
                        details: { type: "string" },
                      },
                      required: ["section_key", "summary", "issues"],
                    },
                  },
                  property_details: {
                    type: "object",
                    properties: {
                      propertyType: { type: "string" },
                      bedrooms: { type: "string" },
                      bathrooms: { type: "string" },
                      size: { type: "string" },
                      tenure: { type: "string" },
                      guidePrice: { type: "string" },
                      auctionDate: { type: "string" },
                    },
                  },
                },
                required: ["sections"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_analysis" } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("OpenAI response received");

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "save_analysis") {
      console.error("Unexpected AI response format");
      throw new Error("Failed to parse AI analysis");
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log(`Parsed ${analysis.sections?.length || 0} sections from AI`);

    // 5. Save sections to database
    for (const section of analysis.sections || []) {
      const content = JSON.stringify({
        summary: section.summary,
        issues: section.issues || [],
        details: section.details || "",
      });

      await supabase.from("report_sections").upsert(
        {
          report_id: reportId,
          user_id: userId,
          section_key: section.section_key,
          content: content,
          sources: null,
        },
        { onConflict: "report_id,section_key" }
      );
    }

    // Ensure all sections exist (fill missing with Unknown)
    const existingSections = (analysis.sections || []).map(
      (s: { section_key: string }) => s.section_key
    );
    for (const sectionKey of SECTION_KEYS) {
      if (!existingSections.includes(sectionKey)) {
        await supabase.from("report_sections").upsert(
          {
            report_id: reportId,
            user_id: userId,
            section_key: sectionKey,
            content: JSON.stringify({
              summary: "Unknown",
              issues: [],
              details: "",
            }),
            sources: null,
          },
          { onConflict: "report_id,section_key" }
        );
      }
    }

    // 6. Transform sections into ReportAnalysis format
    // Create a map of sections by their section_key
    const sectionMap: Record<
      string,
      {
        summary: string;
        issues: Array<{ severity: string; text: string }>;
        details: string;
      }
    > = {};

    for (const section of analysis.sections || []) {
      sectionMap[section.section_key] = {
        summary: section.summary || "",
        issues: section.issues || [],
        details: section.details || "",
      };
    }

    // Fill missing sections with defaults
    for (const sectionKey of SECTION_KEYS) {
      if (!sectionMap[sectionKey]) {
        sectionMap[sectionKey] = {
          summary: "Unknown",
          issues: [],
          details: "",
        };
      }
    }

    console.log("Section map created with keys:", Object.keys(sectionMap));
    console.log("Title section in map:", JSON.stringify(sectionMap["Title"]));
    console.log(
      "Covenants section in map:",
      JSON.stringify(sectionMap["Covenants"])
    );

    // Transform property details to match expected format
    const propertyDetails = analysis.property_details || {};
    const transformedPropertyDetails = {
      propertyType: propertyDetails.propertyType || "Unknown",
      bedrooms:
        typeof propertyDetails.bedrooms === "string"
          ? parseInt(propertyDetails.bedrooms) || 0
          : propertyDetails.bedrooms || 0,
      bathrooms:
        typeof propertyDetails.bathrooms === "string"
          ? parseInt(propertyDetails.bathrooms) || 0
          : propertyDetails.bathrooms || 0,
      size: propertyDetails.size || "Unknown",
      tenure: propertyDetails.tenure || "Unknown",
      guidePrice: propertyDetails.guidePrice || "Unknown",
      auctionDate: propertyDetails.auctionDate || "Unknown",
      auctionDateNote: propertyDetails.auctionDateNote || "",
    };

    // Generate key findings for all documents in parallel
    console.log("Generating key findings for documents...");
    const documentKeyFindings = await Promise.all(
      (documents || []).map(async (doc) => {
        const extractedText = doc.extracted_text || "";
        if (extractedText.trim().length > 0) {
          return await generateKeyFindings(
            doc.file_name,
            extractedText,
            openaiApiKey
          );
        }
        return "No extractable text found";
      })
    );

    // Build complete analysisResult object matching ReportAnalysis interface
    const analysisResult = {
      title: {
        issues: sectionMap["Title"]?.issues || [],
        description: sectionMap["Title"]?.summary || "",
      },
      ownership: {
        issues: sectionMap["Ownership"]?.issues || [],
      },
      chargesAndMoney: {
        charges: [], // Charges extraction can be enhanced later if needed
        issues: sectionMap["Charges and Money"]?.issues || [],
      },
      covenants: sectionMap["Covenants"]?.summary || "Unknown",
      tenure: sectionMap["Tenure"]?.summary || "Unknown",
      planningAndDevelopment: {
        issues: sectionMap["Planning and Development"]?.issues || [],
      },
      completionAndPenaltyRisks: {
        issues: sectionMap["Completion & Penalty Risks"]?.issues || [],
      },
      physicalAndEnvironmentalRisks: {
        issues: sectionMap["Physical & Environmental Risks"]?.issues || [],
      },
      specialConditionsAndAmenities: {
        issues: sectionMap["Special Conditions & Amenities"]?.issues || [],
      },
      documents: (documents || []).map((d, index) => ({
        name: d.file_name,
        pages: (d as DocumentWithPageCount).page_count || 0,
        keyFindings: documentKeyFindings[index] || "Analysis pending",
      })),
      propertyDetails: transformedPropertyDetails,
    };

    console.log("Built analysisResult with keys:", Object.keys(analysisResult));
    console.log(
      "Title section:",
      JSON.stringify({
        issuesCount: analysisResult.title.issues.length,
        hasDescription: !!analysisResult.title.description,
      })
    );
    console.log("Covenants:", analysisResult.covenants);
    console.log("Tenure:", analysisResult.tenure);

    const { data: updateData, error: updateError } = await supabase
      .from("reports")
      .update({
        status: "completed",
        analysis_result: analysisResult,
        documents_count: documents?.length || 0,
      })
      .eq("id", reportId)
      .select("analysis_result");

    if (updateError) {
      console.error(
        "Failed to update report with analysis_result:",
        updateError
      );
      throw updateError;
    }

    console.log(
      "Update successful. Saved analysis_result keys:",
      updateData?.[0]?.analysis_result
        ? Object.keys(updateData[0].analysis_result)
        : "none"
    );
    console.log("Report processing completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        sections: analysis.sections?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing legal pack:", error);

    try {
      // best-effort: mark the report as failed so the UI can show a retry action
      if (reportId) {
        await supabase
          .from("reports")
          .update({ status: "failed" })
          .eq("id", reportId);
      }
    } catch (e) {
      console.error("Failed to mark report as failed:", e);
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Processing failed",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
