// firebase.js

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Sign-up
function signUp() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const userId = userCredential.user.uid;
            // Initialize wallet for user
            db.collection("users").doc(userId).set({
                balance: 0,
                currency: "NGN",
                transactions: []
            });
            alert("Account created successfully!");
            window.location.href = "dashboard.html";
        })
        .catch((error) => alert(error.message));
}

// Login
function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    auth.signInWithEmailAndPassword(email, password)
        .then(() => {
            window.location.href = "dashboard.html";
        })
        .catch((error) => alert(error.message));
}

// Logout
function logout() {
    auth.signOut().then(() => {
        window.location.href = "login.html";
    });
}