"use strict";

let globeRoot = null;
let globeChart = null;
let globePolygonSeries = null;
let globeCountries = [];
let globeRotationTimer = null;
let globeSelectedPolygon = null;
let globeRotationStoppedBySelection = false;
let globeFilteredCountryCodes = {};
let globeFiltersAreActive = false;

// Creates the interactive amCharts globe after country data is available.
function initializeGlobe(countries) {
    let globeContainer = document.getElementById("globeContainer");

    if (globeContainer === null) {
        return;
    }

    disposeGlobe();
    globeCountries = countries.slice();

    globeRoot = am5.Root.new("globeContainer");

    if (globeRoot._logo !== null && globeRoot._logo !== undefined) {
        globeRoot._logo.dispose();
    }

    globeRoot.setThemes([
        am5themes_Animated.new(globeRoot)
    ]);

    globeChart = globeRoot.container.children.push(am5map.MapChart.new(globeRoot, {
        panX: "rotateX",
        panY: "rotateY",
        wheelY: "zoom",
        pinchZoom: true,
        projection: am5map.geoOrthographic(),
        minZoomLevel: 0.8,
        maxZoomLevel: 8
    }));

    let oceanSeries = globeChart.series.unshift(
        am5map.MapPolygonSeries.new(globeRoot, {})
    );

    oceanSeries.mapPolygons.template.setAll({
        fill: am5.color(0x155675),
        stroke: am5.color(0x155675),
        fillOpacity: 1
    });

    oceanSeries.data.push({
        geometry: am5map.getGeoRectangle(90, 180, -90, -180)
    });

    globePolygonSeries = globeChart.series.push(am5map.MapPolygonSeries.new(globeRoot, {
        geoJSON: am5geodata_worldLow,
        exclude: ["AQ"]
    }));

    globePolygonSeries.mapPolygons.template.setAll({
        tooltipText: "{name}",
        interactive: true,
        fill: am5.color(0xb9d4b0), // ירוק כברירת מחדל
        stroke: am5.color(0xffffff),
        strokeWidth: 0.8,
        cursorOverStyle: "pointer",
        focusable: true,
        ariaLabel: "{name}",
        clickAnnounceText: "Select {name}"
    });

    // --- הגדרת המצבים (States) ---

    // מצב 1: ריסט / ללא סינון (ירוק)
    globePolygonSeries.mapPolygons.template.states.create("default", {
        fill: am5.color(0xb9d4b0),
        strokeWidth: 0.8
    });

    // מצב 2: מסונן / תואם קריטריונים (צהוב)
    globePolygonSeries.mapPolygons.template.states.create("filtered", {
        fill: am5.color(0xf0bd55)
    });

    globePolygonSeries.mapPolygons.template.states.create("selected", {
        fill: am5.color(0x48c9b0),
        stroke: am5.color(0xffffff),
        strokeWidth: 2.4
    });

    globePolygonSeries.mapPolygons.template.events.on("click", function (event) {
        handleGlobeCountryClick(event);
    });

    globeChart.chartContainer.events.on("pointerdown", function () {
        stopGlobeRotation();
    });

    globeChart.set("zoomControl", am5map.ZoomControl.new(globeRoot, {}));

    let centerButton = document.getElementById("centerGlobeButton");
    if (centerButton !== null) {
        centerButton.addEventListener("click", centerGlobeToDefault);
    }

    globeChart.appear(800, 100);
    startGlobeRotation();
}

// פונקציה למרכוז ואיפוס הגלובוס
function centerGlobeToDefault() {
    if (globeChart === null) {
        return;
    }

    globeChart.goHome();

    globeChart.animate({
        key: "rotationX",
        to: 0,
        duration: 1000,
        easing: am5.math.out(am5.math.cubic)
    });

    globeChart.animate({
        key: "rotationY",
        to: 0,
        duration: 1000,
        easing: am5.math.out(am5.math.cubic)
    });
}

// Starts automatic horizontal globe rotation.
function startGlobeRotation() {
    if (globeChart === null) {
        return;
    }

    if (globeRotationTimer !== null) {
        window.clearInterval(globeRotationTimer);
    }

    globeRotationStoppedBySelection = false;
    globeRotationTimer = window.setInterval(function () {
        if (globeChart === null) {
            return;
        }

        let currentRotation = globeChart.get("rotationX");

        if (typeof currentRotation !== "number") {
            currentRotation = 0;
        }

        globeChart.set("rotationX", currentRotation + 0.18);
    }, 70);
}

// Stops automatic globe rotation.
function stopGlobeRotation() {
    if (globeRotationTimer !== null) {
        window.clearInterval(globeRotationTimer);
        globeRotationTimer = null;
    }
}

// Restarts automatic rotation only after an explicit user action.
function resumeGlobeRotation() {
    globeRotationStoppedBySelection = false;
    startGlobeRotation();
}

// Handles selection originating from an amCharts country polygon.
function handleGlobeCountryClick(event) {
    stopGlobeRotation();
    globeRotationStoppedBySelection = true;

    let countryCode = getCountryCodeFromPolygonEvent(event);
    let country = findCountryByAlpha2Code(globeCountries, countryCode);

    if (country === null) {
        return;
    }

    if (typeof selectCountry === "function") {
        selectCountry(country, "globe");
    }
}

// Reads the ISO alpha-2 identifier attached to an amCharts polygon.
function getCountryCodeFromPolygonEvent(event) {
    if (event === null || event === undefined || event.target === null || event.target === undefined) {
        return "";
    }

    let dataItem = event.target.dataItem;

    if (dataItem === null || dataItem === undefined) {
        return "";
    }

    let identifier = dataItem.get("id");

    if (typeof identifier === "string") {
        return identifier;
    }

    if (dataItem.dataContext !== null && dataItem.dataContext !== undefined) {
        if (typeof dataItem.dataContext.id === "string") {
            return dataItem.dataContext.id;
        }
    }

    return "";
}

// Finds a rendered map polygon by its alpha-2 country code.
function getGlobePolygonByAlpha2Code(alpha2Code) {
    if (globePolygonSeries === null || typeof alpha2Code !== "string") {
        return null;
    }

    let dataItems = globePolygonSeries.dataItems;
    let dataIndex = 0;
    let normalizedCode = alpha2Code.toUpperCase();

    while (dataIndex < dataItems.length) {
        let dataItem = dataItems[dataIndex];
        let dataIdentifier = dataItem.get("id");

        if (typeof dataIdentifier === "string" && dataIdentifier.toUpperCase() === normalizedCode) {
            return dataItem.get("mapPolygon");
        }

        dataIndex = dataIndex + 1;
    }

    return null;
}

// מדגיש את המדינה שנבחרה באמצעות מסגרת בלבד. שאר המדינות נשארות כפי שהיו
function setSelectedCountryOnGlobe(country) {
    if (!country || !country.alpha2Code) {
        return;
    }

    if (globeSelectedPolygon !== null) {
        restoreGlobePolygonColor(globeSelectedPolygon);
    }

    let selectedPolygon =
        getGlobePolygonByAlpha2Code(country.alpha2Code);

    if (selectedPolygon === null) {
        globeSelectedPolygon = null;
        return;
    }

    globeSelectedPolygon = selectedPolygon;
    selectedPolygon.states.applyAnimate("selected");
}

function restoreGlobePolygonColor(polygon) {
    if (!polygon) {
        return;
    }

    let dataItem = polygon.dataItem;
    let countryCode = "";

    if (dataItem) {
        countryCode = dataItem.get("id");
    }

    if (
        globeFiltersAreActive &&
        typeof countryCode === "string" &&
        globeFilteredCountryCodes[countryCode.toUpperCase()] === true
    ) {
        polygon.states.applyAnimate("filtered");
    } else {
        polygon.states.applyAnimate("default");
    }
}

// מנהל את הצביעה לפי פילטור - ללא העלמת מדינות, רק שינוי צבע
function highlightFilteredCountries(filteredCountries, filtersAreActive) {
    if (globePolygonSeries === null) {
        return;
    }

    let matchingCodes = {};
    if (filtersAreActive && filteredCountries) {
        let countryIndex = 0;
        while (countryIndex < filteredCountries.length) {
            matchingCodes[filteredCountries[countryIndex].alpha2Code.toUpperCase()] = true;
            countryIndex = countryIndex + 1;
        }
    }

    globeFiltersAreActive = filtersAreActive === true;
    globeFilteredCountryCodes = matchingCodes;

    let dataItems = globePolygonSeries.dataItems;
    let dataIndex = 0;

    // עובר על *כל* המדינות בגלובוס
    while (dataIndex < dataItems.length) {
        let dataItem = dataItems[dataIndex];
        let polygon = dataItem.get("mapPolygon");
        let polygonIdentifier = dataItem.get("id");

        if (polygon !== null && polygon !== undefined && typeof polygonIdentifier === "string") {
            if (filtersAreActive === false) {
                // מצב ריסט: כל המדינות חוזרות לירוק הדיפולטיבי
                polygon.states.applyAnimate("default");
            } else if (matchingCodes[polygonIdentifier.toUpperCase()] === true) {
                // מצב פילטור פעיל והמדינה הנוכחית עומדת בקריטריונים: נצבעת בצהוב
                polygon.states.applyAnimate("filtered");
            } else {
                // מצב פילטור פעיל אך המדינה לא עומדת בקריטריונים: חוזרת/נשארת בירוק
                polygon.states.applyAnimate("default");
            }
        }

        dataIndex = dataIndex + 1;
    }

    // מוודא שהמדינה הנבחרת ממשיכה להיות עם מסגרת עבה אחרי הריענון
    if (typeof getSelectedCountry === "function") {
        let selectedCountry = getSelectedCountry();

        if (selectedCountry !== null) {
            setSelectedCountryOnGlobe(selectedCountry);
        }
    }
}

// Rotates the globe toward a country selected outside the globe and then zooms to it.
function focusCountryOnGlobe(country) {
    if (globeChart === null || globePolygonSeries === null || country === null || country === undefined) {
        return;
    }

    let dataItem = globePolygonSeries.getDataItemById(country.alpha2Code);

    if (dataItem === null || dataItem === undefined) {
        return;
    }

    let polygon = dataItem.get("mapPolygon");

    if (polygon === null || polygon === undefined || typeof polygon.geoCentroid !== "function") {
        return;
    }

    let centroid = polygon.geoCentroid();

    if (centroid === null || centroid === undefined) {
        return;
    }

    if (typeof centroid.longitude !== "number" || typeof centroid.latitude !== "number") {
        return;
    }

    globeChart.animate({
        key: "rotationX",
        to: 0 - centroid.longitude,
        duration: 800,
        easing: am5.ease.inOut(am5.ease.cubic)
    });

    globeChart.animate({
        key: "rotationY",
        to: 0 - centroid.latitude,
        duration: 800,
        easing: am5.ease.inOut(am5.ease.cubic)
    });

    window.setTimeout(function () {
        if (globePolygonSeries !== null) {
            globePolygonSeries.zoomToDataItem(dataItem);
        }
    }, 800);
}

// Disposes amCharts resources before rebuilding or leaving the page.
function disposeGlobe() {
    if (globeRotationTimer !== null) {
        window.clearInterval(globeRotationTimer);
        globeRotationTimer = null;
    }

    if (globeRoot !== null) {
        globeRoot.dispose();
        globeRoot = null;
    }

    globeChart = null;
    globePolygonSeries = null;
    globeSelectedPolygon = null;
}

window.addEventListener("beforeunload", disposeGlobe);