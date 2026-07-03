interface Props {
  /** Bibehållen för bakåtkompatibilitet — visas inte längre. */
  feature: string;
  /** Bibehållen för bakåtkompatibilitet — visas inte längre. */
  clientTab: string;
}

/**
 * Tidigare visade denna komponent en informationsbanner som hänvisade
 * användaren till klientens egen flik i WL-shell ("öppna klienten och
 * gå till X-fliken"). Det bröt WL-flödet — alla operationer ska ske
 * direkt i byråvyn. Komponenten returnerar nu `null` men bibehålls
 * som no-op så befintliga importer fortsätter fungera.
 */
export const OrchestrationInfoBanner = (_props: Props) => null;
