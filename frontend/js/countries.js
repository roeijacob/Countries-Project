"use strict";

let countriesStateAll = [];
let countriesStateFiltered = [];
let selectedCountryState = null;

let populationRangeMaximumState = 0;
let areaRangeMaximumState = 0;
let filtersAppliedAndActive = false;

let countriesControllerInitialized = false;

function initializeCountriesController(countries) {
    countriesStateAll = countries.slice();
    countriesStateFiltered = countries.slice();

    configureCountryRangeFilters();
    loadCountryFilterOptions();
    renderCountriesList(countriesStateFiltered);

    if (!countriesControllerInitialized) {
        initializeCountryFilterListeners();
        initializeCountriesListDelegation();
        countriesControllerInitialized = true;
    }
}

function getAllLoadedCountries() {
    return countriesStateAll.slice();
}

function getSelectedCountry() {
    return selectedCountryState;
}

function configureCountryRangeFilters() {
    populationRangeMaximumState =
        findMaximumCountryValue("population");

    areaRangeMaximumState =
        findMaximumCountryValue("area");

    configureSingleRangePair(
        "minimumPopulationInput",
        "maximumPopulationInput",
        populationRangeMaximumState
    );

    configureSingleRangePair(
        "minimumAreaInput",
        "maximumAreaInput",
        areaRangeMaximumState
    );

    updateCountryRangeDisplays();
}

function findMaximumCountryValue(propertyName) {
    let maximumValue = 0;

    countriesStateAll.forEach(function (country) {
        let value = Number(country[propertyName]);

        if (Number.isFinite(value) && value > maximumValue) {
            maximumValue = value;
        }
    });

    return Math.ceil(maximumValue);
}

function configureSingleRangePair(
    minimumIdentifier,
    maximumIdentifier,
    maximumValue
) {
    let minimumInput =
        document.getElementById(minimumIdentifier);

    let maximumInput =
        document.getElementById(maximumIdentifier);

    if (!minimumInput || !maximumInput) {
        return;
    }

    minimumInput.min = "0";
    minimumInput.max = String(maximumValue);
    minimumInput.value = "0";

    maximumInput.min = "0";
    maximumInput.max = String(maximumValue);
    maximumInput.value = String(maximumValue);
}

function loadCountryFilterOptions() {
    ajaxCall(
        "GET",
        SERVER_API_BASE_URL + "/UserPreferences/regions",
        null,
        function (regions) {
            populateSelectOptions(
                "regionFilter",
                regions,
                "All regions"
            );
        },
        function (error) {
            console.error(
                "Failed to load regions:",
                error
            );

            populateSelectOptions(
                "regionFilter",
                [],
                "All regions"
            );
        }
    );

    ajaxCall(
        "GET",
        SERVER_API_BASE_URL + "/UserPreferences/languages",
        null,
        function (languages) {
            populateSelectOptions(
                "languageFilter",
                languages,
                "All languages"
            );
        },
        function (error) {
            console.error(
                "Failed to load languages:",
                error
            );

            populateSelectOptions(
                "languageFilter",
                [],
                "All languages"
            );
        }
    );

    ajaxCall(
        "GET",
        SERVER_API_BASE_URL + "/Countries/currencies",
        null,
        function (currencies) {
            populateSelectOptions(
                "currencyFilter",
                currencies,
                "All currencies"
            );
        },
        function (error) {
            console.error(
                "Failed to load currencies:",
                error
            );

            populateSelectOptions(
                "currencyFilter",
                [],
                "All currencies"
            );
        }
    );
}

function populateSelectOptions(
    selectIdentifier,
    optionValues,
    emptyOptionText
) {
    let selectElement =
        document.getElementById(selectIdentifier);

    if (!selectElement) {
        return;
    }

    clearElementChildren(selectElement);

    let emptyOption = createElementSafely(
        "option",
        "",
        emptyOptionText
    );

    emptyOption.value = "";
    selectElement.appendChild(emptyOption);

    let uniqueValues = [];

    normalizeStringArray(optionValues).forEach(function (value) {
        if (uniqueValues.indexOf(value) === -1) {
            uniqueValues.push(value);
        }
    });

    uniqueValues.sort(function (first, second) {
        return first.localeCompare(second);
    });

    uniqueValues.forEach(function (value) {
        let option = createElementSafely(
            "option",
            "",
            value
        );

        option.value = value;
        selectElement.appendChild(option);
    });
}

function initializeCountryFilterListeners() {
    let applyButton =
        document.getElementById("applyFiltersButton");

    let resetButton =
        document.getElementById("resetFiltersButton");

    let sortSelect =
        document.getElementById("countrySortSelect");

    let searchInput =
        document.getElementById("countrySearchInput");

    let rangeInputs =
        document.querySelectorAll(".range-input");

    if (applyButton) {
        applyButton.addEventListener(
            "click",
            applyCountryFiltersAndSorting
        );
    }

    if (resetButton) {
        resetButton.addEventListener(
            "click",
            resetCountryFilters
        );
    }

    if (sortSelect) {
        sortSelect.addEventListener(
            "change",
            applyCountryFiltersAndSorting
        );
    }

    if (searchInput) {
        searchInput.addEventListener(
            "keydown",
            function (event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    applyCountryFiltersAndSorting();
                }
            }
        );
    }

    rangeInputs.forEach(function (rangeInput) {
        rangeInput.addEventListener("input", function () {
            keepRangeValuesInCorrectOrder(rangeInput);
            updateCountryRangeDisplays();
        });
    });
}

function keepRangeValuesInCorrectOrder(changedInput) {
    let isPopulation =
        changedInput.id.indexOf("Population") !== -1;

    let minimumInput = document.getElementById(
        isPopulation
            ? "minimumPopulationInput"
            : "minimumAreaInput"
    );

    let maximumInput = document.getElementById(
        isPopulation
            ? "maximumPopulationInput"
            : "maximumAreaInput"
    );

    if (!minimumInput || !maximumInput) {
        return;
    }

    let minimumValue = Number(minimumInput.value);
    let maximumValue = Number(maximumInput.value);

    if (minimumValue <= maximumValue) {
        return;
    }

    if (changedInput === minimumInput) {
        maximumInput.value = minimumInput.value;
    } else {
        minimumInput.value = maximumInput.value;
    }
}

function updateCountryRangeDisplays() {
    updateSingleRangeDisplay(
        "minimumPopulationInput",
        "maximumPopulationInput",
        "populationMinimumValue",
        "populationMaximumValue",
        "populationRangeSelection",
        populationRangeMaximumState,
        "population"
    );

    updateSingleRangeDisplay(
        "minimumAreaInput",
        "maximumAreaInput",
        "areaMinimumValue",
        "areaMaximumValue",
        "areaRangeSelection",
        areaRangeMaximumState,
        "area"
    );
}

function updateSingleRangeDisplay(
    minimumInputIdentifier,
    maximumInputIdentifier,
    minimumLabelIdentifier,
    maximumLabelIdentifier,
    selectionIdentifier,
    maximumPossibleValue,
    valueType
) {
    let minimumInput =
        document.getElementById(minimumInputIdentifier);

    let maximumInput =
        document.getElementById(maximumInputIdentifier);

    let minimumLabel =
        document.getElementById(minimumLabelIdentifier);

    let maximumLabel =
        document.getElementById(maximumLabelIdentifier);

    let selection =
        document.getElementById(selectionIdentifier);

    if (
        !minimumInput ||
        !maximumInput ||
        !minimumLabel ||
        !maximumLabel
    ) {
        return;
    }

    let minimumValue = Number(minimumInput.value);
    let maximumValue = Number(maximumInput.value);

    minimumLabel.textContent =
        valueType === "area"
            ? formatArea(minimumValue)
            : formatPopulation(minimumValue);

    maximumLabel.textContent =
        valueType === "area"
            ? formatArea(maximumValue)
            : formatPopulation(maximumValue);

    if (selection && maximumPossibleValue > 0) {
        let leftPercentage =
            minimumValue / maximumPossibleValue * 100;

        let rightPercentage =
            100 - maximumValue / maximumPossibleValue * 100;

        selection.style.left = leftPercentage + "%";
        selection.style.right = rightPercentage + "%";
    }
}

function applyCountryFiltersAndSorting() {
    if (!validateCountryFilterRanges()) {
        return;
    }

    let loadingElement =
        document.getElementById("countriesLoadingState");

    displayLoadingMessage(
        loadingElement,
        "Loading matching countries..."
    );

    let api = buildCountrySearchUrl();

    ajaxCall(
        "GET",
        api,
        null,
        function (serverCountries) {
            countriesStateFiltered =
                normalizeCountriesFromServer(serverCountries);

            filtersAppliedAndActive =
                areCountryFiltersActive();

            clearStatusMessage(loadingElement);
            renderCountriesList(countriesStateFiltered);

            if (typeof highlightFilteredCountries === "function") {
                highlightFilteredCountries(
                    countriesStateFiltered,
                    filtersAppliedAndActive
                );
            }
        },
        function (error) {
            displayErrorMessage(
                loadingElement,
                getAjaxErrorMessage(
                    error,
                    "The country search failed."
                )
            );
        }
    );
}

function buildCountrySearchUrl() {
    let parameters = [];

    addCountrySearchParameter(
        parameters,
        "name",
        getCountryFilterValue("countrySearchInput")
    );

    addCountrySearchParameter(
        parameters,
        "region",
        getCountryFilterValue("regionFilter")
    );

    addCountrySearchParameter(
        parameters,
        "language",
        getCountryFilterValue("languageFilter")
    );

    addCountrySearchParameter(
        parameters,
        "currency",
        getCountryFilterValue("currencyFilter")
    );

    let minimumPopulation =
        Number(getCountryFilterValue("minimumPopulationInput"));

    let maximumPopulation =
        Number(getCountryFilterValue("maximumPopulationInput"));

    let minimumArea =
        Number(getCountryFilterValue("minimumAreaInput"));

    let maximumArea =
        Number(getCountryFilterValue("maximumAreaInput"));

    if (minimumPopulation > 0) {
        addCountrySearchParameter(
            parameters,
            "minPopulation",
            minimumPopulation
        );
    }

    if (maximumPopulation < populationRangeMaximumState) {
        addCountrySearchParameter(
            parameters,
            "maxPopulation",
            maximumPopulation
        );
    }

    if (minimumArea > 0) {
        addCountrySearchParameter(
            parameters,
            "minArea",
            minimumArea
        );
    }

    if (maximumArea < areaRangeMaximumState) {
        addCountrySearchParameter(
            parameters,
            "maxArea",
            maximumArea
        );
    }

    let sortValue =
        getCountryFilterValue("countrySortSelect");

    let sortParts = sortValue.split("-");

    addCountrySearchParameter(
        parameters,
        "sortBy",
        sortParts[0] || "name"
    );

    addCountrySearchParameter(
        parameters,
        "sortDirection",
        sortParts[1] || "asc"
    );

    return (
        SERVER_API_BASE_URL +
        "/Countries/search?" +
        parameters.join("&")
    );
}

function addCountrySearchParameter(parameters, name, value) {
    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ""
    ) {
        return;
    }

    parameters.push(
        encodeURIComponent(name) +
        "=" +
        encodeURIComponent(value)
    );
}

function renderCountriesList(countries) {
    let countriesList =
        document.getElementById("countriesList");

    if (!countriesList) {
        return;
    }

    clearElementChildren(countriesList);

    if (countries.length === 0) {
        countriesList.appendChild(
            createElementSafely(
                "p",
                "status-message status-message-loading",
                "No countries match the selected filters."
            )
        );

        return;
    }

    countries.forEach(function (country) {
        countriesList.appendChild(
            createCountryCard(country)
        );
    });

    if (selectedCountryState) {
        updateSelectedCountryCard(
            selectedCountryState.alpha2Code
        );
    }
}

function createCountryCard(country) {
    let card =
        createElementSafely("article", "country-card", null);

    card.setAttribute("role", "listitem");
    card.setAttribute(
        "data-country-code",
        country.alpha2Code
    );

    card.setAttribute(
        "data-alpha3-code",
        country.alpha3Code
    );

    let toggleButton =
        createElementSafely(
            "button",
            "country-accordion-toggle",
            null
        );

    toggleButton.type = "button";
    toggleButton.setAttribute(
        "data-country-action",
        "toggle"
    );

    toggleButton.setAttribute(
        "data-alpha3-code",
        country.alpha3Code
    );

    toggleButton.setAttribute(
        "aria-expanded",
        "false"
    );

    let flag = document.createElement("img");
    flag.className = "country-card-flag";
    flag.src = getCountryFlagUrl(country);
    flag.alt = country.name + " flag";
    setImageFallback(flag, DEFAULT_PROFILE_IMAGE_URL);

    let name =
        createElementSafely(
            "span",
            "country-accordion-name",
            country.name
        );

    let arrow =
        createElementSafely(
            "span",
            "country-accordion-arrow",
            null
        );

    toggleButton.appendChild(flag);
    toggleButton.appendChild(name);
    toggleButton.appendChild(arrow);

    let details =
        createElementSafely(
            "div",
            "country-card-details",
            null
        );

    details.hidden = true;

    details.appendChild(
        createCountryAccordionDetail(
            "Capital",
            country.capital || "Not available"
        )
    );

    details.appendChild(
        createCountryAccordionDetail(
            "Region",
            country.region || "Not available"
        )
    );

    details.appendChild(
        createCountryAccordionDetail(
            "Population",
            formatPopulation(country.population)
        )
    );

    details.appendChild(
        createCountryAccordionDetail(
            "Area",
            formatArea(country.area)
        )
    );

    let detailsButton =
        createElementSafely(
            "button",
            "country-open-details-button",
            "Open Full Details"
        );

    detailsButton.type = "button";
    detailsButton.setAttribute(
        "data-country-action",
        "details"
    );

    detailsButton.setAttribute(
        "data-alpha3-code",
        country.alpha3Code
    );

    details.appendChild(detailsButton);

    card.appendChild(toggleButton);
    card.appendChild(details);

    return card;
}

function createCountryAccordionDetail(label, value) {
    let row =
        createElementSafely(
            "div",
            "country-accordion-detail-row",
            null
        );

    row.appendChild(
        createElementSafely(
            "span",
            "country-accordion-detail-label",
            label
        )
    );

    row.appendChild(
        createElementSafely(
            "span",
            "country-accordion-detail-value",
            value
        )
    );

    return row;
}

function initializeCountriesListDelegation() {
    let countriesList =
        document.getElementById("countriesList");

    if (!countriesList) {
        return;
    }

    countriesList.addEventListener(
        "click",
        handleCountriesListInteraction
    );
}

function handleCountriesListInteraction(event) {
    let actionElement =
        event.target.closest("[data-country-action]");

    if (!actionElement) {
        return;
    }

    let alpha3Code =
        actionElement.getAttribute("data-alpha3-code");

    let country =
        findCountryByAlpha3Code(
            countriesStateFiltered,
            alpha3Code
        );

    if (!country) {
        country =
            findCountryByAlpha3Code(
                countriesStateAll,
                alpha3Code
            );
    }

    if (!country) {
        return;
    }

    let action =
        actionElement.getAttribute("data-country-action");

    if (action === "toggle") {
        toggleCountryAccordion(actionElement, country);
    }

    if (action === "details") {
        selectCountry(country, "list");
    }
}

function toggleCountryAccordion(button, country) {
    let card = button.closest(".country-card");

    if (!card) {
        return;
    }

    let details =
        card.querySelector(".country-card-details");

    if (!details) {
        return;
    }

    let isOpen =
        button.getAttribute("aria-expanded") === "true";

    closeAllCountryAccordions(card);

    button.setAttribute(
        "aria-expanded",
        String(!isOpen)
    );

    details.hidden = isOpen;
    card.classList.toggle("country-card-open", !isOpen);

    if (!isOpen) {
        selectedCountryState = country;
        updateSelectedCountryCard(country.alpha2Code);

        if (typeof stopGlobeRotation === "function") {
            stopGlobeRotation();
        }

        if (typeof focusCountryOnGlobe === "function") {
            focusCountryOnGlobe(country);
        }

        if (typeof setSelectedCountryOnGlobe === "function") {
            setSelectedCountryOnGlobe(country);
        }
    }
}

function closeAllCountryAccordions(excludedCard) {
    let cards =
        document.querySelectorAll(".country-card");

    cards.forEach(function (card) {
        if (card === excludedCard) {
            return;
        }

        let button =
            card.querySelector(".country-accordion-toggle");

        let details =
            card.querySelector(".country-card-details");

        if (button) {
            button.setAttribute(
                "aria-expanded",
                "false"
            );
        }

        if (details) {
            details.hidden = true;
        }

        card.classList.remove("country-card-open");
    });
}

function selectCountry(country, selectionSource) {
    if (!country) {
        return;
    }

    ensureCountryAppearsInCurrentList(country);

    selectedCountryState = country;

    openCountryAccordion(country.alpha2Code);
    updateSelectedCountryCard(country.alpha2Code);
    scrollCountryCardIntoView(country.alpha2Code);

    if (typeof stopGlobeRotation === "function") {
        stopGlobeRotation();
    }

    if (
        selectionSource !== "globe" &&
        typeof focusCountryOnGlobe === "function"
    ) {
        focusCountryOnGlobe(country);
    }

    if (typeof setSelectedCountryOnGlobe === "function") {
        setSelectedCountryOnGlobe(country);
    }

    if (typeof openCountryModal === "function") {
        openCountryModal(
            country,
            countriesStateAll
        );
    }
}

function ensureCountryAppearsInCurrentList(country) {
    let existingCountry =
        findCountryByAlpha3Code(
            countriesStateFiltered,
            country.alpha3Code
        );

    if (existingCountry) {
        return;
    }

    countriesStateFiltered = countriesStateAll.slice();
    filtersAppliedAndActive = false;

    resetCountryFilterControls();
    renderCountriesList(countriesStateFiltered);

    if (typeof highlightFilteredCountries === "function") {
        highlightFilteredCountries(
            countriesStateFiltered,
            false
        );
    }
}

function openCountryAccordion(alpha2Code) {
    let card = document.querySelector(
        ".country-card[data-country-code='" +
        alpha2Code +
        "']"
    );

    if (!card) {
        return;
    }

    let button =
        card.querySelector(".country-accordion-toggle");

    let details =
        card.querySelector(".country-card-details");

    if (!button || !details) {
        return;
    }

    closeAllCountryAccordions(card);

    button.setAttribute("aria-expanded", "true");
    details.hidden = false;
    card.classList.add("country-card-open");
}

function updateSelectedCountryCard(alpha2Code) {
    let cards =
        document.querySelectorAll(".country-card");

    cards.forEach(function (card) {
        let cardCode =
            card.getAttribute("data-country-code");

        let isSelected = cardCode === alpha2Code;

        card.classList.toggle(
            "country-card-selected",
            isSelected
        );

        if (isSelected) {
            card.setAttribute("aria-current", "true");
        } else {
            card.removeAttribute("aria-current");
        }
    });
}

function scrollCountryCardIntoView(alpha2Code) {
    let card = document.querySelector(
        ".country-card[data-country-code='" +
        alpha2Code +
        "']"
    );

    if (!card) {
        return;
    }

    card.scrollIntoView({
        behavior: "smooth",
        block: "nearest"
    });
}

function validateCountryFilterRanges() {
    let statusElement =
        document.getElementById(
            "filtersValidationMessage"
        );

    let minimumPopulation = Number(
        getCountryFilterValue("minimumPopulationInput")
    );

    let maximumPopulation = Number(
        getCountryFilterValue("maximumPopulationInput")
    );

    let minimumArea = Number(
        getCountryFilterValue("minimumAreaInput")
    );

    let maximumArea = Number(
        getCountryFilterValue("maximumAreaInput")
    );

    if (minimumPopulation > maximumPopulation) {
        displayErrorMessage(
            statusElement,
            "Minimum population cannot be greater than maximum population."
        );

        return false;
    }

    if (minimumArea > maximumArea) {
        displayErrorMessage(
            statusElement,
            "Minimum area cannot be greater than maximum area."
        );

        return false;
    }

    clearStatusMessage(statusElement);
    return true;
}

function areCountryFiltersActive() {
    return (
        getCountryFilterValue("countrySearchInput") !== "" ||
        getCountryFilterValue("regionFilter") !== "" ||
        getCountryFilterValue("languageFilter") !== "" ||
        getCountryFilterValue("currencyFilter") !== "" ||
        Number(
            getCountryFilterValue("minimumPopulationInput")
        ) > 0 ||
        Number(
            getCountryFilterValue("maximumPopulationInput")
        ) < populationRangeMaximumState ||
        Number(
            getCountryFilterValue("minimumAreaInput")
        ) > 0 ||
        Number(
            getCountryFilterValue("maximumAreaInput")
        ) < areaRangeMaximumState
    );
}

function resetCountryFilters() {
    resetCountryFilterControls();
    updateCountryRangeDisplays();
    applyCountryFiltersAndSorting();
}

function resetCountryFilterControls() {
    setCountryFilterValue("countrySearchInput", "");
    setCountryFilterValue("regionFilter", "");
    setCountryFilterValue("languageFilter", "");
    setCountryFilterValue("currencyFilter", "");
    setCountryFilterValue("countrySortSelect", "name-asc");

    setCountryFilterValue(
        "minimumPopulationInput",
        "0"
    );

    setCountryFilterValue(
        "maximumPopulationInput",
        String(populationRangeMaximumState)
    );

    setCountryFilterValue(
        "minimumAreaInput",
        "0"
    );

    setCountryFilterValue(
        "maximumAreaInput",
        String(areaRangeMaximumState)
    );
}

function getCountryFilterValue(identifier) {
    let element = document.getElementById(identifier);

    if (!element) {
        return "";
    }

    return String(element.value).trim();
}

function setCountryFilterValue(identifier, value) {
    let element = document.getElementById(identifier);

    if (element) {
        element.value = value;
    }
}