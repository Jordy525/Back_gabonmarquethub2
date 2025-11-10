/**
 * Utilitaire pour construire les URLs de manière dynamique
 * Utilise les variables d'environnement pour éviter les URLs codées en dur
 */

/**
 * Construit l'URL de base de l'API
 * @returns {string} URL de base de l'API
 */
function getApiBaseUrl() {
    if (process.env.API_BASE_URL) {
        return process.env.API_BASE_URL;
    }
    
    const host = process.env.HOST || 'localhost';
    const port = process.env.PORT || 3001;
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    
    return `${protocol}://${host}:${port}`;
}

/**
 * Construit l'URL WebSocket
 * @returns {string} URL WebSocket
 */
function getWebSocketUrl() {
    if (process.env.WS_URL || process.env.SOCKET_URL) {
        return process.env.WS_URL || process.env.SOCKET_URL;
    }
    
    return getApiBaseUrl();
}

/**
 * Construit l'URL complète d'une image/fichier
 * @param {string} filePath - Chemin du fichier (peut être relatif ou absolu)
 * @returns {string|null} URL complète ou null si pas de fichier
 */
function buildFileUrl(filePath) {
    if (!filePath) return null;
    
    // Si c'est déjà une URL complète (http/https), la retourner telle quelle
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
        return filePath;
    }
    
    // Construire l'URL complète
    const baseUrl = getApiBaseUrl();
    const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    
    return `${baseUrl}${cleanPath}`;
}

/**
 * Construit l'URL d'une photo de profil
 * @param {string} photoPath - Chemin de la photo
 * @returns {string|null} URL complète de la photo ou null
 */
function buildProfilePhotoUrl(photoPath) {
    return buildFileUrl(photoPath);
}

/**
 * Construit les origins CORS depuis les variables d'environnement
 * @returns {string[]} Liste des origins autorisés
 */
function getCorsOrigins() {
    const origins = [];
    
    // Ajouter les URLs depuis les variables d'environnement
    if (process.env.FRONTEND_URL) origins.push(process.env.FRONTEND_URL);
    if (process.env.ADMIN_URL) origins.push(process.env.ADMIN_URL);
    if (process.env.API_BASE_URL) origins.push(process.env.API_BASE_URL);
    
    // Ajouter les origins depuis CORS_ORIGIN si défini
    if (process.env.CORS_ORIGIN) {
        const additionalOrigins = process.env.CORS_ORIGIN.split(',').map(origin => origin.trim());
        origins.push(...additionalOrigins);
    }
    
    // Fallbacks pour le développement si aucune variable n'est définie
    if (origins.length === 0) {
        origins.push("http://localhost:8080", "http://localhost:3000", "http://localhost:5173");
    }
    
    // Supprimer les doublons
    return [...new Set(origins)];
}

/**
 * Construit une URL de redirection
 * @param {string} path - Chemin de redirection
 * @param {string} type - Type d'URL ('frontend', 'admin', 'api')
 * @returns {string} URL complète de redirection
 */
function buildRedirectUrl(path = '', type = 'frontend') {
    let baseUrl;
    
    switch (type) {
        case 'admin':
            baseUrl = process.env.ADMIN_URL || process.env.FRONTEND_URL || 'http://localhost:8080';
            break;
        case 'api':
            baseUrl = getApiBaseUrl();
            break;
        case 'frontend':
        default:
            baseUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
            break;
    }
    
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
}

/**
 * Valide si une URL est correcte
 * @param {string} url - URL à valider
 * @returns {boolean} True si l'URL est valide
 */
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    getApiBaseUrl,
    getWebSocketUrl,
    buildFileUrl,
    buildProfilePhotoUrl,
    getCorsOrigins,
    buildRedirectUrl,
    isValidUrl
};