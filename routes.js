var dbOperations = require('./db-operations');

function initialize(app, db, socket, io) {

    // '/cops?lat=12.9718915&&lng=77.64115449999997'
   /* app.get('/cops', function(req, res){

        //Convert the query strings into Numbers
        var latitude = Number(req.query.lat);
        var longitude = Number(req.query.lng);

        dbOperations.fetchNearestCops(db, [longitude,latitude], function(results){

        //return the results back to the client in the form of JSON
            res.json({
                cops: results
            });
        });  

    });*/

    app.get('/cops/info', function(req, res) {
        var userId = req.query.userId //extract userId from query params
        dbOperations.fetchCopDetails(db, userId, function(results) {
            res.json({
                copDetails: results //return results to client
            });
        });
    });


    //Listen to a 'request-for-help' event from connected citizens
    socket.on('request-for-help', function(eventData) {
        /*
            eventData contains userId and location
            1. First save the request details inside a table requestsData
            2. AFTER saving, fetch nearby cops from citizen’s location
            3. Fire a request-for-help event to each of the cop’s room
        */

        var requestTime = new Date(); //Time of the request

        var ObjectID = require('mongodb').ObjectID;
        var requestId = new ObjectID; //Generate unique ID for the request

        //1. First save the request details inside a table requestsData.
        //Convert latitude and longitude to [longitude, latitude]
        var location = {
            coordinates: [
                eventData.location.longitude,
                eventData.location.latitude
            ],
            address: eventData.location.address
        };
        dbOperations.saveRequest(db, requestId, requestTime, location, eventData.citizenId, 'waiting', function(results) {

            //2. AFTER saving, fetch nearby cops from citizen’s location
            dbOperations.fetchNearestCops(db, location.coordinates, function(results) {
                eventData.requestId = requestId;
                //3. After fetching nearest cops, fire a 'request-for-help' event to each of them
                for (var i = 0; i < results.length; i++) {
                    console.log("calling:"+results[i].userId);
                    io.sockets.in(results[i].userId).emit('request-for-help', eventData);
                }
            });
        });
    });
}

exports.initialize = initialize;