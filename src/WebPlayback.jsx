import React, { useState, useEffect } from 'react';
import Select from 'react-select';
import Popup from 'reactjs-popup';

const track = {
  name: "",
  album: {
    images: [
      { url: "" }
    ]
  },
  artists: [
    { name: "" }
  ]
}
const customStyles = {
  control: (provided) => ({
    ...provided,
    width: 400,
  }),
  option: (provided) => ({
    ...provided,
    color: 'black',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'black',
  }),
};


var selectedTrack;
var attempts;
var token;
var guesses;
var trackLink;

async function chooseTrack(token, trackUri) {
  const response = await fetch(`https://api.spotify.com/v1/me/player/play`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      uris: [trackUri],
    }),
  });
  return response;
}

async function pauseTrack(token) {
  const response = await fetch(`https://api.spotify.com/v1/me/player/pause`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  console.log(response)
  if (response.status == 502) {
    pauseTrack(token);
  }
  return response;

}
async function resumeTrack(token) {
  const response = await fetch(`https://api.spotify.com/v1/me/player/play`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  console.log(response)
  return response;
}

async function seekToBeginning(token) {
  const response = await fetch('https://api.spotify.com/v1/me/player/seek?position_ms=0', {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  console.log(response);
  return response;
}

async function searchTracks(query, token) {
  const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  const data = await response.json();
  //var tracks = data.tracks.items.map((track) => track.name);

  var result = data.tracks.items.map((track) => {
    var label = track.name + " - " + track.artists[0].name
    return { label: label, value: track.id };
  });

  return result;
}

async function fetchPlaylistTracks(token) {
  const playlistId = '6mtYuOxzl58vSGnEDtZ9uB';
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();
  const trackIds = data.items.map(item => item.track.id);
  return trackIds;
}

async function getSpotifyTrackUrl(token, trackId) {
  const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await response.json();
  return data.external_urls.spotify;
}

// removed playGame from here

function refreshPage() {
  window.location.reload();
}

function WebPlayback(props) {

  const [is_paused, setPaused] = useState(false);
  const [is_active, setActive] = useState(false);
  const [player, setPlayer] = useState(undefined);
  const [current_track, setTrack] = useState(track);
  const [options, setOptions] = useState([]);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showIncorrect, setShowIncorrect] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [selectedValue, setSelectedValue] = useState('');
  const [timer, setTimer] = useState('');
  const [secondsLeft, setSeconds] = useState(1);

  const startTimer = (initialSeconds) => {
    console.log(initialSeconds);
    for (let i = initialSeconds; i > 0; i--) {
      setTimeout(() => {
        setSeconds((prevSeconds) => prevSeconds - 1);
      }, 1000 * (initialSeconds - i + 1));
    }
  };

  async function playGame(authToken) {
    console.log("Attempts: " + String(attempts));
    console.log(2 ** attempts * 1000);

    if (attempts > 4) {
      console.log("gameover")
      setShowGameOver(true);
    } else {

    if (attempts == 0) {
      const tracks = await fetchPlaylistTracks(authToken);
      selectedTrack = tracks[Math.floor(Math.random() * tracks.length)];
      var trackText = "spotify:track:" + selectedTrack;
      console.log(selectedTrack)
      chooseTrack(authToken, trackText);
      setSeconds(1);
      startTimer(1)
      setTimeout(() => {
        pauseTrack(authToken);
      }, 1000);
      attempts += 1;
    } else {
      seekToBeginning(authToken)
      resumeTrack(authToken)
      setSeconds(2 ** attempts);
      startTimer(2 ** attempts)
      setTimeout(() => {
        pauseTrack(authToken);
      }, (2 ** attempts) * 1000);
      pauseTrack(authToken);
      attempts += 1;
    }
    trackLink = await getSpotifyTrackUrl(authToken, selectedTrack);
    console.log(trackLink)
  }
  }


  const getValue = e => {
    setSelectedValue(e.value);
  }

  const handleClick = () => {
    console.log(current_track.id)
    console.log("Selected: " + selectedValue)
    console.log(attempts)
    if (guesses + 1 <= attempts) {
      if (current_track.id == selectedValue) {
        console.log("correct")
        setShowCorrect(true);
      } else if (((current_track.id != selectedValue) && (guesses + 1 > 3)) || (attempts > 4)) {
        console.log("gameover")
        setShowGameOver(true);
      } else {
        setShowIncorrect(true);
        console.log("incorrect")
      }
      guesses++;
    }
    console.log("attempts " + attempts)
    console.log("guesses " + guesses)
  };

  const handleClose = () => {
    setShowCorrect(false);
    setShowIncorrect(false);
    setShowGameOver(false);
    setSelectedValue('');
  };

  const handleSelectChange = (searchText) => {
    if (searchText != null) {
      searchTracks(searchText, token)
        .then(result => {
          console.log(result)
          setOptions(result);
        })
        .catch(error => {
          console.error(error);
        });
    }
  }

  useEffect(() => {
    if (secondsLeft < 10) {
      setTimer('0:0' + secondsLeft);
    } else {
      setTimer('0:' + secondsLeft);
    }
  })

  useEffect(() => {

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;

    token = props.token;

    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {

      const player = new window.Spotify.Player({
        name: 'Heardle Web Player',
        getOAuthToken: cb => { cb(props.token); },
        volume: 0.5
      });

      setPlayer(player);

      player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
      });

      player.addListener('not_ready', ({ device_id }) => {
        console.log('Device ID has gone offline', device_id);
      });

      player.addListener('player_state_changed', (state => {

        if (!state) {
          return;
        }

        setTrack(state.track_window.current_track);
        setPaused(state.paused);

        player.getCurrentState().then(state => {
          (!state) ? setActive(false) : setActive(true)
        });

      }));
      pauseTrack(token);
      attempts = 0;
      guesses = 0;
      player.connect();

    };

    // Close popup when clicked outside of popup
    const handleOutsideClick = (event) => {
      if ((showCorrect && !event.target.closest('.popup-inner')) ||
        (showGameOver && !event.target.closest('.popup-inner')) ||
        (showIncorrect && !event.target.closest('.popup-inner'))) {
        setShowCorrect(false);
        setShowIncorrect(false);
        setShowGameOver(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);

  }, []);

  if (!is_active) {
    return (
      <>
        <div className="container">
          <div className="main-wrapper">
            <b> Instance not active. Transfer your playback using your Spotify app </b>
          </div>
        </div>
      </>)
  } else {
    return (
      <>
        <div className="container" style={{ display: 'flex', flexDirection: 'column' }}>
          <p style={{marginTop: 50}}>Attempts left: {5-attempts}</p>
          <p style={{fontSize: 100}}>{timer}</p>
          <div className="main-wrapper">
            <button className="btn-spotify" onClick={() => { playGame(token) }} >
              {is_paused ? "PLAY" : "PLAYING..."}
            </button>
          </div>
          <br />
          <div className="main-wrapper">
            <Select
              placeholder="Type the name of a song"
              className="basic-single"
              style={{ width: "80%" }}
              classNamePrefix="select"
              isClearable={false}
              isSearchable={true}
              autosize={false}
              name="color"
              options={options}
              onInputChange={handleSelectChange}
              onChange={getValue}
              styles={customStyles}
            />
            <button style={{ display: 'flex' }} className="btn-spotify" onClick={handleClick}>Submit guess</button>
            {showGameOver && (
              <div className="popup">
                <div className="popup-inner">
                  <button className="popup-close" onClick={handleClose}>
                    <span className="close-icon">&times;</span>
                  </button>
                  <h2>Out of guesses</h2>
                  <p>The correct song was: </p>
                  <br></br>
                  <h4>{current_track.name}</h4>
                  <p>{current_track.artists[0].name}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img src={current_track.album.images[0].url} className="now-playing__cover" alt="" style={{ paddingTop: '20px' }} />
                    <br></br>
                    <button style={{ display: 'flex' }} className="btn-spotify" onClick={refreshPage}>Play again</button>
                  </div>
                </div>
              </div>
            )}
            {showCorrect && (
              <div className="popup">
                <div className="popup-inner">
                  <button className="popup-close" onClick={handleClose}>
                    <span className="close-icon">&times;</span>
                  </button>
                  <h2>Congratulations!</h2>
                  <p>You guessed the song</p>
                  <br></br>
                  <h4>{current_track.name}</h4>
                  <p>{current_track.artists[0].name}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img src={current_track.album.images[0].url} className="now-playing__cover" alt="" style={{ paddingTop: '20px' }} />
                    <br></br>
                    <button style={{ display: 'flex' }} className="btn-spotify" onClick={refreshPage}>Play again</button>
                  </div>
                </div>
              </div>
            )}
            {showIncorrect && (
              <div className="popup">
                <div className="popup-inner">
                  <button className="popup-close" onClick={handleClose}>
                    <span className="close-icon">&times;</span>
                  </button>
                  <h3>Incorrect guess</h3>
                  <br></br>
                  <p>Give it another try!</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </>
    );
  }
}

export default WebPlayback