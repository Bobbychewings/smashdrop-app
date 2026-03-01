import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // <-- NEW

// ⚠️ PASTE YOUR KEYS INSIDE THIS BLOCK ⚠️
const firebaseConfig = {
  apiKey: "AIzaSyBOsJDuw9zTg9VrUQyZUmTNDzMKmu2tgas",
  authDomain: "smashdrop-sg.firebaseapp.com",
  projectId: "smashdrop-sg",
  storageBucket: "smashdrop-sg.firebasestorage.app",
  messagingSenderId: "335864943625",
  appId: "1:335864943625:web:ab75c0f8c85cb3b3ae14d8",
  measurementId: "G-7KSJVK25JS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app); // <-- NEW: Export storage so we can upload photos!