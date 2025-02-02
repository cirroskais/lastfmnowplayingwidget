import { config } from "./config.js";

var App = {};
var username = config.username;
var apikeylfm = config.apikeylfm;

var container = document.querySelector(".container");
var newAlbumCover = document.getElementById("cover-new");
var coveroverlay = document.getElementById("coveroverlay");
var artistsElement = document.getElementById("artists");
var songName = document.getElementById("name");
var lfade = document.getElementById("lfade");

var bar1 = document.querySelector(".bar1");
var bar2 = document.querySelector(".bar2");
var bar3 = document.querySelector(".bar3");

function timeoutPromise(dur) {
    return new Promise(function (resolve) {
        setTimeout(function () {
            resolve();
        }, dur);
    });
}

function makeSongName(item) {
    return `${item.artist["#text"]} - ${item.name}`;
}

App.currentSong = "";
App.currentCover = "";
App.user = null;
App.loadedCovers = {};
App.waitingSocket = false;
App.socketReady = false;
App.open = false;
App.firstAlbumLoad = true;
App.scrollingSong = false;
App.scrollingArtists = false;

App.fetchUser = function () {
    return fetch(
        `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${username}&api_key=${apikeylfm}&format=json`
    )
        .then(function (response) {
            if (response.status !== 200) {
                return timeoutPromise(2000).then(function () {
                    return App.fetchUser();
                });
            }
            return response.json();
        })
        .then(function (data) {
            App.user = data;
            return data;
        })
        .catch(function (error) {
            return timeoutPromise(2000).then(function () {
                return App.fetchUser();
            });
        });
};

App.wasPlaying = false;
App.retryCount = 0;

App.checkSong = function () {
    return App.fetchUser()
        .then(function (data) {
            var track = data.recenttracks.track[0];
            if (!track["@attr"] || !track["@attr"].nowplaying) {
                if (App.wasPlaying) {
                    if (App.retryCount < 3) {
                        App.retryCount++;
                        console.log("No song playing, retry: " + App.retryCount + "/3");
                        return timeoutPromise(1000).then(function () {
                            return App.checkSong();
                        });
                    } else {
                        App.close();
                        App.retryCount = 0;
                        App.wasPlaying = false;
                    }
                } else {
                    return timeoutPromise(1000).then(function () {
                        App.checkSong();
                    });
                }
            } else {
                const data = {
                    songName: makeSongName(track),
                    artists: [{ name: track.artist["#text"] }],
                    title: track.name,
                    albumCover: track.image[track.image.length - 1]["#text"],
                };

                if (App.open) {
                    App.startUpdate(data);
                } else {
                    App.openElement();
                    return timeoutPromise(500)
                        .then(function () {
                            App.startUpdate(data);
                            return timeoutPromise(1000);
                        })
                        .then(function () {
                            App.checkSong();
                        });
                }

                App.wasPlaying = true;
                App.retryCount = 0;
            }
            return timeoutPromise(1000).then(function () {
                App.checkSong();
            });
        })
        .catch(function (error) {
            console.error(error);
            return timeoutPromise(1000).then(function () {
                App.checkSong();
            });
        });
};

App.close = function () {
    App.open = false;
    App.firstAlbumLoad = true;
    App.currentCover = "";
    App.newAlbumCover = "";
    App.currentSong = "";
    bar1.classList.remove("active");
    bar2.classList.remove("active");
    bar3.classList.remove("active");
    lfade.classList.add("active");
    songName.classList.remove("active");
    coveroverlay.classList.remove("active");
    setTimeout(function () {
        artistsElement.classList.remove("active");
    }, 350);
    setTimeout(function () {
        songName.innerHTML = "";
        artistsElement.innerHTML = "";
        songName.className = "";
        artistsElement.className = "";
        App.scrollingSong = false;
        App.scrollingArtists = false;
        container.classList.remove("active");
    }, 800);
    setTimeout(function () {
        container.classList.remove("raise");
    }, 1350);
    setTimeout(function () {
        newAlbumCover.src = "";
        newAlbumCover.classList.remove("active");
    }, 1800);
};

App.startUpdate = function (data) {
    if (App.currentSong !== data.songName) {
        App.currentSong = data.songName;
        App.updateSongName(data.artists, data.title);
        App.updateCover(data.albumCover);
    }
    if (App.currentCover !== data.albumCover) {
        App.currentCover = data.albumCover;
        App.updateCover(data.albumCover);
    }
};

App.openElement = function () {
    App.open = true;
    container.classList.add("raise");
    setTimeout(function () {
        container.classList.add("active");
        lfade.classList.add("active");
    }, 550);
};

App.updateSongName = function (artists = [], name) {
    const setEllipsis = (element, text) => {
        const containerRight = document.getElementsByClassName("container")[0].getBoundingClientRect().right;
        element.textContent = text;

        setTimeout(() => {
            console.log(containerRight, element.getBoundingClientRect().right, element);
            if (element.getBoundingClientRect().right > containerRight) {
                element.classList.add("scrolling");
            } else {
                element.classList.remove("scrolling");
            }
        }, 225);
    };

    lfade.classList.add("active");
    artistsElement.classList.remove("active");
    songName.classList.remove("active");

    setTimeout(function () {
        setEllipsis(artistsElement, artists.map((artist) => artist.name).join(", "));
        artistsElement.classList.add("active");
    }, 200);

    setTimeout(function () {
        setEllipsis(songName, name);
        songName.classList.add("active");
    }, 200);

    setTimeout(function () {
        lfade.classList.remove("active");
    }, 600);
};

App.updateCover = function (cover) {
    coveroverlay.classList.remove("active");
    bar1.classList.remove("active");
    bar2.classList.remove("active");
    bar3.classList.remove("active");

    setTimeout(function () {
        newAlbumCover.src = cover;
        newAlbumCover.onload = function () {
            newAlbumCover.classList.add("active");
            coveroverlay.classList.add("active");
            setTimeout(function () {
                bar1.classList.add("active");
                setTimeout(function () {
                    bar2.classList.add("active");
                    setTimeout(function () {
                        bar3.classList.add("active");
                    }, 200);
                }, 200);
            }, 200);
        };
    }, 450);
};

App.start = function () {
    App.fetchUser().then(function () {
        App.checkSong();
    });
};

document.addEventListener("DOMContentLoaded", () => {
    const bars = document.querySelectorAll(".bar");
    bars.forEach((bar) => {
        const duration = (Math.random() * 0.25 + 0.55).toFixed(2); // Random duration between 0.75s and 1.25s
        const delay = (Math.random() * 0.2).toFixed(2); // Random delay between 0s and 0.5s
        bar.style.animation = `pulse ${duration}s infinite ease-in-out`;
        bar.style.animationDelay = `${delay}s`;
    });
});

App.start();
