/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CATALOG_GATEWAY?: "http";
  readonly VITE_CATALOG_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
