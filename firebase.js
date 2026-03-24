const firebaseConfig = {
  apiKey: "PASTE_NEW_KEY_HERE",
  authDomain: "kollect-aa5a3.firebaseapp.com",
  projectId: "kollect-aa5a3",
  storageBucket: "kollect-aa5a3.appspot.com",
  messagingSenderId: "XXXX",
  appId: "XXXX"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
