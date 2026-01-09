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
    const estimatedPages = Math.max(1, Math.ceil(text.length / 3000));
    return { text, pages: estimatedPages };
  }

  return { text: "", pages: 0 };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // With verify_jwt = false, Supabase doesn't validate JWT at gateway level
  // Extract user ID from JWT payload for logging (optional, don't fail if missing)
  let userId: string | null = null;
  try {
    const authHeader = req.headers.get("Authorization");
    console.log(`[test-playground] Authorization header present: ${!!authHeader}`);
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const parts = token.split(".");
      if (parts.length === 3) {
        const payload = JSON.parse(
          atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
        );
        userId = payload.sub || payload.user_id || null;
        if (userId) {
          console.log(`[test-playground] Processing request for user: ${userId}`);
        }
      }
    }
  } catch (e) {
    // If we can't parse JWT, that's okay - we'll continue anyway
    console.log("[test-playground] Could not parse JWT payload, continuing anyway");
  }

  console.log("[test-playground] Checking OpenAI API key");
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

  try {
    const body = await req.json();
    const { model, systemPrompt, files, scrapedData } = body;

    if (!model || !systemPrompt) {
      return new Response(
        JSON.stringify({ error: "model and systemPrompt are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!files || files.length === 0) {
      if (!scrapedData) {
        return new Response(
          JSON.stringify({
            error: "At least one PDF file or scraped data is required",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    console.log(`Processing test playground request with model: ${model}`);

    // Extract text from uploaded files
    let combinedText = "";

    if (files && files.length > 0) {
      for (const file of files) {
        const fileData = new Uint8Array(file.data);
        const blob = new Blob([fileData], { type: file.type || "application/pdf" });

        const extractionResult = await extractTextFromBlob({
          blob,
          fileName: file.name,
          mimeType: file.type,
        });

        if (extractionResult.text.trim()) {
          const cappedText = extractionResult.text.slice(0, 250_000);
          combinedText += `\n--- Document: ${file.name} ---\n${cappedText}\n`;
        }
      }
    }

    // Include scraped data if available
    if (scrapedData) {
      if (scrapedData.metadata?.title) {
        combinedText += `Property Listing Title: ${scrapedData.metadata.title}\n\n`;
      }
      if (scrapedData.metadata?.description) {
        combinedText += `Description: ${scrapedData.metadata.description}\n\n`;
      }
      if (scrapedData.markdown) {
        combinedText += `Listing Content:\n${scrapedData.markdown}\n\n`;
      }
    }

    if (!combinedText.trim()) {
      return new Response(
        JSON.stringify({ error: "No extractable text found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Call OpenAI API with selected model and custom prompt
    console.log(`Sending ${combinedText.length} chars to OpenAI (${model})`);

    const startTime = Date.now();
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Analyze this property legal pack:\n\n${combinedText.slice(
              0,
              100000
            )}`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const responseTime = Date.now() - startTime;

    const markdown = aiResponse.choices?.[0]?.message?.content?.trim() || "";

    console.log(`Received response from ${model} in ${responseTime}ms`);

    return new Response(
      JSON.stringify({
        markdown,
        usage: aiResponse.usage,
        model: aiResponse.model,
        responseTime,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing test playground request:", error);

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
