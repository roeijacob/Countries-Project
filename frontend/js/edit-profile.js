"use strict";

let editProfileUser = null;

let editProfileHobbyOptions = [];
let editProfileLanguageOptions = [];
let editProfileRegionOptions = [];
let editProfilePreferenceOptions = [];
let editProfileCountries = [];

let editProfileSelectedHobbies = [];
let editProfileSelectedLanguages = [];
let editProfileSelectedRegions = [];
let editProfileSelectedPreferences = [];

let editProfileVisitedCodes = [];
let editProfileWantedCodes = [];

let editProfileOriginalVisitedCodes = [];
let editProfileOriginalWantedCodes = [];

function initializeEditProfilePage() {
    if (!protectLoggedInPage()) {
        return;
    }

    initializeEditProfileListeners();
    loadEditProfileUser();
}

function loadEditProfileUser() {
    let session = getLoggedInUserSession();

    let statusElement =
        document.getElementById("editProfileStatus");

    displayLoadingMessage(
        statusElement,
        "Loading profile information..."
    );

    ajaxCall(
        "GET",
        SERVER_API_BASE_URL +
        "/Users/" +
        encodeURIComponent(session.userID),
        null,
        function (user) {
            if (!user) {
                displayErrorMessage(
                    statusElement,
                    "The user could not be found."
                );

                return;
            }

            editProfileUser = user;

            editProfileSelectedHobbies =
                Array.isArray(user.hobbies)
                    ? user.hobbies.slice()
                    : [];

            editProfileSelectedLanguages =
                normalizeSelectedLanguages(
                    user.spokenLanguages
                );

            editProfileSelectedRegions =
                Array.isArray(user.favoriteRegions)
                    ? user.favoriteRegions.slice()
                    : [];

            editProfileSelectedPreferences =
                Array.isArray(user.travelPreferences)
                    ? user.travelPreferences.slice()
                    : [];

            populateBasicEditProfileFields(user);
            loadEditProfileOptions();
        },
        function (error) {
            displayErrorMessage(
                statusElement,
                getAjaxErrorMessage(
                    error,
                    "The profile could not be loaded."
                )
            );
        }
    );
}

function loadEditProfileOptions() {
    ajaxCall(
        "GET",
        SERVER_API_BASE_URL +
        "/UserPreferences/hobbies",
        null,
        function (hobbies) {
            editProfileHobbyOptions =
                normalizeStringArray(hobbies);

            ajaxCall(
                "GET",
                SERVER_API_BASE_URL +
                "/UserPreferences/languages",
                null,
                function (languages) {
                    editProfileLanguageOptions =
                        normalizeStringArray(languages);

                    ajaxCall(
                        "GET",
                        SERVER_API_BASE_URL +
                        "/UserPreferences/regions",
                        null,
                        function (regions) {
                            editProfileRegionOptions =
                                normalizeStringArray(regions);

                            ajaxCall(
                                "GET",
                                SERVER_API_BASE_URL +
                                "/UserPreferences/travel-preferences",
                                null,
                                function (preferences) {
                                    editProfilePreferenceOptions =
                                        normalizeStringArray(
                                            preferences
                                        );

                                    loadEditProfileCountries();
                                },
                                handleEditProfileLoadError
                            );
                        },
                        handleEditProfileLoadError
                    );
                },
                handleEditProfileLoadError
            );
        },
        handleEditProfileLoadError
    );
}

function loadEditProfileCountries() {
    ajaxCall(
        "GET",
        SERVER_API_BASE_URL + "/Countries",
        null,
        function (countries) {
            editProfileCountries =
                normalizeCountriesFromServer(countries);

            loadEditProfileSavedLists();
        },
        handleEditProfileLoadError
    );
}

function loadEditProfileSavedLists() {
    let session = getLoggedInUserSession();

    ajaxCall(
        "GET",
        SERVER_API_BASE_URL +
        "/SavedCountries/" +
        encodeURIComponent(session.userID) +
        "/" +
        encodeURIComponent(VISITED_LIST_TYPE),
        null,
        function (visitedCountries) {
            editProfileVisitedCodes =
                extractSavedCountryCodes(
                    visitedCountries
                );

            editProfileOriginalVisitedCodes =
                editProfileVisitedCodes.slice();

            ajaxCall(
                "GET",
                SERVER_API_BASE_URL +
                "/SavedCountries/" +
                encodeURIComponent(session.userID) +
                "/" +
                encodeURIComponent(
                    WANT_TO_VISIT_LIST_TYPE
                ),
                null,
                function (wantedCountries) {
                    editProfileWantedCodes =
                        extractSavedCountryCodes(
                            wantedCountries
                        );

                    editProfileOriginalWantedCodes =
                        editProfileWantedCodes.slice();

                    renderCompleteEditProfile();
                },
                handleEditProfileLoadError
            );
        },
        handleEditProfileLoadError
    );
}

function handleEditProfileLoadError(error) {
    displayErrorMessage(
        document.getElementById("editProfileStatus"),
        getAjaxErrorMessage(
            error,
            "Profile options could not be loaded."
        )
    );
}

function normalizeSelectedLanguages(languages) {
    if (!Array.isArray(languages)) {
        return [];
    }

    let normalizedLanguages = [];

    languages.forEach(function (language) {
        if (!language || !language.languageName) {
            return;
        }

        normalizedLanguages.push({
            languageName: language.languageName,
            proficiencyLevel:
                Number(language.proficiencyLevel) || 1
        });
    });

    return normalizedLanguages;
}

function populateBasicEditProfileFields(user) {
    setEditProfileInputValue(
        "editFullName",
        user.fullName
    );

    setEditProfileInputValue(
        "editBirthDate",
        formatDateForInput(user.birthDate)
    );

    setEditProfileInputValue(
        "editGender",
        user.gender
    );

    setEditProfileInputValue(
        "editImageUrl",
        user.imageUrl
    );

    updateEditProfileImagePreview(
        user.imageUrl
    );
}

function formatDateForInput(dateValue) {
    if (!dateValue) {
        return "";
    }

    let date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    let year = date.getFullYear();
    let month = String(date.getMonth() + 1).padStart(2, "0");
    let day = String(date.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
}

function renderCompleteEditProfile() {
    renderCheckboxOptions(
        "hobbiesGrid",
        editProfileHobbyOptions,
        editProfileSelectedHobbies,
        "hobby-option",
        "hobby"
    );

    renderCheckboxOptions(
        "preferencesGrid",
        editProfilePreferenceOptions,
        editProfileSelectedPreferences,
        "preference-option",
        "preference"
    );

    renderCheckboxOptions(
        "continentsGrid",
        editProfileRegionOptions,
        editProfileSelectedRegions,
        "preference-option",
        "region"
    );

    populateLanguageSelect();
    renderSelectedLanguages();
    renderCountrySelectors();

    clearStatusMessage(
        document.getElementById("editProfileStatus")
    );
}

function renderCheckboxOptions(
    containerIdentifier,
    options,
    selectedValues,
    className,
    optionType
) {
    let container =
        document.getElementById(containerIdentifier);

    if (!container) {
        return;
    }

    clearElementChildren(container);

    options.forEach(function (optionValue) {
        let label =
            createElementSafely(
                "label",
                className,
                null
            );

        let checkbox =
            document.createElement("input");

        checkbox.type = "checkbox";
        checkbox.value = optionValue;

        checkbox.setAttribute(
            "data-edit-option-type",
            optionType
        );

        checkbox.checked =
            selectedValues.indexOf(optionValue) !== -1;

        label.appendChild(checkbox);
        label.appendChild(
            createElementSafely(
                "span",
                "",
                optionValue
            )
        );

        container.appendChild(label);
    });
}

function populateLanguageSelect() {
    let select =
        document.getElementById("languageToAdd");

    if (!select) {
        return;
    }

    clearElementChildren(select);

    let emptyOption =
        createElementSafely(
            "option",
            "",
            "Choose language"
        );

    emptyOption.value = "";
    select.appendChild(emptyOption);

    editProfileLanguageOptions
        .slice()
        .sort(function (first, second) {
            return first.localeCompare(second);
        })
        .forEach(function (language) {
            let option =
                createElementSafely(
                    "option",
                    "",
                    language
                );

            option.value = language;
            select.appendChild(option);
        });
}

function addSelectedLanguage() {
    let languageSelect =
        document.getElementById("languageToAdd");

    let levelInput =
        document.getElementById(
            "languageLevelToAdd"
        );

    if (!languageSelect || !levelInput) {
        return;
    }

    let languageName =
        languageSelect.value.trim();

    let level = Number(levelInput.value);

    if (languageName === "") {
        displayErrorMessage(
            document.getElementById(
                "editProfileStatus"
            ),
            "Choose a language first."
        );

        return;
    }

    let existingLanguage =
        findSelectedLanguage(languageName);

    if (existingLanguage) {
        existingLanguage.proficiencyLevel = level;
    } else {
        editProfileSelectedLanguages.push({
            languageName: languageName,
            proficiencyLevel: level
        });
    }

    languageSelect.value = "";
    renderSelectedLanguages();
    clearStatusMessage(
        document.getElementById("editProfileStatus")
    );
}

function findSelectedLanguage(languageName) {
    for (
        let index = 0;
        index < editProfileSelectedLanguages.length;
        index++
    ) {
        if (
            editProfileSelectedLanguages[index]
                .languageName === languageName
        ) {
            return editProfileSelectedLanguages[index];
        }
    }

    return null;
}

function renderSelectedLanguages() {
    let container =
        document.getElementById(
            "selectedLanguagesList"
        );

    if (!container) {
        return;
    }

    clearElementChildren(container);

    if (editProfileSelectedLanguages.length === 0) {
        container.appendChild(
            createElementSafely(
                "p",
                "",
                "No languages selected."
            )
        );

        return;
    }

    editProfileSelectedLanguages.forEach(
        function (language) {
            let row =
                createElementSafely(
                    "div",
                    "selected-language-row",
                    null
                );

            row.appendChild(
                createElementSafely(
                    "strong",
                    "",
                    language.languageName
                )
            );

            let slider =
                document.createElement("input");

            slider.type = "range";
            slider.min = "1";
            slider.max = "5";
            slider.step = "1";
            slider.value =
                String(language.proficiencyLevel);

            slider.className =
                "selected-language-slider";

            slider.setAttribute(
                "data-language-level",
                language.languageName
            );

            let levelText =
                createElementSafely(
                    "span",
                    "range-value",
                    getLanguageLevelLabel(
                        language.proficiencyLevel
                    )
                );

            slider.addEventListener(
                "input",
                function () {
                    language.proficiencyLevel =
                        Number(slider.value);

                    levelText.textContent =
                        getLanguageLevelLabel(
                            language.proficiencyLevel
                        );
                }
            );

            let removeButton =
                createElementSafely(
                    "button",
                    "secondary-button",
                    "Remove"
                );

            removeButton.type = "button";

            removeButton.setAttribute(
                "data-remove-language",
                "true"
            );

            removeButton.setAttribute(
                "aria-label",
                "Remove " + language.languageName
            );

            removeButton.title = "Remove language";

            removeButton.addEventListener(
                "click",
                function () {
                    removeSelectedLanguage(
                        language.languageName
                    );
                }
            );

            row.appendChild(slider);
            row.appendChild(levelText);
            row.appendChild(removeButton);

            container.appendChild(row);
        }
    );
}

function removeSelectedLanguage(languageName) {
    editProfileSelectedLanguages =
        editProfileSelectedLanguages.filter(
            function (language) {
                return (
                    language.languageName !== languageName
                );
            }
        );

    renderSelectedLanguages();
}

function getLanguageLevelLabel(level) {
    let labels = [
        "",
        "Beginner",
        "Basic",
        "Intermediate",
        "Advanced",
        "Expert"
    ];

    let safeLevel = Number(level);

    return (
        (labels[safeLevel] || "Unknown") +
        " · " +
        safeLevel +
        "/5"
    );
}

function updateLanguageLevelLabel() {
    let levelInput =
        document.getElementById(
            "languageLevelToAdd"
        );

    let label =
        document.getElementById(
            "languageLevelToAddValue"
        );

    if (levelInput && label) {
        label.textContent =
            getLanguageLevelLabel(
                Number(levelInput.value)
            );
    }
}

function extractSavedCountryCodes(countries) {
    if (!Array.isArray(countries)) {
        return [];
    }

    let codes = [];

    countries.forEach(function (country) {
        if (
            country &&
            isNonEmptyText(country.alpha3Code)
        ) {
            codes.push(
                country.alpha3Code.toUpperCase()
            );
        }
    });

    return codes;
}

function renderCountrySelectors() {
    renderSingleCountrySelector(
        "visitedCountrySelector",
        "visitedCountrySearch",
        editProfileVisitedCodes,
        VISITED_LIST_TYPE
    );

    renderSingleCountrySelector(
        "wantedCountrySelector",
        "wantedCountrySearch",
        editProfileWantedCodes,
        WANT_TO_VISIT_LIST_TYPE
    );
}

function renderSingleCountrySelector(
    containerIdentifier,
    searchIdentifier,
    selectedCodes,
    listType
) {
    let container =
        document.getElementById(containerIdentifier);

    let searchInput =
        document.getElementById(searchIdentifier);

    if (!container) {
        return;
    }

    let searchValue =
        searchInput
            ? searchInput.value.trim().toLowerCase()
            : "";

    clearElementChildren(container);

    editProfileCountries.forEach(function (country) {
        if (
            searchValue !== "" &&
            country.name.toLowerCase()
                .indexOf(searchValue) === -1
        ) {
            return;
        }

        let button =
            createElementSafely(
                "button",
                "country-flag-option",
                null
            );

        button.type = "button";

        button.classList.toggle(
            "country-selected",
            selectedCodes.indexOf(
                country.alpha3Code.toUpperCase()
            ) !== -1
        );

        button.title = country.name;

        let flag = document.createElement("img");
        flag.src = getCountryFlagUrl(country);
        flag.alt = country.name + " flag";
        setImageFallback(
            flag,
            DEFAULT_PROFILE_IMAGE_URL
        );

        button.appendChild(flag);
        button.appendChild(
            createElementSafely(
                "span",
                "",
                country.name
            )
        );

        button.addEventListener(
            "click",
            function () {
                toggleCountrySelection(
                    country.alpha3Code,
                    listType
                );
            }
        );

        container.appendChild(button);
    });
}

function toggleCountrySelection(alpha3Code, listType) {
    let normalizedCode =
        alpha3Code.toUpperCase();

    if (listType === VISITED_LIST_TYPE) {
        toggleCodeInsideArray(
            editProfileVisitedCodes,
            normalizedCode
        );

        if (
            editProfileVisitedCodes.indexOf(
                normalizedCode
            ) !== -1
        ) {
            removeCodeFromArray(
                editProfileWantedCodes,
                normalizedCode
            );
        }
    } else {
        toggleCodeInsideArray(
            editProfileWantedCodes,
            normalizedCode
        );

        if (
            editProfileWantedCodes.indexOf(
                normalizedCode
            ) !== -1
        ) {
            removeCodeFromArray(
                editProfileVisitedCodes,
                normalizedCode
            );
        }
    }

    renderCountrySelectors();
}

function toggleCodeInsideArray(array, code) {
    let index = array.indexOf(code);

    if (index === -1) {
        array.push(code);
    } else {
        array.splice(index, 1);
    }
}

function removeCodeFromArray(array, code) {
    let index = array.indexOf(code);

    if (index !== -1) {
        array.splice(index, 1);
    }
}

function initializeEditProfileListeners() {
    let form =
        document.getElementById("editProfileForm");

    let addLanguageButton =
        document.getElementById(
            "addLanguageButton"
        );

    let languageLevel =
        document.getElementById(
            "languageLevelToAdd"
        );

    let imageUrlInput =
        document.getElementById("editImageUrl");

    let visitedSearch =
        document.getElementById(
            "visitedCountrySearch"
        );

    let wantedSearch =
        document.getElementById(
            "wantedCountrySearch"
        );

    if (form) {
        form.addEventListener(
            "submit",
            handleEditProfileSubmit
        );

        form.addEventListener(
            "change",
            handleEditOptionChange
        );
    }

    if (addLanguageButton) {
        addLanguageButton.addEventListener(
            "click",
            addSelectedLanguage
        );
    }

    if (languageLevel) {
        languageLevel.addEventListener(
            "input",
            updateLanguageLevelLabel
        );
    }

    if (imageUrlInput) {
        imageUrlInput.addEventListener(
            "input",
            function () {
                updateEditProfileImagePreview(
                    imageUrlInput.value.trim()
                );
            }
        );
    }

    if (visitedSearch) {
        visitedSearch.addEventListener(
            "input",
            debounceFunction(
                renderCountrySelectors,
                SEARCH_DEBOUNCE_DELAY
            )
        );
    }

    if (wantedSearch) {
        wantedSearch.addEventListener(
            "input",
            debounceFunction(
                renderCountrySelectors,
                SEARCH_DEBOUNCE_DELAY
            )
        );
    }
}

function handleEditOptionChange(event) {
    let input =
        event.target.closest(
            "[data-edit-option-type]"
        );

    if (!input) {
        return;
    }

    let optionType =
        input.getAttribute(
            "data-edit-option-type"
        );

    let targetArray = null;

    if (optionType === "hobby") {
        targetArray = editProfileSelectedHobbies;
    }

    if (optionType === "preference") {
        targetArray =
            editProfileSelectedPreferences;
    }

    if (optionType === "region") {
        targetArray = editProfileSelectedRegions;
    }

    if (!targetArray) {
        return;
    }

    if (input.checked) {
        if (targetArray.indexOf(input.value) === -1) {
            targetArray.push(input.value);
        }
    } else {
        removeCodeFromArray(
            targetArray,
            input.value
        );
    }
}

function updateEditProfileImagePreview(imageUrl) {
    let preview =
        document.getElementById("editImagePreview");

    if (!preview) {
        return;
    }

    preview.src =
        isNonEmptyText(imageUrl)
            ? imageUrl
            : DEFAULT_PROFILE_IMAGE_URL;

    setImageFallback(
        preview,
        DEFAULT_PROFILE_IMAGE_URL
    );
}

function handleEditProfileSubmit(event) {
    event.preventDefault();

    let session = getLoggedInUserSession();

    let statusElement =
        document.getElementById(
            "editProfileStatus"
        );

    let fullName =
        getEditProfileInputValue("editFullName");

    let birthDate =
        getEditProfileInputValue("editBirthDate");

    let gender =
        getEditProfileInputValue("editGender");

    let imageUrl =
        getEditProfileInputValue("editImageUrl");

    if (!isNonEmptyText(fullName)) {
        displayErrorMessage(
            statusElement,
            "Please enter your full name."
        );

        return;
    }

    if (!validateBirthDate(birthDate)) {
        displayErrorMessage(
            statusElement,
            "Please enter a valid birth date."
        );

        return;
    }

    if (!isNonEmptyText(gender)) {
        displayErrorMessage(
            statusElement,
            "Please select your gender."
        );

        return;
    }

    let updatedUser = {
        fullName: fullName,
        birthDate: birthDate,
        gender: gender,
        imageUrl: imageUrl
    };

    displayLoadingMessage(
        statusElement,
        "Saving profile..."
    );

    ajaxCall(
        "PUT",
        SERVER_API_BASE_URL +
        "/Users/" +
        encodeURIComponent(session.userID),
        JSON.stringify(updatedUser),
        function () {
            saveEditProfileHobbies(
                session,
                fullName,
                imageUrl,
                statusElement
            );
        },
        function (error) {
            displayErrorMessage(
                statusElement,
                getAjaxErrorMessage(
                    error,
                    "The personal information could not be saved."
                )
            );
        }
    );
}

function saveEditProfileHobbies(
    session,
    fullName,
    imageUrl,
    statusElement
) {
    ajaxCall(
        "PUT",
        SERVER_API_BASE_URL +
        "/UserPreferences/" +
        encodeURIComponent(session.userID) +
        "/hobbies",
        JSON.stringify(editProfileSelectedHobbies),
        function () {
            saveEditProfileLanguages(
                session,
                fullName,
                imageUrl,
                statusElement
            );
        },
        function (error) {
            displayEditProfileSaveError(
                error,
                statusElement,
                "The hobbies could not be saved."
            );
        }
    );
}

function saveEditProfileLanguages(
    session,
    fullName,
    imageUrl,
    statusElement
) {
    ajaxCall(
        "PUT",
        SERVER_API_BASE_URL +
        "/UserPreferences/" +
        encodeURIComponent(session.userID) +
        "/languages",
        JSON.stringify(editProfileSelectedLanguages),
        function () {
            saveEditProfileRegions(
                session,
                fullName,
                imageUrl,
                statusElement
            );
        },
        function (error) {
            displayEditProfileSaveError(
                error,
                statusElement,
                "The languages could not be saved."
            );
        }
    );
}

function saveEditProfileRegions(
    session,
    fullName,
    imageUrl,
    statusElement
) {
    ajaxCall(
        "PUT",
        SERVER_API_BASE_URL +
        "/UserPreferences/" +
        encodeURIComponent(session.userID) +
        "/regions",
        JSON.stringify(editProfileSelectedRegions),
        function () {
            saveEditProfilePreferences(
                session,
                fullName,
                imageUrl,
                statusElement
            );
        },
        function (error) {
            displayEditProfileSaveError(
                error,
                statusElement,
                "The preferred regions could not be saved."
            );
        }
    );
}

function saveEditProfilePreferences(
    session,
    fullName,
    imageUrl,
    statusElement
) {
    ajaxCall(
        "PUT",
        SERVER_API_BASE_URL +
        "/UserPreferences/" +
        encodeURIComponent(session.userID) +
        "/travel-preferences",
        JSON.stringify(
            editProfileSelectedPreferences
        ),
        function () {
            synchronizeEditProfileSavedCountries(
                session,
                fullName,
                imageUrl,
                statusElement
            );
        },
        function (error) {
            displayEditProfileSaveError(
                error,
                statusElement,
                "The travel preferences could not be saved."
            );
        }
    );
}

function synchronizeEditProfileSavedCountries(
    session,
    fullName,
    imageUrl,
    statusElement
) {
    let allCodes = [];

    addUniqueCodes(
        allCodes,
        editProfileOriginalVisitedCodes
    );

    addUniqueCodes(
        allCodes,
        editProfileOriginalWantedCodes
    );

    addUniqueCodes(
        allCodes,
        editProfileVisitedCodes
    );

    addUniqueCodes(
        allCodes,
        editProfileWantedCodes
    );

    let changedCodes = [];

    allCodes.forEach(function (code) {
        let originalType =
            getOriginalCountryListType(code);

        let desiredType =
            getDesiredCountryListType(code);

        if (originalType !== desiredType) {
            changedCodes.push(code);
        }
    });

    processSavedCountryChanges(
        changedCodes,
        0,
        session,
        fullName,
        imageUrl,
        statusElement
    );
}

function addUniqueCodes(target, source) {
    source.forEach(function (code) {
        if (target.indexOf(code) === -1) {
            target.push(code);
        }
    });
}

function getOriginalCountryListType(code) {
    if (
        editProfileOriginalVisitedCodes.indexOf(code) !== -1
    ) {
        return VISITED_LIST_TYPE;
    }

    if (
        editProfileOriginalWantedCodes.indexOf(code) !== -1
    ) {
        return WANT_TO_VISIT_LIST_TYPE;
    }

    return "";
}

function getDesiredCountryListType(code) {
    if (
        editProfileVisitedCodes.indexOf(code) !== -1
    ) {
        return VISITED_LIST_TYPE;
    }

    if (
        editProfileWantedCodes.indexOf(code) !== -1
    ) {
        return WANT_TO_VISIT_LIST_TYPE;
    }

    return "";
}

function processSavedCountryChanges(
    changedCodes,
    currentIndex,
    session,
    fullName,
    imageUrl,
    statusElement
) {
    if (currentIndex >= changedCodes.length) {
        finishEditProfileSave(
            session,
            fullName,
            imageUrl,
            statusElement
        );

        return;
    }

    let alpha3Code = changedCodes[currentIndex];
    let desiredType =
        getDesiredCountryListType(alpha3Code);

    ajaxCall(
        "DELETE",
        SERVER_API_BASE_URL +
        "/SavedCountries/" +
        encodeURIComponent(session.userID) +
        "/" +
        encodeURIComponent(alpha3Code),
        null,
        function () {
            addChangedSavedCountryIfNeeded(
                changedCodes,
                currentIndex,
                alpha3Code,
                desiredType,
                session,
                fullName,
                imageUrl,
                statusElement
            );
        },
        function () {
            addChangedSavedCountryIfNeeded(
                changedCodes,
                currentIndex,
                alpha3Code,
                desiredType,
                session,
                fullName,
                imageUrl,
                statusElement
            );
        }
    );
}

function addChangedSavedCountryIfNeeded(
    changedCodes,
    currentIndex,
    alpha3Code,
    desiredType,
    session,
    fullName,
    imageUrl,
    statusElement
) {
    if (desiredType === "") {
        processSavedCountryChanges(
            changedCodes,
            currentIndex + 1,
            session,
            fullName,
            imageUrl,
            statusElement
        );

        return;
    }

    ajaxCall(
        "POST",
        SERVER_API_BASE_URL +
        "/SavedCountries/" +
        encodeURIComponent(session.userID) +
        "/" +
        encodeURIComponent(alpha3Code) +
        "/" +
        encodeURIComponent(desiredType),
        null,
        function () {
            processSavedCountryChanges(
                changedCodes,
                currentIndex + 1,
                session,
                fullName,
                imageUrl,
                statusElement
            );
        },
        function (error) {
            displayEditProfileSaveError(
                error,
                statusElement,
                "A saved country could not be updated."
            );
        }
    );
}

function finishEditProfileSave(
    session,
    fullName,
    imageUrl,
    statusElement
) {
    session.fullName = fullName;
    session.imageUrl = imageUrl;

    localStorage.setItem(
        SESSION_STORAGE_KEY,
        JSON.stringify(session)
    );

    displaySuccessMessage(
        statusElement,
        "Profile saved successfully."
    );

    window.setTimeout(function () {
        window.location.href = "profile.html";
    }, 700);
}

function displayEditProfileSaveError(
    error,
    statusElement,
    fallbackMessage
) {
    displayErrorMessage(
        statusElement,
        getAjaxErrorMessage(
            error,
            fallbackMessage
        )
    );
}

function getEditProfileInputValue(identifier) {
    let input = document.getElementById(identifier);

    return input ? input.value.trim() : "";
}

function setEditProfileInputValue(identifier, value) {
    let input = document.getElementById(identifier);

    if (input) {
        input.value =
            value === null || value === undefined
                ? ""
                : value;
    }
}

document.addEventListener(
    "DOMContentLoaded",
    initializeEditProfilePage
);