import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";
import {expect, use} from "chai";
import chaiHttp from "chai-http";
import * as fs from "fs";

describe("Facade D3", function () {

	let facade: InsightFacade;
	let server: Server;

	use(chaiHttp);

	before(function () {
		facade = new InsightFacade();
		server = new Server(4321);
		// TODO: start server here once and handle errors properly
		server.start();
	});

	after(function () {
		// TODO: stop server here once!
		server.stop();
	});

	beforeEach(function () {
		// might want to add some process logging here to keep track of what"s going on
	});

	afterEach(function () {
		// might want to add some process logging here to keep track of what"s going on
	});

	// Sample on how to format PUT requests

	it("PUT test for courses dataset", function () {
		try {
			return chai.request("http://localhost:4321")
				.put("/dataset/courses/courses")
				.send("./src/archives/courses.zip")
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: ChaiHttp.Response) {
					console.log(res);
					expect(res.status).to.be.equal(200);
				})
				.catch(function (err) {
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			console.log(err);
		}
	});


	// it("PUT test for courses dataset", function () {
	// 	try {
	// 		return chai.request(SERVER_URL)
	// 			.put(ENDPOINT_URL)
	// 			.send(ZIP_FILE_DATA)
	// 			.set("Content-Type", "application/x-zip-compressed")
	// 			.then(function (res: ChaiHttp.Response) {
	// 				console.log(res);
	// 				expect(res.status).to.be.equal(200);
	// 			})
	// 			.catch(function (err) {
	// 				console.log(err);
	// 				expect.fail();
	// 			});
	// 	} catch (err) {
	// 		console.log(err);
	// 	}
	// });


	// The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
