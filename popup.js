
const generateReport = document.querySelector(".generateReport");
const loginTable = document.querySelector("#loginData table tbody");
const dateInput = document.querySelector("input#dateStart")
const todayDate = new Date().toISOString().split('T')[0];
const downloadBtn = document.querySelector("button.downloadLoginData");
const fmFormat = document.querySelector("button.fmFormat");
const homePageBtn = document.querySelector("header span#home");
const loginDataPageBtn = document.querySelector("header span#loginData");
const permissionsPageBtn = document.querySelector("header span#permissions");
const deleteBtn = document.querySelector("button.delete");
const editBtn = document.querySelector("button.edit.reportButtons");
const FDdeleteBtn = document.querySelector("button.FDdelete");
const saveBtn = document.querySelector("button.saveLoginData");
const textBar = document.querySelector("input.reportButtons");
const saveFosDetailsBtn = document.querySelector("div#home div.tableButtons button#save");
const alphabets = ["0","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"]
let newPermissions = null;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

let startDate = null
dateInput.value = todayDate
document.querySelector("input[type='date']").setAttribute("max",todayDate);
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
const finOneCode = {
    "sohail" : 646180,
    
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
function permissions(){
    return new Promise(async (resolve,reject) => {
        const permissions = await getLocalData("permissions");
        if(permissions){
            resolve(permissions)
        }
    })
}
function saveLocalData(){
    console.log("function running saveLocalData")
    chrome.storage.local.get(null, async function(data) {
        let blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        let url = URL.createObjectURL(blob);
        const newDate = new Date
        const date = newDate.toISOString().split("T")[0];
        chrome.downloads.download({ url, filename: `backup ${date}.json` });
        const permissions = await getLocalData("permissions");
        if(permissions){
            permissions.lastDataBackup = (new Date).toISOString().split("T")[0];
            commitChanges("permissions",permissions);
        }
    });
}
function messageToBackground(type,text){
    // send message to background.js
    chrome.runtime.sendMessage({ to: "background.js", from: "popup", type: type , text: text},(response)=> {
        // console.log(response);
        // alert(response.reply);
        console.log("response from background : ",response);
        return response
    });
};
const weeks = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
function daysBetweenDates(date1,date2){
    const newDate1 = new Date(date1);
    const newDate2 = new Date(date2);
    const diffInsec = Math.abs(newDate2 - newDate1);
    const secsInDay = 1000 * 60 * 60 * 24
    return diffInsec / secsInDay
}
permissions().then(data => {
    newPermissions = data
    const date = new Date
    const newDate = date.toISOString().split("T")[0];
    // const todayDateNumber = newDate.split("-")[2]
    // const dayToday = weeks[date.getDay()]
    // const daysfromLastRefreshed = daysBetweenDates(data.lastExtensionRefreshed,newDate);
    // console.log("daysfromLastRefreshed = ",daysfromLastRefreshed)
    // if(newPermissions.autoRefresh === true){
    //     const con1 = data.refreshParameter.howOften === "Daily" && data.lastExtensionRefreshed != newDate
    //     const con2A = data.refreshParameter.howOften === "Weekly" && data.lastExtensionRefreshed != newDate && dayToday === data.refreshParameter.weekName
    //     const con2B = data.refreshParameter.howOften === "Weekly" && data.lastExtensionRefreshed != newDate && daysfromLastRefreshed >= 7
    //     const con2 = con2A || con2B
    //     const con3A = data.refreshParameter.howOften === "Monthly" && data.lastExtensionRefreshed != newDate && daysfromLastRefreshed >= 31
    //     const con3B = data.refreshParameter.howOften === "Monthly" && data.lastExtensionRefreshed != newDate && todayDateNumber <= data.refreshParameter.dayNumber
    //     const con3 = con3A || con3B
    //     if(con1 || con2 || con3){
    //         data.lastExtensionRefreshed = newDate;
    //         commitChanges("permissions",data);
    //         alert("Extension will close now, you can open it again.")
    //         chrome.runtime.reload();
    //     }
        
    // }
    if(data.lastExtensionRefreshed != newDate){
        data.lastExtensionRefreshed = newDate;
        commitChanges("permissions",data);
        alert("Extension will close now, you can open it again.");
        messageToBackground("downloadRepo");
        // chrome.runtime.reload();
    }
    if(data.lastDataBackup != newDate){
        if(data.autoBackup === true){
            // data.lastDataBackup = newDate;
            // commitChanges("permissions",data);
            saveLocalData();
        }
    }else{
        console.log("no need to refresh");
    }
})
let fosDetails = null
function fosDetailsF(){
    return new Promise(async (resolve,reject)=> {
        const data = await getLocalData("fosDetails");
        if(data){
            resolve(data);
        }else{
            reject("No data found");
        }
    })
}
fosDetailsF().then(data => {
    fosDetails = data;
})
async function getFinOneCode(fosName){
    return new Promise(async resolve => {
        if(!fosName){
            resolve("-")
        }
        // console.log("fos name is = ",fosName);
        if(fosName && fosDetails){
            for(let name in fosDetails){
                if(fosName === name){
                    // console.log("fosName is equals name ",fosName," => ",name)
                    resolve(fosDetails[fosName].finOneCode)
                }else{
                    // console.log("fosName is not equals name ",fosName," => ",name)
                    resolve("000000");
                }
            }
        }else{
            resolve("000000");
        }
    })
}

function excelDateNumber(date){
    const excelBirth = new Date("1899-12-30");
    const differnceInMs = date -excelBirth;
    return Math.floor(differnceInMs / (1000 * 60 * 60 * 24))
}
function getRows(){
    let rows = []
    const trRows = document.querySelectorAll("table tbody tr");
    if(trRows && trRows.length > 1){
        console.log(trRows)
        for(let row of trRows){
            let innerRow = []
            console.dir(row)
            for(child of row.children){
                if(child.id.includes("B")){
                    // console.log(child.innerText);
                    const date = new Date(child.innerText.split("-").reverse().join("-"));
                    const dateNumber = excelDateNumber(date)
                    innerRow.push(dateNumber)
                }else if (child.id.includes("C") || child.id.includes("F") || child.id.includes("H")){
                    innerRow.push(Number(child.innerText));
                }else{
                    // console.log(child.innerText);
                    innerRow.push(child.innerText);
                }
                
            }
            // console.log("innerRow is ",innerRow);
            rows.push(innerRow);
        }
        // console.log("rowws = ",rows);
        return rows;
    }
}

async function downloadData(){
    const dateStart = document.querySelector("input#dateStart").value;
    const dateEnd = document.querySelector("input#dateEnd").value;
    const rows = getRows();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook,worksheet,"sheet1");
    XLSX.writeFile(workbook,`loginData = ${dateStart} _ ${dateEnd}.xlsx`)
    downloadBtn.classList.add('displayNone');
}
dateInput.addEventListener("change",() => {
    downloadBtn.classList.add("displayNone");
    fmFormat.classList.add('displayNone');
    const date = dateInput.value
    if(date !== todayDate){
        const otherInputs = document.querySelectorAll(".date.after");
        otherInputs.forEach((input) => {
            input.classList.remove("displayNone");
        })
        const dateEnd = document.querySelector("#dateEnd")
        dateEnd.setAttribute("max",todayDate);
        dateEnd.setAttribute("min",startDate);
        dateInput.classList.remove("before");
        dateEnd.addEventListener("change",() => {
            downloadBtn.classList.add("displayNone");
            fmFormat.classList.add('displayNone');
        })
    }else{
        const otherInputs = document.querySelectorAll(".date.after");
        otherInputs.forEach((input) => {
            input.classList.add("displayNone");
        })
        dateInput.classList.add("before")

    }
})
document.addEventListener("DOMContentLoaded",()=> {
    getLocalData("DateToAid").then(data => {
        const array = []
        for(let date in data){
            const newDate = date.split("_").reverse().join("-");
            array.push(newDate)
        }
        array.sort((a,b) => new Date(a) - new Date(b));
        // console.log("new array is ",array)
        for(date of array){
            startDate = date
            // console.log(startDate);
            dateInput.setAttribute("min",startDate)
            break;
        }
    })
})
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

function isBilled(stage){
    const properStage = stage.trim().toLowerCase()
    // console.log("properStage => ",properStage);
    if( properStage.includes("new") || properStage.includes("cancelled") || properStage.includes("do preparation")){
        return "Not Billed";
    }else {
        return "Billed";
    }
}

function getStatus(Data,bid,billed,assetCategory,assetType,stage){
    if(billed === "Billed"){
        return "Approved"
    }else if(stage?.toLowerCase === "do preperation"){
        return "Approved"
    }else{
        if(Data.customerBlocked === true){
            return "Customer Blocked"
        }else{
            if(Data.loginType === "reappraisal"){
                if(Data.rcuReject === true){
                    return "Rcu Reject"
                }else if(Data.otherReject){
                    return "Rejected"
                }else if(Data.approvalStatus === "allNotApproved"){
                    return "Not Approved"
                }else if(Data.approvalStatus === "allApproved"){
                    return "Approved"
                }else if(Data.approvalStatus === "someNotApproved"){
                    if(assetType === "cdd" && Data.digitalReject === true){
                        return "Rejected"
                    }else if (assetType === "cdd" && Data.digitalReject === false){
                        return "Approved"
                    }else if(assetType === "cd" && Data.cdReject === true){
                        return "Rejected"
                    }else if(assetType === "cd" && Data.cdReject === false){
                        return "Approved"
                    }else if(Data.phoneLocking){
                        return "Phone locking"
                    }else{
                        console.log(Data);
                        return "need remark"
                    }
                }else{
                    console.log(Data);
                    return "need remark"
                }
                
            }else if(Data.isActive){
                if(Data.isActive.toLowerCase() !== "active"){
                    return "Card Block"
                }else if(Data.isActive.toLowerCase() === "active"){
                    console.log("dataBid is ",bid);
                    if(!bid){
                        if(Data["cdd-NoReason"] || Data["cd-NoReason"]){
                            return "Not eligible"
                        }else{
                            return "Enquiry"
                        }
                        
                    }else if(bid){
                        if (bid.authStatus && bid.authStatus.toLowerCase() === "failed"){
                            return "Rejected"
                        }else{
                            console.log(Data);
                            return "need remark"
                        }
                    }else{
                        console.log(Data);
                        return "need Remark"
                    }
                }else{
                    return "need Remark"
                }
            }else if(Data.loginType === "freshLogin"){
                return "Fresh Login"
            }else{
                console.log(Data);
                return "need remark"
            }
        }
        
    }
}
function getRemarks1(status,billed,Data,assetType,bid){
    console.log("getRemarks1 => ",status,billed);
    
    if(billed === "Billed"){
        return "-"
    }else if(billed === "Not Billed"){
        if(status.toLowerCase() === "card block"){
            // console.log("card block");
            return "Card Block"
        }else if(status === "Not eligible"){
            return "Not eligible"
        }else if(status.toLowerCase() === "enquiry"){
            if(Data.loginType === "cardCustomer"){
                return "Limit Check"
            }else{
                return "Enquiry"
            }
            
        }else if (status === "Approved"){
            return "Enquiry"
        }else if(status === "Rcu Reject"){
            return "Rcu Issue"
        }else if (status === "Rejected"){
            if(Data.otherReject){
                if(Data.otherReject.toLowerCase().includes("atos")){
                    return "auth status " + bid.authStatus
                }else{
                    return Data.otherReject;
                }
            }else if(assetType === "cdd" && Data.digitalReject === true){
                return Data.rcuRejectReason?.digital || Data.digitalRejectReason
            }else if(assetType === "cd" && Data.cdReject === true){
                return Data.rcuRejectReason?.cd || Data.cdRejectReason
            }else if(bid.authStatus && bid.authStatus.toLowerCase() === "failed"){
                return "auth status " + bid.authStatus
            }else{
                return "need remark";
            }
        }else if (status === "Fresh Login"){
            return "process dropped"
        }else if (status === "Phone locking"){
            return status
        }else if (status === "Customer Blocked"){
            return status
        }else if (status.toLowerCase().includes("ltv")){
            return "Ltv is Less than required"
        }else{
            return "need remark"
        }
    }else{
        return "need remark"
    }
}
function getRemarks2(r1,status,data,bid){
    console.log(r1,status,data);
    if(r1 === "-" || r1 === undefined){
        return "-"
    }else if(r1 === "Not eligible"){
        return data["cdd-NoReason"] || data["cd-NoReason"]
    }else if(r1.toLowerCase() == "card block"){
        return data.isActive
    }else if(r1 === "Limit Check"){
        if(data.balanceLimit < 0){
            return "Negative Limit " + data.balanceLimit
        }else{
            return "Customer Not Present"
        }
    }else if (r1 === "Rcu Issue"){
        return data.rcuRejectReason
    }else if (r1 === "process dropped"){
        return "process dropped"
    }else if (r1.toLowerCase().includes("cibil") 
        || r1.toLowerCase().includes("score decline") 
        || r1.toLowerCase().includes("negative area") 
        || r1.toLowerCase().includes("restricted") 
        || r1.toLowerCase().includes("age criteria")
        || r1.toLowerCase().includes("dedupe")){
        return `Cibil : ${data.cibil}`
    }else if (r1.toLowerCase().includes("fraud")){
        return r1 + " Asset validation not allowed";
    }else if (r1.toLowerCase().includes("limit decline")){
        return r1
    }else if (r1 === "Enquiry"){
        return r1
    }else if (r1 === "Phone locking" /*&& data.approvalTaken === false*/){
        return "Customer not allowed to buy another phone til 150 days of phonelocking completed"
    }else if (r1 === "Customer Blocked"){
        return data.blockedReason
    }else if (r1.toLowerCase().includes("auth")){
        return bid.authMessage
    }else if (r1.toLowerCase().includes("ltv is less") || r1.toLowerCase().includes("downsized")){
        return "Customer wanted 0 downpayment"
    }else{
        return "need remark"
    }
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
function getNickname(fosName){
    return new Promise(async resolve => {
        if(!fosName){
            resolve("-")
        }
        const data = await getLocalData("fosDetails");
        if(data){
            let found = false
            for (entry in data){
                if(entry.toLowerCase().includes(fosName?.toLowerCase())){
                    found = true
                    resolve(data[entry].nickName);

                }
            }
            if(found === false){
                resolve(fosName)
            }        
        }
    })
    
}
async function addDataWithBid(opportunities,SNo,loginData,Aid,today){
    
    // console.log("adding with bid");
    let index = 0
    for(let bid of opportunities){
        if(bid){
            const billed = isBilled(bid.bidStage);
            // console.log("billed? ",billed);
            const newData = {}
            const Data = loginData[Aid];
            console.log("Data is ",Data);
            newData.SNo = SNo;
            newData.Date = today.split("_").join("-");
            newData.storeCode = 80563;
            newData.fosName = Data.fosName;
            newData.nickName = await getNickname(Data.fosName);
            newData.finOneCode = await getFinOneCode(Data.fosName);
            newData.customerName = Data.customerName;
            newData.mobileNumber = Data.phoneNumber;
            newData.Aid = Aid
            newData.Bid = bid.bid;
            const asset = bid.productName;
            const assetCategory = await getAssetCategory(asset);
            const assetType = await getAssetType(assetCategory.category);
            console.log("got asset category");
            const Status = getStatus(Data,bid,billed,assetCategory,assetType,bid.bidStage);
            newData.status = bid.userStatus || Status
            newData.category = assetCategory.category;
            newData.brand = assetCategory.brand;
            newData.price = bid.invoiceAmount
            newData.billed = billed;
            newData.stage = bid.bidStage;
            // console.log("newData.status = ",Status)
            const Remarks1 = bid.userRemark1 || getRemarks1(newData.status,billed,Data,assetType,bid);
            newData.remarks1 = Remarks1
            // console.log("Rematks1 is", Remarks1);
            newData.remarks2 = bid.userRemark2 || getRemarks2(Remarks1,Status,Data,bid);
            console.log("new data is ",newData)
            row = document.createElement("tr");
            row.classList.add("table-body")
            let count = 0 
            for(column in newData){
                count = count + 1
                const cell = document.createElement("td");
                const num = Number(document.querySelectorAll("tr.table-body").length) + 1
                cell.id = alphabets[count] + num
                cell.innerText = newData[column]
                switch(column){
                    case "Aid":
                    case "storeCode":
                    case "fosName":
                    case "nickName":
                    case "finOneCode":
                        cell.style.display = "none";
                        break;
                    case "Date":
                        cell.classList.add("dateColumn");
                        break;
                }
                if(index > 0){
                    switch(column){
                        case "SNo":
                        case "Date":
                        case "customerName":
                        case "mobileNumber":
                        case "Aid":
                            cell.style.color = "aliceblue";
                            break;
                    }
                }
                // const input = document.createElement("textarea");
                // input.type = "text";
                // input.value = newData[column];
                // // input.disabled = true;
                // cell.appendChild(input);
                if(column === "SNo"){
                    const checkbox = document.createElement("input")
                    checkbox.type = "checkbox";
                    checkbox.checked = true;
                    checkbox.classList.add("displayNone");
                    cell.append(checkbox)
                }
                row.append(cell);
            }
            console.log("appending row => ",row);
            loginTable.append(row);
            index = index + 1
        }
        
    }
}
async function addDataWithoutBid(loginData,SNo,Aid,today){
    const billed = "Not Billed"
    const newData = {}
    const Data = loginData[Aid];
    console.log(Data);
    newData.SNo = SNo;
    newData.Date = today.split("_").join("-");
    newData.storeCode = 80563;
    newData.fosName = Data.fosName;
    newData.nickName = await getNickname(Data.fosName);
    newData.finOneCode = await getFinOneCode(Data.fosName);
    newData.customerName = Data.customerName;
    newData.mobileNumber = Data.phoneNumber;
    newData.Aid = Aid
    newData.Bid = "-";
    newData.status = Data.userStatus || getStatus(Data,"",billed);
    newData.category = "-";
    newData.brand = "-";
    newData.price = "-"
    newData.billed = "-";
    newData.stage = "-";
    newData.remarks1 = Data.userRemark1 || getRemarks1(newData.status,billed,Data,"","");
    newData.remarks2 = Data.userRemark2 || getRemarks2(newData.remarks1,newData.status,Data,"");;
    row = document.createElement("tr");
    row.classList.add("table-body");
    console.log("row data is => ",newData);
    
    let count = 0 
    for(column in newData){
        
        count = count + 1
        const cell = document.createElement("td");
        const num = Number(document.querySelectorAll("tr.table-body").length) + 1
        cell.id = alphabets[count] + num
        cell.innerText = newData[column]
        if(column === "Aid" || column === "storeCode" || column === "fosName" || column === "nickName" || column === "finOneCode"){
            cell.style.display = "none";
        }
        // const input = document.createElement("textarea");
        // input.type = "text";
        // input.value = newData[column];
        // // input.disabled = true;
        // cell.appendChild(input);
        if(column === "SNo"){
            const checkbox = document.createElement("input")
            checkbox.type = "checkbox";
            checkbox.checked = true;
            checkbox.classList.add("displayNone");
            cell.append(checkbox)
        }
        row.append(cell);
    }
    console.log("appending row => ",row)
    loginTable.append(row);
    
}
function changeDateFormat(date){
    const dateParts = date.split("-");
    return dateParts[2] + "_" + dateParts[1] + "_" + dateParts[0];
}
async function showLoginDataSingleDate(){
    const dateData = await getLocalData("DateToAid");
    const loginData = await getLocalData("loginData");
    const today = changeDateFormat(dateInput.value);
    // const today = "14_02_2025"
    if(dateData && loginData){
        const todayAids = dateData[today];
        let SNo = 0;
        if(todayAids && todayAids.length > 0){
            for(let Aid of todayAids){
                console.log("Aid = ",Aid);
                SNo = SNo + 1
                const opportunities = loginData[Aid]?.opportunities;
                if(opportunities && opportunities.length > 0 && opportunities[0] !== null){
                    await addDataWithBid(opportunities,SNo,loginData,Aid,today);
                }else{
                    addDataWithoutBid(loginData,SNo,Aid,today);
                }
            }
            downloadBtn.classList.remove("displayNone");
            fmFormat.classList.remove("displayNone");
        }else{
            console.log("No Logins found for today")
            const row = document.createElement("tr");
            row.classList.add("table-body");
            row.innerText = "No logins Found"
            loginTable.append(row)
        }
        
    }
};

function forceMessageToContent(action){
    console.log("messageToContent() - popup => content | function initiated")
    chrome.tabs.query({active: true,currentWindow: true }, (tabs) => {
        if(tabs.length === 0 || !tabs[0].url || tabs[0].url.startsWith("chrome://")){
            console.error("no valid active tab found.");
            return;
        }
        console.log("tabs are : ",tabs)
        chrome.scripting.executeScript(
            {
                target : {tabId : tabs[0].id},
                files: ["content.js"],
            },() => {
                chrome.tabs.sendMessage(tabs[0].id,action,(response) => {
                console.log("message sent from *popup* => *content* ----");
                console.log(response);
                if (chrome.runtime.lastError){
                    console.error("error:",chrome.runtime.lastError.message);
                }else {
                    console.log("response from constent script: ",response)
                }
                
                })
            }
        )
        
    })
}
const send_Message = (TYPE,TEXT,TO) =>{
    chrome.runtime.sendMessage({ to : TO, from : "popup", type: TYPE , text: TEXT});
}
// async function getDatesArray(startDate,endDate){
//     const Dates = []
//     let start = false
//     let stop = false
//     const datesInData = await getLocalData("DateToAid");
//     for(let date in datesInData){
//         console.log("date : ",date)
//         if(date === startDate){
//             start = true
//         }else if(date === endDate){
//             Dates.push(date)
//             stop = true
//         }
//         if(start === true && stop === false){
//             Dates.push(date)
//         }
//     }
//     console.log(Dates);
//     return Dates
// }
async function getDatesArray(startDate,endDate){
    const newStartDate = startDate.split("_").reverse().join("-");
    const newEndDate = endDate.split("_").reverse().join("-");
    const newDates = [];
    const Dates = []
    let start = false
    let stop = false
    const datesInData = await getLocalData("DateToAid");
    for(let date in datesInData){
        const newDate = date.split("_").reverse().join("-");
        newDates.push(newDate);
    }
    newDates.sort((a,b) => new Date(a) - new Date(b))
    console.log("sorted dates = ",newDates);
    for(let date of newDates){
        
        if(date === newStartDate){
            start = true
        }else if(date === newEndDate){
            console.log("it is enddate")
            stop = true
            
        }
        if(start === true && stop === false){
            Dates.push(date.split("-").reverse().join("_"))
        }else if(stop === true){
            Dates.push(date.split("-").reverse().join("_"))
            break;
        }
    }
    console.log("returning dates = ",Dates);
    return Dates
}
async function getDatesData(startDate,endDate){
    const datesArray = await getDatesArray(startDate,endDate)
    const dateData = await getLocalData("DateToAid");
    const loginData = await getLocalData("loginData");
    if(dateData && loginData){
        let SNo = 0;
        for(let date of datesArray){
            console.log(date)
            const Aids = dateData[date];
            console.log(Aids)
            for(let Aid of Aids){
                console.log("Aid = ",Aid)
                SNo = SNo + 1
                const opportunities = loginData[Aid].opportunities;
                if(opportunities && opportunities.length > 0 && opportunities[0] !== null){
                    await addDataWithBid(opportunities,SNo,loginData,Aid,date);
                }else{
                    addDataWithoutBid(loginData,SNo,Aid,date);
                }
            }
        }
        downloadBtn.classList.remove("displayNone");
        fmFormat.classList.remove('displayNone');
    }else{
        console.log("No data found");
    }
}
async function removeAidFromLoginData(Aid){
    const oldData = await getLocalData("loginData");
    return new Promise ((resolve, reject) => {
        if(oldData){
        delete oldData[Aid];
        commitChanges("loginData",oldData).then(result => {
            resolve(result)
        }).catch(error => resolve(error))
        }else{
        reject("failed")
        }
    })
}
async function removeAidFromDateData(date,Aid){
    const oldData = await getLocalData("DateToAid");
    return new Promise ((resolve, reject) => {
      if(oldData){
        const dateSection = oldData[date];
        console.log("before",dateSection)
        const index = dateSection.indexOf(Aid);
        console.log(index)
        dateSection.splice(index,1);
        console.log("after",dateSection)
        const changes = {...oldData, [date] : dateSection}
        commitChanges("DateToAid",changes)
        resolve("success")
      }else{
        reject("failed")
      }
    })
  }

function restoreBackup() {
    const fileInput = document.getElementById("backupFile");
    if (fileInput.files.length === 0) {
        alert("Please select a file.");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);

            // Store the data in chrome.storage.local
            chrome.storage.local.set(data, () => {
                if (chrome.runtime.lastError) {
                    console.error("Error restoring data:", chrome.runtime.lastError);
                } else {
                    alert("Backup restored successfully!");
                    messageToBackground("downloadRepo");
                    // chrome.runtime.reload()
                }
            });
        } catch (error) {
            console.error("Invalid JSON format:", error);
            alert("Invalid backup file. Please upload a valid JSON file.");
        }
    };

    reader.readAsText(file);
}
function resetExtension(){
    messageToBackground("downloadRepo");
}
async function deleteData(){
    const localData = await getLocalData("loginData");
    if(localData){
        const trs = document.querySelectorAll("tr.table-body");
        console.log(trs);
        for(tr of trs){
            const checkboxInput = tr.children[0].children[0]
            if(checkboxInput){
                const con2 = checkboxInput.classList[0] === "displayNone"
                if(checkboxInput.checked && !con2){
                    console.log("checkbox is checked");
                    const date = tr.children[1].innerText.split("-").join("_");
                    const Aid = tr.children[8].innerText;
                    const Bid = tr.children[9].innerText;
                    const AidSection = localData[Aid];
                    console.log("Aidsection is ",AidSection)
                    if(Bid.startsWith("B")){
                        console.log(Bid);
                        const opportunities = AidSection["opportunities"];
                        console.log("opportunities are ",opportunities)
                        if(opportunities.length > 0 && opportunities[0] !== null){
                            opportunities.forEach((opp,index) => {
                                console.log("opp is ",opp)
                                if(opp.bid === Bid){
                                    console.log("deletinng opportunity",opportunities)
                                    opportunities.splice(index,1);
                                }
                            })
                                
                        }else{
                            console.log("deleting section ",AidSection)
                            delete localData[Aid];
                            const deleteAid = await removeAidFromDateData(date,Aid);
                            if(deleteAid){
                                console.log("removeAidFromDateData => ",deleteAid);
                            }
                        }
                    }else{
                        console.log("deleting section ",AidSection)
                        delete localData[Aid];
                        const deleteAid = await removeAidFromDateData(date,Aid);
                        if(deleteAid){
                            console.log("removeAidFromDateData => ",deleteAid)
                        }
                    }
                    
                }else{
                    console.log("checkbox not checked")
                }
            }
        }
        console.log("remaining data",localData);
        const status = await commitChanges("loginData",localData);
        if(status === "success"){
            
            trs.forEach((tr)=> {
                tr.remove();
            })
            checkDates();
            deleteBtn.classList.add("displayNone");
            editBtn.classList.add("displayNone");
        }
    }
}
function loopCheckBoxes(event){
    let checkCount = 0
    const checkBoxes = document.querySelectorAll("tr td input[type='checkbox']");
    for(check of checkBoxes){
        const con2 = check.classList[0] === "displayNone"
        // console.log("con2 is ",con2)
        // console.log("check id ",check.parentNode.id)
        if(check.checked && !con2){
            console.log(check.classList)
            console.log("checkbox is checked");
            checkCount++;
        }
    }
    console.log("checkcount is ",checkCount)
    if(event.target.id.split("-")[0].includes("fd")){
        if(checkCount > 0){
            FDdeleteBtn.classList.remove("displayNone");
            checkCount = 0
        }else{
            FDdeleteBtn.classList.add("displayNone");
            checkCount = 0
        }

    }else{
        if(checkCount === 1){
            editBtn.classList.remove("displayNone");
        }else{
            editBtn.classList.add("displayNone");
        }
        if(checkCount > 0){
            deleteBtn.classList.remove("displayNone");
            checkCount = 0
        }else{
            deleteBtn.classList.add("displayNone");
            checkCount = 0
        }
    }
    
}
function showDeleteBtn(){
    let checkCount = 0
    const deleteBtn = document.querySelector("button.delete");
    const checkBoxes = document.querySelectorAll("tr td input[type='checkbox']");
    const editBtn = document.querySelector("button.edit.reportButtons");
    checkBoxes.forEach((box) => {
        box.addEventListener("click",()=>{
            
            for(check of checkBoxes){
                const con2 = check.classList[0] === "displayNone"
                console.log("con2 is ",con2)
                console.log("check id ",check.parentNode.id)
                if(check.checked && !con2){
                    console.log(check.classList)
                    console.log("checkbox is checked");
                    checkCount++;
                }
            }
            console.log("checkcount is ",checkCount)
            if(checkCount === 1){
                editBtn.classList.remove("displayNone");
            }else{
                editBtn.classList.add("displayNone");
            }
            if(checkCount > 0){
                deleteBtn.classList.remove("displayNone");
                checkCount = 0
            }else{
                deleteBtn.classList.add("displayNone");
                checkCount = 0
            }
        })
    })
    
    
}
function snoListeneraddCheckBox(event){
    
    downloadBtn.classList.add("displayNone");
    fmFormat.classList.add("displayNone")
    console.log(event)
    const snoText =  event.target.innerText
    
    document.querySelector(`td#${event.target.id} input`).classList.remove("displayNone");
    Array.from(event.target.childNodes).forEach((el) => {
        if(el.nodeName === "#text"){
            el.remove();
        }
    })
    event.target.removeEventListener("click",snoListeneraddCheckBox);
    loopCheckBoxes(event);
}
function snoToCheckBox(selector = "div#loginData tr.table-body"){
    // console.log("function running , snoToCheckBox");
    const trs = document.querySelectorAll(selector);
    console.log("sno checkboxes",trs);
    trs.forEach((tr) => {
        const sno = tr.children[0];
        sno.classList.add("table-sno");
        sno.addEventListener("click",snoListeneraddCheckBox)
    })
}
async function getDatesArrayISOString(startDate,endDate){
    const newStartDate = startDate.split("_").reverse().join("-");
    const newEndDate = endDate.split("_").reverse().join("-");
    const newDates = [];
    const Dates = []
    let start = false
    let stop = false
    const datesInData = await getLocalData("qrScans");
    for(let date in datesInData){
        newDates.push(date);
    }
    newDates.sort((a,b) => new Date(a) - new Date(b))
    console.log("sorted dates = ",newDates);
    for(let date of newDates){
        
        if(date === newStartDate){
            start = true
        }else if(date === newEndDate){
            console.log("it is enddate")
            stop = true
            
        }
        if(start === true && stop === false){
            Dates.push(date)
        }else if(stop === true){
            Dates.push(date)
            break;
        }
    }
    console.log("returning dates = ",Dates);
    return Dates
}
async function displayQrScansdates(start,end){
    let qrScans = null;
    const data = await getLocalData("qrScans");
    const qrScansCount = document.querySelector("span#qrScansCount");
    console.log("data = ",data,"date = ",start," => ",end);
    if(data && start && end){
        const newDates = await getDatesArrayISOString(start,end);
        for(date of newDates){
            qrScans = qrScans + data[date];
        }
        qrScansCount.innerText = qrScans
    }
}
async function displayQrScans(date = new Date().toISOString().split("T")[0]){
    let qrScans = null
    const data = await getLocalData("qrScans");
    const qrScansCount = document.querySelector("span#qrScansCount");
    console.log("data = ",data,"date = ",date)
    
    if(data){
        qrScans = data[date] || 0
    }else{
        qrScans = 0
    }
    console.log("displaying qr = ",qrScans)
    qrScansCount.innerText = qrScans;
}
async function checkDates(){
    console.log("checking dates")
    const startDate = changeDateFormat(document.querySelector("input#dateStart").value);
    const endDate = changeDateFormat(document.querySelector("input#dateEnd").value);
    console.log(startDate,endDate)
    if(startDate.length <= 10 && endDate.length <= 10){
        await getDatesData(startDate,endDate);
        await displayQrScansdates(startDate,endDate)
        await sleep(1000);
        snoToCheckBox();
        fmFormat.classList.add("displayNone");
    }else if(startDate !== ""){
        console.log("going with start date")
        await showLoginDataSingleDate();
        await displayQrScans(startDate.split("_").reverse().join("-"));
        await sleep(1000);
        snoToCheckBox()
    }else{
        console.log("something went wrong")
    }
    showDeleteBtn()
}

// listen
chrome.runtime.onMessage.addListener((message,sender, sendResponse) => {
    console.log(message.type)
    if (message.type === "toPopup"){
        console.log("message recieved in popup")
        console.log(message.text);
        sendResponse({ status: "Popup received the message!" });
    }
    else if (message.type === "notifyPopup"){
        console.log(message.text);
    }
    
})
generateReport.addEventListener("click",()=> {
    document.querySelectorAll("tr.table-body").forEach((tr)=> {
        tr.remove();
    })
    deleteBtn.classList.add("displayNone");
    editBtn.classList.add("displayNone");
    textBar.classList.add("displayNone");
    checkDates();
    // showLoginDataSingleDate();
})
downloadBtn.addEventListener("click",downloadData)
function showPages(pageId,Page){
    const pages = document.querySelectorAll("div.innerMain div.pages");
    for (let page of pages){
        if(page.id === pageId){
            page.classList.remove("displayNone");
            if(pageId === "loginData"){
                document.querySelector(".mainButtonsArea div.loginData").classList.remove("displayNone");
                
            }else{
                document.querySelector(".mainButtonsArea div.loginData").classList.add("displayNone");
                
            }
        }else if(page.id !== pageId){
            page.classList.add("displayNone");
            if(pageId === "loginData"){
                document.querySelector(".mainButtonsArea div.loginData").classList.remove("displayNone");
                
            }else{
                document.querySelector(".mainButtonsArea div.loginData").classList.add("displayNone");
            }
        }
    }
}
function dateReverse(){
    const trs = document.querySelectorAll("tr.table-body");
    trs.reverse()
    console.log(trs)
    const trs2 = trs
    const tablebody = document.querySelector("div#loginTable table tbody");
    trs.forEach(tr => {
        tr.remove()
    })
    console.log(trs2)
    trs2.reverse();
    tablebody.append(trs2);
}
async function handleToggles(event){
    const data = await getLocalData("permissions");
    if(data){
        console.log(event);
        if(event.target.checked === true){
            data[event.target.id] = true
            //set refresh parameter to default when user check the toggle.
            if(event.target.id === "autoRefresh"){
                data["refreshParameter"] = {
                    dayNumber : 1,
                    howOften : "Daily",
                    weekName : "Monday"
                }
            }else if(event.target.id === "messenger"){
                const priority = document.querySelector(`div.messegePriority input#R${data.messagePriority}`);
                if(priority){
                    console.log(priority)
                    priority.checked = true
                }  
            }
            const childParameters = document.querySelectorAll(`span.childParameters.${event.target.id}`);
            if(childParameters && childParameters.length > 0){
                for (child of childParameters){
                    child.classList.remove("displayNone");
                }
                // loadToggles();
            }
            
        }else if(event.target.checked === false){
            data[event.target.id] = false
            const childParameters = document.querySelectorAll(`span.childParameters.${event.target.id}`);
            if(childParameters && childParameters.length > 0){
                for (child of childParameters){
                    child.classList.add("displayNone");
                }
            }
        }
        console.log("changes are : ",data);
        commitChanges("permissions",data);
        messageToBackground("downloadRepo")
        // chrome.runtime.reload()
    }
}

async function loadRefreshParameters(howOften){
    const weekList = document.querySelector("div#dropdownOuter");
    const dayCol = document.querySelector("div#dayPicker");

    const weekText = document.querySelector("span.dropdownText");
    weekText.innerText = newPermissions.refreshParameter.weekName

    const dayDiv = document.querySelector("div#oftenDay");
    dayDiv.innerText = newPermissions.refreshParameter.dayNumber || 0
    switch(howOften){
        case "Daily":
            weekList.classList.add("displayNone");
            dayCol.classList.add("displayNone");
            break;
        case "Weekly":
            weekList.classList.remove("displayNone")
            dayCol.classList.add("displayNone");
            // const weekText = document.querySelector("span.dropdownText");
            // weekText.innerText = newPermissions.refreshParameter.weekName
            break;
        case "Monthly":
            weekList.classList.add("displayNone");
            dayCol.classList.remove("displayNone");
            // const dayDiv = document.querySelector("div#oftenDay");
            // dayDiv.innerText = newPermissions.refreshParameter.dayNumber || 0
            break;
    }
}
async function loadToggles(){
    console.log("function running : loadToggles");
    const toggles = document.querySelectorAll(".toggle-checkbox");
    console.log(toggles);
    for (let toggle of toggles){
        if(toggle.checked === true){
            console.log("toggle is checked : ",toggle.id);
            const childParameter = document.querySelector(`span.childParameters.${toggle.id}`);
            if(childParameter){
                childParameter.classList.remove("displayNone");
                const data = await getLocalData("permissions");
                if(data){
                    if(toggle.id === "messenger"){
                        console.log(data.messagePriority)
                        const priority = document.querySelector(`div.messegePriority input#R${data.messagePriority}`);
                        if(priority){
                            console.log(priority)
                            priority.checked = true
                        }   
                    }else if(toggle.id === "qrScans"){
                        const urlInput = document.querySelector("input#qrUrl");
                        if(urlInput){
                            urlInput.value = data.qrUrl
                        }
                    }else if(toggle.id === "invoiceNumber"){
                        const invoiceNumberInput = document.querySelector("input#invoiceNumber-input");
                        if(invoiceNumberInput){
                            invoiceNumberInput.value = data.invoiceNumberSeries
                        }
                    }else if(toggle.id === "autoRefresh"){
                        const refreshParameter = document.querySelector(`input#${data["refreshParameter"]["howOften"]}`);
                        if(refreshParameter){
                            console.log(refreshParameter)
                            refreshParameter.checked = true
                            loadRefreshParameters(refreshParameter.value);
                        }else{
                            console.log("refresh parametr not found");
                        }
                    }
                }
                
            }
        }
    }
}
async function loadpermissions(){
    console.log("loading permissions")
    const data = await getLocalData("permissions");
    if(data){
        for(entry in data){
            const toggle = document.querySelector(`#${entry}`);
            if(toggle){
                toggle.checked = data[entry];
            }
        }
        loadToggles()
    }
    
}
function togglesListener(){
    const toggles = document.querySelectorAll("input.toggle-checkbox");
    if(toggles && toggles.length > 0){
        console.log(toggles);
        toggles.forEach(toggle => {
            toggle.addEventListener("click",handleToggles)
        })
    }else{
        console.log("toggles not found");
    }
}
async function messagePriority(event){
    console.log("event is ",event);
    const data = await getLocalData("permissions");
    if(data){
        if(event.target.name === "Radio"){
            console.log("radio clicked",event.target.value);
            data.messagePriority = Number(event.target.value)
        }
        commitChanges("permissions",data)
    }
    
}
async function handleDaypicker(event){
    console.log("event is ",event);
    
    const calender = document.querySelector("div.calender");
    const dayNumber = document.querySelector("div#oftenDay");
    if(event.target.localName === "span" && dayNumber){
        dayNumber.innerText = event.target.innerText
        const data = await getLocalData("permissions");
        if(data){
            data.refreshParameter.dayNumber = event.target.innerText
            // console.log("new data = ",data);
            commitChanges("permissions",data);
        }
    }
    if(calender.classList[0] === "displayNone" || calender.classList[1] === "displayNone"){
        calender.classList.remove("displayNone");
    }else{
        calender.classList.add("displayNone");
    }
    
}
async function refreshHowOften(event){
    console.log("event is ",event);
    const data = await getLocalData("permissions");
    if(data && event.target.name === "rpRadio"){
        console.log("radio clicked ",event.target.value);
        data["refreshParameter"]["howOften"]  = event.target.value
        commitChanges("permissions",data);
        const weekList = document.querySelector("div#dropdownOuter");
        const dayCol = document.querySelector("div#dayPicker");
        switch(event.target.value){
            case "Daily":
                weekList.classList.add("displayNone");
                dayCol.classList.add("displayNone");
                break;
            case "Weekly":
                weekList.classList.remove("displayNone");
                dayCol.classList.add("displayNone");
                break;
            case "Monthly":
                weekList.classList.add("displayNone");
                dayCol.classList.remove("displayNone");
                break;
        }
    }
}
async function invoiceInput(event){
    console.log("event is ",event);
    const data = await getLocalData("permissions");
    const input = document.querySelector("input#invoiceNumber-input");
    const arrowBtn = document.querySelector("span.childParameters.invoiceNumber span.innerArrows");
    if(data && input && arrowBtn){
        data.invoiceNumberSeries = input.value.toUpperCase();
        commitChanges("permissions",data).then(status => {
            if(status === "success"){
                arrowBtn.id = "";
                arrowBtn.innerText = " -> "
            }else{
                console.log("error committing changes");
            }
        })

    }
}
async function urlInput(event){
    console.log("event is ",event);
    const data = await getLocalData("permissions");
    const input = document.querySelector("input#qrUrl");
    const arrowBtn = document.querySelector("span.childParameters.qrScans span.innerArrows")
    if(data && input && arrowBtn){
        data.qrUrl = input.value
        commitChanges("permissions",data).then(status => {
            if(status === "success"){
                arrowBtn.id = "";
                arrowBtn.innerText = " -> "
            }else{
                console.log("error committing changes");
            }
        })

    }
}
function combineEDIT(event){
    textBar.classList.remove("displayNone");
    const editables = document.querySelectorAll(".TDeditable")
    for(edit of editables){
        edit.setAttribute("class","TDnonEditable");
        edit.removeEventListener("click",combineEDIT)
    }
    event.target.setAttribute("class","TDeditable")
    
    textBar.value = event.target.innerText;
    textBar.addEventListener("click",()=>{
        editBtn.classList.add("displayNone")
        event.target.innerText = ""
        const textArea = document.createElement("input");
        textArea.type = "text"
        textArea.value = textBar.value;
        event.target.append(textArea);
        textArea.addEventListener("input",()=>{
            textBar.value = textArea.value;
        })
        textBar.addEventListener("input",()=>{
            textArea.value = textBar.value;
        })
        saveBtn.classList.remove("displayNone");
        saveBtn.addEventListener("click",async () => {
            const tr = document.querySelector('tr.table-body');
            // console.log("tr is ",tr)
            const Aid = tr.children[8].innerText;
            const Bid = tr.children[9].innerText;
            // console.log("aid is ",Aid)
            const text = textBar.value
            const location = event.target.id;
            console.log("location is ",location)
            const loginData = await getLocalData("loginData");
            
            if(loginData){
                const AidSection = loginData[Aid];
                if(Bid.startsWith("B")){
                    const opportunities = AidSection.opportunities;
                    console.log("old opportunities ",opportunities)
                    for(opp of opportunities){
                        if(opp.bid === Bid){
                            opp[location] = text
                        }
                    }
                    console.log("new opportunities = ",opportunities);
                    AidSection.opportunities = opportunities;
                }else{
                    AidSection[location] = text;
                }
                const AidData = {
                    [Aid] : AidSection
                }
                console.log("inner change is ",AidData);
                const changes = {...loginData,...AidData};
                console.log("changes are",changes);
                const request = await commitChanges("loginData",changes);
                if(request === "success"){
                    tr.remove();
                    checkDates();
                    editBtn.classList.add("displayNone");
                    saveBtn.classList.add("displayNone");
                    textBar.classList.add("displayNone");
                }
            }
        },{once:true})
    },{once:true})
}

async function editData(){
    deleteBtn.classList.add("displayNone");
    console.log("function running editData")
    const table = document.querySelectorAll("tr.table-body");
    console.log("table is ",table);
    for (tr of table){
        const checkbox = tr.children[0].children[0]
        if(checkbox){
            console.log("checkbox found",checkbox)
            const classes = checkbox.classList
            console.log("classes are ",classes);
            const condition = classes[0] === "displayNone"
            console.log("condition is ",condition)
            if(checkbox.checked === true && !condition){
                console.log("checkbox checked",checkbox)
                tr.children[10].classList.add("TDeditable");
                tr.children[10].id = "userStatus"
                tr.children[16].classList.add("TDeditable");
                tr.children[16].id = "userRemark1"
                tr.children[17].classList.add("TDeditable");
                tr.children[17].id = "userRemark2"
                console.log("tr.children",tr.children)
                for(td of tr.children){
                    console.log("tds are ",td)
                    if(td.classList.contains("TDeditable")){
                        td.addEventListener("click",combineEDIT);
                    }else{
                        td.classList.add("TDnonEditable");
                    }
                }
            }else{
                console.log("checkbox not checked or contains displayNone",checkbox);
                tr.remove()
            }
        }
    }


}

function removeLoginDataTableBody(){
    document.querySelectorAll("tr.table-body").forEach((tr)=> {
        tr.remove();
    })
}
function removeFosTableBody(){
    const trs = document.querySelectorAll(".fosDetails-table table tr.fosDetails-body");
    if(trs && trs.length > 0){
        for(tr of trs){
            tr.remove()
        }
    }else{
        console.log("table row not found");
    }
}
async function loadFosDetails(){
    
    const data = await getLocalData("fosDetails");
    const fosDetailsTable = document.querySelector("div.fosDetails table tbody");
    if(fosDetailsTable){
        console.log("table found",fosDetailsTable)
        let sno = 1 
        for (entry in data){
            const row = document.createElement("tr");
            row.classList.add("fosDetails-body");
            const trData = [];
            trData.push(sno)
            trData.push(entry);
            trData.push(data[entry].finOneCode);
            trData.push(data[entry].nickName);
            console.log("trdata is ",trData)
            let column = true
            let count = 0
            for(let tdData of trData){
                count = count + 1
                const td = document.createElement("td");
                td.id = `fd-${alphabets[count]}${sno}`
                td.innerText = tdData;
                if(column === true){
                    const checkbox = document.createElement("input")
                    checkbox.type = "checkbox";
                    checkbox.checked = true;
                    checkbox.classList.add("displayNone");
                    td.append(checkbox)
                    column = false
                }
                row.append(td);
            }
            fosDetailsTable.append(row);
            sno++;
        }
        snoToCheckBox("div.fosDetails table tbody tr.fosDetails-body");
    }else{
        console.log("table not found")
    }
    
}
async function saveFosDetailsRow(event){
    const trs = document.querySelectorAll(".fosDetails-table table tr.fosDetails-body");
    if(trs && trs.length > 0){
        console.dir(trs);
        for(tr of trs ){
            console.dir("tr is ",tr)
            const node1 = tr.children[1].children[0]
            const node2 = tr.children[2].children[0]
            const node3 = tr.children[3].children[0]
            if(node1){
                if(node1.nodeName === "INPUT"){
                    console.log("node with input found",node1);
                    const fosName = node1.value;
                    const finOneCode = node2.value;
                    const nickName = node3.value
                    if(fosName && finOneCode){
                        const fosDetails = await getLocalData("fosDetails");
                        if(fosDetails){
                            fosDetails[fosName] = {
                                "finOneCode":finOneCode,
                                "nickName":nickName
                            };
                            console.log("changes are ",fosDetails);
                            await commitChanges("fosDetails",fosDetails);
                            await removeFosTableBody();
                            loadFosDetails();
                            document.querySelector("div#home div.tableButtons button#add").classList.remove("displayNone");
                            event.target.remove();
                        }
                    }else{
                        console.log("please enter data");
                    }
                }
            }
        }
        
    }
}
function loadEmptyFosDetailsRow(event){
    saveFosDetailsBtn.classList.remove("displayNone");
    event.target.classList.add("displayNone");
    const fosDetailsTable = document.querySelector("div.fosDetails table tbody");
    console.log('creating empty row');
    const row = document.createElement("tr");
    row.classList.add("fosDetails-body")
    const bodylength = document.querySelectorAll("tr.fosDetails-body");
    let sno = bodylength?.length + 1
    for (let start = 1 ; start <= 4 ; start++){
        const td = document.createElement("td");
        if(start === 1){
            td.innerText = sno;
        }else{
            const input = document.createElement("input");
            input.type = "text";
            td.append(input);
        }
        row.append(td);
    }
    fosDetailsTable.append(row);
    saveFosDetailsBtn.classList.remove("displayNone");

}
async function deleteFDdata(){
    const data = await getLocalData("fosDetails");
    const trs = document.querySelectorAll("tr.fosDetails-body");
    if(data && trs && trs.length > 0){
        for(tr of trs){
            const checkbox = tr.children[0].children[0]
            if(checkbox.checked === true && checkbox.classList[0] !== "displayNone"){
                console.log("checkbox found",checkbox);
                const key = tr.children[1].innerText;
                const value = tr.children[2].innerText;
                if(key && value){
                    delete data[key];
                }
            }
        }
        console.log("changes are ",data);
        commitChanges("fosDetails",data).then(async status => {
            await removeFosTableBody();
            loadFosDetails();
            FDdeleteBtn.classList.add("displayNone")
        })

    }
}
async function fmData(){
    downloadBtn.classList.add("displayNone");
    generateReport.classList.add("displayNone");
    const table = document.querySelector("div#loginTable table tbody");
    const trs = document.querySelectorAll("div#loginTable table tbody tr.table-body");
    if(trs && trs.length > 0){
        console.log("trs are ",trs);
        for (tr of trs){
            for(td of tr.children){
                
                if(
                    td.innerText.toLowerCase().includes("enquiry") || 
                    td.innerText.toLowerCase().includes("process dropped") || 
                    td.innerText.toLowerCase().includes("need remark") ||
                    td.innerText.toLowerCase().includes("ltv")
                ){
                    tr.remove();
                }
            }
            if(tr.children[10].innerText.toLowerCase().includes("approved")){
                tr.remove();
            }
        }
        const secondTrs = document.querySelectorAll("div#loginTable table tbody tr.table-body");
        if(secondTrs && secondTrs.length > 0){
            let once = true
            for (tr of secondTrs){
                const newRow = document.createElement("tr");
                newRow.classList.add("table-body-fm")
                const newTr = {}
                newTr["Customer Number"] = tr.children[7].innerText;
                newTr["Customer Name"] = tr.children[6].innerText;
                newTr["Product Name"] = tr.children[12].innerText + " " + tr.children[11].innerText.toUpperCase()
                newTr["Price"] = tr.children[13].innerText;
                newTr["Executive Name"] = tr.children[4].innerText;
                newTr["Login Id"] = tr.children[9].innerText;
                if(
                    tr.children[10].innerText.toLowerCase().includes("rcu") ||
                    tr.children[10].innerText.toLowerCase().includes("block")
                ){
                    newTr["Status"] = "REJECTED";
                }else{
                    newTr["Status"] = tr.children[10].innerText.toUpperCase();
                }
                for(let start = 1; start <= 13; start++){
                    newTr[`Z${start}`] = ""
                }
                if(tr.children[14].innerText.toLowerCase() === "billed"){
                    newTr["Billed"] = "BILLED IN BFL"
                }else{
                    newTr["Billed"] = "REJECTED"
                }
                if(
                    tr.children[16].innerText.toLowerCase().includes("restricted") ||
                    tr.children[16].innerText.toLowerCase().includes("auth status") ||
                    tr.children[16].innerText.toLowerCase().includes("rcu") ||
                    tr.children[16].innerText.toLowerCase().includes("cibil")
                ){
                    newTr["Reason"] = tr.children[17].innerText;
                }else{
                    newTr["Reason"] = tr.children[16].innerText;
                }
                if(once === true){
                    const newRow = document.createElement("tr")
                    for(tdText in newTr){
                        const th = document.createElement("th");
                        th.innerText = tdText
                        newRow.append(th);
                    }
                    const header = document.querySelector("div#loginTable table tbody tr.table-heading");
                    header.remove();
                    table.prepend(newRow)
                    once = false
                }
                for(tdText in newTr){
                    
                    const td = document.createElement("td");
                    td.innerText = newTr[tdText];
                    newRow.append(td)
                }
                console.log("new row is =>",newRow);
                table.append(newRow);
                tr.remove()
            }

        }
    }
}
function handleDropdown(){
    const dropDownText = document.querySelector("span.dropdownText");
    const dropDown = document.querySelector("div#dropdownContainer");
    dropDown.addEventListener("click",async (event)=> {
        console.log("element clicked",event);
        if(event.target.localName === "li"){
            dropDownText.innerText = event.target.innerText
            const data = await getLocalData("permissions");
            if(data){
                data.refreshParameter.weekName = event.target.id;
                console.log("new data = ",data);
                commitChanges("permissions",data);
            }
        }
        if(dropDown.classList[0] === "dropdownActive" || dropDown.classList[1] === "dropdownActive"){
            dropDown.classList.remove("dropdownActive");
        }else{
            dropDown.classList.add("dropdownActive");
        }
    });
    
    
}
function eventListeners(){
    // console.log("function running eventListeners");
    
    const addRow = document.querySelector("div#home div.tableButtons button#add");
    addRow.addEventListener("click",loadEmptyFosDetailsRow);
    fmFormat.addEventListener("click",fmData);
    saveFosDetailsBtn.addEventListener("click",saveFosDetailsRow);
    const restoreBtn = document.querySelector("button#restoreBackup");
    restoreBtn.addEventListener("click",restoreBackup)
    const resetBtn = document.querySelector("button.resetExtension");
    resetBtn.addEventListener("click",resetExtension);
    deleteBtn.addEventListener("click",deleteData);
    editBtn.addEventListener('click',editData);
    FDdeleteBtn.addEventListener("click",deleteFDdata);
    const date = document.querySelector("tr.table-heading th#head2");
    date.removeEventListener("click",dateReverse);
    date.addEventListener("click",dateReverse);
    togglesListener();
    const radios = document.querySelector('div.messegePriority');
    radios.removeEventListener("click",messagePriority);
    radios.addEventListener("click",messagePriority);
    const refreshRadios = document.querySelector("div.autoRefreshParameters");
    refreshRadios.removeEventListener("click",refreshHowOften);
    refreshRadios.addEventListener("click",refreshHowOften);
    
    const urlSave = document.querySelector("span.childParameters.qrScans span.innerArrows");
    if(urlSave){
        urlSave.addEventListener("click",urlInput);
    }
    const invoiceSave = document.querySelector("span.childParameters.invoiceNumber span.innerArrows");
    if(invoiceSave){
        invoiceSave.addEventListener("click",invoiceInput);
    }
    const arrowBtns = document.querySelectorAll("span.childParameters span.innerArrows");
    if(arrowBtns && arrowBtns.length > 0){
        console.log("arrowBtns found", arrowBtns); 
        arrowBtns.forEach((btn) => {
            btn.addEventListener("click",()=> {
                btn.classList.add("arrowAfterClick");
                console.log("button clicked",btn);
            });
        })
    }
    
    document.querySelector("button#backup").addEventListener("click",async () => {
        saveLocalData();
        

    })
}
function urlInputHandle(){
    const inputs = document.querySelectorAll("input.permissions-custom-input");
    const arrowBtn = document.querySelector("span.childParameters.qrScans span.innerArrows");
    if(inputs && inputs.length > 0){
        console.log("urlInput found", inputs);
        inputs.forEach(input => {
            input.addEventListener("input", (event)=> {
                // console.log("event is ",event);
                const newArrowBtn = event.target.parentElement.firstElementChild;
                // console.log("new arrow btn =",newArrowBtn);
                newArrowBtn.innerText = "Save";
                newArrowBtn.id = "arrowTosave";
            });
        })
    }
}
function loadExtensionDetails(){
    const manifest = chrome.runtime.getManifest();
    const extensionName = document.querySelector("div.extensionDetails div.extensionDetails-details.name span.pair");
    extensionName.innerText = manifest.name;
    const adminName = document.querySelector("div.extensionDetails div.extensionDetails-details.admin_name span.pair");
    adminName.innerText = manifest.admin_name;
    const version = document.querySelector("div.extensionDetails div.extensionDetails-details.manifest_version span.pair");
    version.innerText = manifest.version;

    const lastUpdated = document.querySelector("div.extensionDetails div.extensionDetails-details.last_updated span.pair");
    lastUpdated.innerText = newPermissions.lastExtensionRefreshed.split("-").reverse().join("-");
    const lastBackup = document.querySelector("div.extensionDetails div.extensionDetails-details.last_backup span.pair");
    lastBackup.innerText = newPermissions.lastDataBackup.split("-").reverse().join("-");
}
function displayActivePageElements(){
    console.log("function running activePage");
    const activePage = document.querySelector("header span.active");
    const activePageid = activePage.id;
    console.log("active page is ",activePageid)
    switch(activePageid){
        case "home":
            saveFosDetailsBtn.classList.add("displayNone");
            FDdeleteBtn.classList.add("displayNone");
            removeLoginDataTableBody()
            removeFosTableBody();
            loadFosDetails();
            loadExtensionDetails();
            break;
        case "loginData":
            removeFosTableBody();
            displayQrScans();
            break;
        case "permissions":
            loadpermissions();
            urlInputHandle();
            break;
    }
}
displayActivePageElements()
const pagesBtn = document.querySelectorAll("header span")
pagesBtn.forEach((page,inx) => {
    page.addEventListener("click", (event) => {
        showPages(page.id,page);
        for(p of pagesBtn){
            if(p.id === page.id){
                p.classList.add("active");
                p.parentNode.classList.add("inlineHeader");
            }else{
                p.classList.remove("active");
                p.parentNode.classList.remove("inlineHeader");
            }
        }
        displayActivePageElements()
    })
})


document.addEventListener("DOMContentLoaded",eventListeners)

