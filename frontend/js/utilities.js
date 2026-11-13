"use strict";

function formatNumber(value) {
    let numericValue = Number(value);

    if (Number.isFinite(numericValue) === false) {
        return "Not available";
    }

    return numericValue.toLocaleString("en-US");
}

function formatPopulation(population) {
    if (population === null || population === undefined || population === "") {
        return "Not available";
    }

    return formatNumber(population);
}

function formatArea(area) {
    if (area === null || area === undefined || area === "") {
        return "Not available";
    }

    return formatNumber(area) + " km²";
}

function formatDate(dateValue) {
    if (dateValue === null || dateValue === undefined || dateValue === "") {
        return "Not available";
    }

    let parsedDate = new Date(dateValue);

    if (Number.isNaN(parsedDate.getTime())) {
        return "Not available";
    }

    return parsedDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function calculateAge(birthDateValue) {
    if (!birthDateValue) {
        return null;
    }

    let birthDate = new Date(birthDateValue);

    if (Number.isNaN(birthDate.getTime())) {
        return null;
    }

    let today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    let monthDifference = today.getMonth() - birthDate.getMonth();

    if (
        monthDifference < 0 ||
        (monthDifference === 0 && today.getDate() < birthDate.getDate())
    ) {
        age--;
    }

    return age;
}

function getQueryParameter(parameterName) {
    let parameters = new URLSearchParams(window.location.search);
    let value = parameters.get(parameterName);

    return value === null ? "" : value;
}

function getSafeReturnPath(returnPath) {
    if (!isNonEmptyText(returnPath)) {
        return "index.html";
    }

    let trimmedPath = returnPath.trim().toLowerCase();

    if (
        trimmedPath.indexOf("http://") === 0 ||
        trimmedPath.indexOf("https://") === 0 ||
        trimmedPath.indexOf("//") === 0 ||
        trimmedPath.indexOf("javascript:") === 0
    ) {
        return "index.html";
    }

    return returnPath.trim();
}

function createElementSafely(tagName, className, textValue) {
    let element = document.createElement(tagName);

    if (className) {
        element.className = className;
    }

    if (textValue !== null && textValue !== undefined) {
        element.textContent = textValue;
    }

    return element;
}

function clearElementChildren(element) {
    if (!element) {
        return;
    }

    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function displayLoadingMessage(targetElement, messageText) {
    if (!targetElement) {
        return;
    }

    targetElement.className = "status-message status-message-loading";
    targetElement.textContent = messageText;
    targetElement.setAttribute("role", "status");
}

function displayErrorMessage(targetElement, messageText) {
    if (!targetElement) {
        return;
    }

    targetElement.className = "status-message status-message-error";
    targetElement.textContent = messageText;
    targetElement.setAttribute("role", "alert");
}

function displaySuccessMessage(targetElement, messageText) {
    if (!targetElement) {
        return;
    }

    targetElement.className = "status-message status-message-success";
    targetElement.textContent = messageText;
    targetElement.setAttribute("role", "status");
}

function clearStatusMessage(targetElement) {
    if (!targetElement) {
        return;
    }

    targetElement.className = "status-message";
    targetElement.textContent = "";
    targetElement.removeAttribute("role");
}

function isNonEmptyText(value) {
    return typeof value === "string" && value.trim().length > 0;
}

function isValidEmail(emailAddress) {
    if (!isNonEmptyText(emailAddress)) {
        return false;
    }

    let email = emailAddress.trim();
    let atIndex = email.indexOf("@");
    let lastAtIndex = email.lastIndexOf("@");
    let dotIndex = email.lastIndexOf(".");

    return (
        atIndex > 0 &&
        atIndex === lastAtIndex &&
        dotIndex > atIndex + 1 &&
        dotIndex < email.length - 1
    );
}

function isValidPassword(passwordValue) {
    return typeof passwordValue === "string" && passwordValue.length >= 8;
}

function validateBirthDate(birthDateValue) {
    let age = calculateAge(birthDateValue);

    return (
        age !== null &&
        age >= MINIMUM_REASONABLE_AGE &&
        age <= MAXIMUM_REASONABLE_AGE
    );
}

function debounceFunction(callbackFunction, delayMilliseconds) {
    let timeoutIdentifier = null;

    return function () {
        let context = this;
        let argumentsList = arguments;

        if (timeoutIdentifier !== null) {
            window.clearTimeout(timeoutIdentifier);
        }

        timeoutIdentifier = window.setTimeout(function () {
            callbackFunction.apply(context, argumentsList);
        }, delayMilliseconds);
    };
}

function getAjaxErrorMessage(error, fallbackMessage) {
    if (!error) {
        return fallbackMessage;
    }

    if (typeof error.responseJSON === "string" && error.responseJSON.trim() !== "") {
        return error.responseJSON;
    }

    if (
        error.responseJSON &&
        typeof error.responseJSON === "object"
    ) {
        if (error.responseJSON.message) {
            return error.responseJSON.message;
        }

        if (error.responseJSON.title) {
            return error.responseJSON.title;
        }
    }

    if (typeof error.responseText === "string" && error.responseText.trim() !== "") {
        let responseText = error.responseText.trim();

        if (
            responseText.charAt(0) === "\"" &&
            responseText.charAt(responseText.length - 1) === "\""
        ) {
            responseText = responseText.substring(1, responseText.length - 1);
        }

        return responseText;
    }

    return fallbackMessage;
}

function normalizeStringArray(values) {
    if (!Array.isArray(values)) {
        return [];
    }

    let normalizedValues = [];

    values.forEach(function (value) {
        if (typeof value === "string" && value.trim() !== "") {
            normalizedValues.push(value.trim());
        }
    });

    return normalizedValues;
}

function normalizeCountryFromServer(country) {
    if (!country) {
        return null;
    }

    return {
        name: country.name || "",
        alpha3Code: country.alpha3Code || "",
        alpha2Code: country.alpha2Code || "",
        capital: country.capital || "",
        region: country.region || "",
        subRegion: country.subRegion || "",
        population: Number(country.population) || 0,
        area: Number(country.area) || 0,
        flagUrl: country.flagUrl || "",
        currencies: normalizeStringArray(country.currencies),
        languages: normalizeStringArray(country.languages),
        borders: normalizeStringArray(country.borders)
    };
}

function normalizeCountriesFromServer(countries) {
    if (!Array.isArray(countries)) {
        return [];
    }

    let normalizedCountries = [];

    countries.forEach(function (country) {
        let normalizedCountry = normalizeCountryFromServer(country);

        if (normalizedCountry !== null) {
            normalizedCountries.push(normalizedCountry);
        }
    });

    return normalizedCountries;
}

function getCountryFlagUrl(country) {
    if (country && isNonEmptyText(country.flagUrl)) {
        return country.flagUrl;
    }

    return DEFAULT_PROFILE_IMAGE_URL;
}

function findCountryByAlpha2Code(countries, alpha2Code) {
    if (!Array.isArray(countries) || !isNonEmptyText(alpha2Code)) {
        return null;
    }

    let normalizedCode = alpha2Code.trim().toUpperCase();

    for (let index = 0; index < countries.length; index++) {
        if (
            String(countries[index].alpha2Code).toUpperCase() === normalizedCode
        ) {
            return countries[index];
        }
    }

    return null;
}

function findCountryByAlpha3Code(countries, alpha3Code) {
    if (!Array.isArray(countries) || !isNonEmptyText(alpha3Code)) {
        return null;
    }

    let normalizedCode = alpha3Code.trim().toUpperCase();

    for (let index = 0; index < countries.length; index++) {
        if (
            String(countries[index].alpha3Code).toUpperCase() === normalizedCode
        ) {
            return countries[index];
        }
    }

    return null;
}

function formatStarRating(rating) {
    let numericRating = Number(rating);

    if (!Number.isFinite(numericRating)) {
        numericRating = 0;
    }

    let result = "";

    for (let star = 1; star <= 5; star++) {
        result += star <= numericRating ? "★" : "☆";
    }

    return result;
}

function setImageFallback(imageElement, fallbackSource) {
    if (!imageElement) {
        return;
    }

    imageElement.addEventListener("error", function () {
        if (imageElement.src !== fallbackSource) {
            imageElement.src = fallbackSource;
        }
    });
}