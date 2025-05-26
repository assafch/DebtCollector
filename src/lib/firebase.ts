
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// CRITICAL: YOU MUST REPLACE THE VALUES BELOW WITH YOUR ACTUAL FIREBASE PROJECT'S
// WEB APP CONFIGURATION.
// You can find these in your Firebase project console:
// Project settings (gear icon) > General tab > Your apps > Select your web app.
// The error "auth/configuration-not-found" strongly suggests these are incorrect
// or your Firebase project is not properly set up for Authentication.
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
const firebaseConfig = {
  apiKey: "AIzaSyAIVjnicAHdhYw46zx508X1g5gfVX1_MUM", // <--- REPLACE THIS
  authDomain: "debt-collector-9t64l.firebaseapp.com", // <--- REPLACE THIS
  projectId: "debt-collector-9t64l", // <--- REPLACE THIS
  storageBucket: "debt-collector-9t64l.firebasestorage.app", // <--- REPLACE THIS
  messagingSenderId: "981314791940", // <--- REPLACE THIS
  appId: "1:981314791940:web:23b24c432e3bdeb9902351" // <--- REPLACE THIS
};

// Initialize Firebase app singleton
// This logic ensures Firebase is initialized only once.
const app: FirebaseApp = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
