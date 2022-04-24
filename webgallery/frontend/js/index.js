let app = document.querySelector("#app");
let imagePage = 0;
let commentPage = 0;
let galleryPage = 0;
let path = "/";

const onError = (elmt, err) => {
    console.error("[error]", err);
    elmt.innerHTML = err;
    elmt.style.visibility = "visible";
};

const renderAuthPage = (parent) => {
    const authPage= document.createElement("div");
    authPage.className="auth-page";
    authPage.innerHTML = `
        <form class="auth-form" id="auth-form"">
            <h1 class="auth-form__header">Welcome to the Web Gallery</h1>
            <div class="form__elements">
                <div class="form__element">
                    <label for="username">Username</label>
                    <input id="user-name" type="text" class="form__input" 
                    placeholder="Enter your username" name="username" required/>
                </div>
                <div class="form__element">
                    <label for="password">Password</label>
                    <input id="user-password" type="password" class="form__input" 
                    placeholder="Enter your password" name="password" required/>
                </div>
            </div>
            <div class="auth-form__btns-container">
                <button type="submit" id="sign-in-btn" class="btn btn--signup">Sign In</button>
                <button type="submit" id="sign-up-btn" class="btn btn--signup">Sign Up</button>
            </div>
            <p id="error_box"></p>
        </form>
    `;
    const errorBox = authPage.querySelector('#error_box');
    const usernameBox = authPage.querySelector("#user-name");
    const passwordBox = authPage.querySelector("#user-password");
    authPage.querySelector("#sign-in-btn").addEventListener("click", (e) => {
        if(usernameBox.value && passwordBox.value){
            api.signin(usernameBox.value, passwordBox.value, (err) => {
                if(err) onError(errorBox, err);
                else{
                    window.history.pushState({}, "", "/");
                    renderApp();
                }
            });
        }
    });
    authPage.querySelector("#sign-up-btn").addEventListener("click", (e) => {
        e.preventDefault();
        if(usernameBox.value && passwordBox.value){
            api.signup(usernameBox.value, passwordBox.value, (err) => {
                if(err) onError(errorBox, err);
                else{
                    window.history.pushState({}, "", "/");
                    renderApp();
                }
            });
        }
    });
    authPage.querySelector("#auth-form").addEventListener("submit", (e) => e.preventDefault());
    parent.append(authPage);
};

const renderUserPosts = (userPostElnt, errBoxElnt, username) => {

    imagePage = 0;
    commentPage = 0;
        
    const handleNextPostBtn = (btnElem) => {
        api.getImage(username, imagePage + 1, (err, res) => {
            if(err) onError(errBoxElnt, err);
            else {
                if(res.length > 0) btnElem.style.display = "";
                else btnElem.style.display = "none";
            }
        });
        btnElem.addEventListener('click', () => {
            api.getImage(username, imagePage + 1, (err, res) => {
                if(err) onError(errBoxElnt, err);
                else{
                    if(res.length > 0){
                        commentPage = 0;
                        imagePage = imagePage + 1;
                    }
                    renderPost();
                }
            });
        });
    };

    const handleDeletePostBtn = (btnElem, imageId) => {
        const currUsername = api.getUsername();
        if(username === currUsername) btnElem.style.display = "";
        else btnElem.style.display = "none";
        btnElem.addEventListener('click', () => {
            api.deleteImage(imageId, (err) => {
                if (err) onError(errBoxElnt, err);
                else {
                    commentPage = 0;
                    if(imagePage > 0) imagePage = imagePage - 1;
                }
                renderPost();
            });
        });
    };

    const handlePrevPostBtn = (btnElem) => {
        if(imagePage > 0) btnElem.style.display = "";
        else btnElem.style.display = "none";
        btnElem.addEventListener('click', () => {
            if(imagePage > 0){
                commentPage = 0;
                imagePage = imagePage - 1;
            }
            renderPost();
        });
    };

    const handlePostFooter = (footerElm, imageId) => {
        handlePrevPostBtn(footerElm.querySelector('.prev-btn'));
        handleNextPostBtn(footerElm.querySelector('.next-btn'));
        handleDeletePostBtn(footerElm.querySelector('.remove-btn'), imageId);
    };

    const handleCommentForm = (commentFormElm, imageId) => {
        commentFormElm.addEventListener('submit', (e) => {
            e.preventDefault();
            const comment = commentFormElm.querySelector("#comment-content").value;
            commentFormElm.reset();
            api.addComment(imageId, comment, (err) => {
                if(err) onError(errBoxElnt, err);
                else renderComments(imageId);
            });
        });
    };

    const handleDeleteComment = (btnElm, commentId, imageId, owner) => {
        const currUsername = api.getUsername();
        if(owner === currUsername || username === currUsername) btnElm.style.display = "";
        else btnElm.style.display = "none";
        btnElm.addEventListener('click', () => {
            api.deleteComment(commentId, (err) => {
                if (err) onError(errBoxElnt, err);
                renderComments(imageId);
            });
        });
    };

    const handlePrevCommentBtn = (btnElm, imageId) => {
        if(commentPage > 0) btnElm.style.display = "";
        else btnElm.style.display = "none";
        btnElm.addEventListener('click', () => {
            if(commentPage > 0) commentPage = commentPage - 1;
            renderComments(imageId);
        });
    };

    const handleNextCommentBtn = (btnElm, imageId) => {
        api.getComments(imageId, commentPage + 1, (err, comments) => {
            if(err) onError(errBoxElnt, err);
            else {
                if(comments.length > 0) btnElm.style.display="";
                else btnElm.style.display="none";
            }
        });
        btnElm.addEventListener('click', () => {
            api.getComments(imageId, commentPage + 1, (err, nextComments) => {
                if (err) onError(errBoxElnt, err);
                else {
                    if(nextComments && nextComments.length > 0) commentPage = commentPage + 1;
                    renderComments(imageId);
                }
            });
        });
    };

    const handleCommentPageFooter = (commentFooterElm, imageId) => {
        handlePrevCommentBtn(commentFooterElm.querySelector('.page-footer__prev-btn'), imageId);
        handleNextCommentBtn(commentFooterElm.querySelector('.page-footer__next-btn'), imageId);
    };

    const handleComments = (page, commentsElm, imageId) => {
        page.forEach(({owner, content, date, _id}) => {
            const formattedDate = new Date(date);
            const comment = document.createElement('div');
            comment.className = "comment";
            comment.innerHTML = 
            `
            <div class="comment__content">
                <div class="comment__author">${owner}</div>
                <div class="comment__content">${content}</div>
                <div class="comment__date">${formattedDate}</div>
            </div>
            <div class="comment-delete-btn"></div>
            `;
            handleDeleteComment(
                comment.querySelector('.comment-delete-btn'), _id, imageId, owner);
            commentsElm.append(comment);
        });
        const commentFooter = document.createElement("div");
        commentFooter.className = "page-footer";
        commentFooter.innerHTML = 
        `
        <div class="page-footer__btns-container">
            <button class="page-footer__prev-btn page-footer__btn">
                < Prev
            </button>
            <button class="page-footer__next-btn page-footer__btn">
                Next >
            </button>
        </div>
        `;
        handleCommentPageFooter(commentFooter, imageId);
        commentsElm.append(commentFooter);
    };

    const renderComments = (imageId, imageOwner) => {
        api.getComments(imageId, commentPage, (err, res) => {
            const commentsElm = document.querySelector("#comments");
            commentsElm.innerHTML=``;

            if(err) onError(errBoxElnt, err);
            else if(res.length > 0) handleComments(res, commentsElm, imageId, imageOwner);
            else if(commentPage > 0){
                commentPage = commentPage - 1;
                renderComments(imageId, imageOwner);
            }
        });
    };

    const handleCommentSection = (commentSectionElm, imageId) => {
        handleCommentForm(commentSectionElm.querySelector('.comment-form'), imageId);
        renderComments(imageId);
    };

    const handlePost = (post, userPosts) => {
        const {owner, title, _id} = post;
        const userPost = document.createElement('div');
        userPost.className = "user-post";
        userPost.innerHTML=
        `<div class="user-post__header">
            <div class="user-post__info">
                <div class="user-post__user-profile-pic-container">
                    <img class="user-post__user-profile-pic" src="./media/user.png"/>
                </div>
                <div class="user-post__text-info-container">
                    <span class="user-post__user-name">${owner}</span>
                    <span class="user-post__image-title">${title}</span>
                </div>
            </div>
        </div>
        <div class="user-post__image-container">
            <img src="/api/images/${_id}/picture/" alt="User's image" class="user-post__image">
        </div>
        <div class="user-post__footer">
            <div class="user-post__btns-container">
                <div class="user-post__btn-container">
                    <button class="prev-btn user-post__btn"></button>
                </div>
                <div class="user-post__btn-container">
                    <button class="remove-btn user-post__btn"></button>
                </div>
                <div class="user-post__btn-container">
                    <button class="next-btn user-post__btn"></button>
                </div>
            </div>
        </div>
        <div class="comment-section">
            <form class="comment-form">
                <textarea rows="2" class="comment-form-element" id="comment-content" 
                    placeholder="Enter your comment" name="comment-message" required></textarea>
                <button type="submit" class="btn">Post your comment</button>
            </form>
            <div class="comments" id="comments"></div>
        </div>
        `;
        handlePostFooter(userPost.querySelector('.user-post__footer'), _id);
        userPosts.append(userPost);
        handleCommentSection(
            userPosts.querySelector('.user-post')
            .querySelector('.comment-section'), _id
            );
    };

    const renderPost = () => {
        api.getImage(username, imagePage, (err, res) => {
            userPostElnt.innerHTML=``;
            if (err) onError(errBoxElnt, err);
            else if(res.length > 0) handlePost(res[0], userPostElnt);
            else if(imagePage>0){
                imagePage = imagePage - 1;
                renderPost();
            }
            else{
                userPostElnt.innerHTML=`<div class="no-images-message">No Images Found</div>`;
            }
        });
    };

    renderPost();
};

const renderHomePage = (parent) => {

    const homePage = document.createElement("div");
    homePage.className="page";
    homePage.innerHTML = `
    <div class="post-image-form-container">
        <div class="post-image-form-header">
            <h1 class="post-image-form-heading">Post Images</h1>
            <label class="switch">
                <input type="checkbox" id="post-image-form-checkbox" autocomplete="off">
                <span class="slider round"></span>
            </label>
        </div>
        <form class="post-image-form" id="post-image-form">
            <div class="form__elements">
                 <div class="form__element">
                    <label for="image-name">Title</label>
                    <input type="text" id="post-image-name" class="form__input" 
                    placeholder="Enter image title" name="image-name" required/>
                </div>
                <div class="form__element upload-image-container">
                    <div class="upload-file-container">
                        <input type="file" id="post-image-file" name="image-file" accept="image/png, image/jpg" required/>
                        <span>Upload image</span>
                    </div>
                    <div class="file-selected-container">
                        No File chosen
                    </div>
                </div>
            </div>    
            <button type="submit" class="btn">Post your message</button>
        </form>
    </div>
    <p id="error_box"></p>
    <div id="user-posts"></div>
    `;

    let checkBox = homePage.querySelector('#post-image-form-checkbox');
    let postImageForm = homePage.querySelector('#post-image-form');
    let uploadImageInput = homePage.querySelector('#post-image-file');
    let fileSelectedContainer = homePage.querySelector('.file-selected-container');
    let userPostsElmt = homePage.querySelector('#user-posts');
    let errBoxElnt = homePage.querySelector('#error_box');
    let username = api.getUsername();
    
    postImageForm.style.display = "none";
    checkBox.checked=false;
    
    checkBox.addEventListener('change', () => {
        if (checkBox.checked) postImageForm.style.display  = "";
        else postImageForm.style.display = "none";
    });

    const resetImageForm = () => {
        fileSelectedContainer.innerHTML = `No File chosen`;
        postImageForm.reset();
    };

    postImageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const imageTitle = document.querySelector("#post-image-name").value;
        const file = uploadImageInput.files[0];
        resetImageForm();
        api.addImage(imageTitle, file, (err) => {
            if(err) onError(err);
            else{
                renderUserPosts(userPostsElmt, errBoxElnt, username);
            }
        });
    });

    uploadImageInput.addEventListener("change", () => {
        fileSelectedContainer.innerHTML = `${uploadImageInput.files[0].name}`;
      });

    renderUserPosts(userPostsElmt, errBoxElnt, username);
    parent.append(homePage);
};

const renderUserGalleries = (userGalleriesElmnt, errBoxElnt) => {
    galleryPage = 0;

    const handlePrevCommentBtn = (btnElm) => {
        if(galleryPage > 0) btnElm.style.display = "";
        else btnElm.style.display = "none";
        btnElm.addEventListener('click', () => {
            if(galleryPage > 0) galleryPage = galleryPage - 1;
            renderGalleries();
        });
    };

    const handleNextCommentBtn = (btnElm) => {
        api.getGalleries(galleryPage + 1, (err, galleries) => {
            if(err) onError(errBoxElnt, err);
            else {
                if(galleries.length > 0) btnElm.style.display="";
                else btnElm.style.display="none";
            }
        });
        btnElm.addEventListener('click', () => {
            api.getGalleries(galleryPage + 1, (err, nextGalleries) => {
                if (err) onError(errBoxElnt, err);
                else {
                    if(nextGalleries && nextGalleries.length > 0) galleryPage = galleryPage + 1;
                    renderGalleries();
                }
            });
        });
    };

    const handleGalleryPageFooter = (galleryFooterElm) => {
        handlePrevCommentBtn(galleryFooterElm.querySelector('.page-footer__prev-btn'));
        handleNextCommentBtn(galleryFooterElm.querySelector('.page-footer__next-btn'));
    };

    const handleGalleries = (galleries, userGalleriesElmnt) => {
        galleries.forEach(({_id}) => {
            const gallery = document.createElement('div');
            gallery.className = "gallery";
            gallery.innerHTML = 
            `
                <div class="gallery__profile"></div>
                <div class="gallery__owner">${_id}</div>
            `;
            gallery.addEventListener("click", (e) => {
                e.preventDefault();
                path = "/users/"+_id;
                renderApp();
            });
            userGalleriesElmnt.append(gallery);
        });
        const galleryFooter = document.createElement("div");
        galleryFooter.className = "page-footer";
        galleryFooter.innerHTML = 
        `
        <div class="page-footer__btns-container">
            <button class="page-footer__prev-btn page-footer__btn">
                < Prev
            </button>
            <button class="page-footer__next-btn page-footer__btn">
                Next >
            </button>
        </div>
        `;
        handleGalleryPageFooter(galleryFooter);
        userGalleriesElmnt.append(galleryFooter);
    };

    const renderGalleries = () => {
        api.getGalleries(galleryPage, (err, res) => {
            userGalleriesElmnt.innerHTML=``;
            if (err) onError(errBoxElnt, err);
            else if(res.length > 0) handleGalleries(res, userGalleriesElmnt);
            else if(galleryPage > 0){
                galleryPage = galleryPage - 1;
                renderGalleries();
            }
        });
    };

    renderGalleries();

};

const renderBrowsePage = (parent) => {
    const browsePage = document.createElement("div");
    browsePage.className="page";
    browsePage.innerHTML=`
        <p id="error_box"></p>
        <div id="user-galleries"></div>
    `;
    let userGalleriesElmnt = browsePage.querySelector("#user-galleries");
    let errElmntBox = browsePage.querySelector("#error_box");
    renderUserGalleries(userGalleriesElmnt, errElmntBox);

    parent.append(browsePage);
};

const renderUserGalleryPage = (parent) => {
    const usrGalleryPage = document.createElement("div");
    usrGalleryPage.className="page";
    usrGalleryPage.innerHTML=`
        <p id="error_box"></p>
        <div id="user-posts"></div>
    `;
    let userPostsElmt = usrGalleryPage.querySelector('#user-posts');
    let errBoxElnt = usrGalleryPage.querySelector('#error_box');
    const username = path.split("/");
    if(!username[2]) onError(errBoxElnt, "Invalid username");
    else renderUserPosts(userPostsElmt, errBoxElnt, username[2]);
    parent.append(usrGalleryPage);
};

const renderNav = (parent) => {
    const username = api.getUsername();
    const navBar = document.createElement("nav");
    navBar.className="nav-bar";
    navBar.innerHTML = `
        <div class="nav-bar__elements">
            <h1 class="nav-bar__logo">Web Gallery</h1>
            <div class="nav-bar__btns">
                ${(username) ? 
                    `
                    <button class="nav-bar__btn home-btn">Home</button>
                    <button class="nav-bar__btn browse-btn">Browse</button>
                    <button class="nav-bar__btn sign-out-btn">Sign Out</button>
                    ` : ''}
            </div>
        </div>
    `;
    const homeButton = navBar.querySelector(".home-btn");
    const browseButton = navBar.querySelector(".browse-btn");
    const signoutButton = navBar.querySelector(".sign-out-btn");

    if(homeButton) homeButton.addEventListener("click", (e) => {
        e.preventDefault();
        if(path != "/"){
            path = "/";
            renderApp();
        }
    });

    if(browseButton) browseButton.addEventListener("click", (e) => {
        e.preventDefault();
        if(path != "/browse"){
            path = "/browse";
            renderApp();
        }
    });

    if(signoutButton) signoutButton.addEventListener("click", (e) => {
        e.preventDefault();
        api.signout((err) => {
            if (err) console.log(err);
            path = "/";
            renderApp();
        });
    });

    parent.append(navBar);
};

const renderApp = () => {
    const username = api.getUsername();
    app.innerHTML=``;
    renderNav(app);
    if(username){
        switch (true){
            case path === "/":
                renderHomePage(app);
                break;
            case path === "/browse":
                renderBrowsePage(app);
                break;
            case path.includes("/users/"):
                renderUserGalleryPage(app);
                break;
        }
    }
    else renderAuthPage(app);
};

window.onload = (function(){
    "use strict";
    renderApp();
}());