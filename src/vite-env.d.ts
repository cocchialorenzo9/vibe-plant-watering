/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BASE_URL: string;
  readonly VITE_DATA_OWNER?: string;
  readonly VITE_DATA_REPO?: string;
  readonly VITE_DATA_PATH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
