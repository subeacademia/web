// Firebase configuration and initialization

// Firebase configuration object
const firebaseConfig = {
    apiKey: "AIzaSyBYaLu5Nh9dEV3iKuwD5AUqGm6L9TE3IH0",
    authDomain: "subeacademia-63b0e.firebaseapp.com",
    projectId: "subeacademia-63b0e",
    storageBucket: "subeacademia-63b0e.firebasestorage.app",
    messagingSenderId: "850635162701",
    appId: "1:850635162701:web:4b9d043d46794b7de58804"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const storageRef = storage.ref();

// Set Firestore timestamp
const timestamp = firebase.firestore.FieldValue.serverTimestamp;