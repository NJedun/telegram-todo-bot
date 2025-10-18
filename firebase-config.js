import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase Admin
initializeApp({
  credential: cert({
    projectId: firebaseConfig.projectId,
    // For Firebase Admin, we only need projectId when using default credentials
    // Or you can use a service account key
  }),
  projectId: firebaseConfig.projectId
});

// Get Firestore instance
const db = getFirestore();

export { db, firebaseConfig };
