import { APIIntegrationRoadmap } from "./APIIntegrationRoadmap";

interface PlatformMigrationProps {
  companyId: string;
  onComplete: () => void;
}

/**
 * Platform API-migration is currently not available.
 * Fortnox and Visma require OAuth 2.0 + Integration Partner approval (in progress).
 * Until then, users should use the SIE import flow which works on all plans today.
 */
export function PlatformMigration({ companyId }: PlatformMigrationProps) {
  return <APIIntegrationRoadmap companyId={companyId} />;
}
