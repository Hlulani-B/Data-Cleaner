import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDshprQG2PZ5Yl1twg2rNx8T8Wd51xFJNI",
  authDomain: "datacleaning-3c2b7.firebaseapp.com",
  projectId: "datacleaning-3c2b7",
  storageBucket: "datacleaning-3c2b7.firebasestorage.app",
  messagingSenderId: "51389718001",
  appId: "1:51389718001:web:08f11ffaf2a0a85dcef850",
  measurementId: "G-6F3SLKS18Y"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();