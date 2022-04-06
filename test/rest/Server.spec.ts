import Server from "../../src/rest/Server";
import InsightFacade from "../../src/controller/InsightFacade";
import chai, {expect, use} from "chai";
import chaiHttp from "chai-http";

import * as fs from "fs-extra";

describe("Facade D3", function () {

	let facade: InsightFacade;
	let server: Server;
	const persistDir = "./data/";

	this.timeout(10000);

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
		fs.removeSync(persistDir);
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
				.put("/dataset/courseTest/courses")
				.send(fs.readFileSync("./test/resources/archives/courses.zip"))
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
			expect.fail();
		}
	});

	it("PUT test for rooms dataset", function () {
		try {
			return chai.request("http://localhost:4321")
				.put("/dataset/roomTest/rooms")
				.send(fs.readFileSync("./test/resources/archives/rooms.zip"))
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
			expect.fail();
		}
	});

	it("PUT test for courses claiming to be rooms dataset", function () {
		try {
			return chai.request("http://localhost:4321")
				.put("/dataset/fakeRooms/rooms")
				.send(fs.readFileSync("./test/resources/archives/courses.zip"))
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: ChaiHttp.Response) {
					console.log(res);
					expect(res.status).to.be.equal(400);
				})
				.catch(function (err) {
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			console.log(err);
			expect.fail();
		}
	});

	it("PUT test for rooms claiming to be courses dataset", function () {
		try {
			return chai.request("http://localhost:4321")
				.put("/dataset/fakeRooms/courses")
				.send(fs.readFileSync("./test/resources/archives/rooms.zip"))
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: ChaiHttp.Response) {
					console.log(res);
					expect(res.status).to.be.equal(400);
				})
				.catch(function (err) {
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			console.log(err);
			expect.fail();
		}
	});

	it("PUT test for non-zip dataset", function () {
		try {
			return chai.request("http://localhost:4321")
				.put("/dataset/fakeRooms/courses")
				.send(fs.readFileSync("./test/resources/archives/invalid_extension.7z"))
				.set("Content-Type", "application/x-zip-compressed")
				.then(function (res: ChaiHttp.Response) {
					console.log(res);
					expect(res.status).to.be.equal(400);
				})
				.catch(function (err) {
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			console.log(err);
			expect.fail();
		}
	});

	it("PUT test for wrong content-type", function () {
		try {
			return chai.request("http://localhost:4321")
				.put("/dataset/fakeRooms/courses")
				.send(fs.readFileSync("./test/resources/archives/rooms.zip"))
				.set("Content-Type", "application/json")
				.then(function (res: ChaiHttp.Response) {
					console.log(res);
					expect(res.status).to.be.equal(413);
				})
				.catch(function (err) {
					console.log(err);
					expect.fail();
				});
		} catch (err) {
			console.log(err);
			expect.fail();
		}
	});

	// The other endpoints work similarly. You should be able to find all instructions at the chai-http documentation
});
