import { pb } from './pocketbasemanager.js';

let state_cache = {};
let last_synced_str = ""; 
let syncTimeout = null;

function logStateContent(prefix, stateObj) {
    console.log(`${prefix} Contenu du state_cache :`);
    console.dir(stateObj, { depth: null, colors: true });
}

/**
 * Initialise le cache à partir du record prof stocké ou fourni
 */
export function initState(initialState) {
    if (typeof initialState === 'string') {
        try {
            initialState = JSON.parse(initialState);
        } catch (e) {
            console.error("❌ [stateManagerWeb] Erreur parsing JSON initialState:", e);
            initialState = {};
        }
    }
    state_cache = initialState || {};
    last_synced_str = JSON.stringify(state_cache);
    
    console.log("==================================================");
    console.log("🧠 [stateManagerWeb] INITIALISATION DU STATE");
    logStateContent("📥 [LOAD INITIAL]", state_cache);
    console.log("==================================================");

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent("state_updated", { detail: state_cache }));
    }
}

export function clearState() {
    if (syncTimeout) {
        clearTimeout(syncTimeout);
        syncTimeout = null;
    }
    state_cache = {};
    last_synced_str = "";
    console.log("🧹 [stateManagerWeb] State nettoyé (Déconnexion).");

    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent("state_updated", { detail: state_cache }));
    }
}

export async function loadState() {
    return state_cache;
}

export async function saveState(newState) {
    try {
        if (!newState) newState = {};

        const mergedPrompts = {
            ...(state_cache?.prompts || {}),
            ...(newState?.prompts || {})
        };
        const mergedItems = {
            ...(state_cache?.items || {}),
            ...(newState?.items || {})
        };

        state_cache = {
            ...state_cache,
            ...newState,
            prompts: mergedPrompts,
            items: mergedItems
        };
        
        console.log("--------------------------------------------------");
        logStateContent("✏️ [EN COURS D'UTILISATION - MODIFICATION]", state_cache);
        console.log("--------------------------------------------------");

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent("state_updated", { detail: state_cache }));
        }

        triggerAutoSync();
        return true;
    } catch (e) {
        console.error("❌ Erreur saveState (mémoire):", e.message);
        return false;
    }
}

function triggerAutoSync() {
    const current_str = JSON.stringify(state_cache);

    if (current_str === last_synced_str) {
        console.log("ℹ️ [stateManagerWeb] Aucun changement par rapport à la version cloud. Synchro ignorée.");
        return;
    }

    if (syncTimeout) {
        clearTimeout(syncTimeout);
    }

    console.log("⏳ [stateManagerWeb] Modification détectée. Attente de 3s d'inactivité avant envoi...");

    syncTimeout = setTimeout(async () => {
        await syncStateToCloud();
    }, 3000);
}

export async function syncStateToCloud() {
    try {
        if (syncTimeout) {
            clearTimeout(syncTimeout);
            syncTimeout = null;
        }

        // Restauration secours authStore depuis localStorage
        let token = pb.authStore.token;
        let record = pb.authStore.record;

        if ((!token || !record || !record.id) && typeof localStorage !== 'undefined') {
            const storedToken = localStorage.getItem('pb_token');
            const storedProfStr = localStorage.getItem('prof_info');
            if (storedToken && storedProfStr) {
                try {
                    const storedRecord = JSON.parse(storedProfStr);
                    if (storedRecord && storedRecord.id) {
                        pb.authStore.save(storedToken, storedRecord);
                        token = storedToken;
                        record = storedRecord;
                    }
                } catch (e) {
                    console.error("❌ Erreur restauration prof_info:", e);
                }
            }
        }

        const profId = record?.id || pb.authStore.record?.id;

        if (!profId) {
            console.warn("⚠️ [stateManagerWeb] Impossible de synchroniser : aucun profil connecté (profId introuvable).");
            return false;
        }

        const current_str = JSON.stringify(state_cache);

        if (current_str === last_synced_str) {
            console.log("ℹ️ [stateManagerWeb] Aucune modification à envoyer sur le cloud.");
            return true;
        }

        console.log("==================================================");
        console.log(`🚀 [DÉCLENCHEMENT ENVOI CLOUD] Envoi vers PocketBase (Prof: ${profId})...`);
        logStateContent("📤 [DONNÉES ENVOYÉES]", state_cache);

        const updatedRecord = await pb.collection("profs").update(profId, {
            state: state_cache
        });

        if (updatedRecord) {
            const activeToken = pb.authStore.token || token || localStorage.getItem('pb_token');
            if (activeToken) {
                pb.authStore.save(activeToken, updatedRecord);
            }
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem('prof_info', JSON.stringify(updatedRecord));
            }
        }

        last_synced_str = current_str;
        console.log("✅ [stateManagerWeb] Synchronisation réussie sur PocketBase !");
        console.log("==================================================");

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent("state_synced_cloud", { detail: state_cache }));
        }

        return true;

    } catch (e) {
        console.error("❌ Erreur syncStateToCloud (PocketBase):", e.message || e);
        return false;
    }
}

// Global attachment on window.state and window.api.state for web compatibility
const stateManagerObj = {
    initState,
    clearState,
    loadState,
    saveState,
    syncStateToCloud,
    load: loadState,
    save: saveState,
    getStateCache: () => state_cache
};

if (typeof window !== 'undefined') {
    window.state = stateManagerObj;
    if (window.api) {
        window.api.state = stateManagerObj;
    }
}
