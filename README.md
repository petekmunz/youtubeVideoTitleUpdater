# Youtube Video Title Updating Script

Inspired by Tom Scott and his video [https://www.youtube.com/watch?v=BxV14h0kFs0](https://www.youtube.com/watch?v=BxV14h0kFs0)

This script builds upon the Youtube API [https://developers.google.com/youtube/v3/quickstart/nodejs](https://developers.google.com/youtube/v3/quickstart/nodejs) to obtain authentication & update one's Youtube video title periodically.

## Requirements to run

* Follow the [Quickstart](https://developers.google.com/youtube/v3/quickstart/nodejs) and obtain an OAuth 2.0 Client ID json file & save the file as "client_secret.json"
* Create a Firestore database in your project
* Create a service account with the role of "Cloud Datastore User", download the json and save the file as "serviceAccount.json"
* In the [app.ts](./source/app.ts) file, replace with the necessary values here:

```
const VIDEO_ID = 'YOUR YOUTUBE VIDEO ID';
const db = new Firestore({
    projectId: 'YOUR PROJECT ID ON GOOGLE CLOUD CONSOLE',
    keyFilename: 'PATH TO YOUR SERVICE_ACCOUNT.JSON FIILE'
});
```

Finally deploy the app to [Appengine](https://cloud.google.com/appengine) and deploy the "cron.yaml" file (responsible for periodic video updates) to the same app engine and you are good to go.
