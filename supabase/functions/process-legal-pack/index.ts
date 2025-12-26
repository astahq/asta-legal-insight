import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getDocument } from "https://esm.sh/pdfjs-serverless@0.3.2";
import * as mammoth from "https://esm.sh/mammoth@1.6.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SECTION_KEYS = [
  'Title',
  'Ownership',
  'Charges and Money',
  'Covenants',
  'Tenure',
  'Planning and Development',
  'Completion & Penalty Risks',
  'Physical & Environmental Risks',
  'Special Conditions & Amenities',
];

function getFileExtension(fileName: string | null | undefined) {
  const ext = (fileName || '').split('.').pop()?.toLowerCase();
  return ext || '';
}

async function extractPdfText(pdfData: Uint8Array): Promise<string> {
  const doc = await getDocument(pdfData).promise;
  let fullText = '';

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = (content.items as Array<{ str?: string }>).map((i) => i.str || '').join(' ');
    fullText += pageText + "\n";
  }

  return fullText.trim();
}

async function extractTextFromBlob(opts: {
  blob: Blob;
  fileName: string;
  mimeType?: string | null;
}): Promise<string> {
  const arrayBuffer = await opts.blob.arrayBuffer();
  const ext = getFileExtension(opts.fileName);

  if (opts.mimeType === 'text/plain' || ext === 'txt') {
    return new TextDecoder().decode(arrayBuffer).trim();
  }

  if (opts.mimeType === 'application/pdf' || ext === 'pdf') {
    return await extractPdfText(new Uint8Array(arrayBuffer));
  }

  if (
    ext === 'docx' ||
    opts.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const res = await mammoth.extractRawText({ arrayBuffer });
    return (res?.value || '').trim();
  }

  return '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

  if (!openaiApiKey) {
    console.error('OPENAI_API_KEY not configured');
    return new Response(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let reportId: string | undefined;
  let userId: string | undefined;

  try {
    const body = await req.json();
    reportId = body?.reportId;
    userId = body?.userId;

    if (!reportId || !userId) {
      return new Response(JSON.stringify({ error: 'reportId and userId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing legal pack for report: ${reportId}, user: ${userId}`);

    // 1. Get report
    const { data: report, error: reportError } = await supabase
      .from('reports')
      .select('*')
      .eq('id', reportId)
      .eq('user_id', userId)
      .single();

    if (reportError || !report) {
      console.error('Report not found:', reportError);
      return new Response(JSON.stringify({ error: 'Report not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get all uploaded documents for this report
    const { data: docsData, error: docsError } = await supabase
      .from('documents')
      .select('*')
      .eq('report_id', reportId);

    if (docsError) {
      console.error('Error fetching documents:', docsError);
      throw docsError;
    }

    const documents = docsData || [];
    console.log(`Found ${documents.length} documents for report`);

    // 2b. Extract text from storage for any docs that haven't been extracted yet
    let extractedCount = 0;
    for (const doc of documents) {
      const needsExtraction = !doc.extracted_text || String(doc.extracted_text).trim().length === 0;
      if (!needsExtraction) continue;

      try {
        console.log(`Extracting text for: ${doc.file_name} (${doc.file_path})`);

        const { data: fileBlob, error: downloadError } = await supabase.storage
          .from('legal-packs')
          .download(doc.file_path);

        if (downloadError || !fileBlob) {
          console.error('Download error:', downloadError);
          continue;
        }

        const extractedText = await extractTextFromBlob({
          blob: fileBlob,
          fileName: doc.file_name,
          mimeType: doc.mime_type,
        });

        if (extractedText.trim()) {
          const cappedText = extractedText.slice(0, 250_000);
          doc.extracted_text = cappedText;
          doc.extracted_at = new Date().toISOString();

          const { error: updateDocError } = await supabase
            .from('documents')
            .update({ extracted_text: cappedText, extracted_at: doc.extracted_at })
            .eq('id', doc.id);

          if (updateDocError) {
            console.error('Failed to update extracted text:', updateDocError);
          } else {
            extractedCount++;
          }
        } else {
          console.log(`No extractable text found for: ${doc.file_name}`);
        }
      } catch (e) {
        console.error(`Extraction failed for ${doc.file_name}:`, e);
      }
    }

    if (extractedCount > 0) {
      console.log(`Extracted text for ${extractedCount} document(s)`);
    }

    // 3. Build combined text from all documents
    let combinedText = '';
    
    // Include scraped data if available
    if (report.scraped_data) {
      const scraped = report.scraped_data as { markdown?: string; metadata?: { title?: string; description?: string } };
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
      // No content to analyze, mark as completed with Unknown sections
      console.log('No content to analyze, creating default sections');
      
      for (const sectionKey of SECTION_KEYS) {
        await supabase.from('report_sections').upsert({
          report_id: reportId,
          user_id: userId,
          section_key: sectionKey,
          content: 'Unknown - No documents provided for analysis',
          sources: null,
        }, { onConflict: 'report_id,section_key' });
      }

      await supabase.from('reports').update({ status: 'completed' }).eq('id', reportId);
      
      return new Response(JSON.stringify({ success: true, message: 'No content to analyze' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Call OpenAI to generate structured analysis
    console.log(`Sending ${combinedText.length} chars to OpenAI for analysis`);

    const systemPrompt = `You are an expert UK property law analyst specializing in auction legal packs. 
Analyze the provided documents and extract information for each section.

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

Sections to analyze:
1. Title - Title registration status, any title defects, restrictions
2. Ownership - Current and previous owners, seller information
3. Charges and Money - Mortgages, charges, debts against property
4. Covenants - Restrictive covenants, obligations, rights of way
5. Tenure - Freehold/leasehold, lease terms, ground rent
6. Planning and Development - Planning permissions, building regulations, extensions
7. Completion & Penalty Risks - Completion timeline, penalties for late completion
8. Physical & Environmental Risks - Flood risk, subsidence, contamination
9. Special Conditions & Amenities - Auction special conditions, buyer's premium, excluded items`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Analyze this property legal pack:\n\n${combinedText.slice(0, 100000)}` },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'save_analysis',
              description: 'Save the structured analysis for all sections',
              parameters: {
                type: 'object',
                properties: {
                  sections: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        section_key: {
                          type: 'string',
                          enum: SECTION_KEYS,
                        },
                        summary: { type: 'string' },
                        issues: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              severity: { type: 'string', enum: ['critical', 'warning', 'info'] },
                              text: { type: 'string' },
                            },
                            required: ['severity', 'text'],
                          },
                        },
                        details: { type: 'string' },
                      },
                      required: ['section_key', 'summary', 'issues'],
                    },
                  },
                  property_details: {
                    type: 'object',
                    properties: {
                      propertyType: { type: 'string' },
                      bedrooms: { type: 'string' },
                      bathrooms: { type: 'string' },
                      size: { type: 'string' },
                      tenure: { type: 'string' },
                      guidePrice: { type: 'string' },
                      auctionDate: { type: 'string' },
                    },
                  },
                  asta_score: {
                    type: 'object',
                    properties: {
                      score: { type: 'number' },
                      maxScore: { type: 'number' },
                      description: { type: 'string' },
                    },
                  },
                },
                required: ['sections'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'save_analysis' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('OpenAI response received');

    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'save_analysis') {
      console.error('Unexpected AI response format');
      throw new Error('Failed to parse AI analysis');
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log(`Parsed ${analysis.sections?.length || 0} sections from AI`);

    // 5. Save sections to database
    for (const section of analysis.sections || []) {
      const content = JSON.stringify({
        summary: section.summary,
        issues: section.issues || [],
        details: section.details || '',
      });

      await supabase.from('report_sections').upsert({
        report_id: reportId,
        user_id: userId,
        section_key: section.section_key,
        content: content,
        sources: null,
      }, { onConflict: 'report_id,section_key' });
    }

    // Ensure all sections exist (fill missing with Unknown)
    const existingSections = (analysis.sections || []).map((s: { section_key: string }) => s.section_key);
    for (const sectionKey of SECTION_KEYS) {
      if (!existingSections.includes(sectionKey)) {
        await supabase.from('report_sections').upsert({
          report_id: reportId,
          user_id: userId,
          section_key: sectionKey,
          content: JSON.stringify({ summary: 'Unknown', issues: [], details: '' }),
          sources: null,
        }, { onConflict: 'report_id,section_key' });
      }
    }

    // 6. Update report with analysis result and status
    const analysisResult = {
      propertyDetails: analysis.property_details || {},
      astaScore: analysis.asta_score || { score: 0, maxScore: 10, description: 'Not calculated' },
      documents: (documents || []).map(d => ({
        name: d.file_name,
        pages: 0,
        keyFindings: '',
      })),
    };

    await supabase.from('reports').update({
      status: 'completed',
      analysis_result: analysisResult,
      documents_count: documents?.length || 0,
    }).eq('id', reportId);

    console.log('Report processing completed successfully');

    return new Response(JSON.stringify({ success: true, sections: analysis.sections?.length || 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing legal pack:', error);

    try {
      // best-effort: mark the report as failed so the UI can show a retry action
      if (reportId) {
        await supabase.from('reports').update({ status: 'failed' }).eq('id', reportId);
      }
    } catch (e) {
      console.error('Failed to mark report as failed:', e);
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Processing failed' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
