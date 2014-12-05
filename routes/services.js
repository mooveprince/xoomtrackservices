var express = require('express');
var cheerio = require('cheerio'); 
var request = require('request');


var router = express.Router();
//DB Connection
var pg = require('pg');
var conString = process.env.DATABASE_URL;
var client = new pg.Client(conString);
client.connect();


router.get('/getSubscribers', function (req, res) { 
    client.query('select email, subscribed from xoomercustomer', function (err, result) {
        if (err) { 
            console.error(err); 
        } else {
            res.json (result.rows); 
        }
    });
});

router.get('/getActiveSubscribers', function (req, res) { 
    client.query('select email, subscribed from xoomercustomer where subscribed = \'Y\'', function (err, result) {
        if (err) { 
            console.error(err); 
        } else {
            res.json (result.rows); 
        }
    });
});

router.post('/addSubscriber', function(req, res) {
    client.query('insert into xoomercustomer (email, subscribed) values ($1, \'Y\')',[req.body.email],function (err, result) {
        if (err) { 
            console.error(err); 
        } else {
            res.json ({inserted: true});
        }        
    });
});

router.post('/subscriberDetail', function(req, res) {
    var subscriberDetail = {
        existingUser : false,
        email : "",
        subscriptionStatus : ""
    }
    client.query('select email, subscribed from xoomercustomer where email = $1',[req.body.email],function (err, result) {
        if (err) { 
            console.error(err); 
        } else {
            if (result.rows.length > 0 ) {
                subscriberDetail.existingUser = true;
                subscriberDetail.email = result.rows[0].email;
                subscriberDetail.subscriptionStatus = result.rows[0].subscribed; 
                res.json({subscriberDetail:subscriberDetail});
            } else {
                subscriberDetail.existingUser = false;
                subscriberDetail.email = req.body.email;
                subscriberDetail.subscriptionStatus = "N";  
                res.json({subscriberDetail:subscriberDetail});
            }
            
        }        
    });
});

router.post('/deactivatateSubscription', function(req, res) {
    client.query('update xoomercustomer set subscribed = \'N\', unjoined = $1 where email= $2', [new Date( ), req.body.email], function (err, result) {
        if (err) { 
            console.error(err); 
        } else {
            res.json ({removed: true});
        }        
    });
});

router.post('/reactivatateSubscription', function(req, res) {
    client.query('update xoomercustomer set subscribed = \'Y\', rejoined = $1 where email= $2', [new Date( ), req.body.email], function (err, result) {
        if (err) { 
            console.error(err); 
        } else {
            res.json ({reactivated: true});
        }        
    });    
});


router.get('/getRateHistory', function(req, res) { 
    client.query('select * from ratetracker', function(err, result) {
        if (err) { 
            console.error(err); 
        } else {
            res.json (result.rows);
        }        
    });
});


router.get('/getPersistedRate', function (req, res) {
    lastPersistedRate ( function (persistedRate) { 
        res.json({persistedRate:persistedRate});
    });
});

router.get('/getCurrentXoomRate', function (req, res) {
    scrapeXoomSite ( function (currentRate) { 
        res.json({currentRate:currentRate});
    });
});

router.get('/isRateChanged', function (req, res) { 
    scrapeXoomSite ( function (rateFromXoom) { 
        lastPersistedRate ( function (persistedRateInfo) { 
            console.log ("From DB.." + JSON.stringify(persistedRateInfo[0].rate));
            var response = {
                isRateChanged : false,
                rateFromXoom : rateFromXoom,
                persistedRate : persistedRateInfo[0].rate
            }
            if (rateFromXoom.slice(7,-6).trim() == persistedRateInfo[0].rate.trim()) {
                response.rateFromXoom = rateFromXoom.slice(7,-6).trim();
                res.json(response);
            } else {
                response.isRateChanged = true;
                response.rateFromXoom = rateFromXoom.slice(7,-6).trim();
                res.json(response);
            }            
        });
    });
});

router.post ('/persistRate', function (req, res) {
    client.query('insert into ratetracker (rate) values ($1)',[req.body.newRate],function (err, result) {
        if (err) {
            console.error(err);
        } else {
           res.json({inserted: true});           
        }        
    });    
});

scrapeXoomSite = function (callback) {
    url = 'http://localhost:3006/';
    request(url, function(error, response, html){ 
		if(!error){
			var $ = cheerio.load(html);
			$('.fx-rate').filter(function(){
		        rate = $(this).first().text();           
		        callback(rate);
	        })

		} else {
            console.log ("Error after making request to URL");
        }        
    });
}

lastPersistedRate = function (callback) {
    client.query('select * from ratetracker ORDER BY timestamp DESC LIMIT 1', function (err, result) {
        if (err) { 
            console.error(err); 
        } else {
            callback (result.rows);
        }         
    });    
}




module.exports = router;
