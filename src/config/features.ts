/**
 * Feature switches for the app.
 *
 * These are NOT secrets. Any VITE_ variable is copied into the browser bundle,
 * so never put API keys here.
 *
 * aiAssistant: the Claude-powered assistant is paused (no API budget). Any
 * future AI assistant UI must check this flag and render nothing when it is false.
 * Turn it on later by setting VITE_ENABLE_AI_ASSISTANT=true in .env.
 */
export const features = {
  aiAssistant: import.meta.env.VITE_ENABLE_AI_ASSISTANT === 'true',
} as const
