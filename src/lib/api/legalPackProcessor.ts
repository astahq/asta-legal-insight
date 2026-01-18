import { supabase } from '@/integrations/supabase/client';

const getBackendUrl = () => {
  if (import.meta.env.DEV) {
    return '/api';
  }
  return import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
};

const BACKEND_URL = getBackendUrl();

export interface ProcessRequest {
  reportId: string;
  userId?: string;
  url?: string;
}

export interface ProcessResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export async function uploadPdfsToStorage(
  files: File[],
  userId: string
): Promise<string[]> {
  const filePaths: string[] = [];
  
  for (const file of files) {
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name}`;
    const filePath = `${userId}/${fileName}`;
    
    const { error } = await supabase.storage
      .from('legal-packs')
      .upload(filePath, file, {
        contentType: 'application/pdf',
        upsert: false,
      });
    
    if (error) {
      throw new Error(`Failed to upload ${file.name}: ${error.message}`);
    }
    
    filePaths.push(filePath);
  }
  
  return filePaths;
}


export async function processLegalPack(
  request: ProcessRequest
): Promise<ProcessResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(`${BACKEND_URL}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      reportId: request.reportId,
      userId: request.userId || session.user.id,
      url: request.url,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { error: errorText || `HTTP ${response.status}: ${response.statusText}` };
    }
    
    if (response.status === 401) {
      throw new Error('Authentication failed. Please try again.');
    }
    
    throw new Error(errorData.error || errorData.message || 'Failed to start processing');
  }

  return response.json();
}
