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
          commitChanges(left,{});
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
            }else{
                // content.js
                addHtmlCss();
                setTimeout( ()=> {
                    showMessage(message,time)
                },1000)
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
async function wayToSQC(intention = "submitForQc"){
    const arrowEl = document.querySelector('ul.slds-button-group-list li.slds-dropdown-trigger lightning-button-menu button')
    arrowEl.focus();
    await arrowEl.click();
    console.log("arrowE1 clicked");
    const sqcEl = document.querySelector("ul.slds-button-group-list li.slds-dropdown-trigger runtime_platform_actions-action-renderer[apiname='Opportunity.Submit_For_QC_new'] slot")
    console.log("sqcel is ",sqcEl);
    sqcEl.focus();
    await sqcEl.click();
    console.log("sqcEl clicked");
    if(intention === "submitForQc"){
        waitForElementWithText("div.modal-container div section c-submit-for-qc","revalidate agreement",5000).then(async elements => {
            console.log("agreement validation needed",elements);
            await closeSQC();
            validateAgreement();
            messageToBackground("reminder",{
                tag: "submitForQc",
                url: document.body.baseURI,
                wait:30000
            });
        }).catch(error => console.log(error))
    }
};
async function closeMessenger(){
    const closeButton = document.querySelector(".contentJS-close");
    if (closeButton) {
        console.log("close button exist : ",closeButton)
        closeButton.focus()
        closeButton.click(); // Remove the container on close
        console.log("messenger removed")
    }else{
        console.log("messanger not found")
    }
};
/***You are not allowed to change Stage to "Post DO" as POA Pending on Customer. Please upload POI, POA, Customer Photo Documents before moving to POST DO***/
async function validateAgreement(){
    const arrowEl = document.querySelector('ul.slds-button-group-list li.slds-dropdown-trigger lightning-button-menu button');
    if(arrowEl){
        arrowEl.focus();
        arrowEl.click();
    }else {
        console.log("arrowEl not found trying again");
        await sleep(500)
        validateAgreement();
    }
    waitForElement("ul.slds-button-group-list li.slds-dropdown-trigger runtime_platform_actions-action-renderer[apiname='Opportunity.Validate_Agreement'] slot").then(vaEl => {
        vaEl[0].focus();
        vaEl[0].click();
    })
    
}

async function walletLinking(action = "link"){
    return new Promise(async(resolve,reject) => {
        // add some string if error is do not populate
        const editBtn = document.querySelector('ul.slds-button-group-list li runtime_platform_actions-action-renderer[apiname="Edit"] slot');
        const dropDown = "lightning-combobox.slds-form-element_stacked.slds-form-element label";
        const others = 'lightning-base-combobox-item[data-value="Others"]'
        const liNone = "lightning-base-combobox-item"
        const saveBtn = 'li.slds-button-group-item.visible button[name="SaveEdit"]'
        console.log("walletLinking | editBtn : ",editBtn)
        if(editBtn){
            await editBtn.focus()
            await editBtn.click()
            await waitForElement(dropDown,30000)
                .then(element=>{
                    setTimeout(() => {
                        element[0].focus()
                        element[0].click()
                        console.log("dropdown element clicked")
                    },2000)
                })
                .catch(error => {
                    console.error(error);
                    checkMessenger("dropdown does not exist")
                    console.log("dropdown doesn't exist")
                })
            if(action === "link"){
                await waitForElement(others,2000).catch(error => console.log(error))
                .then(element => {
                    console.log("others element found",)
                    element[0].focus()
                    element[0].click()
                    closeMessenger()
                })
            }else{
                await waitForElement(liNone,2000).catch(error => console.log(error))
                .then(element => {
                    console.log("li-None element found",)
                    element[0].focus()
                    element[0].click()
                    closeMessenger()
                })
            }
            await waitForElement(saveBtn,5000)
                .then(element => { 
                    console.log("save Btn is : ",element)
                    element[0].focus()
                    element[0].click()
                    checkMessenger("wallet linked",10,2000)
                    resolve("success");
                })
                .catch(error => {
                    console.log(error);
                })
        }
    })
    
};
function closeSQC(){
    return new Promise(resolve => {
        const closeBtn = document.querySelector("button.slds-button.slds-button_icon.slds-modal__close.closeIcon.slds-button_icon-bare")
        closeBtn.focus()
        closeBtn.click()
        console.log("closeBtn clicked")
        resolve("success");
    })
};
const getPOIData = async () =>{
    return new Promise((resolve,reject) => {
        setTimeout(() =>  {
            sohail = document.querySelectorAll("div.modal__container .slds-m-around_small .slds-checkbox");
            const checkBoxes = "div.modal__container .slds-m-around_small .slds-checkbox"
            data = document.querySelectorAll(checkBoxes);
            console.log(data)
            if (data && data.length > 1){
                
                console.log(data[0].children[1].textContent)
                console.log(data[1])
                poiType = data[0].children[1].textContent.split(":")[1]?.trim() || null;
                poiNum = data[1].children[1].textContent.split(":")[1]?.trim() || null;
                poaType = data[3].children[1].textContent.split(":")[1]?.trim() || null;
                poaNum = data[4].children[1].textContent.split(":")[1]?.trim() || null;
                if (poiType && poiNum){
                    console.log("POI Type: ", poiType)
                    console.log("POI Number: ", poiNum)
                    POIData = {
                        poiType : poiType,
                        poiNum : poiNum
                    }
                    console.log(POIData);
                    closeSQC();
                    resolve(POIData)
                }else if(poaType && poaNum){
                    console.log("POA Type: ", poaType)
                    console.log("POA Number: ", poaNum)
                    POAData = {
                        poiType : poaType,
                        poiNum : poaNum
                    }
                    console.log(POAData);
                    closeSQC();
                    resolve(POAData)
                }
                else{
                    reject(new Error("NEITHER poiData && poaNum doesn't exist"))
                    console.log("getPOIData && poaData not found")
                }
            }else{
                alert("getPOIData | Data not found");
                console.log("getPOIData | Data not found");
                reject(new Error("Main Data  not found"))
            }
        },2000)
    })
    
};
async function selectkycPOI(element,inputEl,POIData){
    if(inputEl){
        if(POIData){
            for (r = 0; r < 2; r++){             
                console.log("element about to be clicked")
                await setTimeout(element.click(),1000)
                console.log("elementE2 clicked")
                
                item = document.querySelector(`lightning-base-combobox-item[data-value='${POIData.poiType}']`)
                if(item){
                    await setTimeout(item.click(),1000)
                }
                // Aadhaar
            }
            console.log("selectkycPOI | inputEl exist : ",inputEl)
            console.log("selectkycPOI | inputEl.child exist : ",inputEl.children)
            console.log("selectkycPOI | poiData exist : ",POIData)
            const newInput = inputEl.querySelector("input");
            newInput.value = POIData.poiNum
            newInput.focus()
            newInput.dispatchEvent(new Event("input",{bubbles:true}))
            newInput.dispatchEvent(new Event("change",{bubbles:true}))
            checkMessenger("poi deatils added",10,2000)
        }else{console.log("selectkycPOI | POIData doesn't exist")}
    }else{console.log("selectkycPOI | inputEl doesn't exist")}
};
async function addPoiData(poiData,anyReminder){
    const CustomerPhotoSec = "div.js-tabset.uiTabset--base.uiTabset--default.uiTabset.forceCommunityTabset c-customer-photo div div";
    const elements2 = await waitForElement(CustomerPhotoSec,2000).catch(error => {
        console.log("kyc poi details not found")
    })
    if(elements2 && elements2.length > 0){
        console.log("waitForElement (promise) | : ",elements2)
        for (el = 0; el < elements2.length; el++){
            console.log(`waitForElement element[${el}] | : `,elements2[el])
            if(el === 6){
                console.log(`this is ${el + 1}th element`)
                console.log(`element[${el+1}] | : `,elements2[el].innerText)
                selectkycPOI(elements2[el],elements2[12],poiData)
                console.log("elements clicked twice")
                const buttons = document.querySelectorAll("c-customer-photo lightning-button button")
                if(buttons && buttons.length > 0){
                    console.log("button tags are | : ",buttons)
                    window.scrollBy(0,100);
                    if(anyReminder && anyReminder != "no"){
                        messageToBackground("reminder",{
                            tag: anyReminder,
                            url: document.body.baseURI,
                            wait: 10000
                        });
                    }else{
                        console.log("no reminder needed");
                    }
                    setTimeout( () => {
                        buttons[1].focus()
                        buttons[1].click()
                        checkMessenger("poi details saved")
                        console.log("poi details saved")
                    },500)
                    break;
                }else{console.log("something went wrong");checkMessenger("something went wrong");}
            }
        }
    }else{console.log("something went wrong");checkMessenger("something went wrong");}
}
async function fetchKycPoiDetails(){
    const custPhoto = document.querySelector("li a[title='Customer Photo']");
    if(custPhoto){
        custPhoto.click();
        console.log("cust photo element clicked",custPhoto);
    }else{
        console.log("cust photo element not found");
    }
    const CustomerPhotoSec = "div.js-tabset.uiTabset--base.uiTabset--default.uiTabset.forceCommunityTabset c-customer-photo div div";
    const elements = await waitForElement(CustomerPhotoSec,5000).catch(error => checkMessenger("Kyc poi details Not needed.",10,5000))
    if(elements && elements.length > 0){
        console.log("waitForElement (promise) | : ",elements)
        console.log("fetching poi details"); checkMessenger("fetching poi details",9,2000);
        await wayToSQC("dataFetch");
        const poiData = await getPOIData();
        if(poiData){
            
            console.log("poiData : ", poiData);
            addPoiData(poiData,"no");
        }else{console.log("something went wrong");checkMessenger("something went wrong",10,2000);}
    }else{
        console.log("waitForElement (promise) | : ")
    }
    

};
function addExternalCss(){
    const cssLink = chrome.runtime.getURL("message.css"); // Ensure the correct path
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = cssLink;
    document.head.appendChild(link);
}
function addHtmlCss(){
    fetch(chrome.runtime.getURL("message.html"))
        .then((response) => response.text())
        .then((html) => {
            // Parse the HTML string into a DOM object
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            // Select the specific element by ID or class
            specificElement = doc.querySelector(".contentJS-messageContainer"); // Adjust selector as needed

            if (specificElement) {
                // Create a container in the current page
                const container = document.createElement("div");
                container.classList.add("contentJS-externalMessenger")
                container.style.position = "fixed";
                container.style.bottom = "0";
                container.style.right = "0";
                container.style.minWidth = "60vmin";
                container.style.maxHeight = "30vmin";
                container.style.zIndex = "9999";
                container.style.overflowY = "scroll"

                // Append the specific element to the container
                container.appendChild(specificElement);
                container.addEventListener("mouseover",()=> {container.remove()});
                // Append the container to the body of the current page
                document.body.appendChild(container);
                // Fetch and inject the CSS file
                

                // Optionally add a close button handler
                const closeButton = specificElement.querySelector(".contentJS-close");
                if (closeButton) {
                    closeButton.addEventListener("click", () => {
                        document.querySelectorAll("div.contentJS-externalMessenger").forEach(el => el.remove()); // Remove the container on close
                    });
                }
            } else {
                console.error("Specific element not found in the HTML file.");
            }
        })
        .catch((error) => console.error("Error loading popup.html:", error));
};
async function normalSQC(){
    if(permissions.sqc === true){
        await wayToSQC();
        await closeMessenger();
    }else{
        checkMessenger("submit for qc not allowed",10,2000)
    }
    
};

function commitChanges(left,right){
    return new Promise((resolve,reject) => {
      chrome.storage.local.set({[left] : right}, function(){
        if(chrome.runtime.lastError){
          console.log("error saving data : ",chrome.runtime.lastError)
          reject("failed")
        } else{
          console.log("data saved in : ", left);
          resolve("success")
        }
      })
    })
    
  }
function dynamoData(mobile,customerName,customerType,aid,fosName){
    const date = (new Date).toISOString().split("T")[0];
    const yearMonth = (new Date).toISOString().split("T")[0].slice(0,7);
    const time = (new Date).toTimeString().split(" ")[0];
    messageToBackground("dynamoData",{
        date : date,
        time : time,
        mobile : mobile,
        customerName : customerName,
        customerType : customerType,
        aid : aid,
        fosName : fosName,
        transactionID : `${date}-${mobile}-${fosName}`,
        yearMonth:yearMonth
    })
}
async function createListenerEl(){
    const removeListener = document.createElement("span");
    removeListener.style.width = "30px";
    removeListener.style.padding = "0px";
    removeListener.style.border = "none";
    removeListener.style.background = "none";
    removeListener.style.fontSize = "18px";
    removeListener.setAttribute("id","removeListener-content-js")
    removeListener.innerText = "❌";
    removeListener.style.cursor = "pointer"
    return removeListener
}
function grabNumber(){
    return new Promise (async (resolve,reject) => {
        const removeListener = document.createElement("span");
        removeListener.style.width = "30px";
        removeListener.style.padding = "0px";
        removeListener.style.border = "none";
        removeListener.style.background = "none";
        removeListener.style.fontSize = "18px";
        removeListener.setAttribute("id","removeListener-content-js")
        removeListener.innerText = "❌";
        removeListener.style.cursor = "pointer"
        const numInput = ".mobileNumber.slds-form-element div.slds-form-element__control.slds-grow input.slds-input"
        waitForElement(numInput,10000).then(async elements => {
            const buttons = document.querySelectorAll("div.slds-grid.slds-wrap button");
            const searchBtn = Array.from(buttons).find(el => el.innerText.toLowerCase() === "search")
            if(elements[0] && searchBtn){
                if(permissions.qrScans === true){
                    elements[0].style.backgroundColor = "#c7f9cc"
                }else{
                    elements[0].style.backgroundColor = "lightskyblue"
                }
                
                const parent = searchBtn.parentNode;
                const oldRemoveBtn = document.querySelector("span#removeListener-content-js");
                if(oldRemoveBtn){
                    oldRemoveBtn.remove();
                    console.log("oldRemoveBtn removed");
                    checkMessenger("button removed",10,3000)
                }
                if(permissions.qrScans === true){
                    parent.prepend(removeListener);
                }
                
                console.log("parent node is ",elements[0].parentNode)
                console.log("numInput found",elements[0]);console.log("searchBtn found",searchBtn);
                async function listenSearchBtn(Action){
                    waitForElement("div.Heading.slds-col.slds-large-size_1-of-2.slds-max-small-size_1-of-1.Customer-Details-heading",300000).then(element => {
                        const num = elements[0].value;
                        try {
                            navigator.clipboard.writeText(num);
                            console.log('Copied!');
                        } catch (e) {
                            console.error('Clipboard failed:', e);
                        }
                        const resolveData = {
                            "num": num,
                            "searchBtn": searchBtn,
                            "action": Action
                        }
                        console.log("searchBtn clicked"); checkMessenger("searchBtn clicked");
                        if(num.length === 10){
                            console.log("number captured : ",num);
                            resolve(resolveData);
                        }
                    })
                    
                }
                 
                if(!grabNumber.listener){
                    grabNumber.listener = () => listenSearchBtn("Qr");
                }
                if(!document.querySelector("span#contentjs-phoneNumber-Counter")){
                    checkMessenger("adding number counter",1,3000);
                    const cardInput = await waitForElement("lightning-input.cardNumber");
                    const numInput = elements[0];
                    if(numInput && cardInput && cardInput.length > 0){
                        const span = document.createElement("span");
                        span.id = "contentjs-phoneNumber-Counter"
                        cardInput[0].prepend(span);
                        const span2 = document.createElement("span");
                        span2.id = "contentjs-phoneNumber-Counter-slider"
                        numInput.parentElement.append(span2)
                        numInput.addEventListener("input",()=>{
                            span.innerText = numInput.value.length
                            span2.style.width = `${Number(numInput.value.length) * 10}%`
                            if(numInput.value.length < 10){
                                span.style.backgroundColor = "lightsalmon";
                                span2.style.borderColor = "lightsalmon"
                            }else if(numInput.value.length === 10){
                                span.style.backgroundColor = "lightblue";
                                span2.style.borderColor = "#085C97"
                            }
                        });
                        numInput.addEventListener("keydown",(event) => {
                            console.log(event);
                            if(event.key === "Enter"){
                                console.log("phone number entered")
                                searchBtn.click();
                            }
                        })
                        checkMessenger("number counter added",1,3000);
                    }else{
                        console.log("nothing found");
                    }
                }else{
                    console.log("number counter already exists");
                }

                searchBtn.removeEventListener("click",grabNumber.listener);
                checkMessenger("Listener removed",10,3000);
                searchBtn.addEventListener("click",grabNumber.listener);
                checkMessenger("Listener added",10,3000);
                removeListener.addEventListener("click", () => {
                    checkMessenger("Qr Otp Turned Off",10,2000);
                    searchBtn.removeEventListener("click", grabNumber.listener);
                    elements[0].style.backgroundColor = "white"
                    removeListener.remove();
                    const num = elements[0].value
                    searchBtn.addEventListener("click",() => {
                        checkMessenger("submitBtn Clicked");

                        listenSearchBtn("noQr");
                        checkMessenger("No qr");
                    })
                })
            }else{
                console.log("numInput not found")
                checkMessenger("unable to capture data, please refresh the page",10,2000);
                reject(new Error("input not found"))
            }
        }).catch(error => console.log(error))
    })
    
    
}

function grabNumber2(){
    return new Promise (async (resolve,reject) => {
        const removeListener = await createListenerEl()
        const numInput = document.querySelector("input.mobile-input");
        const searchBtn = document.querySelector("button.proceedBtn");
        if(numInput && searchBtn){
            if(permissions.qrScans === true){
                numInput.style.backgroundColor = "#c7f9cc"
            }else{
                numInput.style.backgroundColor = "lightskyblue"
            }
            
            const parent = searchBtn.parentNode;
            const oldRemoveBtn = document.querySelector("span#removeListener-content-js");
            if(oldRemoveBtn){
                oldRemoveBtn.remove();
                console.log("oldRemoveBtn removed");
                checkMessenger("button removed",10,3000)
            }
            if(permissions.qrScans === true){
                parent.prepend(removeListener);
            }
            console.log("numInput found",numInput);console.log("searchBtn found",searchBtn);
            async function listenSearchBtn(Action){
                waitForElement("p.customerName",300000).then(element => {
                    const num = numInput.value;
                    try {
                        navigator.clipboard.writeText(num);
                        console.log(`Copied! ${num}`);
                    } catch (e) {
                        console.error('Clipboard failed:', e);
                    }
                    const resolveData = {
                        "num": num,
                        "searchBtn": searchBtn,
                        "action": Action
                    }
                    console.log("searchBtn clicked"); checkMessenger("searchBtn clicked");
                    if(num.length === 10){
                        console.log("number captured : ",num);
                        resolve(resolveData);
                    }
                })
                
            }
                
            if(!grabNumber.listener){
                grabNumber.listener = () => listenSearchBtn("Qr");
            }
            if(!document.querySelector("span#contentjs-phoneNumber-Counter")){
                checkMessenger("adding number counter",1,3000);
                const cardInput = await waitForElement("div.mobile-input-container label span");
                if(numInput && cardInput && cardInput.length > 0){
                    const span = document.createElement("span");
                    span.id = "contentjs-phoneNumber-Counter"
                    cardInput[0].after(span);
                    const span2 = document.createElement("span");
                    span2.id = "contentjs-phoneNumber-Counter-slider"
                    numInput.parentElement.append(span2)
                    numInput.addEventListener("input",()=>{
                        span.innerText = numInput.value.length
                        span2.style.width = `${Number(numInput.value.length) * 10}%`
                        if(numInput.value.length < 10){
                            span.style.backgroundColor = "lightsalmon";
                            span2.style.borderColor = "lightsalmon"
                        }else if(numInput.value.length === 10){
                            span.style.backgroundColor = "lightblue";
                            span2.style.borderColor = "#085C97"
                        }
                    });
                    numInput.addEventListener("keydown",(event) => {
                        if(event.key === "Enter"){
                            console.log("phone number entered")
                            searchBtn.click();
                        }
                    })
                    checkMessenger("number counter added",1,3000);
                }else{
                    console.log("nothing found");
                }
            }else{
                console.log("number counter already exists");
            }

            searchBtn.removeEventListener("click",grabNumber.listener);
            checkMessenger("Listener removed",10,3000);
            searchBtn.addEventListener("click",grabNumber.listener);
            checkMessenger("Listener added",10,3000);
            removeListener.addEventListener("click", () => {
                checkMessenger("Qr Otp Turned Off",10,2000);
                searchBtn.removeEventListener("click", grabNumber.listener);
                numInput.style.backgroundColor = "white"
                removeListener.remove();
                const num = numInput.value
                searchBtn.addEventListener("click",() => {
                    checkMessenger("submitBtn Clicked");

                    listenSearchBtn("noQr");
                    checkMessenger("No qr");
                })
            })
        }else{
            console.log("numInput not found")
            checkMessenger("unable to capture data, please refresh the page",10,2000);
            reject(new Error("input not found"))
        }
    
    })
    
    
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
async function dataExtractStep1(data){
    return new Promise(async (resolve, reject) => {
        const element = await waitForElementSingle("p.customerName",300000).catch(error => console.log(error))
        const returnData = {}
        if(element){
            console.log("element found",element);
            const customerName = element.innerText
            const Aid = element.nextSibling.innerText
            const fosName = document.querySelector("span.profileName").innerText;
            const customerType = customerName.includes("NTB") ? "NTB" : "ETB";
            returnData.date = (new Date).toISOString().split("T")[0];
            returnData.time = (new Date).toTimeString().split(" ")[0]
            returnData.phoneNumber = data.num; 
            returnData.fosName = fosName; 
            returnData.customerName = customerName ; 
            returnData.Aid = Aid; 
            dynamoData(data.num,customerName,customerType,Aid,fosName)
            resolve(returnData);
        }
    })
}
async function searchCustomer2(){
    console.log("function called");
    const numInput = await waitForElement("input.mobile-input",10000).catch(error => console.log(error))
    const resolveData = await grabNumber2();

    if(resolveData){
        console.log("searchCustomer | resolveData => ",resolveData);
        console.log("searchCustomer | num => ",resolveData.num);
        if(resolveData.action === "Qr"){
            const data = {
                mobileNumber: resolveData.num,
                action: "openQr",
                url: permissions.qrUrl || "https://bfin.in/?3Q2VRXD8"
            };
            messageToBackground("data",data);
            console.log("qr request sent to background : ",data)
        }
        const step1 = await dataExtractStep1(resolveData);
        if(step1){
            console.log("searchCustomer | returnData => ",step1);
            // -------------- Date to Aid ----------------
            const oldData1 = await getLocalData("DATETOAID");
            if(oldData1){
                const changes = {...oldData1, [step1.date] : step1.Aid}
                commitChanges("DATETOAID",changes);
            }
            // -------------- Aid to Details --------------
            const oldData2 = await getLocalData("AIDTODATA");
            if(oldData2){
                const changes = {...oldData2, [step1.Aid] : step1}
                commitChanges("AIDTODATA",changes);
            }
        }
    }
}
                                                    
duplicateScreenshots = false
  

function getCibil(){
    const cibil = document.querySelectorAll("div.slds-grid div.slds-col.slds-size_1-of-2.Customer-Data");
    if(cibil && cibil.length > 0){
        console.log("cibil found",cibil)
        checkMessenger("cibil found");
        for(cib of cibil){
            if(cib.innerText.trim().toLowerCase().includes("cibil")){
                const score = cib.nextSibling.innerText
                checkMessenger(score);
                return score;
            }
        }
    }else{
        console.log("cibil not found");
    }
}
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




const assetCategories = {
    mobile : ["oppo", "vivo", "oneplus", "iphone", "redmi", "xiaomi","samsung-mobile","mobile"],
    laptop : ["laptop","apple-lap"],
    tab : ["tab", "ipad"],
    wm : ["wm"],
    watch : ["watch"],
    AC : ["ac"],
    REF : ["ref"],
    LED : ["led"],
    COOLER : ["cooler"],
    OSG : ["partner ew"]
}
const assetTypes = {
    cdd : ["laptop","mobile","tab","watch"],
    cd : ["AC","REF","LED","COOLER"]
}
function getAssetType(category){
    let assetType = null
    for(type in assetTypes){
        for(cat of assetTypes[type]){
            if(cat === category){
                assetType = type
                break
            }
        }
        if(assetType !== null){
            break
        }
    }
    return assetType
}
async function getAssetCategory(asset){
    const smallAsset = asset.toLowerCase()
    let found = false
    return new Promise((resolve,reject) => {
        for (let category in assetCategories){
            assetCategories[category].forEach((cat,inx) => {
                if(smallAsset.includes(cat)){
                    let brand = ""
                    if(category === "mobile" && assetCategories[category][inx].includes("samsung")){
                        brand = "samsung"
                    }else if(category === "laptop" && assetCategories[category][inx].includes("apple")){
                        brand = "APPLE"
                    }else if (category === "OSG"){
                        brand = "OSG"
                    }else{
                        brand = assetCategories[category][inx]
                    }
                    const data = {
                        category : category,
                        brand : brand.toUpperCase()
                    }
                    resolve(data)
                    found = true
                }
            })
            if(found === true){
                break
            }else{
            }
        }
        const data = {
            category : "not found",
            brand : "not found"
        }
        resolve(data)
    })
}
async function changeApproval(string){
    let cibilReasons = ["Score Decline","Low BScore","Negative Area Reject","CIBIL Reject"];
    let casualReasons = ["Limit Decline","MBK Thin Reject"];
    const cibil = getCibil();
    const trs = document.querySelectorAll("table.cdLinesTable tbody tr");
    const textAreas = document.querySelectorAll("textarea[name ='otherDetails']");
    const assertCart = document.querySelector("table.assertCart tbody tr");
    const productName = assertCart.children[2].innerText;    
    if(trs && trs.length > 0 && textAreas && textAreas.length > 0){
        console.log("APPROVALS found : ",trs); checkMessenger("APPROVALS found",5,1000);
        const A1 = trs[0].children[1];
        const A2 = trs[0].children[2];
        const A3 = trs[0].children[3];
        for(let start = 1;start <= 3;start++){
            trs[0].children[start].innerText = string
        }
        for(let start = 1;start <= 3;start++){
            trs[1].children[start].innerText = ""
        }
        for(let start = 1;start <= 3;start++){
            trs[2].children[start].innerText = ""
        }
        let rejectReason = null
        if(cibil && Number(cibil) < 750){
            rejectReason = cibilReasons[Math.floor(Math.random() * cibilReasons.length)]
        }else if(cibil === "" || !cibil){
            rejectReason = casualReasons[Math.floor(Math.random() * casualReasons.length)]
        }else{
            rejectReason = "Limit Decline"
        }
        for(let start = 1;start <= 4;start++){
            console.log("textarea = ",textAreas[start])
            textAreas[start].value = ""
        }
        const assetCategory = await getAssetCategory(productName);
        if(assetCategory && assetCategory.category != "not found"){
            const assetType = getAssetType(assetCategory.category);
            if(assetType && assetType === "cdd"){
                textAreas[1].value = rejectReason;
            }else if(assetType && assetType === "cd"){
                textAreas[2].value = rejectReason;
            }
        }
        
    }
}

async function getFMApprovals(){
    console.log("function runnign getFMApprovals");
    const inputs = document.querySelectorAll("div.salesforceIdentityLoginForm2 input");
    const submit = document.querySelector("button.loginButton");
    if(inputs && inputs.length > 0 && submit){
        inputs[0].focus()
        inputs[0].value = "c80563@bfl.com"
        inputs[0].dispatchEvent(new Event("input",{bubbles:true}))
        inputs[0].dispatchEvent(new Event("change",{bubbles:true}))
        await sleep(1000);
        inputs[1].focus()
        inputs[1].value = "Sameer@0463"
        inputs[1].dispatchEvent(new Event("input",{bubbles:true}))
        inputs[1].dispatchEvent(new Event("change",{bubbles:true}))
        await sleep(1000);
        submit.click();
        
    }
    const header = waitForElement("div.slds-cell-fixed",3000).catch(error => {checkMessenger("notfound",10,60000)})
    if(header && header.length > 0){
        console.log("header found",header);
        const checkBox = document.querySelectorAll(".slds-checkbox--faux.slds-checkbox_faux");
        if(checkBox && checkBox.length > 0){
            console.log("chheckbox is ",checkBox)
            checkBox[0].focus();
            checkBox[0].click();
        }else{
            console.log("checkbox not found");
        }
    }
        
    
    
}

async function addInvoice(){
    const editBtn = document.querySelector('ul.slds-button-group-list li runtime_platform_actions-action-renderer[apiname="Edit"] slot');
    editBtn.click();
    const input = await waitForElement('lightning-primitive-input-simple input.slds-input[name="Invoice_Number__c"]')
    if(input && input.length > 0){
        input[0].addEventListener("keydown", (event) => {
            if(event.key === "Enter"){
                const btn = document.querySelector('button[name="SaveEdit"]');
                if(btn){
                    btn.focus();
                    console.log("btn clicked");
                }else{
                    console.log("please save manually")
                }
            }
        })
        console.log("input found",input);
        input[0].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        input[0].focus();
        if(input[0].value || input[0].value.length > 10){
            alert("invoice number is already added");
        }else{
            input[0].value = permissions.invoiceNumberSeries || "1227/25/S-";
            input[0].dispatchEvent(new Event("input",{bubbles:true}));
            input[0].dispatchEvent(new Event("change",{bubbles:true}));
            
        }
        const dateEl = document.querySelector('records-record-layout-item[field-label="Created By"] lightning-formatted-text');
        const dateInput = document.querySelector('records-record-layout-item[field-label="Invoice Date"] lightning-input input')
        if(dateEl && dateInput){
            if(dateInput.value || dateInput.value.length > 5){
                console.log("date already added skipping date addition --------- ",dateInput.value);
            }else{
                const newDate = dateEl.innerText.split(" ")[0];
                dateInput.value = newDate
                dateInput.dispatchEvent(new Event("input",{bubbles:true}));
                dateInput.dispatchEvent(new Event("change",{bubbles:true}));
            }
            
        }else{
            console.warn("Date element or dateInput element not found");
        }
        
    }
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
async function waitValidateAgreement(reminder){
    console.log(`function running ============> waitValidateAgreement with parameters (${reminder})`)
    const arrowEl = await waitForElement('ul.slds-button-group-list li.slds-dropdown-trigger lightning-button-menu button',5000);
    if(arrowEl && arrowEl.length > 0){
        arrowEl[0].focus();
        arrowEl[0].click();
        console.log("arrow El clicked ✅");
        const vaEl = await waitForElement("ul.slds-button-group-list li.slds-dropdown-trigger runtime_platform_actions-action-renderer[apiname='Opportunity.Validate_Agreement'] slot");
        if(vaEl && vaEl.length > 0){
            vaEl[0].focus();
            await vaEl[0].click();
            console.log("vaEl clicked ✅");
            messageToBackground("reminder",{
                tag: reminder,
                url: document.body.baseURI,
                wait:30000
            });
        }
    }
}
async function responsiveSubmit(type,stage){
    console.log(`function running  ============> responsiveSubmit with parameters(${type},${stage})`);
    if(type === "NTB"){
        // wallet to none -> validate agreement -> submit for qc
        walletLinking("link").then(status => {
            if(status === "success"){
                waitValidateAgreement("submitForQc");
            }
        })
    }else if(type === "ETB"){
        // kyc poi fetch -> validate agreement -> submit for qc
        if(stage === 1){
            fetchKycPoiDetails();
            const bid = document.querySelector("h1")?.innerText?.split("\n")[1];
            messageToBackground("reminder",{
                tag: "responsiveSubmit",
                type:"ETB",
                stage:2,
                url: document.body.baseURI,
                wait:30000,
                bid:bid || null
            });
        }else if(stage === 2){
            waitValidateAgreement("submitForQc");
        }
        
    }
    
}
async function fetchIframeData(){
    const iframe = document.querySelector("iframe");
    iframe.style.height = "100000px"
    const widgets = iframe.contentDocument.querySelector("div.widgets");
    widgets.children[widgets.children.length - 1].style.height = "100%"
    await sleep("3000");
    const tables = iframe.contentDocument.querySelectorAll("table");
    const dataTable = tables[tables.length-1];
    dataTable.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
    })
    await sleep("3000");
    let trs = dataTable.querySelectorAll("tr");
    console.log("table content = ",trs);
    let newTrs = []
    let rowCount = 1
    trs.forEach((tr,index) => {
        console.log("index is = ",index);
        console.log(tr.innerText)
        let newTr = []
        
        if(index < 1){
            console.log("index is ",index);
            const ths = tr.querySelectorAll("th");

            ths.forEach((th,index) => {
                if(index < 1){
                    newTr.push("Sno");
                }else{
                    span = th.querySelector("span.lightning-table-cell-measure-header-value");
                    console.log("span value is ",span)
                    newTr.push(span?.innerText || "");
                }
            })
        }else{
            newTr.push(rowCount);
            rowCount = rowCount + 1
            const tds = tr.querySelectorAll("td");
            for (td of tds){
                newTr.push(td.innerText);
            }
        }
        newTrs.push(newTr);
    })
    console.log("new table data is = ",newTrs);
    iframe.style.height = ""
    widgets.children[widgets.children.length - 1].style.height = ""
    const worksheet = XLSX.utils.aoa_to_sheet(newTrs);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook,worksheet,"sheet1");
    XLSX.writeFile(workbook,`data.xlsx`)
    
}

function downloadJSON(data){
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], {type: "application/json"});

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json"
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
async function fetchIframeData2(){
    async function makeArray(trs){
        
        console.log("table content = ",trs);
        let newTrs = []
        let rowCount = 1
        trs.forEach((tr,index) => {
            console.log("index is = ",index);
            console.log(tr.innerText)
            let newTr = []
            
            if(index < 1){
                console.log("index is ",index);
                const ths = tr.querySelectorAll("th");

                ths.forEach((th,index) => {
                    if(index < 1){
                        newTr.push("Sno");
                    }else{
                        span = th.querySelector("span.lightning-table-cell-measure-header-value");
                        console.log("span value is ",span)
                        newTr.push(span?.innerText || "");
                    }
                })
            }else{
                newTr.push(rowCount);
                rowCount = rowCount + 1
                const tds = tr.querySelectorAll("td");
                for (td of tds){
                    newTr.push(td.innerText);
                }
            }
            newTrs.push(newTr);
        })
        
        return newTrs
    }
    const iframe = document.querySelector("iframe");
    iframe.style.height = "100000px"
    const widgets = iframe.contentDocument.querySelector("div.widgets");
    widgets.children[widgets.children.length - 1].style.height = "100%"
    await sleep("3000");
    const tables = iframe.contentDocument.querySelectorAll("table");
    const dataTable = tables[tables.length-1];
    let trs = dataTable.querySelectorAll("tr");
    dataTable.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
    })
    await sleep("3000");
    const newTrs1 = await makeArray(trs);
    trs[trs.length -1 ].lastChild.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
    })
    await sleep("3000");
    const newTrs2 = await makeArray(trs);
    console.log("newTrs1 = ",newTrs1);
    console.log("newTrs2 = ",newTrs2);
    if(newTrs1 && newTrs2){
        downloadJSON(newTrs1);
        downloadJSON(newTrs2)
    }
    iframe.style.height = ""
    widgets.children[widgets.children.length - 1].style.height = ""
    alert("both trs added");
    
}
async function fetchIframeData3(){
    let iframe = document.querySelector("iframe");
    iframe.style.height = "100000px"
    console.log("iframe height increased");
    let table = iframe.contentDocument.querySelector("table.data-grid-table.data-grid-full-table");
    console.log(table);
    async function hoverOn(item){
        item.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        })
    }
    async function downloadFile(newTrs){
        const worksheet = XLSX.utils.aoa_to_sheet(newTrs);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook,worksheet,"sheet1");
        XLSX.writeFile(workbook,`data.xlsx`);
    }
    await sleep("3000")
    async function processData(){
        const times = await prompt("How many times do you want to crawl?");
        const mainArray = []
        const finalArray = []
        const bids = []
        const bidsSkipped = []
        for (let time = 1 ; time <= times; time++){
            await sleep(3000);
            const data = []
            const trs = table.querySelectorAll("tr");
            trs.forEach((tr,index) => {
                const tds = tr.querySelectorAll("td");
                const trr = []
                for (td of tds){
                    trr.push(td.innerText)
                }
                console.log(trr)
                data.push(trr)
            })
            mainArray.push(data);
            hoverOn(trs[trs.length -1])
            
        }
        for (let array of mainArray){
            console.log("reading in main array");
            for (data of array){
                const bid = data[1]
                if(bids.includes(bid)){
                    bidsSkipped.push(bid);
                }else{
                    bids.push(bid);
                    finalArray.push(data);
                }
            }
        }
        console.log("bids skipped ",bidsSkipped);
        console.log("data processed",finalArray);
        return finalArray;
    }
    const finalData = await processData();
    await downloadFile(finalData);
}
async function emiProgram(){
    function removeCategory(){
        console.log("button pressed")
        const trs = document.querySelectorAll("table tbody tr");
        if(trs && trs.length > 0){
            for (tr of trs){
                const Category = tr.children[8];
                if(Category && Category.innerText === "Non-Tie Up Scheme"){
                    tr.remove();
                }else{
                    console.log("category not found");
                }
            }
        }
    }
    function filterLtvBasedSchemes(){
        const ltvValue = Number(document.querySelector("input#foreignInput-LTV").value);
        if(ltvValue && ltvValue != ""){
            console.log("button pressed")
            const trs = document.querySelectorAll("table tbody tr");
            if(trs && trs.length > 0){
                for (tr of trs){
                    const gT = Number(tr.children[3].innerText);
                    const aE = Number(tr.children[4].innerText);
                    
                    let reqLtv = aE === 0 ? 100 : Math.abs((aE / gT -1 ) * 100)
                    if(ltvValue < reqLtv){
                        console.log("tr removed",tr.innerText);
                        tr.remove();
                    }else{
                        console.log("tr remains",tr.innerText)
                    }
                    
                }
            }
        }
    }
    function calculate(){
        console.log("button pressed")
        const trs = document.querySelectorAll("table tbody tr");
        if(trs && trs.length > 0){
            for (tr of trs){
                const marginMoney = tr.children[1];
                const loanDetails = tr.children[2];
                const grossTenure = tr.children[3];
                const advanceEmi = tr.children[4];
                const netTenure = Number(grossTenure.innerText) - Number(advanceEmi.innerText)
                const emiAmount = tr.children[5];
                const DP = tr.children[7];
                const emiProgram = document.querySelector("input#foreignInput-Program");
                const array = loanDetails.innerText.split("-");
                const dbd = loanDetails.innerText.split("DBD-")[1].split("\n")[0];
                const invoiceAmount = array[array.length - 1]
                const category = tr.children[8];
                const PF = tr.children[9];
                const limit = document.querySelector("input#foreignInput-Limit");
                const total = tr.children[0];
                if(Number(emiAmount.innerText) > Number(emiProgram.value)){
                    emiAmount.innerText = emiProgram.value;
                    marginMoney.innerText = emiProgram.value * Number(grossTenure.innerText);
                    const dp = invoiceAmount - (Number(emiAmount.innerText) * netTenure) + Number(PF.innerText);
                    DP.innerText = category.innerText.includes("Manufacturer") ? dp : dp + Number(dbd)
                }else{
                    const dp = invoiceAmount - (Number(emiAmount.innerText) * netTenure) + Number(PF.innerText);
                    DP.innerText = category.innerText.includes("Manufacturer") ? dp : dp + Number(dbd)
                    
                }
                if(Number(emiAmount.innerText) * netTenure > limit.value){
                    emiAmount.innerText = limit.value / netTenure
                    marginMoney.innerText = limit.value * Number(grossTenure.innerText);
                    const dp = invoiceAmount - (Number(emiAmount.innerText) * netTenure) + Number(PF.innerText);
                    DP.innerText = category.innerText.includes("Manufacturer") ? dp : dp + Number(dbd)
                    
                }else{
                    console.log("emi amount is  less than limit");
                }

                total.innerText = (Number(emiAmount.innerText) * netTenure) + Number(DP.innerText);
                
            }
        }
    }
    function addInputs(){
        const divs = document.querySelectorAll("div.slds-grid.slds-wrap");
        const div = divs[divs.length - 1]
        div.children[1].style.display = "none"
        for (let i = 1; i <= 3; i++){
            input = document.createElement("input")
            div.appendChild(input)
            input.classList.add("CONTENT-JS-foreignInput")
            if(i === 1){
                input.id = `foreignInput-LTV`
                input.placeholder = "LTV"
                LTV = input
            }else if(i === 2){
                input.id = `foreignInput-Limit`
                input.placeholder = "limit"
                Limit = input
            }else if(i === 3){
                input.id = `foreignInput-Program`
                input.placeholder = "Max Emi"
                Program = input
            }
        }
        for (let i = 1; i <= 3; i++){
            btn = document.createElement("button");
            div.appendChild(btn);
            btn.classList.add("CONTENT-JS-foreignBtn");
            if(i === 1){
                btn.id = `foreignBtn-filterTieup`
                btn.innerText = "filter Tie-up"
                btn.addEventListener("click",removeCategory);
            }else if(i === 2){
                btn.id = `foreignBtn-filterLTV`
                btn.innerText = "filter LTV"
                btn.addEventListener("click",filterLtvBasedSchemes);
            }else if(i === 3){
                btn.id = `foreignBtn-calculate`
                btn.innerText = "Calculate"
                btn.addEventListener("click",calculate);
            }
        }
    }
    function changeHeaders(){
        const ths = document.querySelectorAll("table thead th");
        ths[0].innerText = "Total Amount"
        ths[1].innerText = "Loan Amount"
        ths[7].innerText = "Down Payment"
        ths[0].scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        })
    }
    addInputs();
    changeHeaders();
    
}

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
async function changeReason(string){
    const textAreas = document.querySelectorAll("textarea[name ='otherDetails']");
    if(textAreas && textAreas.length > 0){
        if(string === "phoneLocking"){
            textAreas[1].value = "Emandate Lock + Phone Lock";
        }
        
    }
}
async function changeEligibility(task){
    trs = document.querySelectorAll("div.cdLinesDiv table tbody tr");
    balanceLimit = document.querySelectorAll("div.Opportunity-Data div.slds-grid span.Customer-Data-Value")[3]
    cdLTV = trs[0].children[1].children[0]
    cdLimit = trs[1].children[1].children[0]
    digitalLTV = trs[0].children[2].children[0]
    digitalLimit = trs[1].children[2].children[0]
    switch(task){
        case "limitMatch":
            cdLimit.innerText = balanceLimit.innerText
            digitalLimit.innerText = balanceLimit.innerText
        break;
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
                        case "11": case "IN":
                            div.remove();
                            addInvoice();
                            break;
                        case "12": case "KP":
                            div.remove();
                            fetchKycPoiDetails();
                            break;
                        case "13": case "WO":
                            div.remove();
                            walletLinking("link");
                            break;
                        case "14": case "VA":
                            div.remove();
                            validateAgreement();
                            break;
                        case "15": case "SQ":
                            div.remove();
                            normalSQC();
                            break;
                        case "16": case "RD":
                            div.remove();
                            messageToBackground("info","page_reloaded");
                            break;
                        case "17": case "NA":
                            div.remove();
                            changeApproval("Not Approved");
                            break;
                        case "18": case "FM":
                            div.remove();
                            getFMApprovals();
                            break;
                        case "19": case "WN":
                            div.remove();
                            walletLinking("unlink");
                            break;
                        case "10": case "WVS": case "NTBS":
                            div.remove();
                            responsiveSubmit("NTB");
                            break;
                        case "20": case "KVS": case "ETBS":
                            div.remove();
                            responsiveSubmit("ETB",2);
                            break;
                        case "21": case "PL":
                            div.remove();
                            changeReason("phoneLocking");
                            break;
                        case "22": case "LM":
                            div.remove();
                            changeEligibility("limitMatch")
                            break;
                        case "79": case "SD":
                            div.remove();
                            getschemedata();
                            break;
                        case "80": case "DD":
                            div.remove();
                            fetchIframeData();
                            break;

                        case "81": case "D2":
                            div.remove();
                            fetchIframeData2();
                            break;
                        case "83": case "D3":
                            div.remove();
                            fetchIframeData3();
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
                        case "99": case "EX":
                            emiProgram();
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
        search : "/dealercommunityreinvent/s/searchmain",
        defaultOpportunities : "/dealercommunityreinvent/s/opportunity/Opportunity/Default",
        customer : "/dealercommunityreinvent/s/customer/",
        opportunity : "/dealercommunityreinvent/s/opportunity/"
    }
    const reinventAutomationPagesList = {
        [keys.search] : {function: searchCustomer2, argument: [], condition: url.includes(keys.search)}, // search page
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
    }else if(request.action === "fetchKycPoiDetails"){
        checkMessenger("Command request | get Kyc Poi",10,3000)
        fetchKycPoiDetails();
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
    }else if(request.action === "responsiveSubmit"){
        responsiveSubmit(request.type,request.stage);
    }else if(request.action === "getTabCount"){
        getTabCount();
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

