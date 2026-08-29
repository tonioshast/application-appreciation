/**
 * Initialise l'interface de gestion des colonnes et des items (Colonne 1).
 * Gère l'affichage, l'édition, la sélection et la préparation des données JSON.
 */
async function initColonne1() {
  // --- 1. SÉLECTION DES ÉLÉMENTS DU DOM ---
  const selector = document.getElementById("items1-selector");
  const editableList = document.getElementById("items1-editable");
  const tempList = document.getElementById("items1-temp");
  const label = document.getElementById("items1-label");
  const saveBtn = document.getElementById("items1-save");
  const btnImport = document.getElementById("btn-import-items1");
  const inputImport = document.getElementById("input-import-items1");
  const deleteBtn = document.getElementById("items1-delete-btn");
  const btnExport = document.getElementById("btn-export-items1");

  if (!selector || !editableList || !tempList || !label) return;

  // 🔒 Liste exacte des grilles immuables
  const IMMUTABLE_ITEMS = [
    "grille_langue.json", 
    "grille_exp.json", 
    "grille_generale.json",
    "grille_officielle.json",
    "grille_vide.json"
  ];

  // --- 2. CONFIGURATION DE L'EN-TÊTE ---
  label.style.display = "flex";
  label.style.alignItems = "center";
  label.style.gap = "10px";
  if (selector.parentNode !== label) label.prepend(selector);

  // État local
  let tempJson = {};
  let currentLoadedData = null;

  // --- 3. INJECTION DES STYLES CSS ---
  const styleId = "grid-elegant-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      .scroll-container::-webkit-scrollbar, #items1-temp::-webkit-scrollbar { width: 8px; height: 8px; }
      .scroll-container::-webkit-scrollbar-track, #items1-temp::-webkit-scrollbar-track { background: #020617; }
      .scroll-container::-webkit-scrollbar-thumb, #items1-temp::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      .scroll-container::-webkit-scrollbar-thumb:hover, #items1-temp::-webkit-scrollbar-thumb:hover { background: #475569; }
      
      .grid-table { border-collapse: separate; border-spacing: 0; width: 100%; }
      .grid-table thead th { 
          position: sticky; top: 0; background: #0f172a; z-index: 10; padding: 5px;
          border-bottom: 2px solid #334155; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
      }
      
      .select-col-btn { width: 100%; padding: 4px; background: #1e293b; color: #10b981; border: 1px solid #334155; border-radius: 4px; cursor: pointer; font-size: 10px; font-weight: bold; transition: 0.2s; }
      .select-col-btn:hover { background: #334155; border-color: #10b981; }
      #items1-save:hover { background: #059669; transform: translateY(-2px); box-shadow: 0 6px 12px -2px rgba(16, 185, 129, 0.4); }
      #items1-save:active { transform: translateY(0); }
      #items1-delete-btn:hover:not(:disabled) { 
          background: #ef4444; 
          color: white; 
          transform: translateY(-2px); 
          box-shadow: 0 6px 12px -2px rgba(239, 68, 68, 0.4); 
      }
      #items1-delete-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          filter: grayscale(100%);
      }
      #items1-delete-btn:active:not(:disabled) { transform: translateY(0); }
    `;
    document.head.appendChild(style);
  }

  // --- HELPER : VÉRIFICATION D'IMMUTABILITÉ ---
  function isItemImmutable(filename, data) {
    if (!filename) return false;
    const isImmutableByName = IMMUTABLE_ITEMS.includes(filename);
    const isOfficialByMeta = data && (data.officiel === true || data._officiel === true);
    return isImmutableByName || isOfficialByMeta;
  }

  // --- 4. GESTION DES FICHIERS ---
  async function refreshFileList() {
    const files = await window.api.items.list();
    const previousSelection = selector.value;
    
    selector.innerHTML = "";

    if (!files || files.length === 0) {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "-- Aucun fichier disponible --";
      selector.appendChild(o);
      editableList.innerHTML = "";
      updateUIControlsState("", null);
      return [];
    }
    
    files.forEach(f => {
      const o = document.createElement("option");
      o.value = f;
      const isProtected = IMMUTABLE_ITEMS.includes(f);
      o.textContent = isProtected ? `🔒 ${f}` : f;
      selector.appendChild(o);
    });
    
    if (previousSelection && files.includes(previousSelection)) {
      selector.value = previousSelection;
    } else {
      selector.value = files[0];
    }

    return files;
  }

  async function loadActiveFile() {
    const f = selector.value;
    if (!f) {
      editableList.innerHTML = "";
      updateUIControlsState("", null);
      return;
    }

    currentLoadedData = await window.api.items.load(f);
    updateUIControlsState(f, currentLoadedData);
    renderEditableList(currentLoadedData || {});
  }

  // Active/Désactive ou masque les contrôles selon le statut de verrouillage
  function updateUIControlsState(filename, data) {
    const locked = isItemImmutable(filename, data);

    if (deleteBtn) {
      deleteBtn.disabled = locked;
      deleteBtn.title = locked ? "Fichier officiel protégé contre la suppression" : "Supprimer la grille";
    }
  }

  selector.addEventListener("change", loadActiveFile);

  // --- 5. LOGIQUE D'IMPORTATION ---
  if (btnImport && inputImport) {
    btnImport.onclick = () => inputImport.click();

    inputImport.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target.result.replace(/^\ufeff/, "").trim());
          
          const handleImportSave = async (evt) => {
            await refreshFileList(); 
            selector.value = evt.detail.filename; 
            await loadActiveFile(); 
            window.removeEventListener("items-file-created", handleImportSave); 
          };

          window.addEventListener("items-file-created", handleImportSave);

          window.dispatchEvent(
            new CustomEvent("open-save-modal-items", {
              detail: {
                mode: "items",
                content: JSON.stringify(json, null, 2),
                defaultName: file.name
              }
            })
          );
        } catch (err) {
          await window.api.dialog.showMessageBox({
            type: "error",
            title: "Erreur de lecture",
            message: "Erreur de lecture du fichier : " + err.message
          });
        }
      };
      reader.readAsText(file);
      inputImport.value = ""; 
    };
  }

  // --- 6. MOTEUR DE RENDU : GRILLE ÉDITABLE ---
  function renderEditableList(data) {
    editableList.innerHTML = "";

    // Nettoyage des clés de métadonnées pour l'affichage de la grille
    const displayEntries = Object.entries(data).filter(([key]) => !key.startsWith("_") && key !== "officiel");

    const scrollWrapper = document.createElement("div");
    scrollWrapper.className = "scroll-container";
    scrollWrapper.style.cssText = `width: 100%; max-height: 50vh; overflow: auto; background: rgba(255, 255, 255, 0.02); padding: 10px; border-radius: 8px; border: 1px solid #334155;`;

    const table = document.createElement("table");
    table.className = "grid-table";
    table.style.cssText = `table-layout: fixed; width: ${40 + (displayEntries.length * 140)}px; border-collapse: separate; border-spacing: 0px;`;

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    const thLabel = document.createElement("th");
    thLabel.style.width = "40px";
    const btnAdd = document.createElement("button");
    btnAdd.className = "select-col-btn";
    btnAdd.textContent = "+";
    btnAdd.style.cssText = `background: #0f172a; color: #64748b; padding: 4px; font-size: 16px;`;
    btnAdd.onclick = () => {
      const newColsCount = Object.keys(data).filter(k => k.startsWith("Nouvelle")).length;
      data[newColsCount === 0 ? "Nouvelle" : `Nouvelle ${newColsCount + 1}`] = ["", "", "", "", "", "", "", "", "", ""];
      renderEditableList(data);
    };
    thLabel.appendChild(btnAdd);
    headerRow.appendChild(thLabel);

    const titleInputs = [];
    const cellsMatrix = Array.from({ length: displayEntries.length }, () => []);

    displayEntries.forEach(([titre], idx) => {
      const th = document.createElement("th");
      th.style.width = "140px";
      
      const btnSelect = document.createElement("button");
      btnSelect.className = "select-col-btn";
      btnSelect.textContent = "SÉLECTIONNER";
      btnSelect.onclick = () => {
        let nomColonne = titleInputs[idx].value.trim() || `Colonne ${idx + 1}`;
        while (tempJson[nomColonne]) {
          nomColonne += " "; 
        }
        tempJson[nomColonne] = cellsMatrix[idx].map(ta => ta.value.trim()).filter(v => v !== "");
        renderTempList();
      };
      
      const inp = document.createElement("textarea");
      inp.value = titre;
      inp.style.cssText = `width: 100%; height: 55px; background: transparent; color: #60a5fa; font-weight: 700; text-align: center; border: 1px solid #334155; border-radius: 4px; margin: 5px 0; resize: none; overflow-y: auto; font-family: inherit; padding: 4px;`;
      
      titleInputs.push(inp);
      th.append(btnSelect, inp);
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (let i = 0; i < 10; i++) {
      const row = document.createElement("tr");
      const tdLabel = document.createElement("td");
      tdLabel.textContent = `Niv ${i + 1}`;
      tdLabel.style.cssText = `width: 40px; color: #64748b; font-size: 10px; text-align: center; border-right: 1px solid #334155;`;
      row.appendChild(tdLabel);
      
      displayEntries.forEach((_, colIdx) => {
        const td = document.createElement("td");
        const ta = document.createElement("textarea");
        const colKey = displayEntries[colIdx][0];
        ta.value = (Array.isArray(data[colKey]) ? data[colKey][i] : "") || "";
        ta.style.cssText = `width: 100%; height: 60px; background: rgba(0,0,0,0.2); color: #cbd5e1; border: 1px solid #334155; padding: 6px; font-size: 13px; resize: none; border-radius: 4px; box-sizing: border-box;`;
        cellsMatrix[colIdx].push(ta);
        td.appendChild(ta);
        row.appendChild(td);
      });
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    scrollWrapper.appendChild(table);
    editableList.appendChild(scrollWrapper);
  }

  // --- 7. MOTEUR DE RENDU : LISTE TEMPORAIRE ---
  function renderTempList() {
    tempList.innerHTML = "";
    const entries = Object.entries(tempJson);
    
    const countElement = document.getElementById("items-count");
    if (countElement) countElement.textContent = `(${entries.length})`;

    entries.forEach(([titre, nuances]) => {
      const line = document.createElement("div");
      line.style.cssText = `padding:8px; margin-bottom:6px; background:#1e293b; border-radius:4px; color:#e5e7eb; display:flex; align-items:center; gap:10px;`;
      
      const titleSpan = document.createElement("span");
      titleSpan.style.cssText = `font-weight:bold; color:#60a5fa; min-width: 100px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
      titleSpan.textContent = titre;
      
      const nuancesContainer = document.createElement("div");
      nuancesContainer.style.cssText = `display:flex; flex-wrap:wrap; gap:4px; flex-grow: 1;`;
      nuances.forEach(n => {
        const span = document.createElement("span");
        span.textContent = n;
        span.style.cssText = `background:#0f172a; padding:1px 6px; border-radius:3px; font-size:11px; border:1px solid #334155; color:#cbd5e1; white-space: nowrap;`;
        nuancesContainer.appendChild(span);
      });
      
      const delBtn = document.createElement("button");
      delBtn.innerHTML = "🗑️";
      delBtn.style.cssText = `background:none; border:none; cursor:pointer; margin-left: auto;`;
      delBtn.onclick = () => { delete tempJson[titre]; renderTempList(); };

      line.appendChild(titleSpan);
      line.appendChild(nuancesContainer);
      line.appendChild(delBtn);
      tempList.appendChild(line);
    });
  }

  // --- 8. ÉVÉNEMENT SAUVEGARDE ("Enregistrer sous...") ---
  if (saveBtn) {
    saveBtn.onclick = async () => { 
      const entriesCount = Object.keys(tempJson).length;
      const editableCount = currentLoadedData ? Object.keys(currentLoadedData).filter(k => !k.startsWith("_") && k !== "officiel").length : 0;
      
      if (entriesCount === 0 && editableCount === 0) {
        await window.api.dialog.showMessageBox({
          type: "warning",
          title: "Action impossible",
          message: "Vous devez sélectionner au moins une colonne avant de sauvegarder."
        });
        return; 
      }

      const handleSave = async (e) => {
        await refreshFileList();
        if (e.detail?.filename) {
          selector.value = e.detail.filename; 
          await loadActiveFile();
        }
        
        tempJson = {};        
        renderTempList();     
        
        window.removeEventListener("items-file-created", handleSave);
      };

      window.addEventListener("items-file-created", handleSave);

      const activeFilename = selector.value || "nouvelle_grille.json"; 
      const dataToSave = Object.keys(tempJson).length > 0 ? tempJson : (currentLoadedData || {});

      window.dispatchEvent(new CustomEvent("open-save-modal-items", { 
          detail: { 
              mode: "items", 
              content: JSON.stringify(dataToSave, null, 2),
              defaultName: activeFilename 
          } 
      }));
    };
  }

  // --- 9. ÉVÉNEMENT SUPPRESSION ---
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      const activeFile = selector.value;
      if (!activeFile) {
        await window.api.dialog.showMessageBox({
          type: "error",
          title: "Erreur",
          message: "Aucune grille sélectionnée."
        });
        return;
      }

      if (isItemImmutable(activeFile, currentLoadedData)) {
        await window.api.dialog.showMessageBox({
          type: "warning",
          title: "Fichier protégé",
          message: "Cette grille officielle est protégée et ne peut pas être supprimée."
        });
        return;
      }

      window.dispatchEvent(new CustomEvent("open-delete-modal", { 
        detail: { mode: "items", filename: activeFile } 
      }));
    };
  }

  // Événement après suppression réussie
  window.addEventListener("items-file-deleted", async () => {
      const files = await refreshFileList();
      
      if (editableList) editableList.innerHTML = "";
      if (tempList) tempList.innerHTML = "";
      
      if (files.length > 0) {
          await loadActiveFile();
      } else {
          if (label) label.textContent = "Aucun fichier disponible.";
      }
  });
    
  // --- 10. ÉVÉNEMENT EXPORT ---
  if (btnExport) {
    btnExport.onclick = async () => {
      const fileName = selector.value;
      if (!fileName) {
        await window.api.dialog.showMessageBox({
          type: "error",
          title: "Sélection manquante",
          message: "Aucun fichier sélectionné."
        });
        return;
      }

      const data = await window.api.items.load(fileName);
      const content = JSON.stringify(data, null, 2);

      const blob = new Blob([content], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName; 
      a.click();
      
      URL.revokeObjectURL(a.href);
    };
  }

  // --- 11. ÉCOUTEURS D'ÉVÉNEMENTS SESSION ET TEMPS RÉEL (POCKETBASE REALTIME) ---
  if (window._colonne1SessionReadyHandler) {
    window.removeEventListener("pocketbase-session-ready", window._colonne1SessionReadyHandler);
  }
  window._colonne1SessionReadyHandler = async () => {
    console.log("📢 [colonne1.js] Signal de session PocketBase reçu !");
    await refreshFileList();
    await loadActiveFile();
  };
  window.addEventListener("pocketbase-session-ready", window._colonne1SessionReadyHandler);

  if (window.api?.items?.onItemsUpdated) {
    if (window._colonne1ItemsUnsubscribe) {
      window._colonne1ItemsUnsubscribe();
    }

    window._colonne1ItemsUnsubscribe = window.api.items.onItemsUpdated(async ({ record }) => {
      await refreshFileList();
      if (record?.nom && record.nom === selector.value) {
        await loadActiveFile();
      }
    });
  }

  // --- INITIALISATION AU CHARGEMENT ---
  await refreshFileList();
  await loadActiveFile();
}

window.initColonne1 = initColonne1;
