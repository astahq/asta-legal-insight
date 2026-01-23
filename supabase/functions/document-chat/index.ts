import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Received request body:", JSON.stringify(body));
    
    const { messages, reportId } = body;
    
    if (!messages || !reportId) {
      console.error("Missing required fields:", { messages: !!messages, reportId: !!reportId });
      return new Response(JSON.stringify({ error: "messages and reportId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Document chat request for report: ${reportId}`);

    // Fetch report and its documents from database
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('property_address, scraped_data')
      .eq('id', reportId)
      .single();

    if (reportError) {
      console.error('Error fetching report:', reportError);
      throw new Error('Report not found');
    }

    // Fetch documents for this report
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('file_name, extracted_text')
      .eq('report_id', reportId);

    if (docsError) {
      console.error('Error fetching documents:', docsError);
    }

    // Fetch report sections
    const { data: sections, error: sectionsError } = await supabase
      .from('report_sections')
      .select('section_key, content')
      .eq('report_id', reportId);

    if (sectionsError) {
      console.error('Error fetching sections:', sectionsError);
    }

    // Build document context from actual database records
    let documentContext = `Property: ${report.property_address}\n\n`;

    // Add scraped data if available
    if (report.scraped_data) {
      const scraped = report.scraped_data as { markdown?: string; metadata?: { title?: string; description?: string } };
      if (scraped.metadata?.description) {
        documentContext += `Listing Description: ${scraped.metadata.description}\n\n`;
      }
      if (scraped.markdown) {
        documentContext += `Listing Content:\n${scraped.markdown.slice(0, 10000)}\n\n`;
      }
    }

    // Add extracted document text
    if (documents && documents.length > 0) {
      documentContext += `Documents in this legal pack:\n`;
      for (const doc of documents) {
        documentContext += `\n--- ${doc.file_name} ---\n`;
        if (doc.extracted_text) {
          documentContext += `${doc.extracted_text.slice(0, 15000)}\n`;
        } else {
          documentContext += `(Text not yet extracted)\n`;
        }
      }
    }

    // Add analysis sections
    if (sections && sections.length > 0) {
      documentContext += `\n\nAnalysis Results:\n`;
      for (const section of sections) {
        documentContext += `\n[${section.section_key}]\n${section.content}\n`;
      }
    }

    console.log(`Document context length: ${documentContext.length} chars`);
    console.log(`Messages count: ${messages?.length || 0}`);

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
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      return new Response(JSON.stringify({ error: "Failed to get AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Streaming response started");

    const transformState = {
      buffer: '',
    };
    
    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        const chunkText = decoder.decode(chunk, { stream: true });
        transformState.buffer += chunkText;
        
        const lines = transformState.buffer.split('\n');
        transformState.buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.startsWith(':')) continue;
          if (!line.startsWith('data: ')) continue;
          
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
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
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content !== undefined && content !== null && content !== "") {
                  controller.enqueue(encoder.encode(String(content)));
                }
              } catch (e) {
                console.error("Error parsing final buffer:", e);
              }
            }
          }
        }
      }
    });

    const transformedStream = response.body?.pipeThrough(transformStream);

    return new Response(transformedStream, {
      headers: { 
        ...corsHeaders, 
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
      },
    });
  } catch (error) {
    console.error("Document chat error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("Error stack:", errorStack);
    return new Response(JSON.stringify({ 
      error: errorMessage,
      stack: errorStack 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
