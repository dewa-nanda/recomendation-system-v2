import express from 'express';
import admin from '../config/firebase.js'; // pastikan path ini sesuai

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const db = admin.firestore();
    const snapshot = await db.collection("address").get();

    const address = [];

    snapshot.forEach(doc => {
      address.push(doc.data());
    });

    res.json({
      data: address
    });
  } catch (error) {
    console.error('Error fetching address data:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
