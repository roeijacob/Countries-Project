"use strict";

let homeCountriesLoaded = false;

function initializeHomePage() {
    initializeGlobeStarsBackground();
    initializeHomeControls();
    initializeCountryModal();
    initializeReviewsModule();
    loadHomeCountries();
}

function loadHomeCountries() {
    let loadingElement =
        document.getElementById("countriesLoadingState");

    let countriesList =
        document.getElementById("countriesList");

    displayLoadingMessage(
        loadingElement,
        "Loading countries from the project server..."
    );

    ajaxCall(
        "GET",
        SERVER_API_BASE_URL + "/Countries",
        null,
        function (serverCountries) {
            let countries =
                normalizeCountriesFromServer(serverCountries);

            if (countries.length === 0) {
                homeCountriesLoaded = false;

                displayCountriesLoadError(
                    "No countries were found. An administrator may need to import them.",
                    loadingElement,
                    countriesList
                );

                return;
            }

            homeCountriesLoaded = true;
            clearStatusMessage(loadingElement);

            initializeCountriesController(countries);

            if (
                typeof am5 !== "undefined" &&
                typeof initializeGlobe === "function"
            ) {
                initializeGlobe(countries);
            }

            selectCountryFromHomeUrl(countries);
        },
        function (error) {
            homeCountriesLoaded = false;

            displayCountriesLoadError(
                getAjaxErrorMessage(
                    error,
                    "Could not connect to the project server."
                ),
                loadingElement,
                countriesList
            );
        }
    );
}

function displayCountriesLoadError(
    errorMessage,
    loadingElement,
    countriesList
) {
    displayErrorMessage(loadingElement, errorMessage);

    if (!countriesList) {
        return;
    }

    clearElementChildren(countriesList);

    let retryButton =
        createElementSafely(
            "button",
            "",
            "Retry Country Loading"
        );

    retryButton.type = "button";
    retryButton.addEventListener(
        "click",
        loadHomeCountries
    );

    countriesList.appendChild(retryButton);
}

function selectCountryFromHomeUrl(countries) {
    let alpha2Code = getQueryParameter("country");
    let alpha3Code = getQueryParameter("alpha3");
    let selectedCountry = null;

    if (alpha3Code !== "") {
        selectedCountry =
            findCountryByAlpha3Code(countries, alpha3Code);
    } else if (alpha2Code !== "") {
        selectedCountry =
            findCountryByAlpha2Code(countries, alpha2Code);
    }

    if (selectedCountry !== null) {
        window.setTimeout(function () {
            selectCountry(selectedCountry, "url");
        }, 500);
    }
}

function initializeHomeControls() {
    let panelToggle =
        document.getElementById("countriesPanelToggle");

    let panelContent =
        document.getElementById("countriesPanelContent");

    if (panelToggle && panelContent) {
        panelToggle.addEventListener("click", function () {
            let isExpanded =
                panelToggle.getAttribute("aria-expanded") === "true";

            panelToggle.setAttribute(
                "aria-expanded",
                String(!isExpanded)
            );

            panelContent.hidden = isExpanded;
        });
    }

    let resumeButton =
        document.getElementById("resumeRotationButton");

    if (
        resumeButton &&
        typeof resumeGlobeRotation === "function"
    ) {
        resumeButton.addEventListener(
            "click",
            resumeGlobeRotation
        );
    }
}

function initializeGlobeStarsBackground() {
    createStarsForLayer(
        document.getElementById("starsSmall"),
        window.innerWidth <= 700 ? 220 : 400,
        "rgba(255, 255, 255, 0.88)"
    );

    createStarsForLayer(
        document.getElementById("starsMedium"),
        window.innerWidth <= 700 ? 70 : 120,
        "rgba(215, 235, 255, 0.86)"
    );

    createStarsForLayer(
        document.getElementById("starsLarge"),
        window.innerWidth <= 700 ? 30 : 55,
        "rgba(255, 255, 255, 0.95)"
    );
}

function createStarsForLayer(layerElement, numberOfStars, starColor) {
    if (
        !layerElement ||
        layerElement.dataset.starsReady === "true"
    ) {
        return;
    }

    let shadows = [];

    for (let index = 0; index < numberOfStars; index++) {
        let x = Math.floor(Math.random() * 2000);
        let y = Math.floor(Math.random() * 2000);

        shadows.push(
            x + "px " + y + "px " + starColor
        );
    }

    layerElement.style.boxShadow = shadows.join(", ");
    layerElement.dataset.starsReady = "true";
}

document.addEventListener(
    "DOMContentLoaded",
    initializeHomePage
);