const P = {
  C:1
}
console.log("Script started");
let closeTab = false;
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};
const productType = {
  cdd : ["vivo", "oppo", "oneplus", "apple", "iphone", "ipad", "redmi", ""],
  cd: ["samsung led"],
  vas: ["partner ew"]
}

const remindersOnRefresh = {
  // initiateQragain : {
  //   phone: 7993967670,
  //   time: Date.now()
  // }
}

function dataBackup() {
  // console.log("Backup started");
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
function saveImageByBlob(blob){
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
async function customScreenshot(){
  chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
    if (chrome.runtime.lastError) {
      console.error("error capturing tab : ", chrome.runtime.lastError);
      return;
    }
    saveScreenshot(dataUrl);
  });
}
async function captureFullScreenScreenshot(){
  
}
async function captureScreenshot() {
  await sleep(1000)
  const timeNow = Date.now();
  const timeThen = screenshotHistory.lastCaptured
  const con1 = timeNow - timeThen >= 10000
  // console.log(`conditions are => `);
  // console.log(`1. ${!screenshotHistory.lastCaptured}`);
  // console.log(`2. ${timeNow} - ${timeThen} = ${timeNow - timeThen} => ${con1}`);
  if(!screenshotHistory.lastCaptured || con1){
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error("error capturing tab : ", chrome.runtime.lastError);
        return;
      }
      screenshotHistory["lastCaptured"] = Date.now();
      // console.log("screnshot history updated",screenshotHistory);
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
      // console.log("tabs are : ", tabs)
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
const weeks = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]
function daysBetweenDates(date1,date2){
    const newDate1 = new Date(date1);
    const newDate2 = new Date(date2);
    const diffInsec = Math.abs(newDate2 - newDate1);
    const secsInDay = 1000 * 60 * 60 * 24
    return diffInsec / secsInDay
}
let newPermissions
permissions().then(data => {
  newPermissions = data
  const date = new Date
  const newDate = date.toISOString().split("T")[0];
  // const todayDateNumber = newDate.split("-")[2]
  // const dayToday = weeks[date.getDay()]
  // const daysfromLastRefreshed = daysBetweenDates(data.lastExtensionRefreshed,newDate);
  // console.log("daysfromLastRefreshed = ",daysfromLastRefreshed)
  // if(newPermissions.autoRefresh === true){
  //   const con1 = data.refreshParameter.howOften === "Daily" && data.lastExtensionRefreshed != newDate
  //   const con2A = data.refreshParameter.howOften === "Weekly" && data.lastExtensionRefreshed != newDate && dayToday === data.refreshParameter.weekName
  //   const con2B = data.refreshParameter.howOften === "Weekly" && data.lastExtensionRefreshed != newDate && daysfromLastRefreshed >= 7
  //   const con2 = con2A || con2B
  //   const con3A = data.refreshParameter.howOften === "Monthly" && data.lastExtensionRefreshed != newDate && daysfromLastRefreshed >= 31
  //   const con3B = data.refreshParameter.howOften === "Monthly" && data.lastExtensionRefreshed != newDate && todayDateNumber <= data.refreshParameter.dayNumber
  //   const con3 = con3A || con3B
  //   if(con1 || con2 || con3){
  //       data.lastExtensionRefreshed = newDate;
  //       commitChanges("permissions",data);
  //       messageToContent({action:"showAlert",text:"Extension will close now, you can open it again."})
  //   }
  // }
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
      //  console.log("error saving data : ",chrome.runtime.lastError);
        reject("failed");
      } else{
        // console.log("data saved in : ", left," => ",right);
        
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
        // console.log("data fetched : ", request[left]);
        resolve(request[left]);
      }
    })
  })
}
async function changePermissions(key,value){
  const data = await getLocalData("permissions");
  if(data){
    data[key] = value
    commitChanges("permissions",data);
  }
}
async function editpermissions(){
  const permissions = await getLocalData("permissions");
  if(permissions){
    permissions.lastExtensionRefreshed = ""
    // console.log("new permissions",permissions);
    commitChanges("permissions",permissions);
  }
}
async function createCustomData(){
  const bidToAid ={}
  const localData = await getLocalData("loginData");
  if(localData){
    for(Aid in localData){
      const opportunities = localData[Aid].opportunities;
      if(opportunities && opportunities.length > 0 && opportunities[0] !== null){
        console.log(opportunities)
        for(opp of opportunities){
          const bid = opp.bid;
          bidToAid[bid] = Aid
        }
      }
    }
    console.log(bidToAid)
    commitChanges("bidToAid",bidToAid)
  }
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
        // console.log(date);
        for (let exAid of oldData[date]){
          // console.log(exAid);
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
async function addReappraisalData(data){
  console.log("function running || addReappraisalData => : ",data);
  const Aid = data.Aid
  
  const opportunities = data.opportunities;
  delete data.opportunities;
  const oldData = await getLocalData("loginData");
  if(oldData){
    const AidSection = oldData[Aid];
    AidSection.push(opportunities);

  }

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
        // opportunities.forEach((newOpp,inx) => {
        //   setBidToAid(data.Aid,newOpp.bid);
        //   console.log("newOpp : ",newOpp.bid);
        //   oldOpp.forEach((opp,index) => {
        //     console.log("oldOpp : ",opp.bid)
        //     console.log("condition check : ",newOpp.bid," => ",opp.bid);
        //     if(newOpp.bid === opp.bid){
        //       console.log("opp already there");
        //       const newOpps = {...opp, ...newOpp}
        //       newOpportunities.push(newOpps);
        //       oldOpp.splice(index,1);
        //       opportunities.splice(inx,1);
        //     }
        //   })
        // })
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
async function removeDateFromDateData(date){
  const dateData = await getLocalData("DateToAid");
  return new Promise((resolve,reject) => {
    if(dateData[date]){
      delete dateData[date];
      commitChanges("DateToAid",dateData).then(result => {
        resolve(result)
      })
    }else{reject("date not found")}
  })
}

async function tallyAidToDate(){
  const AidData = await getLocalData("loginData");
  const DateData = await getLocalData("DateToAid");
  if(AidData && DateData){
    for (let Aid in AidData){
      const date = AidData[Aid]["date"];
      if(DateData[date]){
        console.log("aid in date = ",DateData[date].Aid, " - ",Aid)
        if(DateData[date].Aid){
          
        }else{
          console.log("sorting Aid : ", Aid)
          // console.log("waste Aid : ",Aid)
          // delete AidData[Aid]
        }
      }else{
        console.log("waste Aid : ",Aid)
        delete AidData[Aid]
      }

    }
    commitChanges("loginData",AidData)
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
    // if(data.loginType === "cardCustomer"){
    //   addEtbCardData(data);
    // }else if(data.loginType === "reappraisal"){
    //   console.log("loginType is : reappraisal")
    //   addReappraisalData(data);
    // }
  }
}
// force speak to content script
const scriptToContent = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.scripting.executeScript({
      target: { tabId: tabs[0].id },
      func: () => {
        console.log("message from bg script");
        alert("background forced this");
      },
    });
  });
};


const retryUrlCheck = {}
const urlCheck = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // console.log("new tab => ",tabs);
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
    // console.log("tabs are : ", tabs);
    const url = tabs[0].url;
    const title = tabs[0].title
    const tabId = tabs[0].id
    if (url.startsWith("https://bflconsumer.my.site.com/dealerRevamp")) {
      // messageToContent({ action: "trackSearchCustomer" });
      if (url ==="https://bflconsumer.my.site.com/dealerRevamp/s/searchcustomer" || url.startsWith("https://bflconsumer.my.site.com/dealerRevamp/s/global-search") || url ==="https://bflconsumer.my.site.com/dealerRevamp/s/" || url.startsWith("https://bflconsumer.my.site.com/dealerRevamp/s/?t=")) {
        console.log("you are searching new customer");
        // location.reload();
        messageToContent({ action: "searchCustomer" });
      }else if(url === "https://bflconsumer.my.site.com/dealerRevamp/s/opportunity/Opportunity/Default"){
        console.log("you are on opportunity page");
        messageToContent({ action: "getOpportunityStages" });
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
                  // console.log("condition not met")
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
async function addAidSearchHistory(){
  const loginData = await getLocalData("loginData");
  if(loginData){
    console.log("aids = ",loginData.length);
    const Aids = {};
    const dates = []
    for(let Aid in loginData){
      const date = loginData[Aid].date;
      if(date){
        const isoDate = date.split("_").reverse().join("-");
        dates.push(isoDate);
        Aids[Aid] = [date];
      }
    }
    console.log(dates);
    console.log(Aids);
  }
}
function authenticateUser(callback) {
  chrome.identity.getAuthToken({ interactive: true ,scopes: ['https://www.googleapis.com/auth/drive.file']}, function (token) {
      if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
          return;
      }
      callback(token);
  });
}
function authenticateUser2(){
  chrome.identity.launchWebAuthFlow({
    url: 'https://accounts.google.com/o/oauth2/auth?' + new URLSearchParams({
      client_id: '416225647660-lhq3blaguc8ai02al5tfjkhklo3lmu4g.apps.googleusercontent.com',
      response_type: 'token',
      redirect_uri: 'https://mkpgpdfbgghjlplfeokfcaoenebmhbba.chromiumapp.org',
      scope: 'https://www.googleapis.com/auth/drive.file',
      prompt: 'consent'
    }),
    interactive: true
  }, (responseUrl) => {
    console.log("response url =",responseUrl);
    const token = responseUrl.split('access_token=')[1];
    console.log("token =",token);
    // Extract access token from responseUrl (e.g., responseUrl.split('access_token=')[1])
  });
}
function authenticateUserWithoutPrompt(){
  chrome.identity.launchWebAuthFlow({
    url: 'https://accounts.google.com/o/oauth2/auth?' + new URLSearchParams({
      client_id: '416225647660-lhq3blaguc8ai02al5tfjkhklo3lmu4g.apps.googleusercontent.com',
      response_type: 'token',
      redirect_uri: 'https://mkpgpdfbgghjlplfeokfcaoenebmhbba.chromiumapp.org',
      scope: 'https://www.googleapis.com/auth/drive.file',
      prompt: 'none'
    }),
    interactive: false
  }, (responseUrl) => {
    console.log("response url =",responseUrl);
    const token = responseUrl.split('access_token=')[1];
    console.log("token =",token);
    // Extract access token from responseUrl (e.g., responseUrl.split('access_token=')[1])
  });
}
function uploadDataToDrive(fileName, jsonData) {
  authenticateUser(function (token) {
      fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
          method: "POST",
          headers: {
              "Authorization": "Bearer " + token,
              "Content-Type": "application/json"
          },
          body: JSON.stringify({
              name: fileName,
              mimeType: "application/json",
              content: jsonData
          })
      })
      .then(response => response.json())
      .then(data => console.log("File uploaded:", data))
      .catch(error => console.error("Error uploading file:", error));
  });
}
// uploadDataToDrive("sharedData.json", JSON.stringify({ message: "Hello from PC1" }));
function getSharedDataFromDrive(fileId) {
  authenticateUser(function (token) {
      fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          method: "GET",
          headers: {
              "Authorization": "Bearer " + token
          }
      })
      .then(response => response.json())
      .then(data => console.log("Shared Data:", data))
      .catch(error => console.error("Error fetching file:", error));
  });
}

function findSharedFile(fileName) {
  authenticateUser(function (token) {
      fetch("https://www.googleapis.com/drive/v3/files?q=name='" + fileName + "'", {
          method: "GET",
          headers: {
              "Authorization": "Bearer " + token
          }
      })
      .then(response => response.json())
      .then(data => {
          if (data.files.length > 0) {
              getSharedDataFromDrive(data.files[0].id);
          } else {
              console.log("File not found");
          }
      })
      .catch(error => console.error("Error finding file:", error));
  });
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
let autoAccountAggregator = {
  "Aid":{
    url:"url",

  }
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
function writeDataToDB(){
  console.log("sending data to db .....");
  fetch("https://64zo080cx7.execute-api.ap-northeast-3.amazonaws.com/write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      date:(new Date).toISOString().split("T")[0],
      fosname:"MOHAMMED SOHAIL",
      data:["sohail","moiz","junaid"]
    })
  })
    .then(res => res.json())
    .then(data => console.log("✅ Write Success:", data))
    .catch(err => console.error("❌ Error:", err));

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



chrome.commands.onCommand.addListener((command) => {
  console.log(`Command: ${command}`);
  if (command === "SQC") {
    console.log("command passes : ", command);
    messageToContent({ action: "SQC" });
  } else if (command === "fetchKycPoiDetails") {
    console.log("command passes : ", command);
    // messageToContent({ action: "fetchKycPoiDetails" });
    messageToContent({action:"initiateQragain",phone:8919558073});
  } else if (command === "getCommand") {
    console.log("command passes : ", command);
    messageToContent({ action: "getCommand" });
  } else if (command === "fetchData") {
    console.log("command passes : ", command);
    messageToContent({ action: "fetchData" });
    urlCheck();
  }
});
// listen from content & popup script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Message Recieved in background: ", message.type,message);
  if (message.from === "content") {
    // console.log("from content");
    // chrome.runtime.sendMessage({ type: "toContent", text: "SOME DATA FOR content"},(response) => {
    //     console.log("response from content : ", response)
    // });
    if (message.type === "greeting") {
      // console.log(message);
      sendResponse({ reply: "Message from bg.js -> constent.js" });
    } else if (message.type === "info") {
      if (message.text === "page_reloaded") {
        urlCheck();
      }
      // console.log(message);
      sendResponse({ reply: "Message from bg.js -> constent.js" });
    } else if (message.type === "inform"){
      addCustomInform(message.text)
    } else if (message.type === "data") {
      // console.log("content sent message :", message);
      const response = handleData(message.text);
      console.log("sending response : ",response)
      sendResponse(response)
    } else if (message.type === "command") {
      // console.log("content sent command :", message);
      captureScreenshot();
    } else if (message.type === "loginData"){
      // console.log("call function handleLoginData");
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
      // console.log("close tab is ",closeTab);
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
    }
  } else if (message.from === "popup") {
    if(message.type === "downloadRepo"){
      downloadRepoFiles("SOHAIL62786", "extensions-by-sohail.", "main", "extension");
      sleep(500).then(slp => {
        chrome.runtime.reload();
      })

    }
    // console.log("from popup");
    chrome.runtime.sendMessage(
      { type: "toPopup", text: "SOME DATA FOR POPUP" },
      (response) => {
        console.log("response from popup : ", response);
      }
    );
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
    // console.log("tab is ",tab);
    urlCheck();
  })
})