"use strict";

let loadedCountryReviews = [];
let reviewEditingIdentifier = null;
let reviewsListenersInitialized = false;
let reviewUrlActionHandled = false;

function initializeReviewsModule() {
    if (reviewsListenersInitialized) {
        return;
    }

    let reviewsList =
        document.getElementById("reviewsList");

    let reviewForm =
        document.getElementById("reviewForm");

    let cancelButton =
        document.getElementById(
            "cancelReviewEditButton"
        );

    let ratingContainer =
        document.getElementById(
            "reviewRatingStars"
        );

    if (reviewsList) {
        reviewsList.addEventListener(
            "click",
            handleReviewListAction
        );
    }

    if (reviewForm) {
        reviewForm.addEventListener(
            "submit",
            handleReviewFormSubmit
        );
    }

    if (cancelButton) {
        cancelButton.addEventListener(
            "click",
            cancelReviewEditing
        );
    }

    if (ratingContainer) {
        ratingContainer.addEventListener(
            "click",
            handleReviewRatingStarClick
        );
    }

    reviewsListenersInitialized = true;
}

function loadCountryReviews(country) {
    initializeReviewsModule();

    let reviewsStatus =
        document.getElementById("reviewsStatus");

    displayLoadingMessage(
        reviewsStatus,
        "Loading reviews..."
    );

    ajaxCall(
        "GET",
        SERVER_API_BASE_URL +
        "/Reviews/country/" +
        encodeURIComponent(country.alpha3Code),
        null,
        function (reviews) {
            loadedCountryReviews =
                Array.isArray(reviews) ? reviews : [];

            clearStatusMessage(reviewsStatus);
            renderCountryReviews(loadedCountryReviews);
            updateReviewEligibility(country);
        },
        function (error) {
            loadedCountryReviews = [];

            displayErrorMessage(
                reviewsStatus,
                getAjaxErrorMessage(
                    error,
                    "Reviews could not be loaded."
                )
            );

            renderCountryReviews([]);
            updateReviewEligibility(country);
        }
    );
}

function renderCountryReviews(reviews) {
    let reviewsList =
        document.getElementById("reviewsList");

    let reviewsCount =
        document.getElementById("reviewsCount");

    if (!reviewsList) {
        return;
    }

    clearElementChildren(reviewsList);

    if (reviewsCount) {
        reviewsCount.textContent =
            reviews.length + " reviews";
    }

    if (reviews.length === 0) {
        reviewsList.appendChild(
            createElementSafely(
                "p",
                "",
                "No reviews have been posted for this country."
            )
        );

        return;
    }

    reviews.forEach(function (review) {
        reviewsList.appendChild(
            createReviewCard(review)
        );
    });
}

function createReviewCard(review) {
    let card =
        createElementSafely("article", "review-card", null);

    let authorRow =
        createElementSafely(
            "div",
            "review-author-row",
            null
        );

    let authorLink =
        createElementSafely(
            "a",
            "review-author-link",
            null
        );

    authorLink.href =
        "profile.html?userId=" +
        encodeURIComponent(review.userID);

    let authorImage = document.createElement("img");
    authorImage.src =
        isNonEmptyText(review.imageUrl)
            ? review.imageUrl
            : DEFAULT_PROFILE_IMAGE_URL;

    authorImage.alt =
        (review.fullName || "User") + " profile";

    setImageFallback(
        authorImage,
        DEFAULT_PROFILE_IMAGE_URL
    );

    authorLink.appendChild(authorImage);
    authorLink.appendChild(
        createElementSafely(
            "span",
            "",
            review.fullName || "Unknown user"
        )
    );

    let rating =
        createElementSafely(
            "span",
            "review-rating",
            formatStarRating(review.rating)
        );

    rating.setAttribute(
        "aria-label",
        review.rating + " out of 5 stars"
    );

    authorRow.appendChild(authorLink);
    authorRow.appendChild(rating);

    card.appendChild(authorRow);

    card.appendChild(
        createElementSafely(
            "p",
            "review-text",
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

    if (isReviewOwnedByCurrentUser(review)) {
        let actions =
            createElementSafely(
                "div",
                "review-actions",
                null
            );

        actions.appendChild(
            createReviewActionButton(
                "Edit",
                "edit",
                review.reviewId
            )
        );

        actions.appendChild(
            createReviewActionButton(
                "Delete",
                "delete",
                review.reviewId
            )
        );

        card.appendChild(actions);
    }

    return card;
}

function createReviewActionButton(
    text,
    action,
    reviewId
) {
    let button =
        createElementSafely("button", "", text);

    button.type = "button";

    button.setAttribute(
        "data-review-action",
        action
    );

    button.setAttribute(
        "data-review-id",
        reviewId
    );

    return button;
}

function isReviewOwnedByCurrentUser(review) {
    let session = getLoggedInUserSession();

    return (
        session !== null &&
        Number(session.userID) === Number(review.userID)
    );
}

function updateReviewEligibility(country) {
    let reviewForm =
        document.getElementById("reviewForm");

    let messageElement =
        document.getElementById(
            "reviewEligibilityMessage"
        );

    if (!reviewForm) {
        return;
    }

    let session = getLoggedInUserSession();

    if (!session) {
        reviewForm.hidden = true;

        displayLoadingMessage(
            messageElement,
            "Log in and mark this country as visited before writing a review."
        );

        return;
    }

    if (
        typeof getCurrentVisitedStateFromModal === "function" &&
        !getCurrentVisitedStateFromModal()
    ) {
        reviewForm.hidden = true;

        displayLoadingMessage(
            messageElement,
            "Only users who marked this country as visited can write a review."
        );

        return;
    }

    let existingReview =
        findCurrentUserReview();

    if (
        existingReview !== null &&
        reviewEditingIdentifier === null
    ) {
        reviewForm.hidden = true;

        displayLoadingMessage(
            messageElement,
            "You already reviewed this country. Use the Edit button on your review."
        );

        return;
    }

    reviewForm.hidden = false;
    clearStatusMessage(messageElement);
}

function findCurrentUserReview() {
    let session = getLoggedInUserSession();

    if (!session) {
        return null;
    }

    for (
        let index = 0;
        index < loadedCountryReviews.length;
        index++
    ) {
        if (
            Number(loadedCountryReviews[index].userID) ===
            Number(session.userID)
        ) {
            return loadedCountryReviews[index];
        }
    }

    return null;
}

function handleReviewListAction(event) {
    let button =
        event.target.closest("[data-review-action]");

    if (!button) {
        return;
    }

    let reviewId = Number(
        button.getAttribute("data-review-id")
    );

    let action =
        button.getAttribute("data-review-action");

    if (action === "edit") {
        beginReviewEditing(reviewId);
    }

    if (action === "delete") {
        deleteReview(reviewId);
    }
}

function beginReviewEditing(reviewId) {
    let review = findReviewByIdentifier(reviewId);

    if (!review || !isReviewOwnedByCurrentUser(review)) {
        return;
    }

    reviewEditingIdentifier = reviewId;

    let reviewForm =
        document.getElementById("reviewForm");

    let reviewText =
        document.getElementById("reviewText");

    let formTitle =
        document.getElementById("reviewFormTitle");

    if (reviewForm) {
        reviewForm.hidden = false;
    }

    if (reviewText) {
        reviewText.value = review.reviewText || "";
        reviewText.focus();
    }

    if (formTitle) {
        formTitle.textContent = "Edit Review";
    }

    setReviewFormRating(review.rating);

    clearStatusMessage(
        document.getElementById(
            "reviewEligibilityMessage"
        )
    );
}

function cancelReviewEditing() {
    reviewEditingIdentifier = null;
    clearReviewForm();

    let formTitle =
        document.getElementById("reviewFormTitle");

    if (formTitle) {
        formTitle.textContent = "Write a Review";
    }

    let country = getCurrentModalCountry();

    if (country) {
        updateReviewEligibility(country);
    }
}

function handleReviewFormSubmit(event) {
    event.preventDefault();

    let country = getCurrentModalCountry();

    let ratingInput =
        document.getElementById("reviewRating");

    let reviewTextInput =
        document.getElementById("reviewText");

    let reviewsStatus =
        document.getElementById("reviewsStatus");

    if (!country || !ratingInput || !reviewTextInput) {
        return;
    }

    let rating = Number(ratingInput.value);
    let reviewText = reviewTextInput.value.trim();

    if (rating < 1 || rating > 5) {
        displayErrorMessage(
            reviewsStatus,
            "Choose a rating from one to five stars."
        );

        return;
    }

    if (reviewText.length < 3) {
        displayErrorMessage(
            reviewsStatus,
            "The review must contain at least 3 characters."
        );

        return;
    }

    if (reviewEditingIdentifier === null) {
        createReview(
            country,
            rating,
            reviewText,
            reviewsStatus
        );
    } else {
        updateReview(
            reviewEditingIdentifier,
            rating,
            reviewText,
            country,
            reviewsStatus
        );
    }
}

function createReview(
    country,
    rating,
    reviewText,
    statusElement
) {
    let session = getLoggedInUserSession();

    if (!session) {
        displayErrorMessage(
            statusElement,
            "You must be logged in."
        );

        return;
    }

    let reviewToCreate = {
        userID: Number(session.userID),
        alpha3Code: country.alpha3Code,
        rating: rating,
        reviewText: reviewText
    };

    displayLoadingMessage(
        statusElement,
        "Saving review..."
    );

    ajaxCall(
        "POST",
        SERVER_API_BASE_URL + "/Reviews",
        JSON.stringify(reviewToCreate),
        function () {
            cancelReviewEditing();
            loadCountryReviews(country);
        },
        function (error) {
            displayErrorMessage(
                statusElement,
                getAjaxErrorMessage(
                    error,
                    "The review could not be created."
                )
            );
        }
    );
}

function updateReview(
    reviewId,
    rating,
    reviewText,
    country,
    statusElement
) {
    let session = getLoggedInUserSession();

    if (!session) {
        return;
    }

    let reviewToUpdate = {
        userID: Number(session.userID),
        alpha3Code: country.alpha3Code,
        rating: rating,
        reviewText: reviewText
    };

    displayLoadingMessage(
        statusElement,
        "Updating review..."
    );

    ajaxCall(
        "PUT",
        SERVER_API_BASE_URL +
        "/Reviews/" +
        encodeURIComponent(reviewId),
        JSON.stringify(reviewToUpdate),
        function () {
            cancelReviewEditing();
            loadCountryReviews(country);
        },
        function (error) {
            displayErrorMessage(
                statusElement,
                getAjaxErrorMessage(
                    error,
                    "The review could not be updated."
                )
            );
        }
    );
}

function deleteReview(reviewId) {
    let review =
        findReviewByIdentifier(reviewId);

    let session = getLoggedInUserSession();

    if (
        !review ||
        !session ||
        !isReviewOwnedByCurrentUser(review)
    ) {
        return;
    }

    if (!window.confirm("Delete this review?")) {
        return;
    }

    let reviewsStatus =
        document.getElementById("reviewsStatus");

    let country = getCurrentModalCountry();

    displayLoadingMessage(
        reviewsStatus,
        "Deleting review..."
    );

    ajaxCall(
        "DELETE",
        SERVER_API_BASE_URL +
        "/Reviews/" +
        encodeURIComponent(reviewId) +
        "/user/" +
        encodeURIComponent(session.userID),
        null,
        function () {
            cancelReviewEditing();

            if (country) {
                loadCountryReviews(country);
            }
        },
        function (error) {
            displayErrorMessage(
                reviewsStatus,
                getAjaxErrorMessage(
                    error,
                    "The review could not be deleted."
                )
            );
        }
    );
}

function findReviewByIdentifier(reviewId) {
    for (
        let index = 0;
        index < loadedCountryReviews.length;
        index++
    ) {
        if (
            Number(loadedCountryReviews[index].reviewId) ===
            Number(reviewId)
        ) {
            return loadedCountryReviews[index];
        }
    }

    return null;
}

function handleReviewRatingStarClick(event) {
    let button =
        event.target.closest("[data-review-form-star]");

    if (!button) {
        return;
    }

    setReviewFormRating(
        Number(
            button.getAttribute(
                "data-review-form-star"
            )
        )
    );
}

function setReviewFormRating(rating) {
    let ratingInput =
        document.getElementById("reviewRating");

    let buttons =
        document.querySelectorAll(
            "[data-review-form-star]"
        );

    if (ratingInput) {
        ratingInput.value = String(rating);
    }

    buttons.forEach(function (button) {
        let buttonRating = Number(
            button.getAttribute(
                "data-review-form-star"
            )
        );

        button.classList.toggle(
            "star-selected",
            buttonRating <= rating
        );
    });
}

function clearReviewForm() {
    let reviewText =
        document.getElementById("reviewText");

    if (reviewText) {
        reviewText.value = "";
    }

    setReviewFormRating(0);
}