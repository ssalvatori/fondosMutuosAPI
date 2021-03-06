var restify = require('restify');
var mongoose = require('mongoose');

console.log("SERVER: starting..");
var server = restify.createServer({
	"name" : "fondosMutuos",
	"version" : "1.0.2"
});

var serverPort = process.env.OPENSHIFT_NODEJS_PORT || 18080;
var serverIp = process.env.OPENSHIFT_NODEJS_IP  || "0.0.0.0";
var mongoURI = process.env.MONGO_DEV_URI || "mongodb://127.0.0.1:27017/test";
var authentificationOn = process.env.SERVER_AUTHENTIFICACION || 0;

server.listen(serverPort, serverIp, function () {
    'use strict';
	console.log('%s listening at %s', server.name, server.url);
});

 // Clean up sloppy paths like //todo//////1//
server.pre(restify.pre.sanitizePath());
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.gzipResponse());

server.use(restify.authorizationParser());
server.use(function authenticate(req, res, next) {
    'use strict';
    
    if (authentificationOn !== "1") {
        next();
    }
    
	req.allow = { user: "test", pass: "test"};

    var authz = req.authorization.basic;

    if (!authz) {
        res.setHeader('WWW-Authenticate', 'Basic realm="fondosMutuos"');
        next(new restify.UnauthorizedError('authentication required'));
        return;
    }

    if (authz.username !== req.allow.user || authz.password !== req.allow.pass) {
        next(new restify.ForbiddenError('invalid credentials'));
        return;
    }

    next();
});

mongoose.connection.on('connected', function () {
    'use strict';
    console.log('Mongoose connection open');
});

mongoose.connection.on('error', function (err) {
    'use strict';
    console.log('Mongoose connection error: ' + err);
});

mongoose.connection.on('disconnected', function () {
    'use strict';
    console.log('Mongoose connection disconnected');
});

mongoose.connect(mongoURI, {server: {auto_reconnect: true, socketOptions: { keepAlive: 1 }}}, function (err, res) {
    'use strict';
	if (err) {
		console.log("Error connecting to mongo server");
        console.log(err);
		process.exit(1);
		
	} else {
		console.log("Succeeded connected to mongo server");
	}
});

var schemaRecord = new mongoose.Schema({
	price: { type: Number, required: true},
	priceDate: { type: Date, default: Date.now, required: true},
	name: { type: String, required: true, trim: true},
	obtain: { type: Date, default: Date.now}
});

var schemaCustody = new mongoose.Schema({
    total: { type: Number, required: true},
    name: { type: String, required: true, trim: true},
    realized: { type: Date, default: Date.now},
    created: { type: Date, default: Date.now},
    active: {type: Boolean, default: true}
});

var RecordModel = mongoose.model('Records', schemaRecord);
var CustodyModel = mongoose.model('Custody', schemaCustody);

function recordCreate(req, res, next) {
    'use strict';
    
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    
    console.log("saving record");
    
	var dataObj = req.body;
    var Record = new RecordModel({
		name  :   dataObj.name,
		price :   dataObj.price,
		priceDate :   new Date(dataObj.priceDate)
	});

	Record.save(function (err) {
		if (err) {
			console.log("ERROR " + err);
			return next(err);
		}
		res.send({"status" : "OK", "code" : "001"});
		return next();
	});
}

function recordFindAll(req, res, next) {
    'use strict';
    
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    
    console.log("finding records");
    
	console.log("Params: ");
	console.log(req.params);

	var conditions = {}, conditionsDate = {};

	if (req.params.name) {
		conditions.name = req.params.name;
	}
	if (req.params.startDate) {
		conditionsDate["$gte"] = new Date(req.params.startDate);
		
	}
	if (req.params.endDate) {
		conditionsDate["$lte"] = new Date(req.params.endDate);
	}

	if (Object.keys(conditionsDate).length > 0) {
		conditions.priceDate = conditionsDate;
	}

	console.log("Conditions");
	console.log(conditions);
 
	RecordModel.find(conditions, "name price priceDate", {sort: {priceDate: 1}}, function (err, results) {
		if (err) {
			console.log("ERROR " + err);
			return next(err);
		}
		res.send({"status": "ok", "data": results});
		return next();
	});
}

function recordFindNames(req, res, next) {
    'use strict';
    
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    
    console.log("finding distinct names");
    
    RecordModel.find().distinct('name', function (err, names) {
        if (err) {
            console.log("ERROR " +  err);
            return next(err);
        }
        res.send({"status": "ok", "names": names});
        return next();
    });
}

function custodyList(req, res, next) {
    'use strict';
    
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    
    console.log("finding stock in custody");

    var name = req.params.name;

    CustodyModel.aggregate([
            { $match : { name: name, active: true }},
            { $group : { _id: null, sum : { $sum : '$total' }}}
        ], 
        function(err, summary) {
            if(err) {
                console.log(err);
                next();
            }
            console.log(summary);
            res.send(summary);
            next();
        });
}

function custodyCreate(req, res, next) {
    'use strict';
    
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    
    console.log("saving custody");
    
	var dataObj = req.body;

    var Record = new CustodyModel({
		name  : dataObj.name,
		total : dataObj.total,
        create: new Date(),
        realized: dataObj.realized,
		active :   true
	});

	Record.save(function (err) {
		if (err) {
			console.log("ERROR " + err);
			return next(err);
		}
		res.send({"status" : "OK", "code" : "001"});
		return next();
	});
}



/*routes*/
server.post("/fondosMutuos/record/save", recordCreate);
server.get("/fondosMutuos/record/find", recordFindAll);
server.get("/fondosMutuos/record/names", recordFindNames);

server.post("/fondosMutuos/custody/add", custodyCreate);
server.get("/fondosMutuos/custody/list", custodyList);


