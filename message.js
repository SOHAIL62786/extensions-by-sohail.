const button = document.querySelector(".addMessages");

button.addEventListener("click", () => {
    message = "assalamualaikum "
    const messageContainer = document.querySelector("div.contentJS-innermessageContainer")
    const span = document.createElement("span");
    span.classList.add("contentJS-message")
    span.innerText = message
    messageContainer.prepend(span);
})

async function addData(){
    await gapi.client.sheets.spreadsheets.values.update({
        spreadsheetId: "1yASXY1qPwstnhM-NXmDXPmeL2maZOR8mBLv4_h9c8Eg",
        range: "Sheet1!A2",
        valueInputOption: "RAW",
        resource: {
            values: [["New Value"]]
        }
    });
}
function loadGapiAndAuthorize() {
    gapi.load("client:auth2", async () => {
        try {
            await gapi.client.init({
                apiKey: "AIzaSyDgSo8tIzvgkA5ENgymaBiwAWjAcgF1kfY",
                clientId: "416225647660-nrv5t7l4f3ni68nkrgscpr49e1c8v7f3.apps.googleusercontent.com",
                discoveryDocs: ["https://sheets.googleapis.com/$discovery/rest?version=v4"],
                scope: "https://www.googleapis.com/auth/spreadsheets"
            });
            if (logs === true) { console.log("GAPI client loaded and initialized"); }        } catch (error) {
            console.error("Error loading GAPI client:", error);
        }
    });
}

// Call this function on page load or as required
// loadGapiAndAuthorize();
