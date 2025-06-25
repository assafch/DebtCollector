
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, initializeFirestore, connectFirestoreEmulator } from "firebase/firestore"; // Import getFirestore

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAIVjnicAHdhYw46zx508X1g5gfVX1_MUM",
  authDomain: "debt-collector-9t64l.firebaseapp.com",
  projectId: "debt-collector-9t64l",
  storageBucket: "debt-collector-9t64l.firebasestorage.app",
  messagingSenderId: "981314791940",
  appId: "1:981314791940:web:23b24c432e3bdeb9902351"
};

// Initialize Firebase app singleton
// This logic ensures Firebase is initialized only once.
const app: FirebaseApp = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);

// Initialize Firestore with long polling to avoid connectivity issues in some environments
let db;
try {
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true,
  });
} catch (e) {
  console.error("Firebase initialization error:", e);
  db = getFirestore(app); // Fallback for environments where re-initialization is an issue
}


export { db };
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
