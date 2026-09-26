export interface CatalogGatewayConfig {
  apiBaseUrl: string;
}

interface CatalogEnvironment {
  VITE_CATALOG_API_BASE_URL?: string;
}

export function readCatalogGatewayConfig(
  environment: CatalogEnvironment = import.meta.env,
): CatalogGatewayConfig {
  return {
    apiBaseUrl: environment.VITE_CATALOG_API_BASE_URL?.trim() ?? "",
  };
}
