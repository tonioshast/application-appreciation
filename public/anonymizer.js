/**
 * ANONYMIZER.JS - Module de Pseudonymisation Miroir Client-Side
 * 
 * Assure la conformité RGPD et la confidentialité des données scolaires :
 * Les noms et prénoms réels des élèves ne sont JAMAIS transmis aux serveurs de l'IA (Mistral).
 * Le masquage s'effectue dans la mémoire du navigateur avant l'envoi,
 * et la restitution (dé-anonymisation) s'opère instantanément à la réception de la réponse.
 */

(function (global) {
  'use strict';

  // Base de données indicative de prénoms fréquents pour détection de genre
  const PRENOMS_FEMININS = new Set([
    'alice', 'alicia', 'ambre', 'anaïs', 'anais', 'anna', 'apoline', 'apolline', 'astrid', 'aude',
    'aurélie', 'aurelie', 'aurore', 'ava', 'béatrice', 'beatrice', 'bérénice', 'camille', 'capucine',
    'carla', 'cécile', 'cecile', 'célia', 'celia', 'charlène', 'charlene', 'charlotte', 'chloé', 'chloe',
    'clara', 'clémence', 'clemence', 'clémentine', 'clementine', 'constance', 'coralise', 'coralie',
    'dorine', 'élèna', 'elena', 'éléonore', 'eleonore', 'élia', 'elia', 'élina', 'elina', 'élisa', 'elisa',
    'élise', 'elise', 'éloïse', 'eloise', 'elsa', 'émilie', 'emilie', 'emma', 'emmeline', 'estelle', 'eva',
    'fanny', 'faustine', 'flore', 'gabrielle', 'garance', 'héloïse', 'heloise', 'inès', 'ines', 'iris',
    'isabelle', 'jade', 'jeanne', 'joséphine', 'josephine', 'juliette', 'julie', 'justine', 'laetitia',
    'laura', 'laurine', 'léa', 'lea', 'léna', 'lena', 'léonie', 'leonie', 'lilou', 'lina', 'lisa', 'lise',
    'lou', 'louise', 'lucie', 'lucile', 'ludivine', 'louna', 'maëlys', 'maelys', 'maëlle', 'maelle', 'maeva',
    'maïa', 'manon', 'margaux', 'margot', 'marine', 'marion', 'mathilde', 'mélanie', 'melanie', 'mélina',
    'melina', 'mélissa', 'melissa', 'mila', 'morgane', 'myriam', 'nina', 'noémie', 'noemie', 'océane',
    'oceane', 'olivia', 'pauline', 'pénélope', 'penelope', 'romane', 'rose', 'roxane', 'salomé', 'salome',
    'sarah', 'solène', 'solene', 'sophie', 'stella', 'suzanne', 'tess', 'thaïs', 'thais', 'valentine',
    'valérie', 'valerie', 'victoire', 'victoria', 'yaël', 'yael', 'zoé', 'zoe'
  ]);

  const PRENOMS_MASCULINS = new Set([
    'adam', 'adrien', 'alban', 'alexandre', 'alexis', 'aloïs', 'alois', 'anatole', 'anthony', 'antoine',
    'arthur', 'augustin', 'aurélien', 'aurelien', 'aymeric', 'baptiste', 'bastien', 'benjamin', 'benoît',
    'benoit', 'bruno', 'cédric', 'cedric', 'charles', 'clément', 'clement', 'corentin', 'damien', 'david',
    'dylan', 'élio', 'elio', 'elliot', 'enzo', 'esteban', 'étienne', 'etienne', 'evan', 'fabien', 'félix',
    'felix', 'florian', 'gabriel', 'gaël', 'gael', 'gaspard', 'gautier', 'grégoire', 'gregoire', 'guillaume',
    'hadrien', 'hugo', 'ilan', 'ismaël', 'ismael', 'jean', 'jérémy', 'jeremy', 'jonathan', 'jules', 'julien',
    'justin', 'kylian', 'laurent', 'léo', 'leo', 'léon', 'leon', 'léonard', 'leonard', 'loris', 'louis',
    'lucas', 'mael', 'maël', 'malo', 'marceau', 'martin', 'mathéo', 'matheo', 'mathias', 'mathieu', 'mathis',
    'matthieu', 'maxence', 'maxime', 'mickaël', 'mickael', 'nathan', 'nicolas', 'nils', 'noah', 'noé', 'noe',
    'nolan', 'olivier', 'paul', 'pierre', 'quentin', 'raphaël', 'raphael', 'rayan', 'robin', 'romain',
    'sacha', 'samuel', 'sandro', 'simon', 'stéphane', 'stephane', 'théo', 'theo', 'théodore', 'theodore',
    'thibault', 'thibaut', 'thomas', 'timéo', 'timeo', 'timothée', 'timothee', 'titouan', 'tom', 'valentin',
    'victor', 'vincent', 'yanis', 'yoann', 'yohan', 'yves'
  ]);

  // Miroirs fictifs standards de référence (sélectionnés selon le genre et l'initiale voyelle/consonne)
  const MIROIR_FEMININ_VOYELLE = 'Anne';
  const MIROIR_FEMININ_CONSONNE = 'Léa';
  const MIROIR_MASCULIN_VOYELLE = 'Alexandre';
  const MIROIR_MASCULIN_CONSONNE = 'Pierre';

  // Configuration par défaut
  let isEnabled = true;

  // Cache de session pour cohérence multi-générations au sein d'une même session
  const sessionMirrorMap = new Map();

  /**
   * Calcule un hash déterministe d'une chaîne
   */
  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * Résout le genre à partir du sexe officiel (F/M) ou du prénom en fallback
   * @param {string} prenom
   * @param {string} [sexe] - "F", "M", "Feminin", "Masculin", etc.
   * @returns {'female' | 'male' | 'neutral'}
   */
  function resolveGender(prenom, sexe) {
    // 1. Priorité absolue : Sexe certain fourni par ÉcoleDirecte / fiche élève
    if (sexe && typeof sexe === 'string') {
      const s = sexe.trim().toUpperCase();
      if (s === 'F' || s.startsWith('FEM') || s === 'FILLE' || s === 'FEMALE') {
        return 'female';
      }
      if (s === 'M' || s.startsWith('MASC') || s === 'GARCON' || s === 'GARÇON' || s === 'MALE') {
        return 'male';
      }
    }

    // 2. Fallback : Détection par le prénom si le sexe n'est pas renseigné
    return guessGender(prenom);
  }

  /**
   * Devine le genre probable d'un prénom français pour adapter les accords (fallback)
   */
  function guessGender(prenom) {
    if (!prenom || typeof prenom !== 'string') return 'neutral';
    const clean = prenom.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    if (PRENOMS_FEMININS.has(clean) || PRENOMS_FEMININS.has(prenom.trim().toLowerCase())) {
      return 'female';
    }
    if (PRENOMS_MASCULINS.has(clean) || PRENOMS_MASCULINS.has(prenom.trim().toLowerCase())) {
      return 'male';
    }

    // Heuristiques morphologiques françaises de terminaison
    if (/(?:ette|elle|ie|ine|a|ence|euse|ance|line|anne|ole)$/i.test(clean)) {
      return 'female';
    }
    if (/(?:o|ien|ard|el|eur|us|is|an|on|ic|in|er|ck)$/i.test(clean)) {
      return 'male';
    }

    return 'neutral';
  }

  /**
   * Vérifie si un prénom commence par une voyelle (y compris accentuée) ou un H muet
   * @param {string} prenom
   * @returns {boolean}
   */
  function startsWithVowelOrH(prenom) {
    if (!prenom || typeof prenom !== 'string') return false;
    const firstChar = prenom.trim().charAt(0).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    return /^[AEIOUYH]$/.test(firstChar);
  }

  /**
   * Obtient ou génère un prénom miroir déterministe pour un élève (Anne, Léa, Alexandre, Pierre)
   */
  function getMirrorIdentity(realPrenom, realNom, sexe) {
    const p = (realPrenom || '').trim();
    const n = (realNom || '').trim();
    const s = (sexe || '').trim().toUpperCase();
    const cacheKey = `${p.toLowerCase()}__${n.toLowerCase()}__${s}`;

    if (sessionMirrorMap.has(cacheKey)) {
      return sessionMirrorMap.get(cacheKey);
    }

    const gender = resolveGender(p, s);
    const isVowel = startsWithVowelOrH(p);
    let mirrorPrenom = isVowel ? MIROIR_FEMININ_VOYELLE : MIROIR_FEMININ_CONSONNE;

    if (gender === 'female') {
      // Fille : 'Anne' (voyelle) ou 'Léa' (consonne)
      mirrorPrenom = isVowel ? MIROIR_FEMININ_VOYELLE : MIROIR_FEMININ_CONSONNE;
    } else if (gender === 'male') {
      // Garçon : 'Alexandre' (voyelle) ou 'Pierre' (consonne)
      mirrorPrenom = isVowel ? MIROIR_MASCULIN_VOYELLE : MIROIR_MASCULIN_CONSONNE;
    } else {
      mirrorPrenom = isVowel ? MIROIR_MASCULIN_VOYELLE : MIROIR_FEMININ_CONSONNE;
    }

    const identity = {
      realPrenom: p,
      realNom: n,
      gender: gender,
      sexe: s,
      isVowel: isVowel,
      mirrorPrenom: mirrorPrenom,
      // Le nom de famille n'est JAMAIS envoyé à l'IA
      mirrorNom: ''
    };

    sessionMirrorMap.set(cacheKey, identity);
    return identity;
  }

  /**
   * Échappe les caractères spéciaux pour une Regex
   */
  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Masque les données sensibles (prénom et nom) dans un texte quelconque
   */
  function maskSensitiveText(text, identity) {
    if (!text || typeof text !== 'string') return text;
    let result = text;

    // 1. Masquer le nom de famille complet si présent
    if (identity.realNom && identity.realNom.trim().length > 1) {
      const nomRegex = new RegExp(`\\b${escapeRegExp(identity.realNom.trim())}\\b`, 'gi');
      result = result.replace(nomRegex, '');
    }

    // 2. Remplacer le prénom réel par le prénom miroir
    if (identity.realPrenom && identity.realPrenom.trim().length > 1) {
      const prenomRegex = new RegExp(`\\b${escapeRegExp(identity.realPrenom.trim())}\\b`, 'gi');
      result = result.replace(prenomRegex, identity.mirrorPrenom);
    }

    return result;
  }

  /**
   * Restaure le vrai prénom dans le texte généré par l'IA
   */
  function restoreSensitiveText(generatedText, identity) {
    if (!generatedText || typeof generatedText !== 'string' || !identity || !identity.realPrenom) {
      return generatedText;
    }

    let result = generatedText;
    const mirror = identity.mirrorPrenom;
    const real = identity.realPrenom;

    if (!mirror || mirror === real) return result;

    // 1. Remplacement exact casse respectée (ex: ALEXANDRE -> LUCAS)
    const upperMirrorRegex = new RegExp(`\\b${escapeRegExp(mirror.toUpperCase())}\\b`, 'g');
    result = result.replace(upperMirrorRegex, real.toUpperCase());

    // 2. Remplacement Capitalisé (ex: Alexandre -> Lucas)
    const capReal = real.charAt(0).toUpperCase() + real.slice(1);
    const capMirrorRegex = new RegExp(`\\b${escapeRegExp(mirror.charAt(0).toUpperCase() + mirror.slice(1))}\\b`, 'g');
    result = result.replace(capMirrorRegex, capReal);

    // 3. Remplacement minuscule (ex: alexandre -> lucas)
    const lowerReal = real.toLowerCase();
    const lowerMirrorRegex = new RegExp(`\\b${escapeRegExp(mirror.toLowerCase())}\\b`, 'g');
    result = result.replace(lowerMirrorRegex, lowerReal);

    // 4. Fallback global insensible à la casse
    const anyMirrorRegex = new RegExp(`\\b${escapeRegExp(mirror)}\\b`, 'gi');
    result = result.replace(anyMirrorRegex, capReal);

    // 5. Ajustement automatique des élisions françaises (d' / de, qu' / que)
    if (identity.isVowel) {
      // Élève commençant par une voyelle ou H : "de Elisa" -> "d'Elisa"
      result = result.replace(new RegExp(`\\bde\\s+(${escapeRegExp(capReal)})\\b`, 'g'), "d'$1");
      result = result.replace(new RegExp(`\\bDe\\s+(${escapeRegExp(capReal)})\\b`, 'g'), "D'$1");
      result = result.replace(new RegExp(`\\bque\\s+(${escapeRegExp(capReal)})\\b`, 'g'), "qu'$1");
      result = result.replace(new RegExp(`\\bQue\\s+(${escapeRegExp(capReal)})\\b`, 'g'), "Qu'$1");
    } else {
      // Élève commençant par une consonne : "d'Lucas" -> "de Lucas"
      result = result.replace(new RegExp(`\\bd['’]\\s*(${escapeRegExp(capReal)})\\b`, 'g'), 'de $1');
      result = result.replace(new RegExp(`\\bD['’]\\s*(${escapeRegExp(capReal)})\\b`, 'g'), 'De $1');
      result = result.replace(new RegExp(`\\bqu['’]\\s*(${escapeRegExp(capReal)})\\b`, 'g'), 'que $1');
      result = result.replace(new RegExp(`\\bQu['’]\\s*(${escapeRegExp(capReal)})\\b`, 'g'), 'Que $1');
    }

    return result;
  }

  /**
   * API PUBLIQUE
   */
  const Anonymizer = {
    /**
     * Statut de l'activation
     */
    isEnabled: () => isEnabled,
    setEnabled: (val) => {
      isEnabled = !!val;
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('anonymizer_enabled', isEnabled ? 'true' : 'false');
        }
      } catch (e) {}
    },

    /**
     * Détermine les informations miroir d'un élève
     */
    getMirrorInfo: (prenom, nom, sexe) => {
      return getMirrorIdentity(prenom, nom, sexe);
    },

    /**
     * Prépare le contexte d'envoi anonymisé pour l'appel IA
     * @param {Object} params { prenom, nom, sexe, moyenne, ton, style, items, userPrompt, previousAppreciation }
     * @returns {Object} { anonymizedParams, mirrorIdentity, restore: Function }
     */
    prepareForAI: (params) => {
      const sexe = params.sexe || params.gender || '';
      if (!isEnabled) {
        return {
          mirrorIdentity: {
            realPrenom: params.prenom || '',
            realNom: params.nom || '',
            mirrorPrenom: params.prenom || '',
            gender: resolveGender(params.prenom, sexe),
            sexe: sexe
          },
          effectivePrenom: params.prenom || '',
          effectiveNom: '',
          effectiveUserPrompt: params.userPrompt || '',
          restore: (text) => text,
          restoreAll: (obj) => obj
        };
      }

      const identity = getMirrorIdentity(params.prenom, params.nom, sexe);
      const anonymizedUserPrompt = maskSensitiveText(params.userPrompt, identity);

      return {
        mirrorIdentity: identity,
        effectivePrenom: identity.mirrorPrenom,
        effectiveNom: '', // Le nom est toujours supprimé vers l'IA
        effectiveUserPrompt: anonymizedUserPrompt,
        restore: (text) => restoreSensitiveText(text, identity),
        restoreAll: (versionsObj) => {
          if (!versionsObj || typeof versionsObj !== 'object') return versionsObj;
          const restored = {};
          for (const [k, v] of Object.entries(versionsObj)) {
            restored[k] = restoreSensitiveText(v, identity);
          }
          return restored;
        }
      };
    },

    /**
     * Masque un texte (ancienne appréciation, consigne)
     */
    anonymizeText: (text, prenom, nom, sexe) => {
      const identity = getMirrorIdentity(prenom, nom, sexe);
      return maskSensitiveText(text, identity);
    },

    /**
     * Restaure un texte généré
     */
    deanonymizeText: (text, prenom, nom, sexe) => {
      const identity = getMirrorIdentity(prenom, nom, sexe);
      return restoreSensitiveText(text, identity);
    },

    /**
     * Utilitaire de test unitaire rapide
     */
    testSimulation: (realPrenom, realNom, sexe, sampleTemplate, sampleResponse) => {
      // Supporte l'appel avec ou sans argument sexe (si 4 arguments passés)
      if (typeof sampleResponse === 'undefined' && typeof sampleTemplate === 'string') {
        sampleResponse = sampleTemplate;
        sampleTemplate = sexe;
        sexe = '';
      }
      const identity = getMirrorIdentity(realPrenom, realNom, sexe);
      const maskedTemplate = maskSensitiveText(sampleTemplate, identity);
      const restoredResponse = restoreSensitiveText(sampleResponse, identity);

      return {
        input: { realPrenom, realNom, sexe },
        detectedGender: identity.gender,
        mirrorPrenom: identity.mirrorPrenom,
        sentToAI: {
          prenomEnvoye: identity.mirrorPrenom,
          nomEnvoye: '(Supprimé - Absent)',
          promptEnvoye: maskedTemplate
        },
        aiRawResponse: sampleResponse,
        finalRestoredAppreciation: restoredResponse,
        containsRealNameInAIRequest: maskedTemplate.includes(realPrenom) || (realNom && maskedTemplate.includes(realNom))
      };
    }
  };

  // Chargement de l'état persisté si disponible
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('anonymizer_enabled');
      if (saved !== null) {
        isEnabled = saved === 'true';
      }
    }
  } catch (e) {}

  // Exposition globale & module
  if (typeof global !== 'undefined' && global) {
    global.Anonymizer = Anonymizer;
    global.anonymizer = Anonymizer;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.Anonymizer = Anonymizer;
    globalThis.anonymizer = Anonymizer;
  }
  if (typeof window !== 'undefined') {
    window.Anonymizer = Anonymizer;
    window.anonymizer = Anonymizer;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Anonymizer;
    module.exports.default = Anonymizer;
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
