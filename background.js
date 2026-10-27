console.log("Script started");
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};


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
      saveScreenshot(dataUrl);
    });
  }else{
    console.log("screenshot history is too recent");
  }
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
permissions().then(data => {
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




const retryUrlCheck = {}
const urlCheck = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length === 0 || !tabs[0].url || tabs[0].url.startsWith("chrome://")) {
      console.error("No valid active tab found");
      const timeNow = (new Date()).toISOString().split("T")[1].split(":",2).join("-");
      if(retryUrlCheck[timeNow]){
        if(retryUrlCheck[timeNow] <= 5){
          sleep(1000).then(() => {
            retryUrlCheck[timeNow] = retryUrlCheck[timeNow] + 1
            urlCheck();
          })
        }else{
          console.log(`retry urlCheck limit reached = ${retryUrlCheck[timeNow]}`);
        }
      }else{
        sleep(1000).then(() => {
          retryUrlCheck[timeNow] = 1
          urlCheck();
        })
      }
      return;
    }
    const url = tabs[0].url;
    if (url.startsWith("https://bflconsumer.my.site.com/dealercommunityreinvent")) {
      messageToContent({ action: "checkReinventAutomationPagesList" });
      if(url.includes("di-report")){
        messageToContent({ action: "di-report" });
      }else if(url.includes("report")){
        messageToContent({ action: "handleReports" });
      }
    }
  });
};

function handleDownloading(request){
  if(request === "database"){
    dataBackup();
  }
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
    if (message.type === "info") {
      if (message.text === "page_reloaded") {
        urlCheck();
      }
      sendResponse({ reply: "Message from bg.js -> constent.js" });
    } else if (message.type === "command") {
      captureScreenshot();
    } else if (message.type === "extensionReload2") {
      downloadRepoFiles("SOHAIL62786", "extensions-by-sohail.", "main", "extension");
      sleep(10000).then(() => {
        chrome.runtime.reload();
      })
    } else if (message.type === "download") {
      handleDownloading(message.text);
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
        chrome.tabs.create(options, (tab) => {
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
          chrome.tabs.create({ ...options, splitWithTabId: sender.tab.id }, (tab) => {
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