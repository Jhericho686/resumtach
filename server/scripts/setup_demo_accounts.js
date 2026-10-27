// ============================================================
// server/scripts/setup_demo_accounts.js
// One-time script to create/fix demo accounts in Firebase Auth + Firestore
// Run with: node scripts/setup_demo_accounts.js (from server directory)
// ============================================================

require('dotenv').config();
const { adminDb, adminAuth } = require('../config/firebaseAdmin');
const { FieldValue } = require('firebase-admin/firestore');

const DEMO_ACCOUNTS = [
  {
    email: 'admin@resumatch.com',
    password: 'admin123',
    displayName: 'Admin Hr',
    firestoreData: {
      firstName: 'Admin',
      lastName: 'Hr',
      email: 'admin@resumatch.com',
      role: 'admin',
      isActive: true,
    }
  },
  {
    email: 'applicant@resumatch.com',
    password: 'applicant123',
    displayName: 'Demo Applicant',
    firestoreData: {
      firstName: 'Demo',
      lastName: 'Applicant',
      email: 'applicant@resumatch.com',
      role: 'applicant',
      isActive: true,
    }
  }
];

async function setupAccount(account) {
  const { email, password, displayName, firestoreData } = account;
  let uid;

  // 1. Create or update Firebase Auth user
  try {
    const existing = await adminAuth.getUserByEmail(email);
    uid = existing.uid;
    await adminAuth.updateUser(uid, { password, displayName });
    console.log(`✅ Updated Firebase Auth user: ${email} (uid: ${uid})`);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      const newUser = await adminAuth.createUser({ email, password, displayName });
      uid = newUser.uid;
      console.log(`✅ Created Firebase Auth user: ${email} (uid: ${uid})`);
    } else {
      throw e;
    }
  }

  // 2. Set Firestore user document (merge so existing data is preserved)
  await adminDb.collection('users').doc(uid).set({
    ...firestoreData,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  console.log(`✅ Firestore document updated for: ${email} → role: ${firestoreData.role}`);
  return uid;
}

async function main() {
  console.log('\n🚀 Setting up demo accounts...\n');
  for (const account of DEMO_ACCOUNTS) {
    try {
      await setupAccount(account);
    } catch (err) {
      console.error(`❌ Failed to set up ${account.email}:`, err.message);
    }
  }
  console.log('\n✅ Done! Demo accounts are ready.\n');
  console.log('   👑 Admin:     admin@resumatch.com     / admin123');
  console.log('   👤 Applicant: applicant@resumatch.com / applicant123\n');
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
