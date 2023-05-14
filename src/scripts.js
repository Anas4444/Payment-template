var $ = require('jquery');

var key = {token: "change me", id: 1};
window.addEventListener('message', function(event) {
    if(event.data.event_id === 'paymee.complete') {
        //Execute Step 3
        var settings = {
            "url": `https://localhost:3443/${key.id}`,
            "method": "GET",
            "timeout": 0,
        };
        changeUrl("");
        console.log(response.status);
        $.ajax(settings).done(function (response) {
        console.log(response.status);
        });
    }
}, false);

$('form').submit(function(event) {
    var userEmail = $('#email').val();
    var userOffer = $('#price').val();

    event.preventDefault();
    $.ajax({
        url: '/',
        type: 'POST',
        data: {
            email: userEmail,
            price: userOffer,
        },
        success: function(response) {
            key = response;
            console.log(response);
            changeUrl(`https://sandbox.paymee.tn/gateway/${key.token}`);
            
        }
    });
});

function changeUrl(url) {
    document.getElementsByName('loc')[0].src = url;
}