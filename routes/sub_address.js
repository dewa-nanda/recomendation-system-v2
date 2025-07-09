import express from 'express';
import admin from '../config/firebase.js'; // sesuaikan path kalau perlu

const router = express.Router();

router.get('/', async (req, res) => {
  const db = admin.firestore();
  const { address_id } = req.query;
  const sub_address = [];

  try {
    let queryRef = db.collection("sub-address");

    if (address_id) {
      queryRef = queryRef.where("address_id", "==", address_id);
    }

    const snapshot = await queryRef.get();

    snapshot.forEach(doc => {
      sub_address.push(doc.data());
    });

    res.json({ data: sub_address });
  } catch (error) {
    console.error('Error fetching sub-address:', error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
