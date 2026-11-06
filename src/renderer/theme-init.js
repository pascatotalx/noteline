// Setzt das Erscheinungsbild vor dem ersten Zeichnen, damit nichts aufblitzt (A-2).
// Der Hauptprozess übergibt das aktive Theme als Query-Parameter.
document.documentElement.dataset.theme = new URLSearchParams(location.search).get('theme') === 'light' ? 'light' : 'dark';
