const express = require('express');
const router = express.Router();
const db = require('../config/database');

// =====================================================
// ROUTES POUR LES ÉVÉNEMENTS COMMERCIAUX
// =====================================================

// GET /api/events/commercial - Récupérer les événements commerciaux
router.get('/commercial', async (req, res) => {
  try {
    const { 
      limit = 4, 
      upcoming_only = 'true',
      type = 'all',
      status = 'programme,en_cours'
    } = req.query;

    let query = `
      SELECT 
        ec.*,
        COUNT(pe.id) as participants_inscrits
      FROM evenements_commerciaux ec
      LEFT JOIN participants_evenements pe ON ec.id = pe.evenement_id
      WHERE ec.est_actif = TRUE
    `;

    const params = [];

    if (upcoming_only === 'true') {
      query += ` AND ec.date_debut > NOW()`;
    }

    if (type !== 'all') {
      query += ` AND ec.type = ?`;
      params.push(type);
    }

    if (status) {
      const statusList = status.split(',').map(s => `'${s.trim()}'`).join(',');
      query += ` AND ec.statut IN (${statusList})`;
    }

    query += ` GROUP BY ec.id`;

    // Tri par date de début
    query += ` ORDER BY ec.date_debut ASC`;

    query += ` LIMIT ?`;
    params.push(parseInt(limit));

    const [events] = await db.execute(query, params);

    res.json({
      success: true,
      events: events,
      total: events.length
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des événements:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération des événements',
      error: error.message
    });
  }
});

// GET /api/events/:id - Récupérer un événement par ID
router.get('/:id', async (req, res) => {
  try {
    const eventId = req.params.id;

    const [events] = await db.execute(`
      SELECT 
        ec.*,
        COUNT(pe.id) as participants_inscrits
      FROM evenements_commerciaux ec
      LEFT JOIN participants_evenements pe ON ec.id = pe.evenement_id
      WHERE ec.id = ? AND ec.est_actif = TRUE
      GROUP BY ec.id
    `, [eventId]);

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    res.json({
      success: true,
      event: events[0]
    });

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'événement:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération de l\'événement',
      error: error.message
    });
  }
});

// POST /api/events/:id/register - S'inscrire à un événement
router.post('/:id/register', async (req, res) => {
  try {
    const eventId = req.params.id;
    const { nom, email, telephone, notes } = req.body;

    // Vérifier que l'événement existe et est actif
    const [events] = await db.execute(
      'SELECT * FROM evenements_commerciaux WHERE id = ? AND est_actif = TRUE',
      [eventId]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Événement non trouvé'
      });
    }

    const event = events[0];

    // Vérifier si l'événement n'est pas complet
    if (event.nombre_max_participants) {
      const [participants] = await db.execute(
        'SELECT COUNT(*) as count FROM participants_evenements WHERE evenement_id = ?',
        [eventId]
      );

      if (participants[0].count >= event.nombre_max_participants) {
        return res.status(400).json({
          success: false,
          message: 'L\'événement est complet'
        });
      }
    }

    // Vérifier si l'utilisateur n'est pas déjà inscrit
    const [existing] = await db.execute(
      'SELECT id FROM participants_evenements WHERE evenement_id = ? AND email = ?',
      [eventId, email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Vous êtes déjà inscrit à cet événement'
      });
    }

    // Inscrire le participant
    await db.execute(
      'INSERT INTO participants_evenements (evenement_id, nom, email, telephone, notes) VALUES (?, ?, ?, ?, ?)',
      [eventId, nom, email, telephone, notes]
    );

    res.json({
      success: true,
      message: 'Inscription réussie'
    });

  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription',
      error: error.message
    });
  }
});

module.exports = router;
