console.dir(document.body.baseURI);
function handleMenuBar(div){
    console.log("function running Handle menu bar");
    
}
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

const gmdElements = [
    "div.slds-checkbox label[for*='checkbox-unique-id-100'] span.slds-checkbox_faux",
    "div.slds-checkbox label[for*='checkbox-unique-id-101'] span.slds-checkbox_faux",
    "div.slds-checkbox label[for*='checkbox-unique-id-102'] span.slds-checkbox_faux",
    "div.slds-checkbox label[for*='checkbox-unique-id-103'] span.slds-checkbox_faux",
    "div.slds-checkbox label[for*='checkbox-unique-id-104'] span.slds-checkbox_faux",
    "div.slds-checkbox label[for*='checkbox-unique-id-105'] span.slds-checkbox_faux",
    "div.slds-checkbox label[for*='checkbox-unique-id-106'] span.slds-checkbox_faux",
    "div.slds-checkbox label[for*='checkbox-unique-id-107'] span.slds-checkbox_faux"
]
let listenersHistory = {}
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
        // console.log(response);
        // alert(response.reply);
        console.log("response from background : ",response);
        return response
    });
};
getPermissions().then(data => {
    permissions = data;
    const date = new Date
    const newDate = date.toISOString().split("T")[0];
    // if(data.lastExtensionRefreshed != newDate && permissions.autoRefresh === true){
    //     data.lastExtensionRefreshed = newDate;
    //     commitChanges("permissions",data);
    //     alert("Extension will close now, you can open it again.");
    //     messageToBackground("extensionReload","");
    // }else 
    // if(data.lastDataBackup != newDate){
    //     if(data.autoBackup === true){
    //         data.lastDataBackup = newDate;
    //         commitChanges("permissions",data);
    //         messageToBackground("download","database");
    //     }
    // }else{
    //     console.log("no need to refresh");
    // }
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
        //   console.log("data fetched : ", request[left]);
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

function getDomStatus(){
    return new Promise(resolve => {
        if(document.readyState === "loading"){
            console.log("dom is loading"); 
            checkMessenger("page is loading",1,1000)
            resolve("loading")
        }else{
            console.log("DOM is fully loaded");
            checkMessenger("page is loaded",1,1000);
            resolve("loaded");
        }
    })
};
function waitForDomLoading(time){
    return new Promise(resolve => {
        let timeout = Date.now() + time;
        console.log("timeout is : ",timeout)
        let interval = setInterval(()=> {
            if(Date.now() < timeout){
                console.log("time remaining : ",timeout - Date.now())
                getDomStatus().then(status => {
                    if(status === "loaded"){
                        console.log("dom is loaded"); 
                        checkMessenger("dom is loaded",1,1000);
                        // sleep(1000).then(s => {
                            clearInterval(interval);
                            resolve("loaded");
                        // })
                        
                    }else if(status === "loading"){
                        console.log("dom is loading"); checkMessenger("dom is loading",1,1000)
                    }
                })
            }else{
                console.log("timeout dom still not loaded"); checkMessenger("timeout, dom not loaded",1,1000)
                clearInterval(interval);
            }
        },100)
    })
}
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
        // console.log("selector is : ",selector);
        const startTime = Date.now();
        const checkExist = setInterval(() => {
            const element = document.querySelectorAll(selector);
            if (element && element.length > 0) {
                clearInterval(checkExist);
                // console.log("waitForElement | element found : ",element);
                resolve(element);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(checkExist);
                reject(new Error(`Element not found: ${selector}`));
            }   
        }, 100); // Check every 100ms
    });
};
const permitSQC = async (elements) => {
    // return promise
    // check if the checkboxes are disabled,
    // if they are disabled then check for the error above checkboxes
    // if they are not disabled then return proceed for sqc 
    elements = "div.modal__container .slds-m-around_small input"
    await waitForElement(elements,3000).catch(error => console.log(error))
    return new Promise((resolve,reject)=> {
        if(elements[0].disabled){
            console.log("checkboxes are disabled")
            validateInvoice = document.querySelector("c-validate-invoice")
            validateBtn = document.querySelector("c-validate-invoice div.slds-align_absolute-center lightning-button button")
            if(validateInvoice){
                if(validateBtn){
                    validateBtn.focus()
                    validateBtn.click()
                }else{console.log("some other error")}
            }else{
                console.log("some other error")
                reject(new Error("some other error"))
            }
        }else{
            console.log("checkboxes are enabled")
            resolve("Granted")
        }
    });
    
};
async function experiment(){
   const el = document.querySelector('ul.slds-button-group-list li.slds-dropdown-trigger slot');
    if (el) {
    console.log("Element found:", el);
    console.log("Is in DOM?", document.contains(el));
    console.log("Is visible?", el.offsetParent !== null);
    console.log("Bounding box:", el.getBoundingClientRect());

    try {
        el.click(); // Try native click
        console.log("Tried native .click()");
    } catch (e) {
        console.error("Native click failed:", e);
    }

    try {
        el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        console.log("Tried dispatchEvent click");
    } catch (e) {
        console.error("DispatchEvent click failed:", e);
    }
    } else {
    console.warn("Element not found");
}

    
}
async function wayToSQC(intention = "submitForQc"){
    // const arrowEl = document.querySelector(".slds-grid.slds-grid--vertical-align-center.slds-grid--align-center.sldsButtonHeightFix");
    const arrowEl = document.querySelector('ul.slds-button-group-list li.slds-dropdown-trigger lightning-button-menu button')
    arrowEl.focus();
    await arrowEl.click();
    console.log("arrowE1 clicked");
    // const sqcEl = document.querySelector('[data-target-selection-name="sfdc:QuickAction.Opportunity.Submit_For_QC_new"]');
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
// returns false if element is not clicked
function tickCheck(element){
    const afterStyle = window.getComputedStyle(element,'::after')
    return afterStyle.content && afterStyle.content != 'none' && afterStyle.content != ''
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
function handleEditError(someError){
    switch(someError[0].innerText){
        case "Please complete asset validation.":
            alert(someError.innerText)
            break;
    }
};
async function edit_Save(){
    return new Promise((resolve) => {
        const saveBtn = "button[title='Save']"
        waitForElement(saveBtn,5000).then(saveBtnEl => {
            if(saveBtnEl){
                console.log("save Btn is : ",element)
                saveBtnEl[0].focus()
                saveBtnEl[0].click()
                const errorDiv = "div.pageLevelErrors div.desktop.forcePageError ul li"
                waitForElement(errorDiv,5000).then(someError => {
                    if(someError && someError.length > 0){
                        resolve(someError)
                    }else{
                        console.log("no error found <5>")
                    }
                })
            }else{
                checkMessenger("edit_Save | saveBtnEl => not found",1,1000)
                console.log("edit_Save | saveBtnEl => not found")
            }
        }).catch(error => console.log(error))
        
    })
    
};
async function validateAgreement(){
    // const arrowEl = document.querySelector(".slds-grid.slds-grid--vertical-align-center.slds-grid--align-center.sldsButtonHeightFix");
    const arrowEl = document.querySelector('ul.slds-button-group-list li.slds-dropdown-trigger lightning-button-menu button');
    if(arrowEl){
        arrowEl.focus();
        arrowEl.click();
    }else {
        // response = prompt("Cannot initiate validate agreement, Do you want to try again","yes");
        // if(response === "yes"){
        //     validateAgreement();
        // }else {
        //     console.log("validate agreement dropped");
        // }
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
                    // checkMessenger("dropdown selected");
                    setTimeout(() => {
                        element[0].focus()
                        element[0].click()
                        console.log("dropdown element clicked")
                        // checkMessenger("dropdown element clicked")
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
                    // checkMessenger("others element clicked")
                    closeMessenger()
                })
            }else{
                await waitForElement(liNone,2000).catch(error => console.log(error))
                .then(element => {
                    console.log("li-None element found",)
                    element[0].focus()
                    element[0].click()
                    // checkMessenger("li-None element clicked")
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
                
                // alert("getPOIData | Data found")
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
            // inputEl.children[0].value = POIData.poiNum
            // inputEl.children[0].focus()
            // // inputEl.children[0].value = ""
            // // inputEl.children[0].focus()
            // inputEl.children[0].value = POIData.poiNum
            // inputEl.children[0].blur()
            // inputEl.children[0].dispatchEvent(new Event("input",{bubbles:true}))
            // inputEl.children[0].dispatchEvent(new Event("change",{bubbles:true}))
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
async function customerPhotoSection(){
    return new Promise(async (resolve,reject) => {
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
            resolve("success")
        }else{
            console.log("waitForElement (promise) | : ");
        }
    })
    
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
async function listenerSubmitSqc(){
    checkMessenger("waiting for linking status",10,3000)
    waitForError("div.toastContainer","not linked",10000).then(async error => {
        // checkMessenger("wallet not linked",10,3000);
        await closeSQC()
        await sleep(1000)
        await walletLinking()
        await sleep(1000)
        await normalSQC()
    }).catch(error => {
        checkMessenger("error not found",3,2000);
    })
    waitForError("div.toastContainer","kyc poi type",10000).then(async error => {
        const poiData = await getPOIData();
        if(poiData){
            await customerPhotoSection().then(error => {
                addPoiData(poiData,"remindForQC");
            })
        }else{
            checkMessenger("something went wrong",10,2000);
            console.log("poi data not found");
        }
        
    }).catch(error => console.log(error));
}
// checks all the suggested boxes in a panel and the remaining ones
async function checkTheBoxes(element){
    console.log("element is : ",element)
    console.log("length is = ",element.length)

    for (el of element){
        // console.log(el.innerText)
        await el.click();
        // console.log("checkboxes clicked")
    }
    for(el of gmdElements){
        element = document.querySelector(el);
        console.log("gmd element is : ",element)
        if(element){
            CLICK = tickCheck(element)
            if(CLICK === false){
                element.click();
                console.log("gmdCheckboxes clicked")
            }else{console.log("element is already clicked")}
            
        }else{console.log("gmd element not found")}
    }
    submitButton = document.querySelector('c-submit-for-qc div.modal__container lightning-button button[type="submit"]');
    if (submitButton && submitButton.disabled != true){
        console.log(submitButton)
        submitButton.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        })
        submitButton.addEventListener("click",listenerSubmitSqc);
        submitButton.click()
        console.log("submitButton clicked");
        // if(submitButton.disabled === false){
        //     console.log("sqc btn not clicked");
        //     checkMessenger('sqc btn not clicked');
        //     const interval = setInterval(() => {
        //         btn = document.querySelector('c-submit-for-qc div.modal__container lightning-button button[type="submit"]');
        //         btn.click();
        //         if(btn.disabled === true){
        //             checkMessenger("File Submition initiated",10,3000);
        //             console.log("File Submition initiated");
        //             clearInterval(interval);
        //         }
        //     },500)
        // }else{
        //     checkMessenger("File Submition initiated",10,3000);
        //     console.log("File Submition initiated");
        // }
        
    }else{console.log("button not found")}
};

// performs main task of submitting the file to qc
const submitForQC = async () => {
    checkBoxes = "div.modal__container .slds-m-around_small input"
    checkBoxes1 = "div.modal__container span.slds-checkbox_faux"
    checkBoxes2 = "div.slds-checkbox span.slds-checkbox_faux"
    pEl1 = "div.slds-checkbox label[for='checkbox-unique-id-100-129']"
    waitForElement(checkBoxes,5000)
        .then(element => {
            console.log('Element found:', element);
            setTimeout(function() {checkTheBoxes(element)},1000)
        })
        .catch(err => {
            console.error(err);
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
                // container.style.background = "black";

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
async function adminSQC2(){
    await wayToSQC()
    const permit = await permitSQC()
    if (permit == "Granted"){
        console.log("SQC IS ALLOWED")
    }
};
async function adminSQC1(){
    const prepare  = await prepareForQC()
    console.log("adminSQC1 | prepareForQC => : ",prepare)
    // checkMessenger(`adminSQC1 | prepareForQC => : ${prepare}`)
    if(prepare === "initiateSQC"){
        await adminSQC2()
    }else if(prepare === "initiateWalletLinking"){
        await walletLinking();
        await adminSQC2();
    }else{console.log("some error occured")}
};
async function normalSQC(){
    if(permissions.sqc === true){
        await wayToSQC();
        await submitForQC();
        await closeMessenger();
    }else{
        checkMessenger("submit for qc not allowed",10,2000)
    }
    
};
function getLocation(){
    // return new Promise((resolve,reject)=>{
        const POPUP = document.querySelector("div.modal-container.slds-modal__container div.modal-header.slds-modal__header h1.title.slds-text-heading_medium.slds-hyphenate");
        if(POPUP){
            console.log("getLocation | loc1_Edit : ",POPUP)
            // checkMessenger("POPUP : Element found")
            if(POPUP.innerText === "Submit for QC"){
                console.log("you are at submit for qc")
                // checkMessenger("you are at submit for qc")
                return({location: "SQC"}) ;
            }
            console.log("you are IN EDIT")
            // checkMessenger("you are IN EDIT")
            return({location : "EDIT"});
        }else{
            console.log("getLocation | loc1_Edit : Element not found")
            checkMessenger("loc1_Edit : Element not found",1,2000)
            return({location : "HOME"})
        }
    // })
    
};
async function selectStage(div2,stage){
    await sleep(3000)
    for(let i = 1; i < 4 ;i++){
        console.log("in a loop")
        // checkMessenger("in a loop")
        if(div2){
            console.log("div2 is not null")
            div2.click()
            await sleep(1000)
            if(stage ==="sqc"){
                console.log("stage is SQC")
                const sqc = document.querySelector("div.select-options ul.scrollable li.uiMenuItem.uiRadioMenuItem a[title='Submitted For QC']");
                if(sqc){
                    // checkMessenger("sqc is not null")
                    console.log("sqc is not null")
                    sqc.click()
                    break;
                }else{
                    console.log("sqc is null")
                    // checkMessenger("sqc is null")
                }
                // setTimeout(sqc.click(),1000)
            }else if(stage ==="postDo"){
                
                console.log("stage is postDo")
                const postDo = document.querySelector("div.select-options ul.scrollable li.uiMenuItem.uiRadioMenuItem a[title='Post DO']")
                if(postDo){
                    console.log("postDo is not null")
                    // checkMessenger("postDo is not null")
                    postDo.click()
                    break;
                }else{
                    console.log("postDo is null")
                    // checkMessenger("postDo is null")
                }
            }
        }else{"div 2 is null"}
    }
}
async function changeStage(stage = "postDo"){
    const stageContainers = document.querySelectorAll("dl div.slds-form-element.slds-hint-parent div.slds-form-element__control")
    // sohail[87].children[0].children[1].children[0].children[0].children[0].children[0].click()
    if(stageContainers && stageContainers.length > 0){
        console.log("changeStage | stageContainers : ",stageContainers)
        // checkMessenger(`changeStage | stageContainers : found => ${stageContainers.length}`)
        for(div of stageContainers){
            console.log("changeStage | div : ",div)
            if(div.children[0].children[0].innerText === "Stage\n*"){
                console.log("changeStage | stage element : ",div)
                // checkMessenger("stage element found")
                div.scrollIntoView({behavior: 'smooth',block:'center'})
                // const div2 = div.children[0].children[1]
                const div2 = div.querySelector("a.select")
                if(div2){
                    console.log("changeStage | stage select : ",div2);
                    // checkMessenger("changeStage | stage select : found => a");
                    await selectStage(div2,stage)
                    break;
                }
            }
        }
    }
}
function checkpaymentAuth(){
    const authStatus = document.querySelectorAll("div.slds-form-element.slds-form-element_readonly.slds-grow.slds-hint-parent.override--slds-form-element")
    if(authStatus && authStatus){
        console.log("checkpaymentAuth | authStatus : ",authStatus)
        // checkMessenger("checkpaymentAuth | authStatus : found")
        for(div of authStatus){
            console.log("checkpaymentAuth | authStatus : ",div.children[0].innerText)
            if(div.children[0].innerText === "Payment Authorization Status"){
                div.scrollIntoView({
                    behavior : 'smooth',
                    block: 'center'
                })
                console.log("checkpaymentAuth | authStatus : element found = ",div)
                console.log("checkpaymentAuth | authStatus : ",div.children[0].innerText)
                // checkMessenger(`checkpaymentAuth | authStatus : ${div.children[0].innerText}`)
                const payAuthStatus = {status : div.children[1].innerText}
                console.log(payAuthStatus);
                return payAuthStatus;
            }
        }
    }else{
        console.log("checkpaymentAuth | authStatus : not found");
        checkMessenger("checkpaymentAuth | authStatus : not found",1,2000)
    }
}

async function checkPayAuthWalLink(){
    const location = await getLocation();
    if(location){
        console.log("checkPayAuthWalLink | location : ",location.location);
        // checkMessenger(`checkPayAuthWalLink | location : ${location.location}`);
        switch(location.location){
            case "HOME":
                console.log("checkPayAuthWalLink | HOME")
                // checkMessenger("checkPayAuthWalLink | HOME")
                const payAuthStatus = await checkpaymentAuth()
                if(payAuthStatus){
                    switch(payAuthStatus.status){
                        case "Approved":
                            console.log("checkPayAuthWalLink | payAuthStatus => Approved")
                            await changeStage("sqc")
                            const someError = await edit_Save()
                            if(someError){
                                console.log("checkPayAuthWalLink | someError")
                                await handleEditError(someError)
                            }
                            break;
                        case "Pending":
                            console.log("checkPayAuthWalLink | payAuthStatus => Pending")
                            checkMessenger("checkPayAuthWalLink | payAuthStatus => Pending",1,1000)
                            alert("Please get payment authorization")
                            break;
                    }
                    
                }
                break;
            case "SQC":
                console.log("checkPayAuthWalLink | SQC")
                // checkMessenger("checkPayAuthWalLink | SQC")
                break;
            case "EDIT":
                console.log("checkPayAuthWalLink | EDIT")
                // checkMessenger("checkPayAuthWalLink | EDIT")
                break;
        }
    }
    
}
function checkApprovalData(){
    return new Promise((resolve,reject) => {
        const trs = document.querySelectorAll("table.cdLinesTable tbody tr")
        if(trs && trs.length > 0){
            console.log("APPROVALS found : ",trs); checkMessenger("APPROVALS found",5,1000);
            const c1 = trs[0].children[1].innerText.trim().toLowerCase();
            const c2 = trs[0].children[2].innerText.trim().toLowerCase();
            const c3 = trs[0].children[3].innerText.trim().toLowerCase();
            console.log("approval  = ",c1," --- ",c2," --- ",c3)
            checkMessenger(c1,5,1000); checkMessenger(c2,5,1000); checkMessenger(c3,5,1000);
            if(c1 === "not approved" && c2 === "not approved" && c3 === "not approved"){
                console.log("all are not approved");
                resolve({
                    status: "allNotApproved",
                    a1: c1,
                    a2: c2,
                    a3: c3
                })
            }else if(c1 !== "not approved" && c2 !== "not approved" && c3 !== "not approved"){
                if(Number(c1) === 0 || Number(c2) === 0 || Number(c3) === 0){
                    console.log("some are not approved");
                    resolve({
                        status: "someNotApproved",
                        a1: c1,
                        a2: c2,
                        a3: c3
                    })
                }else{
                    console.log("all are approved");
                    resolve({
                        status: "allApproved",
                        a1: c1,
                        a2: c2,
                        a3: c3
                    })
                }
            }else{  
                console.log("some are not approved");
                resolve({
                    status: "someNotApproved",
                    a1: c1,
                    a2: c2,
                    a3: c3
                })
            }
            

        }else{
            console.log("trs not found"); checkMessenger("APPROVAL not found",5,1000);
            reject(new Error("trs not found"))
        }
    })
}
function getRejectReasons(){
    return new Promise((resolve, reject) => {
        const textAreas = document.querySelectorAll("textarea[name ='otherDetails']");
        if(textAreas && textAreas.length > 0){
            console.log("textAreas",textAreas);
            const digital = textAreas[1].value.trim() || ""
            const cd = textAreas[2].value.trim() || ""
            const rcu = textAreas[4].value.trim() || ""
            const returnData = {
                digital : digital,
                cd : cd,
                rcu : rcu
            }
            
            if(digital != "" || cd != "" || rcu != ""){
                checkMessenger(digital,9,1000);
                const rCon1 = rcu != "" 
                const rCon2 = digital.toLowerCase().includes("rcu")
                const rCon3 = cd.toLowerCase().includes("rcu")
                if(rCon1){
                    returnData.status = true
                    returnData.container = "rcu"
                }else if  (rCon2){
                    returnData.status = true
                    returnData.container = "digital"
                }else if  (rCon3){
                    returnData.status = true
                    returnData.container = "cd"
                }else{
                    returnData.status = false
                }
                resolve(returnData)
            }else{
                resolve("empty")
            }
        }else{
            reject("not appeared")
            checkMessenger("textArea not found",5,1000)
        }
    })
}
function checkRejectReasons(timer = 2000){
    return new Promise((resolve, reject) => {
        let timeout = Date.now() + timer
        const interval = setInterval(()=> {
            getRejectReasons().then(data => {
                if(data === "empty"){
                    console.log('find again')
                }else{
                    checkMessenger("data found")
                    console.log("data : ",data);
                    clearInterval(interval);
                    resolve(data)
                }
            }).catch(error => {
                console.error("error occured ",error)
                clearInterval(interval);
                reject(error)
            })
            if(timeout > Date.now()){
                console.log("still finding")
            }else{
                clearInterval(interval);
                reject("DATA NOT FOUND")
            }
        },100)
    })
    
}
function getRcuData(timer = 2000){
    return new Promise((resolve,reject) => {
        const options = document.querySelectorAll("div.Rectangle")
        if(options && options.length > 0){
            console.log("options found : ",options); //checkMessenger("options found");
            for(opt of options){
                // opt.children[0].scrollIntoView({
                //     behavior: 'smooth',
                //     block: 'center'
                // })
                const heading = opt.children[0].innerText;
                if(heading.startsWith("7")){
                    console.log("heading : ", heading); //checkMessenger(`heading : ${heading}`)
                    const digitalContainer = opt.children[1].children[1]
                    const digital = digitalContainer.querySelector("textarea");
                    const cdContainer = opt.children[2].children[0];
                    const cd = cdContainer.querySelector("textarea");
                    const rcuContainer = opt.children[2].children[2]
                    const rcu = rcuContainer.querySelector("textarea");
                    
                    const timenow = Date.now()
                    let timeout = Date.now() + timer
                    const interval = setInterval(()=> {
                        if(digital.value.trim() !== "" || cd.value.trim() !== "" || rcu.value.trim() !== ""){
                            const returnData = {
                                digital : digital.value.trim(),
                                cd : cd.value.trim(),
                                rcu : rcu.value.trim()
                            }
                            clearInterval(interval)
                            console.log("data found : ", returnData); //checkMessenger("data found");
                            checkMessenger(digital.value.trim());
                            const rCon1 = rcu.value != "" 
                            const rCon2 = digital.value.trim().toLowerCase().includes("rcu")
                            const rCon3 = cd.value.trim().toLowerCase().includes("rcu")
                            if(rCon1){
                                returnData.status = true
                                returnData.container = "rcu"
                            }else if  (rCon2){
                                returnData.status = true
                                returnData.container = "digital"
                            }else if  (rCon3){
                                returnData.status = true
                                returnData.container = "cd"
                            }else{
                                returnData.status = false
                            }
                            resolve(returnData)
                        }else{
                            if(Date.now() < timeout){
                                console.log("still finding: time left = ",timeout - Date.now())
                                
                            }else{
                                console.log("timeout : rcu data not found");
                                clearInterval(interval);
                                reject("rcu data not found")
                                checkMessenger("reject reason not appeared")
                            }
                        }
                    },100)
                    
                }
            }
        }else{
            console.log("reject panel not found"); checkMessenger("reject panel not found");
            reject("reject panel not found");
        }
    })
    
}
function commitChanges(left,right){
    return new Promise((resolve,reject) => {
      // console.log("chrome is :",chrome);
      // console.log("local storage is ",localStorage)
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
function getOpportunities(){
    let opportunities = []
    return new Promise((resolve, reject) => {
        waitForElement("table.assertCart tbody tr",2000).then(assetCart => {
            if(assetCart && assetCart.length > 0){
                for (tr of assetCart){
                    let bidContainer = {}
                    const bid = tr.children[0].innerText;
                    if(bid){
                        bidContainer.bid = bid;
                        const bidDate = date_dd_mm_yyyy(tr.children[1].innerText);
                        bidContainer.bidDate = bidDate? bidDate: null;
                        const productName = tr.children[2].innerText;
                        bidContainer.productName = productName? productName: null;
                        const bidStage = tr.children[3].innerText;
                        bidContainer.bidStage = bidStage? bidStage: null;
                        const invoiceAmount = tr.children[4].children[1].innerText.match(/\d+/);
                        bidContainer.invoiceAmount = invoiceAmount? Number(invoiceAmount[0]) : null ;
                        if(bidStage.toLowerCase().includes("completed")){
                            console.log("skipping bid container => di completed found",bidContainer);
                        }else{
                            opportunities.push(bidContainer);
                        }
                    }else{
                        reject(new Error("bid not found"))
                    }
                }
                resolve(opportunities)
            }
        }).catch(error => {
            console.log(error)
            reject(new Error(error));
        })
    })
}
async function checkAid(Aid){
    const oldData = await getLocalData("loginData");
    return new Promise (resolve => {
        if(oldData){
            if(oldData[Aid]){
                console.log("old Aid");
                resolve({status: "oldAid",data: oldData})
            }else{
                console.log("new Aid");
                resolve({status: "newAid"})
            }
        }else{
            console.error("could not get loginData"); checkMessenger("could n't get loginData")
            reject(new Error("Could not get login data"))
        }
    })
    
}

async function getData2(data){
    return new Promise(async (resolve, reject) => {
        // navigator.clipboard.writeText(data.num)
        /*** { Customer deatils heading }***/
        const elements = await waitForElement("div.Heading.slds-col.slds-large-size_1-of-2.slds-max-small-size_1-of-1.Customer-Details-heading",300000).catch(error => console.log(error))
        if(elements && elements.length > 0){
            console.log("element found",elements[0]); //checkMessenger("element 1 found");
            const elements2 = await waitForElement("div.Customer-Name-Value").catch(error => console.log(error))
            let returnData = {}
            const date = (new Date).toISOString().split("T")[0].split("-").reverse().join("_");
            returnData.date = date
            const num = data.num;
            returnData.phoneNumber = num || null; checkMessenger(`phoneNumber : ${num}`)
            console.log("elements 2 transferred",elements2); //checkMessenger("ELEMENTS 2 FOUND");
            const fosName = document.querySelector("span.profileName").innerText;
            returnData.fosName = fosName || null ; checkMessenger(`fosName : ${fosName}`)
            const customerName = elements2[0].innerText; 
            returnData.customerName = customerName || null ; checkMessenger(`CUSTOMER NAME : ${customerName}`)
            const customerType = elements2[1].innerText; 
            returnData.customerType = customerType || null ; checkMessenger(`customerType : ${customerType}`);
            returnData.approvalType = "numberSearch" ; checkMessenger(`approvalType : numberSearch`)
            const Aid = document.querySelector(".slds-col.slds-size_1-of-2.Customer-Data-Value");
            if(Aid && Aid.innerText.startsWith("A")){
                console.log("Aid found : ",Aid); 
                returnData.Aid = Aid.innerText || null ; checkMessenger(`Aid : ${Aid.innerText}`)
            }else{console.log("Aid not found"); checkMessenger("aid not found");}
            if(Number(data.num) == Number(customerName)){
                console.log("this is fresh login"); //checkMessenger("this is fresh login");
                returnData.loginType = "freshLogin"; checkMessenger(`loginType : freshLogin`);
                console.log("fresh login returns data : ",returnData);
                checkApprovalListener(Aid.innerText);
                // resolve(returnData);
            }else{
                // work pending ( get bid and add it here)
                const opportunities = await getOpportunities().catch(error => console.log(error));
                if(opportunities && opportunities.length > 0){
                    const result = await checkAid(returnData.Aid);
                    if(result.status === "oldAid"){
                        const AidSection = result.data[returnData.Aid];
                        const oldOpportunities = AidSection.opportunities;
                        if(oldOpportunities && oldOpportunities.length> 0){
                            opportunities.forEach((opp,index) => {
                                for(oldOpp of oldOpportunities){
                                    if(oldOpp.id === opp.id){
                                        opportunities.splice(index,1);
                                    }
                                }
                            })
                        }
                        const prviousBids = []
                        for(opp of opportunities){
                            const bid = opp.bid;
                            prviousBids.push(bid);
                        }
                        const localData =  await getLocalData("previousBids");
                        if(localData && localData[date]){
                            localData[date].push(prviousBids);
                            commitChanges("previousBids",localData)
                        }else{
                            changes = {...localData,[date]: prviousBids}
                            commitChanges("previousBids",changes)
                        }
                    }else if(result.status === "newAid"){
                        const previousBids = []
                        for(opp of opportunities){
                            const bid = opp.bid;
                            previousBids.push(bid);
                        }
                        const localData =await getLocalData("previousBids");
                        if(localData && localData[date]){
                            for(bids of previousBids){
                                localData[date].push(bids);
                            }
                            commitChanges("previousBids",localData)
                        }else{
                            changes = {...localData,[date]: previousBids}
                            commitChanges("previousBids",changes)
                        }
                    }
                }
                if(customerType == "NTB"){
                    //checkMessenger("It is Ntb customer");
                    if(Number(data.num) == Number(customerName)){
                        /*** --- FRESH LOGIN--- ***/ 
                        console.log("this is fresh login");
                        returnData.loginType = "freshLogin"; checkMessenger(`loginType : freshLogin`);
                        console.log("fresh login returns data : ",returnData);
                        checkApprovalListener(Aid.innerText);
                        // resolve(returnData);
                    }else{
                        /*** --- NTB-REAPPRAISAL --- ***/
                        console.log("this is not fresh login"); //checkMessenger("this is not fresh login");
                        returnData.loginType = "reappraisal"; checkMessenger(`loginType : reappraisal`)
                        const approval = await checkApprovalData();
                        if(approval){
                            console.log("approval status = ",approval)
                            if(approval.status === "allNotApproved"){
                                returnData.approvalStatus = "allNotApproved"
                                const result = await checkRejectReasons(10000).catch(error => {
                                    console.log("reject reason not appeared", error);
                                })
                                if(result){
                                    console.log("REJECT DATA",result)
                                    if(result.status === true){
                                        returnData.rcuReject = true;
                                        returnData.rcuRejectReason = result[result.container]
                                    }else if(result.status === false){
                                        returnData.rcuReject = false
                                        returnData.otherReject = result.digital ?? result.cd
                                    }
                                }
                            }else if(approval.status === "someNotApproved"){
                                console.log("approval.a1",Number(approval.a1.trim().toLowerCase()));
                                console.log("approval.a3",Number(approval.a3.trim().toLowerCase()));
                                returnData.approvalStatus = "someNotApproved"
                                if(approval.a1.trim().toLowerCase() === "not approved" || Number(approval.a1.trim().toLowerCase()) === 0){
                                    returnData.cdReject = true;
                                }else if(approval.a3.trim().toLowerCase() === "not approved"|| Number(approval.a3.trim().toLowerCase()) === 0){
                                    returnData.digitalReject = true;
                                };
                                if(approval.a1.trim().toLowerCase() !== "not approved" && Number(approval.a1.trim().toLowerCase()) > 0){
                                    returnData.cdReject = false;
                                }else if(approval.a3.trim().toLowerCase() !== "not approved" && Number(approval.a3.trim().toLowerCase()) > 0){
                                    returnData.digitalReject = false;
                                };
                                const result = await checkRejectReasons(10000).catch(error => {
                                    console.log("reject reason not appeared", error);
                                })
                                if(result){
                                    console.log("reject reasons are = ",result)
                                    if(result.digital.toLowerCase().includes("phone lock")){
                                        returnData.phoneLocking = result.digital;
                                    }else if(returnData.cdReject === true){
                                        returnData.cdRejectReason = result.cd; 
                                    }else if(returnData.digitalReject === true){
                                        returnData.digitalRejectReason = result.digital;
                                    }
                                    console.log("sending reject reasons = ",returnData)
                                }
                            }else if(approval.status === "allApproved"){
                                returnData.approvalStatus = "allApproved";
                            }
                        }
                    }
                }else if(customerType == "ETB"){
                    // checkMessenger("It is ETB customer")
                    if(elements2.length > 2){
                        /*** --- ETB-CARD --- ***/
                        console.log("it is card customer"); checkMessenger("it is card customer")
                        returnData.loginType = "cardCustomer"; checkMessenger(`loginType : cardCustomer`)
                        const isActive = elements2[2].innerText;
                        returnData.isActive = isActive || null;
                        checkMessenger(`isActive : ${isActive}`)
                    }else{
                        /*** --- ETB-REAPPRAISAL --- ***/
                        returnData.loginType = "etbReappraisal"; checkMessenger(`loginType : etbReappraisal`)
                        console.log("it is not card customer"); checkMessenger("it is NOT CARD customer");
                    }
                }
            }
            resolve(returnData);
        }
    })
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
                console.log("numInput found",elements[0]);console.log("searchBtn found",searchBtn);//checkMessenger("numInput found")
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
                                // alert("phone number submitted");
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
async function checkCustomerBlocked(Aid){
    if (!checkCustomerBlocked.proceedBtnListener){
        checkCustomerBlocked.proceedBtnListener = async () => {
            console.log("Aid is ",Aid)
            checkMessenger("proceed button clicked",1,3000);
            const waitForBlock = await waitForError("div.toastContainer","customer is blocked",5000);
            if(waitForBlock){
                messageToBackground("inform",{
                    message: "Customer is Blocked, Cannot Create Opportunity",
                    Aid: Aid
                });
            }else{
                console.log("customer not blocked"); checkMessenger("customer not blocked");
                getCustomerData2();
            }
        }
    }
    if(!checkCustomerBlocked.generateSchemeListener){
        checkCustomerBlocked.generateSchemeListener = async () => {
            console.log("button clicked");
            checkMessenger("generateScheme button clicked",1,3000);
            const proceedBtn = await waitForElement("div.slds-float_right button.proceedBtn",10000).catch(error => console.log(error))
            if(proceedBtn && proceedBtn.length > 0){
                checkMessenger("proceed button found",1,3000);
                console.log("proceedBtn found",proceedBtn)
                proceedBtn[0].removeEventListener("click",checkCustomerBlocked.proceedBtnListener)
                proceedBtn[0].addEventListener("click",checkCustomerBlocked.proceedBtnListener)
            }
        }
    }
    const generateScheme = document.querySelector("div.generateBtn button");
    if(generateScheme){
        checkMessenger("generateScheme button found",1,3000);
        // console.log("button found",generateScheme)
        generateScheme.removeEventListener("click",checkCustomerBlocked.generateSchemeListener);
        generateScheme.addEventListener("click",checkCustomerBlocked.generateSchemeListener);
    }
}
async function searchCustomer(){
    // checkMessenger("you are good to go")
    const numInput = await waitForElement(".mobileNumber.slds-form-element div.slds-form-element__control.slds-grow input.slds-input",10000).catch(error => console.log(error))
    const resolveData = await grabNumber();
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
            
            // checkMessenger(`Data sent to background : ${data.mobileNumber}`)
        }
        // else{
        //     messageToBackground("loginData",returnData); console.log("Data sent to background : ",returnData)
        //     checkCustomerBlocked(returnData.Aid);
        // }
        const returnData = await getData2(resolveData);
        if(returnData){
            // checkMessenger(`searchCustomer || ${num}`);
            console.log("searchCustomer | returnData => ",returnData);
            messageToBackground("loginData",returnData)
            console.log("Data sent to background : ",returnData)
            checkCustomerBlocked(returnData.Aid);
            // if(permissions.qrScans === true){
            
            // }else{
            //     checkMessenger("Qr Scan Permission Declined",10,3000)
            //     messageToBackground("loginData",returnData); 
            //     console.log("Data sent to background : ",returnData)
            //     checkCustomerBlocked(returnData.Aid);
            // }
            
        }
    }
}

async function captureScreenshot(){
    async function logoutPage(){
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
        const elements = await waitForElement("div.logoutbutton button.logout-button",10000).catch(error => {
            console.error(error);
            messageToBackground("closeTab",{tab: "qrTab"});
        })
        if(elements && elements.length > 0){
            elements[0].scrollIntoView({behavior: "smooth", block: "center"});
            await sleep(200);
            elements[0].click();
            await sleep(200);
            messageToBackground("closeTab","justclose");
            const buttons = await waitForElement("div.logout-modal__body__cta.flex button",10000).catch(error => console.log(error))
            if(buttons && buttons.length > 0){
                for(let button of buttons){
                    if(button.innerText.toLowerCase() === "sign out"){
                        console.log("sign out buton found",button);
                        button.click();
                        // await sleep(500);
                        
                    }else{console.log("sign out button not found");}
                }
            }
        }
    }
    if(permissions.screenshot === true){
        await sleep(2000);
        messageToBackground("command","captureScreenshot");
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
        logoutPage();
        
    }else{
        window.scrollTo({
            top: document.body.scrollHeight,
            behavior: 'smooth'
        });
        logoutPage();
        console.log("screenshot permission not granted");
        checkMessenger("screenshot permission declined",10,3000);
        
    }
}
// duplicateScreenshots = false
// async function initiateQrOtp3(num){
//     const formDiv = document.querySelector("div.login-container.flex-row-center")
//     if(formDiv){
//         console.log(formDiv.children);
//         console.log("form div found",formDiv); 
//         // checkMessenger("form div found");
//         const form = formDiv.querySelector("form");
//         if(form){
//             console.log("form found",form); 
//             // checkMessenger("form found");
//             console.log(form.children)
//             await sleep(500);
//             form.children[1].value = num
//             await sleep(200);
//             form.children[3].children[0].click()
//             await sleep(200);
//             form.children[5].click();
//             waitForElementWithText("div.tnc__error-message","please accept",2000).then(async (element) => {
//                 form.children[3].children[0].click();
//                 await sleep(200);
//                 form.children[5].click();
//             }).catch(error => console.log("element not found",error))
//             const elements = await waitForElement("div.dialog-container",10000).catch(error => {
//                 console.log(error);
//                 checkMessenger("modal content not found")
//             })
//             if(elements && elements.length > 0){
//                 console.log("modal content found",elements);
//                 // checkMessenger("modal content found");
//                 const button = elements[0].querySelector("button.onb-btn-orange");
//                 if(button){
//                     console.log("button found = ",button);
//                     //  checkMessenger("button found");
//                     if(!initiateQrOtp3.submit){
//                         initiateQrOtp3.submit = async () => {
//                             if(duplicateScreenshots === true){
//                                 checkMessenger("duplicate screenshot prevented",10);
//                                 console.log("duplicate screenshot prevented");
//                                 return
//                             }
//                             duplicateScreenshots = true
//                             messageToBackground("reminder",{
//                                 tag:"initiateQragain",
//                                 phone:num
//                             })
//                             console.log("button clicked");
//                             // checkMessenger("button clicked");
//                             const status = await getDomStatus()
//                             function checkboxSubmitScreenshot(call){
//                                 checkMessenger(`function running | checkboxSubmitScreenshot => ${call}`);
//                                 console.log(`function running  ============> checkboxSubmitScreenshot => ${call}`);
//                                 waitForElementWithText("h2.consent-login-modal__heading.fs-18.flex-jc-center.mb-16","consent",3000).then(element => {
//                                     if(element){
//                                         checkMessenger("consent element found",10,3000);
//                                         const checkBoxes = document.querySelectorAll("div.modal__content.consent-login-modal.flex-column-center input[type='checkbox']");
//                                         if(checkBoxes && checkBoxes.length > 0){
//                                             checkMessenger("checkboxes found",1,3000);
//                                             checkBoxes.forEach((checkBox) => {
//                                                 checkBox.click();
//                                             })
//                                             const buttons = document.querySelectorAll("button.btn.btn--primary-invert");
//                                             if(buttons && buttons.length > 0){
//                                                 buttons.forEach(button => {
//                                                     // if(checkBoxes.length === 1){
//                                                     //     if(button.innerText.toLowerCase().includes("skip")){
//                                                     //         console.log("skip button found"); checkMessenger("skip button found");
//                                                     //         button.click();
//                                                     //     }else{
//                                                     //         console.log("button not found");
//                                                     //         checkMessenger("consent button not found")
//                                                     //     }
//                                                     // }else{
//                                                         if(button.innerText.toLowerCase().includes("give consent")){
//                                                             console.log("consent button found"); checkMessenger("consent button found");
//                                                             button.click();
//                                                         }else if(button.innerText.toLowerCase().includes("continue")){
//                                                             console.log("continue button found"); checkMessenger("continue button found");
//                                                             button.click();
//                                                         }else{
//                                                             console.log("button not found");
//                                                             checkMessenger("consent button not found")
//                                                         }
//                                                     // }
                                                    
//                                                 })
//                                             }else{
//                                                 checkMessenger("buttons not found",10,3000);
//                                                 console.log("buttons not found");
//                                             }
//                                         }
//                                     }
//                                 })
//                                 waitForElement("div.emi-card",60000).then(async element => {
//                                     checkMessenger("emi card found",1,2000);
//                                     const messengers = document.querySelectorAll("div.contentJS-externalMessenger");
//                                     messengers.forEach(messenger => messenger.remove())
//                                     captureScreenshot();
//                                 }).catch(error => console.log(error))
//                             }
//                             if(status === "loading"){
//                                 console.log("page is loading");
//                                 // checkMessenger("page is loading");
//                                 document.addEventListener('DOMContentLoaded',async () => {
//                                     checkboxSubmitScreenshot("call from loading");
//                                 },{once:true})
//                             }else if(status === "loaded"){
//                                 console.log("page is loaded");checkMessenger("page is loaded call after loading");
//                                 checkboxSubmitScreenshot("call from loaded");
//                             }
//                         }
//                     }
//                     button.removeEventListener("click",initiateQrOtp3.submit);
//                     button.addEventListener("click",initiateQrOtp3.submit);
//                 }else{
//                     console.log("button not found");checkMessenger("button not found");
//                 }
//             }
                
//         }else{
//             console.log("form not found"); checkMessenger("form not found");
//         }
//     }else{console.log("form div not found"); checkMessenger("form div not found")}
    
// }

duplicateScreenshots = false
async function initiateQrOtp4(num){
    const formDiv = document.querySelector("div.login-container.flex-row-center");
    if(formDiv){
        console.log(formDiv.children);
        console.log("form div found",formDiv); 
        // checkMessenger("form div found");
        const form = formDiv.querySelector("form");
        if(form){
            console.log("form found",form); 
            // checkMessenger("form found");
            console.log(form.children)
            await sleep(100);
            form.children[0].children[0].value = num
            await sleep(100);
            // form.children[3].children[0].click()
            // await sleep(100);
            form.children[3].click();
            waitForElementWithText("div.tnc__error-message","please accept",2000).then(async (element) => {
                form.children[3].children[0].click();
                await sleep(200);
                form.children[5].click();
            }).catch(error => console.log("element not found",error));
            waitForElementWithText("h2.consent-login-modal__heading.fs-18.flex-jc-center.mb-16","consent",3000).then(element => {
                if(element){
                    checkMessenger("consent element found",10,3000);
                    const checkBoxes = document.querySelectorAll("div.modal__content.consent-login-modal.flex-column-center input[type='checkbox']");
                    if(checkBoxes && checkBoxes.length > 0){
                        checkMessenger("checkboxes found",1,3000);
                        checkBoxes.forEach((checkBox) => {
                            checkBox.click();
                        })
                        const buttons = document.querySelectorAll("button.btn.btn--primary-invert");
                        if(buttons && buttons.length > 0){
                            buttons.forEach(button => {
                                if(button.innerText.toLowerCase().includes("give consent")){
                                    console.log("consent button found"); checkMessenger("consent button found");
                                    button.click();
                                }else if(button.innerText.toLowerCase().includes("continue")){
                                    console.log("continue button found"); checkMessenger("continue button found");
                                    button.click();
                                }else{
                                    console.log("button not found");
                                    checkMessenger("consent button not found")
                                }
                            })
                        }else{
                            checkMessenger("buttons not found",10,3000);
                            console.log("buttons not found");
                        }
                    }
                }
            })
            waitForElement("div.emi-card",120000).then(async element => {
                checkMessenger("emi card found",1,2000);
                const messengers = document.querySelectorAll("div.contentJS-externalMessenger");
                messengers.forEach(messenger => messenger.remove())
                if(duplicateScreenshots === true){
                    // checkMessenger("duplicate screenshot prevented",10);
                    console.log("duplicate screenshot prevented");
                    return
                }else{
                    duplicateScreenshots = true
                    captureScreenshot();
                }
            }).catch(error => console.log(error))
        }
    }
}
async function initiateQrOtp3(num){
    const formDiv = document.querySelector("div.login-container.flex-row-center")
    if(formDiv){
        console.log(formDiv.children);
        console.log("form div found",formDiv); 
        // checkMessenger("form div found");
        const form = formDiv.querySelector("form");
        if(form){
            console.log("form found",form); 
            // checkMessenger("form found");
            console.log(form.children)
            await sleep(500);
            form.children[1].value = num
            await sleep(200);
            form.children[3].children[0].click()
            await sleep(200);
            form.children[5].click();
            waitForElementWithText("div.tnc__error-message","please accept",2000).then(async (element) => {
                form.children[3].children[0].click();
                await sleep(200);
                form.children[5].click();
            }).catch(error => console.log("element not found",error))
            const elements = await waitForElement("div.dialog-container",10000).catch(error => {
                console.log(error);
                checkMessenger("modal content not found");
            })
            if(elements && elements.length > 0){
                console.log("modal content found",elements);
                // checkMessenger("modal content found");
                const button = elements[0].querySelector("button.onb-btn-orange");
                if(button){
                    console.log("button found = ",button);
                    //  checkMessenger("button found");
                    if(!initiateQrOtp3.submit){
                        initiateQrOtp3.submit = async () => {
                            if(duplicateScreenshots === true){
                                checkMessenger("duplicate screenshot prevented",10);
                                console.log("duplicate screenshot prevented");
                                return
                            }
                            duplicateScreenshots = true
                            messageToBackground("reminder",{
                                tag:"initiateQragain",
                                phone:num
                            })
                            console.log("button clicked");
                            // checkMessenger("button clicked");
                            const status = await getDomStatus()
                            function checkboxSubmitScreenshot(call){
                                checkMessenger(`function running | checkboxSubmitScreenshot => ${call}`);
                                console.log(`function running  ============> checkboxSubmitScreenshot => ${call}`);
                                waitForElementWithText("h2.consent-login-modal__heading.fs-18.flex-jc-center.mb-16","consent",3000).then(element => {
                                    if(element){
                                        checkMessenger("consent element found",10,3000);
                                        const checkBoxes = document.querySelectorAll("div.modal__content.consent-login-modal.flex-column-center input[type='checkbox']");
                                        if(checkBoxes && checkBoxes.length > 0){
                                            checkMessenger("checkboxes found",1,3000);
                                            checkBoxes.forEach((checkBox) => {
                                                checkBox.click();
                                            })
                                            const buttons = document.querySelectorAll("button.btn.btn--primary-invert");
                                            if(buttons && buttons.length > 0){
                                                buttons.forEach(button => {
                                                    if(button.innerText.toLowerCase().includes("give consent")){
                                                        console.log("consent button found"); checkMessenger("consent button found");
                                                        button.click();
                                                    }else if(button.innerText.toLowerCase().includes("continue")){
                                                        console.log("continue button found"); checkMessenger("continue button found");
                                                        button.click();
                                                    }else{
                                                        console.log("button not found");
                                                        checkMessenger("consent button not found")
                                                    }
                                                })
                                            }else{
                                                checkMessenger("buttons not found",10,3000);
                                                console.log("buttons not found");
                                            }
                                        }
                                    }
                                })
                                waitForElement("div.emi-card",60000).then(async element => {
                                    checkMessenger("emi card found",1,2000);
                                    const messengers = document.querySelectorAll("div.contentJS-externalMessenger");
                                    messengers.forEach(messenger => messenger.remove())
                                    captureScreenshot();
                                }).catch(error => console.log(error))
                            }
                            if(status === "loading"){
                                console.log("page is loading");
                                // checkMessenger("page is loading");
                                document.addEventListener('DOMContentLoaded',async () => {
                                    checkboxSubmitScreenshot("call from loading");
                                },{once:true})
                            }else if(status === "loaded"){
                                console.log("page is loaded");
                                checkMessenger("page is loaded call after loading");
                                checkboxSubmitScreenshot("call from loaded");
                            }
                        }
                    }
                    button.removeEventListener("click",initiateQrOtp3.submit);
                    button.addEventListener("click",initiateQrOtp3.submit);
                }else{
                    console.log("button not found");checkMessenger("button not found");
                }
            }
                
        }else{
            console.log("form not found"); checkMessenger("form not found");
        }
    }else{console.log("form div not found"); checkMessenger("form div not found")}
    
}
function initiateQrOtp(num){
    getDomStatus().then(status => {
        if(status === "loaded"){
            sleep(500).then(()=> {
                initiateQrOtp4(num)
            })
        }else if(status === "loading")[
            document.addEventListener("DOMContentLoaded",()=>{
                sleep(500).then(()=> {
                    initiateQrOtp4(num)
                })
            },{once:true})
        ]
    })
}
function removeGyde(){
    getDomStatus().then(state => {
        if(state === "loaded"){
            const div = document.querySelector("div#gyImage");
            if(div){
                div.remove()
            }else{console.log("gyde not found"); /***checkMessenger("gyde not found");***/}
        }else if(state === "loading"){
            document.addEventListener("DOMContentLoaded", () => {
                const div = document.querySelector("div#gyImage");
                if(div){
                    div.remove()
                }else{console.log("gyde not found"); 
                    // checkMessenger("gyde not found");
                }
            },{once: true})
        }
    })
    
}
  
function findElement(){
    const qrs = document.querySelectorAll("table.cdLinesTable tbody tr")
    if(qrs && qrs.length > 0){
        console.log("qr found : ",qrs); checkMessenger("qr found");
        const c1 = qrs[0].children[1].innerText.trim().toLowerCase()
        const c2 = qrs[0].children[1].innerText.trim().toLowerCase()
        const c3 = qrs[0].children[1].innerText.trim().toLowerCase()
        console.log("c = ",c1," --- ",c2," --- ",c3)
        checkMessenger(c1); checkMessenger(c2); checkMessenger(c3)
        if(c1 === "not approved" && c2 === "not approved" && c3 === "not approved"){
            console.log("all are not approved");
        }else{  
            console.log("some are not approved");
        }

    }else{
        console.log("qr not found"); checkMessenger("qr not found");
    }
}
function messageToExternalScripts(action, text) {
    chrome.runtime.sendMessage(
      { action: action, svg: text, to: "qrDecoder" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("Error:", chrome.runtime.lastError.message);
          checkMessenger(`error occured`)
          return;
        }
  
        console.log("message sent to external script");
        console.log("response is ", response);
        if (response) {
          console.log("reponse recieved : ", response); checkMessenger(`Response recieved`)
        }
      }
    );
  }
function displayCanvas(){
    const iframe = document.createElement("iframe");
    iframe.src = chrome.runtime.getURL("qr_decoder.html");
    // iframe.style.display = "none"
    document.body.appendChild(iframe)
    checkMessenger("display canvas");
    iframe.addEventListener("load", () => {
        console.log("iframe loaded"); checkMessenger("iframe loaded");
        setTimeout( () => {
            messageToExternalScripts("abcd", "PLEASE");
        },2000)
    })
    setTimeout(()=> {
        iframe.remove();
        checkMessenger("canvas removed")
    },10000)
    
};
function checkPhoneNumber(data,Aid,customerName){
    return new Promise ((resolve,reject) => {
        const phoneNumber = data[Aid].phoneNumber
        const oldCustomerName = data[Aid].customerName
        if(phoneNumber == oldCustomerName && oldCustomerName == customerName){
            console.log("Nothing changed"); checkMessenger("Nothing changed")
            reject("nothingChanged")
        }else{
            console.log("something changed"); checkMessenger("something changed")
            resolve("somethingChanged")
        }
    })
}

function date_dd_mm_yyyy(string){
    date = new Date(string);
    day = date.getDate().toString().padStart(2,0)
    month = (date.getMonth() + 1).toString().padStart(2,0);
    year = date.getFullYear()
    newDate = day + "_" + month + "_" + year
    // console.log(newDate);
    if(newDate.length === 10){
        return newDate;
    }
    
}
async function checkPreviousBid(bid){
    console.log("checking previous bid")
    const previousBids = await getLocalData("previousBids");
    return new Promise((resolve,reject) => {
        if(previousBids){
            let found = false;
            for (date in previousBids){
                for(oldBid of previousBids[date]){
                    if(bid === oldBid){
                        found = true
                        resolve("previous");
                        break;
                    }
                }
                if(found) break;
            }
            resolve("notPrevious")
        }else{
            resolve("notPrevious")
        }
    })
}
async function addBidData(tr,bid){
    
    let bidContainer = {};
    const bidDate = date_dd_mm_yyyy(tr.children[1].innerText);
    const productName = tr.children[2].innerText;
    const bidStage = tr.children[3].innerText;
    const invoiceAmount = tr.children[4].children[1].innerText.match(/\d+/);
    const atosAuthorization = document.querySelectorAll("c-atos-authorization-revamp .table-body");
    console.log("bid is ",bid)
    const bidCheck = await checkPreviousBid(bid)
    return new Promise((resolve,reject) => {
        if(bidCheck === "previous"){
            reject(new Error("bid is in Previous bid"))
        }else if(bidStage == "DI Completed"){
            console.warn(`skipping bid addition (${bid})--- stage is (${bidStage})`);
        }else if ( bidCheck === "notPrevious" ){
            bidContainer.bid = bid;
            bidContainer.bidDate = bidDate? bidDate: null;
            bidContainer.productName = productName? productName: null;
            bidContainer.bidStage = bidStage? bidStage: null;
            bidContainer.invoiceAmount = invoiceAmount? Number(invoiceAmount[0]) : null ;
            if(atosAuthorization && atosAuthorization.length > 0){
                console.log("atosAuthorization : ",atosAuthorization)
                console.log(atosAuthorization[0].children)
                for(trs of atosAuthorization[0].children){
                    console.log("tr is : ",trs?.innerText)
                    const authBid = trs?.children[1].innerText
                    if(authBid === bid){
                        const authStatus = trs.children[6].innerText
                        const authMessage = trs.children[7].innerText
                        bidContainer.authStatus = authStatus? authStatus : null ;
                        bidContainer.authMessage = authMessage? authMessage : null ;
                    }
                }
            }else{ 
                console.log("atosAuthorization not found")
            }
            
            
            resolve(bidContainer);
        }
    })
    
}
async function sendError(aid,target){
    const error = await waitForError("div.toastContent div.slds-hyphenate","eligibility reason",3000,"element");
    if(error){
        // console.log("error found ",error);
        // alert(`error is ${error}`);
        messageToBackground("inform",{
            message: "Eligibility",
            Aid: aid,
            assetType:target,
            eligibilityReason:error
        });
    }

}
async function getNOReason(Aid){
    const yesORno = document.querySelectorAll("div.cdLinesDiv table.cdLinesTable text.eligibiltyResponse");
    if(yesORno && yesORno.length > 0){
        console.log("yes or no found ",yesORno);
        const cd = yesORno[0].innerHTML;
        const cdEl = yesORno[0]
        const digital = yesORno[1].innerHTML;
        const digitalEl = yesORno[1]
        if(cd.toLowerCase() === "no" || digital.toLowerCase() === "no"){
            const trs = document.querySelectorAll("div.cdLinesDiv table.cdLinesTable tbody tr");
            const tds = trs[3].children;
            if(cd.toLowerCase() === "no"){
                const clickHere = tds[1]
                if(clickHere){
                    // alert("click here")
                    clickHere.children[0].style.backgroundColor = "bisque"
                    clickHere.children[0].style.borderRadius = "10%"
                    clickHere.addEventListener("click",() => {
                        // alert("you clicked something");
                        sendError(Aid,"cd")
                    })
                }
            }
            if(digital.toLowerCase() === "no"){
                const clickHere = tds[2]
                if(clickHere){
                    // alert("click here")
                    clickHere.children[0].style.backgroundColor = "bisque"
                    clickHere.children[0].style.borderRadius = "10%"
                    clickHere.addEventListener("click",() => {
                        // alert("you clicked something");
                        sendError(Aid,"cdd");
                    })
                }
            }
        }else if(cd.toLowerCase() === "yes" || digital.toLowerCase() === "yes"){
            const trs = document.querySelectorAll("div.cdLinesDiv table.cdLinesTable tbody tr");
            const tds = trs[3].children;
            if(cd.toLowerCase() === "yes" && cdEl.previousSibling.classList.contains("yellowDiv")){
                const clickHere = tds[1]
                if(clickHere){
                    // alert("click here")
                    clickHere.children[0].style.backgroundColor = "bisque"
                    clickHere.children[0].style.borderRadius = "10%"
                    clickHere.addEventListener("click",() => {
                        // alert("you clicked something");
                        sendError(Aid,"cd")
                    })
                }
            }
            if(digital.toLowerCase() === "yes" && digitalEl.previousSibling.classList.contains("yellowDiv")){
                const clickHere = tds[2]
                if(clickHere){
                    // alert("click here")
                    clickHere.children[0].style.backgroundColor = "bisque"
                    clickHere.children[0].style.borderRadius = "10%"
                    clickHere.addEventListener("click",() => {
                        // alert("you clicked something");
                        sendError(Aid,"cdd");
                    })
                }
            }
        }
        
    }
}
async function getETB_CardData(Aid,element){
    return new Promise (async(resolve,reject) => {
        getNOReason(Aid);
        const etbCardData = {
            Aid : Aid
        }

        etbCardData.customerName = element[0].innerText;
        etbCardData.approvalType = "pageRefresh"
        etbCardData.loginType = "cardCustomer"
        etbCardData.customerType = element[1].innerText;
        etbCardData.isActive = element[2].innerText;
        const balanceLimitEl = document.querySelectorAll("div.Heading.slds-col.slds-large-size_1-of-4.slds-max-small-size_1-of-1.Opportunity-Data");
        let balanceLimit = null
        if(balanceLimitEl && balanceLimitEl.length > 0){
            for (el of balanceLimitEl){
                console.log(" el is ",el)
                if(el.innerText.toLowerCase().trim().includes("card status")){
                    const targetEl = el.querySelectorAll(".slds-grid ");
                    for(El of targetEl){
                        if(El.innerText.trim().toLowerCase().includes("balance card limit")){
                            console.log("found balance card limit", El.children[1].innerText);
                            balanceLimit = El.children[1].innerText;
                        }
                    }
                }
            }
        }else{
            console.log("balanceLimitEl not found")
        }
        etbCardData.balanceLimit = balanceLimit? Number(balanceLimit) : null;
        let opportunities = [];
        const assetCart = await waitForElement("table.assertCart tbody tr",15000).catch(error => {
            //work here etb card data is resolving with undefined but logging properly.
            console.log("etbCard data is ",etbCardData);
            resolve(etbCardData);
        })
        if(assetCart && assetCart.length > 0){
            console.log("Assert Cart",assetCart)
            let loopIndex = 0
            for (tr of assetCart){
                console.log("in a loop",tr)
                const bid = tr.children[0].innerText;
                if(bid){
                    const bidContainer = await addBidData(tr,bid).catch(error => {console.log(error)})
                    console.log("bid container is ",bidContainer)
                    opportunities.push(bidContainer);
                    etbCardData.opportunities = opportunities;
                }else{
                    reject(new Error("bid not found"))
                }
                loopIndex = loopIndex + 1
            }
            const interval = setInterval(()=> {
                console.log("loop : ",loopIndex," | ",assetCart.length);checkMessenger(`loop : ${loopIndex} | ${assetCart.length}`)
                if(loopIndex === assetCart.length){
                    clearInterval(interval);
                    console.log("etbCardData is => ",etbCardData)
                    resolve(etbCardData)
                }else{
                    console.log("waiting for loop");
                }
            },100)
            
        }else{
            // reject(new Error("bid not found"))
            console.log("asset cart is empty")
        }
    })
    
}
function getETB_CardData1(Aid,element){
    return new Promise((resolve,reject) => {
        let resolved = false
        let waitToResolve = false
        const etbCardData = {
            Aid : Aid
        }
        etbCardData.customerName = element[0].innerText;
        etbCardData.approvalType = "pageRefresh"
        etbCardData.loginType = "cardCustomer"
        etbCardData.customerType = element[1].innerText;
        etbCardData.isActive = element[2].innerText;
        const balanceLimitEl = document.querySelectorAll("div.Heading.slds-col.slds-large-size_1-of-4.slds-max-small-size_1-of-1.Opportunity-Data");
        let balanceLimit = null
        if(balanceLimitEl && balanceLimitEl.length > 0){
            for (el of balanceLimitEl){
                console.log(" el is ",el)
                if(el.innerText.toLowerCase().trim().includes("card status")){
                    const targetEl = el.querySelectorAll(".slds-grid ");
                    for(El of targetEl){
                        if(El.innerText.trim().toLowerCase().includes("balance card limit")){
                            console.log("found balance card limit", El.children[1].innerText);
                            balanceLimit = El.children[1].innerText;
                        }
                    }
                }
            }
        }
        etbCardData.balanceLimit = balanceLimit? Number(balanceLimit) : null;
        let opportunities = [];
        waitToResolve = true;
        waitForElement("table.assertCart tbody tr",15000).catch(error => {
            resolve(etbCardData)
            console.log("etbCard data is ",etbCardData)
        }).then(assetCart => {
            
            const atosAuthorization = document.querySelectorAll("c-atos-authorization-revamp .table-body");
            if(assetCart && assetCart.length > 0){
                console.log("Assert Cart",assetCart)
                for (tr of assetCart){
                    console.log("in a loop",tr)
                    let bidContainer = {};
                    const bid = tr.children[0].innerText;
                    if(bid){
                        waitToResolve = true;
                        const bidDate = date_dd_mm_yyyy(tr.children[1].innerText);
                        const productName = tr.children[2].innerText;
                        const bidStage = tr.children[3].innerText;
                        const invoiceAmount = tr.children[4].children[1].innerText.match(/\d+/);
                        console.log("bid is ",bid)
                        checkPreviousBid(bid).then(check => {
                            console.log("check is : ",check)
                            if(check === "previous"){
                                reject(new Error("bid is in Previous bid"))
                            }else if ( check === "notPrevious" ){
                                bidContainer.bid = bid;
                                bidContainer.bidDate = bidDate? bidDate: null;
                                bidContainer.productName = productName? productName: null;
                                bidContainer.bidStage = bidStage? bidStage: null;
                                bidContainer.invoiceAmount = invoiceAmount? Number(invoiceAmount[0]) : null ;
                                if(atosAuthorization && atosAuthorization.length > 0){
                                    console.log("atosAuthorization : ",atosAuthorization)
                                    console.log(atosAuthorization[0].children)
                                    for(tr of atosAuthorization[0].children){
                                        console.log("tr is : ",tr?.innerText)
                                        const authBid = tr?.children[1].innerText
                                        if(authBid == bid){
                                            const authStatus = tr.children[6].innerText
                                            bidContainer.authStatus = authStatus? authStatus : null ;
                                            const authMessage = tr.children[7].innerText
                                            bidContainer.authMessage = authMessage? authMessage : null ;
                                        }
                                    }
                                }else{ 
                                    console.log("atosAuthorization not found")
                                }
                                console.log("bid container is ",bidContainer)
                                opportunities.push(bidContainer);
                                etbCardData.opportunities = opportunities;
                                waitToResolve = false
                                resolve(etbCardData);
                            }
                            
                        })
                        
                    }else{
                        reject(new Error("bid not found"))
                        waitToResolve = false
                    }
                }
                // resolve(etbCardData);
            }else{
                reject(new Error("bid not found"))
            }
        })
        // .then(nothing => {
        //     // resolve(etbCardData);
        //     const time = Date.now()
        //     const timer = time + 5000
        //     const interval = setInterval(()=> {
        //         if(Date.now() < timer){
        //             console.log("wait is : ",waitToResolve)
        //             if(waitToResolve === false){
        //                 clearInterval(interval);
        //                 console.log("etbCardData = resolved",etbCardData);
        //                 resolve(etbCardData);
        //             }else if(waitToResolve === true){
        //                 console.log("waiting to resolve");
        //             }
        //         }else{
        //             console.log("waiting timedout , resolved")
        //             console.log("etbCard data is ",etbCardData)
        //             clearInterval(interval);
        //             resolve(etbCardData);
        //         }
        //     },100)
        // })
    })
}
function getAssetType(Aid,data){
    let assetType = null
    return new Promise((resolve,reject) => {
        console.log("getting assetType from this", data);
        const AidSection = data[Aid];
        console.log("Aid section = ",AidSection);
        if(AidSection.opportunities){
            for(bid of AidSection.opportunities){
                console.log("Customer Bid's",bid);
                console.log("existing productname",bid.productName);
            }
        }else{
            console.log("opportunities not found");
        }
    })
    
}
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
async function getReappraisalData2(Aid,element,data){
    return new Promise (async (resolve, reject) => {
        let wait = false
        const reappraisalData = {
            Aid : Aid
        }
        reappraisalData.customerName = element[0].innerText;
        reappraisalData.approvalType = "pageRefresh"
        reappraisalData.loginType = "reappraisal"
        reappraisalData.customerType = element[1].innerText;
        reappraisalData.cibil = getCibil();
        let opportunities = [];
        const assetCart = await waitForElement("table.assertCart tbody tr",5000).catch(error => {console.log("assertcart not found",error)})
        if(assetCart && assetCart.length > 0){
            console.log("asset cart is ",assetCart); checkMessenger("asset data found");
            for (let tr of assetCart){
                let bidContainer = {}
                const bid = tr.children[0].innerText;
                if(bid){
                    wait = true
                    const bidDate = date_dd_mm_yyyy(tr.children[1].innerText);
                    const productName = tr.children[2].innerText;
                    const bidStage = tr.children[3].innerText;
                    const invoiceAmount = tr.children[4].children[1].innerText.match(/\d+/);
                    const check = await checkPreviousBid(bid);
                    if(check){
                        if(check === "previous"){
                            reject(new Error("bid is in previous"))
                            wait = false
                        }else if(check === "notPrevious"){
                            bidContainer.bid = bid;
                            bidContainer.bidDate = bidDate? bidDate: null;
                            bidContainer.productName = productName? productName: null;
                            bidContainer.bidStage = bidStage? bidStage: null;
                            bidContainer.invoiceAmount = invoiceAmount? Number(invoiceAmount[0]) : null ;
                            opportunities.push(bidContainer);
                            reappraisalData.opportunities = opportunities;
                            console.log("opportunities added => ",bidContainer)
                            wait = false
                        }
                    }
                }else{
                    reject(new Error("bid not found"))
                }
            }
            messageToBackground("loginData",reappraisalData);
        }
        const status = await waitForDomLoading(10000)
        if(status){
            console.log("dom status is : ",status)
            const approval = await checkApprovalData();
            if(approval){
                console.log("approval status = ",approval)
                if(approval.status === "allNotApproved"){
                    wait = true
                    reappraisalData.approvalStatus = "allNotApproved"
                    const result = await checkRejectReasons(10000).catch(error => {
                        console.log("reject reason not appeared", error);
                        wait = false
                    })
                    if(result){
                        console.log("REJECT DATA",result)
                        if(result.status === true){
                            reappraisalData.rcuReject = true;
                            reappraisalData.rcuRejectReason = result[result.container]
                        }else if(result.status === false){
                            reappraisalData.rcuReject = false
                            reappraisalData.otherReject = result.digital ?? result.cd
                        }
                        wait = false
                        messageToBackground("loginData",reappraisalData);
                    }
                }else if(approval.status === "someNotApproved"){
                    console.log("approval.a1",Number(approval.a1.trim().toLowerCase()));
                    console.log("approval.a3",Number(approval.a3.trim().toLowerCase()));
                    reappraisalData.approvalStatus = "someNotApproved"
                    if(approval.a1.trim().toLowerCase() === "not approved" || Number(approval.a1.trim().toLowerCase()) === 0){
                        reappraisalData.cdReject = true;
                    }else if(approval.a3.trim().toLowerCase() === "not approved"|| Number(approval.a3.trim().toLowerCase()) === 0){
                        reappraisalData.digitalReject = true;
                    };
                    if(approval.a1.trim().toLowerCase() !== "not approved" && Number(approval.a1.trim().toLowerCase()) > 0){
                        reappraisalData.cdReject = false;
                    }else if(approval.a3.trim().toLowerCase() !== "not approved" && Number(approval.a3.trim().toLowerCase()) > 0){
                        reappraisalData.digitalReject = false;
                    };
                    wait = true
                    const result = await checkRejectReasons(10000).catch(error => {
                        console.log("reject reason not appeared", error);
                        wait = false
                    })
                    if(result){
                        console.log("reject reasons are = ",result)
                        if(result.digital.toLowerCase().includes("phone lock")){
                            reappraisalData.phoneLocking = result.digital;
                        }else if(reappraisalData.cdReject === true){
                            reappraisalData.cdRejectReason = result.cd; 
                        }else if(reappraisalData.digitalReject === true){
                            reappraisalData.digitalRejectReason = result.digital;
                        }
                        wait = false
                        console.log("sending reject reasons = ",reappraisalData)
                        messageToBackground("loginData",reappraisalData);
                    }
                }else if(approval.status === "allApproved"){
                    reappraisalData.approvalStatus = "allApproved";
                }
            }
            const time = Date.now()
            const timer = time + 5000
            const interval = setInterval(()=> {
                if(Date.now() < timer){
                    console.log("wait is : ",wait)
                    if(wait === false){
                        clearInterval(interval);
                        console.log("reappraisalData = resolved",reappraisalData);
                        messageToBackground("loginData",reappraisalData);
                        // resolve(reappraisalData);
                    }else if(wait === true){
                        console.log("waiting to resolve");
                    }
                }else{
                    console.log("waiting timedout , resolved")
                    clearInterval(interval);
                    messageToBackground("loginData",reappraisalData);
                    // resolve(reappraisalData);
                }
                
            },100) 
        }
    })
}
function getReappraisalData(Aid,element,data){
    let wait = false
    return new Promise ((resolve, reject) => {
        const reappraisalData = {
            Aid : Aid
        }
        reappraisalData.customerName = element[0].innerText;
        reappraisalData.approvalType = "pageRefresh"
        reappraisalData.loginType = "reappraisal"
        reappraisalData.customerType = element[1].innerText;
        reappraisalData.cibil = getCibil();
        let opportunities = [];
        waitForElement("table.assertCart tbody tr",5000).then(assetCart => {
            console.log("asset cart is ",assetCart); checkMessenger("asset data found");
            if(assetCart && assetCart.length > 0){
                console.log("assert cart",assetCart);
                for (let tr of assetCart){
                    let bidContainer = {}
                    const bid = tr.children[0].innerText;
                    if(bid){
                        wait = true
                        const bidDate = date_dd_mm_yyyy(tr.children[1].innerText);
                        const productName = tr.children[2].innerText;
                        const bidStage = tr.children[3].innerText;
                        const invoiceAmount = tr.children[4].children[1].innerText.match(/\d+/);
                        checkPreviousBid(bid).then(check => {
                            if(check === "previous"){
                                reject(new Error("bid is in previous"))
                                wait = false
                            }else if(check === "notPrevious"){
                                bidContainer.bid = bid;
                                bidContainer.bidDate = bidDate? bidDate: null;
                                bidContainer.productName = productName? productName: null;
                                bidContainer.bidStage = bidStage? bidStage: null;
                                bidContainer.invoiceAmount = invoiceAmount? Number(invoiceAmount[0]) : null ;
                                opportunities.push(bidContainer);
                                reappraisalData.opportunities = opportunities;
                                console.log("opportunities added => ",bidContainer)
                                wait = false
                            }
                        })
                    }else{
                        reject(new Error("bid not found"))
                    }
                }
            }
        }).catch(error => {console.log(error); checkMessenger("asset data not found")}).then(nothing => {
            waitForDomLoading(10000).then(status => {
                // sleep(3500).then(s=> {
                    // work here (add wait till reject reason element has inner teaxt for 3500)
                    console.log("dom status is : ",status)
                    checkApprovalData().then( approval => {
                        if(approval.status === "allNotApproved"){
                            wait = true
                            reappraisalData.approvalStatus = "allNotApproved"
                            checkRejectReasons(10000).then(result => {
                                console.log("rcuData",result)
                                if(result.status === true){
                                    reappraisalData.rcuReject = true;
                                    reappraisalData.rcuRejectReason = result[result.container]
                                }else if(result.status === false){
                                    reappraisalData.rcuReject = false
                                    reappraisalData.otherReject = result.digital ?? result.cd
                                }
                                wait = false
                            }).catch(error => {
                                console.log("reject reason not appeared", error);
                                wait = false
                            })
                        }else if(approval.status === "someNotApproved"){
                            reappraisalData.approvalStatus = "someNotApproved"
                            if(approval.a1.trim().toLowerCase() === "not approved"){
                                reappraisalData.cdReject = true;
                            }else if(approval.a3.trim().toLowerCase() === "not approved"){
                                reappraisalData.digitalReject = true;
                            };
                            if(approval.a1.trim().toLowerCase() !== "not approved"){
                                reappraisalData.cdReject = false;
                            }else if(approval.a3.trim().toLowerCase() !== "not approved"){
                                reappraisalData.digitalReject = false;
                            };
                            wait = true
                            getRcuData(3000).then(result => {
                                if(reappraisalData.cdReject === true){
                                    reappraisalData.cdRejectReason = result.cd; 
                                }else if(reappraisalData.digitalReject === true){
                                    reappraisalData.digitalRejectReason = result.digital;
                                }
                                wait = false
                            }).catch(error => {wait = false})
                        }else if(approval.status === "allApproved"){
                            reappraisalData.approvalStatus = "allApproved";
                        }
                    }).then(nothing => {
                        const time = Date.now()
                        const timer = time + 5000
                        const interval = setInterval(()=> {
                            if(Date.now() < timer){
                                console.log("wait is : ",wait)
                                if(wait === false){
                                    clearInterval(interval);
                                    console.log("reappraisalData = resolved",reappraisalData);
                                    resolve(reappraisalData);
                                }else if(wait === true){
                                    console.log("waiting to resolve");
                                }
                            }else{
                                console.log("waiting timedout , resolved")
                                clearInterval(interval);
                                resolve(reappraisalData);
                            }
                            
                        },100) 
                        
                    })
                    
                // })
            })
        })
        
    })
}
function waitForError(element,include,timer = 5000,intention = "text"){
    return new Promise(async (resolve,reject) => {
        const time = Date.now();
        const timeout = time + timer;
        const interval = setInterval(async ()=> {
            if(Date.now() < timeout){
                const blockedCustomer = await waitForElement(element,100).catch(error => console.log(error));
                if(blockedCustomer && blockedCustomer.length > 0){
                    // console.log("some errors found",blockedCustomer);
                    // checkMessenger("error found",1,3000);
                    // checkMessenger(blockedCustomer[0].innerText)
                    for(block of blockedCustomer){
                        if(block.innerText.trim().toLowerCase().includes(include)){
                            // console.log("target error found ",block.innerText,block);
                            // checkMessenger("customer is blocked",1,3000);
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
                    console.log("loader still visible"); checkMessenger("loader still visible")
                }else{
                    console.log("loader gone"); checkMessenger("loader gone");
                    clearInterval(interval);
                    resolve("success");
                }
                if(Date.now() < timeout){
                    console.log("check again");
                }else{
                    console.log("timeout loadeer not gone"); clearInterval(interval);
                    reject("failed");
                }
            },100)
        }, wait);
        
    })
}
async function atosAuthListener(){
    console.log("function running  ============> atosAuthListener"); checkMessenger("function running atosAuthListener");
    const atosAuthorization = document.querySelectorAll("c-atos-authorization-revamp .table-body");
    if(atosAuthorization && atosAuthorization.length > 0){
        console.log("atos found"); checkMessenger("atos found");
        atosAuthorization.forEach((atos) => {
            console.log("atos is ",atos)
            atos.addEventListener("click",async () => {
                checkMessenger("atos clicked");
                console.log("atos clicked")
                let authButtons = await waitForElement("c-atos-authorization-revamp button",5000)
                    .catch(error => {console.log(error); checkMessenger("auth  buttons not found")})
                if(authButtons && authButtons.length > 0){
                    console.log("authButtons are = ",authButtons);
                    checkMessenger(`authbuttons found ${authButtons.length}`)
                    authButtons[0].addEventListener("click",async () => {
                        let authButtons2 = await waitForElement("c-atos-authorization-revamp button",5000)
                            .catch(error => {console.log(error); checkMessenger("auth  buttons2 not found")})
                        console.log("authbuttons = ",authButtons2);
                        checkMessenger(`authbuttons found ${authButtons2.length}`);
                        if(authButtons2 && authButtons2.length > 0){
                            authButtons2[1].addEventListener("click",async () => {
                                const spinner = await waitForElementDisappear("c-atos-authorization-revamp lightning-spinner.slds-spinner_container",2000,600000);
                                checkMessenger("grabbing data");
                                getCustomerData2()
                            })
                        }
                    })
                }
            })

        })
    }else{
        console.log("atos not found"); checkMessenger("atos not found");
    }
}
function checkApprovalReappraisalListener(){
    const div = document.querySelectorAll("div.tiles div.slds-col.slds-button-shrink")
}
function checkApprovalListener(Aid){
    const saveBtn = document.querySelector(".saveBtn.slds-m-bottom_medium");
    if(saveBtn){
        saveBtn.addEventListener("click",async ()=> {
            const checkApproval = await waitForElement(".checkApproval",5000).catch(error => console.log(error))
            if(checkApproval && checkApproval.length > 0){
                checkApproval[0].addEventListener("click",async ()=> {
                    messageToBackground("inform",{
                        message: "approvalRequested",
                        Aid: Aid
                    });
                    const approval = await waitForElement("table.cdLinesTable tbody tr",10000).catch(error => console.log(error))
                    if(approval && approval.length > 0){
                        const approvalData = await waitForElement("table.cdLinesTable tbody tr",15000).catch(error => console.log(error))
                        if(approvalData){
                            getCustomerData2();
                        }
                    }
                })
            }
        })
    }
}
async function checkAccountAggregator(Aid){
    const AABtn = await waitForElement("lightning-button.accountAggregatorBtn button",5000).catch(error => console.log(error))
    if(AABtn && AABtn.length > 0){
        let btn = AABtn[0]
        // AABtn[0].scrollIntoView({behavior:"smooth",block:"center"});
        if(btn.disabled === true){
            // messageToBackground("accountAggregator",{
            //     type:"Auto",
            //     Aid:Aid
            // })
        }else{
            console.log("Account aggregator btn is enabled listener added",btn);
            if(!checkAccountAggregator.listenOnClick){
                checkAccountAggregator.listenOnClick = async () => {
                    const qrEl = await waitForElement("div.tiles c-account-aggregator c-qr-code-generation",10000).catch(error => console.log(error))
                    if(qrEl && qrEl.length > 0){
                        // alert("element found");
                        readQr("auto");
                    }
                }
            }
            btn.removeEventListener("click",checkAccountAggregator.listenOnClick);
            btn.style.border = "2px solid red";
            btn.style.width = "100px";
            btn.addEventListener("click",checkAccountAggregator.listenOnClick,{once:true});
            btn.style.border = "2px solid black";
            btn.style.width = "250px";
        }
        
    }else{
        // alert("aa btn not found");
        console.log("AA Btn not found");
    }
    
}
let getCustomerData_trials = 10
function getCustomerData2(){
    console.log("function running  ============> getCustomerData")
    return new Promise (async(resolve,reject) => {
        const state = await getDomStatus();
        if(state === "loaded"){
            const element = await waitForElement("div.Customer-Name-Value",5000).catch(error => console.log(error))
            checkMessenger("ELEMENTS FOUND");
            const Aid = document.querySelector(".slds-col.slds-size_1-of-2.Customer-Data-Value").innerText;
            checkAccountAggregator(Aid);
            
            const customerName = element[0].innerText;
            const customerType = element[1].innerText;
            const cardCustomer = element.length > 2
            console.log(Aid); checkMessenger(Aid)
            const result = await checkAid(Aid);
            console.log(result)
            if (result.status === "oldAid"){
                console.log(true)
                const result2 = await checkPhoneNumber(result.data,Aid,customerName).catch(error => {
                    console.log(error);
                })
                if(result2 === "somethingChanged"){
                    if(cardCustomer){
                        console.log("getting card customer data"); 
                        checkMessenger("getting card customer data");
                        const etbCardData = await getETB_CardData(Aid,element);
                        console.log("sending to background = ", etbCardData);
                        messageToBackground("loginData",etbCardData);
                        checkCustomerBlocked(Aid);
                    }else{
                        console.log("getting reappraisal data"); 
                        checkMessenger("getting reappraisal data");
                        checkCustomerBlocked(Aid);
                        getReappraisalData2(Aid,element,result.data);
                    }
                }else{
                    checkApprovalListener(Aid);
                }
            }else if (result.status === "newAid"){
                console.log("Unknown Customer detected");
                checkMessenger("Unknown Customer detected, please search through mobile number",10,5000);
            }
        }else if(state === "loading"){
            console.log("dom is loading || initiated again => getCustomerData");
            sleep(1000).then(s => {
                getCustomerData_trials - 1
                if(trials < 1){
                    resolve("heavyLoading")
                }
                getCustomerData2()
            })
        }
        
    })
}



async function getOpportunityStages(){
    checkMessenger("getting Stages => ");
    const dom = await waitForDomLoading(10000);
    console.log(dom);
    const trs = await waitForElement("tbody tr",10000).catch(error => console.log(error))
    const stagesRequired = await getLocalData("stagesRequired");
    if(trs && trs.length > 0){
        const opportunityStages = []
        console.log("tbody found => ",trs); checkMessenger("tbody found");
        for(tr of trs){
            const bid = tr.children[1].innerText;
            const bidStage = tr.children[2].innerText;
            if(stagesRequired[bid] === false){
                console.log("skipping ---- bid stage not required => ",bid," - ",bidStage);
            }else{
                const bidData = {};
                bidData.bid = bid
                bidData.bidStage = tr.children[2].innerText;
                bidData.Aid = tr.children[4].innerText;
                console.log("tr set = ",bidData)
                opportunityStages.push(bidData);
            }
        }
        messageToBackground("opportunityStages",opportunityStages)
    }else{
        console.log("tbody not found"); checkMessenger("tbody not found");
    }
    
}

async function getBidStage(){
    console.log("function is running");
    const BidEl = await waitForElement("slot.slds-page-header__title",10000).catch(error => console.log(error))
    // listenerForInvoice();
    if(BidEl && BidEl.length > 0){
        const bid = BidEl[0].innerText
        console.log("Bid is = ",bid); checkMessenger('Bid found',1,5000)
        const stages = await waitForElement("p.stepLabel",10000).catch(error => console.log(error))
        if(stages && stages.length > 0){
            console.log("stages are = ",stages[0]); checkMessenger(`stage is = ${stages[0].innerText}`,1,5000)
            const stage = stages[0].innerText.split(":")[1].trim();
            console.log("final stage is = ",stage); checkMessenger(`final stage is = ${stage}`,1,10000);
            const bidToAid = await getLocalData("bidToAid");
            const loginData = await getLocalData("loginData");
            if(bidToAid && loginData){
                const Aid = bidToAid[bid];
                const AidSection = loginData[Aid];
                const opportunities = AidSection?.opportunities;
                if(opportunities && opportunities.length > 0 , opportunities[0] !== null){
                    for (opp of opportunities){
                        if(opp.bid === bid){
                            opp.bidStage = stage;
                            commitChanges("loginData",loginData);
                        }
                    }
                }
            }
        }else{
            console.log("stages not found"); checkMessenger('stages not found',1,5000)
        }
    }else{
        console.log("Bid El not found"); checkMessenger('Bid el not found',1,5000)
    }
    
    
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
                // console.log("found assetType : ",type);
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
    // console.log("getting asset category");
    let found = false
    return new Promise((resolve,reject) => {
        for (let category in assetCategories){
            // console.log(category);
            assetCategories[category].forEach((cat,inx) => {
                // console.log(asset," => ",cat);
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
                // console.log("continue");
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
        // const cdd = textAreas[1]
        // const cd = textAreas[2]
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
        // checkMessenger("header found",10,3000);
        // const checkbox = header[1].children[0];
        // const checkBox = header[1].querySelector("input");
        // if(checkBox){
        //     console.log("chheckbox is ",checkBox)
        //     checkBox.focus();
        //     checkBox.click();
        // }else{
        //     console.log("checkbox not found");
        // }
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

async function callNormalSqcAfterRefresh(){
    const element = await waitForElement('ul.slds-button-group-list li.slds-dropdown-trigger lightning-button-menu button',10000).catch(error => console.log(error))
    const sqcHead = document.querySelector("header.slds-modal__header h2");
    if(element && element.length > 0){
        if(sqcHead){
            if(sqcHead.innerText.toLowerCase().includes("submit for")){
                console.log("already submitting file, cannot submit again");
            }else{
                normalSQC();
            }
        }else{
            normalSQC();
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
                    btn.dispatchEvent(new Event("click",{bubbles:true}));
                    btn.click();
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
                // alert(`date already added skipping date addition --------- ${dateInput.value}`);
            }else{
                const newDate = dateEl.innerText.split(" ")[0];
                dateInput.value = newDate
                dateInput.dispatchEvent(new Event("input",{bubbles:true}));
                dateInput.dispatchEvent(new Event("change",{bubbles:true}));
            }
            
        }else{
            console.warn("Date element or dateInput element not found");
        }
        // const approvalStatus = document.querySelector('div[data-target-selection-name="sfdc:RecordField.Opportunity.Payment_Authorization_Status__c"] lightning-formatted-text');
        // if(approvalStatus){
        //     if(approvalStatus.innerText === "Approved"){
        //         // alert("Payment Authorization is Approved");
        //     }else{
        //         alert(`Payment Authorization is ${approvalStatus.innerText}`);
        //     }
        // }
    }
}
async function getElement(selector){
    return new Promise(async (resolve,reject) => {
        checkMessenger("finding element");
        const qrElement = document.querySelector(selector);
        if(qrElement){
            console.log("element found = ",qrElement);
            resolve(qrElement)
            checkMessenger("element found");
        }else{
            const qrElements = await waitForElement(selector,2000)
                .catch(error => {
                    console.log(error)
                    checkMessenger("element not found");
                    reject("element not found");
                });
            if(qrElements && qrElements.length > 0){
                console.log("element found = ",qrElements);
                checkMessenger("element found");
                resolve(qrElements[0]);
            }
        }
        
    })
    
}
function lastFourDigits(selector){
    return new Promise(async(resolve,reject) => {
        const tiles = document.querySelectorAll(selector);
        if(tiles){
            // console.log("tiles are ",tiles);
            let found = false
            for (div of tiles){
                if(div.innerText.toLowerCase().includes("mobile no")){
                    found = true
                    const span = div.querySelector("div.accordion div.tiles span.customer-mobile-number span.text-font-accordion");
                    if(span){
                        resolve(span);
                    }else{
                        reject("inner span not found try again");
                    }
                    break;
                }
            }
            if(found === false){
                reject("inner div not found try again")
            }
        }else{
            reject("tiles not found try again")
        }
    })
}
async function readQr(type){
    checkMessenger("Reading Qr....",10,5000);
    const qrElement = await getElement("div.tiles c-account-aggregator div.container.qr-code").catch(error => console.log(error));
    const mobileNumber = await lastFourDigits("div.accordion div.tiles").catch(error => {
        console.log(error);
        checkMessenger("Please validate mobile No. before AA",10,3000);
    });
    const dob = await getElement("input.slds-input[name='dob']").catch(error => console.log(error));
    if(qrElement && mobileNumber && dob){
        qrElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        })
        qrElement.style.width = "200px"
        const password = mobileNumber.innerText.slice(mobileNumber.innerText.length - 4, mobileNumber.innerText.length) + dob.value.slice(dob.value.length - 4, dob.value.length);
        messageToBackground("decodeQr",{
            action: "captureQr",
            type:type,
            password:password
        })
    }
}

function handleResponseOnRequests(approval){
    if(approval === true){
        readQr("auto");
    }else{
        console.log("qr already readed doing nothing about it");
    }
}
function addCommandWall(){
    return new Promise((resolve,reject) => {
        fetch(chrome.runtime.getURL("message.html"))
        .then((response) => response.text())
        .then((html) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");

            specificElement = doc.querySelector("div#content-commandWall"); 
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
async function getMarks(){
    mdivs = document.querySelectorAll("div.question-pnl");
    let questionCount = 0
    let right = 0
    let wrong = 0
    let section1_Right = 0
    let section1_Wrong = 0
    let section2_Right = 0
    let section2_Wrong = 0
    let section3_Right = 0
    let section3_Wrong = 0
    
    for(div of mdivs){
        questionCount = questionCount +1
        tables = div.querySelectorAll("table table")
        ans = tables[0].querySelector("tr td.rightAns").innerText.split(".")[0]
        my = tables[1].children[0].children[1].children[1].innerText
        const result = ans == my
        if(result === true){
            right = right + 1 
        }else{
            wrong = wrong + 1
        }
        if(questionCount <= 75){
            if(result === true){
                section1_Right = section1_Right +1
            }else{
                section1_Wrong = section1_Wrong +1
            }
        }else if(questionCount <= 150){
            if(result === true){
                section2_Right = section2_Right +1
            }else{
                section2_Wrong = section2_Wrong +1
            }
        }else if(questionCount <= 200){
            if(result === true){
                section3_Right = section3_Right +1
            }else{
                section3_Wrong = section3_Wrong +1
            }
        }
        
        
        console.log(`i wrote ${my} ------ answer = ${ans} => ${result}`)
    }
    console.log(`final right is ${right} --- final wrong is ${wrong}` );
    // console.log(`final wrong is ${wrong}`);
    console.log(`section1 => {right✅ = ${section1_Right} ----------- wrong ❌ = ${section1_Wrong}}`)
    console.log(`section2 => {right✅ = ${section2_Right} ----------- wrong ❌ = ${section2_Wrong}}`)
    console.log(`section3 => {right✅ = ${section3_Right} ----------- wrong ❌ = ${section3_Wrong}}`)
    alert(`
        final right is ${right} --- final wrong is ${wrong}\n
        section1 => {right✅ = ${section1_Right} ----------- wrong ❌ = ${section1_Wrong}}\n
        section2 => {right✅ = ${section2_Right} ----------- wrong ❌ = ${section2_Wrong}}\n
        section3 => {right✅ = ${section3_Right} ----------- wrong ❌ = ${section3_Wrong}}\n
        `)
}
async function ReinventSqc(){
    const menuBtn = document.querySelector("button.breadcrumb-button");
    if(menuBtn){
        menuBtn.click()
        const inv = await waitForElement("div.menu-content",3000);
        if(inv && inv.length > 0){
            for (div of inv[0].children){
                console.log(`Search for invoice => found ((( ${div.innerText} )))`);
                if(div.innerText.toLowerCase() === "invoice"){
                    div.click();
                    const dateInput = await waitForElement('input[type="date"]',3000);
                    if(dateInput && dateInput.length > 0){
                        const date = (new Date()).toISOString().split("T")[0]
                        dateInput[0].value = date
                        const invInput = document.querySelector('input.mobile-input[type="text"]');
                        invInput.value = "1227/25/S-"
                        span = document.querySelector('span[part="indicator"]')
                        span.addEventListener("click",async () => {
                            const proceedBtn = await waitForElement("div.modal-body button.proceedBtn",5000);
                            if(proceedBtn && proceedBtn.length > 0){
                                proceedBtn[0].click();
                                const submitBtn = waitForElement("button.proceedBtn.submit-button",3000);
                                if(submitBtn && submitBtn.length >0){
                                    submitBtn[0].click();
                                    const validateBtn = document.querySelector("div.validate-button button.proceedBtn.submit-button");
                                    validateBtn.click();
                                    const genAI = document.querySelector("div.docHeader.docHeaderGenAI div.validate-button button.proceedBtn.submit-button");
                                    genAI.click();
                                    const sqcBtn = document.querySelector("div.footer.footer-mobile button.proceedBtn.submit-button");
                                    sqcBtn.click();
                                }
                            }
                        })
                    }
                }
            }
        }
    }else{
        alert("Menu Not found");
    }
}
function panelButton(){
    const btn = document.createElement("div");
    btn.classList.add("ContentJS-CommandBtn");
    document.body.append(btn);
    btn.innerText = "Sohail"
}
// panelButton();
function insertIframe(){
    chrome.windows.create(
    {
      url: "https://www.bajajfinserv.in/qr-code-web-page?xc=QHKxvc5evFw2L7wxXjFJMKexYrG6ScuxlC3tud23Mcc=",  // or any URL you want
      type: "popup",
      width: 400,
      height: 600,
      top: 100,
      left: 100
    },
    (newWindow) => {
      popupWindowId = newWindow.id; // Save ID so we can close later
      console.log("Popup opened with ID:", popupWindowId);
    }
  );

}
async function assetValidation(){
    const tiles = await waitForElement("div.tiles",10000);
    tiles[5].scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    })
    const label = tiles[5].querySelectorAll("label")
    label[0].click()
    label[1].click()
    await sleep(2000)
    const input = tiles[5].querySelector('lightning-input[data-id="imeiNumber"] input')
    input.value = Number(input.value)+1
    const button = tiles[5].querySelector('button.slds-button.slds-button_neutral');
    button.click();
    const statusDiv = tiles[5].querySelector('div[data-id="assetData"]');
    statusDiv.innerText.includes("Asset Validated");
    await sleep(3000)
    // location.reload()
}
function getReportData(){
    const tables = document.querySelectorAll("div.edge-builder-ii table");
    
}
async function getCommand(){
    const oldCommandWall = document.querySelector("div#content-commandWall");
    if(oldCommandWall){
        oldCommandWall.remove()
    }else{
        const request = await addCommandWall();
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
                    // checkMessenger("2 digits",10,2000);
                    switch(input.value.toUpperCase()){
                        case "00": case "CC":
                            div.remove();
                            break;
                        case "11": case "IN":
                            div.remove();
                            addInvoice();
                            // normalSQC();
                            break;
                        case "12": case "KP":
                            div.remove();
                            fetchKycPoiDetails();
                            // walletLinking("link");
                            break;
                        case "13": case "WO":
                            div.remove();
                            walletLinking("link");
                            // walletLinking("unlink");
                            break;
                        case "14": case "VA":
                            div.remove();
                            // fetchKycPoiDetails();
                            validateAgreement();
                            break;
                        case "15": case "SQ":
                            div.remove();
                            // validateAgreement();
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
                            // normalSQC();
                            walletLinking("unlink");
                            // addInvoice();
                            break;
                        case "10": case "WVS": case "NTBS":
                            div.remove();
                            responsiveSubmit("NTB");
                            break;
                        case "20": case "KVS": case "ETBS":
                            div.remove();
                            responsiveSubmit("ETB",2);
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
                            // alert("Extension will close now, you can open it again.");
                            sleep(2000);
                            messageToBackground("command","");
                            div.remove();
                            break;
                        case "99": case "EX":
                            // getMarks();
                            // insertIframe();
                            messageToBackground("insertIframe","random")
                            div.remove();
                            break;
                    }
                }
            })
        }
        
    }
}
async function enterPassword(password){
    const input = await waitForElement("input[type='password']",5000).catch(error => console.log(error))
    const submit = await waitForElement("input[type='submit']",5000).catch(error => console.log(error))
    if(input && input.length > 0 && submit && submit.length > 0){
        input[0].value = password
        submit[0].click();
    }
}
function reloadHome(){
    waitForElement("ul.comm-navigation__list li a").then(home => {
        console.log("home found",home);
        home[0].addEventListener("click",async () => {
            await sleep(100);
            location.reload();
        },{once:true})
    })
}

reloadHome();
chrome.runtime.onMessage.addListener((request,sender, sendResponse) => {
    console.log("content recieved message : ",request)
    if(request.action === "SQC"){
        checkMessenger("Command request | Submit For QC",10,200);
        normalSQC();
        sendResponse({ status: 'Function invoked successfully' });
    }else if(request.action === "fetchKycPoiDetails"){
        checkMessenger("Command request | get Kyc Poi",10,3000)
        fetchKycPoiDetails();
        sendResponse({ status: 'Function invoked successfully' });
    }else if(request.action === "getCommand"){
        checkMessenger("Command request | getCommand",9,3000)
        getCommand();
        sendResponse({ status: 'Function invoked successfully' });
    }else if(request.action === "fetchData"){
        // readQr("command");
        assetValidation()
        sendResponse({ status: 'Function invoked successfully' });
    }else if(request.action === "searchCustomer"){
        // checkMessenger("you are searching for new customer")
        if(permissions.LoginData === true){
            console.log("you are searching for new customer");
            searchCustomer();
            removeGyde();
        }else{
            checkMessenger("LoginData permissions declined");
        }
        
    }else if(request.action === "trackSearchCustomer"){
        console.log("background says : trackSearchCustomer");
        removeGyde();
        // trackCustomer();
    }else if(request.action === "initiateQrOtp"){
        console.log("background says : initiateQrOtp");
        initiateQrOtp(request.data);
        sendResponse({ status: 200 });
    }else if(request.action === "getConfirmationForSameAid"){
        const response = prompt(`You searched this customer on ${request.date}. Is this a new login ? ; Note: press cancel if you are continuing with old Bid`,"Yes");
        sendResponse({response})
    }else if(request.action === "getCustomerData"){
        console.log("background says : getCustomerData");
        if(permissions.LoginData === true){
            getCustomerData2();
        }else{
            checkMessenger("LoginData permission declined {9}",9,2000);
        }
    }else if (request.action === "getOpportunityStages"){
        console.log("background says : getOpportunityStages");
        if(permissions.LoginData === true){
            getOpportunityStages();
        }else{
            checkMessenger("LoginData permission declined {9}",9,2000);
        }
    }else if(request.action === "urlChanged"){
        checkMessenger("urlChanged");
    }else if(request.action === "getBidStage"){
        if(permissions.LoginData === true){
            getBidStage();
        }else{
            checkMessenger("LoginData permission declined {9}",9,2000);
        }
        
    }else if(request.action === "getPassword"){
        const getPrompt = prompt("Enter the passcode");
        checkMessenger(`promt is ${getPrompt}`);
        sendResponse({getPrompt});
    }else if(request.action === "submitForQc"){
        callNormalSqcAfterRefresh();
    }else if(request.action === "initiateQragain"){
        initiateQrOtp4(request.phone);
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
    }else if(request.action === "enterPassword"){
        enterPassword(request.password);
        sendResponse("enterPassword");
    }else if(request.action === "responseOnRequest"){
        handleResponseOnRequests(request.approval)
    }else if(request.action === "showAlert"){
        const response = alert(request.text);
        messageToBackground("extensionReload2");
    }else if(request.action === "responsiveSubmit"){
        responsiveSubmit(request.type,request.stage);
    }else if(request.action === "getTabCount"){
        getTabCount();
    }
})
// async function assetValidation(){
//     sns = getLocalData("serialNumbers");
    
//     av = await waitForElement("div.sectionAsset div.assetOpen lightning-icon",5000)
//     av[0].click()
//     input = document.querySelector('input[data-id="imeiNumber"]')
//     input.value = "1234"
//     validate = input.parentElement.childNodes[2]
//     validate.click();
//     await sleep(5000);
//     location.reload();
// }
addExternalCss();
messageToBackground("info","page_reloaded");
console.log("content script is running");


// --------------progress tracker for next day----------------------

//1.  submit for qc completed ✔
//2.  check for basic precautions before sqc => 
//    customer photo element clicked and checked and selected the required element based on the data aquired in sqc page through checkbox..
// need to add functionalitu to add the poi number based on the data collected through sqc check => ---

