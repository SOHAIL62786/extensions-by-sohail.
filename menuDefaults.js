// Menu list shown on the left / right side of the Salesforce pages.
// Used by the popup (Menu List page) and by content.js until the list is edited in the popup.
// Stored in chrome.storage.local under "menuList" as [{ name, group }, ...] (array order = button order).
const MENU_GROUPS = {
    customer: "Customer page - left",
    doPrep: "Do Prep - left",
    postDo: "Post DO - right",
};
const DEFAULT_MENU_LIST = [
    ...["Home", "Customer Search", "App Status", "Zip Code Verification", "Product Selection", "Income Declaration", "KYC", "POI", "POA", "Surrogate Details", "Customer Detail Page", "Additional Details", "CKYC", "Asset Cart"]
        .map((name) => ({ name, group: "customer" })),
    ...["Cross Sell", "EMI Card", "Loan Summary", "Postpone EMI", "Upi Mandate", "PAN Details", "Rewards", "Offers Details", "GST Billing", "Other Details", "Document Library", "Product Validation"]
        .map((name) => ({ name, group: "doPrep" })),
    ...["Do Details", "Other Details", "Agreement", "Invoice", "Document Library", "Document Validate"]
        .map((name) => ({ name, group: "postDo" })),
];

// Registered reports: [{ url, type }]. type "report" -> Download Report (table as shown);
// anything else -> Download Data (scrolls through the report and saves every record).
const REPORT_TYPES = { report: "Report", data: "Data" };
const DEFAULT_REPORT_TYPES = [
    { url: "https://bflconsumer.my.site.com/dealercommunityreinvent/s/report/00OWc000000eW4PMAU/di-report", type: "report" },
];
