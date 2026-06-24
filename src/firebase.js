import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAx_m99U_hCVmbWpY1AgbErFHy8NVmxYPQ",
  authDomain: "obenkyou-app.firebaseapp.com",
  projectId: "obenkyou-app",
  storageBucket: "obenkyou-app.firebasestorage.app",
  messagingSenderId: "667265072943",
  appId: "1:667265072943:web:4aff13078baea40da1ebda",
  measurementId: "G-CTV3SQYSZK"
};

// Firebaseの初期化
const app = initializeApp(firebaseConfig);

// サービスの初期化とエクスポート
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signInWithRedirect, signOut };
