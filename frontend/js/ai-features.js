"use strict";

// Loads one AI-generated country fact through the project server architecture.
function getAiCountryFact(countryName, onSuccess, onError) {
    countryName = String(countryName || "").trim();

    if (countryName === "") {
        if (typeof onError === "function") onError("Country name is missing.");
        return;
    }

    let url = SERVER_API_BASE_URL + "/Ai/country-fact?countryName=" + encodeURIComponent(countryName);

    ajaxCall("GET", url, null,
        function (responseData) {
            if (responseData && typeof responseData.fact === "string" && responseData.fact.trim() !== "") {
                if (typeof onSuccess === "function") onSuccess(responseData.fact.trim());
                return;
            }

            if (typeof onError === "function") onError("The server did not return a valid country fact.");
        },
        function (error) {
            if (typeof onError === "function") onError(getAjaxErrorMessage(error, "The AI country fact could not be generated."));
        }
    );
}

// Loads personalized travel recommendations through the project server.
function getAiTravelRecommendations(userIdentifier, countries, onSuccess, onError) {
    let url = SERVER_API_BASE_URL + "/ai/users/" + encodeURIComponent(userIdentifier) + "/recommendations";

    ajaxCall("GET", url, null,
        function (responseData) {
            if (Array.isArray(responseData) === true) {
                if (typeof onSuccess === "function") onSuccess(responseData);
                return;
            }

            if (responseData !== null && typeof responseData === "object" && Array.isArray(responseData.recommendations) === true) {
                if (typeof onSuccess === "function") onSuccess(responseData.recommendations);
                return;
            }

            // אם אין המלצות, נחזיר מערך ריק במקום לזרוק שגיאה
            if (typeof onSuccess === "function") onSuccess([]);
        },
        function (error) {
            if (typeof onError === "function") onError("Failed to load travel recommendations.");
        }
    );
}