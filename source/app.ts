import express from 'express';
import bodyParser from 'body-parser';
import { google } from 'googleapis';
import fs from 'fs';
import { Firestore } from '@google-cloud/firestore';

const OAuth2 = google.auth.OAuth2;
const youtube = google.youtube('v3');
const SCOPES = ["https://www.googleapis.com/auth/youtube.force-ssl"];
const VIDEO_ID = 'YOUR YOUTUBE VIDEO ID';
const db = new Firestore({
    projectId: 'YOUR PROJECT ID ON GOOGLE CLOUD CONSOLE',
    keyFilename: 'PATH TO YOUR SERVICE_ACCOUNT.JSON FIILE'
});
let oauth2Client: any;
const app = express();
app.use(bodyParser.urlencoded({ extended: false }));

/**
* If it is first-time app being authenticated this endpoint will be hit.
* This endpoint is registered as the redirectUri for the Oauth2client
*
*/
app.get('/oauth2callback', function (req, res) {
    if (req.query.code) {
        res.status(200).send('Thanks for authenticating the app. You can now leave this page');
        let code = req.query.code;

        oauth2Client.getToken(code, function (err: any, token: any) {
            if (err) {
                console.log('Error while trying to retrieve access token: ', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            getAuthenticationAndUpdateTitle(oauth2Client);
        });
    } else {
        res.status(200).send('There was an error');
    }

});

//Endpoint to serve as our cronJob initiator to periodically update Video title
app.get('/cronJob', function (req, res) {
    res.status(200).send('Request good');   //Google Cloud Scheduler Cron  jobs need a successful response returned
    if (oauth2Client) {
        getAuthenticationAndUpdateTitle(oauth2Client);
    } else {
        loadSecrets();
    }
});

function loadSecrets() {
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.error('Error loading client secret file: ' + err);
            return;
        }

        authorize(JSON.parse(content.toString()), getAuthenticationAndUpdateTitle);
    });
}


/**
* Create an OAuth2 client with the given credentials, and then execute the
* given callback function.
*
* @param {Object} credentials The authorization client credentials.
* @param {function} callback The callback to call with the authorized client.
*/
function authorize(credentials: any, callback: Function) {
    let clientSecret = credentials.web.client_secret;
    let clientId = credentials.web.client_id;
    let redirectUrl = credentials.web.redirect_uris[0];
    oauth2Client = new OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    return db.collection('authTokens').doc('oauthToken')
        .get()
        .then(doc => {
            if (doc.exists) {
                let token = doc.data()!.token;
                if (token === '') {
                    //No token in db, so we get a new one
                    getNewToken(oauth2Client);
                } else {
                    //There is a token present, we use it
                    oauth2Client.credentials = JSON.parse(token);
                    callback(oauth2Client);
                }
            }
        });
}

/**
 * Prompt for user authorization, and then
 * get & store the token received in the redirectUri.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * 
 */
function getNewToken(oauth2Client: any) {
    let authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES,
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
}

/**
* Store token to database be used in later program executions.
*
* @param {Object} token The token to store to disk.
*/
async function storeToken(token: Object) {
    let stringToken = JSON.stringify(token);
    try {
        await db.collection('authTokens').doc('oauthToken')
            .set({
                token: stringToken
            }, { merge: true });
    }
    catch (err) {
        console.error(`Error storing token: ${err}`);
    }
}

function getAuthenticationAndUpdateTitle(auth: any) {
    let youtubePart = ['id', 'snippet', 'statistics'];
    let videoId = [VIDEO_ID];
    youtube.videos.list({
        auth: auth,
        id: videoId,
        part: youtubePart
    }, (err: any, response: any) => {
        if (err) {
            console.error(`Auth call error: ${err}`);
            return;
        }
        if (response.data.items[0]) {
            //Found the video, now update it
            updateVideoTitle(response.data.items[0], auth);
        }
    }
    );
};

function updateVideoTitle(video: any, auth: any) {
    //Get the necessary current data
    let views = video.statistics.viewCount;

    //If you need likes & comments, uncomment the below lines
    //let likes = video.statistics.likeCount;
    //let commentCount = video.statistics.commentCount;

    video.snippet.title = `This video has ${views} views`;

    let youtubePart = ['snippet', 'statistics'];
    youtube.videos.update(
        {
            auth: auth,
            part: youtubePart,
            requestBody: video
        },
        (err: any, response: any) => {
            if (err) {
                console.log(`Error updating video: ${err}`);
            }
        }
    );
}

//Get the secrets & make call the very first time server starts
loadSecrets();

//Start Server
const port = process.env.PORT;
app.listen(port, () => {
    console.log(`Server has started at port: ${port}`);
});