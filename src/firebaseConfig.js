import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";


const firebaseConfig = {
  apiKey: "AIzaSyCQxzmA4KyslCDEB_J3G9fvpvpDfY6vdk8",
  authDomain: "cvsu-payroll.firebaseapp.com",
  projectId: "cvsu-payroll",
  storageBucket: "cvsu-payroll.firebasestorage.app",
  messagingSenderId: "607770244208",
  appId: "1:607770244208:web:20193ea851c41096f130b5"
};


const app = initializeApp(firebaseConfig);



export const auth = getAuth(app);
