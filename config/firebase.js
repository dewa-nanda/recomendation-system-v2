import admin from 'firebase-admin';
import dotenv from 'dotenv'; // Menggunakan dotenv untuk memuat variabel lingkungan

dotenv.config();

let credential = JSON.parse(
  Buffer.from(process.env.GOOGLE_CREDENTIAL_BASE64, 'base64').toString('utf-8')
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(credential),
  });
}

export default admin;
