// app.js
const auth = firebase.auth();
const db = firebase.firestore();

// -------------------------
// AUTH STATE LISTENER
// -------------------------
auth.onAuthStateChanged(user => {
    if(!user && !window.location.href.includes("login.html") && !window.location.href.includes("signup.html")){
        window.location.href = "login.html";
    } else if(user && window.location.href.includes("login.html")){
        window.location.href = "dashboard.html";
    } else if(user && window.location.href.includes("signup.html")){
        window.location.href = "dashboard.html";
    } else if(user){
        loadWalletBalances(user.uid);
        loadTransactions(user.uid);
    }
});

// -------------------------
// SIGN UP
// -------------------------
function signUp(event){
    if(event) event.preventDefault();

    const type = document.getElementById("accountType").value;
    let email, password, extraData;

    if(type === "individual"){
        const name = document.getElementById("name").value;
        const phone = document.getElementById("phone").value;
        email = document.getElementById("email").value;
        password = document.getElementById("password").value;
        const profession = document.getElementById("profession").value;
        if(!name || !phone || !email || !password || !profession) return alert("Fill all fields");
        extraData = {name, phone, profession, type:"individual"};
    } else if(type === "business"){
        const businessName = document.getElementById("businessName").value;
        const businessPhone = document.getElementById("businessPhone").value;
        email = document.getElementById("businessEmail").value;
        password = document.getElementById("businessPassword").value;
        const businessType = document.getElementById("businessType").value;
        if(!businessName || !businessPhone || !email || !password || !businessType) return alert("Fill all fields");
        extraData = {businessName, businessPhone, businessType, type:"business"};
    }

    auth.createUserWithEmailAndPassword(email, password)
        .then(cred=>{
            const uid = cred.user.uid;
            db.collection("users").doc(uid).set(extraData).then(()=>{
                ["NGN","GH₵","RWF"].forEach(currency=>{
                    db.collection("wallets").doc(uid).collection("balances").doc(currency).set({amount:0});
                });
                window.location.href="dashboard.html";
            }).catch(err=>alert(err.message));
        }).catch(err=>alert(err.message));
}

// -------------------------
// LOGIN
// -------------------------
function login(event){
    if(event) event.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;
    if(!email || !password) return alert("Enter email and password");
    auth.signInWithEmailAndPassword(email, password)
        .then(cred=> window.location.href="dashboard.html")
        .catch(err=>alert(err.message));
}

// -------------------------
// LOGOUT
// -------------------------
function logout(){ auth.signOut(); }

// -------------------------
// WALLETS
// -------------------------
function loadWalletBalances(uid){
    ["NGN","GH₵","RWF"].forEach(currency=>{
        db.collection("wallets").doc(uid).collection("balances").doc(currency).get().then(doc=>{
            const el = (currency==="NGN")?document.getElementById("balance-ngn"):
                       (currency==="GH₵")?document.getElementById("balance-ghc"):
                       document.getElementById("balance-rwf");
            el.innerText = currency + " " + (doc.exists?doc.data().amount:0);
            el.classList.add("updated");
            setTimeout(()=>el.classList.remove("updated"),600);
        });
    });
}

function updateWalletBalanceDB(uid,currency,amount){
    const walletRef = db.collection("wallets").doc(uid).collection("balances").doc(currency);
    return walletRef.get().then(doc=>{
        const newAmount = doc.exists?doc.data().amount + parseFloat(amount):parseFloat(amount);
        walletRef.set({amount:newAmount});
    });
}

// -------------------------
// TRANSACTIONS
// -------------------------
function addTransaction(uid,currency,amount,type){
    db.collection("transactions").doc(uid).collection("userTxns").add({
        type, currency, amount:parseFloat(amount),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(()=>loadTransactions(uid));
}

function loadTransactions(uid){
    const list = document.getElementById("transaction-list");
    if(!list) return;
    list.innerHTML="";
    db.collection("transactions").doc(uid).collection("userTxns")
        .orderBy("timestamp","desc")
        .limit(20)
        .onSnapshot(snapshot=>{
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

// -------------------------
// FUND WALLET
// -------------------------
function fundWallet(){
    const uid = auth.currentUser.uid;
    const currency = document.getElementById("fundCurrency").value;
    const amount = parseFloat(document.getElementById("fundAmount").value);
    if(!amount) return alert("Enter valid amount");

    FlutterwaveCheckout({
        public_key:"FLWPUBK-005ee3c126a79286e3d25ba753637e43-X",
        tx_ref:"FW-"+Date.now(),
        amount, currency,
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

// -------------------------
// VIRTUAL POS
// -------------------------
function collectPayment(currency){
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
        amount, currency,
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

// -------------------------
// RECEIVE PAYMENT
// -------------------------
function generatePaymentRequest(){
    const uid = auth.currentUser.uid;
    const currency = document.getElementById("receiveCurrency").value;
    const amount = parseFloat(document.getElementById("receiveAmount").value);
    if(!amount) return alert("Enter valid amount");
    const link = `https://checkout.flutterwave.com/v3/hosted/pay?amount=${amount}&currency=${currency}&tx_ref=RCV-${Date.now()}&customer[email]=${auth.currentUser.email}`;
    document.getElementById("receiveLink").innerHTML=`Payment Link: <a href="${link}" target="_blank">${link}</a>`;
    addTransaction(uid,currency,amount,"Receive Payment Request");
}

// -------------------------
// SMOOTH TAB SWITCHING
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
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
