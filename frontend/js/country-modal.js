"use strict";

let modalCurrentCountry = null;
let modalCountries = [];

let modalVisitedState = false;
let modalWantToVisitState = false;

let modalPreviouslyFocusedElement = null;
let countryModalListenersInitialized = false;

function initializeCountryModal() {
    if (countryModalListenersInitialized) {
        return;
    }

    let modalOverlay =
        document.getElementById("countryModal");

    let closeButton =
        document.getElementById(
            "countryModalCloseButton"
        );

    let bordersList =
        document.getElementById(
            "countryBordersList"
        );

    let visitedButton =
        document.getElementById("visitedButton");

    let wantButton =
        document.getElementById("wantToVisitButton");

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            closeCountryModal
        );
    }

    if (modalOverlay) {
        modalOverlay.addEventListener(
            "click",
            function (event) {
                if (event.target === modalOverlay) {
                    closeCountryModal();
                }
            }
        );
    }

    if (bordersList) {
        bordersList.addEventListener(
            "click",
            handleBorderCountrySelection
        );
    }

    if (visitedButton) {
        visitedButton.addEventListener(
            "click",
            function () {
                toggleCountryTravelList(
                    VISITED_LIST_TYPE
                );
            }
        );
    }

    if (wantButton) {
        wantButton.addEventListener(
            "click",
            function () {
                toggleCountryTravelList(
                    WANT_TO_VISIT_LIST_TYPE
                );
            }
        );
    }

    document.addEventListener(
        "keydown",
        handleCountryModalKeyboard
    );

    countryModalListenersInitialized = true;
}

function openCountryModal(country, countries) {
    initializeCountryModal();

    modalCurrentCountry = country;
    modalCountries =
        Array.isArray(countries)
            ? countries.slice()
            : [];

    modalPreviouslyFocusedElement =
        document.activeElement;

    let modalOverlay =
        document.getElementById("countryModal");

    let modalDialog =
        document.querySelector(".country-modal");

    let modalStatus =
        document.getElementById("countryModalStatus");

    if (!modalOverlay || !modalDialog) {
        return;
    }

    modalOverlay.hidden = false;
    document.body.classList.add("modal-open");
    modalDialog.focus();

    renderCountryModalHeader(country);
    clearElementChildren(
        document.getElementById("countryDetailsGrid")
    );

    clearElementChildren(
        document.getElementById("countryBordersList")
    );

    displayLoadingMessage(
        modalStatus,
        "Loading complete country details..."
    );

    ajaxCall(
        "GET",
        SERVER_API_BASE_URL +
        "/Countries/" +
        encodeURIComponent(country.alpha3Code),
        null,
        function (serverCountry) {
            let detailedCountry =
                normalizeCountryFromServer(serverCountry);

            if (!detailedCountry) {
                displayErrorMessage(
                    modalStatus,
                    "Country details were not returned."
                );

                return;
            }

            modalCurrentCountry = detailedCountry;

            clearStatusMessage(modalStatus);
            renderCountryModalDetails(detailedCountry);
            renderCountryBorders(detailedCountry);
            loadCountryTravelListStates(detailedCountry);
            loadCountryFactIntoModal();

            if (typeof loadCountryReviews === "function") {
                loadCountryReviews(detailedCountry);
            }
        },
        function (error) {
            displayErrorMessage(
                modalStatus,
                getAjaxErrorMessage(
                    error,
                    "Complete country details could not be loaded."
                )
            );

            renderCountryModalDetails(country);
            renderCountryBorders(country);
            loadCountryTravelListStates(country);
            loadCountryFactIntoModal();

            if (typeof loadCountryReviews === "function") {
                loadCountryReviews(country);
            }
        }
    );
}

function closeCountryModal() {
    let modalOverlay =
        document.getElementById("countryModal");

    if (!modalOverlay) {
        return;
    }

    modalOverlay.hidden = true;
    document.body.classList.remove("modal-open");

    if (
        modalPreviouslyFocusedElement &&
        typeof modalPreviouslyFocusedElement.focus === "function"
    ) {
        modalPreviouslyFocusedElement.focus();
    }
}

function getCurrentModalCountry() {
    return modalCurrentCountry;
}

function getCurrentVisitedStateFromModal() {
    return modalVisitedState;
}

function renderCountryModalHeader(country) {
    let titleElement =
        document.getElementById("countryModalTitle");

    let codesElement =
        document.getElementById("countryModalCodes");

    let flagElement =
        document.getElementById("countryModalFlag");

    if (titleElement) {
        titleElement.textContent =
            country.name || "Country";
    }

    if (codesElement) {
        let codes = [];

        if (country.alpha2Code) {
            codes.push(
                "Alpha-2 " + country.alpha2Code
            );
        }

        if (country.alpha3Code) {
            codes.push(
                "Alpha-3 " + country.alpha3Code
            );
        }

        codesElement.textContent = codes.join(" · ");
    }

    if (flagElement) {
        flagElement.src = getCountryFlagUrl(country);
        flagElement.alt =
            (country.name || "Country") + " flag";

        setImageFallback(
            flagElement,
            DEFAULT_PROFILE_IMAGE_URL
        );
    }
}

function renderCountryModalDetails(country) {
    renderCountryModalHeader(country);

    let detailsGrid =
        document.getElementById("countryDetailsGrid");

    if (!detailsGrid) {
        return;
    }

    clearElementChildren(detailsGrid);

    appendCountryDetail(
        detailsGrid,
        "Capital",
        country.capital || "Not available"
    );

    appendCountryDetail(
        detailsGrid,
        "Region",
        country.region || "Not available"
    );

    appendCountryDetail(
        detailsGrid,
        "Subregion",
        country.subRegion || "Not available"
    );

    appendCountryDetail(
        detailsGrid,
        "Population",
        formatPopulation(country.population)
    );

    appendCountryDetail(
        detailsGrid,
        "Area",
        formatArea(country.area)
    );

    appendCountryDetail(
        detailsGrid,
        "Languages",
        country.languages.length > 0
            ? country.languages.join(", ")
            : "Not available"
    );

    appendCountryDetail(
        detailsGrid,
        "Currencies",
        country.currencies.length > 0
            ? country.currencies.join(", ")
            : "Not available"
    );
}

function appendCountryDetail(container, label, value) {
    let item =
        createElementSafely(
            "div",
            "country-detail-item",
            null
        );

    item.appendChild(
        createElementSafely(
            "span",
            "country-detail-label",
            label
        )
    );

    item.appendChild(
        createElementSafely(
            "span",
            "country-detail-value",
            value
        )
    );

    container.appendChild(item);
}

function renderCountryBorders(country) {
    let bordersList =
        document.getElementById("countryBordersList");

    if (!bordersList) {
        return;
    }

    clearElementChildren(bordersList);

    if (
        !Array.isArray(country.borders) ||
        country.borders.length === 0
    ) {
        bordersList.appendChild(
            createElementSafely(
                "span",
                "",
                "No land borders listed."
            )
        );

        return;
    }

    country.borders.forEach(function (borderCode) {
        let borderCountry =
            findCountryByAlpha3Code(
                modalCountries,
                borderCode
            );

        let button =
            createElementSafely(
                "button",
                "border-country-button",
                borderCountry
                    ? borderCountry.name
                    : borderCode
            );

        button.type = "button";
        button.setAttribute(
            "data-border-code",
            borderCode
        );

        bordersList.appendChild(button);
    });
}

function handleBorderCountrySelection(event) {
    let button =
        event.target.closest("[data-border-code]");

    if (!button) {
        return;
    }

    let borderCode =
        button.getAttribute("data-border-code");

    let borderCountry =
        findCountryByAlpha3Code(
            modalCountries,
            borderCode
        );

    if (!borderCountry) {
        return;
    }

    if (typeof selectCountry === "function") {
        selectCountry(borderCountry, "border");
    }
}

function loadCountryTravelListStates(country) {
    modalVisitedState = false;
    modalWantToVisitState = false;

    updateTravelListButtons();

    let actionMessage =
        document.getElementById(
            "countryActionMessage"
        );

    let session = getLoggedInUserSession();

    if (!session) {
        displayLoadingMessage(
            actionMessage,
            "Log in to manage your travel lists."
        );

        updateReviewEligibility(country);
        return;
    }

    displayLoadingMessage(
        actionMessage,
        "Loading your travel lists..."
    );

    ajaxCall(
        "GET",
        buildSavedCountriesUrl(
            session.userID,
            VISITED_LIST_TYPE
        ),
        null,
        function (visitedCountries) {
            modalVisitedState =
                savedCountriesContain(
                    visitedCountries,
                    country.alpha3Code
                );

            ajaxCall(
                "GET",
                buildSavedCountriesUrl(
                    session.userID,
                    WANT_TO_VISIT_LIST_TYPE
                ),
                null,
                function (wantedCountries) {
                    modalWantToVisitState =
                        savedCountriesContain(
                            wantedCountries,
                            country.alpha3Code
                        );

                    clearStatusMessage(actionMessage);
                    updateTravelListButtons();
                    updateReviewEligibility(country);
                },
                function (error) {
                    displayErrorMessage(
                        actionMessage,
                        getAjaxErrorMessage(
                            error,
                            "The Want to Visit list could not be loaded."
                        )
                    );

                    updateTravelListButtons();
                    updateReviewEligibility(country);
                }
            );
        },
        function (error) {
            displayErrorMessage(
                actionMessage,
                getAjaxErrorMessage(
                    error,
                    "The Visited list could not be loaded."
                )
            );

            updateTravelListButtons();
            updateReviewEligibility(country);
        }
    );
}

function buildSavedCountriesUrl(userId, listType) {
    return (
        SERVER_API_BASE_URL +
        "/SavedCountries/" +
        encodeURIComponent(userId) +
        "/" +
        encodeURIComponent(listType)
    );
}

function savedCountriesContain(countries, alpha3Code) {
    if (!Array.isArray(countries)) {
        return false;
    }

    for (let index = 0; index < countries.length; index++) {
        if (
            String(countries[index].alpha3Code).toUpperCase() ===
            String(alpha3Code).toUpperCase()
        ) {
            return true;
        }
    }

    return false;
}

function updateTravelListButtons() {
    let visitedButton =
        document.getElementById("visitedButton");

    let wantButton =
        document.getElementById("wantToVisitButton");

    updateSingleTravelListButton(
        visitedButton,
        modalVisitedState,
        "Visited",
        "Remove from Visited"
    );

    updateSingleTravelListButton(
        wantButton,
        modalWantToVisitState,
        "Want to Visit",
        "Remove from Want to Visit"
    );
}

function updateSingleTravelListButton(
    button,
    isActive,
    inactiveText,
    activeText
) {
    if (!button) {
        return;
    }

    let isWantToVisitButton =
        button.id === "wantToVisitButton";

    let iconClass =
        isWantToVisitButton
            ? "travel-list-heart-icon"
            : "travel-list-visited-icon";

    button.classList.toggle(
        "travel-list-button-active",
        isActive
    );

    button.setAttribute(
        "aria-pressed",
        isActive ? "true" : "false"
    );

    button.title =
        isActive ? activeText : inactiveText;

    button.innerHTML =
        '<span class="travel-list-button-icon ' +
        iconClass +
        '" aria-hidden="true"></span>' +
        '<span class="travel-list-button-text">' +
        inactiveText +
        '</span>';
}

function toggleCountryTravelList(targetListType) {
    let session = getLoggedInUserSession();

    let actionMessage =
        document.getElementById(
            "countryActionMessage"
        );

    if (!session) {
        displayErrorMessage(
            actionMessage,
            "Please log in before changing a travel list."
        );

        return;
    }

    if (!modalCurrentCountry) {
        return;
    }

    let targetIsVisited =
        targetListType === VISITED_LIST_TYPE;

    let targetIsActive =
        targetIsVisited
            ? modalVisitedState
            : modalWantToVisitState;

    displayLoadingMessage(
        actionMessage,
        "Updating your travel list..."
    );

    if (targetIsActive) {
        deleteModalSavedCountry(
            session.userID,
            modalCurrentCountry.alpha3Code,
            function () {
                modalVisitedState = false;
                modalWantToVisitState = false;

                updateTravelListButtons();
                updateReviewEligibility(modalCurrentCountry);

                if (typeof loadCountryReviews === "function") {
                    loadCountryReviews(modalCurrentCountry);
                }

                displaySuccessMessage(
                    actionMessage,
                    "Country removed from your travel list."
                );
            },
            function (error) {
                displayErrorMessage(
                    actionMessage,
                    getAjaxErrorMessage(
                        error,
                        "The country could not be removed."
                    )
                );
            }
        );

        return;
    }

    let otherListIsActive =
        targetIsVisited
            ? modalWantToVisitState
            : modalVisitedState;

    if (otherListIsActive) {
        deleteModalSavedCountry(
            session.userID,
            modalCurrentCountry.alpha3Code,
            function () {
                addModalSavedCountry(
                    session.userID,
                    modalCurrentCountry.alpha3Code,
                    targetListType,
                    actionMessage
                );
            },
            function (error) {
                displayErrorMessage(
                    actionMessage,
                    getAjaxErrorMessage(
                        error,
                        "The country could not be moved."
                    )
                );
            }
        );
    } else {
        addModalSavedCountry(
            session.userID,
            modalCurrentCountry.alpha3Code,
            targetListType,
            actionMessage
        );
    }
}

function addModalSavedCountry(
    userId,
    alpha3Code,
    listType,
    actionMessage
) {
    let api =
        SERVER_API_BASE_URL +
        "/SavedCountries/" +
        encodeURIComponent(userId) +
        "/" +
        encodeURIComponent(alpha3Code) +
        "/" +
        encodeURIComponent(listType);

    ajaxCall(
        "POST",
        api,
        null,
        function () {
            modalVisitedState = listType === VISITED_LIST_TYPE;
            modalWantToVisitState = listType === WANT_TO_VISIT_LIST_TYPE;

            updateTravelListButtons();
            updateReviewEligibility(modalCurrentCountry);

            if (typeof loadCountryReviews === "function") {
                loadCountryReviews(modalCurrentCountry);
            }

            displaySuccessMessage(
                actionMessage,
                "Travel list updated successfully."
            );
        },
        function (error) {
            displayErrorMessage(
                actionMessage,
                getAjaxErrorMessage(
                    error,
                    "The travel list could not be updated."
                )
            );
        }
    );
}

function deleteModalSavedCountry(
    userId,
    alpha3Code,
    successCallback,
    errorCallback
) {
    let api =
        SERVER_API_BASE_URL +
        "/SavedCountries/" +
        encodeURIComponent(userId) +
        "/" +
        encodeURIComponent(alpha3Code);

    ajaxCall(
        "DELETE",
        api,
        null,
        successCallback,
        errorCallback
    );
}

function loadCountryFactIntoModal() {
    let factElement = document.getElementById("aiCountryFact");

    if (!factElement || !modalCurrentCountry) {
        return;
    }

    let countryName = String(modalCurrentCountry.name || "").trim();

    if (countryName === "") {
        factElement.textContent = "The country fact is unavailable.";
        return;
    }

    let requestedCountryName = countryName;

    factElement.textContent = "Generating an interesting fact...";
    factElement.setAttribute("aria-busy", "true");

    getAiCountryFact(countryName,
        function (fact) {
            let currentCountryName = modalCurrentCountry ? String(modalCurrentCountry.name || "").trim() : "";

            if (currentCountryName !== requestedCountryName) {
                return;
            }

            factElement.removeAttribute("aria-busy");
            factElement.textContent = fact;
        },
        function (errorMessage) {
            let currentCountryName = modalCurrentCountry ? String(modalCurrentCountry.name || "").trim() : "";

            if (currentCountryName !== requestedCountryName) {
                return;
            }

            factElement.removeAttribute("aria-busy");
            factElement.textContent = "The AI fact is temporarily unavailable.";
            console.error(errorMessage);
        }
    );
}

function handleCountryModalKeyboard(event) {
    let modalOverlay =
        document.getElementById("countryModal");

    if (!modalOverlay || modalOverlay.hidden) {
        return;
    }

    if (event.key === "Escape") {
        closeCountryModal();
    }
}