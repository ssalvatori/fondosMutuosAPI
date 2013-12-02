var restify = require('restify');
var mongoose = require('mongoose');

console.log("SERVER: starting..");
var server = restify.createServer({
	"name" : "fondosMutuos",
	"version" : "1.0.1"
});

server.listen(8080, function() {
	console.log('%s listening at %s', server.name, server.url);
});

 // Clean up sloppy paths like //todo//////1//
server.pre(restify.pre.sanitizePath());
server.use(restify.queryParser());
server.use(restify.bodyParser());
server.use(restify.gzipResponse());

server.use(restify.authorizationParser());
server.use(function authenticate(req, res, next) {
	req.allow = { user: "test", pass: "test"}

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

mongoose.connect(process.env.MONGO_DEV_URI, function(err, res) {
	if(err) {
		console.log("Error connecting to mongo server");
		process.exit(1);
		
	} else {
		console.log("Succeeded connected to mongo server");
	}	
});

var schemaRecord = new mongoose.Schema({
	price: { type: Number, required: true},
	priceDate: { type: Date, default: Date.now, required: true },
	name: { type: String, required: true, trim: true },
	obtain: { type: Date, default: Date.now }
});


var RecordModel = mongoose.model('Records', schemaRecord);

/*routes*/
server.post("/fondosMutuos/record/save", recordCreate);
server.get("/fondosMutuos/record/find",recordFindAll);

function recordCreate(req, res, next) {
	var dataObj = JSON.parse(req.body);
	console.log("Request:");
	console.log(JSON.stringify(dataObj));

	var Record = new RecordModel({
		name : 	dataObj.name,
		price	:	dataObj.price,
		priceDate	:	new Date(dataObj.priceDate)
	});

	Record.save(function(err) {
		if(err) {
			console.log("ERROR "+err);
			return next(err);
		}
		res.send({"status":"OK","code":"001"});
		return next();
	});
};

function recordFindAll(req, res, next) {

	console.log("Params: ");
	console.log(req.params);

	var conditions = {};
	var conditionsDate = {};

	if(req.params.name) {
		conditions.name = req.params.name;
	}
	if(req.params.startDate) {
		conditionsDate["$gte"] = new Date(req.params.startDate);
		
	}
	if(req.params.endDate) {
		conditionsDate["$lte"] = new Date(req.params.endDate);
	}

	if(Object.keys(conditionsDate).length > 0) {
		conditions.priceDate = conditionsDate;
	}

	console.log("Conditions");
	console.log(conditions);
 
	RecordModel.find(conditions,"name price priceDate",function(err, results) {
		if(err) {
			console.log("ERROR "+err);
			return next(err);
		}
		res.send({"status": "ok", "data": results});
		return next();
	});
	
}
