// app.js (modular Firebase v10)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, addDoc, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBLN0O36j1DWxUN5U1B4iuP6kH-YNUENkk",
  authDomain: "kollect-aa5a3.firebaseapp.com",
  projectId: "kollect-aa5a3",
  storageBucket: "kollect-aa5a3.firebasestorage.app",
  messagingSenderId: "57011462366",
  appId: "1:57011462366:web:f32cee212f055e571ae24f",
  measurementId: "G-67DGZE48VZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// -------------------- AUTH STATE --------------------
onAuthStateChanged(auth, user => {
    const repoPath = "/kollect-site/"; // adjust to your GitHub Pages repo
    if (!user && !window.location.href.includes("login.html") && !window.location.href.includes("signup.html")) {
        window.location.href = repoPath + "login.html";
    } else if (user && window.location.href.includes("login.html")) {
        window.location.href = repoPath + "dashboard.html";
    } else if (user && window.location.href.includes("signup.html")) {
        window.location.href = repoPath + "dashboard.html";
    } else if (user) {
        loadWalletBalances(user.uid);
        loadTransactions(user.uid);
    }
});

// -------------------- SIGNUP --------------------
async function signUp(event){
    if(event) event.preventDefault();
    const type = document.getElementById("accountType").value;
    let email, password, extraData;

    if(type==="individual"){
        const name = document.getElementById("name").value;
        const phone = document.getElementById("phone").value;
        email = document.getElementById("email").value;
        password = document.getElementById("password").value;
        const profession = document.getElementById("profession").value;
        if(!name||!phone||!email||!password||!profession) return alert("Fill all fields");
        extraData = {name, phone, profession, type:"individual"};
    } else {
        const businessName = document.getElementById("businessName").value;
        const businessPhone = document.getElementById("businessPhone").value;
        email = document.getElementById("businessEmail").value;
        password = document.getElementById("businessPassword").value;
        const businessType = document.getElementById("businessType").value;
        if(!businessName||!businessPhone||!email||!password||!businessType) return alert("Fill all fields");
        extraData = {businessName, businessPhone, businessType, type:"business"};
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth,email,password);
        const uid = userCredential.user.uid;
        await setDoc(doc(db,"users",uid),extraData);

        // Init wallets
        for(const currency of ["NGN","GH₵","RWF"]){
            await setDoc(doc(db,"wallets",uid,"balances",currency),{amount:0});
        }

        window.location.href="/kollect-site/dashboard.html";
    } catch(err){ alert(err.message); }
}
window.signUp = signUp;

// -------------------- LOGIN --------------------
async function login(event){
    if(event) event.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    if(!email||!password) return alert("Enter email and password");
    try {
        await signInWithEmailAndPassword(auth,email,password);
        window.location.href="/kollect-site/dashboard.html";
    } catch(err){ alert(err.message); }
}
window.login = login;

// -------------------- LOGOUT --------------------
async function logout(){ await signOut(auth); }
window.logout = logout;

// -------------------- WALLETS --------------------
async function loadWalletBalances(uid){
    for(const currency of ["NGN","GH₵","RWF"]){
        const docRef = doc(db,"wallets",uid,"balances",currency);
        const docSnap = await getDoc(docRef);
        const el = (currency==="NGN")?document.getElementById("balance-ngn"):
                  (currency==="GH₵")?document.getElementById("balance-ghc"):
                  document.getElementById("balance-rwf");
        el.innerText = currency + " " + (docSnap.exists()?docSnap.data().amount:0);
    }
}

async function updateWalletBalanceDB(uid,currency,amount){
    const docRef = doc(db,"wallets",uid,"balances",currency);
    const docSnap = await getDoc(docRef);
    const newAmount = docSnap.exists()?docSnap.data().amount + parseFloat(amount):parseFloat(amount);
    await setDoc(docRef,{amount:newAmount});
}

// -------------------- TRANSACTIONS --------------------
async function addTransaction(uid,currency,amount,type){
    await addDoc(collection(db,"transactions",uid,"userTxns"),{
        type,currency,amount:parseFloat(amount),
        timestamp:serverTimestamp()
    });
    loadTransactions(uid);
}

async function loadTransactions(uid){
    const list = document.getElementById("transaction-list");
    if(!list) return;
    const q = query(collection(db,"transactions",uid,"userTxns"),orderBy("timestamp","desc"),limit(20));
    onSnapshot(q,snapshot=>{
        list.innerHTML="";
        snapshot.forEach(doc=>{
            const data = doc.data();
            const div = document.createElement("div");
            div.className="transaction-item";
            const date = data.timestamp?data.timestamp.toDate().toLocaleDateString():"";
            div.innerHTML=`<span>${data.type}</span><span>${data.currency} ${data.amount}</span><span>${date}</span>`;
            list.appendChild(div);
        });
    });
}

// -------------------- FUND WALLET --------------------
window.fundWallet = function(){
    const uid = auth.currentUser.uid;
    const currency = document.getElementById("fundCurrency").value;
    const amount = parseFloat(document.getElementById("fundAmount").value);
    if(!amount) return alert("Enter valid amount");

    FlutterwaveCheckout({
        public_key:"FLWPUBK-005ee3c126a79286e3d25ba753637e43-X",
        tx_ref:"FW-"+Date.now(),
        amount,currency,
        payment_options:"card",
        customer:{email:auth.currentUser.email, phonenumber:"0000000000", name:auth.currentUser.displayName||"User"},
        callback:function(data){
            if(data.status==="successful"){
                alert(`${currency} Wallet Funded Successfully`);
                updateWalletBalanceDB(uid,currency,amount);
                addTransaction(uid,currency,amount,"Wallet Funding");
                loadWalletBalances(uid);
            } else alert("Payment failed");
        },
        customizations:{title:"Kollect Wallet Fund", description:"Fund your wallet", logo:""}
    });
}

// -------------------- VIRTUAL POS --------------------
window.collectPayment = function(currency){
    const uid = auth.currentUser.uid;
    let amount, cardNumber, expiry, cvc;
    if(currency==="NGN"){
        amount=document.getElementById("posAmountNGN").value;
        cardNumber=document.getElementById("posCardNumberNGN").value;
        expiry=document.getElementById("posCardExpiryNGN").value;
        cvc=document.getElementById("posCardCVCNGN").value;
    } else if(currency==="GH₵"){
        amount=document.getElementById("posAmountGHC").value;
        cardNumber=document.getElementById("posCardNumberGHC").value;
        expiry=document.getElementById("posCardExpiryGHC").value;
        cvc=document.getElementById("posCardCVCGHC").value;
    } else if(currency==="RWF"){
        amount=document.getElementById("posAmountRWF").value;
        cardNumber=document.getElementById("posCardNumberRWF").value;
        expiry=document.getElementById("posCardExpiryRWF").value;
        cvc=document.getElementById("posCardCVCRWF").value;
    }
    if(!amount||!cardNumber||!expiry||!cvc) return alert("Fill all details");

    FlutterwaveCheckout({
        public_key:"FLWPUBK-005ee3c126a79286e3d25ba753637e43-X",
        tx_ref:"POS-"+Date.now(),
        amount,currency,
        payment_options:"card",
        customer:{email:auth.currentUser.email, phonenumber:"0000000000", name:auth.currentUser.displayName||"User"},
        callback:function(data){
            if(data.status==="successful"){
                alert(`${currency} Payment Received`);
                if(currency!=="USD") updateWalletBalanceDB(uid,currency,amount);
                addTransaction(uid,currency,amount,"POS Payment");
                loadWalletBalances(uid);
            } else alert("Payment failed");
        },
        customizations:{title:"Kollect POS", description:"Accept Payment", logo:""}
    });
}

// -------------------- RECEIVE PAYMENT --------------------
window.generatePaymentRequest = function(){
    const uid = auth.currentUser.uid;
    const currency = document.getElementById("receiveCurrency").value;
    const amount = parseFloat(document.getElementById("receiveAmount").value);
    if(!amount) return alert("Enter valid amount");
    const link = `https://checkout.flutterwave.com/v3/hosted/pay?amount=${amount}&currency=${currency}&tx_ref=RCV-${Date.now()}&customer[email]=${auth.currentUser.email}`;
    document.getElementById("receiveLink").innerHTML=`Payment Link: <a href="${link}" target="_blank">${link}</a>`;
    addTransaction(uid,currency,amount,"Receive Payment Request");
}

// -------------------- SMOOTH TAB SWITCH --------------------
document.addEventListener("DOMContentLoaded",()=>{
    const tabs = document.querySelectorAll(".tab-bar button");
    const contents = document.querySelectorAll(".tab-content");
    tabs.forEach((tab,index)=>{
        tab.addEventListener("click",()=>{
            tabs.forEach(t=>t.classList.remove("active"));
            tab.classList.add("active");
            contents.forEach(c=>c.classList.remove("active"));
            contents[index].classList.add("active");
        });
    });
});
