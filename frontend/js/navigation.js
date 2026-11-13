"use strict";

function initializeNavigation() {
    let navigationContainer = document.getElementById("mainNavigation");
    if (!navigationContainer) return;

    if (!isUserLoggedIn()) {
        navigationContainer.hidden = true;
        return;
    }

    navigationContainer.hidden = false;
    renderNavigation(navigationContainer);
    initializeMobileNavigation(navigationContainer);
}

function renderNavigation(navigationContainer) {
    clearElementChildren(navigationContainer);

    let navigationInner = createElementSafely("div", "navigation-inner", null);
    let brandLink = createElementSafely("a", "navigation-brand", "Hello World");
    brandLink.href = "index.html";

    let menuButton = createElementSafely("button", "navigation-menu-button", "Menu");
    menuButton.type = "button";
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-controls", "navigationLinks");

    let linksContainer = createElementSafely("div", "navigation-links", null);
    linksContainer.id = "navigationLinks";

    addNavigationLink(linksContainer, "Home", "index.html");
    addNavigationLink(linksContainer, "Reviews Feed", "reviews-feed.html");
    addNavigationLink(linksContainer, "Trivia", "trivia.html");
    addNavigationLink(linksContainer, "Memory Game", "memory-game.html");
    addNavigationLink(linksContainer, "My Profile", "profile.html");

    if (isCurrentUserAdministrator()) {
        addNavigationLink(linksContainer, "Admin Dashboard", "admin.html");
    }

    let logoutButton = createElementSafely("button", "navigation-link navigation-logout-button", "Logout");
    logoutButton.type = "button";
    logoutButton.addEventListener("click", logoutUser);
    linksContainer.appendChild(logoutButton);

    navigationInner.appendChild(brandLink);
    navigationInner.appendChild(menuButton);
    navigationInner.appendChild(linksContainer);
    navigationContainer.appendChild(navigationInner);
}

function addNavigationLink(container, text, href) {
    let link = createElementSafely("a", "navigation-link", text);
    link.href = href;
    container.appendChild(link);
}

function initializeMobileNavigation(navigationContainer) {
    let menuButton = navigationContainer.querySelector(".navigation-menu-button");
    let linksContainer = navigationContainer.querySelector(".navigation-links");
    if (!menuButton || !linksContainer) return;

    menuButton.addEventListener("click", function () {
        let isOpen = linksContainer.classList.contains("navigation-links-open");
        linksContainer.classList.toggle("navigation-links-open", !isOpen);
        menuButton.setAttribute("aria-expanded", String(!isOpen));
    });
}

document.addEventListener("DOMContentLoaded", initializeNavigation);