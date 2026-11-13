"use strict";

let reviewsFeedReviews = [];
let reviewsFeedCountries = [];

function initializeReviewsFeedPage() {
    initializeReviewsFeedListeners();
    loadReviewsFeedCountries();
}

function initializeReviewsFeedListeners() {
    let searchInput =
        document.getElementById(
            "reviewsFeedSearch"
        );

    let sortSelect =
        document.getElementById(
            "reviewsFeedSort"
        );

    if (searchInput) {
        searchInput.addEventListener(
            "input",
            debounceFunction(
                renderFilteredReviewsFeed,
                SEARCH_DEBOUNCE_DELAY
            )
        );
    }

    if (sortSelect) {
        sortSelect.addEventListener(
            "change",
            renderFilteredReviewsFeed
        );
    }
}

function loadReviewsFeedCountries() {
    let statusElement =
        document.getElementById(
            "reviewsFeedStatus"
        );

    displayLoadingMessage(
        statusElement,
        "Loading countries and reviews..."
    );

    ajaxCall(
        "GET",
        SERVER_API_BASE_URL + "/Countries",
        null,
        function (countries) {
            reviewsFeedCountries =
                normalizeCountriesFromServer(countries);

            loadAllReviewsForFeed();
        },
        function () {
            reviewsFeedCountries = [];
            loadAllReviewsForFeed();
        }
    );
}

function loadAllReviewsForFeed() {
    let statusElement =
        document.getElementById(
            "reviewsFeedStatus"
        );

    ajaxCall(
        "GET",
        SERVER_API_BASE_URL + "/Reviews",
        null,
        function (reviews) {
            reviewsFeedReviews =
                Array.isArray(reviews)
                    ? reviews
                    : [];

            clearStatusMessage(statusElement);
            renderFilteredReviewsFeed();
        },
        function (error) {
            reviewsFeedReviews = [];

            displayErrorMessage(
                statusElement,
                getAjaxErrorMessage(
                    error,
                    "The reviews feed could not be loaded."
                )
            );

            renderFilteredReviewsFeed();
        }
    );
}

function renderFilteredReviewsFeed() {
    let searchValue =
        getReviewsFeedInputValue(
            "reviewsFeedSearch"
        ).toLowerCase();

    let sortValue =
        getReviewsFeedInputValue(
            "reviewsFeedSort"
        );

    let filteredReviews =
        reviewsFeedReviews.filter(
            function (review) {
                if (searchValue === "") {
                    return true;
                }

                let userName =
                    String(
                        review.fullName || ""
                    ).toLowerCase();

                let countryName =
                    String(
                        review.countryName || ""
                    ).toLowerCase();

                let reviewText =
                    String(
                        review.reviewText || ""
                    ).toLowerCase();

                return (
                    userName.indexOf(searchValue) !== -1 ||
                    countryName.indexOf(searchValue) !== -1 ||
                    reviewText.indexOf(searchValue) !== -1
                );
            }
        );

    filteredReviews.sort(function (
        firstReview,
        secondReview
    ) {
        if (sortValue === "oldest") {
            return (
                new Date(firstReview.publishDate) -
                new Date(secondReview.publishDate)
            );
        }

        if (sortValue === "rating-desc") {
            return (
                Number(secondReview.rating) -
                Number(firstReview.rating)
            );
        }

        if (sortValue === "rating-asc") {
            return (
                Number(firstReview.rating) -
                Number(secondReview.rating)
            );
        }

        return (
            new Date(secondReview.publishDate) -
            new Date(firstReview.publishDate)
        );
    });

    renderReviewsFeed(filteredReviews);
}

function renderReviewsFeed(reviews) {
    let listElement =
        document.getElementById(
            "reviewsFeedList"
        );

    if (!listElement) {
        return;
    }

    clearElementChildren(listElement);

    if (reviews.length === 0) {
        let emptyCard =
            createElementSafely(
                "section",
                "card feed-empty-state",
                null
            );

        emptyCard.appendChild(
            createElementSafely(
                "h2",
                "",
                "No reviews found"
            )
        );

        emptyCard.appendChild(
            createElementSafely(
                "p",
                "",
                "There are no reviews matching the current search."
            )
        );

        listElement.appendChild(emptyCard);
        return;
    }

    reviews.forEach(function (review) {
        listElement.appendChild(
            createReviewsFeedCard(review)
        );
    });
}

function createReviewsFeedCard(review) {
    let card =
        createElementSafely(
            "article",
            "card feed-review-card",
            null
        );

    card.setAttribute(
        "data-feed-review-id",
        review.reviewId
    );

    let header =
        createElementSafely(
            "div",
            "feed-review-header",
            null
        );

    let userSection =
        createElementSafely(
            "div",
            "feed-review-user",
            null
        );

    let userImage = document.createElement("img");

    userImage.src =
        isNonEmptyText(review.imageUrl)
            ? review.imageUrl
            : DEFAULT_PROFILE_IMAGE_URL;

    userImage.alt =
        (review.fullName || "User") + " profile";

    setImageFallback(
        userImage,
        DEFAULT_PROFILE_IMAGE_URL
    );

    let userDetails = document.createElement("div");

    let userLink =
        createElementSafely(
            "a",
            "",
            review.fullName || "Unknown user"
        );

    userLink.href =
        "profile.html?userId=" +
        encodeURIComponent(review.userID);

    let userName =
        document.createElement("strong");

    userName.appendChild(userLink);

    userDetails.appendChild(userName);
    userDetails.appendChild(
        createElementSafely(
            "span",
            "",
            formatDate(review.publishDate)
        )
    );

    userSection.appendChild(userImage);
    userSection.appendChild(userDetails);

    let rating =
        createElementSafely(
            "div",
            "feed-review-rating",
            formatStarRating(review.rating)
        );

    header.appendChild(userSection);
    header.appendChild(rating);
    card.appendChild(header);

    let country =
        findCountryByAlpha3Code(
            reviewsFeedCountries,
            review.alpha3Code
        );

    card.appendChild(
        createFeedCountryRow(
            review,
            country
        )
    );

    card.appendChild(
        createElementSafely(
            "p",
            "feed-review-text",
            review.reviewText || ""
        )
    );

    if (isReviewsFeedReviewOwner(review)) {
        let actions =
            createElementSafely(
                "div",
                "feed-review-actions",
                null
            );

        let editButton =
            createElementSafely(
                "button",
                "",
                "Edit"
            );

        editButton.type = "button";

        editButton.addEventListener(
            "click",
            function () {
                openReviewsFeedEditForm(
                    card,
                    review
                );
            }
        );

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
                deleteReviewsFeedReview(review);
            }
        );

        actions.appendChild(editButton);
        actions.appendChild(deleteButton);
        card.appendChild(actions);
    }

    return card;
}

function createFeedCountryRow(review, country) {
    let row =
        createElementSafely(
            "div",
            "feed-review-country",
            null
        );

    let flag = document.createElement("img");

    flag.src = country
        ? getCountryFlagUrl(country)
        : DEFAULT_PROFILE_IMAGE_URL;

    flag.alt =
        (review.countryName || "Country") +
        " flag";

    setImageFallback(
        flag,
        DEFAULT_PROFILE_IMAGE_URL
    );

    row.appendChild(flag);

    row.appendChild(
        createElementSafely(
            "strong",
            "",
            review.countryName ||
            review.alpha3Code
        )
    );

    let countryLink =
        createElementSafely(
            "a",
            "",
            "Open Country Details"
        );

    countryLink.href =
        "index.html?alpha3=" +
        encodeURIComponent(review.alpha3Code);

    row.appendChild(countryLink);

    return row;
}

function isReviewsFeedReviewOwner(review) {
    let session = getLoggedInUserSession();

    return (
        session !== null &&
        Number(session.userID) ===
        Number(review.userID)
    );
}

function openReviewsFeedEditForm(card, review) {
    let existingForm =
        card.querySelector(
            ".feed-review-edit-form"
        );

    if (existingForm) {
        existingForm.remove();
        return;
    }

    let form =
        createElementSafely(
            "form",
            "feed-review-edit-form",
            null
        );

    let ratingGroup =
        createElementSafely(
            "div",
            "form-group",
            null
        );

    let ratingLabel =
        createElementSafely(
            "label",
            "",
            "Rating"
        );

    let ratingSelect =
        document.createElement("select");

    for (let rating = 1; rating <= 5; rating++) {
        let option =
            createElementSafely(
                "option",
                "",
                rating + " stars"
            );

        option.value = String(rating);
        option.selected =
            Number(review.rating) === rating;

        ratingSelect.appendChild(option);
    }

    ratingGroup.appendChild(ratingLabel);
    ratingGroup.appendChild(ratingSelect);

    let textGroup =
        createElementSafely(
            "div",
            "form-group",
            null
        );

    let textLabel =
        createElementSafely(
            "label",
            "",
            "Review"
        );

    let textarea =
        document.createElement("textarea");

    textarea.maxLength = 1000;
    textarea.value = review.reviewText || "";

    textGroup.appendChild(textLabel);
    textGroup.appendChild(textarea);

    let actions =
        createElementSafely(
            "div",
            "feed-review-edit-actions",
            null
        );

    let saveButton =
        createElementSafely(
            "button",
            "",
            "Save"
        );

    saveButton.type = "submit";

    let cancelButton =
        createElementSafely(
            "button",
            "secondary-button",
            "Cancel"
        );

    cancelButton.type = "button";

    cancelButton.addEventListener(
        "click",
        function () {
            form.remove();
        }
    );

    actions.appendChild(saveButton);
    actions.appendChild(cancelButton);

    form.appendChild(ratingGroup);
    form.appendChild(textGroup);
    form.appendChild(actions);

    form.addEventListener(
        "submit",
        function (event) {
            event.preventDefault();

            updateReviewsFeedReview(
                review,
                Number(ratingSelect.value),
                textarea.value.trim()
            );
        }
    );

    card.appendChild(form);
    textarea.focus();
}

function updateReviewsFeedReview(
    review,
    rating,
    reviewText
) {
    let session = getLoggedInUserSession();

    if (
        !session ||
        !isReviewsFeedReviewOwner(review)
    ) {
        return;
    }

    if (rating < 1 || rating > 5) {
        displayErrorMessage(
            document.getElementById(
                "reviewsFeedStatus"
            ),
            "The rating must be between 1 and 5."
        );

        return;
    }

    if (reviewText.length < 3) {
        displayErrorMessage(
            document.getElementById(
                "reviewsFeedStatus"
            ),
            "The review must contain at least 3 characters."
        );

        return;
    }

    displayLoadingMessage(
        document.getElementById(
            "reviewsFeedStatus"
        ),
        "Updating review..."
    );

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
            loadAllReviewsForFeed();
        },
        function (error) {
            displayErrorMessage(
                document.getElementById(
                    "reviewsFeedStatus"
                ),
                getAjaxErrorMessage(
                    error,
                    "The review could not be updated."
                )
            );
        }
    );
}

function deleteReviewsFeedReview(review) {
    let session = getLoggedInUserSession();

    if (
        !session ||
        !isReviewsFeedReviewOwner(review) ||
        !window.confirm("Delete this review?")
    ) {
        return;
    }

    displayLoadingMessage(
        document.getElementById(
            "reviewsFeedStatus"
        ),
        "Deleting review..."
    );

    ajaxCall(
        "DELETE",
        SERVER_API_BASE_URL +
        "/Reviews/" +
        encodeURIComponent(review.reviewId) +
        "/user/" +
        encodeURIComponent(session.userID),
        null,
        function () {
            loadAllReviewsForFeed();
        },
        function (error) {
            displayErrorMessage(
                document.getElementById(
                    "reviewsFeedStatus"
                ),
                getAjaxErrorMessage(
                    error,
                    "The review could not be deleted."
                )
            );
        }
    );
}

function getReviewsFeedInputValue(identifier) {
    let element = document.getElementById(identifier);

    return element
        ? String(element.value).trim()
        : "";
}

document.addEventListener(
    "DOMContentLoaded",
    initializeReviewsFeedPage
);