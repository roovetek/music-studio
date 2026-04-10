/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional cloud sync for cricket deliveries (see Supabase migration). */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_FUSION_API_URL?: string;
  /** Max upload size in MB (default 10). Must match FUSION_MAX_UPLOAD_MB on the Fusion API. */
  readonly VITE_MAX_UPLOAD_MB?: string;
  /** Cricket Vision API (FastAPI), e.g. http://127.0.0.1:8002 */
  readonly VITE_CRICKET_API_URL?: string;
  /** Optional WebSocket origin, e.g. ws://127.0.0.1:8002 (defaults from API URL). */
  readonly VITE_CRICKET_WS_URL?: string;
}
