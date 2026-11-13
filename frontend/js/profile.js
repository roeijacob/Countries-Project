"use strict";

let profileCurrentUser = null;
let profileCurrentReviews = [];
let profileIsOwner = false;
let profileTargetUserIdentifier = null;

function initializeProfilePage() {
    if (!protectLoggedInPage()) {
        return;
    }

    let session = getLoggedInUserSession();
    let requestedUserId =
        Number(getQueryParameter("userId"));

    profileTargetUserIdentifier =
        Number.isInteger(requestedUserId) &&
            requestedUserId > 0
            ? requestedUserId
            : Number(session.userID);

    profileIsOwner =
        Number(profileTargetUserIdentifier) ===
        Number(session.userID);

    let ownerActions =
        document.getElementById("profileOwnerActions");

    let ownerNote =
        document.getElementById(
            "visitedCountriesOwnerNote"
        );

    if (ownerActions) {
        ownerActions.hidden = !profileIsOwner;
    }

    if (ownerNote) {
        ownerNote.hidden = !profileIsOwner;
    }

    loadProfileUser();
}

function loadProfileUser() {
    let statusElement =
        document.getElementById("profilePageStatus");

    displayLoadingMessage(
        statusElement,
        "Loading profile..."
    );

    ajaxCall(
        "GET",
        SERVER_API_BASE_URL +
        "/Users/" +
        encodeURIComponent(
            profileTargetUserIdentifier
        ),
        null,
        function (user) {
            if (!user) {
                displayErrorMessage(
                    statusElement,
                    "The requested user was not found."
                );

                return;
            }

            profileCurrentUser = user;

            clearStatusMessage(statusElement);
            renderProfileSummary(user);
            renderProfilePreferences(user);
            loadProfileScore();
            loadProfileTravelLists();
            loadProfileReviews();
        },
        function (error) {
            if (
                handleServerAuthorizationError(
                    error,
                    statusElement
                )
            ) {
                return;
            }

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

function renderProfileSummary(user) {
    let nameElement =
        document.getElementById("profileName");

    let ageElement =
        document.getElementById("profileAgeBirth");

    let imageElement =
        document.getElementById("profileImage");

    if (nameElement) {
        nameElement.textContent =
            user.fullName || "Unknown user";
    }

    if (ageElement) {
        let age = calculateAge(user.birthDate);
        let profileDetails = [];

        if (age !== null) profileDetails.push(age + " years old");
        if (isNonEmptyText(user.gender)) profileDetails.push(user.gender);
        profileDetails.push("Born " + formatDate(user.birthDate));

        ageElement.textContent = profileDetails.join(" · ");
    }

    if (imageElement) {
        imageElement.src =
            isNonEmptyText(user.imageUrl)
                ? user.imageUrl
                : DEFAULT_PROFILE_IMAGE_URL;

        imageElement.alt =
            (user.fullName || "User") + " profile";

        setImageFallback(
            imageElement,
            DEFAULT_PROFILE_IMAGE_URL
        );
    }
}

function renderProfilePreferences(user) {
    renderProfileChips(
        "profileLanguages",
        buildLanguageLabels(user.spokenLanguages),
        "No spoken languages were selected."
    );

    renderProfileChips(
        "profilePreferences",
        user.travelPreferences,
        "No travel preferences were selected."
    );

    renderProfileChips(
        "profileHobbies",
        user.hobbies,
        "No hobbies were selected."
    );

    renderProfileChips(
        "profileContinents",
        user.favoriteRegions,
        "No preferred regions were selected."
    );
}

function buildLanguageLabels(languages) {
    if (!Array.isArray(languages)) {
        return [];
    }

    let labels = [];

    languages.forEach(function (language) {
        if (!language || !language.languageName) {
            return;
        }

        labels.push(
            language.languageName +
            " · level " +
            language.proficiencyLevel +
            "/5"
        );
    });

    return labels;
}

function renderProfileChips(
    containerIdentifier,
    values,
    emptyMessage
) {
    let container =
        document.getElementById(containerIdentifier);

    if (!container) {
        return;
    }

    clearElementChildren(container);

    let safeValues =
        Array.isArray(values) ? values : [];

    if (safeValues.length === 0) {
        container.appendChild(
            createElementSafely(
                "span",
                "profile-chip",
                emptyMessage
            )
        );

        return;
    }

    safeValues.forEach(function (value) {
        container.appendChild(
            createElementSafely(
                "span",
                "profile-chip",
                String(value)
            )
        );
    });
}

function loadProfileScore() {
    ajaxCall(
        "GET",
        SERVER_API_BASE_URL +
        "/Users/" +
        encodeURIComponent(
            profileTargetUserIdentifier
        ) +
        "/total-score",
        null,
        function (score) {
            let scoreElement =
                document.getElementById(
                    "profileTriviaScore"
                );

            if (scoreElement) {
                scoreElement.textContent =
                    formatNumber(score);
            }
        },
        function () {
            let scoreElement =
                document.getElementById(
                    "profileTriviaScore"
                );

            if (scoreElement) {
                scoreElement.textContent = "0";
            }
        }
    );
}

function loadProfileTravelLists() {
    loadSingleProfileTravelList(
        VISITED_LIST_TYPE,
        "profileVisitedCountries",
        "visitedCountriesStatus",
        function (countries) {
            let visitedCount =
                document.getElementById(
                    "profileVisitedCount"
                );

            if (visitedCount) {
                visitedCount.textContent =
                    String(countries.length);
            }
        }
    );

    loadSingleProfileTravelList(
        WANT_TO_VISIT_LIST_TYPE,
        "profileWantedCountries",
        "wantedCountriesStatus",
        null
    );
}

function loadSingleProfileTravelList(
    listType,
    containerIdentifier,
    statusIdentifier,
    completedCallback
) {
    let statusElement =
        document.getElementById(statusIdentifier);

    displayLoadingMessage(
        statusElement,
        "Loading countries..."
    );

    ajaxCall(
        "GET",
        SERVER_API_BASE_URL +
        "/SavedCountries/" +
        encodeURIComponent(
            profileTargetUserIdentifier
        ) +
        "/" +
        encodeURIComponent(listType),
        null,
        function (countries) {
            let safeCountries =
                normalizeCountriesFromServer(countries);

            clearStatusMessage(statusElement);

            renderProfileCountryCollection(
                containerIdentifier,
                safeCountries,
                listType
            );

            if (typeof completedCallback === "function") {
                completedCallback(safeCountries);
            }
        },
        function (error) {
            displayErrorMessage(
                statusElement,
                getAjaxErrorMessage(
                    error,
                    "The country list could not be loaded."
                )
            );

            renderProfileCountryCollection(
                containerIdentifier,
                [],
                listType
            );
        }
    );
}

function renderProfileCountryCollection(
    containerIdentifier,
    countries,
    listType
) {
    let container =
        document.getElementById(containerIdentifier);

    if (!container) {
        return;
    }

    clearElementChildren(container);

    if (countries.length === 0) {
        container.appendChild(
            createElementSafely(
                "p",
                "",
                "No countries are currently saved."
            )
        );

        return;
    }

    countries.forEach(function (country) {
        container.appendChild(
            createProfileCountryCard(
                country,
                listType
            )
        );
    });
}

function createProfileCountryCard(country, listType) {
    let card =
        createElementSafely(
            "article",
            "profile-country-card",
            null
        );

    let flag = document.createElement("img");
    flag.src = getCountryFlagUrl(country);
    flag.alt = country.name + " flag";
    setImageFallback(flag, DEFAULT_PROFILE_IMAGE_URL);

    card.appendChild(flag);

    card.appendChild(
        createElementSafely(
            "h3",
            "",
            country.name
        )
    );

    let actions =
        createElementSafely(
            "div",
            "profile-card-actions",
            null
        );

    let openLink =
        createElementSafely(
            "a",
            "profile-icon-button profile-open-country-button",
            null
        );

    openLink.href = "index.html?alpha3=" + encodeURIComponent(country.alpha3Code);
    openLink.setAttribute( "aria-label", "Open " + country.name);
    openLink.title = "Open country";

    actions.appendChild(openLink);

    if (profileIsOwner) {
        let removeButton =
            createElementSafely(
                "button",
                "profile-icon-button profile-delete-button",
                null
            );

        removeButton.setAttribute(
            "aria-label",
            "Remove " + country.name
        );

        removeButton.title = "Remove country";

        removeButton.type = "button";

        removeButton.addEventListener(
            "click",
            function () {
                removeCountryFromProfile(
                    country.alpha3Code,
                    listType
                );
            }
        );

        actions.appendChild(removeButton);
    }

    card.appendChild(actions);

    return card;
}

function removeCountryFromProfile(alpha3Code) {
    let session = getLoggedInUserSession();

    if (!session || !profileIsOwner) {
        return;
    }

    if (
        !window.confirm(
            "Remove this country from your travel list?"
        )
    ) {
        return;
    }

    ajaxCall(
        "DELETE",
        SERVER_API_BASE_URL +
        "/SavedCountries/" +
        encodeURIComponent(session.userID) +
        "/" +
        encodeURIComponent(alpha3Code),
        null,
        function () {
            loadProfileTravelLists();
            loadProfileReviews();
        },
        function (error) {
            displayErrorMessage(
                document.getElementById(
                    "profilePageStatus"
                ),
                getAjaxErrorMessage(
                    error,
                    "The country could not be removed."
                )
            );
        }
    );
}

function loadProfileReviews() {
    let statusElement =
        document.getElementById(
            "profileReviewsStatus"
        );

    displayLoadingMessage(
        statusElement,
        "Loading reviews..."
    );

    ajaxCall(
        "GET",
        SERVER_API_BASE_URL +
        "/Reviews/user/" +
        encodeURIComponent(
            profileTargetUserIdentifier
        ),
        null,
        function (reviews) {
            profileCurrentReviews =
                Array.isArray(reviews) ? reviews : [];

            clearStatusMessage(statusElement);
            renderProfileReviews(profileCurrentReviews);

            let reviewsCount =
                document.getElementById(
                    "profileVictories"
                );

            if (reviewsCount) {
                reviewsCount.textContent =
                    String(profileCurrentReviews.length);
            }
        },
        function (error) {
            profileCurrentReviews = [];

            displayErrorMessage(
                statusElement,
                getAjaxErrorMessage(
                    error,
                    "Reviews could not be loaded."
                )
            );

            renderProfileReviews([]);
        }
    );
}

function renderProfileReviews(reviews) {
    let container =
        document.getElementById("profileReviews");

    if (!container) {
        return;
    }

    clearElementChildren(container);

    if (reviews.length === 0) {
        container.appendChild(
            createElementSafely(
                "p",
                "",
                "No reviews have been posted."
            )
        );

        return;
    }

reviews.forEach(function (review) {
    let card =
        createElementSafely(
            "article",
            "profile-review-card",
            null
        );

    let header =
        createElementSafely(
            "div",
            "profile-review-header",
            null
        );

    let headingArea =
        createElementSafely(
            "div",
            "profile-review-heading",
            null
        );

    headingArea.appendChild(
        createElementSafely(
            "h3",
            "",
            review.countryName ||
            review.alpha3Code
        )
    );

    headingArea.appendChild(
        createElementSafely(
            "div",
            "star-rating-display",
            formatStarRating(review.rating)
        )
    );

    header.appendChild(headingArea);

    let actions =
        createElementSafely(
            "div",
            "profile-review-actions",
            null
        );

    let countryLink =
        createElementSafely(
            "a",
            "profile-icon-button profile-open-country-button",
            null
        );

    countryLink.href =
        "index.html?alpha3=" +
        encodeURIComponent(review.alpha3Code);

    countryLink.setAttribute(
        "aria-label",
        "Open country"
    );

    countryLink.title = "Open country";

    actions.appendChild(countryLink);

    if (profileIsOwner) {
        let editButton =
            createElementSafely(
                "button",
                "profile-icon-button profile-edit-button",
                null
            );

        editButton.type = "button";
        editButton.setAttribute(
            "aria-label",
            "Edit review"
        );
        editButton.title = "Edit review";

        editButton.addEventListener(
            "click",
            function () {
                editProfileReview(review);
            }
        );

        let deleteButton =
            createElementSafely(
                "button",
                "profile-icon-button profile-delete-button",
                null
            );

        deleteButton.type = "button";
        deleteButton.setAttribute(
            "aria-label",
            "Delete review"
        );
        deleteButton.title = "Delete review";

        deleteButton.addEventListener(
            "click",
            function () {
                deleteProfileReview(review);
            }
        );

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);
    }

    header.appendChild(actions);
    card.appendChild(header);

    card.appendChild(
        createElementSafely(
            "p",
            "profile-review-text",
            review.reviewText || ""
        )
    );

    card.appendChild(
        createElementSafely(
            "p",
            "review-meta",
            formatDate(review.publishDate)
        )
    );

    container.appendChild(card);
});
}

function editProfileReview(review) {
    let session = getLoggedInUserSession();

    if (!session || !profileIsOwner) {
        return;
    }

    let ratingText = window.prompt(
        "Enter a rating from 1 to 5:",
        String(review.rating)
    );

    if (ratingText === null) {
        return;
    }

    let rating = Number(ratingText);

    if (rating < 1 || rating > 5) {
        displayErrorMessage(
            document.getElementById(
                "profileReviewsStatus"
            ),
            "The rating must be between 1 and 5."
        );

        return;
    }

    let reviewText = window.prompt(
        "Edit the review:",
        review.reviewText || ""
    );

    if (reviewText === null) {
        return;
    }

    reviewText = reviewText.trim();

    if (reviewText.length < 3) {
        displayErrorMessage(
            document.getElementById(
                "profileReviewsStatus"
            ),
            "The review must contain at least 3 characters."
        );

        return;
    }

    ajaxCall(
        "PUT",
        SERVER_API_BASE_URL +
        "/Reviews/" +
        encodeURIComponent(review.reviewId),
        JSON.stringify({
            userID: Number(session.userID),
            rating: rating,
            reviewText: reviewText
        }),
        function () {
            loadProfileReviews();
        },
        function (error) {
            displayErrorMessage(
                document.getElementById(
                    "profileReviewsStatus"
                ),
                getAjaxErrorMessage(
                    error,
                    "The review could not be updated."
                )
            );
        }
    );
}

function deleteProfileReview(review) {
    let session = getLoggedInUserSession();

    if (
        !session ||
        !profileIsOwner ||
        !window.confirm("Delete this review?")
    ) {
        return;
    }

    ajaxCall(
        "DELETE",
        SERVER_API_BASE_URL +
        "/Reviews/" +
        encodeURIComponent(review.reviewId) +
        "/user/" +
        encodeURIComponent(session.userID),
        null,
        function () {
            loadProfileReviews();
        },
        function (error) {
            displayErrorMessage(
                document.getElementById(
                    "profileReviewsStatus"
                ),
                getAjaxErrorMessage(
                    error,
                    "The review could not be deleted."
                )
            );
        }
    );
}

document.addEventListener(
    "DOMContentLoaded",
    initializeProfilePage
);