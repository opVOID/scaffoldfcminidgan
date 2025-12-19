/// <reference types="vite/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    API_KEY?: string;
    GEMINI_API_KEY?: string;
  }
}

declare interface ImportMetaEnv {
  readonly VITE_MEGAPOT_API_HOST?: string;
  readonly VITE_MEGAPOT_API_BASE_PATH?: string;
  readonly VITE_BASESCAN_API_KEY?: string;
  readonly VITE_BASESCAN_API_BASE?: string;
  readonly VITE_RPC_URL?: string;
  readonly VITE_RPC_HOST?: string;
  readonly VITE_RPC_PATH?: string;
  readonly GEMINI_API_KEY?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}
