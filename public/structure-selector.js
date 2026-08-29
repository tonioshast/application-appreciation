/**
 * structure-selector.js
 * Module autonome de configuration et sélection de la structure pédagogique
 * (Classe -> Période -> Matière) sous forme de modale / boîte de dialogue.
 * Compatible avec les thèmes Sombre et Clair (GitHub Light).
 */

(function () {
  const STORAGE_KEY_TICKET = "apprecIAtion_ticket_data";
  const STORAGE_KEY_SELECTION = "apprecIAtion_current_selection";

  // État interne du module
  let ticketData = null;
  let flatStructure = []; // Liste aplatie des classes avec leurs périodes et matières
  let currentSelection = {
    classe: null,   // { id_classe, libelle, code }
    periode: null,  // { id_periode, codePeriode, libelle }
    matiere: null   // { id_matiere, code_matiere, libelle }
  };

  /**
   * Parse et aplatit la structure JSON du ticket pour une navigation aisée
   */
  function parseStructure(data) {
    if (!data) return [];
    
    // Si la structure est encapsulée ou directe
    const rootStructure = data.structure || data;
    const etablissements = rootStructure.etablissements || [];
    const result = [];

    etablissements.forEach((etab) => {
      const etabLibelle = etab.libelle || "Établissement";
      (etab.niveaux || []).forEach((niv) => {
        const niveauLibelle = niv.libelle || "";
        (niv.classes || []).forEach((cl) => {
          result.push({
            id_classe: cl.id_classe,
            code: cl.code || "",
            libelle: cl.libelle || `Classe ${cl.id_classe}`,
            niveau: niveauLibelle,
            etablissement: etabLibelle,
            periodes: (cl.periodes || []).map((p) => ({
              id_periode: p.id_periode,
              codePeriode: p.codePeriode || "",
              libelle: p.libelle || `Période ${p.id_periode}`,
              matieres: (p.matieres || []).map((m) => ({
                id_matiere: String(m.id_matiere),
                code_matiere: m.code_matiere || "",
                libelle: m.libelle || `Matière ${m.id_matiere}`
              }))
            }))
          });
        });
      });
    });

    return result;
  }

  /**
   * Charge le ticket depuis le localStorage ou via l'événement d'auth
   */
  function loadTicketFromStorage() {
    try {
      const savedTicket = localStorage.getItem(STORAGE_KEY_TICKET);
      if (savedTicket) {
        ticketData = JSON.parse(savedTicket);
        flatStructure = parseStructure(ticketData);
        return;
      }

      // Essayer auth_last_response si présent
      const lastAuth = localStorage.getItem("auth_last_response");
      if (lastAuth) {
        const parsed = JSON.parse(lastAuth);
        if (parsed && (parsed.structure || parsed.allowed)) {
          ticketData = parsed;
          flatStructure = parseStructure(ticketData);
          return;
        }
      }
    } catch (e) {
      console.warn("⚠️ [structure-selector] Impossible de parser le ticket stocké:", e);
    }
  }

  /**
   * Sauvegarde la sélection active dans le localStorage et notifie l'application
   */
  function saveCurrentSelection() {
    try {
      localStorage.setItem(STORAGE_KEY_SELECTION, JSON.stringify(currentSelection));
    } catch (e) {}

    updateTriggerButtonBadge();

    // Résolution robuste des identifiants de session EcoleDirecte
    const resolvedEdToken = ticketData?.ed_token || ticketData?.token || localStorage.getItem('pb_token') || null;
    const resolvedIdCompte = ticketData?.id_compte || ticketData?.ed_user_id || (ticketData?.record && ticketData.record.ed_user_id) || localStorage.getItem('ed_user_id') || null;

    // Émission de l'événement personnalisé pour l'application
    const detailPayload = {
      selection: currentSelection,
      classe: currentSelection.classe,
      periode: currentSelection.periode,
      matiere: currentSelection.matiere,
      ed_token: resolvedEdToken,
      token: resolvedEdToken,
      id_compte: resolvedIdCompte,
      cle_api_mistral: ticketData?.cle_api_mistral || localStorage.getItem('mistral_api_key') || null,
      expiration: ticketData?.expiration || null
    };

    window.dispatchEvent(new CustomEvent("structure_selection_changed", {
      detail: detailPayload
    }));

    console.log("🎯 [structure-selector] Sélection validée :", detailPayload);
  }

  /**
   * Restaure la dernière sélection connue
   */
  function restoreSavedSelection() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SELECTION);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.classe) {
          currentSelection = parsed;
          updateTriggerButtonBadge();
        }
      }
    } catch (e) {}
  }

  /**
   * Injection des styles CSS de la modale
   */
  function injectStyles() {
    const styleId = "structure-selector-styles";
    if (document.getElementById(styleId)) return;

    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      /* Bouton d'ouverture dans le header */
      #btn-structure-selector {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: #1e293b;
        border: 1px solid #334155;
        color: #f8fafc;
        padding: 5px 10px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        user-select: none;
      }
      #btn-structure-selector:hover {
        background: #334155;
        border-color: #60a5fa;
        color: #60a5fa;
      }
      #btn-structure-selector .badge-selection {
        background: #0f172a;
        color: #93c5fd;
        border: 1px solid #1e3a8a;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 500;
        max-width: 220px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      /* Thème clair pour le bouton du header */
      html[data-theme="github-light"] #btn-structure-selector {
        background: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        color: #24292f !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04) !important;
      }
      html[data-theme="github-light"] #btn-structure-selector:hover {
        background: #f3f4f6 !important;
        border-color: #0969da !important;
        color: #0969da !important;
      }
      html[data-theme="github-light"] #btn-structure-selector .badge-selection {
        background: #eff6ff !important;
        color: #1d4ed8 !important;
        border: 1px solid #bfdbfe !important;
      }

      /* Fond de la modale */
      #modal-structure-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.75);
        backdrop-filter: blur(4px);
        z-index: 999999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 16px;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0.2s ease;
      }
      #modal-structure-backdrop.active {
        opacity: 1;
        visibility: visible;
      }

      /* Fenêtre de la modale */
      #modal-structure-container {
        width: 100%;
        max-width: 520px;
        background: #0f172a;
        border: 1px solid #334155;
        border-radius: 16px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transform: scale(0.95);
        transition: transform 0.2s ease;
        color: #f8fafc;
        font-family: inherit;
      }
      #modal-structure-backdrop.active #modal-structure-container {
        transform: scale(1);
      }

      /* En-tête de la modale */
      .structure-modal-header {
        padding: 16px 20px;
        background: #1e293b;
        border-bottom: 1px solid #334155;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .structure-modal-header h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #f8fafc;
      }
      .structure-modal-close {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
        padding: 4px 8px;
        border-radius: 6px;
        transition: all 0.15s;
      }
      .structure-modal-close:hover {
        background: #334155;
        color: #ffffff;
      }

      /* Corps de la modale */
      .structure-modal-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .structure-field-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .structure-field-label {
        font-size: 13px;
        font-weight: 600;
        color: #cbd5e1;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .structure-field-label .step-num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        background: #1e293b;
        border: 1px solid #475569;
        border-radius: 50%;
        font-size: 11px;
        color: #60a5fa;
        margin-right: 6px;
      }

      /* Sélecteurs stylisés */
      .structure-select {
        width: 100%;
        padding: 10px 12px;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 8px;
        color: #f8fafc;
        font-size: 13px;
        font-weight: 500;
        outline: none;
        transition: all 0.15s ease;
        cursor: pointer;
      }
      .structure-select:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
      }
      .structure-select:disabled {
        background: #090d16;
        border-color: #1e293b;
        color: #64748b;
        cursor: not-allowed;
        opacity: 0.7;
      }
      .structure-select option {
        background: #0f172a;
        color: #f8fafc;
        padding: 8px;
      }

      /* Résumé visuel du choix */
      .structure-summary-card {
        background: rgba(30, 41, 59, 0.5);
        border: 1px solid #334155;
        border-radius: 10px;
        padding: 12px 14px;
        font-size: 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .structure-summary-title {
        font-weight: 700;
        color: #94a3b8;
        text-transform: uppercase;
        font-size: 10px;
        letter-spacing: 0.5px;
      }
      .structure-summary-content {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .structure-chip {
        padding: 3px 8px;
        border-radius: 4px;
        background: #1e293b;
        border: 1px solid #334155;
        color: #e2e8f0;
        font-weight: 600;
      }
      .structure-chip.highlight {
        background: #0284c7;
        border-color: #38bdf8;
        color: #ffffff;
      }

      /* Pied de page de la modale */
      .structure-modal-footer {
        padding: 14px 20px;
        background: #1e293b;
        border-top: 1px solid #334155;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
      }
      .btn-structure-cancel {
        padding: 8px 14px;
        background: transparent;
        border: 1px solid #475569;
        color: #cbd5e1;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }
      .btn-structure-cancel:hover {
        background: #334155;
        color: #ffffff;
      }
      .btn-structure-apply {
        padding: 8px 18px;
        background: #10b981;
        border: 1px solid #059669;
        color: #ffffff;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s;
        box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
      }
      .btn-structure-apply:hover:not(:disabled) {
        background: #059669;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
      }
      .btn-structure-apply:disabled {
        background: #334155;
        border-color: #475569;
        color: #94a3b8;
        cursor: not-allowed;
        box-shadow: none;
        opacity: 0.6;
      }

      /* ==========================================================================
         THÈME CLAIR (GITHUB LIGHT) POUR LA MODALE
         ========================================================================== */
      html[data-theme="github-light"] #modal-structure-container {
        background: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        color: #24292f !important;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15) !important;
      }
      html[data-theme="github-light"] .structure-modal-header {
        background: #f8fafc !important;
        border-bottom: 1px solid #cbd5e1 !important;
      }
      html[data-theme="github-light"] .structure-modal-header h3 {
        color: #0f172a !important;
      }
      html[data-theme="github-light"] .structure-modal-close {
        color: #64748b !important;
      }
      html[data-theme="github-light"] .structure-modal-close:hover {
        background: #f1f5f9 !important;
        color: #0f172a !important;
      }
      html[data-theme="github-light"] .structure-field-label {
        color: #334155 !important;
      }
      html[data-theme="github-light"] .structure-field-label .step-num {
        background: #f1f5f9 !important;
        border-color: #cbd5e1 !important;
        color: #0969da !important;
      }
      html[data-theme="github-light"] .structure-select {
        background: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        color: #0f172a !important;
      }
      html[data-theme="github-light"] .structure-select:focus {
        border-color: #0969da !important;
        box-shadow: 0 0 0 3px rgba(9, 105, 218, 0.15) !important;
      }
      html[data-theme="github-light"] .structure-select:disabled {
        background: #f8fafc !important;
        border-color: #e2e8f0 !important;
        color: #94a3b8 !important;
      }
      html[data-theme="github-light"] .structure-select option {
        background: #ffffff !important;
        color: #0f172a !important;
      }
      html[data-theme="github-light"] .structure-summary-card {
        background: #f8fafc !important;
        border: 1px solid #cbd5e1 !important;
      }
      html[data-theme="github-light"] .structure-chip {
        background: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        color: #334155 !important;
      }
      html[data-theme="github-light"] .structure-chip.highlight {
        background: #0969da !important;
        border-color: #0550ae !important;
        color: #ffffff !important;
      }
      html[data-theme="github-light"] .structure-modal-footer {
        background: #f8fafc !important;
        border-top: 1px solid #cbd5e1 !important;
      }
      html[data-theme="github-light"] .btn-structure-cancel {
        border-color: #cbd5e1 !important;
        color: #475569 !important;
      }
      html[data-theme="github-light"] .btn-structure-cancel:hover {
        background: #e2e8f0 !important;
        color: #0f172a !important;
      }
      html[data-theme="github-light"] .btn-structure-apply {
        background: #16a34a !important;
        border-color: #15803d !important;
      }
      html[data-theme="github-light"] .btn-structure-apply:hover:not(:disabled) {
        background: #15803d !important;
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Crée et injecte la modale dans le DOM
   */
  function createModalDOM() {
    if (document.getElementById("modal-structure-backdrop")) return;

    const backdrop = document.createElement("div");
    backdrop.id = "modal-structure-backdrop";

    backdrop.innerHTML = `
      <div id="modal-structure-container" role="dialog" aria-labelledby="modal-structure-title" aria-modal="true">
        <div class="structure-modal-header">
          <h3 id="modal-structure-title">
            <span>🏫</span> Configuration Classe & Matière
          </h3>
          <button type="button" class="structure-modal-close" id="btn-close-structure-modal" title="Fermer">✕</button>
        </div>

        <div class="structure-modal-body">
          <!-- 1. Sélection de la Classe -->
          <div class="structure-field-group">
            <label class="structure-field-label" for="select-structure-classe">
              <span><span class="step-num">1</span> Classe</span>
              <span id="label-classe-count" style="font-size: 11px; color: #94a3b8;"></span>
            </label>
            <select id="select-structure-classe" class="structure-select">
              <option value="">-- Sélectionner une classe --</option>
            </select>
          </div>

          <!-- 2. Sélection de la Période -->
          <div class="structure-field-group">
            <label class="structure-field-label" for="select-structure-periode">
              <span><span class="step-num">2</span> Période</span>
              <span id="label-periode-info" style="font-size: 11px; color: #94a3b8;"></span>
            </label>
            <select id="select-structure-periode" class="structure-select" disabled>
              <option value="">-- Sélectionner d'abord une classe --</option>
            </select>
          </div>

          <!-- 3. Sélection de la Matière -->
          <div class="structure-field-group">
            <label class="structure-field-label" for="select-structure-matiere">
              <span><span class="step-num">3</span> Matière</span>
              <span id="label-matiere-info" style="font-size: 11px; color: #94a3b8;"></span>
            </label>
            <select id="select-structure-matiere" class="structure-select" disabled>
              <option value="">-- Sélectionner d'abord une période --</option>
            </select>
          </div>

          <!-- Carte de résumé -->
          <div class="structure-summary-card" id="structure-summary-card">
            <div class="structure-summary-title">Sélection en cours</div>
            <div class="structure-summary-content" id="structure-summary-chips">
              <span class="structure-chip">Aucune classe choisie</span>
            </div>
          </div>
        </div>

        <div class="structure-modal-footer">
          <button type="button" class="btn-structure-cancel" id="btn-cancel-structure">Annuler</button>
          <button type="button" class="btn-structure-apply" id="btn-apply-structure" disabled>Valider la sélection</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);

    // Événements de fermeture
    document.getElementById("btn-close-structure-modal").addEventListener("click", closeModal);
    document.getElementById("btn-cancel-structure").addEventListener("click", closeModal);
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });

    // Événements de changement sur les 3 selects (Cascade)
    const selectClasse = document.getElementById("select-structure-classe");
    const selectPeriode = document.getElementById("select-structure-periode");
    const selectMatiere = document.getElementById("select-structure-matiere");
    const btnApply = document.getElementById("btn-apply-structure");

    selectClasse.addEventListener("change", () => {
      onClasseChanged(selectClasse.value);
    });

    selectPeriode.addEventListener("change", () => {
      onPeriodeChanged(selectPeriode.value);
    });

    selectMatiere.addEventListener("change", () => {
      onMatiereChanged(selectMatiere.value);
    });

    btnApply.addEventListener("click", () => {
      saveCurrentSelection();
      closeModal();
    });
  }

  /**
   * Met à jour les options de la liste des classes
   */
  function populateClassesDropdown(preselectedClasseId = null) {
    const selectClasse = document.getElementById("select-structure-classe");
    const labelCount = document.getElementById("label-classe-count");
    if (!selectClasse) return;

    selectClasse.innerHTML = `<option value="">-- Sélectionner une classe --</option>`;

    if (!flatStructure || flatStructure.length === 0) {
      selectClasse.innerHTML = `<option value="">-- Aucune classe disponible dans le ticket --</option>`;
      if (labelCount) labelCount.textContent = "(0 classe)";
      return;
    }

    if (labelCount) labelCount.textContent = `(${flatStructure.length} classes)`;

    // Regrouper par niveau pour un affichage propre
    const classesByNiveau = {};
    flatStructure.forEach((c) => {
      const niv = c.niveau || "Autres";
      if (!classesByNiveau[niv]) classesByNiveau[niv] = [];
      classesByNiveau[niv].push(c);
    });

    Object.entries(classesByNiveau).forEach(([niveau, classes]) => {
      const optGroup = document.createElement("optgroup");
      optGroup.label = niveau;
      classes.forEach((c) => {
        const opt = document.createElement("option");
        opt.value = c.id_classe;
        opt.textContent = `${c.libelle} (${c.code || c.libelle})`;
        if (preselectedClasseId && String(c.id_classe) === String(preselectedClasseId)) {
          opt.selected = true;
        }
        optGroup.appendChild(opt);
      });
      selectClasse.appendChild(optGroup);
    });
  }

  /**
   * Gestionnaire de changement de classe
   */
  function onClasseChanged(selectedId, preselectedPeriodeCode = null) {
    const selectPeriode = document.getElementById("select-structure-periode");
    const selectMatiere = document.getElementById("select-structure-matiere");
    const btnApply = document.getElementById("btn-apply-structure");

    // Réinitialisation aval
    selectPeriode.innerHTML = `<option value="">-- Sélectionner une période --</option>`;
    selectMatiere.innerHTML = `<option value="">-- Sélectionner d'abord une période --</option>`;
    selectMatiere.disabled = true;
    btnApply.disabled = true;

    if (!selectedId) {
      selectPeriode.disabled = true;
      currentSelection.classe = null;
      currentSelection.periode = null;
      currentSelection.matiere = null;
      renderSummaryChips();
      return;
    }

    const classeObj = flatStructure.find((c) => String(c.id_classe) === String(selectedId));
    if (!classeObj) return;

    currentSelection.classe = {
      id_classe: classeObj.id_classe,
      libelle: classeObj.libelle,
      code: classeObj.code,
      niveau: classeObj.niveau,
      etablissement: classeObj.etablissement
    };
    currentSelection.periode = null;
    currentSelection.matiere = null;

    // Remplissage des périodes
    selectPeriode.disabled = false;
    classeObj.periodes.forEach((p) => {
      const opt = document.createElement("option");
      opt.value = p.codePeriode || p.id_periode;
      opt.textContent = p.libelle;
      if (preselectedPeriodeCode && (p.codePeriode === preselectedPeriodeCode || String(p.id_periode) === String(preselectedPeriodeCode))) {
        opt.selected = true;
      }
      selectPeriode.appendChild(opt);
    });

    renderSummaryChips();

    if (preselectedPeriodeCode) {
      onPeriodeChanged(preselectedPeriodeCode);
    }
  }

  /**
   * Gestionnaire de changement de période
   */
  function onPeriodeChanged(selectedCode, preselectedMatiereId = null) {
    const selectClasse = document.getElementById("select-structure-classe");
    const selectPeriode = document.getElementById("select-structure-periode");
    const selectMatiere = document.getElementById("select-structure-matiere");
    const btnApply = document.getElementById("btn-apply-structure");

    selectMatiere.innerHTML = `<option value="">-- Sélectionner une matière --</option>`;
    btnApply.disabled = true;

    if (!selectedCode || !currentSelection.classe) {
      selectMatiere.disabled = true;
      currentSelection.periode = null;
      currentSelection.matiere = null;
      renderSummaryChips();
      return;
    }

    const classeObj = flatStructure.find((c) => String(c.id_classe) === String(currentSelection.classe.id_classe));
    if (!classeObj) return;

    const periodeObj = classeObj.periodes.find((p) => (p.codePeriode === selectedCode || String(p.id_periode) === String(selectedCode)));
    if (!periodeObj) return;

    currentSelection.periode = {
      id_periode: periodeObj.id_periode,
      codePeriode: periodeObj.codePeriode,
      libelle: periodeObj.libelle
    };
    currentSelection.matiere = null;

    // Remplissage des matières
    selectMatiere.disabled = false;
    periodeObj.matieres.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id_matiere;
      opt.textContent = `${m.libelle} (${m.code_matiere})`;
      if (preselectedMatiereId && String(m.id_matiere) === String(preselectedMatiereId)) {
        opt.selected = true;
      }
      selectMatiere.appendChild(opt);
    });

    // Sélection automatique si 1 seule matière
    if (periodeObj.matieres.length === 1) {
      selectMatiere.value = periodeObj.matieres[0].id_matiere;
      onMatiereChanged(periodeObj.matieres[0].id_matiere);
    } else if (preselectedMatiereId) {
      onMatiereChanged(preselectedMatiereId);
    } else {
      renderSummaryChips();
    }
  }

  /**
   * Gestionnaire de changement de matière
   */
  function onMatiereChanged(selectedMatiereId) {
    const btnApply = document.getElementById("btn-apply-structure");

    if (!selectedMatiereId || !currentSelection.classe || !currentSelection.periode) {
      currentSelection.matiere = null;
      btnApply.disabled = true;
      renderSummaryChips();
      return;
    }

    const classeObj = flatStructure.find((c) => String(c.id_classe) === String(currentSelection.classe.id_classe));
    const periodeObj = classeObj?.periodes.find((p) => (p.codePeriode === currentSelection.periode.codePeriode || String(p.id_periode) === String(currentSelection.periode.id_periode)));
    const matiereObj = periodeObj?.matieres.find((m) => String(m.id_matiere) === String(selectedMatiereId));

    if (!matiereObj) {
      currentSelection.matiere = null;
      btnApply.disabled = true;
      renderSummaryChips();
      return;
    }

    currentSelection.matiere = {
      id_matiere: matiereObj.id_matiere,
      code_matiere: matiereObj.code_matiere,
      libelle: matiereObj.libelle
    };

    btnApply.disabled = false;
    renderSummaryChips();
  }

  /**
   * Rendu des badges du résumé de sélection dans la modale
   */
  function renderSummaryChips() {
    const container = document.getElementById("structure-summary-chips");
    if (!container) return;

    container.innerHTML = "";

    if (!currentSelection.classe) {
      container.innerHTML = `<span class="structure-chip">Aucune classe choisie</span>`;
      return;
    }

    const chipClasse = document.createElement("span");
    chipClasse.className = "structure-chip highlight";
    chipClasse.textContent = `🏫 ${currentSelection.classe.libelle}`;
    container.appendChild(chipClasse);

    if (currentSelection.periode) {
      const chipPeriode = document.createElement("span");
      chipPeriode.className = "structure-chip highlight";
      chipPeriode.textContent = `📅 ${currentSelection.periode.libelle}`;
      container.appendChild(chipPeriode);
    } else {
      const chipPending = document.createElement("span");
      chipPending.className = "structure-chip";
      chipPending.textContent = "📅 Période en attente...";
      container.appendChild(chipPending);
    }

    if (currentSelection.matiere) {
      const chipMatiere = document.createElement("span");
      chipMatiere.className = "structure-chip highlight";
      chipMatiere.textContent = `📚 ${currentSelection.matiere.libelle}`;
      container.appendChild(chipMatiere);
    } else {
      const chipPending = document.createElement("span");
      chipPending.className = "structure-chip";
      chipPending.textContent = "📚 Matière en attente...";
      container.appendChild(chipPending);
    }
  }

  /**
   * Met à jour le libellé du bouton dans le header
   */
  function updateTriggerButtonBadge() {
    const badge = document.getElementById("structure-selector-badge");
    if (!badge) return;

    if (currentSelection.classe && currentSelection.periode && currentSelection.matiere) {
      badge.textContent = `${currentSelection.classe.libelle} • ${currentSelection.periode.libelle} • ${currentSelection.matiere.code_matiere || currentSelection.matiere.libelle}`;
      badge.title = `${currentSelection.classe.libelle} / ${currentSelection.periode.libelle} / ${currentSelection.matiere.libelle}`;
    } else if (currentSelection.classe) {
      badge.textContent = `${currentSelection.classe.libelle}`;
    } else {
      badge.textContent = "Non configuré";
    }
  }

  /**
   * Ouvre la modale
   */
  function openModal() {
    createModalDOM();
    const backdrop = document.getElementById("modal-structure-backdrop");
    if (!backdrop) return;

    // Rafraîchir les données
    loadTicketFromStorage();
    populateClassesDropdown(currentSelection?.classe?.id_classe);

    if (currentSelection?.classe?.id_classe) {
      const selectClasse = document.getElementById("select-structure-classe");
      if (selectClasse) selectClasse.value = currentSelection.classe.id_classe;
      onClasseChanged(
        currentSelection.classe.id_classe, 
        currentSelection.periode?.codePeriode || currentSelection.periode?.id_periode
      );

      if (currentSelection.matiere?.id_matiere) {
        const selectMatiere = document.getElementById("select-structure-matiere");
        if (selectMatiere) selectMatiere.value = currentSelection.matiere.id_matiere;
        onMatiereChanged(currentSelection.matiere.id_matiere);
      }
    }

    backdrop.classList.add("active");
  }

  /**
   * Ferme la modale
   */
  function closeModal() {
    const backdrop = document.getElementById("modal-structure-backdrop");
    if (backdrop) backdrop.classList.remove("active");
  }

  /**
   * Crée le bouton d'ouverture dans le header
   */
  function createTriggerButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "btn-structure-selector";
    btn.title = "Sélectionner la classe, période et matière";

    btn.innerHTML = `
      <span>🏫</span>
      <span>Classe :</span>
      <span class="badge-selection" id="structure-selector-badge">Non configuré</span>
    `;

    btn.addEventListener("click", openModal);
    return btn;
  }

  /**
   * Monte le bouton d'ouverture dans le Header entre le Logo et la liste élève
   */
  function mountTriggerButton() {
    if (document.getElementById("btn-structure-selector")) return;

    const header = document.querySelector("header");
    if (header) {
      const headerContainer = header.querySelector(".flex.justify-between, .flex-wrap, .max-w-\\[1700px\\]") || header;
      const btn = createTriggerButton();
      
      // Trouver le conteneur élève pour placer le bouton classe immédiatement avant lui
      const eleveNav = headerContainer.querySelector(".bg-slate-900\\/90, .bg-slate-900") || headerContainer.querySelector("select")?.closest(".bg-slate-900\\/90, .bg-slate-900, div");
      if (eleveNav && eleveNav.parentNode === headerContainer) {
        headerContainer.insertBefore(btn, eleveNav);
      } else {
        const logoDiv = headerContainer.querySelector(".flex.items-center.select-none") || headerContainer.querySelector("img")?.closest("div");
        if (logoDiv && logoDiv.nextSibling) {
          headerContainer.insertBefore(btn, logoDiv.nextSibling);
        } else {
          headerContainer.appendChild(btn);
        }
      }
      updateTriggerButtonBadge();
      return;
    }

    // Si le header n'est pas encore rendu
    setTimeout(mountTriggerButton, 300);
  }

  /**
   * Point d'entrée et initialisation
   */
  function init() {
    injectStyles();
    loadTicketFromStorage();
    restoreSavedSelection();

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        createModalDOM();
        mountTriggerButton();
      });
    } else {
      createModalDOM();
      mountTriggerButton();
    }

    // Écoute de la réception d'un nouveau ticket (via auth.js)
    window.addEventListener("auth_data_updated", (e) => {
      if (e.detail) {
        ticketData = e.detail;
        try {
          localStorage.setItem(STORAGE_KEY_TICKET, JSON.stringify(ticketData));
        } catch (err) {}
        flatStructure = parseStructure(ticketData);
        populateClassesDropdown();
        console.log("🏫 [structure-selector] Structure mise à jour depuis le nouveau ticket");
      }
    });

    // Écoute des mutations DOM pour s'assurer de la présence du bouton dans le header
    const observer = new MutationObserver(() => {
      if (!document.getElementById("btn-structure-selector")) {
        mountTriggerButton();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  /**
   * Interroge l'API ÉcoleDirecte via le proxy PHP
   */
  async function fetchEcoleDirecte(options = {}) {
    const endpoint = options.endpoint || 'notes'; // 'notes' ou 'appreciations'
    const sel = currentSelection || {};

    const classeId = options.id_classe || sel.classe?.id_classe;
    const periodeCode = options.periode_code || sel.periode?.codePeriode || sel.periode?.id_periode || 'ALL';
    const matiereId = options.id_matiere || sel.matiere?.id_matiere || sel.matiere?.code_matiere;
    const edToken = options.edToken || ticketData?.ed_token || ticketData?.token || localStorage.getItem('pb_token');
    const idCompte = options.id_compte || ticketData?.id_compte || ticketData?.ed_user_id || (ticketData?.record && ticketData.record.ed_user_id) || localStorage.getItem('ed_user_id');
    const proxyUrl = options.proxyUrl || localStorage.getItem('ed_proxy_url') || '/proxy-ecoledirecte.php';

    if (!classeId || !matiereId || !edToken || !idCompte) {
      const missing = [];
      if (!idCompte) missing.push("id_compte");
      if (!edToken) missing.push("edToken (session)");
      if (!classeId) missing.push("classe");
      if (!matiereId) missing.push("matière");

      const msg = `⚠️ [ÉcoleDirecte] Données incomplètes pour la requête (${missing.join(', ')}).`;
      console.warn(msg, { idCompte, classeId, matiereId, edToken: !!edToken });
      return { success: false, error: msg, missing };
    }

    console.log(`🚀 [ÉcoleDirecte Proxy] Envoi de la requête (${endpoint}) vers ${proxyUrl}...`, {
      compte: idCompte,
      classe: sel.classe?.libelle || classeId,
      periode: sel.periode?.libelle || periodeCode,
      matiere: sel.matiere?.libelle || matiereId
    });

    const startTime = performance.now();

    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: endpoint,
          id_classe: classeId,
          periode_code: periodeCode,
          id_matiere: matiereId,
          edToken: edToken,
          id_compte: idCompte
        })
      });

      const durationMs = Math.round(performance.now() - startTime);
      const data = await response.json();

      const statusEntry = {
        timestamp: new Date().toISOString(),
        durationMs: durationMs,
        httpCode: response.status,
        endpoint: endpoint,
        success: response.ok && (data.code === 200 || data.code === undefined),
        dataCode: data.code,
        message: data.message || (response.ok ? 'Données reçues' : 'Erreur API')
      };

      localStorage.setItem('ed_last_fetch_status', JSON.stringify(statusEntry));
      if (endpoint === 'notes') {
        localStorage.setItem('ed_last_notes_response', JSON.stringify(data));
      } else {
        localStorage.setItem('ed_last_appreciations_response', JSON.stringify(data));
      }

      if (response.ok && (data.code === 200 || !data.code)) {
        console.log(`✅ [ÉcoleDirecte Proxy] Données ${endpoint} reçues en ${durationMs}ms !`, data);
        
        // Émission de l'événement global pour l'application
        window.dispatchEvent(new CustomEvent("ecoledirecte_data_received", {
          detail: {
            endpoint: endpoint,
            data: data,
            selection: currentSelection,
            durationMs: durationMs
          }
        }));

        return { success: true, data: data, durationMs };
      } else {
        console.warn(`⚠️ [ÉcoleDirecte Proxy] Réponse non-standard (${response.status}) :`, data);
        return { success: false, data: data, error: data.message || 'Code réponse ÉcoleDirecte inattendu' };
      }
    } catch (error) {
      const durationMs = Math.round(performance.now() - startTime);
      console.error(`❌ [ÉcoleDirecte Proxy] Erreur réseau (${durationMs}ms) :`, error);
      
      const errEntry = {
        timestamp: new Date().toISOString(),
        durationMs: durationMs,
        httpCode: 0,
        endpoint: endpoint,
        success: false,
        error: error.message
      };
      localStorage.setItem('ed_last_fetch_status', JSON.stringify(errEntry));
      return { success: false, error: error.message };
    }
  }

  // Écouteur automatique de changement de sélection pour interroger ÉcoleDirecte
  window.addEventListener("structure_selection_changed", async (event) => {
    const detail = event.detail;
    if (!detail) return;

    // Si la sélection est complète et l'auto-fetch activé (par défaut activé)
    const autoFetch = localStorage.getItem('ed_auto_fetch') !== 'false';
    if (autoFetch && detail.classe && detail.matiere && detail.id_compte && detail.ed_token) {
      console.log("🔄 [structure-selector] Déclenchement automatique de la récupération des notes ÉcoleDirecte...");
      fetchEcoleDirecte({ endpoint: 'notes' });
    }
  });

  // API publique exposée
  window.appreciationStructure = {
    openModal: openModal,
    closeModal: closeModal,
    fetchEcoleDirecte: fetchEcoleDirecte,
    setTicketData: function (data) {
      ticketData = data;
      try {
        localStorage.setItem(STORAGE_KEY_TICKET, JSON.stringify(data));
      } catch (e) {}
      flatStructure = parseStructure(data);
      populateClassesDropdown();
    },
    getSelection: function () {
      return currentSelection;
    },
    getFlatStructure: function () {
      return flatStructure;
    }
  };

  // Raccourci global
  window.fetchEcoleDirecteData = fetchEcoleDirecte;

  init();
})();
