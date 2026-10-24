console.log("Script started");
let closeTab = false;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const remindersOnRefresh = {
}

function dataBackup() {
  chrome.storage.local.get(null, function(data) {
    const jsonData = JSON.stringify(data, null, 2); // Pretty-print
    const base64Data = btoa(unescape(encodeURIComponent(jsonData)));
    const dataUrl = `data:application/json;base64,${base64Data}`;
    const newDate = new Date
    const date = newDate.toISOString().split("T")[0];
    chrome.downloads.download({
      url: dataUrl,
      filename: `backup ${date}.json`
    }, (downloadId) => {
      if (chrome.runtime.lastError) {
        console.error("Download error:", chrome.runtime.lastError.message);
      } else {
        console.log("Download started with ID:", downloadId);
      }
    });
  });
}
function saveScreenshot(dataUrl) {
  // Convert the data URL to a Blob
  fetch(dataUrl)
    .then((response) => response.blob())
    .then((blob) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result;
        const filename = "screenshot_" + Date.now() + ".png";
        chrome.downloads.download(
          {
            url: base64data,
            filename: filename,
            saveAs: false,
          },
          function (downloadId) {
            if (chrome.runtime.lastError) {
              console.error(
                "Error downloading file:",
                chrome.runtime.lastError
              );
            } else {
              console.log("Download initiated with ID:", downloadId);
            }
          }
        );
      };
      reader.readAsDataURL(blob);
    })
    .catch((error) => {
      console.error("Error converting data URL to Blob:", error);
    });
}
async function addQrCount(){
  const data = await getLocalData("qrScans");
  const date = new Date().toISOString().split("T")[0];
  if(data){
    const previousScans = data[date];
    if(previousScans){
      data[date] = previousScans + 1;
    }else{
      data[date] = 1;
    }
    commitChanges("qrScans",data)
  }
}
const screenshotHistory = {}
async function captureScreenshot() {
  await sleep(1000)
  const timeNow = Date.now();
  const timeThen = screenshotHistory.lastCaptured
  const con1 = timeNow - timeThen >= 10000
  if(!screenshotHistory.lastCaptured || con1){
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error("error capturing tab : ", chrome.runtime.lastError);
        return;
      }
      screenshotHistory["lastCaptured"] = Date.now();
      addQrCount();
      saveScreenshot(dataUrl);
    });
  }else{
    console.log("screenshot history is too recent");
  }
}
function messageToContentManyTimes(action,times) {
  return new Promise((resolve) => {
    let sent = false
    let trials = 0
    const interval = setInterval(()=> {
      if(sent === false && trials <= times){
        trials = trials + 1
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (
            tabs.length === 0 ||
            !tabs[0].url ||
            tabs[0].url.startsWith("chrome://")
          ) {
            console.error("No valid active tab found.");
            return "failed";
          }
          chrome.tabs.sendMessage(tabs[0].id, action, (response) => {
            console.log("message sent to content",action);
            
            if (chrome.runtime.lastError) {
              console.error("Error:", chrome.runtime.lastError.message);
            } else {
              console.log("Response from content script:", response);
              if(response === action.action)
              sent = true
              clearInterval(interval);
              resolve(response);
            }
          });
        });
      }else{
        reject("timeout message not sent")
      }
    },500)
    
  });
}
function messageToContent(action) {
  return new Promise((resolve) => {
    // Query the active tab in the current window
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (
        tabs.length === 0 ||
        !tabs[0].url ||
        tabs[0].url.startsWith("chrome://")
      ) {
        console.error("No valid active tab found. to recieve message",action);
        return "failed";
      }
      // Send a message to the content script in the active tab
      chrome.tabs.sendMessage(tabs[0].id, action, (response) => {
        console.log("message sent to content",action);
        const time = Date.now();
        if (chrome.runtime.lastError) {
          console.error("Error:", chrome.runtime.lastError.message);
        } else {
          console.log("Response from content script:", response);
          resolve(response);
        }
      });
      
    });
    
  });
}
function permissions(){
    return new Promise(async (resolve,reject) => {
        const permissions = await getLocalData("permissions");
        if(permissions){
            resolve(permissions)
        }
    })
}
let newPermissions
permissions().then(data => {
  newPermissions = data
  const date = new Date
  const newDate = date.toISOString().split("T")[0];
  if(data.lastExtensionRefreshed != newDate){
    data.lastExtensionRefreshed = newDate;
    commitChanges("permissions",data);
    messageToContent({action:"showAlert",text:"Extension will close now, you can open it again."})
  }
})


function commitChanges(left,right){
  return new Promise((resolve,reject) => {
    chrome.storage.local.set({[left] : right}, function(){
      if(chrome.runtime.lastError){
        reject("failed");
      } else{
        
        resolve("success");
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
        console.log("data fetched : ", request[left]);
        resolve(request[left]);
      }
    })
  })
}
async function setBidToAid(Aid,Bid){
  const data = await getLocalData("bidToAid");
  if(data){
    data[Bid] = Aid;
    console.log("new change = ",{[Bid] : Aid})
    commitChanges("bidToAid",data);
  }
}
async function checkAid(data){
  const oldData = await getLocalData("DateToAid");
  return new Promise (resolve => {
    const Aid = data.Aid;
    if(oldData){
      let found = false;
      for (date in oldData){
        for (let exAid of oldData[date]){
          if (exAid == Aid){
            found = true;
            console.log("Aid already there")
            const returnData = {
              "date" : date,
              "result" : "oldAid",
              "oldData" : oldData
            }
            resolve(returnData)
            break;
          }
        }
        if(found){break}
      }
      const returnData = {
        "result" : "newAid",
        "oldData" : oldData
      }
      resolve(returnData)
    }else{
      const returnData = {
        "result" : "noData",
        "oldData" : oldData
      }
      resolve(returnData);
    }
  })
}
async function addEtbCardData(data){
  console.log("addEtbCardData : ",data)
  const opportunities = data.opportunities;
  console.log(opportunities)
  if(opportunities){
    delete data.opportunities;
    console.log("new opportunities : ",opportunities)
  }
  oldData = await getLocalData("loginData");
  if(oldData){
    const Aid = oldData[data.Aid];
    if(opportunities && opportunities.length > 0 && opportunities[0] !== null){
      const oldOpp = Aid.opportunities
      let newOpportunities = []
      console.log(oldOpp ?? null)
      if(!oldOpp || oldOpp?.length < 1 || oldOpp[0] === null){
        console.log("no opportunities found");
        newOpportunities.push(...opportunities)
      }else{
        console.log("new opps are ",opportunities);
        console.log("old opps are ",oldOpp);
        if(opportunities && opportunities.length > 0 && opportunities[0] !== null){
          
          console.log("opportunities found");
          let oppArray = [];
          opportunities.forEach((opp,inx) => {
            if(opp && opp !== null){
              setBidToAid(data.Aid,opp.bid);
              if(oppArray.includes(opp.bid)){
                console.log("opp already there");
                opportunities.splice(inx,1);
              }else{
                console.log("pushing to array",opp," => ",oppArray);
                oppArray.push(opp.bid);
              }
            }else{
              opportunities.splice(inx,1);
            }
          })
          oldOpp.forEach((opp,inx) => {
            if(opp && opp !== null){
              if(oppArray.includes(opp.bid)){
                console.log("opp already there");
                oldOpp.splice(inx,1);
              }else{
                console.log("pushing to array",opp," => ",oppArray);
                oppArray.push(opp.bid);
              }
            }else{
              oldOpp.splice(inx,1);
            }
            
          })
          newOpportunities.push(...opportunities ?? []);
          newOpportunities.push(...oldOpp ?? []);
          console.log("new opp")
        }

      }
      Aid.opportunities = newOpportunities;
    }
    console.log("Aid section is",Aid)
    innerChange = {...Aid, ...data}
    console.log("innerchange is : ",innerChange)
    changes = {...oldData, [data.Aid]:innerChange}
    console.log("changes are ",changes)
    commitChanges("loginData",changes).then( result=> {
      console.log("new data added");
    })
  }
}
async function handleOldAid(data,date){
  const request = await messageToContent({
    action : "getConfirmationForSameAid",
    date : date
  })
  if(request){
    console.log("handleOldAid | recieved response ",request);
    if(request.response !== null){
      console.log("handleOldAid | ",data);
      const aidList = await getLocalData("aidSearchHistory");
    }
  }
}
async function addLoginData(Aid,data){
  console.log("handleNewAid")
  const loginData = await getLocalData("loginData")
  return new Promise (resolve => {
    const AidData = {
      [Aid] : data
    }
    if(loginData){
      const changes = {...loginData,...AidData}
      commitChanges("loginData",changes).then(result => {
        resolve(result)
      }).catch(error => resolve(error))
    }else{
      commitChanges("loginData",AidData).then(result => {
        resolve(result)
      }).catch(error => resolve(error))
    }
  })
  
}
function addDateData(Aid, oldData, data){
  return new Promise ((resolve, reject) => {
    const dateSection = oldData[data.date]
    if(dateSection){
      dateSection.push(Aid);
      const changes = {...oldData, [data.date] : dateSection}
      commitChanges("DateToAid",changes).then(result => {
        resolve(result)
      }).catch(error => resolve(error))
    }else{
      const dateSection = []
      dateSection.push(Aid)
      const changes = {...oldData, [data.date] : dateSection}
      commitChanges("DateToAid",changes).then(result => {
        resolve(result)
      }).catch(error => resolve(error))
    }
  })
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
function handleNoData(Aid,data){
  console.log("handleNoData");
  addLoginData(Aid,data).then(result => {
    if(result === "success"){
      const dateSection = {
        [data.date] : [Aid]
      }
      commitChanges("DateToAid",dateSection).then(result => {
        if(result === "success"){
          console.log("New Aid successfully added")
        }else if (result === "failed"){
          console.log("Failed to add new Aid in DateToAid")
          removeAidFromLoginData(Aid).then(result => {
            console.log("Aid removed from LoginData")
          })
        }
      })
    }
  })
}

function handleLoginData(data){
  const Aid = data.Aid
  console.log("handleLoginData => recieved data : ", data)
  if(data.approvalType === "numberSearch"){
    checkAid(data).then ( result => {
      switch (result.result){
        case "oldAid":
          handleOldAid(data,result.date)
          break;
        case "newAid":
          addLoginData(Aid,data).then(result2 => {
            if(result2 === "success"){
              addDateData(Aid,result.oldData,data).then(result3 => {
                if(result3 === "success"){
                  console.log("new Aid addition success")
                }else{
                  console.log("new Aid addition in date failed")
                  removeAidFromLoginData(Aid).then(result => {
                    if(result === "success"){
                      console.log("new Aid removal from loginData success")
                      console.log("new Aid addition failed")
                    }
                  })
                }
              })
            }else{
              console.log("new Aid addition failed")
            }
          })
          break;
        case "noData":
          handleNoData(Aid,data)
          break;
      }
    })
  }else if(data.approvalType === "pageRefresh"){
    addEtbCardData(data);
  }
}


const retryUrlCheck = {}
const urlCheck = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (
      tabs.lenghth === 0 ||
      !tabs[0].url ||
      tabs[0].url.startsWith("chrome://")
    ) {
      console.error("No valid active tab found");
      const timeNow = (new Date()).toISOString().split("T")[1].split(":",2).join("-");
      if(retryUrlCheck[timeNow]){
        if(retryUrlCheck[timeNow] <= 5){
          sleep(1000).then(i => {
            retryUrlCheck[timeNow] = retryUrlCheck[timeNow] + 1
            urlCheck();
          })
        }else{
          console.log(`retry urlCheck limit reached = ${retryUrlCheck[timeNow]} ---> ${retryUrlCheck}`);
        }
      }else{
        sleep(1000).then(i=> {
          retryUrlCheck[timeNow] = 1
          urlCheck();
        })
      }
      return;
    }
    const url = tabs[0].url;
    const title = tabs[0].title
    const tabId = tabs[0].id
    if (url.startsWith("https://bflconsumer.my.site.com/dealercommunityreinvent")) {
      messageToContent({ action: "checkReinventAutomationPagesList" });
      if(url.includes("di-report")){
        console.log("you are on opportunity page");
        messageToContent({ action: "di-report" });
      }else if(url.includes("report")){
        console.log("you are on report page");
        messageToContent({ action: "handleReports" });
      }
      if (url.startsWith("https://bflconsumer.my.site.com/dealerRevamp/s/customer/")){
        console.log("you are viewing customer");
        messageToContent({ action: "getCustomerData" });
      }else if(url.startsWith("https://bflconsumer.my.site.com/dealerRevamp/s/opportunity/") && url !== "https://bflconsumer.my.site.com/dealerRevamp/s/opportunity/Opportunity/Default"){
        console.log("you are on bid page");
        console.log("checking reminders on refresh => ",remindersOnRefresh);
        // conditions for submit for qc
        const con1 = remindersOnRefresh.submitForQc;
       // conditions for submit for qc
        const RS_con1 = remindersOnRefresh.responsiveSubmit;
        const timeNow =  Date.now(); 
        if(con1){
          const con2 = remindersOnRefresh.submitForQc?.url === url;
          const timeThen = remindersOnRefresh.submitForQc?.time
          const wait = remindersOnRefresh.submitForQc?.wait
          const con3 = timeNow - timeThen < wait;
          console.log("conditions are => | 1 |",con1,"| 2 |",con2,`| 3 | ( ${timeNow} - ${timeThen} ) = `,con3);
          if(con2 && con3){
            messageToContent({ action: "submitForQc" });
            delete remindersOnRefresh.submitForQc
          }
        }
        if(RS_con1){
          const RS_con2 = remindersOnRefresh.responsiveSubmit?.url === url || url.includes(remindersOnRefresh.responsiveSubmit?.bid || tabId === remindersOnRefresh.responsiveSubmit?.tabId);
          const RS_timeThen = remindersOnRefresh.responsiveSubmit?.time
          const RS_wait = remindersOnRefresh.responsiveSubmit?.wait
          const RS_con3 = timeNow - RS_timeThen < RS_wait;
          const type = remindersOnRefresh.responsiveSubmit.type
          const stage = remindersOnRefresh.responsiveSubmit.stage
          console.log("conditions are => | 1 |",RS_con1,"| 2 |",RS_con2,`| 3 | ( ${timeNow} - ${RS_timeThen} ) = `,RS_con3);
          if(RS_con2 && RS_con3){
            messageToContent({ action: "responsiveSubmit" ,type:type,stage:stage})
            delete remindersOnRefresh.responsiveSubmit
          }
        }
        if(!con1 && !RS_con1){
          console.log("submit for qc is not being executed");
          messageToContent({ action: "getBidStage" });
        }
        
      }
    }else if(url.startsWith("https://www.bajajfinserv.in")){
      console.log("you are on bajaj finserv");
      console.log("checking reminders on refresh => ",remindersOnRefresh);
      const con1 = remindersOnRefresh.initiateQragain;
      const timeRemaining = Date.now() - remindersOnRefresh.initiateQragain?.time
      const con2 = timeRemaining < 10000
      console.log("conditions are => ",con1,"||",con2," ---- time remaining",timeRemaining / 1000,"- seconds");
      if(con1 && con2){
        messageToContent({action:"initiateQragain",phone:remindersOnRefresh.initiateQragain?.phone});
      }else{
        console.log("conditions not met");
      }
      if(closeTab === true){
        console.log("closing tab",tabs,"id",tabs[0].id)
        chrome.tabs.remove(tabs[0].id);
        closeTab = false;
        console.log("close tab is ",closeTab);
      }else{
        console.log("closetab is false");
      }
    }
  });
};
const qrTabs = []
function handleData(data) {
  console.log("data is ", data);
  console.log("new Permission is ",newPermissions)
  if (data.mobileNumber) {
    console.log("content sent Data : ", data.mobileNumber);
  }
  if (data.action === "openQr" && newPermissions.qrScans === true) {
    chrome.tabs.create({ url: data.url }, (tab) => {
      newTab = tab;
      console.log("newTab is ",newTab);
      const tabid = tab.id
      qrTabs.push(tabid);
    });
    const myInterval = setInterval(() => {
      console.log("QR opened");
      messageToContent({
        action: "initiateQrOtp",
        data: data.mobileNumber,
      }).then((response) => {
        if (response.status === 200) {
          console.log("response recieved, otp initiated");
          remindersOnRefresh.initiateQragain = {
            phone: data.mobileNumber,
            time: Date.now()
          }
          console.log("new data added on remindersOnRefresh",remindersOnRefresh);
          clearInterval(myInterval);
        } else {
          console.log("trying again");
        }
      });
    }, 1000);
    return newTab
  } else if (data.action === "dataset1"){
    console.log("content sent dataset 1")
  }
}
async function changeOpportunityStages(data){
  const loginData = await getLocalData("loginData");
  const stagesRequired = await getLocalData("stagesRequired");
  if(data && loginData){
    for(entry of data){
      for(aid in loginData){
        let found = false
        if(entry.Aid === aid){
          const opportunities = loginData[aid].opportunities
          if(opportunities && opportunities.length > 0 && opportunities[0]){
            for(opp of opportunities){
              if(entry.bid === opp?.bid){
                console.log("bid data found",opp);
                opp.bidStage = entry.bidStage;
                if(entry.bidStage.toLowerCase().includes("di completed") ||
                entry.bidStage.toLowerCase().includes("cancelled")){
                  stagesRequired[entry.bid] = false;
                }else{
                }
                console.log("change data",opp);
                found = true
                break
              }
            }
          }
        }else if(found === true){
          break
        }
      }
    }
    commitChanges("stagesRequired",stagesRequired);
    commitChanges("loginData",loginData);
  }
  
}
async function addCustomInform(data){
  const loginData = await getLocalData("loginData");
  const AidSection = loginData[data.Aid]
  if(data.message.toLowerCase().includes("customer is blocked")){
    AidSection.customerBlocked = true;
    AidSection.blockedReason = data.message
  }else if (data.message === "active check"){
    AidSection.isActive = data.isActive;
  }else if(data.message === "approvalRequested"){
    AidSection.approvalTaken = true;
  }else if(data.message === "Eligibility"){
    AidSection[`${data.assetType}-NoReason`] = data.eligibilityReason
  }
  console.log("changes are , ",AidSection)
  const newData = {
    [data.Aid]:AidSection
  }
  const changes = {...loginData,...newData}
  commitChanges("loginData",changes);
}

function handleDownloading(request){
  if(request === "database"){
    dataBackup();
  }
}
function addReminders(data){
  let tabId = 0
  chrome.tabs.query({ active: true, currentWindow: true },async (tabs) => {
    tabId = tabs[0].id
  })
  console.log("adding reminders for data",data);
  switch(data.tag){
    case "submitForQc":
      console.log("case match✅ ------------ submitForQc")
      remindersOnRefresh[data.tag] = {
        "url" : data.url,
        "time" : Date.now(),
        "wait": data.wait
      }
      console.log("new data added to remindersOnRefresh => ",remindersOnRefresh);
      break;
    case "initiateQragain":
      console.log("case match✅ ------------ initiateQragain")
      remindersOnRefresh[data.tag] = {
        "phone" : data.phone,
        "time" : Date.now()
      }
      console.log("new data added to remindersOnRefresh => ",remindersOnRefresh);
      break;
    case "responsiveSubmit":
      console.log("case match✅ ------------ responsiveSubmit")
      remindersOnRefresh[data.tag] = {
        "url" : data.url,
        "time" : Date.now(),
        "wait": data.wait,
        "type":data.type,
        "stage":data.stage,
        "tabId":tabId
      }
      console.log("new data added to remindersOnRefresh => ",remindersOnRefresh);
      break;
  }
}
async function decodeQR(message) {
  console.log("function running decodeQR");
  chrome.tabs.captureVisibleTab(null, { format: "png" }, async (dataUrl) => {
    if (chrome.runtime.lastError) {
      console.error("Screenshot error:", chrome.runtime.lastError.message);
      return;
    }
    console.log("Captured image URL");
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const bitmap = await createImageBitmap(blob);
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap,0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      console.log("ImageData extracted");
      messageToContent({
        action:"useJsqr",
        data:Array.from(imageData.data),
        width:imageData.width,
        height:imageData.height
      }).then(response => {
        chrome.tabs.create({ url: response.url }).then(async tab => {
          const tabid = tab.id
          messageToContentManyTimes({
            action:"enterPassword",
            password:message.password
          },5)
          if(message.type === "auto"){
            const data = await getLocalData("autoAccountAggregator");
            if(data){
              const changes = {...data,[message.Aid] : {
                url:response.url,
              }};
              commitChanges("autoAccountAggregator",changes);
            }
            
          }
        })
      })
    } catch (err) {
      console.error("Failed to process image:", err);
    }
  });
}
function messageToContentOnTabid(action,tabId) {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (
        tabs.length === 0 ||
        !tabs[0].url ||
        tabs[0].url.startsWith("chrome://")
       
      ) {
        console.error("No valid active tab found.");
        return "failed";
      }
      if( tabs[0].id === tabId){
        chrome.tabs.sendMessage(tabs[0].id, action, (response) => {
          console.log("message sent to content",action);
          if (chrome.runtime.lastError) {
            console.error("Error:", chrome.runtime.lastError.message);
          } else {
            console.log("Response from content script:", response);
            resolve(response);
          }
        });
      }else{
        console.error(`tabid from param (${tabId}) != to current tabid (${tabs[0].id})`);
      }
    });
  });
}

function handleAutoAccountAggregator(message){
  chrome.tabs.query({ active: true, currentWindow: true },async (tabs) => {
    if (
      tabs.length === 0 ||
      !tabs[0].url ||
      tabs[0].url.startsWith("chrome://")
    ) {
      console.error("No valid active tab found.");
      return "failed";
    }
    let tabId = tabs[0].id
    if(message.type === "Auto" && tabId){
      const data = await getLocalData("autoAccountAggregator");
      if(data && data[message.Aid]){
        messageToContentOnTabid({
          action:"responseOnRequest",
          approval:false
        },tabId);
        console.log("rejected ❌ qr reading",data);
        
      }else{
        messageToContentOnTabid({
          action:"responseOnRequest",
          approval:true
        },tabId);
        console.log("approved ✔ qr reading",data);
      }
    }
  })
}
function addDynamoData(data){
  fetch('https://byhmjk5fj7.execute-api.ap-south-1.amazonaws.com/demo',{
    method: "POST",
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(data => console.log("Data added in db",data))
  .catch(console.error);

}
async function downloadRepoFiles(owner, repo, branch, folder) {
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;

  const res = await fetch(apiUrl);
  const data = await res.json();

  if (!data.tree) {
    console.error("No files found", data);
    return;
  }

  for (const file of data.tree) {
    if (file.type === "blob") { // only files, not directories
      const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;

      chrome.downloads.download({
        url: rawUrl,
        filename: `${folder}/${file.path}`, // saves inside Downloads/folder/...
        saveAs: false,
        conflictAction: "overwrite"
      });
    }
  }
}
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
function changeBadge(action,Text){
  if(action === "add"){
    chrome.action.setBadgeText({ text: Text });
    chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
  }else{
    chrome.action.setBadgeText({ text: "" });
  }
}
async function waitForTabStatus(tabId,timeout = 10000){
  return new Promise((resolve) => {
    let isResolved = false;

    function cleanup(result) {
      if (isResolved) return;
      isResolved = true;
      chrome.tabs.onUpdated.removeListener(listener);
      resolve(result);
    }

    function listener(updatedTabId, changeInfo, tab) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        cleanup("complete");
      }
    }

    // Add listener
    chrome.tabs.onUpdated.addListener(listener);

    // Timeout fallback (10 sec)
    setTimeout(() => {
      cleanup("timeout");
    }, timeout);

    // 🔥 Immediate check (important!)
    chrome.tabs.get(tabId, (tab) => {
      if (tab && tab.status === "complete") {
        cleanup("complete");
      }
    });
  });
}
let clusterExecution
async function clusterSubmit(){
  let tabIds = []
  chrome.windows.getAll({populate:true}, async (windows) => {
    console.log(windows);
    
    for (let i = 1; i <= 20; i++){
      changeBadge("add",i.toString())
      if(clusterExecution === false){break;}else{console.log("continue execution --> 1")}
      for (let tab of windows[0].tabs){
        if(clusterExecution === false){break;}else{console.log("continue execution --> 2")}
        console.log(tab);
        if(tab.title.includes("Opportunity:") && !tabIds.includes(tab.id)){
          console.log("it is a opportunity page",tab.title);
          chrome.tabs.update(tab.id,{active:true});
          await sleep(1000);
          const tabStatus = await waitForTabStatus(tab.id,5000);
          if(tabStatus === "complete"){
            const response = await messageToContent({action: "clusterExecution"});
            if(response === "next"){
              console.log("continue execution --> 3")
            }else if(response === 'submitted'){
              chrome.tabs.remove(tab.id);
              tabIds.push(tab.id);
            }else{
              return
            }
          }
          
        }else{
          console.log("its not",tab.title);
        }
      }
    }
    changeBadge("remove")
  })
}


chrome.commands.onCommand.addListener((command) => {
  console.log(`Command: ${command}`);
  if (command === "SQC") {
    console.log("command passes : ", command);
    messageToContent({ action: "SQC" });
  } else if (command === "fetchKycPoiDetails") {
    console.log("command passes : ", command);
    messageToContent({action:"initiateQragain",phone:8919558073});
  } else if (command === "getCommand") {
    console.log("command passes : ", command);
    messageToContent({ action: "getCommand" });
  } else if (command === "fetchData") {
    console.log("command passes : ", command);
    clusterSubmit();
  }
});
// listen from content & popup script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message Recieved in background: ", message.type,message);
  if (message.from === "content") {
    if (message.type === "greeting") {
      sendResponse({ reply: "Message from bg.js -> constent.js" });
    } else if (message.type === "info") {
      if (message.text === "page_reloaded") {
        urlCheck();
      }
      sendResponse({ reply: "Message from bg.js -> constent.js" });
    } else if (message.type === "inform"){
      addCustomInform(message.text)
    } else if (message.type === "data") {
      const response = handleData(message.text);
      console.log("sending response : ",response)
      sendResponse(response)
    } else if (message.type === "command") {
      captureScreenshot();
    } else if (message.type === "loginData"){
      handleLoginData(message.text);
    } else if(message.type === "opportunityStages"){
      changeOpportunityStages(message.text);
    } else if(message.type === "closeTab"){
      function removeQRTab(tabId, changeInfo, tab){
        qrTabs.forEach((tab,index) => {
          if(tabId === tab){
            chrome.tabs.remove(tab);
            qrTabs.splice(index,1);
            chrome.tabs.onUpdated.removeListener(removeQRTab);
          }
        })
      }
      chrome.tabs.onUpdated.addListener(removeQRTab);
    } else if(message.type === "extensionReload"){
      messageToContent({action:"showAlert",text:"Extension will close now, you can open it again."}).then(response => {
        chrome.runtime.reload();
      })
      
    }else if(message.type === "extensionReload2"){
      downloadRepoFiles("SOHAIL62786", "extensions-by-sohail.", "main", "extension");
      sleep(10000).then(slp => {
        chrome.runtime.reload();
      })
    } else if(message.type === "reminder"){
      addReminders(message.text);
    } else if(message.type === "download"){
      handleDownloading(message.text);
    }else if(message.type === "decodeQr"){
      decodeQR(message.text);
    }else if(message.type === "accountAggregator"){
      handleAutoAccountAggregator(message.text);
    }else if(message.type === "insertIframe"){
      insertIframe();
    }else if(message.type === "dynamoData"){
      addDynamoData(message.text);
    }else if(message.type === "captureTab"){
      // qrLink.js: screenshot of the visible tab, used for QR images the page does not let it read
      chrome.tabs.captureVisibleTab(sender.tab ? sender.tab.windowId : null, { format: "png" }, (dataUrl) => {
        sendResponse({ dataUrl: chrome.runtime.lastError ? null : dataUrl });
      });
      return true;
    }else if(message.type === "openTab"){
      // qrLink.js: open a decoded QR link in a new tab next to the current one
      let allowed = false;
      try {
        const protocol = new URL(message.text?.url).protocol;
        allowed = protocol === "http:" || protocol === "https:";
      } catch (error) {
        allowed = false;
      }
      if(!allowed){
        sendResponse({ ok: false });
        return;
      }
      const options = { url: message.text.url, active: true };
      if(sender.tab){
        options.index = sender.tab.index + 1;
        options.openerTabId = sender.tab.id;
      }
      const plainTab = () => {
        skipAutoSplit = true;
        chrome.tabs.create(options, (tab) => {
          skipAutoSplit = false;
          sendResponse({ ok: Boolean(tab) && !chrome.runtime.lastError });
        });
      };
      // Chrome 155+: open the link in Split View beside the current tab.
      // Needs a tab that is not already split; otherwise (or on older Chrome) a normal tab is used.
      const canSplit = typeof chrome.tabs.createSplit === "function"
        && sender.tab
        && (sender.tab.splitViewId === undefined || sender.tab.splitViewId === -1);
      if(canSplit){
        try {
          skipAutoSplit = true;
          chrome.tabs.create({ ...options, splitWithTabId: sender.tab.id }, (tab) => {
            skipAutoSplit = false;
            if(chrome.runtime.lastError || !tab){
              plainTab();
            } else {
              sendResponse({ ok: true, split: true });
            }
          });
        } catch (error) {
          plainTab();
        }
      } else {
        plainTab();
      }
      return true;
    }
  } else if (message.from === "popup") {
    if(message.type === "downloadRepo"){
      downloadRepoFiles("SOHAIL62786", "extensions-by-sohail.", "main", "extension");
      sleep(500).then(slp => {
        chrome.runtime.reload();
      })

    }
    chrome.runtime.sendMessage(
      { type: "toPopup", text: "SOME DATA FOR POPUP" },
      (response) => {
        console.log("response from popup : ", response);
      }
    );
  }
});
// Every new tab opened from a page of this workflow (target=_blank links, window.open, ...)
// is placed next to the tab it came from and joined into Split View (Chrome 155+).
// Older Chrome, an opener that is already split, or other windows/pinned/grouped states: tab opens normally.
let skipAutoSplit = false;
const SPLIT_HOSTS = /^https?:\/\/(bflconsumer\.my\.site\.com|([^/]+\.)?bajajfinserv\.in|bfin\.in)(\/|$)/;
chrome.tabs.onCreated.addListener(async (tab) => {
  if(skipAutoSplit || typeof chrome.tabs.createSplit !== "function" || tab.openerTabId === undefined){
    return;
  }
  try {
    const opener = await chrome.tabs.get(tab.openerTabId);
    const current = await chrome.tabs.get(tab.id);
    const isSplit = (t) => t.splitViewId !== undefined && t.splitViewId !== -1;
    if(!SPLIT_HOSTS.test(opener.url || "") || isSplit(opener) || isSplit(current)){
      return;
    }
    if(opener.windowId !== current.windowId || opener.pinned !== current.pinned || opener.groupId !== current.groupId){
      return;
    }
    if(current.index !== opener.index + 1){
      await chrome.tabs.move(current.id, { index: current.index > opener.index ? opener.index + 1 : opener.index });
    }
    const moved = await chrome.tabs.get(current.id);
    const left = moved.index > opener.index ? opener.id : moved.id;
    const right = left === opener.id ? moved.id : opener.id;
    await chrome.tabs.createSplit([left, right]);
  } catch (error) {
    console.log("auto split skipped :", error);
  }
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if(changeInfo.url){
    urlCheck();
    console.log('url changed : ',changeInfo.url,changeInfo);
  }
})
chrome.tabs.onActivated.addListener((activeInfo) => {
  console.log('tab activated : ',activeInfo);
  chrome.tabs.get(activeInfo.tabId,(tab) => {
    urlCheck();
  })
})