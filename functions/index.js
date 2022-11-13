const functions = require("firebase-functions");
const admin = require("firebase-admin");
const twilio = require("twilio");
const cors = require('cors')({origin: true});
admin.initializeApp(functions.config().firebase);

const accountSid = functions.config().twilio.sid;
const authToken = functions.config().twilio.token;

const client = twilio(accountSid, authToken);
const twilioNumber = '+18145463460';

function validE164(num) {
    return /^(?!(\d)\1+$)(?:\(?\+\d{1,3}\)?[- ]?|0)?\d{10}$/.test(num);
}

exports.sendMessage = functions.https.onCall((data, context) => {
    const {mobile, user, host} = data;
    
    if(!validE164(mobile)) {
        throw new Error('Invalid Mobile Number!')
    }

    const textMessage = {
        body: `Thank you for visiting. Go to ${host}/healthbase/users/profile/${user}`,
        to: mobile,
        from: twilioNumber
    };

    return client.messages.create(textMessage);
})

exports.sendMessageHttp = functions.https.onRequest((req, resp) => {
    resp.setHeader("Access-Control-Allow-Origin", "*");
    resp.setHeader("Access-Control-Allow-Headers", "Content-Type");
    cors(req, resp, () => {
        const {mobile, user, host} = req.body.data;
        
        if(!validE164(mobile)) {
            throw new Error('Invalid Mobile Number!')
        }
    
        const textMessage = {
            body: `Thank you for visiting. Go to ${host}/healthbase/users/profile/${user}`,
            to: mobile,
            from: twilioNumber
        };

        client.messages.create(textMessage).then((message) => {
            console.log(message, 'twilio message');
            resp.status(200).send({data: { success: true, message: 'yeah!' }})
        })
        .catch(err => console.log(err, 'twilio error'))
    });
})

// exports.textStatus = functions.database
//     .ref('/posts/{id}')
//     .onCreate((snapshot, event) => {
//         const id = event.params.id;
//         let snapVal = snapshot.val();
//         console.log(event.params.id, 'event id');
//         functions.logger.debug('event id', event.params.id, snapVal);
//         return admin.database()
//             .ref(`/posts/${id}`)
//             .once('value')
//             .then(snapshot => snapshot.val())
//             .then(post => {
//                 const mobile = post.mobile;
//                 console.log(post, 'post created');
//                 functions.logger.debug('post', post);
//                 if(!validE164(mobile)) {
//                     throw new Error('Invalid Mobile Number!')
//                 }

//                 admin.database()
//                     .ref(`/users/${post.createdFor}`)
//                     .once('value')
//                     .then(snapshot => snapshot.val())
//                     .then(user => {
//                         const textMessage = {
//                             body: `Thank you for visiting. Go to http://localhost:4200/healthcare/users/profile/${user.id} and use password: ${user.password} to check more details`,
//                             to: mobile,
//                             from: twilioNumber
//                         };
        
//                         return client.messages.create(textMessage)
//                     })
//                     .then(message => console.log(message.sid, 'Success'))
//                     .catch(err => console.log(err))
//             })
//     })

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//   functions.logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
