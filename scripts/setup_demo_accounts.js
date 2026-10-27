// ============================================================
// scripts/setup_demo_accounts.js
// One-time script to create/fix demo accounts in Firebase Auth + Firestore
// Run with: node scripts/setup_demo_accounts.js (from project root)
// ============================================================

require('dotenv').config();

const admin = require('firebase-admin');

// Load service account key
let serviceAccount;
try {
  serviceAccount = require('./config/serviceAccountKey.json');
} catch (e) {
  console.error('❌ serviceAccountKey.json not found!');
  console.error('   Save it as: server/config/serviceAccountKey.json');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

const DEMO_ACCOUNTS = [
  {
    email: 'admin@resumatch.com',
    password: 'admin123',
    displayName: 'System Admin',
    firestoreData: {
      firstName: 'System',
      lastName: 'Admin',
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
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    await auth.updateUser(uid, { password, displayName });
    console.log(`✅ Updated Firebase Auth user: ${email} (uid: ${uid})`);
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      const newUser = await auth.createUser({ email, password, displayName });
      uid = newUser.uid;
      console.log(`✅ Created Firebase Auth user: ${email} (uid: ${uid})`);
    } else {
      throw e;
    }
  }

  // 2. Set Firestore user document (merge so existing data is preserved)
  await db.collection('users').doc(uid).set({
    ...firestoreData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
