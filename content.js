console.dir(document.body.baseURI);

// Side panels only at the full-screen aspect ratio: hide them when the tab is
// clearly narrower than the screen (split view or a shrunk window).
function updateFullScreenClass(){
    const screenRatio = screen.width / screen.height;
    const tabRatio = window.innerWidth / window.innerHeight;
    document.documentElement.classList.toggle("contentJS-notFullScreen", tabRatio < screenRatio * 0.9);
}
updateFullScreenClass();
window.addEventListener("resize", updateFullScreenClass);

const preVbar = document.querySelector("div.ContentJS-verticalMenuBar");
if(!preVbar){
    const verticalMenuBar = document.createElement("div");
    verticalMenuBar.classList.add("ContentJS-verticalMenuBar");
    document.body.append(verticalMenuBar);
    verticalMenuBar.addEventListener("mouseover",(event) => {
        console.log("hover on vwall",event);
        const wall = document.querySelector("div#content-commandWall");
        if(wall){
            wall.remove();
        }else{
            getCommand();
        }
    })

}

let permissions = null
function getPermissions(){
    return new Promise(async (resolve,reject) => {
        const permissions = await getLocalData("permissions");
        if(permissions){
            resolve(permissions)
        }
    })
}
function messageToBackground(type,text){
    // send message to background.js
    chrome.runtime.sendMessage({ to: "background.js", from: "content", type: type , text: text},(response)=> {
        console.log("response from background : ",response);
        return response
    });
};
getPermissions().then(data => {
    permissions = data;
    const date = new Date
    const newDate = date.toISOString().split("T")[0];
    
})

console.log("permissions is ",permissions);
function getLocalData(left){
    return new Promise(resolve => {
      chrome.storage.local.get(left, (request) => {
        if(chrome.runtime.lastError){
          console.error("error fetching data : ",chrome.runtime.lastError)
        }else if (request[left] === undefined){
          console.log("no data found");
          resolve({})
        }else{
          resolve(request[left]);
        }
      })
    })
}
function showMessage(message, time){
    const messageContainer = document.querySelector("div.contentJS-innermessageContainer")
    const span = document.createElement("span");
    span.classList.add("contentJS-message")
    span.innerText = message
    if(messageContainer){
        messageContainer.prepend(span);
        setTimeout(()=> {
            span.remove()
        },time)
    }
};
async function checkMessenger(message, priority = 1,time = 10000){
    const messenger = permissions.messenger
    const messagePriority = permissions.messagePriority
    if(messenger === true){
        if(messagePriority <= priority){
            let specificElement = document.querySelector(".contentJS-messageContainer");
            
            if(specificElement){
                specificElement.addEventListener("click",specificElement.remove());
                showMessage(message,time);
            }
        }else{
            console.error("message priority is too low");
        }
        
    }else{
        console.log("messenger permission declined");
    }
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};
function waitForElementWithText(selector,text,time){
    return new Promise((resolve, reject) => {
        console.log("selector is : ",selector)
        timeout = Date.now() + time
        const checkExist = setInterval(() => {
            const element = document.querySelectorAll(selector);
            if (element && element.length > 0) {
                for(el of element){
                    if(el.innerText.toLowerCase().includes(text)){
                        console.log("element with text found");
                        clearInterval(checkExist);
                        console.log("waitForElement | element found : ",element)
                        checkMessenger("waitForElement | element found");
                        resolve(el);
                    }else if (Date.now() >= timeout) {
                        clearInterval(checkExist);
                        reject(new Error(`Element not found: ${selector}`));
                    }
                }
            } else if (Date.now() >= timeout) {
                clearInterval(checkExist);
                reject(new Error(`Element not found: ${selector}`));
            }   
        }, 100); // Check every 100ms
    });
}
// waits until an element appears, based on the selector and returns the element
function waitForElement(selector,timeout) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkExist = setInterval(() => {
            const element = document.querySelectorAll(selector);
            if (element && element.length > 0) {
                clearInterval(checkExist);
                resolve(element);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkExist);
                reject(new Error(`Element not found: ${selector}`));
            }   
        }, 100); // Check every 100ms
    });
};
function addExternalCss(){
    const cssLink = chrome.runtime.getURL("message.css"); // Ensure the correct path
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = cssLink;
    document.head.appendChild(link);
}
function waitForElementSingle(selector,timeout) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkExist = setInterval(() => {
            const element = document.querySelector(selector);
            if (element) {
                clearInterval(checkExist);
                resolve(element);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkExist);
                reject(new Error(`Element not found: ${selector}`));
            }   
        }, 100); // Check every 100ms
    });
};

function waitForError(element,include,timer = 5000,intention = "text"){
    return new Promise(async (resolve,reject) => {
        const time = Date.now();
        const timeout = time + timer;
        const interval = setInterval(async ()=> {
            if(Date.now() < timeout){
                const blockedCustomer = await waitForElement(element,100).catch(error => console.log(error));
                if(blockedCustomer && blockedCustomer.length > 0){
                    for(block of blockedCustomer){
                        if(block.innerText.trim().toLowerCase().includes(include)){
                            if(intention === "text"){
                                resolve(block.innerText.trim().toLowerCase());
                            }else{
                                resolve(block.children[1].innerText);
                            }
                            clearInterval(interval);
                        }
                    }
                    // work here check whether customer is blocked;
                }
            }else{
                console.log("timer run out, customer not blocked")
                reject(new Error("customer not blocked"))
                clearInterval(interval);
            }
        },100)
        
        
    })
}
function waitForElementDisappear(element,wait,timer){
    return new Promise((resolve,reject) => {
        const timeout = Date.now() + timer;
        setTimeout(() => {
            const interval = setInterval(() => {
                const loader = document.querySelector(element);
                if(loader){
                }else{
                    console.log("loader gone"); 
                    clearInterval(interval);
                    resolve("success");
                }
                if(Date.now() < timeout){
                    console.log("check again");
                }else{
                    console.log("timeout loader not gone"); clearInterval(interval);
                    reject("failed");
                }
            },100)
        }, wait);
        
    })
}

function addCommandWall(selector){
    return new Promise((resolve,reject) => {
        fetch(chrome.runtime.getURL("message.html"))
        .then((response) => response.text())
        .then((html) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            specificElement = doc.querySelector(selector); 
            if (specificElement) {
                document.body.append(specificElement);
                resolve({
                    result:"success"
                })
            } else {
                reject({
                    result:"failed"
                })
                console.error("Specific element not found in the HTML file.");
            }
        })
        .catch((error) => console.error("Error loading popup.html:", error));
    })
    
};


async function summarizeReport(){
    const iframe = document.querySelector("iframe")
    const table = iframe.contentDocument.querySelector("table.data-grid-full-table.data-grid-table")
    const trs = table.querySelectorAll("tr");
    const data = []
    const request = await addCommandWall("div.tableDiv-contentJS");
    if(request.result === "success"){
        const table = document.querySelector("div.tableDiv-contentJS table");
        const close = document.querySelector("div.tableDiv-contentJS div.closeTableDiv");
        const wall = document.querySelector("div.tableDiv-contentJS");
        if(close && wall){
            close.addEventListener("click",() => {
                wall.remove();
            })
        }
        for (tr of trs){
            const newTr = document.createElement("tr");
            const innerdata = []
            const tds = tr.childNodes
            tds.forEach((td,index) => {
                if(index === 1){
                    console.log("skip")
                }else{
                    let value
                    const newtd = document.createElement("td");
                    if(index === 0){
                        value = td.innerText.split("\n")[1]
                        newtd.classList.add("vert-head")
                    }else{
                        value = td.innerText
                        newtd.classList.add("table-value")
                    }
                    
                    
                    newtd.innerText = value
                    newTr.append(newtd)
                    innerdata.push(value)
                }
                
            })
            data.push(innerdata)
            table.append(newTr)
        }
        console.log(data);
    }
    
}

async function getCommand(){
    const oldCommandWall = document.querySelector("div#content-commandWall");
    if(oldCommandWall){
        oldCommandWall.remove()
    }else{
        const request = await addCommandWall("div#content-commandWall");
        if(request.result === "success"){
            const div = document.querySelector("div#content-commandWall");
            const input = document.querySelector("input#content-commandInput");
            ["click","mouseover"].forEach(event => {
                div.addEventListener(event,() => {
                    input.focus();
                })
            })

            const buttons = document.querySelectorAll("button.contentJS-buttons");
            buttons.forEach(button => {
                button.addEventListener("click",()=> {
                    input.value = button.id
                    input.dispatchEvent(new Event("input",{bubbles:true}))
                })
            })

            input.focus()
            input.addEventListener("input",async () => {
                if(input.value.length >= 2){
                    switch(input.value.toUpperCase()){
                        case "00": case "CC":
                            div.remove();
                            break;
                        case "16": case "RD":
                            div.remove();
                            messageToBackground("info","page_reloaded");
                            break;
                        case "79": case "SD":
                            div.remove();
                            getschemedata();
                            break;
                        case "84": case "SR":
                            div.remove();
                            summarizeReport();
                            break;
                        case "96": case "RL":
                            div.remove();
                            location.reload();
                            break;
                        case "97": case "DB":
                            div.remove();
                            messageToBackground("download","database");
                            break
                        case "98": case "ER":
                            div.remove();
                            sleep(2000);
                            messageToBackground("command","");
                            div.remove();
                            break;
                    }
                }
            })
        }
        
    }
}
function waitForElementSinglewithiframe(selector,timeout) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        const checkExist = setInterval(() => {
            const element = document.querySelector("iframe").contentDocument.querySelector(selector);
            if (element) {
                clearInterval(checkExist);
                resolve(element);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkExist);
                reject(new Error(`Element not found: ${selector}`));
            }   
        }, 100); // Check every 100ms
    });
};
function convertBtns(){
    iframe = document.querySelector("iframe")
    table = iframe.contentDocument.querySelector("table.data-grid-full-table.data-grid-table")
    trs = table.querySelectorAll("tr");
    trs[0].childNodes.forEach((element,index) => {
        if(index != 0){
            element.children[0].style.width = "fit-content"
            element.children[0].style.padding = "0px 10px 0px 0px"
            element.children[0].style.cursor = "pointer"
            element.addEventListener("click",(event) => {
                console.log("event triggered",event.target);
                data = []
                trs.forEach((tr,ind) => {
                    if(ind === 0 || ind === (trs.length -1)){
                    }else{
                        const target = tr.childNodes[index].innerText
                        let newTarget = Number(target.replace(/[^0-9.]/g,''))
                        data.push(newTarget)
                    }
                })
                console.log("data is ",data)
                let newData
                const purpose = event.target.innerText
                console.log("purpose is ",purpose);
                if(purpose?.includes("⬇")){
                    newData = data.sort((a,b) => a-b);
                    event.target.innerText = purpose.split("⬇")[0].concat(" ","⬆")
                }else if(purpose.includes("⬆")){
                    newData = data.sort((a,b) => b-a);
                    event.target.innerText = purpose.split("⬆")[0].concat(" ","⬇")
                }else{
                    newData = data.sort((a,b) => a-b);
                    event.target.innerText = purpose.includes("\n") ? purpose.split("\n")[1].concat(" ","⬆") : purpose.concat(" ","⬆");
                    
                }
                newTrs = table.querySelectorAll("tr");
                tbody = table.querySelector("tbody");
                newData.forEach((val) => {
                    for(tr of newTrs){
                        const targetText = tr.childNodes[index].innerText
                        let newTarget = Number(targetText.replace(/[^0-9.]/g,''))
                        if(val === newTarget){
                            tr.remove();
                            tbody.append(tr)
                        }
                    }
                })
                const newTotal = Array.from(table.querySelectorAll("tr"))
                    .find(tr => tr.textContent.includes("Total"));
                tbody.append(newTotal)
                const newHeader = Array.from(table.querySelectorAll("tr"))
                    .find(tr => tr.textContent.includes("DME ID"));
                tbody.prepend(newHeader);
            })
        }
    });
}
async function convertFinone(table){
    ths = table.querySelectorAll("tbody tr th.data-grid-table-cell:not(.data-grid-header-cell)")
    finOneCode = {
        "547677" : "Salman Khan",
        "646180" :  "MOHAMMED SOHAIL",
        "10631407" : "Mohammed Mahraj",
        "537737" : "MOHAMMED MUDASSIR",
        "186798" : "Abdul Asif",
        "697493" : "SAYYED ANWARHUSSEN",
        "411720" : "MOHAMMED SADIQ",
        "703651" : "MOHD UDDIN",
        "688658" : "MANJETI PRASAD",
        "437630" : "MOHD MOHSIN",
        "606539" : "MOHAMMED QAZI",
        "444888" : "Mohammed Hasan",
        "188331" : "Rachakatla Raj",
        "10574251" : "Yelchala Vijay",
        "10699527" : "moosa",
        "641904" : "Ayan",
        "646568" : "imran"

    }
    for (th of ths){
        finone = th.querySelectorAll("label")[1];
        if(finone){
            Name = finOneCode[finone?.innerText];
            console.log(`${finone} : ${Name}`);
            finone.innerText = Name ? Name : finone?.innerText
        }else{
            console.log("skipping for total")
        }
        
    }
}
async function handleDiReport(){
    console.log("handling Di report");
    let iframe = await waitForElement("iframe",10000);
    let table = await waitForElementSinglewithiframe("table.data-grid-full-table.data-grid-table",10000);
    convertBtns();
    convertFinone(table);
}
async function showData(data){
    const request = await addCommandWall("div.tableDiv-contentJS");
    if(request.result === "success"){
        const table = document.querySelector("div.tableDiv-contentJS table");
        const close = document.querySelector("div.tableDiv-contentJS div.closeTableDiv");
        const wall = document.querySelector("div.tableDiv-contentJS");
        if(close && wall){
            close.addEventListener("click",() => {
                wall.remove();
            })
        }
        for (let D of data){
            const tr = document.createElement("tr");
            for (let d of D){
                const td = document.createElement("td");
                td.innerText = d
                tr.append(td)
            }
            table.append(tr)
        }
        
    }
}
async function getschemedata(){
    const schemes = document.querySelectorAll("div.schemeBox");
    const data = []
    for (let scheme of schemes){
        const ps = scheme.querySelectorAll("div p");
        const d = []
        for (let p of ps){
            console.log(p.innerText);
            switch (p.innerText){
                case "Scheme Id":
                case "Gross/Adv Tenor":
                case "DownPayment":
                case "Loan Amount":
                case "EMI":
                case "DBD":
                case "Processing Fees":
                    d.push(p.nextElementSibling.innerText)
                    break;
            }
        }
        console.log(d)
        data.push(d)
    }
    console.log(data)
    showData(data)
}
async function checkForErrors(errors){
    return new Promise(async (resolve,reject) => {
        const error = await waitForError("span.toast-title","",5000);
        if(error){
            console.log("error found",error)
            for (let err in errors){
                if(error.includes(err.toLowerCase())){
                    switch(errors[err].action){
                        case "stop":
                            console.log("stopping the function");
                            resolve("break");
                            break;
                        case "continue":
                            console.log("continuing the execution");
                            await sleep(1000)
                            resolve("continue");
                            break;
                    }
                }else{
                    resolve("continue");
                }
            }
        }
    })
}
async function changPostDoPage(text){
    const btn = document.querySelector("li.breadcrumb-item button");
    btn.click();
    waitForElementWithText("div.hamburger-menu div.menu-content div",text.toLowerCase(),5000).then(async element => {
        console.log("element found",element);
        element.children[0].click();
    }).catch(error => console.error(error));
}
async function clusterSubmit(){
    return new Promise(async (resolve,reject) => {
        const buttons = await waitForElement("button.proceedBtn.submit-button",5000);
        if(buttons && buttons.length > 0){
            let con = true
            const condition = buttons.forEach(btn => { if(btn.disabled === false){con = false}})
            if(con === false){
                for(btn of buttons){
                    if(btn.disabled === false){
                        const bypass = document.querySelector("button.proceedBtn.bypass-button");
                        if(bypass){
                            bypass.click();
                            resolve("next")
                        }else{
                            btn.click();
                            resolve("next");
                        }
                    }
                }
            }
        }else{
            console.error("buttons not found");
        }
    })
}
async function checkConditions(){
    return new Promise(async (resolve,reject) => {
        if(document.querySelector("lightning-spinner")){
            resolve('next');
        }else if(document.querySelector("div.currentScreen")?.innerText === 'QC/DI Status'){
            resolve('submitted');
        }else if(document.querySelector("div.currentScreen")?.innerText !== 'Document Validate'){
            changPostDoPage('Document Validate');
            const result = await clusterSubmit();
            resolve(result);
        }else if(document.querySelector("div.currentScreen")?.innerText === 'Document Validate'){
            const result = await clusterSubmit();
            resolve(result);
        }
    })
}
async function submitFile(){
    const possibleErrors = {
        "The following documents have not been received": {action : "stop"},
        "Please Check the mismatched fields!": {action: "continue"},
        "internal server error{}": {action: "continue"}
    }
    const buttons = document.querySelectorAll("button.proceedBtn.submit-button");
    if(buttons && buttons.length > 0){
        let con = true
        const condition = buttons.forEach(btn => { if(btn.disabled === false){con = false}})
        for(let i = 0; i <= 10; i++){
            let status = document.querySelector("div.currentScreen").innerText;
            if(con === false && status != 'QC/DI Status'){
                for(btn of buttons){
                    if(btn.disabled === false){
                        btn.click();
                        await waitForElementDisappear("lightning-spinner",1000,100000);
                        const bypass = document.querySelector("button.proceedBtn.bypass-button");
                        if(bypass){
                            bypass.click();
                            break;
                        }
                        const result = await checkForErrors(possibleErrors)
                        if(result === "break"){
                            console.log("response recieved -> breaking the function");
                            alert("check the error");
                            return;
                        }else if(result === "continue"){
                            console.log("continuing the execution")
                        }
                        break;
                    }
                }
            }
        }
    }
}
async function invoiceAutomation(btn){
    if(btn){
        console.log("btn found",btn)
        btn.style.backgroundColor = "lightblue"
        btn.style.padding = "0px 4px"
        btn.addEventListener("click",async ()=>{
            const invoiceBtn = await waitForElementWithText("div.hamburger-menu div.menu-content div","invoice",5000).catch(error => console.error(error));
            invoiceBtn.addEventListener("click",async (event) => {
                const dateEl = await waitForElementSingle("input.mobile-input[type='date']",5000);
                dateEl.value = (new Date).toISOString().split('T')[0];
                dateEl.dispatchEvent(new Event("input",{bubbles:true}))
                dateEl.dispatchEvent(new Event("change",{bubbles:true}))
                const invoiceEl = await waitForElementSingle("input.mobile-input[type='text']",5000);
                invoiceEl.addEventListener("focus",(event) => {
                    invoiceEl.value = "1227/26/S-"
                })
                invoiceEl.addEventListener("keydown", async (event) => {
                    console.log(event);
                    if(event.key === 'Enter'){
                        const checkbox = await waitForElementSingle("span.slds-checkbox_faux",5000)
                        checkbox.click();
                        const proceedBtn = await waitForElementSingle("button.proceedBtn",5000)
                        proceedBtn.click();
                        
                    }
                })
            })
        },{once:true})
    }else{
        console.log("btn not found");
    }
}
function handleListAutomation(event){
    console.log("event triggered",event);
    const btn = document.querySelector("li.breadcrumb-item button");
    btn.click();
    waitForElementWithText("div.hamburger-menu div.menu-content div",event.target.innerText.toLowerCase(),5000).then(async element => {
        console.log("element found",element);
        element.children[0].click();
    }).catch(error => console.error(error));
}
function addMenuListRight(list){
    const listBoundaryright = document.createElement("div");
    listBoundaryright.id = "contentJS-listBoundary-right"
    listBoundaryright.classList.add("contentJS-listBoundary")
    document.querySelector("div.cCenterPanel").append(listBoundaryright);
    list.forEach(name => {
        const span = document.createElement("button");
        span.classList.add("contentJS-listItem");
        span.innerText = name
        listBoundaryright.append(span);
        span.addEventListener("click",handleListAutomation)
    })
}
function addMenuListleft(list){
    console.log("adding menu list ==----->")
    let listBoundaryleft = document.querySelector("div#contentJS-listBoundary-left")
    if(!listBoundaryleft){
        listBoundaryleft = document.createElement("div");
        listBoundaryleft.id = "contentJS-listBoundary-left"
        listBoundaryleft.classList.add("contentJS-listBoundary")
        document.querySelector("div.cCenterPanel").append(listBoundaryleft);
    }
    for(name of list){
        const span = document.createElement("button");
        span.classList.add("contentJS-listItem");
        span.innerText = name
        listBoundaryleft.append(span);
        span.addEventListener("click",handleListAutomation)
    }
    
}
function updateMenuList(){
    console.log("updating menu list => ---------")
    const myList = document.querySelectorAll("div.contentJS-listBoundary");
    waitForElement("div.hamburger-menu div.menu-content div",5000).then(async elements => {
        console.log("element found",elements);
        if(myList.length != elements.length){
            document.querySelectorAll("button.contentJS-listItem").forEach(button => {button.remove()})
            for (el of elements){
                const span = document.createElement("button");
                span.classList.add("contentJS-listItem");
                span.innerText = el.innerText
                myList[0].append(span);
                span.addEventListener("click",handleListAutomation)
            }
        }
    },{once:true}).catch(error => console.error(error));
}
async function createMenuList(page){
    console.log('function called')
    const btn = await waitForElementSingle("li.breadcrumb-item button",5000);
    
    btn.addEventListener("click",updateMenuList)
    const newStage = ["Home","Customer Search","App Status","Zip Code Verification","Product Selection","Income Declaration","KYC","POI","POA","Surrogate Details","Customer Detail Page","Additional Details","CKYC","Asset Cart"]
    const doPrep = ["Cross Sell","EMI Card","Loan Summary","Postpone EMI","Upi Mandate","PAN Details","Rewards","Offers Details","GST Billing","Other Details","Document Library","Product Validation"];
    const postDo = ["Do Details","Other Details","Agreement","Invoice","Document Library","Document Validate"]
    switch(page){
        case "opportunity": 
            invoiceAutomation(btn);
            addMenuListleft(doPrep);
            addMenuListRight(postDo);
            break;
        case "customer":
            addMenuListleft(newStage);
            
            break;
    }
    
}
let lastUrl
async function modifyReinventList(url = document.body.baseURI){
    if (document.querySelector("div#contentJS-listBoundary-left") && lastUrl === url){
        console.log("skipping list creation, list already there");
        return
    }else{
        lastUrl = url
        console.log("list not found")
    }
    const keys = {
        defaultOpportunities : "/dealercommunityreinvent/s/opportunity/Opportunity/Default",
        customer : "/dealercommunityreinvent/s/customer/",
        opportunity : "/dealercommunityreinvent/s/opportunity/"
    }
    const reinventAutomationPagesList = {
        [keys.customer] : {function: createMenuList, argument: ["customer"], condition: url.includes(keys.customer)}, // customer details
        [keys.opportunity] : {function: createMenuList, argument: ["opportunity"], condition: url.includes(keys.opportunity) && !url.includes(keys.defaultOpportunities)} // do preparation and post do
    }
    for (let page in reinventAutomationPagesList){
        console.log("checking page ",page)
        let Function = reinventAutomationPagesList[page].function
        let condition = reinventAutomationPagesList[page].condition
        if (condition && typeof(Function) === 'function'){
            console.log("calling function",Function);
            Function(...reinventAutomationPagesList[page].argument);
        }else{
            console.log("cleanup needed for ",page);
            document.querySelectorAll("div.contentJS-listBoundary").forEach(el => el.remove());
        }
    }
}
chrome.runtime.onMessage.addListener(async (request,sender, sendResponse) => {
    console.log("content recieved message : ",request)
    
    if(request.action === "SQC"){
        checkMessenger("Command request | Submit For QC",10,200);
        submitFile();
        sendResponse({ status: 'Function invoked successfully' });
    }else if(request.action === "getCommand"){
        checkMessenger("Command request | getCommand",9,3000)
        getCommand();
        sendResponse({ status: 'Function invoked successfully' });
    }else if(request.action === "getConfirmationForSameAid"){
        const response = prompt(`You searched this customer on ${request.date}. Is this a new login ? ; Note: press cancel if you are continuing with old Bid`,"Yes");
        sendResponse({response})
    }else if(request.action === "urlChanged"){
        checkMessenger("urlChanged");
    }else if(request.action === "getPassword"){
        const getPrompt = prompt("Enter the passcode");
        checkMessenger(`promt is ${getPrompt}`);
        sendResponse({getPrompt});
    }else if(request.action === "useJsqr"){
        
        console.log("using jsqr",request);
        console.log("jsQR function:", jsQR);
        const imageData = new Uint8ClampedArray(request.data);
        const code = jsQR(imageData, request.width, request.height)
        if (code){
            console.log("QR found:", code.data);
            sendResponse({
                url:code.data
            })
        } else {
            console.log("QR not detected");
        }
    }else if(request.action === "showAlert"){
        const response = alert(request.text);
        messageToBackground("extensionReload2");
    }else if(request.action === "di-report"){
        handleDiReport();
    }else if(request.action === "handleReports"){
        convertBtns();
    }
    else if(request.action === "checkReinventAutomationPagesList"){
        console.log("modifying the reinvent features",document.body.baseURI);
        modifyReinventList();
    }else if(request.action === "clusterExecution"){
        const response = await checkConditions();
        sendResponse(response);
    }
    return true
})

addExternalCss();
messageToBackground("info","page_reloaded");
console.log("content script is running");

