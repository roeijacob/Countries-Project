"use strict";

let adminUsers = [];
let adminManagedCountries = [];

let adminUserCurrentPage = 1;
let adminUserSortKey = "userId";
let adminUserSortDirection = "asc";

function initializeAdminPage() {
    if (!protectAdministratorPage()) {
        return;
    }

    initializeAdminListeners();
    loadAdminStatistics();
    loadAdminUsers();
    loadAdminManagedCountries("");
}

function initializeAdminListeners() {
    let userSearch =
        document.getElementById("adminUserSearch");

    let lockedFilter =
        document.getElementById("adminLockedFilter");

    let roleFilter =
        document.getElementById("adminRoleFilter");

    let previousButton =
        document.getElementById(
            "adminUsersPreviousButton"
        );

    let nextButton =
        document.getElementById(
            "adminUsersNextButton"
        );

    let sortButtons =
        document.querySelectorAll(
            "[data-user-sort]"
        );

    let importButton =
        document.getElementById(
            "adminLoadCountriesButton"
        );

    let countryForm =
        document.getElementById(
            "adminCountryForm"
        );

    let cancelEditButton =
        document.getElementById(
            "adminCancelCountryEdit"
        );

    let countrySearch =
        document.getElementById(
            "adminCountrySearch"
        );

    if (userSearch) {
        userSearch.addEventListener(
            "input",
            function () {
                adminUserCurrentPage = 1;
                renderAdminUsersDataTable();
            }
        );
    }

    if (lockedFilter) {
        lockedFilter.addEventListener(
            "change",
            function () {
                adminUserCurrentPage = 1;
                renderAdminUsersDataTable();
            }
        );
    }

    if (roleFilter) {
        roleFilter.addEventListener(
            "change",
            function () {
                adminUserCurrentPage = 1;
                renderAdminUsersDataTable();
            }
        );
    }

    sortButtons.forEach(function (button) {
        button.addEventListener(
            "click",
            function () {
                changeAdminUserSort(
                    button.getAttribute(
                        "data-user-sort"
                    )
                );
            }
        );
    });

    if (previousButton) {
        previousButton.addEventListener(
            "click",
            function () {
                if (adminUserCurrentPage > 1) {
                    adminUserCurrentPage--;
                    renderAdminUsersDataTable();
                }
            }
        );
    }

    if (nextButton) {
        nextButton.addEventListener(
            "click",
            function () {
                adminUserCurrentPage++;
                renderAdminUsersDataTable();
            }
        );
    }

    if (importButton) {
        importButton.addEventListener(
            "click",
            importCountriesThroughServer
        );
    }

    if (countryForm) {
        countryForm.addEventListener(
            "submit",
            handleAdminCountrySubmit
        );
    }

    if (cancelEditButton) {
        cancelEditButton.addEventListener(
            "click",
            resetAdminCountryForm
        );
    }

    if (countrySearch) {
        countrySearch.addEventListener(
            "input",
            debounceFunction(
                function () {
                    loadAdminManagedCountries(
                        countrySearch.value.trim()
                    );
                },
                SEARCH_DEBOUNCE_DELAY
            )
        );
    }
}

function loadAdminStatistics() {
    ajaxCall(
        "GET",
        SERVER_API_BASE_URL +
        "/Admin/statistics",
        null,
        function (statistics) {
            setAdminStatistic(
                "statDailyLogins",
                statistics
                    ? statistics.dailyLogins
                    : 0
            );

            setAdminStatistic(
                "statSavedCountries",
                statistics
                    ? statistics.savedCountries
                    : 0
            );

            setAdminStatistic(
                "statCountries",
                statistics
                    ? statistics.totalCountries
                    : 0
            );

            setAdminStatistic(
                "statReviews",
                statistics
                    ? statistics.totalReviews
                    : 0
            );
        },
        function (error) {
            displayErrorMessage(
                document.getElementById(
                    "adminPageStatus"
                ),
                getAjaxErrorMessage(
                    error,
                    "Statistics could not be loaded."
                )
            );
        }
    );
}

function setAdminStatistic(identifier, value) {
    let element = document.getElementById(identifier);

    if (element) {
        element.textContent = formatNumber(value);
    }
}

function loadAdminUsers() {
    let pageStatus =
        document.getElementById("adminPageStatus");

    displayLoadingMessage(
        pageStatus,
        "Loading users..."
    );

    ajaxCall(
        "GET",
        SERVER_API_BASE_URL + "/Admin/users",
        null,
        function (users) {
            adminUsers =
                Array.isArray(users) ? users : [];

            setAdminStatistic(
                "statTotalUsers",
                adminUsers.length
            );

            clearStatusMessage(pageStatus);
            renderAdminUsersDataTable();
        },
        function (error) {
            displayErrorMessage(
                pageStatus,
                getAjaxErrorMessage(
                    error,
                    "Users could not be loaded."
                )
            );
        }
    );
}

function changeAdminUserSort(sortKey) {
    if (adminUserSortKey === sortKey) {
        adminUserSortDirection =
            adminUserSortDirection === "asc"
                ? "desc"
                : "asc";
    } else {
        adminUserSortKey = sortKey;
        adminUserSortDirection = "asc";
    }

    adminUserCurrentPage = 1;
    renderAdminUsersDataTable();
}

function renderAdminUsersDataTable() {
    let filteredUsers =
        getFilteredAdminUsers();

    filteredUsers.sort(compareAdminUsers);

    let totalPages = Math.max(
        Math.ceil(
            filteredUsers.length /
            ADMIN_USERS_PAGE_SIZE
        ),
        1
    );

    if (adminUserCurrentPage > totalPages) {
        adminUserCurrentPage = totalPages;
    }

    let startIndex =
        (adminUserCurrentPage - 1) *
        ADMIN_USERS_PAGE_SIZE;

    let usersForPage =
        filteredUsers.slice(
            startIndex,
            startIndex + ADMIN_USERS_PAGE_SIZE
        );

    renderAdminUsersTable(usersForPage);
    updateAdminUserPagination(totalPages);
}

function getFilteredAdminUsers() {
    let searchValue =
        getAdminInputValue(
            "adminUserSearch"
        ).toLowerCase();

    let lockedValue =
        getAdminInputValue(
            "adminLockedFilter"
        );

    let roleValue =
        getAdminInputValue(
            "adminRoleFilter"
        );

    return adminUsers.filter(function (user) {
        let fullName =
            String(user.fullName || "").toLowerCase();

        let email =
            String(user.email || "").toLowerCase();

        if (
            searchValue !== "" &&
            fullName.indexOf(searchValue) === -1 &&
            email.indexOf(searchValue) === -1
        ) {
            return false;
        }

        if (
            lockedValue === "locked" &&
            user.isLocked !== true
        ) {
            return false;
        }

        if (
            lockedValue === "unlocked" &&
            user.isLocked === true
        ) {
            return false;
        }

        if (
            roleValue === "admin" &&
            user.isAdmin !== true
        ) {
            return false;
        }

        if (
            roleValue === "regular" &&
            user.isAdmin === true
        ) {
            return false;
        }

        return true;
    });
}

function compareAdminUsers(firstUser, secondUser) {
    let firstValue =
        firstUser[adminUserSortKey];

    let secondValue =
        secondUser[adminUserSortKey];

    if (
        adminUserSortKey === "userId"
    ) {
        firstValue = Number(firstValue);
        secondValue = Number(secondValue);
    } else if (
        adminUserSortKey ===
        "registrationDate"
    ) {
        firstValue =
            new Date(firstValue).getTime() || 0;

        secondValue =
            new Date(secondValue).getTime() || 0;
    } else {
        firstValue =
            String(firstValue || "").toLowerCase();

        secondValue =
            String(secondValue || "").toLowerCase();
    }

    if (firstValue < secondValue) {
        return adminUserSortDirection === "asc"
            ? -1
            : 1;
    }

    if (firstValue > secondValue) {
        return adminUserSortDirection === "asc"
            ? 1
            : -1;
    }

    return 0;
}

function renderAdminUsersTable(users) {
    let tableBody =
        document.getElementById(
            "adminUsersTableBody"
        );

    if (!tableBody) {
        return;
    }

    clearElementChildren(tableBody);

    if (users.length === 0) {
        let row = document.createElement("tr");
        let cell = document.createElement("td");

        cell.colSpan = 7;
        cell.textContent =
            "No users match the selected filters.";

        row.appendChild(cell);
        tableBody.appendChild(row);

        return;
    }

    users.forEach(function (user) {
        tableBody.appendChild(
            createAdminUserRow(user)
        );
    });
}

function createAdminUserRow(user) {
    let row = document.createElement("tr");

    appendAdminTableCell(
        row,
        user.userId
    );

    appendAdminTableCell(
        row,
        user.fullName || ""
    );

    appendAdminTableCell(
        row,
        user.email || ""
    );

    appendAdminTableCell(
        row,
        user.isAdmin ? "Yes" : "No"
    );

    let statusCell =
        document.createElement("td");

    let statusBadge =
        createElementSafely(
            "span",
            "status-badge",
            user.isLocked ? "Locked" : "Active"
        );

    if (user.isLocked) {
        statusBadge.classList.add(
            "status-badge-locked"
        );
    }

    statusCell.appendChild(statusBadge);
    row.appendChild(statusCell);

    appendAdminTableCell(
        row,
        formatDate(user.registrationDate)
    );

    let actionsCell =
        document.createElement("td");

    let actions =
        createElementSafely(
            "div",
            "admin-actions",
            null
        );

    let lockButton =
        createElementSafely(
            "button",
            "",
            user.isLocked ? "Unlock" : "Lock"
        );

    lockButton.type = "button";

    lockButton.addEventListener(
        "click",
        function () {
            updateAdminUserLock(
                user.userId,
                !user.isLocked
            );
        }
    );

    actions.appendChild(lockButton);

    let currentSession =
        getLoggedInUserSession();

    if (
        Number(currentSession.userID) !==
        Number(user.userId)
    ) {
        let deleteButton =
            createElementSafely(
                "button",
                "secondary-button",
                "Delete"
            );

        deleteButton.type = "button";

        deleteButton.addEventListener(
            "click",
            function () {
                deleteAdminUser(user.userId);
            }
        );

        actions.appendChild(deleteButton);
    }

    actionsCell.appendChild(actions);
    row.appendChild(actionsCell);

    return row;
}

function appendAdminTableCell(row, value) {
    let cell = document.createElement("td");

    cell.textContent =
        value === null || value === undefined
            ? ""
            : String(value);

    row.appendChild(cell);
}

function updateAdminUserPagination(totalPages) {
    let pageInfo =
        document.getElementById(
            "adminUsersPageInfo"
        );

    let previousButton =
        document.getElementById(
            "adminUsersPreviousButton"
        );

    let nextButton =
        document.getElementById(
            "adminUsersNextButton"
        );

    if (pageInfo) {
        pageInfo.textContent =
            "Page " +
            adminUserCurrentPage +
            " of " +
            totalPages;
    }

    if (previousButton) {
        previousButton.disabled =
            adminUserCurrentPage <= 1;
    }

    if (nextButton) {
        nextButton.disabled =
            adminUserCurrentPage >= totalPages;
    }
}

function updateAdminUserLock(userId, isLocked) {
    let pageStatus =
        document.getElementById("adminPageStatus");

    displayLoadingMessage(
        pageStatus,
        isLocked
            ? "Locking user..."
            : "Unlocking user..."
    );

    ajaxCall(
        "PUT",
        SERVER_API_BASE_URL +
        "/Admin/users/" +
        encodeURIComponent(userId) +
        "/lock",
        JSON.stringify(isLocked),
        function () {
            displaySuccessMessage(
                pageStatus,
                "User status updated."
            );

            loadAdminUsers();
        },
        function (error) {
            displayErrorMessage(
                pageStatus,
                getAjaxErrorMessage(
                    error,
                    "The user status could not be updated."
                )
            );
        }
    );
}

function deleteAdminUser(userId) {
    if (
        !window.confirm(
            "Delete or lock this user according to the server operation?"
        )
    ) {
        return;
    }

    let pageStatus =
        document.getElementById("adminPageStatus");

    displayLoadingMessage(
        pageStatus,
        "Processing user..."
    );

    ajaxCall(
        "DELETE",
        SERVER_API_BASE_URL +
        "/Admin/users/" +
        encodeURIComponent(userId),
        null,
        function () {
            /*
             * מסירים את המשתמש גם מהמערך המקומי,
             * כדי שהשורה תיעלם מיד ללא רענון.
             */
            adminUsers = adminUsers.filter(
                function (user) {
                    return (
                        Number(user.userId) !==
                        Number(userId)
                    );
                }
            );

            setAdminStatistic(
                "statTotalUsers",
                adminUsers.length
            );

            renderAdminUsersDataTable();

            displaySuccessMessage(
                pageStatus,
                "User deleted successfully."
            );

            loadAdminStatistics();
        },
        function (error) {
            displayErrorMessage(
                pageStatus,
                getAjaxErrorMessage(
                    error,
                    "The user operation failed."
                )
            );
        }
    );
}

function importCountriesThroughServer() {
    let statusElement =
        document.getElementById(
            "adminCountryLoadStatus"
        );

    displayLoadingMessage(
        statusElement,
        "Importing countries through the server..."
    );

    ajaxCall(
        "POST",
        SERVER_API_BASE_URL +
        "/Countries/import",
        null,
        function (response) {
            let importedCount =
                response &&
                    response.importedCountries !== undefined
                    ? response.importedCountries
                    : 0;

            displaySuccessMessage(
                statusElement,
                importedCount +
                " countries were processed."
            );

            loadAdminManagedCountries("");
            loadAdminStatistics();
        },
        function (error) {
            displayErrorMessage(
                statusElement,
                getAjaxErrorMessage(
                    error,
                    "Country import failed."
                )
            );
        }
    );
}

function loadAdminManagedCountries(searchValue) {
    let statusElement =
        document.getElementById(
            "adminCountryStatus"
        );

    displayLoadingMessage(
        statusElement,
        "Loading countries..."
    );

    let api =
        SERVER_API_BASE_URL + "/Countries";

    if (isNonEmptyText(searchValue)) {
        api =
            SERVER_API_BASE_URL +
            "/Countries/search?name=" +
            encodeURIComponent(searchValue) +
            "&sortBy=name&sortDirection=asc";
    }

    ajaxCall(
        "GET",
        api,
        null,
        function (countries) {
            adminManagedCountries =
                normalizeCountriesFromServer(countries);

            clearStatusMessage(statusElement);
            renderManagedCountriesTable(
                adminManagedCountries
            );
        },
        function (error) {
            displayErrorMessage(
                statusElement,
                getAjaxErrorMessage(
                    error,
                    "Countries could not be loaded."
                )
            );
        }
    );
}

function renderManagedCountriesTable(countries) {
    let tableBody = document.getElementById("adminManagedCountriesBody");
    if (!tableBody) return;

    clearElementChildren(tableBody);

    if (countries.length === 0) {
        let row = document.createElement("tr");
        let cell = document.createElement("td");
        cell.colSpan = 7;
        cell.className = "admin-empty-table-cell";
        cell.textContent = "No countries found.";
        row.appendChild(cell);
        tableBody.appendChild(row);
        return;
    }

    countries.forEach(function (country) {
        let row = document.createElement("tr");

        let countryCell = document.createElement("td");
        let countryIdentity = createElementSafely("div", "admin-country-identity", null);

        if (isNonEmptyText(country.flagUrl)) {
            let flagImage = document.createElement("img");
            flagImage.className = "admin-country-flag";
            flagImage.src = country.flagUrl;
            flagImage.alt = country.name + " flag";
            flagImage.loading = "lazy";

            flagImage.addEventListener("error", function () {
                flagImage.remove();
            });

            countryIdentity.appendChild(flagImage);
        }

        let countryName = createElementSafely("span", "admin-country-name", country.name || "Not available");
        countryIdentity.appendChild(countryName);
        countryCell.appendChild(countryIdentity);
        row.appendChild(countryCell);

        appendAdminTableCell(row, country.alpha3Code || "—");
        appendAdminTableCell(row, country.capital || "—");

        let regionCell = document.createElement("td");
        let regionName = createElementSafely("div", "admin-country-region", country.region || "—");
        regionCell.appendChild(regionName);

        if (isNonEmptyText(country.subRegion)) {
            let subregionName = createElementSafely("div", "admin-country-subregion", country.subRegion);
            regionCell.appendChild(subregionName);
        }

        row.appendChild(regionCell);

        appendAdminTableCell(row, formatPopulation(country.population));
        appendAdminTableCell(row, formatArea(country.area));

        let actionsCell = document.createElement("td");
        actionsCell.className = "admin-country-actions-cell";

        let actions = createElementSafely("div", "admin-actions", null);

        let editButton = createElementSafely("button", "", "Edit");
        editButton.type = "button";

        editButton.addEventListener("click", function () {
            beginAdminCountryEdit(country.alpha3Code);
        });

        let deleteButton = createElementSafely("button", "secondary-button", "Delete");
        deleteButton.type = "button";

        deleteButton.addEventListener("click", function () {
            deleteManagedCountry(country.alpha3Code);
        });

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);
        actionsCell.appendChild(actions);
        row.appendChild(actionsCell);

        tableBody.appendChild(row);
    });
}

function beginAdminCountryEdit(alpha3Code) {
    let statusElement =
        document.getElementById(
            "adminCountryStatus"
        );

    displayLoadingMessage(
        statusElement,
        "Loading complete country details..."
    );

    ajaxCall(
        "GET",
        SERVER_API_BASE_URL +
        "/Countries/" +
        encodeURIComponent(alpha3Code),
        null,
        function (countryData) {
            let country =
                normalizeCountryFromServer(
                    countryData
                );

            if (!country) {
                displayErrorMessage(
                    statusElement,
                    "Country details were not returned."
                );

                return;
            }

            setAdminFormValue(
                "adminCountryEditCode",
                country.alpha3Code
            );

            setAdminFormValue(
                "adminCountryName",
                country.name
            );

            setAdminFormValue(
                "adminCountryAlpha3Code",
                country.alpha3Code
            );

            setAdminFormValue(
                "adminCountryAlpha2Code",
                country.alpha2Code
            );

            setAdminFormValue(
                "adminCapital",
                country.capital
            );

            setAdminFormValue(
                "adminRegion",
                country.region
            );

            setAdminFormValue(
                "adminSubregion",
                country.subRegion
            );

            setAdminFormValue(
                "adminPopulation",
                country.population
            );

            setAdminFormValue(
                "adminArea",
                country.area
            );

            setAdminFormValue(
                "adminFlagUrl",
                country.flagUrl
            );

            setAdminFormValue(
                "adminLanguages",
                country.languages.join(", ")
            );

            setAdminFormValue(
                "adminCurrencies",
                country.currencies.join(", ")
            );

            setAdminFormValue(
                "adminBorders",
                country.borders.join(", ")
            );

            document.getElementById(
                "adminCountryAlpha3Code"
            ).disabled = true;

            document.getElementById(
                "adminCountryFormTitle"
            ).textContent = "Edit Country";

            clearStatusMessage(statusElement);

            document.getElementById(
                "adminCountryForm"
            ).scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        },
        function (error) {
            displayErrorMessage(
                statusElement,
                getAjaxErrorMessage(
                    error,
                    "Country details could not be loaded."
                )
            );
        }
    );
}

function handleAdminCountrySubmit(event) {
    event.preventDefault();

    let statusElement =
        document.getElementById(
            "adminCountryStatus"
        );

    let originalCode =
        getAdminInputValue(
            "adminCountryEditCode"
        );

    let country =
        readAdminCountryForm();

    let validationMessage =
        validateAdminCountry(country);

    if (validationMessage !== "") {
        displayErrorMessage(
            statusElement,
            validationMessage
        );

        return;
    }

    let isEditing = originalCode !== "";

    let method = isEditing ? "PUT" : "POST";

    let api = isEditing
        ? SERVER_API_BASE_URL +
        "/Countries/" +
        encodeURIComponent(originalCode)
        : SERVER_API_BASE_URL +
        "/Countries/add";

    displayLoadingMessage(
        statusElement,
        isEditing
            ? "Updating country..."
            : "Adding country..."
    );

    ajaxCall(
        method,
        api,
        JSON.stringify(country),
        function () {
            displaySuccessMessage(
                statusElement,
                isEditing
                    ? "Country updated successfully."
                    : "Country added successfully."
            );

            resetAdminCountryForm();
            loadAdminManagedCountries(
                getAdminInputValue(
                    "adminCountrySearch"
                )
            );

            loadAdminStatistics();
        },
        function (error) {
            displayErrorMessage(
                statusElement,
                getAjaxErrorMessage(
                    error,
                    "The country could not be saved."
                )
            );
        }
    );
}

function readAdminCountryForm() {
    return {
        name:
            getAdminInputValue(
                "adminCountryName"
            ),

        alpha3Code:
            getAdminInputValue(
                "adminCountryAlpha3Code"
            ).toUpperCase(),

        alpha2Code:
            getAdminInputValue(
                "adminCountryAlpha2Code"
            ).toUpperCase(),

        capital:
            getAdminInputValue(
                "adminCapital"
            ),

        region:
            getAdminInputValue(
                "adminRegion"
            ),

        subRegion:
            getAdminInputValue(
                "adminSubregion"
            ),

        population:
            Number(
                getAdminInputValue(
                    "adminPopulation"
                )
            ) || 0,

        area:
            Number(
                getAdminInputValue(
                    "adminArea"
                )
            ) || 0,

        flagUrl:
            getAdminInputValue(
                "adminFlagUrl"
            ),

        languages:
            splitAdminCommaValues(
                getAdminInputValue(
                    "adminLanguages"
                )
            ),

        currencies:
            splitAdminCommaValues(
                getAdminInputValue(
                    "adminCurrencies"
                )
            ),

        borders:
            splitAdminCommaValues(
                getAdminInputValue(
                    "adminBorders"
                )
            ).map(function (code) {
                return code.toUpperCase();
            })
    };
}

function validateAdminCountry(country) {
    if (!isNonEmptyText(country.name)) {
        return "Enter a country name.";
    }

    if (country.alpha3Code.length !== 3) {
        return "The Alpha-3 code must contain 3 characters.";
    }

    if (country.alpha2Code.length !== 2) {
        return "The Alpha-2 code must contain 2 characters.";
    }

    if (!isNonEmptyText(country.region)) {
        return "Enter a region.";
    }

    if (
        country.population < 0 ||
        country.area < 0
    ) {
        return "Population and area cannot be negative.";
    }

    return "";
}

function splitAdminCommaValues(value) {
    if (!isNonEmptyText(value)) {
        return [];
    }

    return value
        .split(",")
        .map(function (item) {
            return item.trim();
        })
        .filter(function (item) {
            return item !== "";
        });
}

function deleteManagedCountry(alpha3Code) {
    if (
        !window.confirm(
            "Delete this country from the database?"
        )
    ) {
        return;
    }

    let statusElement =
        document.getElementById(
            "adminCountryStatus"
        );

    displayLoadingMessage(
        statusElement,
        "Deleting country..."
    );

    ajaxCall(
        "DELETE",
        SERVER_API_BASE_URL +
        "/Countries/" +
        encodeURIComponent(alpha3Code),
        null,
        function () {
            displaySuccessMessage(
                statusElement,
                "Country deleted successfully."
            );

            loadAdminManagedCountries(
                getAdminInputValue(
                    "adminCountrySearch"
                )
            );

            loadAdminStatistics();
        },
        function (error) {
            displayErrorMessage(
                statusElement,
                getAjaxErrorMessage(
                    error,
                    "The country could not be deleted."
                )
            );
        }
    );
}

function resetAdminCountryForm() {
    let form =
        document.getElementById(
            "adminCountryForm"
        );

    if (form) {
        form.reset();
    }

    setAdminFormValue(
        "adminCountryEditCode",
        ""
    );

    let alpha3Input =
        document.getElementById(
            "adminCountryAlpha3Code"
        );

    if (alpha3Input) {
        alpha3Input.disabled = false;
    }

    let title =
        document.getElementById(
            "adminCountryFormTitle"
        );

    if (title) {
        title.textContent = "Add Country";
    }
}

function getAdminInputValue(identifier) {
    let element = document.getElementById(identifier);

    return element
        ? String(element.value).trim()
        : "";
}

function setAdminFormValue(identifier, value) {
    let element = document.getElementById(identifier);

    if (element) {
        element.value =
            value === null || value === undefined
                ? ""
                : value;
    }
}

document.addEventListener(
    "DOMContentLoaded",
    initializeAdminPage
);