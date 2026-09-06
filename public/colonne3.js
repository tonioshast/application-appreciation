window.initColonne3 = async function () {
    const selector = document.getElementById("prompt-selector");
    const editor = document.getElementById("prompt-editor");
    const label = document.getElementById("active-prompt-label");

    // Éléments Import / Export
    const btnExport = document.getElementById("btn-export-prompt");
    const btnImport = document.getElementById("btn-import-prompt");
    const inputImport = document.getElementById("input-import-prompt");

    if (!selector || !editor) {
        console.warn("⚠️ [colonne3.js] #prompt-selector ou #prompt-editor introuvable dans le DOM.");
        return;
    }

    // Constantes
    const MODE = "matières";
    const IMMUTABLE_PROMPTS = [
        "prompt_officiel.json",
        "prompt_bonjour.json",
        "prompt_chinois.json",
        "prompt_naturel.json",
        "prompt_av_exemple.json",
        "synthese_defaut.json"
    ];

    // État local
    let currentPromptsList = [];
    let isUserTyping = false; // Empêche l'écrasement du textarea en cours de saisie

    // --- 1. Injection des Styles (Scrollbar & Éditeur) ---
    const styleId = "prompt-editor-style";
    if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            #prompt-editor::-webkit-scrollbar { width: 6px; }
            #prompt-editor::-webkit-scrollbar-track { background: #020617; }
            #prompt-editor::-webkit-scrollbar-thumb { background: #475569; border-radius: 3px; }
            #prompt-editor::-webkit-scrollbar-thumb:hover { background: #64748b; }
        `;
        document.head.appendChild(style);
    }

    editor.style.cssText = `width: 100%; background: #1e293b; color: #f1f5f9; border: 1px solid #334155; border-radius: 8px; padding: 12px; font-family: 'Consolas', 'Monaco', monospace; font-size: 14px; line-height: 1.5; outline: none; transition: all 0.3s ease; resize: none; flex: 1; box-sizing: border-box;`;

    // --- 2. Fonctions Utilitaires d'Affichage ---
    function updateActiveLabel(promptName) {
        if (label) {
            label.textContent = `Prompt actif (Matières) : ${promptName || "Aucun"}`;
        }
    }

    async function updatePromptButtonLabel() {
        const labelSpan = document.getElementById("btn-prompt-active-name");
        if (!labelSpan) return;
        let active = "Aucun";
        try {
            const st = (window.state && window.state.load ? await window.state.load() : null) || {};
            active = st.prompts?.active || "Aucun";
        } catch (e) {
            console.warn("Could not load prompt active state:", e);
        }
        labelSpan.textContent = active.replace(".json", "");
        labelSpan.title = active;
    }

    // Charge la donnée d'un prompt dans le composant d'édition
    async function loadPromptData(promptName) {
        if (!promptName) {
            editor.value = "";
            return;
        }

        const data = await window.api.prompts.load(promptName, MODE);

        if (!data) {
            editor.value = "";
        } else if (typeof data === "string") {
            editor.value = data;
        } else if (typeof data === "object") {
            if (data.template) {
                editor.value = typeof data.template === "string" ? data.template : JSON.stringify(data.template, null, 2);
            } else if (data.contenu) {
                editor.value = typeof data.contenu === "string" ? data.contenu : JSON.stringify(data.contenu, null, 2);
            } else {
                editor.value = JSON.stringify(data, null, 2);
            }
        }

        editor.style.borderColor = "#334155";
        editor.style.boxShadow = "none";
        isUserTyping = false;
        updateActiveLabel(promptName);
    }

    // Rafraîchit le sélecteur depuis PocketBase
    async function refreshList() {
        console.log("🔄 [colonne3.js] Exécution de refreshList()...");
        const rawPrompts = await window.api.prompts.list(MODE);
        selector.innerHTML = "";

        if (!rawPrompts || !Array.isArray(rawPrompts) || rawPrompts.length === 0) {
            console.warn("⚠️ [colonne3.js] Aucun prompt retourné par la BDD.");
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "-- Aucun prompt trouvé --";
            selector.appendChild(opt);
            currentPromptsList = [];
            editor.value = "";
            return;
        }

        console.log(`✅ [colonne3.js] ${rawPrompts.length} prompt(s) chargé(s) dans l'IHM.`);
        currentPromptsList = rawPrompts;

        rawPrompts.forEach(item => {
            const name = typeof item === "string" ? item : (item.nom || item.filename);
            if (!name) return;

            const isOfficial = (typeof item === "object" && item.officiel) || IMMUTABLE_PROMPTS.includes(name);

            const opt = document.createElement("option");
            opt.value = name;
            opt.textContent = isOfficial ? "🔒 " + name : name;
            if (isOfficial) opt.dataset.locked = "1";

            selector.appendChild(opt);
        });

        // Restauration de l'élément sélectionné
        const st = await window.state.load();
        const active = st.prompts?.active;
        const optionsValues = Array.from(selector.options).map(o => o.value);

        if (active && optionsValues.includes(active)) {
            selector.value = active;
        } else if (selector.options.length > 0) {
            selector.value = selector.options[0].value;
        }

        if (selector.value && !isUserTyping) {
            await loadPromptData(selector.value);
        }
    }

    // --- 3. Handlers d'Événements ---
    
    // Modification dans l'éditeur texte
    editor.oninput = () => {
        isUserTyping = true;
        editor.style.borderColor = "#f59e0b";
        editor.style.boxShadow = "0 0 8px rgba(245, 158, 11, 0.4)";
    };

    // Sélection d'un prompt dans la liste déroulante
    selector.onchange = async () => {
        const name = selector.value;
        await loadPromptData(name);
        updatePromptButtonLabel();
    };

    // Bouton d'ouverture de la modale "Enregistrer sous"
    const btnSavePrompt = document.getElementById("save-prompt");
    if (btnSavePrompt) {
        btnSavePrompt.onclick = () => {
            const inputName = document.getElementById("save-prompt-filename");
            if (inputName) inputName.value = selector.value || "nouveau_prompt.json";
            if (window.savePromptModal) window.savePromptModal.style.display = "flex";
        };
    }

    // Confirmation d'enregistrement dans PocketBase
    const btnSaveOk = document.getElementById("save-prompt-ok");
    if (btnSaveOk) {
        btnSaveOk.onclick = async () => {
            const inputName = document.getElementById("save-prompt-filename");
            let filename = inputName ? inputName.value.trim() : "";
            if (!filename) return;

            if (IMMUTABLE_PROMPTS.includes(filename)) {
                await window.api.dialog.showMessageBox({
                    type: "error",
                    title: "Nom réservé",
                    message: "Ce prompt officiel ne peut pas être écrasé."
                });
                return;
            }

            const contentToSave = window.savePromptModal?.dataset.content
                ? window.savePromptModal.dataset.content
                : editor.value;

            const success = await window.api.prompts.create(filename, contentToSave, MODE);
            if (!success) {
                await window.api.dialog.showMessageBox({
                    type: "error",
                    title: "Échec d'enregistrement",
                    message: "Erreur lors de l'enregistrement dans PocketBase."
                });
                return;
            }

            if (window.savePromptModal) {
                window.savePromptModal.style.display = "none";
                delete window.savePromptModal.dataset.content;
            }

            editor.style.borderColor = "#10b981";
            editor.style.boxShadow = "none";
            isUserTyping = false;

            await refreshList();
            selector.value = filename;
            await loadPromptData(filename);

            const st = await window.state.load();
            await window.state.save({ ...st, prompts: { active: filename } });
            updatePromptButtonLabel();
            updateActiveLabel(filename);

            window.dispatchEvent(new CustomEvent("prompt-file-created", {
                detail: { filename: filename }
            }));
        };
    }

    // Annulation de la sauvegarde
    const btnSaveCancel = document.getElementById("save-prompt-cancel");
    if (btnSaveCancel) {
        btnSaveCancel.onclick = () => {
            if (window.savePromptModal) window.savePromptModal.style.display = "none";
        };
    }

    // Demande de suppression d'un prompt
    const btnDeletePrompt = document.getElementById("delete-prompt");
    if (btnDeletePrompt) {
        btnDeletePrompt.onclick = async () => {
            const file = selector.value;

            if (selector.selectedOptions[0]?.dataset.locked === "1") {
                await window.api.dialog.showMessageBox({
                    type: "warning",
                    title: "Fichier protégé",
                    message: "Ce prompt officiel ne peut pas être supprimé."
                });
                return;
            }

            window.dispatchEvent(new CustomEvent("open-delete-modal", {
                detail: { mode: MODE, filename: file }
            }));
        };
    }

    // Exportation
    if (btnExport) {
        btnExport.onclick = () => {
            const content = editor.value;
            const blob = new Blob([content], { type: "application/json" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = selector.value || "prompt.json";
            a.click();
            URL.revokeObjectURL(a.href);
        };
    }

    // Importation
    if (btnImport && inputImport) {
        btnImport.onclick = () => inputImport.click();
        inputImport.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (ev) => {
                const textContent = ev.target.result.replace(/^\ufeff/, "").trim();

                const handleSave = async (event) => {
                    window.removeEventListener("prompt-file-created", handleSave);
                    await refreshList();
                    selector.value = event.detail.filename;
                    await loadPromptData(event.detail.filename);
                };

                window.addEventListener("prompt-file-created", handleSave);

                window.dispatchEvent(new CustomEvent("open-save-modal", {
                    detail: { mode: MODE, content: textContent, defaultName: file.name }
                }));
            };
            reader.readAsText(file);
            inputImport.value = "";
        };
    }

    // --- 4. Gestion des Custom Events Globaux ---
    if (window._colonne3OpenSaveModalHandler) {
        window.removeEventListener("open-save-modal", window._colonne3OpenSaveModalHandler);
    }
    window._colonne3OpenSaveModalHandler = (e) => {
        const { mode, content, defaultName } = e.detail;
        if (!window.savePromptModal) return;
        window.savePromptModal.dataset.mode = mode;
        window.savePromptModal.dataset.content = content;
        const inputName = document.getElementById("save-prompt-filename");
        if (inputName) inputName.value = defaultName;
        window.savePromptModal.style.display = "flex";
    };
    window.addEventListener("open-save-modal", window._colonne3OpenSaveModalHandler);

    if (window._colonne3PromptDeletedHandler) {
        window.removeEventListener("prompt-file-deleted", window._colonne3PromptDeletedHandler);
    }
    window._colonne3PromptDeletedHandler = async (e) => {
        if (e.detail?.mode === MODE) {
            await refreshList();
            if (selector.options.length > 0) {
                const firstVal = selector.options[0].value;
                const st = await window.state.load();
                await window.state.save({ ...st, prompts: { active: firstVal } });
                selector.value = firstVal;
                await loadPromptData(firstVal);
                updatePromptButtonLabel();
            }
        }
    };
    window.addEventListener("prompt-file-deleted", window._colonne3PromptDeletedHandler);

    if (window._colonne3SessionReadyHandler) {
        window.removeEventListener("pocketbase-session-ready", window._colonne3SessionReadyHandler);
    }
    window._colonne3SessionReadyHandler = async () => {
        console.log("📢 [colonne3.js] Signal de session PocketBase reçu ! Re-chargement des prompts...");
        await refreshList();
        updatePromptButtonLabel();
    };
    window.addEventListener("pocketbase-session-ready", window._colonne3SessionReadyHandler);

    // --- 5. Abonnement PocketBase Realtime ---
    if (window.api?.prompts?.onPromptsUpdated) {
        if (window._colonne3PromptsUnsubscribe) {
            window._colonne3PromptsUnsubscribe();
        }

        window._colonne3PromptsUnsubscribe = window.api.prompts.onPromptsUpdated(async ({ action, record }) => {
            console.log(`⚡ [colonne3.js] Événement Realtime reçu: ${action} (${record?.nom})`);
            await refreshList();

            if (record?.nom && record.nom === selector.value && !isUserTyping) {
                await loadPromptData(record.nom);
            }
        });
    }

    // --- 🚀 Lancement Initial ---
    await refreshList();
    updatePromptButtonLabel();
};
