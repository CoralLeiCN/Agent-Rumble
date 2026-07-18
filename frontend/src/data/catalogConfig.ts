export interface CatalogGatewayConfig {
  apiBaseUrl: string;
}

interface CatalogEnvironment {
  VITE_CATALOG_GATEWAY?: string;
  VITE_CATALOG_API_BASE_URL?: string;
}

export function readCatalogGatewayConfig(
  environment: CatalogEnvironment = import.meta.env,
): CatalogGatewayConfig {
  const configuredMode = environment.VITE_CATALOG_GATEWAY?.trim() || "http";
  if (configuredMode !== "http") {
    throw new Error(
      `Unsupported VITE_CATALOG_GATEWAY value "${configuredMode}"; only the live HTTP catalog is supported.`,
    );
  }

  return {
    apiBaseUrl: environment.VITE_CATALOG_API_BASE_URL?.trim() ?? "",
  };
}
