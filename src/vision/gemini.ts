import { readFile, stat } from "fs/promises";
import { basename, extname } from "path";

export interface GeminiOptions {
  apiKey: string;
  model?: string;
}

export interface GeminiAnalysisOptions {
  /** Maximum time to wait for file processing (seconds) */
  maxWaitTime?: number;
  /** Poll interval for file status (milliseconds) */
  pollInterval?: number;
}

// Helper to get MIME type from file extension
function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".avi": "video/x-msvideo",
    ".webm": "video/webm",
    ".mkv": "video/x-matroska",
  };
  return mimeTypes[ext] || "application/octet-stream";
}

export class GeminiVisionAnalyzer {
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  constructor(
    private apiKey: string,
    private model: string = "gemini-2.5-flash"
  ) {}

  /**
   * Analyze an image using Gemini Vision API
   */
  async analyzeImage(imagePath: string, prompt?: string): Promise<string> {
    const defaultPrompt = "Describe what you see in detail, including any text, objects, people, and context.";
    const finalPrompt = prompt || defaultPrompt;

    try {
      const imageBuffer = await readFile(imagePath);
      const base64Image = imageBuffer.toString("base64");
      const mimeType = getMimeType(imagePath);

      const response = await fetch(
        `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inline_data: { mime_type: mimeType, data: base64Image } },
                { text: finalPrompt }
              ]
            }]
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error("No response from Gemini API");
      }

      return data.candidates[0].content.parts[0].text;
    } catch (error) {
      throw new Error(`Gemini image analysis failed: ${error}`);
    }
  }

  /**
   * Analyze a video using Gemini Vision API
   * Gemini supports video natively - for short videos use base64, for long videos use File Upload API
   */
  async analyzeVideo(videoPath: string, prompt?: string, options?: GeminiAnalysisOptions): Promise<string> {
    const defaultPrompt = "Provide a comprehensive analysis of this video, including: visual scenes, actions, people/objects, any text visible, and if there is audio, summarize what is being said.";
    const finalPrompt = prompt || defaultPrompt;

    try {
      const stats = await stat(videoPath);
      const fileSizeMB = stats.size / (1024 * 1024);

      // For videos under 10MB, use base64 encoding
      if (fileSizeMB < 10) {
        return await this.analyzeVideoBase64(videoPath, finalPrompt);
      } else {
        return await this.analyzeVideoFileUpload(videoPath, finalPrompt, options);
      }
    } catch (error) {
      throw new Error(`Gemini video analysis failed: ${error}`);
    }
  }

  /**
   * Analyze video using base64 encoding (for short videos)
   */
  private async analyzeVideoBase64(videoPath: string, prompt: string): Promise<string> {
    const videoBuffer = await readFile(videoPath);
    const base64Video = videoBuffer.toString("base64");
    const mimeType = getMimeType(videoPath);

    const response = await fetch(
      `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: base64Video } },
              { text: prompt }
            ]
          }]
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from Gemini API");
    }

    return data.candidates[0].content.parts[0].text;
  }

  /**
   * Analyze video using File Upload API (for long videos)
   */
  private async analyzeVideoFileUpload(
    videoPath: string,
    prompt: string,
    options?: GeminiAnalysisOptions
  ): Promise<string> {
    const maxWaitTime = options?.maxWaitTime || 60; // Default 60 seconds
    const pollInterval = options?.pollInterval || 1000; // Default 1 second

    // Step 1: Upload video file
    const videoBuffer = await readFile(videoPath);
    const fileName = basename(videoPath);
    const mimeType = getMimeType(videoPath);

    const uploadResponse = await fetch(
      `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "X-Goog-Upload-Protocol": "raw",
          "X-Goog-Upload-File-Name": fileName,
          "Content-Type": mimeType,
        },
        body: videoBuffer,
      }
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Gemini upload error ${uploadResponse.status}: ${errorText}`);
    }

    const uploadData = await uploadResponse.json();
    const fileUri = uploadData.file.uri;

    // Step 2: Wait for file processing to complete
    await this.waitForFileReady(fileUri, maxWaitTime, pollInterval);

    // Step 3: Generate content using the uploaded file
    const response = await fetch(
      `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { file_data: { file_uri: fileUri } },
              { text: prompt }
            ]
          }]
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("No response from Gemini API");
    }

    return data.candidates[0].content.parts[0].text;
  }

  /**
   * Wait for uploaded file to be processed and ready
   */
  private async waitForFileReady(
    fileUri: string,
    maxWaitTime: number = 60,
    pollInterval: number = 1000
  ): Promise<void> {
    const maxAttempts = Math.ceil(maxWaitTime * 1000 / pollInterval);

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const response = await fetch(`${this.baseUrl}/${fileUri}?key=${this.apiKey}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini file status error ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.file.state === "ACTIVE") {
        return; // File is ready
      }

      if (data.file.state === "FAILED") {
        throw new Error(`File processing failed: ${data.file.error?.message || "Unknown error"}`);
      }

      // Still processing, wait and retry
      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    throw new Error(`File processing timeout after ${maxWaitTime} seconds`);
  }

  /**
   * Get the current status of an uploaded file
   */
  async getFileStatus(fileUri: string): Promise<{
    name: string;
    displayName: string;
    mimeType: string;
    sizeBytes: number;
    createTime: string;
    updateTime: string;
    expirationTime: string;
    state: "ACTIVE" | "PROCESSING" | "FAILED";
  }> {
    const response = await fetch(`${this.baseUrl}/${fileUri}?key=${this.apiKey}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini file status error ${response.status}: ${errorText}`);
    }

    return await response.json();
  }
}

// Factory function to create Gemini analyzer
export function createGeminiAnalyzer(settings: any): GeminiVisionAnalyzer | null {
  if (!settings.gemini?.enabled || !settings.gemini?.apiKey) {
    return null;
  }

  return new GeminiVisionAnalyzer(
    settings.gemini.apiKey,
    settings.gemini.model || "gemini-2.5-flash"
  );
}
