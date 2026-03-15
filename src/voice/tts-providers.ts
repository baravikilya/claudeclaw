// TTS Provider interfaces
export interface TTSProvider {
  synthesize(text: string, options?: TTSOptions): Promise<Buffer>;
  readonly name: string;
}

export interface TTSOptions {
  voiceId?: string;
  model?: string;
  stability?: number;
  similarityBoost?: number;
}

// ElevenLabs TTS Provider
export class ElevenLabsTTSProvider implements TTSProvider {
  readonly name = "elevenlabs";
  private baseUrl = "https://api.elevenlabs.io/v1/text-to-speech";

  constructor(
    private apiKey: string,
    private voiceId: string,
    private model: string = "eleven_turbo_v2_5"
  ) {}

  async synthesize(text: string, options?: TTSOptions): Promise<Buffer> {
    const voiceId = options?.voiceId || this.voiceId;
    const model = options?.model || this.model;

    const voiceSettings: any = {};
    if (options?.stability !== undefined) {
      voiceSettings.stability = options.stability;
    }
    if (options?.similarityBoost !== undefined) {
      voiceSettings.similarity_boost = options.similarityBoost;
    }

    const requestBody: any = {
      text,
      model_id: model,
    };

    if (Object.keys(voiceSettings).length > 0) {
      requestBody.voice_settings = voiceSettings;
    }

    const response = await fetch(`${this.baseUrl}/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": this.apiKey,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs API error ${response.status}: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

// OpenAI TTS Provider
export class OpenAITTSProvider implements TTSProvider {
  readonly name = "openai";
  private baseUrl = "https://api.openai.com/v1/audio/speech";

  constructor(
    private apiKey: string,
    private voice: string = "alloy",
    private model: string = "tts-1"
  ) {}

  async synthesize(text: string, options?: TTSOptions): Promise<Buffer> {
    const voice = options?.voiceId || this.voice;
    const model = options?.model || this.model;

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI TTS API error ${response.status}: ${errorText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

// Factory function to create TTS provider
export function createTTSProvider(settings: any): TTSProvider | null {
  const ttsProvider = settings.voiceApi?.ttsProvider || "disabled";

  if (ttsProvider === "openai") {
    if (!settings.openai?.enabled || !settings.openai?.apiKey) {
      console.warn("[TTS] OpenAI selected but not configured. TTS disabled.");
      return null;
    }
    return new OpenAITTSProvider(
      settings.openai.apiKey,
      settings.openai.ttsVoice || "alloy",
      settings.openai.ttsModel || "tts-1"
    );
  }

  if (ttsProvider === "elevenlabs") {
    if (!settings.elevenLabs?.enabled || !settings.elevenLabs?.apiKey) {
      console.warn("[TTS] ElevenLabs selected but not configured. TTS disabled.");
      return null;
    }
    return new ElevenLabsTTSProvider(
      settings.elevenLabs.apiKey,
      settings.elevenLabs.voiceId,
      settings.elevenLabs.model
    );
  }

  // ttsProvider === "disabled" or unknown
  return null;
}
