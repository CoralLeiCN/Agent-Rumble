export type CatalogGatewayMode = "http" | "static";

export interface CatalogGatewayConfig {
  mode: CatalogGatewayMode;
  apiBaseUrl: string;
}

interface CatalogEnvironment {
  VITE_CATALOG_GATEWAY?: string;
  VITE_CATALOG_API_BASE_URL?: string;
}

export function readCatalogGatewayConfig(
  environment: CatalogEnvironment = import.meta.env,
): CatalogGatewayConfig {
  const configuredMode = environment.VITE_CATALOG_GATEWAY?.trim() || "static";
  if (configuredMode !== "http" && configuredMode !== "static") {
    throw new Error(
      `Unsupported VITE_CATALOG_GATEWAY value "${configuredMode}"; expected "http" or "static".`,
    );
  }

  return {
    mode: configuredMode,
    apiBaseUrl: environment.VITE_CATALOG_API_BASE_URL?.trim() ?? "",
  };
}
