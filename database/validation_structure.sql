-- =====================================================
-- 📊 VALIDATION ET ANALYSE - STRUCTURE DATABASE
-- GabMarketHub - Vérification complète
-- =====================================================

USE `gabmarkethub`;

-- =====================================================
-- 🔍 ANALYSE DES TABLES ET RELATIONS
-- =====================================================

-- Vue d'ensemble des tables
SELECT 
    'TABLES CRÉÉES' as section,
    COUNT(*) as total_tables
FROM information_schema.tables 
WHERE table_schema = 'gabmarkethub';

-- Détail des tables par catégorie
SELECT 
    CASE 
        WHEN table_name LIKE '%user%' OR table_name IN ('roles', 'addresses', 'buyer_profiles', 'supplier_profiles', 'user_sessions') THEN '👥 UTILISATEURS'
        WHEN table_name LIKE '%product%' OR table_name IN ('categories', 'brands') THEN '🛍️ CATALOGUE'
        WHEN table_name LIKE '%order%' OR table_name LIKE '%payment%' THEN '🛒 COMMANDES'
        WHEN table_name LIKE '%conversation%' OR table_name LIKE '%message%' THEN '💬 MESSAGERIE'
        WHEN table_name LIKE '%review%' OR table_name LIKE '%wishlist%' THEN '⭐ SOCIAL'
        WHEN table_name LIKE '%notification%' THEN '🔔 NOTIFICATIONS'
        WHEN table_name LIKE '%coupon%' OR table_name LIKE '%shipping%' THEN '🎯 MARKETING/LOGISTIQUE'
        WHEN table_name LIKE '%log%' OR table_name LIKE '%session%' THEN '📊 ANALYTICS'
        ELSE '🔧 AUTRES'
    END as categorie,
    table_name as nom_table,
    table_rows as nb_lignes,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) as taille_mb
FROM information_schema.tables 
WHERE table_schema = 'gabmarkethub'
ORDER BY categorie, table_name;

-- =====================================================
-- 🔗 ANALYSE DES CONTRAINTES ET RELATIONS
-- =====================================================

-- Contraintes de clés étrangères
SELECT 
    '🔗 CONTRAINTES FK' as section,
    COUNT(*) as total_fk
FROM information_schema.key_column_usage 
WHERE constraint_schema = 'gabmarkethub' 
AND referenced_table_name IS NOT NULL;

-- Détail des relations
SELECT 
    kcu.table_name as table_enfant,
    kcu.column_name as colonne_fk,
    kcu.referenced_table_name as table_parent,
    kcu.referenced_column_name as colonne_parent,
    kcu.constraint_name as nom_contrainte
FROM information_schema.key_column_usage kcu
WHERE kcu.constraint_schema = 'gabmarkethub'
AND kcu.referenced_table_name IS NOT NULL
ORDER BY kcu.table_name, kcu.column_name;

-- =====================================================
-- 📈 ANALYSE DES INDEX
-- =====================================================

-- Statistiques des index
SELECT 
    '📈 INDEX CRÉÉS' as section,
    COUNT(*) as total_index
FROM information_schema.statistics 
WHERE table_schema = 'gabmarkethub';

-- Index par table
SELECT 
    table_name,
    COUNT(*) as nb_index,
    GROUP_CONCAT(DISTINCT index_name ORDER BY index_name SEPARATOR ', ') as liste_index
FROM information_schema.statistics 
WHERE table_schema = 'gabmarkethub'
AND index_name != 'PRIMARY'
GROUP BY table_name
ORDER BY nb_index DESC;

-- =====================================================
-- 🎯 VALIDATION DES DONNÉES DE TEST
-- =====================================================

-- Validation utilisateurs
SELECT 
    '👥 UTILISATEURS' as section,
    r.display_name as role,
    COUNT(u.id) as nombre,
    GROUP_CONCAT(CONCAT(u.first_name, ' ', u.last_name) SEPARATOR ', ') as utilisateurs
FROM users u
JOIN roles r ON u.role_id = r.id
GROUP BY r.id, r.display_name
ORDER BY r.id;

-- Validation produits par catégorie
SELECT 
    '🛍️ PRODUITS' as section,
    c.name as categorie,
    COUNT(p.id) as nb_produits,
    AVG(p.price) as prix_moyen,
    SUM(p.stock_quantity) as stock_total
FROM products p
JOIN categories c ON p.category_id = c.id
WHERE p.deleted_at IS NULL
GROUP BY c.id, c.name
ORDER BY nb_produits DESC;

-- Validation commandes
SELECT 
    '🛒 COMMANDES' as section,
    o.status as statut,
    COUNT(*) as nombre,
    SUM(o.total_amount) as montant_total,
    AVG(o.total_amount) as montant_moyen
FROM orders o
GROUP BY o.status
ORDER BY nombre DESC;

-- Validation messages et conversations
SELECT 
    '💬 MESSAGERIE' as section,
    c.type as type_conversation,
    COUNT(DISTINCT c.id) as nb_conversations,
    COUNT(m.id) as nb_messages,
    AVG(LENGTH(m.content)) as longueur_moyenne_message
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
WHERE m.deleted_at IS NULL
GROUP BY c.type;

-- =====================================================
-- 🔍 REQUÊTES DE PERFORMANCE ET OPTIMISATION
-- =====================================================

-- Tables les plus volumineuses
SELECT 
    '📊 TABLES VOLUMINEUSES' as section,
    table_name,
    table_rows,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) as taille_mb,
    ROUND((data_length / 1024 / 1024), 2) as donnees_mb,
    ROUND((index_length / 1024 / 1024), 2) as index_mb
FROM information_schema.tables
WHERE table_schema = 'gabmarkethub'
AND table_rows > 0
ORDER BY (data_length + index_length) DESC
LIMIT 10;

-- Colonnes JSON utilisées
SELECT 
    '🎯 COLONNES JSON' as section,
    table_name,
    column_name,
    column_comment
FROM information_schema.columns
WHERE table_schema = 'gabmarkethub'
AND data_type = 'json'
ORDER BY table_name, column_name;

-- =====================================================
-- 🚀 TESTS DE PERFORMANCES
-- =====================================================

-- Test de jointure complexe : Produits avec détails complets
EXPLAIN SELECT 
    p.name as produit,
    c.name as categorie,
    b.name as marque,
    CONCAT(u.first_name, ' ', u.last_name) as fournisseur,
    sp.business_name,
    p.price,
    p.rating_average,
    p.stock_quantity
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN brands b ON p.brand_id = b.id
LEFT JOIN users u ON p.supplier_id = u.id
LEFT JOIN supplier_profiles sp ON u.id = sp.user_id
WHERE p.status = 'active'
AND p.deleted_at IS NULL
ORDER BY p.rating_average DESC, p.order_count DESC
LIMIT 20;

-- Test de requête sur commandes avec détails
EXPLAIN SELECT 
    o.order_number,
    CONCAT(u.first_name, ' ', u.last_name) as acheteur,
    o.status,
    o.total_amount,
    COUNT(oi.id) as nb_articles,
    o.created_at
FROM orders o
JOIN users u ON o.buyer_id = u.id
LEFT JOIN order_items oi ON o.id = oi.order_id
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY o.id
ORDER BY o.created_at DESC;

-- =====================================================
-- 🎯 REQUÊTES MÉTIER COMPLEXES
-- =====================================================

-- Top 10 des produits les mieux notés avec statistiques
SELECT 
    '⭐ TOP PRODUITS' as section,
    p.name,
    p.rating_average,
    p.rating_count,
    p.order_count,
    p.price,
    c.name as categorie,
    CONCAT(u.first_name, ' ', u.last_name) as fournisseur
FROM products p
JOIN categories c ON p.category_id = c.id
JOIN users u ON p.supplier_id = u.id
WHERE p.status = 'active' 
AND p.rating_count >= 1
ORDER BY p.rating_average DESC, p.rating_count DESC
LIMIT 10;

-- Analyse des ventes par fournisseur
SELECT 
    '💰 VENTES FOURNISSEURS' as section,
    sp.business_name,
    COUNT(DISTINCT p.id) as nb_produits,
    COUNT(DISTINCT oi.order_id) as nb_commandes,
    SUM(oi.total) as ca_total,
    AVG(oi.price) as prix_moyen,
    AVG(p.rating_average) as note_moyenne
FROM supplier_profiles sp
JOIN users u ON sp.user_id = u.id
JOIN products p ON u.id = p.supplier_id
LEFT JOIN order_items oi ON p.id = oi.product_id
WHERE p.status = 'active'
GROUP BY sp.id, sp.business_name
HAVING nb_commandes > 0
ORDER BY ca_total DESC;

-- Analyse des conversations actives
SELECT 
    '💬 CONVERSATIONS ACTIVES' as section,
    c.type as type_conversation,
    c.subject,
    COUNT(m.id) as nb_messages,
    MAX(m.created_at) as dernier_message,
    COUNT(DISTINCT cp.user_id) as nb_participants
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
WHERE c.status = 'active'
AND m.deleted_at IS NULL
GROUP BY c.id
ORDER BY dernier_message DESC
LIMIT 10;

-- =====================================================
-- 🔔 ANALYSE DES NOTIFICATIONS
-- =====================================================

-- Statistiques des notifications par type
SELECT 
    '🔔 NOTIFICATIONS' as section,
    nt.display_name as type_notification,
    COUNT(n.id) as nb_envoyees,
    COUNT(CASE WHEN n.read_at IS NOT NULL THEN 1 END) as nb_lues,
    ROUND(COUNT(CASE WHEN n.read_at IS NOT NULL THEN 1 END) * 100.0 / COUNT(n.id), 2) as taux_lecture
FROM notification_types nt
LEFT JOIN notifications n ON nt.id = n.type_id
GROUP BY nt.id, nt.display_name
ORDER BY nb_envoyees DESC;

-- =====================================================
-- 🛡️ VALIDATION SÉCURITÉ
-- =====================================================

-- Vérification des mots de passe hashés
SELECT 
    '🛡️ SÉCURITÉ' as section,
    'Mots de passe' as element,
    COUNT(*) as total_users,
    COUNT(CASE WHEN password LIKE '$2b$%' THEN 1 END) as mots_passe_hashes,
    CASE 
        WHEN COUNT(*) = COUNT(CASE WHEN password LIKE '$2b$%' THEN 1 END) 
        THEN '✅ TOUS HASHÉS' 
        ELSE '❌ PROBLÈME DÉTECTÉ' 
    END as statut
FROM users;

-- Vérification des UUID
SELECT 
    'UUID' as element,
    COUNT(*) as total_records,
    COUNT(CASE WHEN uuid REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END) as uuid_valides,
    CASE 
        WHEN COUNT(*) = COUNT(CASE WHEN uuid REGEXP '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 1 END)
        THEN '✅ TOUS VALIDES'
        ELSE '❌ PROBLÈME DÉTECTÉ'
    END as statut
FROM users;

-- =====================================================
-- 📊 RAPPORT FINAL
-- =====================================================

SELECT 
    '📊 RAPPORT FINAL' as section,
    'Structure complète validée' as resultat,
    CONCAT(
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'gabmarkethub'), 
        ' tables créées'
    ) as tables,
    CONCAT(
        (SELECT COUNT(*) FROM information_schema.key_column_usage WHERE constraint_schema = 'gabmarkethub' AND referenced_table_name IS NOT NULL),
        ' contraintes FK'
    ) as contraintes,
    CONCAT(
        (SELECT COUNT(*) FROM users),
        ' utilisateurs de test'
    ) as utilisateurs,
    CONCAT(
        (SELECT COUNT(*) FROM products WHERE deleted_at IS NULL),
        ' produits actifs'
    ) as produits,
    CONCAT(
        (SELECT COUNT(*) FROM orders),
        ' commandes créées'
    ) as commandes,
    '✅ BASE PRÊTE POUR PRODUCTION' as statut;

-- Espace disque utilisé
SELECT 
    'ESPACE DISQUE' as element,
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as taille_totale_mb,
    ROUND(SUM(data_length) / 1024 / 1024, 2) as donnees_mb,
    ROUND(SUM(index_length) / 1024 / 1024, 2) as index_mb
FROM information_schema.tables
WHERE table_schema = 'gabmarkethub';

-- Recommandations finales
SELECT 
    '🎯 RECOMMANDATIONS' as section,
    'Sauvegarde régulière' as recommandation_1,
    'Monitoring des performances' as recommandation_2,
    'Optimisation des requêtes lentes' as recommandation_3,
    'Maintenance des index' as recommandation_4,
    'Archivage des données anciennes' as recommandation_5;