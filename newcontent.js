// function commitChanges(left,right){
//   return new Promise((resolve,reject) => {
//     chrome.storage.local.set({[left] : right}, function(){
//       if(chrome.runtime.lastError){
//       //  console.log("error saving data : ",chrome.runtime.lastError);
//         reject("failed");
//       } else{
//         // console.log("data saved in : ", left," => ",right);
        
//         resolve("success");
//       }
//     })
//   })
  
// }

// let newData = {}
// chrome.storage.local.get("DateToAid", (request) => {
//     d2 = request["DateToAid"]
//     for (let date in d2){
//         newData = {...newData,[date.split("_").reverse().join("-")]:d2[date]}
//     }
//     console.log(newData)
// })
// chrome.storage.local.get("DATETOAID", (request) => {
//     d1 = request["DATETOAID"];
//     lastData = {...newData,...d1}
//     console.log(lastData)
//     commitChanges("DATETOAID",lastData);
// })


