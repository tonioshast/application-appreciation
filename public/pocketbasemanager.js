import PocketBase from "https://cdn.jsdelivr.net/npm/pocketbase@0.21.1/dist/pocketbase.es.mjs";

const POCKETBASE_URL = "https://pb.appreciation.fr";
export const pb = new PocketBase(POCKETBASE_URL);

pb.autoCancellation(false);

// Fallbacks par défaut pour les éléments immuables si non trouvés dans la BDD
const DEFAULT_IMMUTABLES = {
    prompts: {
        "prompt_officiel.json": { template: "Tu es un professeur qui rédige une appréciation pour un bulletin scolaire.\nTu dois écrire une appréciation courte, professionnelle et naturelle.\nRédige directement l’appréciation, sans introduction, sans titre.\n\nPrénom de l’élève : {{prenom}}\nTon demandé : {{ton}}\nStyle demandé : {{style}}\n\nInformations disponibles :\n{{infos_dynamiques}}\n\nRègles obligatoires :\n1. Utiliser uniquement le prénom de l’élève.\n2. Ne jamais citer la moyenne.\n3. Le ton doit correspondre exactement au ton demandé.\n4. Le style doit correspondre exactement au style demandé.\n5. Pas de tutoiement.\n6. Pas de phrases trop longues.\n7. Ne jamais inventer d’informations absentes de la section \"Informations disponibles\".\n8. Ne pas reformuler, déduire ou compléter une information manquante.\n9. Utiliser toutes les informations.\n10. Chaque phrase doit utiliser uniquement les éléments réellement fournis.\n11. Pas de titre, pas de markdown, pas de texte décoratif.\n\nFormat de sortie strict :\n<version1>\n[texte de la version 1]\n</version1>\n\n<version2>\n[texte de la version 2]\n</version2>\n\n<version3>\n[texte de la version 3]\n</version3>\n\nNe rien ajouter avant, après ou en dehors de ces balises." },
        "prompt_bonjour.json": { template: "Rédige une appréciation bienveillante et construite pour {prenom} ({moyenne}/20). Ton : {ton}, Style : {style}. Critères : {items}." },
        "prompt_chinois.json": { template: "Rédige une appréciation pour le cours de langue de {prenom} ({moyenne}/20). Ton : {ton}, Style : {style}. Points observés : {items}." }
    },
    items: {
        "grille_generale.json": {
            "travail": ["sérieux", "irrégulier", "insuffisant", "soutenu", "en progrès"],
            "compréhension": ["très bonne", "bonne", "difficultés", "satisfaisante", "fragile"],
            "participation": ["bonne", "variable", "faible", "insuffisante", "très active"],
            "autonomie": ["oui", "non", "en progrès", "à développer"],
            "maturité": ["oui", "non", "satisfaisante", "à acquérir"],
            "comportement": ["exemplaire", "correct", "à améliorer", "passif"],
            "bavardages": ["aucun", "gênants", "discrets", "trop fréquents"],
            "conseils": ["poursuivre", "efforts attendus", "plus de rigueur", "s'investir davantage"]
        },
        "grille_langue.json": {
            "expression_orale": ["fluide", "spontanée", "hésitante", "à encourager"],
            "compréhension_écrite": ["excellente", "satisfaisante", "fragile"],
            "grammaire": ["solide", "en acquisition", "à retravailler"]
        },
        "grille_exp.json": {
            "exp_orale": ["claire", "structurée", "à développer"],
            "exp_écrite": ["soignée", "riche", "à consolider"]
        },
        "grille_officielle.json": {
            "travail": ["régulier", "sérieux", "insuffisant"],
            "investissement": ["remarquable", "satisfaisant", "passif"]
        },
        "grille_vide.json": {
            "Nouveau critère": ["option 1", "option 2"]
        }
    }
};

// Configuration des entités
const CONFIGS = {
    prompts: {
        collection: "prompts_matiere",
        immutables: ["prompt_officiel.json", "prompt_bonjour.json", "prompt_chinois.json"],
        parse: (raw) => {
            let parsed = raw;
            if (typeof parsed === "string") {
                try { parsed = JSON.parse(parsed); } 
                catch (e) { parsed = { template: raw }; }
            }
            return typeof parsed === "string" ? { template: parsed } : parsed;
        },
        formatPayload: (content) => typeof content === "string" ? { template: content } : content
    },
    items: {
        collection: "items",
        immutables: ["grille_langue.json", "grille_exp.json", "grille_generale.json", "grille_officielle.json", "grille_vide.json"],
        parse: (raw) => {
            if (typeof raw === "string") {
                try { return JSON.parse(raw); } 
                catch (e) { return { data: raw }; }
            }
            return raw;
        },
        formatPayload: (content) => typeof content === "string" ? CONFIGS.items.parse(content) : content
    }
};

function getCurrentUserId() {
    return pb.authStore.model?.id || null;
}

/**
 * Fabrique de gestionnaire de cache générique pour une collection donnée
 */
function createStore(type) {
    const config = CONFIGS[type];
    const cache = new Map();
    let isLoaded = false;
    let isLoadingPromise = null;

    function clearCache() {
        cache.clear();
        isLoaded = false;
        isLoadingPromise = null;
        console.log(`🧹 [Cache ${type}] Cache RAM nettoyé.`);
    }

    async function initCache() {
        if (isLoaded) return Array.from(cache.keys());
        if (isLoadingPromise) return isLoadingPromise;

        isLoadingPromise = (async () => {
            try {
                const userId = getCurrentUserId();
                console.log(`⚡ [Cache ${type}] Chargement initial en RAM (${config.collection})...`);

                const filterQuery = userId 
                    ? pb.filter("user ~ {:user} || user = {:user} || officiel = true", { user: userId })
                    : "officiel = true";

                const records = await pb.collection(config.collection).getFullList({
                    filter: filterQuery,
                    sort: "nom"
                });

                cache.clear();
                records.forEach(r => {
                    cache.set(r.nom, {
                        id: r.id,
                        parsedContent: config.parse(r.contenu),
                        officiel: r.officiel,
                        user: r.user
                    });
                });

                // Injecter les immuables par défaut si non présents dans la BDD
                const defaults = DEFAULT_IMMUTABLES[type] || {};
                Object.keys(defaults).forEach(key => {
                    if (!cache.has(key)) {
                        cache.set(key, {
                            id: null,
                            parsedContent: defaults[key],
                            officiel: true,
                            user: null
                        });
                    }
                });

                isLoaded = true;
                console.log(`✅ [Cache ${type}] ${cache.size} élément(s) préchargé(s).`);
                return Array.from(cache.keys());
            } catch (err) {
                console.warn(`ℹ️ [Cache ${type}] Serveur non disponible, utilisation du fallback local :`, err.message);
                const defaults = DEFAULT_IMMUTABLES[type] || {};
                Object.keys(defaults).forEach(key => {
                    if (!cache.has(key)) {
                        cache.set(key, {
                            id: null,
                            parsedContent: defaults[key],
                            officiel: true,
                            user: null
                        });
                    }
                });
                isLoaded = true;
                return Array.from(cache.keys());
            } finally {
                isLoadingPromise = null;
            }
        })();

        return isLoadingPromise;
    }

    return {
        clearCache,
        initCache,

        async list() {
            if (!isLoaded) await initCache();
            return Array.from(cache.keys());
        },

        async load(file) {
            if (!isLoaded) await initCache();
            const cached = cache.get(file);
            if (cached) return cached.parsedContent;
            const defaults = DEFAULT_IMMUTABLES[type] || {};
            return defaults[file] || null;
        },

        async save(file, content) {
            if (config.immutables.includes(file)) return false;

            try {
                const userId = getCurrentUserId();
                if (!userId) throw new Error("Utilisateur non connecté.");

                const cached = cache.get(file);
                if (cached && cached.officiel) {
                    console.warn(`⚠️ Impossible de modifier un élément officiel : ${file}`);
                    return false;
                }

                const payloadContent = config.formatPayload(content);

                cache.set(file, {
                    id: cached?.id || null,
                    parsedContent: payloadContent,
                    officiel: false,
                    user: userId
                });

                if (cached && cached.id) {
                    await pb.collection(config.collection).update(cached.id, { contenu: payloadContent });
                } else {
                    const newRecord = await pb.collection(config.collection).create({
                        user: userId,
                        nom: file,
                        contenu: payloadContent,
                        officiel: false
                    });
                    if (cache.has(file)) cache.get(file).id = newRecord.id;
                }
                return true;
            } catch (error) {
                console.warn(`⚠️ [PocketBase ${type}] Info save pour ${file} :`, error.message);
                isLoaded = false;
                return false;
            }
        },

        async remove(file) {
            if (config.immutables.includes(file)) return false;

            try {
                const userId = getCurrentUserId();
                if (!userId) return false;

                const cached = cache.get(file);
                if (!cached || cached.officiel) return false;

                cache.delete(file);
                if (cached.id) {
                    await pb.collection(config.collection).delete(cached.id);
                }
                return true;
            } catch (error) {
                console.warn(`⚠️ [PocketBase ${type}] Info remove pour ${file} :`, error.message);
                isLoaded = false;
                return false;
            }
        },

        subscribe(callback) {
            // Désactivation complète du temps réel pour éviter les erreurs SSE /api/realtime (503)
            return () => {};
        },

        unsubscribe() {
            return null;
        }
    };
}

const promptsStore = createStore("prompts");
const itemsStore = createStore("items");

// Initialisation automatique de la session depuis le localStorage rempli par auth.js
function initializeSessionFromLocalStorage() {
    const token = localStorage.getItem('pb_token');
    const recordStr = localStorage.getItem('prof_info');

    if (token && recordStr) {
        try {
            const record = JSON.parse(recordStr);
            const previousUser = getCurrentUserId();
            pb.authStore.save(token, record);

            if (previousUser !== record?.id) {
                promptsStore.clearCache();
                itemsStore.clearCache();
            }
            console.log(`✅ [POCKETBASE] Session restaurée depuis le localStorage pour l'ID : ${record?.id}`);
            
            // Déclencher un événement global pour prévenir les composants de l'UI
            window.dispatchEvent(new CustomEvent("pocketbase-session-ready", { detail: { record } }));
        } catch (e) {
            console.error("❌ Erreur de restauration de session localStorage :", e);
        }
    } else {
        console.warn("⚠️ Aucun token PocketBase trouvé dans le localStorage.");
    }
}

// Lancement automatique à l'import du module
initializeSessionFromLocalStorage();

if (typeof window !== 'undefined') {
    window.addEventListener('auth_data_updated', () => {
        initializeSessionFromLocalStorage();
    });
}

// Fallback basique pour window.state si statemanager.js n'est pas encore chargé
if (!window.state) {
    window.state = {
        async load() {
            try {
                const raw = localStorage.getItem('prof_info');
                if (raw) {
                    const prof = JSON.parse(raw);
                    if (prof.state) return typeof prof.state === 'string' ? JSON.parse(prof.state) : prof.state;
                }
            } catch (e) {}
            return { prompts: { active: '' }, items: { active: '', selected: [] } };
        },
        async save(newState) {
            console.warn("⚠️ window.state.save appelé avant initialisation complète de statemanager.js");
        }
    };
}

// Fallback pour window.api.dialog
const defaultDialog = {
    showMessageBox: async ({ title, message }) => {
        alert((title ? title + "\n\n" : "") + message);
    }
};

// Exposition globale d'un objet window.api unifié pour l'application web
window.api = {
    pb,
    dialog: defaultDialog,
    state: window.state,
    initPromptsCache: () => promptsStore.initCache(),
    initItemsCache: () => itemsStore.initCache(),
    clearAllCaches: () => {
        promptsStore.clearCache();
        itemsStore.clearCache();
    },
    prompts: {
        list: () => promptsStore.list(),
        load: (file) => promptsStore.load(file),
        save: (file, content) => promptsStore.save(file, content),
        create: (file, template) => promptsStore.save(file, template),
        remove: (file) => promptsStore.remove(file),
        onPromptsUpdated: (cb) => promptsStore.subscribe((action, record) => cb({ action, record })),
        unsubscribe: () => promptsStore.unsubscribe()
    },
    items: {
        list: () => itemsStore.list(),
        load: (file) => itemsStore.load(file),
        save: (file, content) => itemsStore.save(file, content),
        remove: (file) => itemsStore.remove(file),
        onItemsUpdated: (cb) => itemsStore.subscribe((action, record) => cb({ action, record })),
        unsubscribe: () => itemsStore.unsubscribe()
    }
};
