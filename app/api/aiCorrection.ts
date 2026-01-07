/**
 * AI Correction API Service
 * 
 * Complete integration with Akura AI backend for dyslexia correction
 * Includes all endpoints from Postman collection
 */

// Use API Gateway for routing, fallback to localhost for local development
const GATEWAY_BASE = process.env.EXPO_PUBLIC_API_GATEWAY?.trim() || '';
const AI_BACKEND_URL = GATEWAY_BASE 
  ? `${GATEWAY_BASE}/ai-recorrection-workbench/api/v1`
  : 'http://localhost:8000/api/v1';  // Fallback for local dev without gateway

// ============================================================================
// Type Definitions
// ============================================================================

export interface WordAnalysis {
  word: string;
  type: 'error' | 'correct';
  dyslexiaPattern?: string;
  suggestion?: string;
  explanation?: string;
  confidence?: number;
  source?: string;
}

export interface AnalyzeResponse {
  success: boolean;
  data: WordAnalysis[];
  correctedText?: string;
  originalText?: string;
  processingTimeMs?: number;
  modelUsed?: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  modelStatus: string;
  ollamaConnected: boolean;
}

export interface OCRResponse {
  success: boolean;
  text: string;
  confidence: number;
  source: string;
  filename?: string;
  error?: string;
}

export interface DyslexiaPattern {
  name: string;
  description: string;
}

export interface PatternsResponse {
  success: boolean;
  patterns: DyslexiaPattern[];
  total: number;
}

// Child Essays Types
export interface CorrectionDetail {
  word: string;
  suggestion: string;
  pattern?: string;
  confidence?: number;
}

export interface EssaySubmit {
  original_text: string;
  title?: string;
}

export interface EssayResponse {
  essay_id: string;
  child_id: string;
  title?: string;
  original_text: string;
  corrected_text: string;
  error_count: number;
  corrections: CorrectionDetail[];
  model_used?: string;
  processing_time_ms?: number;
  created_at: string;
}

export interface EssayListItem {
  essay_id: string;
  title?: string;
  original_text: string;
  corrected_text: string;
  error_count: number;
  created_at: string;
}

export interface ChildInfo {
  child_id: string;
  essay_count: number;
  latest_essay_at?: string;
}

export interface ChildrenListResponse {
  total_children: number;
  children: ChildInfo[];
}

// Session Types
export interface SessionCorrection {
  original_word: string;
  suggested_word: string;
  pattern: string;
  confidence: number;
}

export interface SessionCreate {
  original_text: string;
  model_used: string;
  corrections: SessionCorrection[];
}

export interface SessionResponse {
  success: boolean;
  session_id?: string;
  message?: string;
  error?: string;
}

export interface Session {
  id: string;
  original_text: string;
  final_text?: string;
  model_used: string;
  is_demo_mode: boolean;
  created_at: string;
  actions: any[];
}

export interface SessionsListResponse {
  success: boolean;
  sessions: Session[];
  total: number;
  limit: number;
  offset: number;
}

export interface TrainingDataExample {
  instruction: string;
  input: string;
  output: string;
  timestamp?: string;
  action?: string;
}

export interface TrainingDataResponse {
  success: boolean;
  total_examples: number;
  data: TrainingDataExample[];
}

// ============================================================================
// API Service Class
// ============================================================================

class AICorrectionService {
  private baseUrl: string;
  private timeout: number;
  private analyzeTimeout: number;
  private useTimeout: boolean;

  constructor() {
    this.baseUrl = AI_BACKEND_URL;
    this.timeout = 30000; // 30 seconds for general requests
    this.analyzeTimeout = 120000; // 120 seconds (2 minutes) for analysis - AI processing can take longer
    this.useTimeout = false; // TIMEOUTS DISABLED - No timeout limit for AI analysis
  }

  /**
   * Configure timeout settings
   * @param analyzeTimeoutMs - Timeout for analyze operations in milliseconds (0 to disable)
   * @param generalTimeoutMs - Timeout for general operations in milliseconds (0 to disable)
   */
  setTimeouts(analyzeTimeoutMs?: number, generalTimeoutMs?: number) {
    if (analyzeTimeoutMs !== undefined) {
      this.analyzeTimeout = analyzeTimeoutMs;
      if (analyzeTimeoutMs === 0) {
        this.useTimeout = false;
      }
    }
    if (generalTimeoutMs !== undefined) {
      this.timeout = generalTimeoutMs;
    }
  }

  /**
   * Disable all timeouts (use with caution - requests may hang indefinitely)
   */
  disableTimeouts() {
    this.useTimeout = false;
  }

  /**
   * Enable timeouts with specified durations
   */
  enableTimeouts(analyzeTimeoutMs: number = 120000, generalTimeoutMs: number = 30000) {
    this.useTimeout = true;
    this.analyzeTimeout = analyzeTimeoutMs;
    this.timeout = generalTimeoutMs;
  }

  // ==========================================================================
  // Core Analysis Endpoints
  // ==========================================================================

  /**
   * Check backend health
   * GET /api/v1/health
   */
  async checkHealth(): Promise<HealthResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error('Health check failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        status: 'offline',
        version: 'unknown',
        modelStatus: 'Backend unavailable',
        ollamaConnected: false,
      };
    }
  }

  /**
   * Analyze text for dyslexia errors
   * POST /api/v1/analyze
   */
  async analyzeText(
    text: string,
    includeCorrectWords: boolean = false
  ): Promise<AnalyzeResponse> {
    try {
      const controller = new AbortController();
      let timeoutId: NodeJS.Timeout | undefined;

      // Only set timeout if enabled
      if (this.useTimeout && this.analyzeTimeout > 0) {
        timeoutId = setTimeout(() => controller.abort(), this.analyzeTimeout);
      }

      const response = await fetch(`${this.baseUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          include_correct_words: includeCorrectWords,
        }),
        signal: this.useTimeout ? controller.signal : undefined,
      });

      if (timeoutId) clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Analysis failed:', error);
      throw error;
    }
  }

  /**
   * Get available dyslexia patterns
   * GET /api/v1/patterns
   */
  async getPatterns(): Promise<PatternsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/patterns`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch patterns');
      }

      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch patterns:', error);
      return { success: false, patterns: [], total: 0 };
    }
  }

  /**
   * Extract text from image using OCR
   * POST /api/v1/ocr
   */
  async extractTextFromImage(imageUri: string): Promise<OCRResponse> {
    try {
      // Create form data
      const formData = new FormData();
      
      // Convert image URI to blob for web or use file for native
      const filename = imageUri.split('/').pop() || 'image.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      // For React Native, we need to handle file uploads differently
      const fileData: any = {
        uri: imageUri,
        type,
        name: filename,
      };

      formData.append('image', fileData as any);

      const controller = new AbortController();
      // Use longer timeout for OCR (60 seconds) - image processing can take time
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${this.baseUrl}/ocr`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `OCR failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('OCR extraction failed:', error);
      return {
        success: false,
        text: '',
        confidence: 0,
        source: 'error',
        error: error instanceof Error ? error.message : 'OCR failed',
      };
    }
  }

  // ==========================================================================
  // Child Essays Endpoints
  // ==========================================================================

  /**
   * Submit an essay for a child
   * POST /api/v1/children/{childId}/essays
   */
  async submitEssayForChild(
    childId: string,
    essayData: EssaySubmit
  ): Promise<EssayResponse> {
    try {
      const controller = new AbortController();
      // Use longer timeout for essay submission (includes analysis) - 2 minutes
      const timeoutId = setTimeout(() => controller.abort(), this.analyzeTimeout);

      const response = await fetch(
        `${this.baseUrl}/children/${childId}/essays`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(essayData),
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to submit essay: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Submit essay failed:', error);
      throw error;
    }
  }

  /**
   * Get all essays for a child
   * GET /api/v1/children/{childId}/essays
   */
  async getChildEssays(
    childId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<EssayListItem[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/children/${childId}/essays?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to get essays: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get child essays failed:', error);
      throw error;
    }
  }

  /**
   * Get the latest essay for a child
   * GET /api/v1/children/{childId}/essays/latest
   */
  async getLatestEssay(childId: string): Promise<EssayResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/children/${childId}/essays/latest`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to get latest essay: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get latest essay failed:', error);
      throw error;
    }
  }

  /**
   * Get a specific essay by ID
   * GET /api/v1/children/{childId}/essays/{essayId}
   */
  async getEssayById(childId: string, essayId: string): Promise<EssayResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/children/${childId}/essays/${essayId}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to get essay: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Get essay by ID failed:', error);
      throw error;
    }
  }

  /**
   * Delete a specific essay
   * DELETE /api/v1/children/{childId}/essays/{essayId}
   */
  async deleteEssay(childId: string, essayId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/children/${childId}/essays/${essayId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to delete essay: ${response.status}`);
      }
    } catch (error) {
      console.error('Delete essay failed:', error);
      throw error;
    }
  }

  /**
   * List all children who have submitted essays
   * GET /api/v1/children
   */
  async listAllChildren(): Promise<ChildrenListResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/children`, {
        method: 'GET',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to list children: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('List children failed:', error);
      throw error;
    }
  }

  // ==========================================================================
  // Sessions Endpoints (Teacher Feedback)
  // ==========================================================================

  /**
   * Create a new correction session
   * POST /api/v1/sessions
   */
  async createSession(sessionData: SessionCreate): Promise<SessionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sessionData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to create session: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Create session failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Create session failed' 
      };
    }
  }

  /**
   * List all correction sessions
   * GET /api/v1/sessions
   */
  async listSessions(
    limit: number = 50,
    offset: number = 0
  ): Promise<SessionsListResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/sessions?limit=${limit}&offset=${offset}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to list sessions: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('List sessions failed:', error);
      return {
        success: false,
        sessions: [],
        total: 0,
        limit,
        offset,
      };
    }
  }

  /**
   * Export completed sessions as training data
   * GET /api/v1/sessions/export/training-data
   */
  async exportTrainingData(): Promise<TrainingDataResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/sessions/export/training-data`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to export training data: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Export training data failed:', error);
      return {
        success: false,
        total_examples: 0,
        data: [],
      };
    }
  }

  // ==========================================================================
  // Deprecated/Legacy method (kept for backward compatibility)
  // ==========================================================================

  /**
   * @deprecated Use createSession instead
   * Save correction session (legacy method)
   */
  async saveSession(sessionData: any): Promise<any> {
    return this.createSession(sessionData);
  }
}

export const aiCorrectionService = new AICorrectionService();
export default aiCorrectionService;
