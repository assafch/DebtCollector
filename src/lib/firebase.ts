
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

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

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
