import { readFile, writeFile } from "fs/promises";
import { SETTINGS_FILE } from "../constants";

// Voice API provider
export async function updateVoiceApiProvider(provider: "local" | "groq" | "openai"): Promise<void> {
  const raw = await readFile(SETTINGS_FILE, "utf-8");
  const data = JSON.parse(raw) as Record<string, any>;
  if (!data.voiceApi || typeof data.voiceApi !== "object") data.voiceApi = {};
  data.voiceApi.sttProvider = provider;
  await writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2) + "\n");
}

// Groq settings
export interface GroqSettingsPatch {
  enabled?: boolean;
  apiKey?: string;
  model?: string;
}

export interface GroqSettingsData {
  enabled: boolean;
  apiKey: string;
  model: string;
}

export async function readGroqSettings(): Promise<GroqSettingsData> {
  const raw = await readFile(SETTINGS_FILE, "utf-8");
  const data = JSON.parse(raw) as Record<string, any>;
  if (!data.groq || typeof data.groq !== "object") data.groq = {};
  return {
    enabled: Boolean(data.groq.enabled),
    apiKey: typeof data.groq.apiKey === "string" ? data.groq.apiKey : "",
    model: typeof data.groq.model === "string" ? data.groq.model : "whisper-large-v3",
  };
}

export async function updateGroqSettings(patch: GroqSettingsPatch): Promise<GroqSettingsData> {
  const raw = await readFile(SETTINGS_FILE, "utf-8");
  const data = JSON.parse(raw) as Record<string, any>;
  if (!data.groq || typeof data.groq !== "object") data.groq = {};

  if (typeof patch.enabled === "boolean") {
    data.groq.enabled = patch.enabled;
  }
  if (typeof patch.apiKey === "string") {
    data.groq.apiKey = patch.apiKey;
  }
  if (typeof patch.model === "string") {
    data.groq.model = patch.model;
  }

  await writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2) + "\n");
  return {
    enabled: Boolean(data.groq.enabled),
    apiKey: typeof data.groq.apiKey === "string" ? data.groq.apiKey : "",
    model: typeof data.groq.model === "string" ? data.groq.model : "whisper-large-v3",
  };
}

// OpenAI settings
export interface OpenAISettingsPatch {
  enabled?: boolean;
  apiKey?: string;
  model?: string;
}

export interface OpenAISettingsData {
  enabled: boolean;
  apiKey: string;
  model: string;
}

export async function readOpenAISettings(): Promise<OpenAISettingsData> {
  const raw = await readFile(SETTINGS_FILE, "utf-8");
  const data = JSON.parse(raw) as Record<string, any>;
  if (!data.openai || typeof data.openai !== "object") data.openai = {};
  return {
    enabled: Boolean(data.openai.enabled),
    apiKey: typeof data.openai.apiKey === "string" ? data.openai.apiKey : "",
    model: typeof data.openai.model === "string" ? data.openai.model : "whisper-1",
  };
}

export async function updateOpenAISettings(patch: OpenAISettingsPatch): Promise<OpenAISettingsData> {
  const raw = await readFile(SETTINGS_FILE, "utf-8");
  const data = JSON.parse(raw) as Record<string, any>;
  if (!data.openai || typeof data.openai !== "object") data.openai = {};

  if (typeof patch.enabled === "boolean") {
    data.openai.enabled = patch.enabled;
  }
  if (typeof patch.apiKey === "string") {
    data.openai.apiKey = patch.apiKey;
  }
  if (typeof patch.model === "string") {
    data.openai.model = patch.model;
  }

  await writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2) + "\n");
  return {
    enabled: Boolean(data.openai.enabled),
    apiKey: typeof data.openai.apiKey === "string" ? data.openai.apiKey : "",
    model: typeof data.openai.model === "string" ? data.openai.model : "whisper-1",
  };
}

// ElevenLabs settings
export interface ElevenLabsSettingsPatch {
  enabled?: boolean;
  apiKey?: string;
  voiceId?: string;
  model?: string;
  ttsEnabled?: boolean;
}

export interface ElevenLabsSettingsData {
  enabled: boolean;
  apiKey: string;
  voiceId: string;
  model: string;
  ttsEnabled: boolean;
}

export async function readElevenLabsSettings(): Promise<ElevenLabsSettingsData> {
  const raw = await readFile(SETTINGS_FILE, "utf-8");
  const data = JSON.parse(raw) as Record<string, any>;
  if (!data.elevenLabs || typeof data.elevenLabs !== "object") data.elevenLabs = {};
  if (!data.voiceApi || typeof data.voiceApi !== "object") data.voiceApi = {};

  return {
    enabled: Boolean(data.elevenLabs.enabled),
    apiKey: typeof data.elevenLabs.apiKey === "string" ? data.elevenLabs.apiKey : "",
    voiceId: typeof data.elevenLabs.voiceId === "string" ? data.elevenLabs.voiceId : "",
    model: typeof data.elevenLabs.model === "string" ? data.elevenLabs.model : "eleven_turbo_v2_5",
    ttsEnabled: Boolean(data.voiceApi.ttsEnabled),
  };
}

export async function updateElevenLabsSettings(patch: ElevenLabsSettingsPatch): Promise<ElevenLabsSettingsData> {
  const raw = await readFile(SETTINGS_FILE, "utf-8");
  const data = JSON.parse(raw) as Record<string, any>;
  if (!data.elevenLabs || typeof data.elevenLabs !== "object") data.elevenLabs = {};
  if (!data.voiceApi || typeof data.voiceApi !== "object") data.voiceApi = {};

  if (typeof patch.enabled === "boolean") {
    data.elevenLabs.enabled = patch.enabled;
  }
  if (typeof patch.apiKey === "string") {
    data.elevenLabs.apiKey = patch.apiKey;
  }
  if (typeof patch.voiceId === "string") {
    data.elevenLabs.voiceId = patch.voiceId;
  }
  if (typeof patch.model === "string") {
    data.elevenLabs.model = patch.model;
  }
  if (typeof patch.ttsEnabled === "boolean") {
    data.voiceApi.ttsEnabled = patch.ttsEnabled;
  }

  await writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2) + "\n");
  return {
    enabled: Boolean(data.elevenLabs.enabled),
    apiKey: typeof data.elevenLabs.apiKey === "string" ? data.elevenLabs.apiKey : "",
    voiceId: typeof data.elevenLabs.voiceId === "string" ? data.elevenLabs.voiceId : "",
    model: typeof data.elevenLabs.model === "string" ? data.elevenLabs.model : "eleven_turbo_v2_5",
    ttsEnabled: Boolean(data.voiceApi.ttsEnabled),
  };
}

// Gemini settings
export interface GeminiSettingsPatch {
  enabled?: boolean;
  apiKey?: string;
  model?: string;
  analyzeImages?: boolean;
  analyzeVideo?: boolean;
}

export interface GeminiSettingsData {
  enabled: boolean;
  apiKey: string;
  model: string;
  analyzeImages: boolean;
  analyzeVideo: boolean;
}

export async function readGeminiSettings(): Promise<GeminiSettingsData> {
  const raw = await readFile(SETTINGS_FILE, "utf-8");
  const data = JSON.parse(raw) as Record<string, any>;
  if (!data.gemini || typeof data.gemini !== "object") data.gemini = {};

  return {
    enabled: Boolean(data.gemini.enabled),
    apiKey: typeof data.gemini.apiKey === "string" ? data.gemini.apiKey : "",
    model: typeof data.gemini.model === "string" ? data.gemini.model : "gemini-2.5-flash",
    analyzeImages: Boolean(data.gemini.analyzeImages),
    analyzeVideo: Boolean(data.gemini.analyzeVideo),
  };
}

export async function updateGeminiSettings(patch: GeminiSettingsPatch): Promise<GeminiSettingsData> {
  const raw = await readFile(SETTINGS_FILE, "utf-8");
  const data = JSON.parse(raw) as Record<string, any>;
  if (!data.gemini || typeof data.gemini !== "object") data.gemini = {};

  if (typeof patch.enabled === "boolean") {
    data.gemini.enabled = patch.enabled;
  }
  if (typeof patch.apiKey === "string") {
    data.gemini.apiKey = patch.apiKey;
  }
  if (typeof patch.model === "string") {
    data.gemini.model = patch.model;
  }
  if (typeof patch.analyzeImages === "boolean") {
    data.gemini.analyzeImages = patch.analyzeImages;
  }
  if (typeof patch.analyzeVideo === "boolean") {
    data.gemini.analyzeVideo = patch.analyzeVideo;
  }

  await writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2) + "\n");
  return {
    enabled: Boolean(data.gemini.enabled),
    apiKey: typeof data.gemini.apiKey === "string" ? data.gemini.apiKey : "",
    model: typeof data.gemini.model === "string" ? data.gemini.model : "gemini-2.5-flash",
    analyzeImages: Boolean(data.gemini.analyzeImages),
    analyzeVideo: Boolean(data.gemini.analyzeVideo),
  };
}

export async function setHeartbeatEnabled(enabled: boolean): Promise<void> {
  await updateHeartbeatSettings({ enabled });
}

export interface HeartbeatSettingsPatch {
  enabled?: boolean;
  interval?: number;
  prompt?: string;
  excludeWindows?: Array<{ days?: number[]; start: string; end: string }>;
}

export interface HeartbeatSettingsData {
  enabled: boolean;
  interval: number;
  prompt: string;
  excludeWindows: Array<{ days?: number[]; start: string; end: string }>;
}

export async function readHeartbeatSettings(): Promise<HeartbeatSettingsData> {
  const raw = await readFile(SETTINGS_FILE, "utf-8");
  const data = JSON.parse(raw) as Record<string, any>;
  if (!data.heartbeat || typeof data.heartbeat !== "object") data.heartbeat = {};
  return {
    enabled: Boolean(data.heartbeat.enabled),
    interval: Number(data.heartbeat.interval) || 15,
    prompt: typeof data.heartbeat.prompt === "string" ? data.heartbeat.prompt : "",
    excludeWindows: Array.isArray(data.heartbeat.excludeWindows) ? data.heartbeat.excludeWindows : [],
  };
}

export async function updateHeartbeatSettings(patch: HeartbeatSettingsPatch): Promise<HeartbeatSettingsData> {
  const raw = await readFile(SETTINGS_FILE, "utf-8");
  const data = JSON.parse(raw) as Record<string, any>;
  if (!data.heartbeat || typeof data.heartbeat !== "object") data.heartbeat = {};

  if (typeof patch.enabled === "boolean") {
    data.heartbeat.enabled = patch.enabled;
  }
  if (typeof patch.interval === "number" && Number.isFinite(patch.interval)) {
    const clamped = Math.max(1, Math.min(1440, Math.round(patch.interval)));
    data.heartbeat.interval = clamped;
  }
  if (typeof patch.prompt === "string") {
    data.heartbeat.prompt = patch.prompt;
  }
  if (Array.isArray(patch.excludeWindows)) {
    data.heartbeat.excludeWindows = patch.excludeWindows;
  }

  await writeFile(SETTINGS_FILE, JSON.stringify(data, null, 2) + "\n");
  return {
    enabled: Boolean(data.heartbeat.enabled),
    interval: Number(data.heartbeat.interval) || 15,
    prompt: typeof data.heartbeat.prompt === "string" ? data.heartbeat.prompt : "",
    excludeWindows: Array.isArray(data.heartbeat.excludeWindows) ? data.heartbeat.excludeWindows : [],
  };
}
