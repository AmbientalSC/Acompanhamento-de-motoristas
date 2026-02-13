// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCDB_JiDEq1907jB4CaGbeTi84lY0V92DY",
  authDomain: "motoristas-f4aed.firebaseapp.com",
  projectId: "motoristas-f4aed",
  storageBucket: "motoristas-f4aed.firebasestorage.app",
  messagingSenderId: "454083033203",
  appId: "1:454083033203:web:b85c000a61f1c506275206",
  measurementId: "G-PSXHPN34W0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
});
const storage = getStorage(app);

export { app, analytics, auth, db, storage };
