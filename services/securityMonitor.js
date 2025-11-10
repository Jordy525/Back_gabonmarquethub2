const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

// ===========================================
// SYSTÈME DE MONITORING DE SÉCURITÉ EN TEMPS RÉEL
// ===========================================

class SecurityMonitor extends EventEmitter {
    constructor() {
        super();
        this.threats = new Map();
        this.blockedIPs = new Set();
        this.suspiciousActivities = [];
        this.alertThresholds = {
            maxFailedLogins: 5,
            maxSuspiciousRequests: 10,
            maxAttackAttempts: 3
        };
        this.monitoringInterval = null;
        this.startMonitoring();
    }

    // ===========================================
    // DÉMARRAGE DU MONITORING
    // ===========================================
    startMonitoring() {
        // Vérifier les menaces toutes les 30 secondes
        this.monitoringInterval = setInterval(() => {
            this.checkThreats();
            this.cleanupOldData();
        }, 30000);

        console.log('🔒 Système de monitoring de sécurité démarré');
    }

    // ===========================================
    // ENREGISTREMENT D'UNE MENACE
    // ===========================================
    recordThreat(ip, threatType, details) {
        const threatId = `${ip}-${threatType}-${Date.now()}`;
        const threat = {
            id: threatId,
            ip: ip,
            type: threatType,
            details: details,
            timestamp: new Date(),
            severity: this.calculateSeverity(threatType, details)
        };

        this.threats.set(threatId, threat);
        this.emit('threatDetected', threat);

        // Vérifier si l'IP doit être bloquée
        this.checkIPBlocking(ip);

        // Envoyer une alerte si nécessaire
        this.checkAlertThresholds(ip, threatType);
    }

    // ===========================================
    // CALCUL DE LA SÉVÉRITÉ
    // ===========================================
    calculateSeverity(threatType, details) {
        const severityMap = {
            'SQL_INJECTION': 'HIGH',
            'XSS_ATTACK': 'HIGH',
            'BRUTE_FORCE': 'MEDIUM',
            'DICTIONARY_ATTACK': 'MEDIUM',
            'PORT_SCAN': 'HIGH',
            'FILE_ACCESS_ATTEMPT': 'HIGH',
            'COMMAND_INJECTION': 'CRITICAL',
            'ANOMALY_DETECTED': 'MEDIUM',
            'RATE_LIMIT_EXCEEDED': 'LOW',
            'SUSPICIOUS_HEADER': 'LOW'
        };

        return severityMap[threatType] || 'LOW';
    }

    // ===========================================
    // VÉRIFICATION DU BLOCAGE D'IP
    // ===========================================
    checkIPBlocking(ip) {
        const recentThreats = Array.from(this.threats.values())
            .filter(threat => 
                threat.ip === ip && 
                Date.now() - threat.timestamp.getTime() < 15 * 60 * 1000 // 15 minutes
            );

        const criticalThreats = recentThreats.filter(threat => 
            threat.severity === 'CRITICAL' || threat.severity === 'HIGH'
        );

        if (criticalThreats.length >= 3) {
            this.blockIP(ip, 'Multiple high-severity threats detected');
        } else if (recentThreats.length >= 10) {
            this.blockIP(ip, 'Too many threats in short period');
        }
    }

    // ===========================================
    // BLOCAGE D'UNE IP
    // ===========================================
    blockIP(ip, reason) {
        if (!this.blockedIPs.has(ip)) {
            this.blockedIPs.add(ip);
            this.emit('ipBlocked', { ip, reason, timestamp: new Date() });
            
            console.log(`🚫 IP ${ip} bloquée: ${reason}`);
            
            // Programmer le déblocage automatique après 1 heure
            setTimeout(() => {
                this.unblockIP(ip);
            }, 60 * 60 * 1000);
        }
    }

    // ===========================================
    // DÉBLOCAGE D'UNE IP
    // ===========================================
    unblockIP(ip) {
        if (this.blockedIPs.has(ip)) {
            this.blockedIPs.delete(ip);
            this.emit('ipUnblocked', { ip, timestamp: new Date() });
            console.log(`✅ IP ${ip} débloquée automatiquement`);
        }
    }

    // ===========================================
    // VÉRIFICATION DES SEUILS D'ALERTE
    // ===========================================
    checkAlertThresholds(ip, threatType) {
        const recentThreats = Array.from(this.threats.values())
            .filter(threat => 
                threat.ip === ip && 
                Date.now() - threat.timestamp.getTime() < 5 * 60 * 1000 // 5 minutes
            );

        // Alerte pour trop de tentatives de connexion échouées
        const failedLogins = recentThreats.filter(threat => 
            threat.type === 'BRUTE_FORCE' || threat.type === 'DICTIONARY_ATTACK'
        );

        if (failedLogins.length >= this.alertThresholds.maxFailedLogins) {
            this.emit('alert', {
                type: 'MULTIPLE_FAILED_LOGINS',
                ip: ip,
                count: failedLogins.length,
                message: `Trop de tentatives de connexion échouées depuis ${ip}`
            });
        }

        // Alerte pour trop de requêtes suspectes
        const suspiciousRequests = recentThreats.filter(threat => 
            threat.type === 'SUSPICIOUS_HEADER' || threat.type === 'ANOMALY_DETECTED'
        );

        if (suspiciousRequests.length >= this.alertThresholds.maxSuspiciousRequests) {
            this.emit('alert', {
                type: 'MULTIPLE_SUSPICIOUS_REQUESTS',
                ip: ip,
                count: suspiciousRequests.length,
                message: `Trop de requêtes suspectes depuis ${ip}`
            });
        }

        // Alerte pour trop de tentatives d'attaque
        const attackAttempts = recentThreats.filter(threat => 
            threat.severity === 'HIGH' || threat.severity === 'CRITICAL'
        );

        if (attackAttempts.length >= this.alertThresholds.maxAttackAttempts) {
            this.emit('alert', {
                type: 'MULTIPLE_ATTACK_ATTEMPTS',
                ip: ip,
                count: attackAttempts.length,
                message: `Tentatives d'attaque multiples depuis ${ip}`
            });
        }
    }

    // ===========================================
    // VÉRIFICATION DES MENACES
    // ===========================================
    checkThreats() {
        const now = Date.now();
        const recentThreats = Array.from(this.threats.values())
            .filter(threat => now - threat.timestamp.getTime() < 60 * 60 * 1000); // 1 heure

        // Analyser les patterns de menaces
        this.analyzeThreatPatterns(recentThreats);
    }

    // ===========================================
    // ANALYSE DES PATTERNS DE MENACES
    // ===========================================
    analyzeThreatPatterns(threats) {
        // Grouper par IP
        const threatsByIP = {};
        threats.forEach(threat => {
            if (!threatsByIP[threat.ip]) {
                threatsByIP[threat.ip] = [];
            }
            threatsByIP[threat.ip].push(threat);
        });

        // Analyser chaque IP
        Object.entries(threatsByIP).forEach(([ip, ipThreats]) => {
            const threatTypes = ipThreats.map(t => t.type);
            const uniqueThreatTypes = [...new Set(threatTypes)];

            // Si une IP a plusieurs types de menaces, c'est suspect
            if (uniqueThreatTypes.length >= 3) {
                this.emit('alert', {
                    type: 'MULTIPLE_THREAT_TYPES',
                    ip: ip,
                    threatTypes: uniqueThreatTypes,
                    message: `IP ${ip} présente plusieurs types de menaces: ${uniqueThreatTypes.join(', ')}`
                });
            }
        });
    }

    // ===========================================
    // NETTOYAGE DES DONNÉES ANCIENNES
    // ===========================================
    cleanupOldData() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24 heures

        // Nettoyer les menaces anciennes
        for (const [id, threat] of this.threats.entries()) {
            if (now - threat.timestamp.getTime() > maxAge) {
                this.threats.delete(id);
            }
        }

        // Nettoyer les activités suspectes anciennes
        this.suspiciousActivities = this.suspiciousActivities.filter(
            activity => now - activity.timestamp.getTime() < maxAge
        );
    }

    // ===========================================
    // VÉRIFICATION DU STATUT D'UNE IP
    // ===========================================
    isIPBlocked(ip) {
        return this.blockedIPs.has(ip);
    }

    // ===========================================
    // OBTENIR LES STATISTIQUES
    // ===========================================
    getStats() {
        const now = Date.now();
        const last24h = Array.from(this.threats.values())
            .filter(threat => now - threat.timestamp.getTime() < 24 * 60 * 60 * 1000);

        const stats = {
            totalThreats: this.threats.size,
            threatsLast24h: last24h.length,
            blockedIPs: this.blockedIPs.size,
            threatsByType: {},
            threatsBySeverity: {},
            topThreatIPs: {}
        };

        // Compter par type
        last24h.forEach(threat => {
            stats.threatsByType[threat.type] = (stats.threatsByType[threat.type] || 0) + 1;
            stats.threatsBySeverity[threat.severity] = (stats.threatsBySeverity[threat.severity] || 0) + 1;
            stats.topThreatIPs[threat.ip] = (stats.topThreatIPs[threat.ip] || 0) + 1;
        });

        return stats;
    }

    // ===========================================
    // GÉNÉRATION DE RAPPORT
    // ===========================================
    generateReport() {
        const stats = this.getStats();
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                totalThreats: stats.totalThreats,
                threatsLast24h: stats.threatsLast24h,
                blockedIPs: stats.blockedIPs
            },
            details: stats,
            recommendations: this.generateRecommendations(stats)
        };

        return report;
    }

    // ===========================================
    // GÉNÉRATION DE RECOMMANDATIONS
    // ===========================================
    generateRecommendations(stats) {
        const recommendations = [];

        if (stats.threatsByType['SQL_INJECTION'] > 5) {
            recommendations.push('Augmenter la protection contre les injections SQL');
        }

        if (stats.threatsByType['BRUTE_FORCE'] > 10) {
            recommendations.push('Renforcer la protection contre les attaques par force brute');
        }

        if (stats.threatsByType['XSS_ATTACK'] > 3) {
            recommendations.push('Améliorer la protection contre les attaques XSS');
        }

        if (stats.blockedIPs > 20) {
            recommendations.push('Considérer l\'utilisation d\'un CDN avec protection DDoS');
        }

        return recommendations;
    }

    // ===========================================
    // ARRÊT DU MONITORING
    // ===========================================
    stop() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
        console.log('🔒 Système de monitoring de sécurité arrêté');
    }
}

// Instance globale du moniteur de sécurité
const securityMonitor = new SecurityMonitor();

// Écouter les événements de sécurité
securityMonitor.on('threatDetected', (threat) => {
    console.log(`🚨 Menace détectée: ${threat.type} depuis ${threat.ip}`);
});

securityMonitor.on('ipBlocked', (data) => {
    console.log(`🚫 IP bloquée: ${data.ip} - ${data.reason}`);
});

securityMonitor.on('alert', (alert) => {
    console.log(`⚠️  ALERTE SÉCURITÉ: ${alert.message}`);
});

module.exports = securityMonitor;
