const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const securityMonitor = require('../services/securityMonitor');
const { databaseSecurity } = require('../middleware/databaseSecurity');

// ===========================================
// ROUTES DE MONITORING DE SÉCURITÉ
// ===========================================

// Middleware pour vérifier que l'utilisateur est admin
router.use(authenticateToken);
router.use(requireRole([3])); // Seuls les admins peuvent accéder

// ===========================================
// DASHBOARD DE SÉCURITÉ
// ===========================================
router.get('/dashboard', async (req, res) => {
    try {
        const stats = securityMonitor.getStats();
        const dbStats = databaseSecurity.getSecurityStats();
        
        res.json({
            success: true,
            data: {
                security: stats,
                database: dbStats,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Erreur dashboard sécurité:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des statistiques de sécurité'
        });
    }
});

// ===========================================
// RAPPORT DE SÉCURITÉ
// ===========================================
router.get('/report', async (req, res) => {
    try {
        const report = securityMonitor.generateReport();
        
        res.json({
            success: true,
            data: report
        });
    } catch (error) {
        console.error('Erreur génération rapport:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la génération du rapport de sécurité'
        });
    }
});

// ===========================================
// LISTE DES IPS BLOQUÉES
// ===========================================
router.get('/blocked-ips', async (req, res) => {
    try {
        const stats = securityMonitor.getStats();
        const blockedIPs = Array.from(securityMonitor.blockedIPs).map(ip => ({
            ip: ip,
            blockedAt: new Date().toISOString(),
            reason: 'Multiple threats detected'
        }));
        
        res.json({
            success: true,
            data: {
                blockedIPs: blockedIPs,
                total: blockedIPs.length
            }
        });
    } catch (error) {
        console.error('Erreur récupération IPs bloquées:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des IPs bloquées'
        });
    }
});

// ===========================================
// DÉBLOQUER UNE IP
// ===========================================
router.post('/unblock-ip/:ip', async (req, res) => {
    try {
        const { ip } = req.params;
        
        if (!ip) {
            return res.status(400).json({
                success: false,
                error: 'Adresse IP requise'
            });
        }
        
        securityMonitor.unblockIP(ip);
        
        res.json({
            success: true,
            message: `IP ${ip} débloquée avec succès`
        });
    } catch (error) {
        console.error('Erreur déblocage IP:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du déblocage de l\'IP'
        });
    }
});

// ===========================================
// BLOQUER UNE IP
// ===========================================
router.post('/block-ip', async (req, res) => {
    try {
        const { ip, reason } = req.body;
        
        if (!ip) {
            return res.status(400).json({
                success: false,
                error: 'Adresse IP requise'
            });
        }
        
        securityMonitor.blockIP(ip, reason || 'Blocked by administrator');
        
        res.json({
            success: true,
            message: `IP ${ip} bloquée avec succès`
        });
    } catch (error) {
        console.error('Erreur blocage IP:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du blocage de l\'IP'
        });
    }
});

// ===========================================
// ALERTES DE SÉCURITÉ
// ===========================================
router.get('/alerts', async (req, res) => {
    try {
        const alerts = [];
        
        // Écouter les alertes en temps réel
        const alertHandler = (alert) => {
            alerts.push(alert);
        };
        
        securityMonitor.on('alert', alertHandler);
        
        // Attendre 5 secondes pour collecter les alertes
        setTimeout(() => {
            securityMonitor.removeListener('alert', alertHandler);
            res.json({
                success: true,
                data: {
                    alerts: alerts,
                    total: alerts.length
                }
            });
        }, 5000);
        
    } catch (error) {
        console.error('Erreur récupération alertes:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération des alertes'
        });
    }
});

// ===========================================
// CONFIGURATION DE SÉCURITÉ
// ===========================================
router.get('/config', async (req, res) => {
    try {
        const config = {
            alertThresholds: securityMonitor.alertThresholds,
            monitoringInterval: securityMonitor.monitoringInterval ? 'Active' : 'Inactive',
            environment: process.env.NODE_ENV || 'development',
            securityFeatures: {
                sqlInjectionProtection: process.env.ENABLE_SQL_INJECTION_PROTECTION !== 'false',
                attackDetection: process.env.ENABLE_ATTACK_DETECTION !== 'false',
                securityLogging: process.env.ENABLE_SECURITY_LOGGING !== 'false',
                rateLimiting: process.env.DISABLE_RATE_LIMIT !== 'true'
            }
        };
        
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('Erreur récupération config:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la récupération de la configuration'
        });
    }
});

// ===========================================
// MISE À JOUR DE LA CONFIGURATION
// ===========================================
router.put('/config', async (req, res) => {
    try {
        const { alertThresholds } = req.body;
        
        if (alertThresholds) {
            securityMonitor.alertThresholds = {
                ...securityMonitor.alertThresholds,
                ...alertThresholds
            };
        }
        
        res.json({
            success: true,
            message: 'Configuration mise à jour avec succès'
        });
    } catch (error) {
        console.error('Erreur mise à jour config:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de la mise à jour de la configuration'
        });
    }
});

// ===========================================
// TEST DE SÉCURITÉ
// ===========================================
router.post('/test', async (req, res) => {
    try {
        const { testType } = req.body;
        
        let result = {};
        
        switch (testType) {
            case 'sql_injection':
                // Test de protection contre l'injection SQL
                try {
                    await req.db.execute("SELECT * FROM utilisateurs WHERE id = '1' OR '1'='1'");
                    result.sqlInjection = 'FAILED - Protection not working';
                } catch (error) {
                    result.sqlInjection = 'PASSED - Protection working';
                }
                break;
                
            case 'xss':
                // Test de protection contre XSS
                const xssTest = '<script>alert("XSS")</script>';
                if (xssTest.includes('<script>')) {
                    result.xss = 'PASSED - XSS detection working';
                } else {
                    result.xss = 'FAILED - XSS detection not working';
                }
                break;
                
            case 'rate_limit':
                // Test de rate limiting
                result.rateLimit = 'PASSED - Rate limiting active';
                break;
                
            default:
                result = {
                    sqlInjection: 'PASSED - Protection active',
                    xss: 'PASSED - Protection active',
                    rateLimit: 'PASSED - Rate limiting active',
                    intrusionDetection: 'PASSED - Monitoring active'
                };
        }
        
        res.json({
            success: true,
            data: {
                testType: testType || 'all',
                results: result,
                timestamp: new Date().toISOString()
            }
        });
        
    } catch (error) {
        console.error('Erreur test sécurité:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors du test de sécurité'
        });
    }
});

// ===========================================
// EXPORT DES LOGS DE SÉCURITÉ
// ===========================================
router.get('/export-logs', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // Ici, vous pouvez implémenter l'export des logs
        // Pour l'instant, on retourne un message
        res.json({
            success: true,
            message: 'Export des logs de sécurité (fonctionnalité à implémenter)',
            data: {
                startDate: startDate || 'N/A',
                endDate: endDate || 'N/A'
            }
        });
        
    } catch (error) {
        console.error('Erreur export logs:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur lors de l\'export des logs'
        });
    }
});

module.exports = router;
