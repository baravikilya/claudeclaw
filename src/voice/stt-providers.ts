import { readFileSync, existsSync } from "fs";
import { extname } from "path";
import type { Settings } from "../config";

// STT Provider interfaces
export interface STTProvider {
  transcribe(audioPath: string, options?: STTOptions): Promise<string>;
  readonly name: string;
}

export interface STTOptions {
  language?: string;
  debug?: boolean;
  log?: (msg: string) => void;
  _fallbackProviders?: STTProvider[];
}

// Helper to get MIME type from file extension
function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    ".ogg": "audio/ogg",
    ".oga": "audio/ogg",
    ".wav": "audio/wav",
    ".mp3": "audio/mpeg",
    ".m4a": "audio/mp4",
    ".mp4": "audio/mp4",
    ".webm": "audio/webm",
  };
  return mimeTypes[ext] || "audio/octet-stream";
}

// Groq STT Provider
export class GroqSTTProvider implements STTProvider {
  readonly name = "groq";
  private baseUrl = "https://api.groq.com/openai/v1/audio/transcriptions";

  constructor(
    private apiKey: string,
    private model: string = "whisper-large-v3"
  ) {}

  async transcribe(audioPath: string, options?: STTOptions): Promise<string> {
    try {
      options?.log?.(`[Groq STT] Transcribing: ${audioPath}`);

      if (!existsSync(audioPath)) {
        throw new Error(`File not found: ${audioPath}`);
      }

      const audioBuffer = readFileSync(audioPath);
      const mimeType = getMimeType(audioPath);

      // Groq requires .ogg extension, rename if needed
      const formData = new FormData();
      const file = new Blob([audioBuffer], { type: mimeType });
      formData.append("file", file, "audio.ogg");
      formData.append("model", this.model);
      formData.append("response_format", "text");

      if (options?.language) {
        formData.append("language", options.language);
      }

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error ${response.status}: ${errorText}`);
      }

      const transcript = await response.text();
      options?.log?.(`[Groq STT] Success: ${transcript.substring(0, 50)}...`);
      return transcript.trim();
    } catch (error) {
      options?.log?.(`[Groq STT] Error: ${error}`);
      return this.tryFallbacks(audioPath, options, error);
    }
  }

  private async tryFallbacks(audioPath: string, options?: STTOptions, originalError?: any): Promise<string> {
    if (!options?._fallbackProviders || options._fallbackProviders.length === 0) {
      throw originalError;
    }

    options?.log?.(`[Groq STT] Trying fallback providers...`);

    for (const fallback of options._fallbackProviders) {
      try {
        options?.log?.(`[Groq STT] Trying ${fallback.name}...`);
        return await fallback.transcribe(audioPath, options);
      } catch (fallbackError) {
        options?.log?.(`[Groq STT] ${fallback.name} also failed: ${fallbackError}`);
      }
    }

    throw originalError;
  }
}

// OpenAI STT Provider
export class OpenAISTTProvider implements STTProvider {
  readonly name = "openai";
  private baseUrl = "https://api.openai.com/v1/audio/transcriptions";

  constructor(
    private apiKey: string,
    private model: string = "whisper-1"
  ) {}

  async transcribe(audioPath: string, options?: STTOptions): Promise<string> {
    try {
      options?.log?.(`[OpenAI STT] Transcribing: ${audioPath}`);

      if (!existsSync(audioPath)) {
        throw new Error(`File not found: ${audioPath}`);
      }

      const audioBuffer = readFileSync(audioPath);
      const mimeType = getMimeType(audioPath);

      const formData = new FormData();
      const file = new Blob([audioBuffer], { type: mimeType });
      formData.append("file", file, "audio.ogg");
      formData.append("model", this.model);

      if (options?.language) {
        formData.append("language", options.language);
      }

      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const transcript = data.text;
      options?.log?.(`[OpenAI STT] Success: ${transcript.substring(0, 50)}...`);
      return transcript.trim();
    } catch (error) {
      options?.log?.(`[OpenAI STT] Error: ${error}`);
      return this.tryFallbacks(audioPath, options, error);
    }
  }

  private async tryFallbacks(audioPath: string, options?: STTOptions, originalError?: any): Promise<string> {
    if (!options?._fallbackProviders || options._fallbackProviders.length === 0) {
      throw originalError;
    }

    options?.log?.(`[OpenAI STT] Trying fallback providers...`);

    for (const fallback of options._fallbackProviders) {
      try {
        options?.log?.(`[OpenAI STT] Trying ${fallback.name}...`);
        return await fallback.transcribe(audioPath, options);
      } catch (fallbackError) {
        options?.log?.(`[OpenAI STT] ${fallback.name} also failed: ${fallbackError}`);
      }
    }

    throw originalError;
  }
}

// Fallback wrapper class
class FallbackSTTProvider implements STTProvider {
  readonly name: string;

  constructor(
    private primary: STTProvider,
    private fallbacks: STTProvider[]
  ) {
    this.name = primary.name;
  }

  async transcribe(audioPath: string, options?: STTOptions): Promise<string> {
    const augmentedOpts = {
      ...options,
      _fallbackProviders: this.fallbacks,
    };
    return await this.primary.transcribe(audioPath, augmentedOpts);
  }
}

// Factory function to create STT provider with fallback chain
export function createSTTProvider(settings: Settings, localProvider: STTProvider): STTProvider {
  // Determine primary provider
  let primary: STTProvider | undefined;

  switch (settings.voiceApi.sttProvider) {
    case "groq":
      if (settings.groq.enabled && settings.groq.apiKey) {
        primary = new GroqSTTProvider(settings.groq.apiKey, settings.groq.model);
      }
      break;

    case "openai":
      if (settings.openai.enabled && settings.openai.apiKey) {
        primary = new OpenAISTTProvider(settings.openai.apiKey, settings.openai.model);
      }
      break;
  }

  // If no primary provider is configured, use local
  if (!primary) {
    return localProvider;
  }

  // Build fallback chain
  const fallbacks: STTProvider[] = [];

  // Add alternative API as fallback
  if (settings.voiceApi.sttProvider === "groq" && settings.openai.enabled && settings.openai.apiKey) {
    fallbacks.push(new OpenAISTTProvider(settings.openai.apiKey, settings.openai.model));
  } else if (settings.voiceApi.sttProvider === "openai" && settings.groq.enabled && settings.groq.apiKey) {
    fallbacks.push(new GroqSTTProvider(settings.groq.apiKey, settings.groq.model));
  }

  // Local provider as final fallback
  fallbacks.push(localProvider);

  // Wrap with fallback logic
  return new FallbackSTTProvider(primary, fallbacks);
}
