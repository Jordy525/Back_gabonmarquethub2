// Route de santé pour vérifier que le serveur fonctionne

const express = require('express');
const router = express.Router();

// Route de santé simple
router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    });
});

// Route de santé détaillée
router.get('/detailed', (req, res) => {
    const memoryUsage = process.memoryUsage();
    
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0',
        memory: {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
            external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`
        },
        cpu: {
            loadAverage: require('os').loadavg(),
            cpuCount: require('os').cpus().length
        }
    });
});

module.exports = router;