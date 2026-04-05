/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FUSION_API_URL?: string;
  /** Max upload size in MB (default 50). Must match FUSION_MAX_UPLOAD_MB on the Fusion API. */
  readonly VITE_MAX_UPLOAD_MB?: string;
}
