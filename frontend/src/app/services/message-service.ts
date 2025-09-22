export const MESSAGES = {
  loadDatasetError: 'Datensatz konnte nicht geladen werden.',
  datasetUpdated: 'Datensatz aktualisiert.',
  datasetUpdateError: 'Datensatz konnte nicht aktualisiert werden.',
  datasetCreated: 'Datensatz erstellt.',
  datasetCreateError: 'Datensatz konnte nicht erstellt werden.',
  datasetDeleted: 'Datensatz gelöscht.',
  datasetDeleteError: 'Datensatz konnte nicht gelöscht werden.',
  loadEntriesError: 'Einträge konnten nicht geladen werden.',
  missingFields: 'Bitte geben Sie Wert, Bezeichnung und Datum ein.',
  entryCreated: 'Eintrag erstellt.',
  entryCreateError: 'Eintrag konnte nicht erstellt werden.',
  entryUpdated: 'Eintrag aktualisiert.',
  entryUpdateError: 'Eintrag konnte nicht aktualisiert werden.',
  entryDeleted: 'Eintrag gelöscht.',
  entryDeleteError: 'Eintrag konnte nicht gelöscht werden.',
  graphLoadError: 'Das Laden der Diagrammdaten ist fehlgeschlagen.',
  datasetMetaError: 'Die Datensatzdetails konnten nicht geladen werden.',
  actual: 'Reale Werte',
  projected: 'Projektierte Werte',
  datasetCopied: 'Datensatz kopiert.',
  entryCopyError: 'Eintrag konnte nicht kopiert werden.'
};

export const UI_TEXT = {
  headers: {
    appTitle: 'Daten-Tracker',
    dataset: 'Datensatz:',
    createDataset: 'Datensatz erstellen',
    entries: 'Einträge',
    graph: {
      actual: 'Graph: Aktuell',
      target: 'Graph: Ziel',
      endDate: 'Graph: Enddatum',
    },
    edit: 'Bearbeiten',
    chartNoData: 'Keine Daten zum Anzeigen.',
    confirmDelete: 'Wollen Sie das wirklich löschen?',
  },
  labels: {
    name: 'Name',
    description: 'Beschreibung',
    symbol: 'Symbol',
    targetValue: 'Zielwert',
    startDate: 'Startdatum',
    endDate: 'Enddatum',
    confirmDeleteDataset: 'Bestätigen Sie das löschen des Datensatzes.',
    confirmDeleteEntry: 'Bestätigen Sie das löschen des Eintrags.',
  },
  tabs: {
    data: 'Daten',
    edit: 'Bearbeiten',
  },
  errors: {
    nameRequired: 'Name ist erforderlich.',
    symbolRequired: 'Symbol ist erforderlich.',
  },
  table: {
    label: 'Bezeichnung',
    value: 'Wert',
    date: 'Datum',
    actions: 'Aktionen',
    loading: 'Einträge werden geladen...',
  },
  buttons: {
    add: 'Hinzufügen',
    clear: 'Leeren',
    save: 'Speichern',
    delete: 'Löschen',
    create: 'Erstellen',
    update: 'Aktualisieren',
    cancel: 'Abbrechen',
    confirm: 'Bestätigen'
  },
  placeholders: {
    label: 'Bezeichnung',
    value: 'Wert',
  },
  graph: {
    loading: 'Graph wird geladen...',
    xAxis: 'Datum',
    yAxis: 'Wert',
  },
};
