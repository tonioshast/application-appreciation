/**
 * theme-manager.js
 * Gestionnaire autonome de thèmes de couleurs pour apprecIAtion
 * Propose 2 palettes :
 * 1. Thème sombre (Couleurs d'origine)
 * 2. Thème clair (Fond de page blanc pur lumineux, texte noir/gris, bordures nettes et bien définies)
 */

(function () {
  const STORAGE_KEY = "apprecIAtion_ui_color_theme";

  const THEMES = [
    {
      id: "default",
      name: "Thème sombre",
    },
    {
      id: "github-light",
      name: "Thème clair",
    }
  ];

  function injectThemeStyles() {
    const styleId = "apprecIAtion-theme-styles";
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      document.head.appendChild(style);
    }

    style.textContent = `
      /* ==========================================================================
         DISPOSITION STRICTEMENT MONO-LIGNE DU HEADER (HAUTEUR UNIFORME 35PX)
         Désactivation des retours à la ligne (flex-wrap: nowrap) + défilement horizontal fluide
         Ordre : Logo -> Classe -> Liste élève -> Modales -> Mistral -> Debug -> Exporter -> Thème
         ========================================================================== */
      header {
        padding-top: 4px !important;
        padding-bottom: 4px !important;
        padding-left: 10px !important;
        padding-right: 10px !important;
        overflow-x: auto !important;
        overflow-y: hidden !important;
        white-space: nowrap !important;
        scrollbar-width: thin !important;
      }

      /* Conteneur flex global du header : STRICTEMENT UNE SEULE LIGNE */
      header .max-w-\\[1700px\\],
      header > div {
        display: flex !important;
        flex-direction: row !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
        justify-content: flex-start !important;
        gap: 6px !important;
        width: 100% !important;
        max-width: 100% !important;
      }

      /* Tous les éléments de premier niveau restent sur la même ligne sans rétrécir */
      header > div > * {
        flex-shrink: 0 !important;
      }

      /* 1. Logo (apprecIAtion) : hauteur 35px */
      header .flex.items-center.select-none {
        padding: 2px 7px !important;
        gap: 5px !important;
        height: 35px !important;
        display: inline-flex !important;
        align-items: center !important;
        flex-shrink: 0 !important;
        box-sizing: border-box !important;
      }
      header img {
        height: 28px !important;
        max-height: 28px !important;
        width: auto !important;
      }

      /* 2. Sélecteur Classe (Bouton de structure 🏫) : hauteur 35px */
      #btn-structure-selector {
        padding: 3px 8px !important;
        font-size: 12px !important;
        gap: 5px !important;
        height: 35px !important;
        white-space: nowrap !important;
        display: inline-flex !important;
        align-items: center !important;
        flex-shrink: 0 !important;
        box-sizing: border-box !important;
      }
      #btn-structure-selector .badge-selection {
        padding: 2px 6px !important;
        font-size: 10.5px !important;
        max-width: 150px !important;
      }

      /* 3. Barre de Navigation Élève (Précédent, Sélecteur, Suivant) : hauteur 35px */
      header .bg-slate-900\\/90,
      header .bg-slate-900 {
        padding: 2px 5px !important;
        gap: 3px !important;
        height: 35px !important;
        display: inline-flex !important;
        align-items: center !important;
        flex-shrink: 0 !important;
        box-sizing: border-box !important;
      }
      header select {
        padding-top: 2px !important;
        padding-bottom: 2px !important;
        padding-left: 6px !important;
        padding-right: 6px !important;
        font-size: 12px !important;
        height: 29px !important;
        min-width: 160px !important;
        box-sizing: border-box !important;
      }
      header button.text-slate-300 {
        padding: 2px 5px !important;
        height: 29px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-sizing: border-box !important;
      }

      /* 4. Groupe Modales (Grille, Items, Prompts) : hauteur 35px */
      header .bg-slate-950\\/60 {
        padding: 2px 4px !important;
        gap: 3px !important;
        height: 35px !important;
        display: inline-flex !important;
        align-items: center !important;
        flex-shrink: 0 !important;
        box-sizing: border-box !important;
      }
      header .bg-slate-950\\/60 button {
        padding: 3px 7px !important;
        font-size: 11.5px !important;
        gap: 3px !important;
        height: 29px !important;
        white-space: nowrap !important;
        display: inline-flex !important;
        align-items: center !important;
        box-sizing: border-box !important;
      }
      header #btn-items-active-name,
      header #btn-prompt-active-name {
        padding: 1px 5px !important;
        font-size: 9.5px !important;
        max-width: 100px !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      /* Conteneur droite : alignement strictement mono-ligne */
      header .flex.items-center.gap-2\\.5,
      header > div > div:last-child {
        display: inline-flex !important;
        align-items: center !important;
        gap: 5px !important;
        flex-wrap: nowrap !important;
        flex-shrink: 0 !important;
        margin-left: auto !important;
      }

      /* 5. Voyant Mistral connecté : hauteur 35px */
      #voyant-mistral {
        padding: 3px 8px !important;
        font-size: 11px !important;
        height: 35px !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 5px !important;
        flex-shrink: 0 !important;
        box-sizing: border-box !important;
      }
      #voyant-mistral span:first-child {
        width: 7.5px !important;
        height: 7.5px !important;
      }

      /* 6. Bouton Debug Auth : hauteur 35px */
      header a[href*="debug.html"] {
        padding: 3px 8px !important;
        font-size: 11.5px !important;
        height: 35px !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
        box-sizing: border-box !important;
      }

      /* 7. Bouton Exporter Classe : hauteur 35px */
      header button.bg-emerald-600 {
        padding: 3px 10px !important;
        font-size: 11.5px !important;
        height: 35px !important;
        display: inline-flex !important;
        align-items: center !important;
        gap: 4px !important;
        white-space: nowrap !important;
        flex-shrink: 0 !important;
        box-sizing: border-box !important;
      }

      /* 8. Choix du thème : hauteur 35px */
      .theme-selector-container,
      #theme-selector-widget {
        padding: 3px 8px !important;
        font-size: 11.5px !important;
        gap: 5px !important;
        height: 35px !important;
        display: inline-flex !important;
        align-items: center !important;
        flex-shrink: 0 !important;
        box-sizing: border-box !important;
      }
      .theme-selector-select {
        font-size: 11.5px !important;
        height: 28px !important;
        padding: 1px 4px !important;
        box-sizing: border-box !important;
      }

      /* ==========================================================================
         THÈME CLAIR (GITHUB LIGHT) : FOND DE PAGE GLOBAL (BLANC ULTRA-LUMINEUX)
         ========================================================================== */
      html[data-theme="github-light"],
      html[data-theme="github-light"] body,
      html[data-theme="github-light"] #root,
      html[data-theme="github-light"] .min-h-screen,
      html[data-theme="github-light"] main {
        background-color: #ffffff !important;
        color: #24292f !important;
      }

      /* ==========================================================================
         THÈME CLAIR : BANDEAU SUPÉRIEUR (HEADER) AVEC BORDURES NETTES
         ========================================================================== */
      html[data-theme="github-light"] header {
        background-color: #ffffff !important;
        border-bottom: 1px solid #cbd5e1 !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
      }

      /* Logo encadré dans un badge sombre propre pour préserver les couleurs d'origine */
      html[data-theme="github-light"] header .flex.items-center.select-none {
        background-color: #0d1422 !important;
        padding: 2px 8px !important;
        border-radius: 8px !important;
        border: 1px solid #1e293b !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15) !important;
      }
      html[data-theme="github-light"] header img {
        filter: none !important;
        opacity: 1 !important;
      }

      /* Conteneur de navigation élève en thème clair */
      html[data-theme="github-light"] header .bg-slate-900\\/90,
      html[data-theme="github-light"] header .bg-slate-900 {
        background-color: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        color: #24292f !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
      }

      html[data-theme="github-light"] header select {
        background-color: transparent !important;
        color: #24292f !important;
        font-weight: 700 !important;
      }
      html[data-theme="github-light"] header select option {
        background-color: #ffffff !important;
        color: #24292f !important;
      }

      html[data-theme="github-light"] header button.text-slate-300 {
        color: #57606a !important;
      }
      html[data-theme="github-light"] header button.text-slate-300:hover {
        background-color: #f3f4f6 !important;
        color: #0969da !important;
      }

      /* Conteneur des boutons de modales (Grille, Items, Prompts) */
      html[data-theme="github-light"] header .bg-slate-950\\/60 {
        background-color: #f8fafc !important;
        border: 1px solid #cbd5e1 !important;
      }

      /* Boutons « Grille », « Items », « Prompts » en STYLE CLAIR */
      html[data-theme="github-light"] header button.bg-slate-900,
      html[data-theme="github-light"] header button.bg-slate-800 {
        background-color: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        color: #24292f !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03) !important;
      }

      html[data-theme="github-light"] header button.bg-slate-900:hover,
      html[data-theme="github-light"] header button.bg-slate-800:hover {
        background-color: #f3f4f6 !important;
        border-color: #0969da !important;
        color: #0969da !important;
      }

      html[data-theme="github-light"] header button span {
        color: #24292f !important;
        font-weight: 600 !important;
      }

      /* Badges noms de fichiers actifs dans les boutons du header */
      html[data-theme="github-light"] header #btn-items-active-name,
      html[data-theme="github-light"] header #btn-prompt-active-name {
        background-color: #f1f5f9 !important;
        border: 1px solid #cbd5e1 !important;
        color: #334155 !important;
        font-weight: 500 !important;
      }

      /* Voyant Mistral dans le header en thème clair */
      html[data-theme="github-light"] header #voyant-mistral.bg-emerald-950\\/40 {
        background-color: #dafbe1 !important;
        border: 1px solid #4ac26b !important;
        color: #1a7f37 !important;
      }
      html[data-theme="github-light"] header #voyant-mistral.bg-rose-950\\/40 {
        background-color: #ffebe9 !important;
        border: 1px solid #ff8182 !important;
        color: #cf222e !important;
      }

      /* ==========================================================================
         THÈME CLAIR : PANNEAUX PRINCIPAUX & CARTES (BORDURES BIEN VISIBLES)
         ========================================================================== */
      html[data-theme="github-light"] main .bg-slate-900,
      html[data-theme="github-light"] main .bg-slate-900\\/90,
      html[data-theme="github-light"] main .bg-slate-900\\/80,
      html[data-theme="github-light"] main .bg-slate-950,
      html[data-theme="github-light"] main .bg-slate-950\\/80,
      html[data-theme="github-light"] main .bg-slate-950\\/60,
      html[data-theme="github-light"] main .bg-slate-950\\/50,
      html[data-theme="github-light"] main .bg-\\[\\#1f2937\\],
      html[data-theme="github-light"] main .bg-\\[\\#1f2937\\]\\/85,
      html[data-theme="github-light"] main .bg-\\[\\#1f2937\\]\\/80,
      html[data-theme="github-light"] main .bg-\\[\\#1e293b\\] {
        background-color: #ffffff !important;
        color: #24292f !important;
        border-color: #cbd5e1 !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05) !important;
      }

      /* Textes & Titres en thème clair */
      html[data-theme="github-light"] main .text-white {
        color: #111827 !important;
      }
      html[data-theme="github-light"] main .text-slate-100,
      html[data-theme="github-light"] main .text-slate-200 {
        color: #1f2937 !important;
      }
      html[data-theme="github-light"] main .text-slate-300,
      html[data-theme="github-light"] main .text-slate-400 {
        color: #4b5563 !important;
      }
      html[data-theme="github-light"] main .text-slate-500 {
        color: #6b7280 !important;
      }

      /* Bordures globales de séparation et de zones en thème clair (Slate-300 visible et élégant) */
      html[data-theme="github-light"] main .border-slate-800,
      html[data-theme="github-light"] main .border-slate-800\\/80,
      html[data-theme="github-light"] main .border-slate-800\\/60,
      html[data-theme="github-light"] main .border-slate-700,
      html[data-theme="github-light"] main .border-slate-700\\/80,
      html[data-theme="github-light"] main .border-slate-700\\/50,
      html[data-theme="github-light"] main .border-slate-600 {
        border-color: #cbd5e1 !important;
      }

      /* Inputs et textareas dans main */
      html[data-theme="github-light"] main input,
      html[data-theme="github-light"] main textarea {
        background-color: #ffffff !important;
        color: #111827 !important;
        border: 1px solid #cbd5e1 !important;
      }
      html[data-theme="github-light"] main input:focus,
      html[data-theme="github-light"] main textarea:focus {
        border-color: #0969da !important;
        box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.15) !important;
      }

      /* ==========================================================================
         CARTE APPRÉCIATION DU SEMESTRE PRÉCÉDENT & NOTES
         ========================================================================== */
      /* Carte Semestre précédent */
      html[data-theme="github-light"] main .border-l-\\[\\#6366f1\\] {
        background-color: #f8fafc !important;
        border: 1px solid #cbd5e1 !important;
        border-left: 4px solid #4f46e5 !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
      }

      /* Titre "📜 Semestre Précédent" */
      html[data-theme="github-light"] main .border-l-\\[\\#6366f1\\] .text-\\[\\#a5b4fc\\],
      html[data-theme="github-light"] main .text-\\[\\#a5b4fc\\] {
        color: #4338ca !important;
      }

      /* Texte de l'appréciation du semestre précédent : GRIS FONCÉ / NOIR */
      html[data-theme="github-light"] main .border-l-\\[\\#6366f1\\] .text-\\[\\#f3f4f6\\],
      html[data-theme="github-light"] main .border-l-\\[\\#6366f1\\] .italic,
      html[data-theme="github-light"] main .border-l-\\[\\#6366f1\\] div,
      html[data-theme="github-light"] main .text-\\[\\#f3f4f6\\],
      html[data-theme="github-light"] .text-\\[\\#f3f4f6\\] {
        color: #1e293b !important;
      }

      /* Carte Note Actuelle */
      html[data-theme="github-light"] main .border-l-\\[\\#10b981\\] {
        background-color: #f8fafc !important;
        border: 1px solid #cbd5e1 !important;
        border-left: 4px solid #16a34a !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
      }

      /* Titre "📈 Actuelle" */
      html[data-theme="github-light"] main .border-l-\\[\\#10b981\\] .text-\\[\\#6ee7b7\\],
      html[data-theme="github-light"] main .text-\\[\\#6ee7b7\\] {
        color: #047857 !important;
      }

      /* ==========================================================================
         CARTE APPRÉCIATION FINALE ACTIVE POUR LE BULLETIN
         ========================================================================== */
      /* Conteneur principal de l'appréciation finale : fond blanc + bordure indigo bien définie */
      html[data-theme="github-light"] main .bg-gradient-to-b.from-slate-900.to-slate-950,
      html[data-theme="github-light"] main .border-indigo-500\\/60 {
        background-image: none !important;
        background-color: #ffffff !important;
        border: 2px solid #818cf8 !important;
        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.1) !important;
      }

      /* En-tête de l'appréciation finale */
      html[data-theme="github-light"] main .border-indigo-500\\/60 .border-b,
      html[data-theme="github-light"] main .border-indigo-500\\/60 .border-slate-800 {
        border-bottom: 1px solid #cbd5e1 !important;
      }

      html[data-theme="github-light"] main .border-indigo-500\\/60 h3,
      html[data-theme="github-light"] main .border-indigo-500\\/60 .text-white {
        color: #0f172a !important;
      }

      html[data-theme="github-light"] main .border-indigo-500\\/60 .text-indigo-400 {
        color: #4f46e5 !important;
      }

      /* Badge nombre de caractères / mots */
      html[data-theme="github-light"] main .border-indigo-500\\/60 .bg-indigo-950,
      html[data-theme="github-light"] main .bg-indigo-950 {
        background-color: #eef2ff !important;
        border: 1px solid #a5b4fc !important;
        color: #3730a3 !important;
      }

      /* Zone de texte (Textarea) de l'appréciation finale */
      html[data-theme="github-light"] main .border-indigo-500\\/60 textarea,
      html[data-theme="github-light"] main textarea.bg-slate-950 {
        background-color: #f8fafc !important;
        color: #0f172a !important;
        border: 1.5px solid #cbd5e1 !important;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04) !important;
      }

      html[data-theme="github-light"] main .border-indigo-500\\/60 textarea:focus,
      html[data-theme="github-light"] main textarea.bg-slate-950:focus {
        background-color: #ffffff !important;
        border-color: #4f46e5 !important;
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15) !important;
      }

      /* Variantes 1, 2, 3 générées par l'IA : Bordures bien marquées */
      html[data-theme="github-light"] main .grid > div {
        border: 1px solid #cbd5e1 !important;
      }
      html[data-theme="github-light"] main .grid textarea.bg-slate-950 {
        background-color: #f8fafc !important;
        color: #0f172a !important;
        border: 1px solid #cbd5e1 !important;
      }
      html[data-theme="github-light"] main .grid textarea.bg-slate-950:focus {
        background-color: #ffffff !important;
        border-color: #0969da !important;
      }

      /* Boutons de copie secondaires (dans les variantes et ailleurs) */
      html[data-theme="github-light"] main button.bg-slate-800 {
        background-color: #f1f5f9 !important;
        border: 1px solid #cbd5e1 !important;
        color: #334155 !important;
      }
      html[data-theme="github-light"] main button.bg-slate-800:hover {
        background-color: #e2e8f0 !important;
        border-color: #94a3b8 !important;
        color: #0f172a !important;
      }

      /* ==========================================================================
         GRILLE DE CRITÈRES PÉDAGOGIQUES (COLONNES & BOUTONS ACTIFS / INACTIFS)
         ========================================================================== */
      /* Cartes colonnes de critères */
      html[data-theme="github-light"] main .bg-slate-950.border.rounded-xl {
        background-color: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04) !important;
      }

      /* En-tête des colonnes de critères */
      html[data-theme="github-light"] main .bg-slate-950.border.rounded-xl .border-b {
        border-bottom: 1px solid #cbd5e1 !important;
      }

      /* Boutons de critères INACTIFS : Fond blanc/très clair, bordure slate-300 visible */
      html[data-theme="github-light"] main button.bg-slate-900\\/90,
      html[data-theme="github-light"] main button.bg-slate-900 {
        background-color: #f8fafc !important;
        border: 1px solid #cbd5e1 !important;
        color: #1f2937 !important;
      }
      html[data-theme="github-light"] main button.bg-slate-900\\/90:hover,
      html[data-theme="github-light"] main button.bg-slate-900:hover {
        background-color: #eff6ff !important;
        border-color: #0969da !important;
        color: #0969da !important;
      }

      /* Boutons de critères SÉLECTIONNÉS ACTIFS */
      html[data-theme="github-light"] main button.bg-emerald-600,
      html[data-theme="github-light"] button.bg-emerald-600 {
        background-color: #16a34a !important;
        border: 1px solid #15803d !important;
        color: #ffffff !important;
        box-shadow: 0 2px 6px rgba(22, 163, 74, 0.25) !important;
        font-weight: 600 !important;
      }

      /* Résumé "Sélection active :" sous la grille */
      html[data-theme="github-light"] main .bg-indigo-950\\/80 {
        background-color: #f0fdf4 !important;
        border: 1px solid #86efac !important;
        color: #166534 !important;
      }
      html[data-theme="github-light"] main .bg-indigo-950\\/80 strong {
        color: #14532d !important;
      }

      /* Boutons Tonalités & Styles (Actifs = Bleu GitHub, Inactifs = Neutre avec bordure visible) */
      html[data-theme="github-light"] main button.bg-indigo-600,
      html[data-theme="github-light"] main button.bg-blue-600 {
        background-color: #0969da !important;
        border: 1px solid #0550ae !important;
        color: #ffffff !important;
      }

      /* ==========================================================================
         MODALES (GRILLE, ITEMS, PROMPTS) EN THÈME CLAIR
         ========================================================================== */
      /* Conteneur principal de la modale */
      html[data-theme="github-light"] .fixed.inset-0 .bg-slate-900,
      html[data-theme="github-light"] .fixed.inset-0 .bg-slate-950 {
        background-color: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        color: #1f2937 !important;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1) !important;
      }

      html[data-theme="github-light"] .fixed.inset-0 h3 {
        color: #111827 !important;
      }

      /* Barre de sélection de fichier dans les modales */
      html[data-theme="github-light"] .fixed.inset-0 .bg-slate-950\\/80 {
        background-color: #f8fafc !important;
        border: 1px solid #cbd5e1 !important;
      }
      html[data-theme="github-light"] .fixed.inset-0 select {
        background-color: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        color: #1f2937 !important;
      }

      /* ==========================================================================
         MODALE ITEMS (COLONNE 2) : FEEDBACK VERT CLAIR & DISTINCT
         ========================================================================== */
      html[data-theme="github-light"] #items-list {
        background-color: #ffffff !important;
      }

      /* Ligne d'item NON sélectionnée : Fond blanc, bordure nette */
      html[data-theme="github-light"] #items-list > div:not(.bg-emerald-600):not([data-active="1"]) {
        background-color: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        color: #1f2937 !important;
      }
      html[data-theme="github-light"] #items-list > div:not(.bg-emerald-600):not([data-active="1"]) span.text-blue-400 {
        color: #0969da !important;
        font-weight: 700 !important;
      }
      html[data-theme="github-light"] #items-list > div:not(.bg-emerald-600):not([data-active="1"]) span.bg-slate-950\\/80 {
        background-color: #f8fafc !important;
        border: 1px solid #cbd5e1 !important;
        color: #4b5563 !important;
      }

      /* Ligne d'item SÉLECTIONNÉE (VERT NET & ÉCLATANT) */
      html[data-theme="github-light"] #items-list > div.bg-emerald-600,
      html[data-theme="github-light"] #items-list > div[data-active="1"] {
        background-color: #16a34a !important;
        border: 1px solid #15803d !important;
        color: #ffffff !important;
        box-shadow: 0 2px 8px rgba(22, 163, 74, 0.25) !important;
      }
      html[data-theme="github-light"] #items-list > div.bg-emerald-600 span,
      html[data-theme="github-light"] #items-list > div[data-active="1"] span {
        color: #ffffff !important;
      }
      html[data-theme="github-light"] #items-list > div.bg-emerald-600 span.bg-slate-950\\/80,
      html[data-theme="github-light"] #items-list > div[data-active="1"] span.bg-slate-950\\/80 {
        background-color: rgba(255, 255, 255, 0.22) !important;
        border: 1px solid rgba(255, 255, 255, 0.4) !important;
        color: #ffffff !important;
      }
      html[data-theme="github-light"] #items-list > div.bg-emerald-600 span.bg-emerald-800,
      html[data-theme="github-light"] #items-list > div[data-active="1"] span.bg-emerald-800 {
        background-color: #15803d !important;
        border: 1px solid #166534 !important;
        color: #ffffff !important;
      }

      /* Footer des modales */
      html[data-theme="github-light"] .fixed.inset-0 .border-t {
        border-top: 1px solid #cbd5e1 !important;
        background-color: #f8fafc !important;
      }

      /* ==========================================================================
         WIDGET DU SÉLECTEUR DE THÈMES (DANS LE HEADER)
         ========================================================================== */
      .theme-selector-container {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #1e293b;
        border: 1px solid #334155;
        padding: 4px 8px;
        border-radius: 8px;
        font-family: inherit;
        font-size: 12px;
        color: #f8fafc;
        transition: all 0.2s ease;
        user-select: none;
      }

      html[data-theme="github-light"] .theme-selector-container {
        background-color: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        color: #24292f !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03) !important;
      }

      .theme-selector-select {
        background: transparent;
        border: none;
        outline: none;
        color: inherit;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 4px;
      }

      .theme-selector-select option {
        background-color: #0f172a;
        color: #f8fafc;
      }
      html[data-theme="github-light"] .theme-selector-select option {
        background-color: #ffffff;
        color: #24292f;
      }
    `;
  }

  function applyTheme(themeId) {
    const validTheme = THEMES.find((t) => t.id === themeId) ? themeId : "default";
    
    if (validTheme === "default") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", validTheme);
    }

    try {
      localStorage.setItem(STORAGE_KEY, validTheme);
    } catch (e) {
      console.warn("Could not save theme preference:", e);
    }

    const selects = document.querySelectorAll(".theme-selector-select");
    selects.forEach((select) => {
      select.value = validTheme;
    });

    window.dispatchEvent(new CustomEvent("theme_changed", { detail: { theme: validTheme } }));
  }

  function getActiveTheme() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && THEMES.find((t) => t.id === saved)) {
        return saved;
      }
    } catch (e) {}
    return "default";
  }

  function createThemeSelectorElement() {
    const container = document.createElement("div");
    container.className = "theme-selector-container";
    container.id = "theme-selector-widget";
    container.title = "Changer les couleurs de l'interface";

    container.innerHTML = `
      <span style="font-size: 13px; line-height: 1;">🎨</span>
      <select class="theme-selector-select" aria-label="Thème des couleurs de l'interface" id="theme-selector-dropdown">
        ${THEMES.map((t) => `<option value="${t.id}">${t.name}</option>`).join("")}
      </select>
    `;

    const select = container.querySelector(".theme-selector-select");
    select.value = getActiveTheme();

    select.addEventListener("change", (e) => {
      applyTheme(e.target.value);
    });

    return container;
  }

  function reconcileHeaderOrder() {
    const header = document.querySelector("header");
    if (!header) return;

    const headerContainer = header.querySelector(".flex.justify-between, .flex-wrap, .max-w-\\[1700px\\]") || header;
    if (!headerContainer) return;

    // 1. Identifier le Logo (1ère position)
    const logoDiv = headerContainer.querySelector(".flex.items-center.select-none") || headerContainer.querySelector("img")?.closest("div");

    // 2. Identifier ou repositionner le bouton Classe (2ème position, immédiatement après le Logo)
    const btnClasse = document.getElementById("btn-structure-selector");
    if (btnClasse && logoDiv && btnClasse.parentNode === headerContainer) {
      if (logoDiv.nextSibling !== btnClasse) {
        headerContainer.insertBefore(btnClasse, logoDiv.nextSibling);
      }
    }

    // 3. Identifier la section droite (Mistral, Debug, Exporter, Thème)
    const rightSection = headerContainer.querySelector(".flex.items-center.gap-2\\.5") || headerContainer.querySelector("div:last-child");

    // 4. Assurer que le sélecteur de thème est présent et en 8ème position (à la fin de la section droite)
    let themeWidget = document.getElementById("theme-selector-widget");
    if (!themeWidget) {
      themeWidget = createThemeSelectorElement();
    }

    if (rightSection && rightSection !== headerContainer) {
      if (themeWidget.parentNode !== rightSection || rightSection.lastElementChild !== themeWidget) {
        rightSection.appendChild(themeWidget);
      }
    } else {
      if (themeWidget.parentNode !== headerContainer || headerContainer.lastElementChild !== themeWidget) {
        headerContainer.appendChild(themeWidget);
      }
    }
  }

  function mountThemeSelector() {
    const header = document.querySelector("header");
    if (header) {
      reconcileHeaderOrder();
      return;
    }

    let floatingContainer = document.getElementById("theme-selector-floating-wrapper");
    if (!floatingContainer && !document.getElementById("theme-selector-widget")) {
      floatingContainer = document.createElement("div");
      floatingContainer.id = "theme-selector-floating-wrapper";
      floatingContainer.style.cssText = "position: fixed; top: 12px; right: 16px; z-index: 99999;";
      const widget = createThemeSelectorElement();
      floatingContainer.appendChild(widget);
      document.body.appendChild(floatingContainer);
    }
  }

  function init() {
    injectThemeStyles();
    const activeTheme = getActiveTheme();
    applyTheme(activeTheme);

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        mountThemeSelector();
        setTimeout(reconcileHeaderOrder, 200);
        setTimeout(reconcileHeaderOrder, 600);
        setTimeout(reconcileHeaderOrder, 1500);
      });
    } else {
      mountThemeSelector();
      setTimeout(reconcileHeaderOrder, 200);
      setTimeout(reconcileHeaderOrder, 600);
      setTimeout(reconcileHeaderOrder, 1500);
    }

    const observer = new MutationObserver(() => {
      const header = document.querySelector("header");
      const floating = document.getElementById("theme-selector-floating-wrapper");
      if (header && floating) {
        floating.remove();
      }
      if (header) {
        reconcileHeaderOrder();
      }
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  window.appreciAIAThemeManager = {
    setTheme: applyTheme,
    getTheme: getActiveTheme,
    themes: THEMES
  };

  init();
})();
