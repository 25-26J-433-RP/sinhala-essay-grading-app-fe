// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate required Firebase config values before initializing.
const requiredKeys = [
  'apiKey',
  'authDomain', 
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
];

console.log('🔥 Firebase Config Validation:', {
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain,
  storageBucket: firebaseConfig.storageBucket,
  hasApiKey: !!firebaseConfig.apiKey,
  hasAppId: !!firebaseConfig.appId
});

const missingKeys = requiredKeys.filter((k) => !(firebaseConfig as any)[k]);

if (missingKeys.length) {
  // Provide a clearer message than the underlying Firebase error and avoid
  // calling initializeApp which throws when projectId is missing.
  // Consumers can check for `storage`/`analytics` being null to handle this
  // gracefully in development environments where env vars are not set.
  //
  // Typical resolution: add the EXPO_PUBLIC_FIREBASE_* values to your
  // environment (for Expo, set them in app.json or in a .env loaded at runtime).
  // Example key to set: EXPO_PUBLIC_FIREBASE_PROJECT_ID
  //
  // We intentionally do not throw here to avoid an uncaught exception; instead
  // we export null placeholders so the app can decide how to proceed.
  // Log once to help debugging.
  // eslint-disable-next-line no-console
  console.warn(
    `Firebase configuration missing keys: ${missingKeys.join(', ')}. ` +
      'Set EXPO_PUBLIC_FIREBASE_... env vars (for example EXPO_PUBLIC_FIREBASE_PROJECT_ID)'
  );
}

let app = null as ReturnType<typeof initializeApp> | null;
let analytics = null as ReturnType<typeof getAnalytics> | null;
let auth = null as ReturnType<typeof getAuth> | null;
let db = null as ReturnType<typeof getFirestore> | null;
let storage = null as any;

if (missingKeys.length === 0) {
  // All required values present — safe to initialize Firebase.
  app = initializeApp(firebaseConfig);
  if (typeof window !== 'undefined') {
    analytics = getAnalytics(app);
  }
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  // keep exports as null placeholders
  auth = null;
  db = null;
  storage = null;
}

export { analytics, auth, db, storage };
