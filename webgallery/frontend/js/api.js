let api = (function(){
    "use strict";
    
    function send(method, url, data, contentType, callback){
        var xhr = new XMLHttpRequest();
        xhr.onload = function() {
            if (xhr.status !== 200) return callback("(" + xhr.status + ")" + xhr.responseText, null);
            return callback(null, JSON.parse(xhr.responseText));
        };
        xhr.open(method, url, true);
        if (!data) xhr.send();
        else{
            switch (contentType){
                case ('application/json'):
                    xhr.setRequestHeader('Content-Type', contentType);
                    xhr.send(JSON.stringify(data));
                    break;
                case ('multipart/form-data'):
                    xhr.send(data);
                    break;
            }
        }
    }
    
    let module = {};
    
    module.getUsername = function(){
        return document.cookie.replace(/(?:(?:^|.*;\s*)username\s*\=\s*([^;]*).*$)|^.*$/, "$1");
    };

    module.getGalleries = function(page, callback){
        send("GET", "/api/users/?skip="+page, null, null, callback);
    };
    
    module.signin = function(username, password, callback){
        send("POST", "/signin/", {username, password}, 'application/json', (err, res) =>{
            if (err) return callback(err);
            return callback(null);
        });
    };
    
    module.signup = function(username, password, callback){
        send("POST", "/signup/", {username, password}, 'application/json',  (err, res) =>{
            if (err) return callback(err);
            return callback(null);
        });
    };

    module.signout = function(callback){
        send("GET", "/signout/", null, null,  (err, res) =>{
            if (err) return callback(err);
            return callback(null);
        });
    };

    module.addImage = function(title, file, callback){
        let formData = new FormData();
        formData.append("picture", file);
        formData.append("title", title);
        formData.append("date", Date.now());
        send("POST", "/api/user/images/", formData, 'multipart/form-data', (err, res) => {
            if (err) return callback(err);
            return callback(null);
        });
    };

    module.getImage = function(username, page, callback){
        send("GET", "/api/users/"+username+"/images/?skip="+page, null, null, callback);
    };

    module.deleteImage = function(imageId, callback){
        send("DELETE", "/api/user/images/"+imageId+"/", null, 'application/json', (err, res) => {
            if (err) return callback(err);
            return callback(null);
        });
    };
    
    module.addComment = function(imageId, content, callback){
        send("POST", "/api/user/comments/", {imageId, content, date: Date.now()}, 'application/json', (err, res) => {
            if (err) return callback(err);
            return callback(null);
        });
    };

    module.getComments = function(imageId, page, callback){
        send("GET", "/api/images/"+imageId+"/comments/?skip="+page, null, null, callback);
    };

    module.deleteComment = function(commentId, callback){
        send("DELETE", "/api/user/comments/"+commentId+"/", null, null, (err, res) => {
            if (err) return callback(err);
            return callback(null);
        });
    };

    return module;
})();