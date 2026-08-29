/**
 * Initialise la sélection et la visualisation des items/grilles (Colonne 2).
 */
async function initColonne2() {
  const selector = document.getElementById("items-selector");
  const label = document.getElementById("active-items-label");
  const applyBtn = document.getElementById("apply-items");
  const list = document.getElementById("items-list");
  
  if (!selector || !applyBtn || !list) return;

  // 🔒 Liste exacte des éléments immuables
  const IMMUTABLE_ITEMS = [
    "grille_langue.json", 
    "grille_exp.json", 
    "grille_generale.json",
    "grille_officielle.json",
    "grille_vide.json"
  ];

  let isUserInteracting = false; // Flag anti-conflit lors des updates en temps réel

  // --- 1. INJECTION DU STYLE CSS ---
  const styleId = "colonne2-elegant-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      #items-list::-webkit-scrollbar { width: 6px; }
      #items-list::-webkit-scrollbar-track { background: #020617; }
      #items-list::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
      #items-list::-webkit-scrollbar-thumb:hover { background: #64748b; }
      #items-list { flex: 1; overflow-y: auto; }
    `;
    document.head.appendChild(style);
  }

  // Helper pour vérifier l'immutabilité/statut officiel
  function isItemImmutable(filename, data) {
    if (!filename) return false;
    const isImmutableByName = IMMUTABLE_ITEMS.includes(filename);
    const isOfficialByMeta = data && (data.officiel === true || data._officiel === true);
    return isImmutableByName || isOfficialByMeta;
  }

  // --- 2. FONCTION CENTRALE : RENDU DU CONTENU DE LA GRILLE ---
  async function renderFileContent(filename, preselectItems = []) {
    if (!filename) {
      list.innerHTML = "";
      if (label) label.textContent = "Aucun élément sélectionné.";
      return;
    }

    const data = await window.api.items.load(filename);
    if (!data || typeof data !== "object") {
      list.innerHTML = "";
      if (label) label.textContent = "Fichier vide ou invalide.";
      return;
    }

    window.currentItemsData = data;
    window.selectedItems = new Set(preselectItems);

    list.innerHTML = "";

    // Filtrage des métadonnées système éventuelles
    const entries = Object.entries(data).filter(([key]) => !key.startsWith("_") && key !== "officiel");

    entries.forEach(([item, nuances]) => {
      const safeNuances = Array.isArray(nuances) ? nuances : [String(nuances)];
      const isActive = window.selectedItems.has(item);
      
      const line = document.createElement("div");
      line.dataset.active = isActive ? "1" : "0";
      line.style.cssText = `padding: 8px; margin-bottom: 6px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; gap: 10px; transition: 0.2s; background: ${isActive ? "#10b981" : "#1e293b"}; color: #e5e7eb; border: 1px solid ${isActive ? "#059669" : "#334155"};`;

      const titleSpan = document.createElement("span");
      titleSpan.style.cssText = `font-weight:bold; color: ${isActive ? "#ffffff" : "#60a5fa"}; min-width: 120px; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`;
      titleSpan.textContent = item;

      const nuancesContainer = document.createElement("div");
      nuancesContainer.style.cssText = `display:flex; flex-wrap:wrap; gap:4px; flex-grow: 1;`;
      safeNuances.forEach(n => {
        if (!n) return;
        const span = document.createElement("span");
        span.textContent = n;
        span.style.cssText = `background:#0f172a; padding:1px 6px; border-radius:3px; font-size:11px; border:1px solid #334155; color:#cbd5e1; white-space: nowrap;`;
        nuancesContainer.appendChild(span);
      });

      line.appendChild(titleSpan);
      line.appendChild(nuancesContainer);

      line.onclick = async () => {
        isUserInteracting = true;
        const currentlyActive = line.dataset.active === "1";
        
        if (!currentlyActive && window.selectedItems.size >= 10) {
          await window.api.dialog.showMessageBox({
            type: "warning",
            title: "Limite atteinte",
            message: "Vous pouvez sélectionner un maximum de 10 items."
          });
          isUserInteracting = false;
          return;
        }
        
        line.dataset.active = currentlyActive ? "0" : "1";
        line.style.background = currentlyActive ? "#1e293b" : "#10b981";
        line.style.borderColor = currentlyActive ? "#334155" : "#059669";
        titleSpan.style.color = currentlyActive ? "#60a5fa" : "#ffffff";
        currentlyActive ? window.selectedItems.delete(item) : window.selectedItems.add(item);
        
        setTimeout(() => { isUserInteracting = false; }, 500);
      };
      list.appendChild(line);
    });

    const isLocked = isItemImmutable(filename, data);
    if (label) label.textContent = `Visualisation : ${filename} ${isLocked ? "🔒" : ""}`;
  }

  // --- 3. RAFRAÎCHISSEMENT GLOBAL DES FICHIERS ---
  window.refreshItems = async () => {
    const files = await window.api.items.list();
    const st = await window.state.load();
    const active = (st.items?.active && files.includes(st.items.active)) ? st.items.active : files[0];
    
    selector.innerHTML = "";
    
    if (!files || files.length === 0) {
      const o = document.createElement("option");
      o.value = "";
      o.textContent = "-- Aucun item trouvé --";
      selector.appendChild(o);
      list.innerHTML = "";
      if (label) label.textContent = "Aucun fichier disponible.";
      return;
    }

    files.forEach(f => {
      const o = document.createElement("option");
      o.value = f;
      const isOfficial = IMMUTABLE_ITEMS.includes(f);
      o.textContent = isOfficial ? `🔒 ${f}` : f;
      selector.appendChild(o);
    });

    if (active) {
      selector.value = active;
      await renderFileContent(active, st.items?.selected || []);
    }
  };

  // --- 4. ÉVÉNEMENTS UI ---
  applyBtn.onclick = async () => {
    const data = window.currentItemsData;
    const sel = window.selectedItems;
    if (!data || !sel) return;
    
    window.dispatchEvent(new CustomEvent("items-selection-ready", { 
        detail: Object.fromEntries([...sel].map(i => [i, data[i]])) 
    }));

    const st = await window.state.load();
    await window.state.save({
      ...st,
      items: { active: selector.value, selected: Array.from(sel) }
    });
    
    if (label) label.textContent = `Appliqué : ${sel.size} items`;

    if (window.itemsModalContainer) {
        window.itemsModalContainer.style.display = "none";
    }
  };

  selector.onchange = async () => {
      const name = selector.value;
      const st = await window.state.load();
      
      const savedSelected = (st.items?.active === name) ? (st.items?.selected || []) : [];
      
      await renderFileContent(name, savedSelected);
      
      await window.state.save({ 
          ...st, 
          items: { 
              active: name, 
              selected: savedSelected 
          } 
      });
  };

  // --- 5. ÉCOUTEURS D'ÉVÉNEMENTS EN TEMPS RÉEL ---
  if (window._colonne2SessionReadyHandler) {
    window.removeEventListener("pocketbase-session-ready", window._colonne2SessionReadyHandler);
  }
  window._colonne2SessionReadyHandler = async () => {
    await window.refreshItems();
  };
  window.addEventListener("pocketbase-session-ready", window._colonne2SessionReadyHandler);

  if (window.api?.items?.onItemsUpdated) {
    if (window._colonne2ItemsUnsubscribe) {
      window._colonne2ItemsUnsubscribe();
    }

    window._colonne2ItemsUnsubscribe = window.api.items.onItemsUpdated(async ({ record }) => {
      await window.refreshItems();
      if (record?.nom && record.nom === selector.value && !isUserInteracting) {
        await renderFileContent(selector.value, window.selectedItems ? Array.from(window.selectedItems) : []);
      }
    });
  }

  // Chargement initial
  await window.refreshItems();
}

window.initColonne2 = initColonne2;
