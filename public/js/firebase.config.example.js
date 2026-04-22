// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDH6-L_WnHBdZaPu2720Mqiy-cYQWZ8eSk",
  authDomain: "ot-aob.firebaseapp.com",
  projectId: "ot-aob",
  storageBucket: "ot-aob.firebasestorage.app",
  messagingSenderId: "184419890722",
  appId: "1:184419890722:web:c669d153d9dcdf92c93c7b",
  measurementId: "G-D4VL9SV5GX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);