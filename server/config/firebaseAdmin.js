// ============================================================
// ResuMatch — Firebase Admin SDK Configuration (Server-side)
// Compatible with firebase-admin v14+
// ============================================================

const { initializeApp, cert, applicationDefault, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { getStorage } = require('firebase-admin/storage');

let serviceAccount;
try {
  serviceAccount = require('./serviceAccountKey.json');
} catch (e) {
  console.warn('⚠️ serviceAccountKey.json not found. Using default credentials or env vars.');
}

if (!getApps().length) {
  const config = {
    credential: serviceAccount
      ? cert(serviceAccount)
      : applicationDefault(),
  };

  if (process.env.FIREBASE_STORAGE_BUCKET) {
    config.storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
  }

  initializeApp(config);
}

const adminDb = getFirestore();
const adminAuth = getAuth();
const adminStorage = getStorage();

module.exports = {
  adminDb,
  adminAuth,
  adminStorage
};
