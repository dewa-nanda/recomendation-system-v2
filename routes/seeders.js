// routes/seed.js

import express from 'express';
import admin from '../config/firebase.js';
import { seeders } from '../database/index.js';

const router = express.Router();
const dataSeeders = seeders();

router.post('/schools', async (req, res) => {
  try {
    const db = admin.firestore();

    for (const value of dataSeeders.schools) {
      await db.collection('schools').doc(value.school_id).set({
        id: value.school_id,
        name: value.name,
        accreditation: value.akreditas,
        facility: value.fasilitas,
        type: value.type,
        category: value.category,
        link_profile: value.link_profile,
      });

      console.log(`Data ${value.school_id} berhasil ditambahkan!`);
    }

    res.status(200).send({ message: 'Seeders schools success!' });
  } catch (error) {
    console.error('Error seeding data:', error);
    res.status(500).send('Error seeding data');
  }
});

export default router;