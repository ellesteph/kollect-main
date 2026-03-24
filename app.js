// -----------------------------------
// AUTH LISTENER
// -----------------------------------
auth.onAuthStateChanged(user => {
    if(!user){
        window.location.href = "login.html";
    } else {
        loadWalletBalances(user.uid);
        loadTransactions(user.uid);
    }
});

function logout(){
    auth.signOut();
}

// -----------------------------------
// WALLET FUNCTIONS
// -----------------------------------
function loadWalletBalances(uid){
    const wallets = ["NGN","GH₵","RWF"];
    wallets.forEach(currency=>{
        db.collection("wallets").doc(uid).collection("balances").doc(currency)
        .get().then(doc=>{
            const el = (currency==="NGN")?document.getElementById("balance-ngn"):
                      (currency==="GH₵")?document.getElementById("balance-ghc"):
                      document.getElementById("balance-rwf");
            if(doc.exists){
                el.innerText = currency + " " + doc.data().amount;
            } else {
                el.innerText = currency + " 0";
            }
            // Bounce animation when balance updates
            el.classList.add("updated");
            setTimeout(()=> el.classList.remove("updated"), 600);
        });
    });
}

function updateWalletBalanceDB(uid,currency,amount){
    const walletRef = db.collection("wallets").doc(uid).collection("balances").doc(currency);
    return walletRef.get().then(doc=>{
        if(doc.exists){
            let newAmount = doc.data().amount + parseFloat(amount);
            walletRef.set({amount:newAmount});
        } else {
            walletRef.set({amount:parseFloat(amount)});
        }
    });
}

// -----------------------------------
// TRANSACTIONS
// -----------------------------------
function addTransaction(uid,currency,amount,type){
    const txnRef = db.collection("transactions").doc(uid).collection("userTxns");
    txnRef.add({
        type:type,
        currency:currency,
        amount:parseFloat(amount),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(()=>{
        loadTransactions(uid);
    });
}

function loadTransactions(uid){
    const list = document.getElementById("transaction-list");
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
              const date = data.timestamp ? data.timestamp.toDate().toLocaleDateString() : "";
              div.innerHTML=`<span>${data.type}</span><span>${data.currency} ${data.amount}</span><span>${date}</span>`;
              list.appendChild(div);
          });
      });
}

// -----------------------------------
// FUND WALLET
// -----------------------------------
function fundWallet(){
    const uid = auth.currentUser.uid;
    const currency = document.getElementById("fundCurrency").value;
    const amount = parseFloat(document.getElementById("fundAmount").value);
    if(!amount) return alert("Enter valid amount");

    FlutterwaveCheckout({
        public_key: "FLWPUBK-005ee3c126a79286e3d25ba753637e43-X",
        tx_ref: "FW-"+Date.now(),
        amount: amount,
        currency: currency,
        payment_options:"card",
        customer:{ email:auth.currentUser.email, phonenumber:"0000000000", name:auth.currentUser.displayName || "User"},
        callback:function(data){
            if(data.status==="successful"){
                alert(`${currency} Wallet Funded Successfully`);
                updateWalletBalanceDB(uid,currency,amount);
                addTransaction(uid,currency,amount,"Wallet Funding");
                loadWalletBalances(uid);
            } else alert("Payment failed");
        },
        customizations:{ title:"Kollect Wallet Fund", description:"Fund your wallet", logo:"" }
    });
}

// -----------------------------------
// VIRTUAL POS
// -----------------------------------
function collectPayment(currency){
    const uid = auth.currentUser.uid;
    let amount, cardNumber, expiry, cvc;
    if(currency==='NGN'){
        amount=document.getElementById("posAmountNGN").value;
        cardNumber=document.getElementById("posCardNumberNGN").value;
        expiry=document.getElementById("posCardExpiryNGN").value;
        cvc=document.getElementById("posCardCVCNGN").value;
    } else if(currency==='USD'){
        amount=document.getElementById("posAmountUSD").value;
        cardNumber=document.getElementById("posCardNumberUSD").value;
        expiry=document.getElementById("posCardExpiryUSD").value;
        cvc=document.getElementById("posCardCVCUSD").value;
    } else if(currency==='GH₵'){
        amount=document.getElementById("posAmountGHC").value;
        cardNumber=document.getElementById("posCardNumberGHC").value;
        expiry=document.getElementById("posCardExpiryGHC").value;
        cvc=document.getElementById("posCardCVCGHC").value;
    } else if(currency==='RWF'){
        amount=document.getElementById("posAmountRWF").value;
        cardNumber=document.getElementById("posCardNumberRWF").value;
        expiry=document.getElementById("posCardExpiryRWF").value;
        cvc=document.getElementById("posCardCVCRWF").value;
    }
    if(!amount||!cardNumber||!expiry||!cvc) return alert("Fill all details");

    FlutterwaveCheckout({
        public_key: "FLWPUBK-005ee3c126a79286e3d25ba753637e43-X",
        tx_ref: "POS-" + Date.now(),
        amount: amount,
        currency: currency,
        payment_options: "card",
        customer:{ email:auth.currentUser.email, phonenumber:"0000000000", name:auth.currentUser.displayName || "User"},
        callback:function(data){
            if(data.status==="successful"){
                alert(`${currency} Payment Received`);
                if(currency!=="USD") updateWalletBalanceDB(uid,currency,amount);
                addTransaction(uid,currency,amount,"POS Payment");
                loadWalletBalances(uid);
            } else alert("Payment failed");
        },
        customizations:{ title:"Kollect POS", description:"Accept Payment", logo:"" }
    });
}

// -----------------------------------
// PAYMENTS & TRANSFERS
// -----------------------------------
function sendToUser(){
    alert("Send to Kollect user - implement backend logic");
}
function withdraw(){
    alert("Withdraw to Bank - implement backend logic");
}

// -----------------------------------
// RECEIVE PAYMENT
// -----------------------------------
function generatePaymentRequest(){
    const uid = auth.currentUser.uid;
    const currency = document.getElementById("receiveCurrency").value;
    const amount = parseFloat(document.getElementById("receiveAmount").value);
    if(!amount) return alert("Enter valid amount");

    const link = `https://checkout.flutterwave.com/v3/hosted/pay?amount=${amount}&currency=${currency}&tx_ref=RCV-${Date.now()}&customer[email]=${auth.currentUser.email}`;
    document.getElementById("receiveLink").innerHTML=`Payment Link: <a href="${link}" target="_blank">${link}</a>`;
    addTransaction(uid,currency,amount,"Receive Payment Request");
}

// -----------------------------------
// SMOOTH TAB SWITCHING
// -----------------------------------
document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll(".tab-bar button");
    const contents = document.querySelectorAll(".tab-content");

    tabs.forEach((tab, index) => {
        tab.addEventListener("click", () => {
            tabs.forEach(t => t.classList.remove("active"));
            tab.classList.add("active");

            contents.forEach(c => c.classList.remove("active"));
            const current = contents[index];
            current.classList.add("active");
        });
    });
});