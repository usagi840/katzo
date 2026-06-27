/**
 * ============================================================================
 *  SocialLang.js — v2.5.0
 * ============================================================================
 *  Framework JavaScript ultra-complet permettant de générer un réseau social
 *  moderne, sécurisé et stylisé en important un unique fichier JS.
 *
 *  @file sociallang.js
 *  @version 2.5.0
 *  @author  SocialLang Core Team
 *  @license MIT
 *
 *  UTILISATION MINIMALE (moins de 10 lignes) :
 *
 *  <script src="sociallang.js"></script>
 *  <script>
 *    SocialLang.init({
 *      nomReseau: "MonRéseau",
 *      apiKey: "demo-key-1234",
 *      theme: "dracula",
 *      langue: "fr"
 *    });
 *    SocialLang.creerSystemeAuthentification("#auth-container");
 *    SocialLang.creerInterfaceComplete("#app-container");
 *  </script>
 *
 * ============================================================================
 */

(function (window, document) {
  "use strict";

  /* ==========================================================================
   *  SECTION 0 — GARDES D'ENVIRONNEMENT
   * ======================================================================== */

  /**
   * Vérifie que le framework s'exécute dans un environnement navigateur valide.
   * SocialLang ne peut fonctionner que côté client (DOM + localStorage requis).
   */
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error(
      "[SocialLang] Ce framework nécessite un environnement navigateur (window/document introuvables)."
    );
  }

  /* ==========================================================================
   *  SECTION 1 — NAMESPACE GLOBAL & CONSTANTES INTERNES
   * ======================================================================== */

  /**
   * Espace de noms global exposé par le framework.
   * Tous les modules publics sont attachés à cet objet unique afin de ne
   * jamais polluer le scope global avec des variables annexes.
   * @namespace SocialLang
   */
  const SocialLang = {};

  /**
   * Préfixe utilisé pour toutes les clés stockées en localStorage afin
   * d'éviter toute collision avec d'autres scripts présents sur la page hôte.
   * @constant {string}
   */
  const LS_PREFIX = "sociallang_v2_";

  /**
   * Clés localStorage centralisées (évite les chaînes magiques dispersées).
   * @constant {Object<string,string>}
   */
  const LS_KEYS = {
    USERS: LS_PREFIX + "users",
    SESSION: LS_PREFIX + "session",
    POSTS: LS_PREFIX + "posts",
    LIKES: LS_PREFIX + "likes",
    COMMENTS: LS_PREFIX + "comments",
    THEME: LS_PREFIX + "theme",
    CACHE_MARKER: LS_PREFIX + "cache_marker",
    SETTINGS: LS_PREFIX + "settings",
  };

  /**
   * Version courante du framework (exposée publiquement).
   * @constant {string}
   */
  const VERSION = "2.5.0";

  /**
   * Identifiant unique de session d'exécution du script (utile pour le debug
   * et pour invalider certains caches en mémoire entre deux rechargements
   * complets de la page).
   * @constant {string}
   */
  const RUNTIME_ID =
    "rt_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);

  /* ==========================================================================
   *  SECTION 2 — ÉTAT INTERNE (PRIVÉ)
   * ======================================================================== */

  /**
   * État interne complet du framework. Cet objet n'est jamais exposé
   * directement : toute interaction passe par les méthodes publiques de
   * SocialLang afin de garantir l'intégrité des données.
   * @private
   */
  const _state = {
    /** @type {boolean} Indique si SocialLang.init() a déjà été appelé. */
    initialized: false,

    /** @type {Object} Configuration active fusionnée avec les valeurs par défaut. */
    config: null,

    /** @type {Object|null} Utilisateur actuellement connecté (ou null). */
    currentUser: null,

    /** @type {Array<Object>} Liste en mémoire des publications (cache local). */
    postsCache: [],

    /** @type {boolean} Marqueur indiquant si le cache mémoire est synchronisé. */
    cacheHydrated: false,

    /** @type {string} Thème actif. */
    activeTheme: "clair",

    /** @type {string} Terme de recherche actif dans le flux. */
    searchQuery: "",

    /** @type {Object<string, boolean>} Suivi des sections de commentaires ouvertes. */
    openComments: {},

    /** @type {boolean} Indique si les styles globaux ont déjà été injectés. */
    stylesInjected: false,

    /** @type {boolean} Indique si la palette de thèmes a déjà été injectée. */
    themesInjected: false,

    /** @type {Object<string, Array<Function>>} File d'attente d'écouteurs d'événements internes. */
    listeners: {
      onLogin: [],
      onLogout: [],
      onNewPost: [],
      onThemeChange: [],
    },
  };

  /* ==========================================================================
   *  SECTION 3 — CONFIGURATION PAR DÉFAUT
   * ======================================================================== */

  /**
   * Configuration par défaut du framework. Toute clé non fournie par
   * l'utilisateur lors de l'appel à `SocialLang.init()` héritera de cette
   * valeur par défaut via une fusion superficielle contrôlée.
   * @constant {Object}
   */
  const DEFAULT_CONFIG = {
    nomReseau: "SocialLang",
    apiKey: "sl-demo-key-default",
    langue: "fr",
    theme: "clair",
    avatarProvider: "https://api.dicebear.com/7.x/adventurer/svg?seed=",
    maxLongueurPost: 500,
    maxLongueurCommentaire: 250,
    moderationActive: true,
    persistanceActive: true,
    dateFormat: "fr-FR",
    nomAuteurParDefaut: "Anonyme",
    debug: false,
  };

  /* ==========================================================================
   *  SECTION 4 — DICTIONNAIRE DE TRADUCTIONS (I18N MINIMAL)
   * ======================================================================== */

  /**
   * Dictionnaire de chaînes traduites utilisé par les composants UI internes.
   * Conçu pour être étendu facilement par d'autres langues.
   * @constant {Object<string, Object<string,string>>}
   */
  const I18N = {
    fr: {
      connexion: "Connexion",
      inscription: "Inscription",
      deconnexion: "Déconnexion",
      pseudo: "Pseudo",
      motDePasse: "Mot de passe",
      seConnecter: "Se connecter",
      sInscrire: "S'inscrire",
      bienvenue: "Bienvenue",
      quoiDeNeuf: "Quoi de neuf ?",
      publier: "Publier",
      jaime: "J'aime",
      commenter: "Commenter",
      commentaires: "Commentaires",
      envoyer: "Envoyer",
      rechercher: "Rechercher un pseudo ou un mot-clé...",
      aucunResultat: "Aucun résultat trouvé.",
      pseudoRequis: "Le pseudo est requis.",
      motDePasseRequis: "Le mot de passe doit contenir au moins 4 caractères.",
      pseudoExistant: "Ce pseudo est déjà utilisé.",
      identifiantsInvalides: "Pseudo ou mot de passe incorrect.",
      ecrireCommentaire: "Écrire un commentaire...",
      ilYA: "il y a",
    },
  };

  /**
   * Récupère une chaîne traduite selon la langue active de la configuration.
   * Retombe sur le français si la langue ou la clé est introuvable.
   * @param {string} cle - Clé de traduction.
   * @returns {string} Chaîne traduite.
   * @private
   */
  function _t(cle) {
    const langue = (_state.config && _state.config.langue) || "fr";
    const dict = I18N[langue] || I18N.fr;
    return dict[cle] !== undefined ? dict[cle] : I18N.fr[cle] || cle;
  }

  /* ==========================================================================
   *  SECTION 5 — MODULE SÉCURITÉ : ANTI-XSS & NETTOYAGE DES ENTRÉES
   * ======================================================================== */

  /**
   * Échappe les caractères HTML dangereux d'une chaîne afin de prévenir
   * toute injection de code (XSS) lors de l'affichage de contenu généré
   * par l'utilisateur dans le DOM via innerHTML.
   * @param {string} chaine - Chaîne brute potentiellement dangereuse.
   * @returns {string} Chaîne échappée, sûre pour insertion dans le HTML.
   * @private
   */
  function _echapperHTML(chaine) {
    if (typeof chaine !== "string") {
      chaine = String(chaine == null ? "" : chaine);
    }
    return chaine
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/`/g, "&#96;")
      .replace(/\//g, "&#x2F;");
  }

  /**
   * Nettoie un pseudo utilisateur : retire les espaces superflus, interdit
   * les caractères spéciaux non alphanumériques (hors underscore et tiret)
   * et limite sa longueur. Ne lève jamais d'exception, retourne toujours
   * une chaîne (vide si invalide).
   * @param {string} pseudoBrut - Pseudo saisi par l'utilisateur.
   * @returns {string} Pseudo nettoyé et sécurisé.
   * @private
   */
  function _nettoyerPseudo(pseudoBrut) {
    if (typeof pseudoBrut !== "string") return "";
    let p = pseudoBrut.trim();
    // Supprime toute balise ou caractère de script potentiel.
    p = p.replace(/<[^>]*>/g, "");
    // N'autorise que lettres (incl. accents), chiffres, underscore, tiret, espace.
    p = p.replace(/[^a-zA-Z0-9À-ÖØ-öø-ÿ_\- ]/g, "");
    // Compresse les espaces multiples.
    p = p.replace(/\s{2,}/g, " ");
    // Limite stricte de longueur pour éviter les abus de stockage.
    if (p.length > 32) p = p.slice(0, 32);
    return p.trim();
  }

  /**
   * Nettoyage générique d'un champ texte libre (post, commentaire). Retire
   * les balises HTML brutes tout en conservant le texte lisible. La
   * protection définitive contre le XSS se fait toujours à l'affichage via
   * `_echapperHTML`, cette fonction ne fait qu'une première passe de
   * normalisation.
   * @param {string} texteBrut - Texte saisi par l'utilisateur.
   * @param {number} [maxLongueur=500] - Longueur maximale autorisée.
   * @returns {string} Texte nettoyé.
   * @private
   */
  function _nettoyerTexteLibre(texteBrut, maxLongueur) {
    if (typeof texteBrut !== "string") return "";
    let t = texteBrut.trim();
    t = t.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
    t = t.replace(/<[^>]*>/g, "");
    t = t.replace(/javascript:/gi, "");
    t = t.replace(/on\w+\s*=/gi, "");
    const limite = typeof maxLongueur === "number" ? maxLongueur : 500;
    if (t.length > limite) t = t.slice(0, limite);
    return t;
  }

  /**
   * Génère un identifiant unique pseudo-aléatoire utilisé pour les entités
   * internes (utilisateurs, posts, commentaires). Non cryptographique :
   * suffisant pour un usage de démonstration côté client.
   * @param {string} [prefixe="id"] - Préfixe lisible de l'identifiant.
   * @returns {string} Identifiant unique.
   * @private
   */
  function _genererId(prefixe) {
    const base = prefixe || "id";
    return (
      base +
      "_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 10)
    );
  }

  /**
   * Hash simple (non cryptographique) utilisé uniquement pour stocker les
   * mots de passe de démonstration sans les conserver en clair dans le
   * localStorage. ATTENTION : ceci n'est PAS un hash sécurisé au sens
   * cryptographique et ne doit jamais être utilisé pour protéger des
   * données sensibles réelles — il s'agit d'un mécanisme pédagogique pour
   * une démo front-end uniquement.
   * @param {string} chaine - Chaîne à hasher.
   * @returns {string} Représentation hashée de la chaîne.
   * @private
   */
  function _hashSimple(chaine) {
    const str = String(chaine || "");
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const charCode = str.charCodeAt(i);
      hash = (hash << 5) - hash + charCode;
      hash |= 0;
    }
    return "h" + Math.abs(hash).toString(36) + "_" + str.length;
  }

  /* ==========================================================================
   *  SECTION 6 — MODULE SÉCURITÉ : MODÉRATION AUTOMATIQUE PAR REGEX
   * ======================================================================== */

  /**
   * Dictionnaire étendu de motifs interdits (langage haineux générique,
   * grossièretés courantes, spam publicitaire, tentatives de phishing).
   * Les expressions régulières sont volontairement permissives (variantes
   * d'écriture, espacement, leetspeak basique) afin de maximiser la
   * détection sur un cas de démonstration. La liste reste générique et
   * n'inclut aucun terme à caractère discriminatoire ciblé : elle se
   * concentre sur le spam, les insultes génériques et les tentatives
   * d'arnaque, conformément à un usage de modération communautaire standard.
   * @constant {Array<RegExp>}
   */
  const MOTIFS_MODERATION = [
    // --- Spam / arnaques / phishing ---
    /\bgagne[rz]?\s*(de l'argent|\$|€|100\s*%)\b/gi,
    /\bclique[rz]?\s*ici\b/gi,
    /\bargent\s*facile\b/gi,
    /\bcrypto\s*gratuit\w*\b/gi,
    /\bbitcoin\s*gratuit\w*\b/gi,
    /\boffre\s*exclusive\b/gi,
    /\bvirement\s*urgent\b/gi,
    /\bmot\s*de\s*passe\s*:?\s*\S+/gi,
    /\bnumero\s*de\s*carte\b/gi,
    /\bnuméro\s*de\s*carte\b/gi,
    /\bwww\.[a-z0-9-]+\.[a-z]{2,}\/[a-z0-9\-_%]+/gi,
    /\bpromo(tion)?\s*illimit[ée]e?\b/gi,
    /\babonn[ée]s?\s*gratuit\w*\b/gi,
    /\bfollow\s*for\s*follow\b/gi,
    /\bf4f\b/gi,
    // --- Insultes / grossièretés génériques (français courant) ---
    /\bconn(ard|asse|ard?e)\b/gi,
    /\bsalop(e|ard)\b/gi,
    /\bencul[ée]\b/gi,
    /\bp[ué]t(e|asse)\b/gi,
    /\bnique\s*ta\s*m[èe]re\b/gi,
    /\bfdp\b/gi,
    /\btr(ou|ouille)\s*du\s*cul\b/gi,
    /\bferme\s*ta\s*gueule\b/gi,
    /\btg\b/gi,
    /\bbatard\b/gi,
    /\bbâtard\b/gi,
    /\bdébile\b/gi,
    /\bdebile\b/gi,
    /\bimb[ée]cile\b/gi,
    /\bidiot(e)?\b/gi,
    /\b(c|k)on(ne)?\b/gi,
    // --- Variantes leetspeak basiques ---
    /\bc[o0]nn[a4]rd\b/gi,
    /\bs[a4]l[o0]pe\b/gi,
  ];

  /**
   * Applique le filtre de modération automatique sur un texte donné :
   * chaque occurrence d'un motif interdit est remplacée par le marqueur
   * " [Censuré] ". La fonction est idempotente et ne modifie pas le texte
   * si aucun motif ne correspond.
   * @param {string} texte - Texte à analyser.
   * @returns {{texteModere: string, aEteModere: boolean}} Résultat de la modération.
   * @private
   */
  function _modererTexte(texte) {
    if (typeof texte !== "string" || texte.length === 0) {
      return { texteModere: texte || "", aEteModere: false };
    }
    let resultat = texte;
    let aEteModere = false;

    MOTIFS_MODERATION.forEach((motif) => {
      if (motif.test(resultat)) {
        aEteModere = true;
        resultat = resultat.replace(motif, " [Censuré] ");
      }
      // Réinitialise le lastIndex des regex globales pour éviter les bugs
      // de décalage lors d'appels successifs sur des chaînes différentes.
      motif.lastIndex = 0;
    });

    // Compresse les espaces multiples générés par les remplacements en série.
    resultat = resultat.replace(/\s{2,}/g, " ").trim();
    return { texteModere: resultat, aEteModere };
  }

  /* ==========================================================================
   *  SECTION 7 — MODULE PERSISTANCE (LOCALSTORAGE)
   * ======================================================================== */

  /**
   * Vérifie si le localStorage est disponible et fonctionnel dans
   * l'environnement courant (peut être désactivé en navigation privée
   * stricte sur certains navigateurs, ou bloqué par une politique CSP).
   * @returns {boolean} true si localStorage est utilisable.
   * @private
   */
  function _localStorageDisponible() {
    try {
      const testKey = LS_PREFIX + "__test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (e) {
      return false;
    }
  }

  /** @type {boolean} Cache de disponibilité du localStorage. */
  const LS_DISPONIBLE = _localStorageDisponible();

  /** @type {Object<string, any>} Fallback mémoire si localStorage est indisponible. */
  const _memoryFallbackStore = {};

  /**
   * Lit une valeur JSON depuis le localStorage (ou le fallback mémoire).
   * @param {string} cle - Clé de stockage.
   * @param {*} valeurParDefaut - Valeur retournée si la clé est absente ou invalide.
   * @returns {*} Valeur désérialisée.
   * @private
   */
  function _lireStockage(cle, valeurParDefaut) {
    try {
      if (LS_DISPONIBLE) {
        const brut = window.localStorage.getItem(cle);
        if (brut === null || brut === undefined) return valeurParDefaut;
        return JSON.parse(brut);
      }
      return cle in _memoryFallbackStore ? _memoryFallbackStore[cle] : valeurParDefaut;
    } catch (e) {
      console.warn("[SocialLang] Erreur de lecture du stockage pour la clé", cle, e);
      return valeurParDefaut;
    }
  }

  /**
   * Écrit une valeur (sérialisée en JSON) dans le localStorage (ou le
   * fallback mémoire si indisponible).
   * @param {string} cle - Clé de stockage.
   * @param {*} valeur - Valeur à persister.
   * @returns {boolean} true si l'écriture a réussi.
   * @private
   */
  function _ecrireStockage(cle, valeur) {
    try {
      if (LS_DISPONIBLE) {
        window.localStorage.setItem(cle, JSON.stringify(valeur));
      } else {
        _memoryFallbackStore[cle] = valeur;
      }
      return true;
    } catch (e) {
      console.warn("[SocialLang] Erreur d'écriture du stockage pour la clé", cle, e);
      return false;
    }
  }

  /**
   * Supprime une clé du stockage persistant.
   * @param {string} cle - Clé à supprimer.
   * @private
   */
  function _supprimerStockage(cle) {
    try {
      if (LS_DISPONIBLE) {
        window.localStorage.removeItem(cle);
      } else {
        delete _memoryFallbackStore[cle];
      }
    } catch (e) {
      console.warn("[SocialLang] Erreur de suppression du stockage pour la clé", cle, e);
    }
  }

  /* ==========================================================================
   *  SECTION 8 — MOTEUR DE THÈMES (5 THÈMES COMPLETS VIA VARIABLES CSS)
   * ======================================================================== */

  /**
   * Définitions complètes des thèmes disponibles. Chaque thème fournit un
   * jeu cohérent de variables CSS personnalisées (--sl-*) consommées par
   * la feuille de style injectée en Section 9. Les thèmes sont
   * radicalement différents visuellement tout en respectant la même
   * structure de variables, garantissant une bascule instantanée et sans
   * rupture de mise en page.
   * @constant {Object<string, Object<string,string>>}
   */
  const THEMES = {
    clair: {
      "--sl-bg": "#f3f5f9",
      "--sl-bg-secondaire": "#ffffff",
      "--sl-texte": "#1a1d29",
      "--sl-texte-muted": "#6b7280",
      "--sl-primaire": "#4f46e5",
      "--sl-primaire-hover": "#4338ca",
      "--sl-accent": "#06b6d4",
      "--sl-danger": "#ef4444",
      "--sl-succes": "#22c55e",
      "--sl-bordure": "#e2e6ee",
      "--sl-carte-bg": "#ffffff",
      "--sl-carte-ombre": "0 2px 10px rgba(20, 24, 40, 0.07)",
      "--sl-input-bg": "#f9fafc",
      "--sl-scrollbar-track": "#eef0f5",
      "--sl-scrollbar-thumb": "#c7cce0",
      "--sl-radius": "14px",
      "--sl-font": "'Inter', 'Segoe UI', system-ui, sans-serif",
      "--sl-overlay": "rgba(15, 18, 30, 0.45)",
    },
    sombre: {
      "--sl-bg": "#11131c",
      "--sl-bg-secondaire": "#181b27",
      "--sl-texte": "#e9eaf2",
      "--sl-texte-muted": "#9498ab",
      "--sl-primaire": "#6366f1",
      "--sl-primaire-hover": "#7c7ff5",
      "--sl-accent": "#22d3ee",
      "--sl-danger": "#f87171",
      "--sl-succes": "#4ade80",
      "--sl-bordure": "#2a2e3f",
      "--sl-carte-bg": "#1c2030",
      "--sl-carte-ombre": "0 4px 18px rgba(0, 0, 0, 0.45)",
      "--sl-input-bg": "#10121c",
      "--sl-scrollbar-track": "#181b27",
      "--sl-scrollbar-thumb": "#3a3f56",
      "--sl-radius": "14px",
      "--sl-font": "'Inter', 'Segoe UI', system-ui, sans-serif",
      "--sl-overlay": "rgba(0, 0, 0, 0.6)",
    },
    cyberpunk: {
      "--sl-bg": "#08010d",
      "--sl-bg-secondaire": "#120319",
      "--sl-texte": "#f1f0ff",
      "--sl-texte-muted": "#b48cff",
      "--sl-primaire": "#ff2a6d",
      "--sl-primaire-hover": "#ff5c8a",
      "--sl-accent": "#05f5ff",
      "--sl-danger": "#ff2a6d",
      "--sl-succes": "#39ff88",
      "--sl-bordure": "#3d0a4e",
      "--sl-carte-bg": "#150421",
      "--sl-carte-ombre": "0 0 20px rgba(255, 42, 109, 0.25), 0 0 40px rgba(5, 245, 255, 0.08)",
      "--sl-input-bg": "#0c0212",
      "--sl-scrollbar-track": "#150421",
      "--sl-scrollbar-thumb": "#ff2a6d",
      "--sl-radius": "4px",
      "--sl-font": "'Orbitron', 'Consolas', monospace",
      "--sl-overlay": "rgba(8, 1, 13, 0.75)",
    },
    retro: {
      "--sl-bg": "#000000",
      "--sl-bg-secondaire": "#020a02",
      "--sl-texte": "#33ff33",
      "--sl-texte-muted": "#1f9d1f",
      "--sl-primaire": "#33ff33",
      "--sl-primaire-hover": "#5fff5f",
      "--sl-accent": "#00ff90",
      "--sl-danger": "#ff3333",
      "--sl-succes": "#33ff33",
      "--sl-bordure": "#1a4d1a",
      "--sl-carte-bg": "#021002",
      "--sl-carte-ombre": "0 0 12px rgba(51, 255, 51, 0.2)",
      "--sl-input-bg": "#000000",
      "--sl-scrollbar-track": "#020a02",
      "--sl-scrollbar-thumb": "#1f9d1f",
      "--sl-radius": "0px",
      "--sl-font": "'Courier New', 'Lucida Console', monospace",
      "--sl-overlay": "rgba(0, 0, 0, 0.8)",
    },
    dracula: {
      "--sl-bg": "#282a36",
      "--sl-bg-secondaire": "#21222c",
      "--sl-texte": "#f8f8f2",
      "--sl-texte-muted": "#9aa0b0",
      "--sl-primaire": "#bd93f9",
      "--sl-primaire-hover": "#caa9fa",
      "--sl-accent": "#8be9fd",
      "--sl-danger": "#ff5555",
      "--sl-succes": "#50fa7b",
      "--sl-bordure": "#3b3d4d",
      "--sl-carte-bg": "#343746",
      "--sl-carte-ombre": "0 4px 16px rgba(0, 0, 0, 0.5)",
      "--sl-input-bg": "#1e1f29",
      "--sl-scrollbar-track": "#21222c",
      "--sl-scrollbar-thumb": "#6272a4",
      "--sl-radius": "12px",
      "--sl-font": "'Fira Code', 'Inter', system-ui, sans-serif",
      "--sl-overlay": "rgba(0, 0, 0, 0.6)",
    },
  };

  /**
   * Applique un thème donné en injectant ses variables CSS sur l'élément
   * racine (:root) via l'attribut style inline du document.documentElement.
   * Émet l'événement interne `onThemeChange` après application.
   * @param {string} nomTheme - Nom du thème ("clair", "sombre", "cyberpunk", "retro", "dracula").
   * @returns {boolean} true si le thème a été trouvé et appliqué.
   * @private
   */
  function _appliquerTheme(nomTheme) {
    const theme = THEMES[nomTheme];
    if (!theme) {
      console.warn(
        "[SocialLang] Thème inconnu : '" +
          nomTheme +
          "'. Thèmes disponibles : " +
          Object.keys(THEMES).join(", ")
      );
      return false;
    }
    const root = document.documentElement;
    Object.keys(theme).forEach((variable) => {
      root.style.setProperty(variable, theme[variable]);
    });
    root.setAttribute("data-sociallang-theme", nomTheme);
    _state.activeTheme = nomTheme;
    _ecrireStockage(LS_KEYS.THEME, nomTheme);
    _emettreEvenement("onThemeChange", { theme: nomTheme });
    return true;
  }

  /* ==========================================================================
   *  SECTION 9 — INJECTION DES STYLES CSS GLOBAUX
   * ======================================================================== */

  /**
   * Construit et retourne la feuille de style CSS complète du framework.
   * Cette feuille s'appuie exclusivement sur les variables CSS définies par
   * le moteur de thèmes (Section 8), ce qui permet une bascule de thème
   * instantanée sans jamais avoir à régénérer le CSS.
   * @returns {string} CSS complet à injecter.
   * @private
   */
  function _construireCSSGlobal() {
    return `
/* ===================== SOCIALLANG v${VERSION} — STYLES GLOBAUX ===================== */

[data-sociallang-root] {
  font-family: var(--sl-font);
  color: var(--sl-texte);
  box-sizing: border-box;
}

[data-sociallang-root] *,
[data-sociallang-root] *::before,
[data-sociallang-root] *::after {
  box-sizing: border-box;
  font-family: inherit;
}

/* ---- Scrollbars personnalisées ---- */
[data-sociallang-root] ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
[data-sociallang-root] ::-webkit-scrollbar-track {
  background: var(--sl-scrollbar-track);
  border-radius: 10px;
}
[data-sociallang-root] ::-webkit-scrollbar-thumb {
  background: var(--sl-scrollbar-thumb);
  border-radius: 10px;
  transition: background 0.3s ease;
}
[data-sociallang-root] ::-webkit-scrollbar-thumb:hover {
  background: var(--sl-primaire);
}
[data-sociallang-root] {
  scrollbar-width: thin;
  scrollbar-color: var(--sl-scrollbar-thumb) var(--sl-scrollbar-track);
}

/* ---- Conteneurs principaux ---- */
.sl-app {
  background: var(--sl-bg);
  min-height: 100%;
  padding: 24px 16px 64px;
  transition: background 0.3s ease, color 0.3s ease;
}

.sl-conteneur {
  max-width: 720px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ---- Animations de fondu ---- */
@keyframes sl-fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes sl-fadeInScale {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes sl-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.45); }
  70%  { box-shadow: 0 0 0 10px rgba(99, 102, 241, 0); }
  100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
}
@keyframes sl-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes sl-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-6px); }
  40%, 80% { transform: translateX(6px); }
}
@keyframes sl-heartPop {
  0%   { transform: scale(1); }
  35%  { transform: scale(1.35); }
  60%  { transform: scale(0.92); }
  100% { transform: scale(1); }
}

.sl-anim-fadein { animation: sl-fadeIn 0.35s ease both; }
.sl-anim-fadeinscale { animation: sl-fadeInScale 0.3s ease both; }
.sl-anim-shake { animation: sl-shake 0.4s ease; }

/* ---- Cartes (Cards) ---- */
.sl-carte {
  background: var(--sl-carte-bg);
  border: 1px solid var(--sl-bordure);
  border-radius: var(--sl-radius);
  box-shadow: var(--sl-carte-ombre);
  padding: 18px 20px;
  transition: transform 0.3s ease, box-shadow 0.3s ease, background 0.3s ease, border-color 0.3s ease;
}

.sl-carte:hover {
  transform: translateY(-2px);
}

.sl-carte-post {
  animation: sl-fadeIn 0.4s ease both;
}

.sl-post-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.sl-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--sl-primaire);
  background: var(--sl-bg-secondaire);
  flex-shrink: 0;
  transition: transform 0.3s ease, border-color 0.3s ease;
}
.sl-avatar:hover {
  transform: scale(1.08) rotate(-2deg);
}

.sl-avatar-sm {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--sl-bordure);
  flex-shrink: 0;
}

.sl-post-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sl-post-pseudo {
  font-weight: 700;
  font-size: 0.97rem;
  color: var(--sl-texte);
  display: flex;
  align-items: center;
  gap: 6px;
}

.sl-post-date {
  font-size: 0.78rem;
  color: var(--sl-texte-muted);
}

.sl-post-contenu {
  font-size: 0.96rem;
  line-height: 1.55;
  color: var(--sl-texte);
  white-space: pre-wrap;
  word-break: break-word;
  margin-bottom: 12px;
}

.sl-post-image {
  width: 100%;
  border-radius: calc(var(--sl-radius) - 4px);
  margin-bottom: 12px;
  display: block;
  max-height: 420px;
  object-fit: cover;
}

.sl-post-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  border-top: 1px solid var(--sl-bordure);
  padding-top: 10px;
}

.sl-badge-censure {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 20px;
  background: color-mix(in srgb, var(--sl-danger) 18%, transparent);
  color: var(--sl-danger);
  border: 1px solid var(--sl-danger);
}

.sl-badge-en-ligne {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--sl-succes);
  display: inline-block;
  box-shadow: 0 0 0 2px var(--sl-carte-bg);
  animation: sl-pulse 2s infinite;
}

/* ---- Boutons ---- */
.sl-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: calc(var(--sl-radius) * 0.65 + 4px);
  border: 1.5px solid transparent;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  transition: background 0.3s ease, color 0.3s ease, border-color 0.3s ease,
    transform 0.15s ease, box-shadow 0.3s ease;
  background: var(--sl-bg-secondaire);
  color: var(--sl-texte);
  border-color: var(--sl-bordure);
}
.sl-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(0,0,0,0.12);
}
.sl-btn:active {
  transform: translateY(0px) scale(0.97);
}
.sl-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.sl-btn-primaire {
  background: var(--sl-primaire);
  border-color: var(--sl-primaire);
  color: #ffffff;
}
.sl-btn-primaire:hover {
  background: var(--sl-primaire-hover);
  border-color: var(--sl-primaire-hover);
}

.sl-btn-ghost {
  background: transparent;
  border-color: var(--sl-bordure);
  color: var(--sl-texte-muted);
}
.sl-btn-ghost:hover {
  color: var(--sl-texte);
  border-color: var(--sl-primaire);
}

.sl-btn-danger {
  background: transparent;
  border-color: var(--sl-danger);
  color: var(--sl-danger);
}
.sl-btn-danger:hover {
  background: var(--sl-danger);
  color: #fff;
}

.sl-btn-full { width: 100%; }
.sl-btn-sm { padding: 6px 12px; font-size: 0.8rem; }

.sl-btn-like {
  background: transparent;
  border-color: var(--sl-bordure);
  color: var(--sl-texte-muted);
}
.sl-btn-like.sl-like-actif {
  background: color-mix(in srgb, var(--sl-danger) 12%, transparent);
  border-color: var(--sl-danger);
  color: var(--sl-danger);
}
.sl-btn-like.sl-like-actif .sl-icone-coeur {
  animation: sl-heartPop 0.4s ease;
}

.sl-btn-icone-only {
  width: 38px;
  height: 38px;
  padding: 0;
  border-radius: 50%;
}

/* ---- Inputs ---- */
.sl-input,
.sl-textarea,
.sl-select {
  width: 100%;
  background: var(--sl-input-bg);
  color: var(--sl-texte);
  border: 1.5px solid var(--sl-bordure);
  border-radius: calc(var(--sl-radius) * 0.55 + 2px);
  padding: 11px 14px;
  font-size: 0.92rem;
  outline: none;
  transition: border-color 0.3s ease, box-shadow 0.3s ease, background 0.3s ease;
}
.sl-input::placeholder,
.sl-textarea::placeholder {
  color: var(--sl-texte-muted);
  opacity: 0.85;
}
.sl-input:focus,
.sl-textarea:focus,
.sl-select:focus {
  border-color: var(--sl-primaire);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sl-primaire) 22%, transparent);
}

.sl-textarea {
  resize: vertical;
  min-height: 64px;
  max-height: 320px;
  line-height: 1.5;
  font-family: inherit;
}

.sl-input-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.sl-input-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--sl-texte-muted);
}

.sl-input-erreur {
  font-size: 0.78rem;
  color: var(--sl-danger);
  min-height: 16px;
}

.sl-champ-compteur {
  font-size: 0.74rem;
  color: var(--sl-texte-muted);
  text-align: right;
}

/* ---- Boîte d'authentification ---- */
.sl-auth-box {
  max-width: 420px;
  margin: 0 auto;
  animation: sl-fadeInScale 0.35s ease both;
}

.sl-auth-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 18px;
  background: var(--sl-bg-secondaire);
  border-radius: 999px;
  padding: 4px;
  border: 1px solid var(--sl-bordure);
}

.sl-auth-tab {
  flex: 1;
  text-align: center;
  padding: 9px 0;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--sl-texte-muted);
  transition: background 0.3s ease, color 0.3s ease;
  user-select: none;
}

.sl-auth-tab.sl-tab-actif {
  background: var(--sl-primaire);
  color: #fff;
}

.sl-auth-titre {
  font-size: 1.3rem;
  font-weight: 800;
  margin-bottom: 4px;
}

.sl-auth-sous-titre {
  font-size: 0.85rem;
  color: var(--sl-texte-muted);
  margin-bottom: 18px;
}

.sl-profil-box {
  display: flex;
  align-items: center;
  gap: 14px;
}

.sl-profil-infos {
  flex: 1;
  min-width: 0;
}

.sl-profil-nom {
  font-weight: 800;
  font-size: 1.05rem;
}

.sl-profil-sous {
  font-size: 0.8rem;
  color: var(--sl-texte-muted);
}

/* ---- Sélecteur de thème ---- */
.sl-theme-switch {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.sl-theme-dot {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  cursor: pointer;
  border: 2px solid var(--sl-bordure);
  transition: transform 0.3s ease, border-color 0.3s ease;
  position: relative;
}
.sl-theme-dot:hover { transform: scale(1.12); }
.sl-theme-dot.sl-theme-dot-actif {
  border-color: var(--sl-primaire);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sl-primaire) 25%, transparent);
}

/* ---- Zone de publication ---- */
.sl-publier-box .sl-post-header { margin-bottom: 12px; }

.sl-publier-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

/* ---- Recherche ---- */
.sl-recherche-wrap {
  position: relative;
}
.sl-recherche-icone {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.6;
  pointer-events: none;
  font-size: 0.95rem;
}
.sl-recherche-wrap .sl-input {
  padding-left: 38px;
}

/* ---- Commentaires ---- */
.sl-comments-zone {
  margin-top: 10px;
  border-top: 1px dashed var(--sl-bordure);
  padding-top: 12px;
  display: none;
  flex-direction: column;
  gap: 10px;
  animation: sl-fadeIn 0.3s ease both;
}
.sl-comments-zone.sl-comments-ouvert {
  display: flex;
}

.sl-comment-item {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  animation: sl-fadeIn 0.25s ease both;
}

.sl-comment-bulle {
  background: var(--sl-bg-secondaire);
  border: 1px solid var(--sl-bordure);
  border-radius: 12px;
  padding: 8px 12px;
  flex: 1;
  min-width: 0;
}

.sl-comment-pseudo {
  font-weight: 700;
  font-size: 0.82rem;
  margin-bottom: 2px;
}

.sl-comment-texte {
  font-size: 0.85rem;
  line-height: 1.4;
  word-break: break-word;
  white-space: pre-wrap;
}

.sl-comment-form {
  display: flex;
  gap: 8px;
  align-items: center;
}
.sl-comment-form .sl-input { flex: 1; }

.sl-comment-vide {
  font-size: 0.82rem;
  color: var(--sl-texte-muted);
  text-align: center;
  padding: 6px 0;
}

/* ---- États vides / chargements ---- */
.sl-etat-vide {
  text-align: center;
  padding: 40px 20px;
  color: var(--sl-texte-muted);
  font-size: 0.92rem;
}

.sl-spinner {
  width: 18px;
  height: 18px;
  border: 2.5px solid var(--sl-bordure);
  border-top-color: var(--sl-primaire);
  border-radius: 50%;
  animation: sl-spin 0.7s linear infinite;
  display: inline-block;
}

.sl-toast {
  position: fixed;
  bottom: 24px;
  right: 24px;
  background: var(--sl-carte-bg);
  color: var(--sl-texte);
  border: 1px solid var(--sl-bordure);
  border-left: 4px solid var(--sl-primaire);
  border-radius: 10px;
  padding: 12px 18px;
  box-shadow: var(--sl-carte-ombre);
  font-size: 0.88rem;
  z-index: 99999;
  animation: sl-fadeInScale 0.3s ease both;
  max-width: 320px;
}
.sl-toast.sl-toast-erreur { border-left-color: var(--sl-danger); }
.sl-toast.sl-toast-succes { border-left-color: var(--sl-succes); }

/* ---- En-tête de l'application ---- */
.sl-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.sl-topbar-titre {
  font-size: 1.25rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sl-topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ---- Responsive ---- */
@media (max-width: 640px) {
  .sl-app { padding: 14px 8px 48px; }
  .sl-conteneur { gap: 14px; }
  .sl-carte { padding: 14px; }
  .sl-avatar { width: 38px; height: 38px; }
  .sl-topbar-titre { font-size: 1.05rem; }
  .sl-btn { padding: 9px 14px; font-size: 0.85rem; }
  .sl-toast { right: 12px; left: 12px; bottom: 12px; max-width: none; }
  .sl-auth-box { max-width: 100%; }
}

@media (max-width: 400px) {
  .sl-profil-box { flex-wrap: wrap; }
  .sl-post-actions { flex-wrap: wrap; }
}
`;
  }

  /**
   * Injecte la feuille de style globale dans le <head> du document si elle
   * n'a pas déjà été injectée (idempotent). Crée également l'élément
   * <style> dédié aux variables du thème actif.
   * @private
   */
  function _injecterStylesGlobaux() {
    if (_state.stylesInjected) return;
    const styleEl = document.createElement("style");
    styleEl.setAttribute("data-sociallang-style", "global");
    styleEl.setAttribute("id", "sociallang-style-global");
    styleEl.textContent = _construireCSSGlobal();
    document.head.appendChild(styleEl);
    _state.stylesInjected = true;
  }

  /* ==========================================================================
   *  SECTION 10 — SYSTÈME D'ÉVÉNEMENTS INTERNE
   * ======================================================================== */

  /**
   * Émet un événement interne et appelle tous les écouteurs enregistrés
   * pour ce type d'événement via `SocialLang.on()`.
   * @param {string} type - Type d'événement ("onLogin", "onLogout", "onNewPost", "onThemeChange").
   * @param {Object} [detail={}] - Données associées à l'événement.
   * @private
   */
  function _emettreEvenement(type, detail) {
    const ecouteurs = _state.listeners[type];
    if (!Array.isArray(ecouteurs)) return;
    ecouteurs.forEach((fn) => {
      try {
        fn(detail || {});
      } catch (e) {
        console.error("[SocialLang] Erreur dans un écouteur '" + type + "' :", e);
      }
    });
  }

  /* ==========================================================================
   *  SECTION 11 — MODULE COMPTES, SESSIONS & AVATARS
   * ======================================================================== */

  /**
   * Récupère la liste complète des utilisateurs enregistrés depuis le
   * stockage persistant.
   * @returns {Array<Object>} Liste des utilisateurs.
   * @private
   */
  function _obtenirUtilisateurs() {
    return _lireStockage(LS_KEYS.USERS, []);
  }

  /**
   * Persiste la liste complète des utilisateurs.
   * @param {Array<Object>} utilisateurs - Liste à sauvegarder.
   * @private
   */
  function _sauvegarderUtilisateurs(utilisateurs) {
    _ecrireStockage(LS_KEYS.USERS, utilisateurs);
  }

  /**
   * Génère l'URL d'avatar automatique pour un pseudo donné via l'API
   * publique DiceBear. Le seed est dérivé du pseudo nettoyé afin que le
   * même pseudo génère toujours le même avatar visuel.
   * @param {string} pseudo - Pseudo de l'utilisateur.
   * @returns {string} URL de l'avatar SVG généré.
   * @private
   */
  function _genererAvatarURL(pseudo) {
    const fournisseur =
      (_state.config && _state.config.avatarProvider) ||
      DEFAULT_CONFIG.avatarProvider;
    const seed = encodeURIComponent((pseudo || "invite").toLowerCase().trim());
    return fournisseur + seed;
  }

  /**
   * Recherche un utilisateur par son pseudo (insensible à la casse).
   * @param {string} pseudo - Pseudo recherché.
   * @returns {Object|undefined} Utilisateur trouvé, ou undefined.
   * @private
   */
  function _trouverUtilisateurParPseudo(pseudo) {
    const pseudoNormalise = (pseudo || "").toLowerCase().trim();
    return _obtenirUtilisateurs().find(
      (u) => u.pseudo.toLowerCase().trim() === pseudoNormalise
    );
  }

  /**
   * Inscrit un nouvel utilisateur. Effectue la validation, le nettoyage
   * anti-XSS du pseudo, la vérification d'unicité, le hash du mot de passe
   * de démonstration, et la génération automatique de l'avatar.
   * @param {string} pseudoBrut - Pseudo saisi.
   * @param {string} motDePasseBrut - Mot de passe saisi.
   * @returns {{succes: boolean, message: string, utilisateur?: Object}} Résultat de l'opération.
   * @public
   */
  function inscrireUtilisateur(pseudoBrut, motDePasseBrut) {
    const pseudo = _nettoyerPseudo(pseudoBrut);
    const motDePasse = typeof motDePasseBrut === "string" ? motDePasseBrut : "";

    if (!pseudo) {
      return { succes: false, message: _t("pseudoRequis") };
    }
    if (motDePasse.length < 4) {
      return { succes: false, message: _t("motDePasseRequis") };
    }
    if (_trouverUtilisateurParPseudo(pseudo)) {
      return { succes: false, message: _t("pseudoExistant") };
    }

    const utilisateurs = _obtenirUtilisateurs();
    const nouvelUtilisateur = {
      id: _genererId("user"),
      pseudo: pseudo,
      motDePasseHash: _hashSimple(motDePasse),
      avatar: _genererAvatarURL(pseudo),
      dateInscription: new Date().toISOString(),
      bio: "",
    };
    utilisateurs.push(nouvelUtilisateur);
    _sauvegarderUtilisateurs(utilisateurs);

    return { succes: true, message: "Inscription réussie.", utilisateur: nouvelUtilisateur };
  }

  /**
   * Connecte un utilisateur existant après vérification du pseudo et du
   * hash du mot de passe. Persiste la session dans le localStorage afin
   * qu'elle survive au rechargement de la page.
   * @param {string} pseudoBrut - Pseudo saisi.
   * @param {string} motDePasseBrut - Mot de passe saisi.
   * @returns {{succes: boolean, message: string, utilisateur?: Object}} Résultat de l'opération.
   * @public
   */
  function connecterUtilisateur(pseudoBrut, motDePasseBrut) {
    const pseudo = _nettoyerPseudo(pseudoBrut);
    const motDePasse = typeof motDePasseBrut === "string" ? motDePasseBrut : "";
    const utilisateur = _trouverUtilisateurParPseudo(pseudo);

    if (!utilisateur || utilisateur.motDePasseHash !== _hashSimple(motDePasse)) {
      return { succes: false, message: _t("identifiantsInvalides") };
    }

    _state.currentUser = utilisateur;
    if (_state.config.persistanceActive) {
      _ecrireStockage(LS_KEYS.SESSION, { userId: utilisateur.id });
    }
    _emettreEvenement("onLogin", { utilisateur });
    return { succes: true, message: "Connexion réussie.", utilisateur };
  }

  /**
   * Déconnecte l'utilisateur courant et supprime la session persistée.
   * @public
   */
  function deconnecterUtilisateur() {
    const ancienUtilisateur = _state.currentUser;
    _state.currentUser = null;
    _supprimerStockage(LS_KEYS.SESSION);
    _emettreEvenement("onLogout", { ancienUtilisateur });
  }

  /**
   * Restaure automatiquement la session utilisateur depuis le localStorage
   * si une session valide y est présente (appelé lors de l'initialisation).
   * @private
   */
  function _restaurerSession() {
    if (!_state.config.persistanceActive) return;
    const session = _lireStockage(LS_KEYS.SESSION, null);
    if (!session || !session.userId) return;
    const utilisateurs = _obtenirUtilisateurs();
    const utilisateur = utilisateurs.find((u) => u.id === session.userId);
    if (utilisateur) {
      _state.currentUser = utilisateur;
    } else {
      _supprimerStockage(LS_KEYS.SESSION);
    }
  }

  /**
   * Retourne l'utilisateur actuellement connecté.
   * @returns {Object|null} Utilisateur connecté, ou null si personne n'est connecté.
   * @public
   */
  function obtenirUtilisateurCourant() {
    return _state.currentUser;
  }

  /* ==========================================================================
   *  SECTION 12 — MODULE GESTION DU FLUX : DONNÉES & CACHE LOCAL
   * ======================================================================== */

  /**
   * Jeu de données de démonstration préchargé au premier lancement du
   * framework (si aucune publication n'existe encore en stockage). Fournit
   * un fil d'actualité réaliste et varié dès l'ouverture de la page.
   * @returns {Array<Object>} Liste de publications fictives.
   * @private
   */
  function _genererJeuDeDonneesInitial() {
    const maintenant = Date.now();
    const minute = 60 * 1000;
    const heure = 60 * minute;
    const jour = 24 * heure;

    const utilisateursDemo = [
      { pseudo: "Mila_Voyage", bio: "Globe-trotteuse 🌍" },
      { pseudo: "TechWithLeo", bio: "Dev front-end & café ☕" },
      { pseudo: "Chef_Antoine", bio: "Cuisine maison tous les jours" },
      { pseudo: "Sarah_Pixel", bio: "Illustratrice numérique 🎨" },
      { pseudo: "Nico_Runner", bio: "42km ou rien 🏃" },
    ];

    const contenus = [
      "Coucou tout le monde ! Petit aperçu de mon voyage à Kyoto ce matin, la lumière était incroyable au temple Fushimi Inari ⛩️ Qui est déjà allé au Japon ?",
      "Je viens de finir de refactoriser tout mon projet en passant de classes JS classiques à des hooks personnalisés. Le code est deux fois plus lisible, je valide à 100% cette approche pour vos prochains projets !",
      "Recette du jour : risotto aux champignons et parmesan affiné 24 mois. Le secret c'est de ne JAMAIS arrêter de remuer pendant la cuisson du riz, sinon il accroche au fond de la casserole.",
      "Nouvelle illustration terminée après 14h de travail ! Un dragon de cristal dans une forêt enneigée. Dites-moi ce que vous en pensez, vos retours comptent énormément pour moi 💙",
      "Objectif marathon de Paris atteint en 3h42 ! Un immense merci à tous ceux qui m'ont soutenu pendant cette préparation de 6 mois, les jambes sont cassées mais le cœur est plein de joie 🏅",
      "Petit tip du jour pour les devs : utilisez `Array.prototype.reduce` pour transformer vos tableaux de données complexes en objets indexés, ça change la vie pour les recherches O(1) !",
      "Aujourd'hui j'ai testé une nouvelle pâte à pizza avec 72h de pousse au frigo, le résultat est juste bluffant, la pâte est aérienne et croustillante à la fois.",
      "Petit carnet de croquis rapide pendant ma pause déjeuner, j'adore capturer des scènes de rue improvisées, c'est un excellent exercice pour le mouvement et les proportions.",
    ];

    const images = [
      "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?w=800&q=60",
      null,
      "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&q=60",
      "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=60",
      null,
    ];

    const posts = [
      {
        id: _genererId("post"),
        auteur: utilisateursDemo[0].pseudo,
        avatar: _genererAvatarURL(utilisateursDemo[0].pseudo),
        contenu: contenus[0],
        image: images[0],
        date: new Date(maintenant - 2 * heure - 14 * minute).toISOString(),
        likes: [],
        moderePar: false,
      },
      {
        id: _genererId("post"),
        auteur: utilisateursDemo[1].pseudo,
        avatar: _genererAvatarURL(utilisateursDemo[1].pseudo),
        contenu: contenus[1],
        image: null,
        date: new Date(maintenant - 5 * heure - 2 * minute).toISOString(),
        likes: [],
        moderePar: false,
      },
      {
        id: _genererId("post"),
        auteur: utilisateursDemo[2].pseudo,
        avatar: _genererAvatarURL(utilisateursDemo[2].pseudo),
        contenu: contenus[2],
        image: images[2],
        date: new Date(maintenant - 1 * jour - 3 * heure).toISOString(),
        likes: [],
        moderePar: false,
      },
      {
        id: _genererId("post"),
        auteur: utilisateursDemo[3].pseudo,
        avatar: _genererAvatarURL(utilisateursDemo[3].pseudo),
        contenu: contenus[3],
        image: images[3],
        date: new Date(maintenant - 1 * jour - 9 * heure).toISOString(),
        likes: [],
        moderePar: false,
      },
      {
        id: _genererId("post"),
        auteur: utilisateursDemo[4].pseudo,
        avatar: _genererAvatarURL(utilisateursDemo[4].pseudo),
        contenu: contenus[4],
        image: null,
        date: new Date(maintenant - 2 * jour - 1 * heure).toISOString(),
        likes: [],
        moderePar: false,
      },
      {
        id: _genererId("post"),
        auteur: utilisateursDemo[1].pseudo,
        avatar: _genererAvatarURL(utilisateursDemo[1].pseudo),
        contenu: contenus[5],
        image: null,
        date: new Date(maintenant - 3 * jour - 4 * heure).toISOString(),
        likes: [],
        moderePar: false,
      },
      {
        id: _genererId("post"),
        auteur: utilisateursDemo[2].pseudo,
        avatar: _genererAvatarURL(utilisateursDemo[2].pseudo),
        contenu: contenus[6],
        image: images[0],
        date: new Date(maintenant - 4 * jour - 6 * heure).toISOString(),
        likes: [],
        moderePar: false,
      },
      {
        id: _genererId("post"),
        auteur: utilisateursDemo[3].pseudo,
        avatar: _genererAvatarURL(utilisateursDemo[3].pseudo),
        contenu: contenus[7],
        image: null,
        date: new Date(maintenant - 5 * jour - 11 * heure).toISOString(),
        likes: [],
        moderePar: false,
      },
    ];

    return posts;
  }

  /**
   * Jeu de commentaires de démonstration associés au jeu de données initial,
   * apportant un fil de discussion réaliste sous certaines publications dès
   * le premier chargement.
   * @param {Array<Object>} posts - Liste des publications déjà générées.
   * @returns {Object<string, Array<Object>>} Commentaires indexés par identifiant de post.
   * @private
   */
  function _genererCommentairesInitiaux(posts) {
    const commentaires = {};
    if (posts.length >= 1) {
      commentaires[posts[0].id] = [
        {
          id: _genererId("com"),
          auteur: "TechWithLeo",
          avatar: _genererAvatarURL("TechWithLeo"),
          contenu: "Magnifique ! Kyoto est sur ma liste depuis des années 😍",
          date: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        },
        {
          id: _genererId("com"),
          auteur: "Sarah_Pixel",
          avatar: _genererAvatarURL("Sarah_Pixel"),
          contenu: "Les couleurs de cette photo donnent vraiment envie de dessiner !",
          date: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        },
      ];
    }
    if (posts.length >= 3) {
      commentaires[posts[2].id] = [
        {
          id: _genererId("com"),
          auteur: "Nico_Runner",
          avatar: _genererAvatarURL("Nico_Runner"),
          contenu: "Je tente ça ce week-end, merci pour l'astuce du remuage !",
          date: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        },
      ];
    }
    return commentaires;
  }

  /**
   * Hydrate le cache mémoire des publications depuis le stockage
   * persistant. Si aucune donnée n'existe encore, précharge le jeu de
   * données de démonstration (posts + commentaires) afin que l'interface
   * ne soit jamais vide au premier lancement.
   * @private
   */
  function _hydraterCache() {
    if (_state.cacheHydrated) return;

    let posts = _lireStockage(LS_KEYS.POSTS, null);
    let dejaInitialise = _lireStockage(LS_KEYS.CACHE_MARKER, false);

    if (!posts || !Array.isArray(posts) || posts.length === 0) {
      posts = _genererJeuDeDonneesInitial();
      const commentairesInitiaux = _genererCommentairesInitiaux(posts);
      _ecrireStockage(LS_KEYS.POSTS, posts);
      _ecrireStockage(LS_KEYS.COMMENTS, commentairesInitiaux);
      _ecrireStockage(LS_KEYS.CACHE_MARKER, true);
      dejaInitialise = true;
    }

    _state.postsCache = posts;
    _state.cacheHydrated = true;

    if (_state.config && _state.config.debug) {
      console.info(
        "[SocialLang] Cache hydraté avec " +
          posts.length +
          " publication(s). Première initialisation : " +
          (!dejaInitialise ? "oui" : "non")
      );
    }
  }

  /**
   * Persiste l'état courant du cache mémoire des publications dans le
   * stockage local, afin de simuter une mise en cache locale évitant les
   * rechargements réseau inutiles à chaque interaction.
   * @private
   */
  function _persisterCachePosts() {
    _ecrireStockage(LS_KEYS.POSTS, _state.postsCache);
  }

  /**
   * Retourne la liste des commentaires indexés par identifiant de post.
   * @returns {Object<string, Array<Object>>} Commentaires.
   * @private
   */
  function _obtenirTousLesCommentaires() {
    return _lireStockage(LS_KEYS.COMMENTS, {});
  }

  /**
   * Persiste la map complète des commentaires.
   * @param {Object<string, Array<Object>>} commentairesMap - Map à sauvegarder.
   * @private
   */
  function _sauvegarderCommentaires(commentairesMap) {
    _ecrireStockage(LS_KEYS.COMMENTS, commentairesMap);
  }

  /* ==========================================================================
   *  SECTION 13 — MODULE GESTION DU FLUX : OPÉRATIONS SUR LES PUBLICATIONS
   * ======================================================================== */

  /**
   * Trie un tableau de publications du plus récent au plus ancien
   * (ordre antéchronologique), sans muter le tableau d'origine.
   * @param {Array<Object>} posts - Publications à trier.
   * @returns {Array<Object>} Nouveau tableau trié.
   * @private
   */
  function _trierPostsParDate(posts) {
    return [...posts].sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  /**
   * Crée une nouvelle publication pour l'utilisateur courant, applique le
   * nettoyage anti-XSS et la modération automatique par regex, puis insère
   * la publication en tête du cache mémoire (les plus récentes en premier)
   * avant de persister le résultat.
   * @param {string} contenuBrut - Texte saisi par l'utilisateur.
   * @param {string} [imageURL] - URL optionnelle d'image jointe à la publication.
   * @returns {{succes: boolean, message: string, post?: Object}} Résultat de l'opération.
   * @public
   */
  function publierMessage(contenuBrut, imageURL) {
    if (!_state.currentUser) {
      return { succes: false, message: "Vous devez être connecté pour publier." };
    }
    const maxLongueur =
      (_state.config && _state.config.maxLongueurPost) || DEFAULT_CONFIG.maxLongueurPost;
    const contenuNettoye = _nettoyerTexteLibre(contenuBrut, maxLongueur);

    if (!contenuNettoye) {
      return { succes: false, message: "Le contenu de la publication est vide." };
    }

    let contenuFinal = contenuNettoye;
    let moderePar = false;
    if (_state.config.moderationActive) {
      const { texteModere, aEteModere } = _modererTexte(contenuNettoye);
      contenuFinal = texteModere;
      moderePar = aEteModere;
    }

    _hydraterCache();

    const nouveauPost = {
      id: _genererId("post"),
      auteur: _state.currentUser.pseudo,
      avatar: _state.currentUser.avatar,
      contenu: contenuFinal,
      image: typeof imageURL === "string" && imageURL.trim() ? imageURL.trim() : null,
      date: new Date().toISOString(),
      likes: [],
      moderePar: moderePar,
    };

    _state.postsCache.unshift(nouveauPost);
    _persisterCachePosts();
    _emettreEvenement("onNewPost", { post: nouveauPost });

    return { succes: true, message: "Publication envoyée.", post: nouveauPost };
  }

  /**
   * Retourne la liste des publications du cache, triées par date
   * décroissante et filtrées selon la requête de recherche active
   * (pseudo précédé de `@` ou simple mot-clé recherché dans le contenu).
   * @returns {Array<Object>} Publications filtrées et triées.
   * @public
   */
  function obtenirPostsAffiches() {
    _hydraterCache();
    let posts = _trierPostsParDate(_state.postsCache);

    const requete = (_state.searchQuery || "").trim().toLowerCase();
    if (!requete) return posts;

    if (requete.startsWith("@")) {
      const pseudoRecherche = requete.slice(1);
      return posts.filter((p) => p.auteur.toLowerCase().includes(pseudoRecherche));
    }

    return posts.filter(
      (p) =>
        p.contenu.toLowerCase().includes(requete) ||
        p.auteur.toLowerCase().includes(requete)
    );
  }

  /**
   * Met à jour la requête de recherche active utilisée pour filtrer le
   * flux de publications, puis redessine le flux si l'interface est montée.
   * @param {string} requete - Nouvelle requête de recherche (texte libre ou `@pseudo`).
   * @public
   */
  function rechercherDansLeFil(requete) {
    _state.searchQuery = typeof requete === "string" ? requete : "";
    _redessinerFluxSiPresent();
  }

  /* ==========================================================================
   *  SECTION 14 — MODULE INTERACTIONS : LIKES
   * ======================================================================== */

  /**
   * Bascule l'état de like d'un utilisateur sur une publication donnée.
   * Un même utilisateur ne peut liker qu'une seule fois (toggle on/off),
   * garantissant l'absence de likes multiples infinis sur une publication.
   * @param {string} postId - Identifiant de la publication.
   * @returns {{succes: boolean, message: string, likesCount?: number, estLike?: boolean}} Résultat.
   * @public
   */
  function toggleLike(postId) {
    if (!_state.currentUser) {
      return { succes: false, message: "Vous devez être connecté pour aimer une publication." };
    }
    _hydraterCache();
    const post = _state.postsCache.find((p) => p.id === postId);
    if (!post) {
      return { succes: false, message: "Publication introuvable." };
    }
    if (!Array.isArray(post.likes)) post.likes = [];

    const pseudo = _state.currentUser.pseudo;
    const indexExistant = post.likes.indexOf(pseudo);
    let estLike;
    if (indexExistant === -1) {
      post.likes.push(pseudo);
      estLike = true;
    } else {
      post.likes.splice(indexExistant, 1);
      estLike = false;
    }

    _persisterCachePosts();
    return { succes: true, message: "OK", likesCount: post.likes.length, estLike };
  }

  /* ==========================================================================
   *  SECTION 15 — MODULE INTERACTIONS : COMMENTAIRES IMBRIQUÉS
   * ======================================================================== */

  /**
   * Ajoute un commentaire à une publication donnée, après nettoyage
   * anti-XSS et modération automatique du contenu.
   * @param {string} postId - Identifiant de la publication commentée.
   * @param {string} contenuBrut - Texte du commentaire saisi.
   * @returns {{succes: boolean, message: string, commentaire?: Object}} Résultat de l'opération.
   * @public
   */
  function ajouterCommentaire(postId, contenuBrut) {
    if (!_state.currentUser) {
      return { succes: false, message: "Vous devez être connecté pour commenter." };
    }
    const maxLongueur =
      (_state.config && _state.config.maxLongueurCommentaire) ||
      DEFAULT_CONFIG.maxLongueurCommentaire;
    const contenuNettoye = _nettoyerTexteLibre(contenuBrut, maxLongueur);
    if (!contenuNettoye) {
      return { succes: false, message: "Le commentaire est vide." };
    }

    let contenuFinal = contenuNettoye;
    if (_state.config.moderationActive) {
      const { texteModere } = _modererTexte(contenuNettoye);
      contenuFinal = texteModere;
    }

    const commentairesMap = _obtenirTousLesCommentaires();
    if (!Array.isArray(commentairesMap[postId])) {
      commentairesMap[postId] = [];
    }

    const nouveauCommentaire = {
      id: _genererId("com"),
      auteur: _state.currentUser.pseudo,
      avatar: _state.currentUser.avatar,
      contenu: contenuFinal,
      date: new Date().toISOString(),
    };

    commentairesMap[postId].push(nouveauCommentaire);
    _sauvegarderCommentaires(commentairesMap);

    return { succes: true, message: "Commentaire ajouté.", commentaire: nouveauCommentaire };
  }

  /**
   * Retourne la liste des commentaires associés à une publication, triés
   * du plus ancien au plus récent (ordre chronologique naturel de
   * discussion).
   * @param {string} postId - Identifiant de la publication.
   * @returns {Array<Object>} Commentaires triés.
   * @public
   */
  function obtenirCommentaires(postId) {
    const commentairesMap = _obtenirTousLesCommentaires();
    const liste = Array.isArray(commentairesMap[postId]) ? commentairesMap[postId] : [];
    return [...liste].sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /* ==========================================================================
   *  SECTION 16 — UTILITAIRES D'AFFICHAGE
   * ======================================================================== */

  /**
   * Convertit une date ISO en chaîne lisible relative ("il y a 5 min",
   * "il y a 2h", "il y a 3j") ou en date complète localisée au-delà de 7
   * jours d'ancienneté.
   * @param {string} dateISO - Date au format ISO 8601.
   * @returns {string} Représentation lisible de la date.
   * @private
   */
  function _formaterDateRelative(dateISO) {
    const date = new Date(dateISO);
    if (isNaN(date.getTime())) return "";
    const maintenant = Date.now();
    const diffMs = maintenant - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHeure = Math.floor(diffMin / 60);
    const diffJour = Math.floor(diffHeure / 24);

    if (diffSec < 60) return _t("ilYA") + " quelques secondes";
    if (diffMin < 60) return _t("ilYA") + " " + diffMin + " min";
    if (diffHeure < 24) return _t("ilYA") + " " + diffHeure + "h";
    if (diffJour < 7) return _t("ilYA") + " " + diffJour + "j";

    const formatLocale = (_state.config && _state.config.dateFormat) || "fr-FR";
    return date.toLocaleDateString(formatLocale, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  /**
   * Résout un sélecteur CSS ou un élément DOM déjà résolu en élément DOM
   * unique. Lève une erreur explicite et parlante si la cible est
   * introuvable, afin de faciliter le débogage par l'intégrateur du
   * framework.
   * @param {string|HTMLElement} cibleOuSelecteur - Sélecteur CSS ou élément DOM.
   * @param {string} nomFonction - Nom de la fonction appelante (pour le message d'erreur).
   * @returns {HTMLElement} Élément DOM résolu.
   * @private
   */
  function _resoudreElement(cibleOuSelecteur, nomFonction) {
    let element = null;
    if (typeof cibleOuSelecteur === "string") {
      element = document.querySelector(cibleOuSelecteur);
    } else if (cibleOuSelecteur instanceof HTMLElement) {
      element = cibleOuSelecteur;
    }
    if (!element) {
      throw new Error(
        "[SocialLang] " +
          nomFonction +
          " : impossible de trouver l'élément cible '" +
          cibleOuSelecteur +
          "'. Vérifiez que le sélecteur correspond bien à un élément présent dans le DOM."
      );
    }
    return element;
  }

  /**
   * Affiche une notification toast éphémère en bas à droite de l'écran,
   * utilisée pour les retours de confirmation (succès) ou d'erreur.
   * @param {string} message - Message à afficher.
   * @param {"info"|"succes"|"erreur"} [type="info"] - Type de toast.
   * @param {number} [dureeMs=3200] - Durée d'affichage avant disparition.
   * @public
   */
  function afficherToast(message, type, dureeMs) {
    const toast = document.createElement("div");
    toast.className = "sl-toast" + (type === "erreur" ? " sl-toast-erreur" : type === "succes" ? " sl-toast-succes" : "");
    toast.setAttribute("data-sociallang-root", "");
    toast.textContent = message;
    document.body.appendChild(toast);
    const duree = typeof dureeMs === "number" ? dureeMs : 3200;
    setTimeout(() => {
      toast.style.transition = "opacity 0.3s ease, transform 0.3s ease";
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      setTimeout(() => toast.remove(), 320);
    }, duree);
  }

  /* ==========================================================================
   *  SECTION 17 — COMPOSANT UI : SYSTÈME D'AUTHENTIFICATION
   * ======================================================================== */

  /** @type {HTMLElement|null} Référence au conteneur d'authentification monté. */
  let _authContainerRef = null;

  /** @type {"connexion"|"inscription"} Onglet actif dans la boîte d'authentification. */
  let _authOngletActif = "connexion";

  /**
   * Construit le HTML interne de la boîte d'authentification (formulaire de
   * connexion ou d'inscription selon l'onglet actif), ou la carte de profil
   * si un utilisateur est déjà connecté.
   * @returns {string} Fragment HTML.
   * @private
   */
  function _construireHTMLAuth() {
    const nomReseau = (_state.config && _state.config.nomReseau) || DEFAULT_CONFIG.nomReseau;

    if (_state.currentUser) {
      const u = _state.currentUser;
      return `
        <div class="sl-carte sl-auth-box sl-anim-fadeinscale">
          <div class="sl-profil-box">
            <img class="sl-avatar" src="${_echapperHTML(u.avatar)}" alt="avatar de ${_echapperHTML(u.pseudo)}" />
            <div class="sl-profil-infos">
              <div class="sl-profil-nom">${_echapperHTML(u.pseudo)}</div>
              <div class="sl-profil-sous">
                <span class="sl-badge-en-ligne" style="margin-right:6px;"></span>
                Connecté à ${_echapperHTML(nomReseau)}
              </div>
            </div>
            <button type="button" class="sl-btn sl-btn-danger sl-btn-sm" data-sl-action="logout">
              ${_echapperHTML(_t("deconnexion"))}
            </button>
          </div>
        </div>
      `;
    }

    const estConnexion = _authOngletActif === "connexion";
    return `
      <div class="sl-carte sl-auth-box sl-anim-fadeinscale">
        <div class="sl-auth-tabs">
          <div class="sl-auth-tab ${estConnexion ? "sl-tab-actif" : ""}" data-sl-action="auth-tab" data-sl-tab="connexion">
            ${_echapperHTML(_t("connexion"))}
          </div>
          <div class="sl-auth-tab ${!estConnexion ? "sl-tab-actif" : ""}" data-sl-action="auth-tab" data-sl-tab="inscription">
            ${_echapperHTML(_t("inscription"))}
          </div>
        </div>

        <div class="sl-auth-titre">${estConnexion ? _echapperHTML(_t("bienvenue")) : _echapperHTML(_t("sInscrire"))}</div>
        <div class="sl-auth-sous-titre">${_echapperHTML(nomReseau)} — ${estConnexion ? "Ravi de vous revoir !" : "Créez votre compte en quelques secondes."}</div>

        <form data-sl-form="auth" autocomplete="off">
          <div class="sl-input-group">
            <label class="sl-input-label">${_echapperHTML(_t("pseudo"))}</label>
            <input type="text" class="sl-input" name="pseudo" maxlength="32" placeholder="ex: Mila_Voyage" required />
          </div>
          <div class="sl-input-group">
            <label class="sl-input-label">${_echapperHTML(_t("motDePasse"))}</label>
            <input type="password" class="sl-input" name="motDePasse" minlength="4" placeholder="••••••••" required />
          </div>
          <div class="sl-input-erreur" data-sl-zone="auth-erreur"></div>
          <button type="submit" class="sl-btn sl-btn-primaire sl-btn-full">
            ${estConnexion ? _echapperHTML(_t("seConnecter")) : _echapperHTML(_t("sInscrire"))}
          </button>
        </form>
      </div>
    `;
  }

  /**
   * Redessine entièrement la boîte d'authentification montée (si elle a
   * été créée via `creerSystemeAuthentification`). Appelé après chaque
   * connexion, inscription ou déconnexion.
   * @private
   */
  function _redessinerAuthSiPresent() {
    if (!_authContainerRef) return;
    _authContainerRef.innerHTML = _construireHTMLAuth();
    _attacherEvenementsAuth(_authContainerRef);
  }

  /**
   * Attache l'ensemble des écouteurs d'événements nécessaires au
   * fonctionnement de la boîte d'authentification (changement d'onglet,
   * soumission du formulaire, déconnexion).
   * @param {HTMLElement} conteneur - Conteneur DOM de la boîte d'authentification.
   * @private
   */
  function _attacherEvenementsAuth(conteneur) {
    conteneur.querySelectorAll('[data-sl-action="auth-tab"]').forEach((tab) => {
      tab.addEventListener("click", () => {
        _authOngletActif = tab.getAttribute("data-sl-tab");
        _redessinerAuthSiPresent();
      });
    });

    const boutonLogout = conteneur.querySelector('[data-sl-action="logout"]');
    if (boutonLogout) {
      boutonLogout.addEventListener("click", () => {
        deconnecterUtilisateur();
        afficherToast("Vous avez été déconnecté.", "info");
        _redessinerAuthSiPresent();
        _redessinerFluxSiPresent();
      });
    }

    const formulaire = conteneur.querySelector('[data-sl-form="auth"]');
    if (formulaire) {
      formulaire.addEventListener("submit", (evenement) => {
        evenement.preventDefault();
        const donnees = new FormData(formulaire);
        const pseudo = donnees.get("pseudo");
        const motDePasse = donnees.get("motDePasse");
        const zoneErreur = conteneur.querySelector('[data-sl-zone="auth-erreur"]');

        let resultat;
        if (_authOngletActif === "connexion") {
          resultat = connecterUtilisateur(pseudo, motDePasse);
        } else {
          resultat = inscrireUtilisateur(pseudo, motDePasse);
          if (resultat.succes) {
            resultat = connecterUtilisateur(pseudo, motDePasse);
          }
        }

        if (!resultat.succes) {
          if (zoneErreur) zoneErreur.textContent = resultat.message;
          formulaire.classList.add("sl-anim-shake");
          setTimeout(() => formulaire.classList.remove("sl-anim-shake"), 420);
          return;
        }

        afficherToast(
          "Bienvenue " + resultat.utilisateur.pseudo + " !",
          "succes"
        );
        _redessinerAuthSiPresent();
        _redessinerFluxSiPresent();
      });
    }
  }

  /**
   * Crée et monte la boîte d'authentification / profil dans le conteneur
   * DOM ciblé. Affiche automatiquement le formulaire de connexion ou
   * d'inscription si personne n'est connecté, ou la carte de profil avec
   * bouton de déconnexion si une session est active.
   * @param {string|HTMLElement} cible - Sélecteur CSS ou élément DOM hôte.
   * @returns {HTMLElement} Élément conteneur monté.
   * @public
   */
  function creerSystemeAuthentification(cible) {
    if (!_state.initialized) {
      throw new Error(
        "[SocialLang] creerSystemeAuthentification() ne peut être appelé qu'après SocialLang.init()."
      );
    }
    const hote = _resoudreElement(cible, "creerSystemeAuthentification");
    hote.setAttribute("data-sociallang-root", "");
    hote.classList.add("sl-app");

    const conteneur = document.createElement("div");
    conteneur.className = "sl-conteneur";
    hote.innerHTML = "";
    hote.appendChild(conteneur);

    _authContainerRef = conteneur;
    _redessinerAuthSiPresent();

    return conteneur;
  }

  /* ==========================================================================
   *  SECTION 18 — COMPOSANT UI : INTERFACE COMPLÈTE DE PUBLICATION & FLUX
   * ======================================================================== */

  /** @type {HTMLElement|null} Référence au conteneur du flux monté. */
  let _fluxContainerRef = null;

  /** @type {Object<string, boolean>} Suivi des zones de commentaires actuellement dépliées (par postId). */
  const _commentairesOuverts = {};

  /**
   * Construit le fragment HTML de la zone de publication (champ de texte
   * redimensionnable + compteur de caractères + bouton "Publier").
   * Affiche un message d'invitation à se connecter si aucun utilisateur
   * n'est authentifié.
   * @returns {string} Fragment HTML.
   * @private
   */
  function _construireHTMLZonePublication() {
    if (!_state.currentUser) {
      return `
        <div class="sl-carte sl-publier-box sl-anim-fadein">
          <div class="sl-etat-vide" style="padding:18px 0;">
            Connectez-vous pour publier et interagir avec la communauté.
          </div>
        </div>
      `;
    }

    const u = _state.currentUser;
    const maxLongueur =
      (_state.config && _state.config.maxLongueurPost) || DEFAULT_CONFIG.maxLongueurPost;

    return `
      <div class="sl-carte sl-publier-box sl-anim-fadein">
        <div class="sl-post-header">
          <img class="sl-avatar" src="${_echapperHTML(u.avatar)}" alt="avatar de ${_echapperHTML(u.pseudo)}" />
          <div class="sl-post-meta">
            <div class="sl-post-pseudo">${_echapperHTML(u.pseudo)}</div>
            <div class="sl-post-date">${_echapperHTML(_t("quoiDeNeuf"))}</div>
          </div>
        </div>
        <form data-sl-form="publier">
          <div class="sl-input-group" style="margin-bottom:6px;">
            <textarea
              class="sl-textarea"
              name="contenu"
              maxlength="${maxLongueur}"
              placeholder="${_echapperHTML(_t("quoiDeNeuf"))}"
              data-sl-zone="compteur-source"
            ></textarea>
          </div>
          <div class="sl-input-group">
            <input
              type="url"
              class="sl-input"
              name="image"
              placeholder="URL d'image à joindre (facultatif)"
            />
          </div>
          <div class="sl-publier-footer">
            <span class="sl-champ-compteur" data-sl-zone="compteur-affiche">0 / ${maxLongueur}</span>
            <button type="submit" class="sl-btn sl-btn-primaire">
              ${_echapperHTML(_t("publier"))}
            </button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Construit le fragment HTML de la barre de recherche en temps réel
   * permettant de filtrer le flux par `@pseudo` ou par mot-clé.
   * @returns {string} Fragment HTML.
   * @private
   */
  function _construireHTMLBarreRecherche() {
    return `
      <div class="sl-carte sl-anim-fadein" style="padding:12px 16px;">
        <div class="sl-recherche-wrap">
          <span class="sl-recherche-icone">🔎</span>
          <input
            type="text"
            class="sl-input"
            data-sl-action="recherche-flux"
            placeholder="${_echapperHTML(_t("rechercher"))}"
            value="${_echapperHTML(_state.searchQuery || "")}"
          />
        </div>
      </div>
    `;
  }

  /**
   * Construit le fragment HTML de la liste de commentaires (dépliée ou
   * masquée) associée à une publication donnée, incluant le formulaire
   * d'envoi d'un nouveau commentaire.
   * @param {string} postId - Identifiant de la publication.
   * @returns {string} Fragment HTML.
   * @private
   */
  function _construireHTMLCommentaires(postId) {
    const estOuvert = !!_commentairesOuverts[postId];
    const commentaires = obtenirCommentaires(postId);

    const listeHTML = commentaires.length
      ? commentaires
          .map(
            (c) => `
        <div class="sl-comment-item">
          <img class="sl-avatar-sm" src="${_echapperHTML(c.avatar)}" alt="avatar de ${_echapperHTML(c.auteur)}" />
          <div class="sl-comment-bulle">
            <div class="sl-comment-pseudo">${_echapperHTML(c.auteur)}</div>
            <div class="sl-comment-texte">${_echapperHTML(c.contenu)}</div>
            <div class="sl-post-date" style="margin-top:4px;">${_formaterDateRelative(c.date)}</div>
          </div>
        </div>
      `
          )
          .join("")
      : `<div class="sl-comment-vide">Aucun commentaire pour le moment. Soyez le premier !</div>`;

    const formulaireHTML = _state.currentUser
      ? `
        <form class="sl-comment-form" data-sl-form="commentaire" data-sl-post-id="${_echapperHTML(postId)}">
          <input
            type="text"
            class="sl-input"
            name="contenu"
            maxlength="${(_state.config && _state.config.maxLongueurCommentaire) || DEFAULT_CONFIG.maxLongueurCommentaire}"
            placeholder="${_echapperHTML(_t("ecrireCommentaire"))}"
            autocomplete="off"
          />
          <button type="submit" class="sl-btn sl-btn-primaire sl-btn-sm">${_echapperHTML(_t("envoyer"))}</button>
        </form>
      `
      : `<div class="sl-comment-vide">Connectez-vous pour commenter.</div>`;

    return `
      <div class="sl-comments-zone ${estOuvert ? "sl-comments-ouvert" : ""}" data-sl-comments-for="${_echapperHTML(postId)}">
        <div class="sl-liste-commentaires" data-sl-zone="liste-commentaires">
          ${listeHTML}
        </div>
        ${formulaireHTML}
      </div>
    `;
  }

  /**
   * Construit le fragment HTML d'une carte de publication unique, incluant
   * en-tête (avatar, pseudo, date relative), contenu, image optionnelle,
   * badge de modération si applicable, actions (like, commentaires) et
   * la zone de commentaires imbriqués associée.
   * @param {Object} post - Objet publication.
   * @returns {string} Fragment HTML de la carte.
   * @private
   */
  function _construireHTMLCartePost(post) {
    const pseudoConnecte = _state.currentUser ? _state.currentUser.pseudo : null;
    const estLike = pseudoConnecte ? post.likes.indexOf(pseudoConnecte) !== -1 : false;
    const nombreLikes = post.likes.length;
    const nombreCommentaires = obtenirCommentaires(post.id).length;

    const imageHTML = post.image
      ? `<img class="sl-post-image" src="${_echapperHTML(post.image)}" alt="Image jointe à la publication de ${_echapperHTML(post.auteur)}" loading="lazy" />`
      : "";

    const badgeModerationHTML = post.moderePar
      ? `<span class="sl-badge-censure" title="Ce message a été automatiquement filtré">Modéré</span>`
      : "";

    return `
      <div class="sl-carte sl-carte-post" data-sl-post-id="${_echapperHTML(post.id)}">
        <div class="sl-post-header">
          <img class="sl-avatar" src="${_echapperHTML(post.avatar)}" alt="avatar de ${_echapperHTML(post.auteur)}" />
          <div class="sl-post-meta">
            <div class="sl-post-pseudo">
              ${_echapperHTML(post.auteur)} ${badgeModerationHTML}
            </div>
            <div class="sl-post-date">${_formaterDateRelative(post.date)}</div>
          </div>
        </div>

        <div class="sl-post-contenu">${_echapperHTML(post.contenu)}</div>
        ${imageHTML}

        <div class="sl-post-actions">
          <button
            type="button"
            class="sl-btn sl-btn-like sl-btn-sm ${estLike ? "sl-like-actif" : ""}"
            data-sl-action="like"
            data-sl-post-id="${_echapperHTML(post.id)}"
          >
            <span class="sl-icone-coeur">${estLike ? "❤️" : "🤍"}</span>
            <span data-sl-zone="likes-compte">${nombreLikes}</span>
          </button>

          <button
            type="button"
            class="sl-btn sl-btn-ghost sl-btn-sm"
            data-sl-action="toggle-commentaires"
            data-sl-post-id="${_echapperHTML(post.id)}"
          >
            💬 <span data-sl-zone="commentaires-compte">${nombreCommentaires}</span>
            <span data-sl-zone="commentaires-label">
              ${_commentairesOuverts[post.id] ? _echapperHTML(_t("masquerCommentaires")) : _echapperHTML(_t("voirCommentaires"))}
            </span>
          </button>
        </div>

        ${_construireHTMLCommentaires(post.id)}
      </div>
    `;
  }

  /**
   * Construit le fragment HTML complet du flux de publications affichées
   * (résultat déjà filtré/trié par `obtenirPostsAffiches`), ou un état
   * vide explicite si aucune publication ne correspond à la recherche.
   * @returns {string} Fragment HTML du flux.
   * @private
   */
  function _construireHTMLFlux() {
    const posts = obtenirPostsAffiches();
    if (!posts.length) {
      return `<div class="sl-carte"><div class="sl-etat-vide">${_echapperHTML(_t("aucunResultat"))}</div></div>`;
    }
    return posts.map((post) => _construireHTMLCartePost(post)).join("");
  }

  /**
   * Redessine entièrement le flux monté (zone de publication, barre de
   * recherche et liste des cartes) si l'interface complète a été créée via
   * `creerInterfaceComplete`. Réattache systématiquement tous les
   * écouteurs après chaque redessin pour garantir leur validité sur les
   * nouveaux noeuds DOM générés.
   * @private
   */
  function _redessinerFluxSiPresent() {
    if (!_fluxContainerRef) return;
    const zonePublication = _fluxContainerRef.querySelector('[data-sl-zone="zone-publication"]');
    const zoneRecherche = _fluxContainerRef.querySelector('[data-sl-zone="zone-recherche"]');
    const zoneFlux = _fluxContainerRef.querySelector('[data-sl-zone="zone-flux"]');

    if (zonePublication) zonePublication.innerHTML = _construireHTMLZonePublication();
    if (zoneRecherche) zoneRecherche.innerHTML = _construireHTMLBarreRecherche();
    if (zoneFlux) zoneFlux.innerHTML = _construireHTMLFlux();

    _attacherEvenementsFlux(_fluxContainerRef);
  }

  /**
   * Attache l'ensemble des écouteurs d'événements nécessaires au
   * fonctionnement de l'interface complète : soumission de publication,
   * recherche en temps réel (avec debounce), likes, ouverture/fermeture
   * des zones de commentaires, et soumission de nouveaux commentaires.
   * @param {HTMLElement} conteneur - Conteneur DOM racine de l'interface complète.
   * @private
   */
  function _attacherEvenementsFlux(conteneur) {
    // --- Soumission d'une nouvelle publication ---
    const formulairePublier = conteneur.querySelector('[data-sl-form="publier"]');
    if (formulairePublier) {
      const champTexte = formulairePublier.querySelector('textarea[name="contenu"]');
      const compteurAffiche = conteneur.querySelector('[data-sl-zone="compteur-affiche"]');
      const maxLongueur =
        (_state.config && _state.config.maxLongueurPost) || DEFAULT_CONFIG.maxLongueurPost;

      if (champTexte && compteurAffiche) {
        const majCompteur = () => {
          const longueur = champTexte.value.length;
          compteurAffiche.textContent = longueur + " / " + maxLongueur;
          compteurAffiche.classList.toggle(
            "sl-compteur-alerte",
            longueur > maxLongueur * 0.9
          );
        };
        champTexte.addEventListener("input", majCompteur);
        majCompteur();
      }

      formulairePublier.addEventListener("submit", (evenement) => {
        evenement.preventDefault();
        const donnees = new FormData(formulairePublier);
        const contenu = donnees.get("contenu");
        const image = donnees.get("image");

        const resultat = publierMessage(contenu, image);
        if (!resultat.succes) {
          afficherToast(resultat.message, "erreur");
          formulairePublier.classList.add("sl-anim-shake");
          setTimeout(() => formulairePublier.classList.remove("sl-anim-shake"), 420);
          return;
        }

        afficherToast(
          resultat.post.moderePar
            ? "Publication envoyée (contenu partiellement modéré)."
            : "Publication envoyée !",
          "succes"
        );
        _redessinerFluxSiPresent();
      });
    }

    // --- Recherche en temps réel (avec debounce pour limiter les recalculs) ---
    const champRecherche = conteneur.querySelector('[data-sl-action="recherche-flux"]');
    if (champRecherche) {
      const rechercheDebouncee = _debounce((valeur) => {
        rechercherDansLeFil(valeur);
      }, 220);
      champRecherche.addEventListener("input", (evenement) => {
        rechercheDebouncee(evenement.target.value);
      });
      // Replace le focus et le curseur après redessin pour une frappe fluide.
      champRecherche.focus();
      const positionCurseur = champRecherche.value.length;
      champRecherche.setSelectionRange(positionCurseur, positionCurseur);
    }

    // --- Likes ---
    conteneur.querySelectorAll('[data-sl-action="like"]').forEach((bouton) => {
      bouton.addEventListener("click", () => {
        const postId = bouton.getAttribute("data-sl-post-id");
        if (!_state.currentUser) {
          afficherToast("Connectez-vous pour aimer une publication.", "erreur");
          return;
        }
        const resultat = toggleLike(postId);
        if (!resultat.succes) {
          afficherToast(resultat.message, "erreur");
          return;
        }
        bouton.classList.toggle("sl-like-actif", resultat.estLike);
        const icone = bouton.querySelector(".sl-icone-coeur");
        if (icone) icone.textContent = resultat.estLike ? "❤️" : "🤍";
        const compteur = bouton.querySelector('[data-sl-zone="likes-compte"]');
        if (compteur) compteur.textContent = String(resultat.likesCount);
      });
    });

    // --- Ouverture / fermeture des zones de commentaires ---
    conteneur.querySelectorAll('[data-sl-action="toggle-commentaires"]').forEach((bouton) => {
      bouton.addEventListener("click", () => {
        const postId = bouton.getAttribute("data-sl-post-id");
        _commentairesOuverts[postId] = !_commentairesOuverts[postId];

        const zone = conteneur.querySelector('[data-sl-comments-for="' + postId + '"]');
        const label = bouton.querySelector('[data-sl-zone="commentaires-label"]');
        if (zone) zone.classList.toggle("sl-comments-ouvert", _commentairesOuverts[postId]);
        if (label) {
          label.textContent = _commentairesOuverts[postId]
            ? _t("masquerCommentaires")
            : _t("voirCommentaires");
        }
      });
    });

    // --- Soumission d'un nouveau commentaire ---
    conteneur.querySelectorAll('[data-sl-form="commentaire"]').forEach((formulaire) => {
      formulaire.addEventListener("submit", (evenement) => {
        evenement.preventDefault();
        const postId = formulaire.getAttribute("data-sl-post-id");
        const champ = formulaire.querySelector('input[name="contenu"]');
        const contenu = champ ? champ.value : "";

        const resultat = ajouterCommentaire(postId, contenu);
        if (!resultat.succes) {
          afficherToast(resultat.message, "erreur");
          return;
        }

        _commentairesOuverts[postId] = true;
        if (champ) champ.value = "";
        _redessinerFluxSiPresent();
      });
    });
  }

  /**
   * Crée et monte l'interface complète du réseau social (zone de
   * publication, barre de recherche en temps réel, et flux de
   * publications avec likes et commentaires imbriqués) dans le conteneur
   * DOM ciblé.
   * @param {string|HTMLElement} cible - Sélecteur CSS ou élément DOM hôte.
   * @returns {HTMLElement} Élément conteneur monté.
   * @public
   */
  function creerInterfaceComplete(cible) {
    if (!_state.initialized) {
      throw new Error(
        "[SocialLang] creerInterfaceComplete() ne peut être appelé qu'après SocialLang.init()."
      );
    }
    const hote = _resoudreElement(cible, "creerInterfaceComplete");
    hote.setAttribute("data-sociallang-root", "");
    hote.classList.add("sl-app");

    const conteneur = document.createElement("div");
    conteneur.className = "sl-conteneur";

    const nomReseau = (_state.config && _state.config.nomReseau) || DEFAULT_CONFIG.nomReseau;

    conteneur.innerHTML = `
      <div class="sl-topbar">
        <div class="sl-topbar-titre">🌐 ${_echapperHTML(nomReseau)}</div>
        <div class="sl-topbar-actions" data-sl-zone="selecteur-theme"></div>
      </div>
      <div data-sl-zone="zone-publication"></div>
      <div data-sl-zone="zone-recherche"></div>
      <div data-sl-zone="zone-flux"></div>
    `;

    hote.innerHTML = "";
    hote.appendChild(conteneur);

    const zoneTheme = conteneur.querySelector('[data-sl-zone="selecteur-theme"]');
    if (zoneTheme) zoneTheme.appendChild(_creerSelecteurTheme());

    _fluxContainerRef = conteneur;
    _redessinerFluxSiPresent();

    return conteneur;
  }

  /* ==========================================================================
   *  SECTION 19 — COMPOSANT UI : SÉLECTEUR DE THÈME
   * ======================================================================== */

  /**
   * Construit le petit sélecteur visuel de thèmes (une pastille colorée
   * cliquable par thème disponible) et retourne l'élément DOM prêt à être
   * inséré n'importe où dans l'interface.
   * @returns {HTMLElement} Élément conteneur du sélecteur de thèmes.
   * @private
   */
  function _creerSelecteurTheme() {
    const apercusCouleurs = {
      clair: "linear-gradient(135deg,#ffffff 50%,#4f46e5 50%)",
      sombre: "linear-gradient(135deg,#181b27 50%,#6366f1 50%)",
      cyberpunk: "linear-gradient(135deg,#08010d 50%,#ff2a6d 50%)",
      retro: "linear-gradient(135deg,#000000 50%,#33ff33 50%)",
      dracula: "linear-gradient(135deg,#282a36 50%,#bd93f9 50%)",
    };

    const conteneur = document.createElement("div");
    conteneur.className = "sl-theme-switch";

    Object.keys(THEMES).forEach((nomTheme) => {
      const pastille = document.createElement("button");
      pastille.type = "button";
      pastille.className =
        "sl-theme-dot" + (_state.activeTheme === nomTheme ? " sl-theme-dot-actif" : "");
      pastille.style.background = apercusCouleurs[nomTheme] || "#999";
      pastille.title = "Thème : " + nomTheme;
      pastille.setAttribute("aria-label", "Activer le thème " + nomTheme);
      pastille.setAttribute("data-sl-theme-value", nomTheme);

      pastille.addEventListener("click", () => {
        _appliquerTheme(nomTheme);
        conteneur.querySelectorAll(".sl-theme-dot").forEach((p) => {
          p.classList.toggle("sl-theme-dot-actif", p === pastille);
        });
        afficherToast(_t("themeChange") + nomTheme, "info", 1800);
      });

      conteneur.appendChild(pastille);
    });

    return conteneur;
  }

  /* ==========================================================================
   *  SECTION 20 — SYSTÈME D'ÉVÉNEMENTS PUBLIC (API D'ABONNEMENT)
   * ======================================================================== */

  /**
   * Permet à l'intégrateur de s'abonner à un événement interne du
   * framework (`onLogin`, `onLogout`, `onNewPost`, `onThemeChange`) afin
   * de réagir personnellement (analytics, notifications, etc.) sans avoir
   * à modifier le coeur du framework.
   * @param {"onLogin"|"onLogout"|"onNewPost"|"onThemeChange"} type - Type d'événement.
   * @param {Function} callback - Fonction appelée avec le détail de l'événement.
   * @returns {void}
   * @public
   */
  function on(type, callback) {
    if (!_state.listeners[type]) {
      console.warn(
        "[SocialLang] Type d'événement inconnu : '" +
          type +
          "'. Types valides : " +
          Object.keys(_state.listeners).join(", ")
      );
      return;
    }
    if (typeof callback === "function") {
      _state.listeners[type].push(callback);
    }
  }

  /* ==========================================================================
   *  SECTION 21 — UTILITAIRE INTERNE : DEBOUNCE
   * ======================================================================== */

  /**
   * Retarde l'exécution d'une fonction jusqu'à ce qu'un délai se soit
   * écoulé sans nouvel appel. Utilisé pour la recherche en temps réel afin
   * de ne pas redessiner le flux à chaque frappe de touche.
   * @param {Function} fonction - Fonction à temporiser.
   * @param {number} delaiMs - Délai d'inactivité requis en millisecondes.
   * @returns {Function} Fonction temporisée.
   * @private
   */
  function _debounce(fonction, delaiMs) {
    let identifiantTimer = null;
    return function (...args) {
      if (identifiantTimer) clearTimeout(identifiantTimer);
      identifiantTimer = setTimeout(() => fonction.apply(null, args), delaiMs);
    };
  }

  /* ==========================================================================
   *  SECTION 22 — POINT D'ENTRÉE PUBLIC : SocialLang.init()
   * ======================================================================== */

  /**
   * Initialise le framework SocialLang : fusionne la configuration fournie
   * avec les valeurs par défaut, injecte les styles globaux, applique le
   * thème initial, restaure la session utilisateur persistée, et hydrate
   * le cache local de publications (en le préremplissant avec un jeu de
   * données de démonstration si aucune publication n'existe encore).
   * Cette fonction doit être appelée une seule fois avant tout autre appel
   * public du framework.
   * @param {Object} [configUtilisateur={}] - Configuration personnalisée.
   * @param {string} [configUtilisateur.nomReseau] - Nom affiché du réseau social.
   * @param {string} [configUtilisateur.apiKey] - Clé API fictive de démonstration.
   * @param {string} [configUtilisateur.langue] - Langue de l'interface ("fr").
   * @param {string} [configUtilisateur.theme] - Thème initial.
   * @param {boolean} [configUtilisateur.moderationActive] - Active la modération automatique.
   * @param {number} [configUtilisateur.maxLongueurPost] - Longueur max d'une publication.
   * @param {number} [configUtilisateur.maxLongueurCommentaire] - Longueur max d'un commentaire.
   * @returns {Object} La configuration active fusionnée.
   * @public
   */
  function init(configUtilisateur) {
    _state.config = Object.assign({}, DEFAULT_CONFIG, configUtilisateur || {});

    if (!_state.config.apiKey) {
      console.warn(
        "[SocialLang] Aucune apiKey fournie : une clé de démonstration par défaut sera utilisée."
      );
    }

    _injecterStylesGlobaux();

    const themeInitial =
      _lireStockage(LS_KEYS.THEME, null) || _state.config.theme || DEFAULT_CONFIG.theme;
    _appliquerTheme(themeInitial);

    _restaurerSession();
    _hydraterCache();

    _state.initialized = true;
    _log("Framework initialisé avec succès. Version " + VERSION + ".");

    return _state.config;
  }

  /**
   * Fonction de journalisation interne conditionnelle, active uniquement
   * si `config.debug` est vrai. Préfixe systématiquement les messages
   * pour faciliter leur identification dans la console du navigateur.
   * @param {...*} args - Arguments à journaliser.
   * @private
   */
  function _log(...args) {
    if (_state.config && _state.config.debug) {
      console.log.apply(console, ["[SocialLang]"].concat(args));
    }
  }

  /* ==========================================================================
   *  SECTION 23 — EXPORTS PUBLICS
   * ======================================================================== */

  /** @type {string} Version du framework, exposée publiquement en lecture. */
  SocialLang.VERSION = VERSION;

  // --- Cycle de vie / configuration ---
  SocialLang.init = init;
  SocialLang.on = on;

  // --- Comptes, sessions ---
  SocialLang.inscrireUtilisateur = inscrireUtilisateur;
  SocialLang.connecterUtilisateur = connecterUtilisateur;
  SocialLang.deconnecterUtilisateur = deconnecterUtilisateur;
  SocialLang.obtenirUtilisateurCourant = obtenirUtilisateurCourant;

  // --- Composants UI automatiques ---
  SocialLang.creerSystemeAuthentification = creerSystemeAuthentification;
  SocialLang.creerInterfaceComplete = creerInterfaceComplete;

  // --- Flux, publications, recherche ---
  SocialLang.publierMessage = publierMessage;
  SocialLang.obtenirPostsAffiches = obtenirPostsAffiches;
  SocialLang.rechercherDansLeFil = rechercherDansLeFil;

  // --- Interactions ---
  SocialLang.toggleLike = toggleLike;
  SocialLang.ajouterCommentaire = ajouterCommentaire;
  SocialLang.obtenirCommentaires = obtenirCommentaires;

  // --- Thèmes & UI annexe ---
  SocialLang.appliquerTheme = _appliquerTheme;
  SocialLang.afficherToast = afficherToast;

  // --- Sécurité (exposés en lecture pour réutilisation par l'intégrateur) ---
  SocialLang.echapperHTML = _echapperHTML;
  SocialLang.nettoyerPseudo = _nettoyerPseudo;
  SocialLang.modererTexte = (texte) => _modererTexte(texte).texteModere;

  /**
   * Expose l'intégralité du framework sur l'objet global `window`, point
   * d'entrée unique pour toute page HTML hôte.
   * @global
   */
  window.SocialLang = SocialLang;
})(window, document);

  /* ==========================================================================
   *  SECTION 18 — COMPOSANT UI : INTERFACE COMPLÈTE (FLUX + PUBLICATION)
   * ======================================================================== */

  /** @type {HTMLElement|null} Référence au conteneur de l'interface complète montée. */
  let _appContainerRef = null;

  /**
   * Construit le HTML de l'en-tête de l'application (titre, sélecteur de
   * thème, indicateur de statut de connexion).
   * @returns {string} Fragment HTML.
   * @private
   */
  function _construireHTMLTopbar() {
    const nomReseau = (_state.config && _state.config.nomReseau) || DEFAULT_CONFIG.nomReseau;
    const themesDisponibles = Object.keys(THEMES);

    const dots = themesDisponibles
      .map((nomTheme) => {
        const actif = _state.activeTheme === nomTheme ? "sl-theme-dot-actif" : "";
        const couleurApercu = THEMES[nomTheme]["--sl-primaire"];
        return `<div class="sl-theme-dot ${actif}" style="background:${couleurApercu};" data-sl-action="changer-theme" data-sl-theme="${nomTheme}" title="${_echapperHTML(nomTheme)}"></div>`;
      })
      .join("");

    return `
      <div class="sl-topbar">
        <div class="sl-topbar-titre">🌐 ${_echapperHTML(nomReseau)}</div>
        <div class="sl-topbar-actions">
          <div class="sl-theme-switch">${dots}</div>
        </div>
      </div>
    `;
  }

  /**
   * Construit le HTML de la zone de publication (textarea + bouton publier)
   * affichée uniquement si un utilisateur est connecté.
   * @returns {string} Fragment HTML.
   * @private
   */
  function _construireHTMLZonePublication() {
    if (!_state.currentUser) {
      return `
        <div class="sl-carte sl-anim-fadein">
          <div class="sl-etat-vide">Connectez-vous pour publier et interagir avec la communauté.</div>
        </div>
      `;
    }
    const u = _state.currentUser;
    const maxLongueur =
      (_state.config && _state.config.maxLongueurPost) || DEFAULT_CONFIG.maxLongueurPost;

    return `
      <div class="sl-carte sl-publier-box sl-anim-fadein">
        <div class="sl-post-header">
          <img class="sl-avatar" src="${_echapperHTML(u.avatar)}" alt="avatar" />
          <div class="sl-post-meta">
            <div class="sl-post-pseudo">${_echapperHTML(u.pseudo)} <span class="sl-badge-en-ligne"></span></div>
            <div class="sl-post-date">${_echapperHTML(_t("quoiDeNeuf"))}</div>
          </div>
        </div>
        <form data-sl-form="publier">
          <div class="sl-input-group" style="margin-bottom:6px;">
            <textarea class="sl-textarea" name="contenu" maxlength="${maxLongueur}" placeholder="${_echapperHTML(_t("quoiDeNeuf"))}" required></textarea>
            <div class="sl-champ-compteur" data-sl-zone="compteur-publication">0 / ${maxLongueur}</div>
          </div>
          <div class="sl-input-group" style="margin-bottom:6px;">
            <input type="url" class="sl-input" name="image" placeholder="URL d'image (optionnel)" />
          </div>
          <div class="sl-publier-footer">
            <span class="sl-input-erreur" data-sl-zone="publier-erreur"></span>
            <button type="submit" class="sl-btn sl-btn-primaire">${_echapperHTML(_t("publier"))}</button>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Construit le HTML de la barre de recherche en temps réel du flux.
   * @returns {string} Fragment HTML.
   * @private
   */
  function _construireHTMLRecherche() {
    return `
      <div class="sl-carte sl-anim-fadein" style="padding:12px 16px;">
        <div class="sl-recherche-wrap">
          <span class="sl-recherche-icone">🔎</span>
          <input
            type="text"
            class="sl-input"
            data-sl-input="recherche"
            placeholder="${_echapperHTML(_t("rechercher"))}"
            value="${_echapperHTML(_state.searchQuery)}"
          />
        </div>
      </div>
    `;
  }

  /**
   * Construit le HTML de la section commentaires (dépliable) d'une
   * publication donnée : liste des commentaires existants + formulaire
   * d'ajout.
   * @param {Object} post - Publication concernée.
   * @returns {string} Fragment HTML.
   * @private
   */
  function _construireHTMLCommentaires(post) {
    const commentaires = obtenirCommentaires(post.id);
    const estOuvert = !!_state.openComments[post.id];

    const listeHTML =
      commentaires.length === 0
        ? `<div class="sl-comment-vide">Soyez le premier à commenter cette publication.</div>`
        : commentaires
            .map(
              (c) => `
            <div class="sl-comment-item sl-anim-fadein">
              <img class="sl-avatar-sm" src="${_echapperHTML(c.avatar)}" alt="avatar" />
              <div class="sl-comment-bulle">
                <div class="sl-comment-pseudo">${_echapperHTML(c.auteur)}</div>
                <div class="sl-comment-texte">${_echapperHTML(c.contenu)}</div>
              </div>
            </div>
          `
            )
            .join("");

    const formulaireHTML = _state.currentUser
      ? `
        <form class="sl-comment-form" data-sl-form="commentaire" data-sl-post-id="${_echapperHTML(post.id)}">
          <img class="sl-avatar-sm" src="${_echapperHTML(_state.currentUser.avatar)}" alt="avatar" />
          <input
            type="text"
            class="sl-input"
            name="contenu"
            maxlength="${(_state.config && _state.config.maxLongueurCommentaire) || 250}"
            placeholder="${_echapperHTML(_t("ecrireCommentaire"))}"
            required
          />
          <button type="submit" class="sl-btn sl-btn-primaire sl-btn-sm">${_echapperHTML(_t("envoyer"))}</button>
        </form>
      `
      : `<div class="sl-comment-vide">Connectez-vous pour commenter.</div>`;

    return `
      <div class="sl-comments-zone ${estOuvert ? "sl-comments-ouvert" : ""}" data-sl-comments-zone="${_echapperHTML(post.id)}">
        <div data-sl-comments-liste="${_echapperHTML(post.id)}" style="display:flex; flex-direction:column; gap:8px;">
          ${listeHTML}
        </div>
        ${formulaireHTML}
      </div>
    `;
  }

  /**
   * Construit le HTML complet d'une carte de publication unique, incluant
   * en-tête (auteur, avatar, date), contenu, image éventuelle, badge de
   * modération, actions (like, commentaire) et section commentaires.
   * @param {Object} post - Publication à afficher.
   * @returns {string} Fragment HTML.
   * @private
   */
  function _construireHTMLPost(post) {
    const likes = Array.isArray(post.likes) ? post.likes : [];
    const pseudoCourant = _state.currentUser ? _state.currentUser.pseudo : null;
    const utilisateurALike = pseudoCourant ? likes.includes(pseudoCourant) : false;
    const nbCommentaires = obtenirCommentaires(post.id).length;

    const imageHTML = post.image
      ? `<img class="sl-post-image" src="${_echapperHTML(post.image)}" alt="image de la publication" loading="lazy" />`
      : "";

    const badgeModeration = post.moderePar
      ? `<span class="sl-badge-censure">Modéré</span>`
      : "";

    return `
      <article class="sl-carte sl-carte-post" data-sl-post-id="${_echapperHTML(post.id)}">
        <div class="sl-post-header">
          <img class="sl-avatar" src="${_echapperHTML(post.avatar)}" alt="avatar de ${_echapperHTML(post.auteur)}" />
          <div class="sl-post-meta">
            <div class="sl-post-pseudo">@${_echapperHTML(post.auteur)} ${badgeModeration}</div>
            <div class="sl-post-date">${_echapperHTML(_formaterDateRelative(post.date))}</div>
          </div>
        </div>
        <div class="sl-post-contenu">${_echapperHTML(post.contenu)}</div>
        ${imageHTML}
        <div class="sl-post-actions">
          <button
            type="button"
            class="sl-btn sl-btn-like sl-btn-sm ${utilisateurALike ? "sl-like-actif" : ""}"
            data-sl-action="toggle-like"
            data-sl-post-id="${_echapperHTML(post.id)}"
          >
            <span class="sl-icone-coeur">${utilisateurALike ? "❤️" : "🤍"}</span>
            <span data-sl-zone="likes-count-${_echapperHTML(post.id)}">${likes.length}</span>
            ${_echapperHTML(_t("jaime"))}
          </button>
          <button
            type="button"
            class="sl-btn sl-btn-ghost sl-btn-sm"
            data-sl-action="toggle-commentaires"
            data-sl-post-id="${_echapperHTML(post.id)}"
          >
            💬 ${_echapperHTML(_t("commentaires"))} (${nbCommentaires})
          </button>
        </div>
        ${_construireHTMLCommentaires(post)}
      </article>
    `;
  }

  /**
   * Construit le HTML complet du flux de publications affichées (en tenant
   * compte du filtre de recherche actif), ou un état vide stylisé si
   * aucune publication ne correspond.
   * @returns {string} Fragment HTML.
   * @private
   */
  function _construireHTMLFlux() {
    const posts = obtenirPostsAffiches();
    if (posts.length === 0) {
      return `
        <div class="sl-carte sl-anim-fadein">
          <div class="sl-etat-vide">🔍 ${_echapperHTML(_t("aucunResultat"))}</div>
        </div>
      `;
    }
    return posts.map((post) => _construireHTMLPost(post)).join("");
  }

  /**
   * Redessine uniquement la zone du flux de publications (sans reconstruire
   * la topbar, la zone de publication ou la barre de recherche), afin de
   * limiter les manipulations DOM et préserver le focus des champs actifs
   * lorsque c'est possible.
   * @private
   */
  function _redessinerFluxSiPresent() {
    if (!_appContainerRef) return;
    const zoneFlux = _appContainerRef.querySelector('[data-sl-zone="flux"]');
    if (!zoneFlux) return;
    zoneFlux.innerHTML = _construireHTMLFlux();
    _attacherEvenementsFlux(zoneFlux);

    const zonePublication = _appContainerRef.querySelector('[data-sl-zone="publication"]');
    if (zonePublication) {
      zonePublication.innerHTML = _construireHTMLZonePublication();
      _attacherEvenementsPublication(zonePublication);
    }

    const zoneTopbar = _appContainerRef.querySelector('[data-sl-zone="topbar"]');
    if (zoneTopbar) {
      zoneTopbar.innerHTML = _construireHTMLTopbar();
      _attacherEvenementsTopbar(zoneTopbar);
    }
  }

  /**
   * Attache les écouteurs d'événements de la topbar (sélecteur de thème).
   * @param {HTMLElement} zone - Élément conteneur de la topbar.
   * @private
   */
  function _attacherEvenementsTopbar(zone) {
    zone.querySelectorAll('[data-sl-action="changer-theme"]').forEach((dot) => {
      dot.addEventListener("click", () => {
        const nomTheme = dot.getAttribute("data-sl-theme");
        _appliquerTheme(nomTheme);
        _redessinerFluxSiPresent();
      });
    });
  }

  /**
   * Attache les écouteurs d'événements de la zone de publication (compteur
   * de caractères en direct, soumission du formulaire de publication).
   * @param {HTMLElement} zone - Élément conteneur de la zone de publication.
   * @private
   */
  function _attacherEvenementsPublication(zone) {
    const textarea = zone.querySelector('textarea[name="contenu"]');
    const compteur = zone.querySelector('[data-sl-zone="compteur-publication"]');
    if (textarea && compteur) {
      const maxLongueur =
        (_state.config && _state.config.maxLongueurPost) || DEFAULT_CONFIG.maxLongueurPost;
      textarea.addEventListener("input", () => {
        compteur.textContent = textarea.value.length + " / " + maxLongueur;
      });
    }

    const formulaire = zone.querySelector('[data-sl-form="publier"]');
    if (formulaire) {
      formulaire.addEventListener("submit", (evenement) => {
        evenement.preventDefault();
        const donnees = new FormData(formulaire);
        const contenu = donnees.get("contenu");
        const image = donnees.get("image");
        const zoneErreur = zone.querySelector('[data-sl-zone="publier-erreur"]');

        const resultat = publierMessage(contenu, image);
        if (!resultat.succes) {
          if (zoneErreur) zoneErreur.textContent = resultat.message;
          formulaire.classList.add("sl-anim-shake");
          setTimeout(() => formulaire.classList.remove("sl-anim-shake"), 420);
          return;
        }

        formulaire.reset();
        if (compteur) {
          const maxLongueur =
            (_state.config && _state.config.maxLongueurPost) || DEFAULT_CONFIG.maxLongueurPost;
          compteur.textContent = "0 / " + maxLongueur;
        }
        if (resultat.post.moderePar) {
          afficherToast("Publication envoyée (certains termes ont été filtrés).", "info");
        } else {
          afficherToast("Publication envoyée !", "succes");
        }
        _redessinerFluxSiPresent();
      });
    }
  }

  /**
   * Attache l'ensemble des écouteurs d'événements nécessaires au flux de
   * publications : like, ouverture/fermeture des commentaires, et envoi
   * de nouveaux commentaires.
   * @param {HTMLElement} zone - Élément conteneur du flux.
   * @private
   */
  function _attacherEvenementsFlux(zone) {
    zone.querySelectorAll('[data-sl-action="toggle-like"]').forEach((bouton) => {
      bouton.addEventListener("click", () => {
        const postId = bouton.getAttribute("data-sl-post-id");
        const resultat = toggleLike(postId);
        if (!resultat.succes) {
          afficherToast(resultat.message, "erreur");
          return;
        }
        bouton.classList.toggle("sl-like-actif", resultat.estLike);
        const icone = bouton.querySelector(".sl-icone-coeur");
        if (icone) icone.textContent = resultat.estLike ? "❤️" : "🤍";
        const compteurEl = bouton.querySelector(
          '[data-sl-zone="likes-count-' + postId + '"]'
        );
        if (compteurEl) compteurEl.textContent = String(resultat.likesCount);
      });
    });

    zone.querySelectorAll('[data-sl-action="toggle-commentaires"]').forEach((bouton) => {
      bouton.addEventListener("click", () => {
        const postId = bouton.getAttribute("data-sl-post-id");
        _state.openComments[postId] = !_state.openComments[postId];
        const zoneComments = zone.querySelector(
          '[data-sl-comments-zone="' + postId + '"]'
        );
        if (zoneComments) {
          zoneComments.classList.toggle("sl-comments-ouvert", _state.openComments[postId]);
        }
      });
    });

    zone.querySelectorAll('[data-sl-form="commentaire"]').forEach((formulaire) => {
      formulaire.addEventListener("submit", (evenement) => {
        evenement.preventDefault();
        const postId = formulaire.getAttribute("data-sl-post-id");
        const donnees = new FormData(formulaire);
        const contenu = donnees.get("contenu");

        const resultat = ajouterCommentaire(postId, contenu);
        if (!resultat.succes) {
          afficherToast(resultat.message, "erreur");
          return;
        }

        formulaire.reset();
        _state.openComments[postId] = true;

        const listeEl = zone.querySelector('[data-sl-comments-liste="' + postId + '"]');
        const compteurBoutonEl = zone.querySelector(
          '[data-sl-action="toggle-commentaires"][data-sl-post-id="' + postId + '"]'
        );
        if (listeEl) {
          const videEl = listeEl.querySelector(".sl-comment-vide");
          if (videEl) videEl.remove();
          const c = resultat.commentaire;
          const div = document.createElement("div");
          div.className = "sl-comment-item sl-anim-fadein";
          div.innerHTML = `
            <img class="sl-avatar-sm" src="${_echapperHTML(c.avatar)}" alt="avatar" />
            <div class="sl-comment-bulle">
              <div class="sl-comment-pseudo">${_echapperHTML(c.auteur)}</div>
              <div class="sl-comment-texte">${_echapperHTML(c.contenu)}</div>
            </div>
          `;
          listeEl.appendChild(div);
        }
        if (compteurBoutonEl) {
          const nb = obtenirCommentaires(postId).length;
          compteurBoutonEl.innerHTML =
            "💬 " + _echapperHTML(_t("commentaires")) + " (" + nb + ")";
        }
      });
    });
  }

  /**
   * Construit et monte l'interface complète du réseau social (topbar avec
   * sélecteur de thème, zone de publication, barre de recherche, flux de
   * publications avec likes et commentaires imbriqués) dans le conteneur
   * DOM ciblé.
   * @param {string|HTMLElement} cible - Sélecteur CSS ou élément DOM hôte.
   * @returns {HTMLElement} Élément conteneur monté.
   * @public
   */
  function creerInterfaceComplete(cible) {
    if (!_state.initialized) {
      throw new Error(
        "[SocialLang] creerInterfaceComplete() ne peut être appelé qu'après SocialLang.init()."
      );
    }
    const hote = _resoudreElement(cible, "creerInterfaceComplete");
    hote.setAttribute("data-sociallang-root", "");
    hote.classList.add("sl-app");

    _hydraterCache();

    const conteneur = document.createElement("div");
    conteneur.className = "sl-conteneur";
    conteneur.innerHTML = `
      <div data-sl-zone="topbar">${_construireHTMLTopbar()}</div>
      <div data-sl-zone="publication">${_construireHTMLZonePublication()}</div>
      ${_construireHTMLRecherche()}
      <div data-sl-zone="flux">${_construireHTMLFlux()}</div>
    `;

    hote.innerHTML = "";
    hote.appendChild(conteneur);
    _appContainerRef = conteneur;

    _attacherEvenementsTopbar(conteneur.querySelector('[data-sl-zone="topbar"]'));
    _attacherEvenementsPublication(conteneur.querySelector('[data-sl-zone="publication"]'));
    _attacherEvenementsFlux(conteneur.querySelector('[data-sl-zone="flux"]'));

    const inputRecherche = conteneur.querySelector('[data-sl-input="recherche"]');
    if (inputRecherche) {
      let debounceTimer = null;
      inputRecherche.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        const valeur = inputRecherche.value;
        debounceTimer = setTimeout(() => {
          rechercherDansLeFil(valeur);
        }, 180);
      });
    }

    // Si la boîte d'authentification est montée séparément, on s'assure
    // que connexion/déconnexion redessine aussi cette interface complète.
    SocialLang.on("onLogin", () => _redessinerFluxSiPresent());
    SocialLang.on("onLogout", () => _redessinerFluxSiPresent());

    return conteneur;
  }

  /* ==========================================================================
   *  SECTION 19 — MODULE CORE : INITIALISATION PRINCIPALE
   * ======================================================================== */

  /**
   * Fusionne superficiellement la configuration utilisateur avec la
   * configuration par défaut, en ignorant toute clé non reconnue afin
   * d'éviter les pollutions accidentelles de l'objet de configuration
   * interne.
   * @param {Object} configUtilisateur - Configuration fournie par l'intégrateur.
   * @returns {Object} Configuration fusionnée.
   * @private
   */
  function _fusionnerConfig(configUtilisateur) {
    const config = Object.assign({}, DEFAULT_CONFIG);
    if (configUtilisateur && typeof configUtilisateur === "object") {
      Object.keys(DEFAULT_CONFIG).forEach((cle) => {
        if (configUtilisateur[cle] !== undefined) {
          config[cle] = configUtilisateur[cle];
        }
      });
    }
    return config;
  }

  /**
   * Point d'entrée principal du framework. Doit être appelé une seule fois
   * avant toute autre méthode publique de SocialLang. Initialise la
   * configuration, injecte les styles CSS globaux, applique le thème
   * sélectionné (ou celui précédemment choisi par l'utilisateur s'il est
   * persisté), restaure la session utilisateur existante et hydrate le
   * cache de publications.
   *
   * @param {Object} [configUtilisateur={}] - Configuration d'initialisation.
   * @param {string} [configUtilisateur.nomReseau="SocialLang"] - Nom affiché du réseau social.
   * @param {string} [configUtilisateur.apiKey] - Clé API fictive (à des fins de démonstration / future extension serveur).
   * @param {string} [configUtilisateur.langue="fr"] - Langue de l'interface.
   * @param {string} [configUtilisateur.theme="clair"] - Thème initial ("clair", "sombre", "cyberpunk", "retro", "dracula").
   * @param {number} [configUtilisateur.maxLongueurPost=500] - Longueur maximale d'une publication.
   * @param {number} [configUtilisateur.maxLongueurCommentaire=250] - Longueur maximale d'un commentaire.
   * @param {boolean} [configUtilisateur.moderationActive=true] - Active la modération automatique par regex.
   * @param {boolean} [configUtilisateur.persistanceActive=true] - Active la persistance de session via localStorage.
   * @param {boolean} [configUtilisateur.debug=false] - Active les logs de diagnostic en console.
   * @returns {Object} La configuration effective appliquée.
   * @public
   *
   * @example
   * SocialLang.init({
   *   nomReseau: "Tark Social",
   *   apiKey: "demo-key-9d8f7a",
   *   theme: "dracula",
   *   langue: "fr"
   * });
   */
  function init(configUtilisateur) {
    _state.config = _fusionnerConfig(configUtilisateur);
    _state.initialized = true;

    _injecterStylesGlobaux();

    const themeSauvegarde = _state.config.persistanceActive
      ? _lireStockage(LS_KEYS.THEME, null)
      : null;
    const themeAAppliquer =
      themeSauvegarde && THEMES[themeSauvegarde] ? themeSauvegarde : _state.config.theme;
    _appliquerTheme(THEMES[themeAAppliquer] ? themeAAppliquer : "clair");

    _restaurerSession();
    _hydraterCache();

    if (_state.config.debug) {
      console.info(
        "[SocialLang] Initialisé — version " +
          VERSION +
          " — runtime " +
          RUNTIME_ID +
          " — config :",
        _state.config
      );
    }

    return _state.config;
  }

  /**
   * Réinitialise complètement les données du framework (utilisateurs,
   * session, publications, commentaires, likes, thème) en supprimant
   * toutes les clés persistées. Utile pour les démonstrations ou les
   * tests, afin de repartir d'un état totalement vierge.
   * @public
   */
  function reinitialiserDonnees() {
    Object.values(LS_KEYS).forEach((cle) => _supprimerStockage(cle));
    _state.currentUser = null;
    _state.postsCache = [];
    _state.cacheHydrated = false;
    _state.searchQuery = "";
    _state.openComments = {};
    afficherToast("Toutes les données SocialLang ont été réinitialisées.", "info");
    _redessinerAuthSiPresent();
    _redessinerFluxSiPresent();
  }

  /**
   * Enregistre un écouteur sur un événement interne du framework.
   * Événements disponibles : "onLogin", "onLogout", "onNewPost", "onThemeChange".
   * @param {string} type - Type d'événement à écouter.
   * @param {Function} callback - Fonction appelée lors de l'émission de l'événement.
   * @public
   */
  function on(type, callback) {
    if (!_state.listeners[type]) {
      console.warn(
        "[SocialLang] Type d'événement inconnu : '" +
          type +
          "'. Types valides : " +
          Object.keys(_state.listeners).join(", ")
      );
      return;
    }
    if (typeof callback === "function") {
      _state.listeners[type].push(callback);
    }
  }

  /**
   * Change le thème actif de l'application. Méthode publique équivalente
   * à une sélection manuelle via les pastilles de thème de la topbar.
   * @param {string} nomTheme - Nom du thème ("clair", "sombre", "cyberpunk", "retro", "dracula").
   * @public
   */
  function changerTheme(nomTheme) {
    const reussite = _appliquerTheme(nomTheme);
    if (reussite) {
      _redessinerFluxSiPresent();
    }
    return reussite;
  }

  /**
   * Retourne la liste des noms de thèmes disponibles dans le framework.
   * @returns {Array<string>} Noms des thèmes.
   * @public
   */
  function listerThemes() {
    return Object.keys(THEMES);
  }

  /**
   * Retourne une copie de la configuration active du framework.
   * @returns {Object|null} Configuration active, ou null si non initialisé.
   * @public
   */
  function obtenirConfig() {
    return _state.config ? Object.assign({}, _state.config) : null;
  }

  /* ==========================================================================
   *  SECTION 20 — EXPOSITION DE L'API PUBLIQUE
   * ======================================================================== */

  /**
   * Surface d'API publique du framework SocialLang. Chaque méthode ci-
   * dessous est documentée dans sa déclaration respective plus haut dans
   * ce fichier.
   */
  Object.assign(SocialLang, {
    // --- Core ---
    init: init,
    VERSION: VERSION,
    reinitialiserDonnees: reinitialiserDonnees,
    on: on,
    obtenirConfig: obtenirConfig,

    // --- Thèmes ---
    changerTheme: changerTheme,
    listerThemes: listerThemes,

    // --- Comptes / sessions ---
    inscrireUtilisateur: inscrireUtilisateur,
    connecterUtilisateur: connecterUtilisateur,
    deconnecterUtilisateur: deconnecterUtilisateur,
    obtenirUtilisateurCourant: obtenirUtilisateurCourant,

    // --- Composants UI ---
    creerSystemeAuthentification: creerSystemeAuthentification,
    creerInterfaceComplete: creerInterfaceComplete,
    afficherToast: afficherToast,

    // --- Flux / publications ---
    publierMessage: publierMessage,
    obtenirPostsAffiches: obtenirPostsAffiches,
    rechercherDansLeFil: rechercherDansLeFil,

    // --- Interactions ---
    toggleLike: toggleLike,
    ajouterCommentaire: ajouterCommentaire,
    obtenirCommentaires: obtenirCommentaires,
  });

  /* ==========================================================================
   *  SECTION 21 — ATTACHEMENT AU SCOPE GLOBAL
   * ======================================================================== */

  /**
   * Expose l'objet SocialLang sur le scope global (window), permettant à
   * tout script HTML de l'utiliser immédiatement après l'import de ce
   * fichier via une simple balise <script>.
   */
  window.SocialLang = SocialLang;

  /**
   * Compatibilité avec les environnements de modules (CommonJS / AMD) au
   * cas où le fichier serait importé via un bundler plutôt que via une
   * balise <script> classique.
   */
  if (typeof module !== "undefined" && module.exports) {
    module.exports = SocialLang;
  }
})(window, document);
