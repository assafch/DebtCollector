
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// IMPORTANT: Replace these with your actual Firebase project configuration
// It's highly recommended to use environment variables for this in a real application
const firebaseConfig = {
  apiKey: "AIzaSyAIVjnicAHdhYw46zx508X1g5gfVX1_MUM", // Placeholder - REPLACE if not already done
  authDomain: "debt-collector-9t64l.firebaseapp.com", // Placeholder - REPLACE if not already done
  projectId: "debt-collector-9t64l", // Placeholder - REPLACE if not already done
  storageBucket: "debt-collector-9t64l.firebasestorage.app", // Placeholder - REPLACE if not already done
  messagingSenderId: "981314791940", // Placeholder - REPLACE if not already done
  appId: "1:981314791940:web:23b24c432e3bdeb9902351" // Placeholder - REPLACE if not already done
};

// Initialize Firebase app singleton
const app: FirebaseApp = getApps().length > 0 ? getApps()[0]! : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
