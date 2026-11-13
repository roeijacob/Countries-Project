function ajaxCall(method, api, data, successCB, errorCB) {
    $.ajax({
        type: method,
        url: api,
        data: data,
        cache: false,
        contentType: "application/json",
        dataType: "json",
        success: function (response) {
            if (typeof successCB === "function") {
                successCB(response);
            }
        },
        error: function (error) {
            if (typeof errorCB === "function") {
                errorCB(error);
            }
        }
    });
}