/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CATALOG_GATEWAY?: "http" | "static";
  readonly VITE_CATALOG_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
