import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBeC8WwFt-vhEjA1FFNQyLuSyWp5NU5EXo",
  authDomain: "mom-emp.firebaseapp.com",
  projectId: "mom-emp",
  storageBucket: "mom-emp.firebasestorage.app",
  messagingSenderId: "1069203081486",
  appId: "1:1069203081486:web:0cc277525e95a561032f5f",
  measurementId: "G-3VJW3K2798"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

export default app;

