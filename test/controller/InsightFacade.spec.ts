import {
	InsightDatasetKind,
	InsightError,
	InsightResult, NotFoundError,
	ResultTooLargeError
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";

import * as fs from "fs-extra";

import {folderTest} from "@ubccpsc310/folder-test";
import chai, {expect} from "chai";
import chaiAsPromised from "chai-as-promised";

chai.use(chaiAsPromised);

describe("InsightFacade", function () {
	let insightFacade: InsightFacade;

	const persistDir = "./data";
	const datasetContents = new Map<string, string>();

	// Reference any datasets you've added to test/resources/archives here and they will
	// automatically be loaded in the 'before' hook.
	const datasetsToLoad: {[key: string]: string} = {
		courses: "./test/resources/archives/courses.zip",
		validOneOne: "./test/resources/archives/single_single_valid.zip",
		validOneMany: "./test/resources/archives/single_multi_valid.zip",
		validManyOne: "./test/resources/archives/multi_single_valid.zip",
		validManyMany: "./test/resources/archives/multi_multi_valid.zip",
		invalidDirectory: "./test/resources/archives/invalid_directory.zip",
		invalidExtension: "./test/resources/archives/invalid_extension.7z",
		invalidFormat: "./test/resources/archives/invalid_format.zip",
		invalidNoCourses: "./test/resources/archives/invalid_no_courses.zip",
		invalidNoSections: "./test/resources/archives/invalid_no_sections.zip",
		sm: "./test/resources/archives/single_multi_valid.zip",
		ss: "./test/resources/archives/single_single_valid.zip",
		rooms: "./test/resources/archives/rooms.zip"
	};

	before(function () {
		// This section runs once and loads all datasets specified in the datasetsToLoad object
		for (const key of Object.keys(datasetsToLoad)) {
			const content = fs.readFileSync(datasetsToLoad[key]).toString("base64");
			datasetContents.set(key, content);
		}
		// Just in case there is anything hanging around from a previous run
		fs.removeSync(persistDir);
	});

	describe("Add/Remove/List Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			insightFacade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent from the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			fs.removeSync(persistDir);
		});

		// This is a unit test. You should create more like this!
		it("Should add a valid dataset", function () {
			const id: string = "courses";
			const content: string = datasetContents.get("courses") ?? "";
			const expected: string[] = [id];
			return insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then((result: string[]) => {
				expect(result).to.deep.equal(expected);
			});
		});
		it("Should add a valid dataset2", function () {
			const id: string = "courses2";
			const content: string = datasetContents.get("sm") ?? "";
			const expected: string[] = [id];
			return insightFacade.addDataset(id, content, InsightDatasetKind.Courses).then((result: string[]) => {
				expect(result).to.deep.equal(expected);
			});
		});

		it("should add a valid room dataset", function() {
			const id: string = "rooms";
			const content: string = datasetContents.get("rooms") ?? "";
			const expected: string[] = [id];
			return insightFacade.addDataset(id, content, InsightDatasetKind.Rooms).then((result: string[]) => {
				expect(result).to.deep.equal(expected);
			});
		});


		it("Should add multiple valid dataset2", function () {
			const id1: string = "courses2";
			const id2: string = "courses";
			const content1: string = datasetContents.get("sm") ?? "";
			const content2: string = datasetContents.get("ss") ?? "";
			const expected: string[] = [id1,id2];
			return insightFacade.addDataset(id1, content1, InsightDatasetKind.Courses).then(()=>{
				return insightFacade.addDataset(id2, content2, InsightDatasetKind.Courses);
			})
				.then((result: string[])=> {
					expect(result).to.deep.equal(expected);
				});
		});

		it("should contain at least one course with at least one section", function() {
			let content: string = datasetContents.get("validOneOne") ?? "";
			return insightFacade.addDataset("single-single", content, InsightDatasetKind.Courses)
				.then((addedIds) => {
					expect(addedIds).to.be.an.instanceof(Array);
					expect(addedIds).to.have.length(1);
					expect(addedIds.includes("single-single"));
				});

			content = datasetContents.get("validOneMany") ?? "";
			return insightFacade.addDataset("single-multi", content, InsightDatasetKind.Courses)
				.then((addedIds) => {
					expect(addedIds).to.be.an.instanceof(Array);
					expect(addedIds).to.have.length(2);
					expect(addedIds.includes("single-multi"));
				});

			content = datasetContents.get("validManyOne") ?? "";
			return insightFacade.addDataset("multi-1", content, InsightDatasetKind.Courses)
				.then((addedIds) => {
					expect(addedIds).to.be.an.instanceof(Array);
					expect(addedIds).to.have.length(3);
					expect(addedIds.includes("multi-1"));
				});

			content = datasetContents.get("validManyMany") ?? "";
			return insightFacade.addDataset("multi-2", content, InsightDatasetKind.Courses)
				.then((addedIds) => {
					expect(addedIds).to.be.an.instanceof(Array);
					expect(addedIds).to.have.length(4);
					expect(addedIds.includes("multi-2"));
				});
		});
		it("should reject if not a .zip file", function() {
			const content: string = datasetContents.get("invalidExtension") ?? "";
			return expect(insightFacade.addDataset("7z extension", content, InsightDatasetKind.Courses))
				.eventually.to.be.rejectedWith(InsightError);
		});

		it("should reject if not contain courses/", function () {
			const content: string = datasetContents.get("invalidDirectory") ?? "";
			return expect(insightFacade.addDataset("no courses/ dir", content, InsightDatasetKind.Courses))
				.eventually.to.be.rejectedWith(InsightError);
		});

		it("should reject non-JSON format", function () {
			const content: string = datasetContents.get("invalidFormat") ?? "";
			return expect(insightFacade.addDataset("not JSON form", content, InsightDatasetKind.Courses))
				.eventually.to.be.rejectedWith(InsightError);
		});

		it("should reject if only courses with zero sections", function () {
			const content: string = datasetContents.get("invalidNoSections") ?? "";
			return expect(insightFacade.addDataset("zero sections", content, InsightDatasetKind.Courses))
				.eventually.to.be.rejectedWith(InsightError);
		});

		it("should reject an invalid id", function () {
			const content: string = datasetContents.get("courses") ?? "";
			return expect(insightFacade.addDataset("no_underscores", content, InsightDatasetKind.Courses))
				.eventually.to.be.rejectedWith(InsightError);
			return expect(insightFacade.addDataset("   ", content, InsightDatasetKind.Courses))
				.eventually.to.be.rejectedWith(InsightError);
			return expect(insightFacade.addDataset("", content, InsightDatasetKind.Courses))
				.eventually.to.be.rejectedWith(InsightError);
		});

		it("should reject a duplicate id", function () {
			let content: string = datasetContents.get("validOneOne") ?? "";
			return insightFacade.addDataset("no duplicates", content, InsightDatasetKind.Courses)
				.then((addedIds) => {
					expect(addedIds).to.be.an.instanceof(Array);
					expect(addedIds).to.have.length(1);
					expect(addedIds.includes("no duplicates"));
				});
			content = datasetContents.get("courses") ?? "";
			return expect(insightFacade.addDataset("no duplicates", content, InsightDatasetKind.Courses))
				.eventually.to.be.rejectedWith(InsightError);
		});
		it("should remove the Dataset with and return the matching id", function() {
			const content: string = datasetContents.get("courses") ?? "";
			return insightFacade.addDataset("courses", content, InsightDatasetKind.Courses);
			return insightFacade.removeDataset("courses").then((removedId) => {
				expect(removedId).to.deep.equal("courses");
			});
			return insightFacade.listDatasets().then((insightDatasets) => {
				expect(insightDatasets).to.have.length(0);
			});
		});

		it("should reject removal of non-existent set with NotFoundError", function() {
			return expect(insightFacade.removeDataset("courses")).eventually.to.be.rejectedWith(NotFoundError);
		});

		it("should reject an invalid id with InsightError", function() {
			return expect(insightFacade.removeDataset("no_underscores")).eventually.to.be.rejectedWith(InsightError);
			return expect(insightFacade.removeDataset("      ")).eventually.to.be.rejectedWith(InsightError);
			return expect(insightFacade.removeDataset("")).eventually.to.be.rejectedWith(InsightError);
		});
		it("should list no datasets", function() {
			return insightFacade.listDatasets().then((insightDatasets) => {
				expect(insightDatasets).to.be.an.instanceof(Array);
				expect(insightDatasets).to.have.length(0);
			});
		});

		it("should list one dataset", function() {
			const content: string = datasetContents.get("courses") ?? "";
			return insightFacade.addDataset("courses", content, InsightDatasetKind.Courses)
				.then((addedIds) => insightFacade.listDatasets())
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal( [{
						id: "courses",
						kind: InsightDatasetKind.Courses,
						numRows: 64612,
					}]);
				});
		});

		it("should list one room dataset", function() {
			const content: string = datasetContents.get("rooms") ?? "";
			return insightFacade.addDataset("rooms", content, InsightDatasetKind.Rooms)
				.then((addedIds) => insightFacade.listDatasets())
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal( [{
						id: "rooms",
						kind: InsightDatasetKind.Rooms,
						numRows: 364,
					}]);
				});
		});

		it("should list one dataset2", function() {
			const content: string = datasetContents.get("sm") ?? "";
			return insightFacade.addDataset("sm", content, InsightDatasetKind.Courses)
				.then((addedIds) => insightFacade.listDatasets())
				.then((insightDatasets) => {
					expect(insightDatasets).to.deep.equal( [{
						id: "sm",
						kind: InsightDatasetKind.Courses,
						numRows: 8,
					}]);
				});
		});

		it("should list multiple datasets", function() {
			const content: string = datasetContents.get("courses") ?? "";
			return insightFacade.addDataset("courses", content, InsightDatasetKind.Courses)
				.then(() => {
					return insightFacade.addDataset("courses-2", content, InsightDatasetKind.Courses);
				})
				.then(() => {
					return insightFacade.listDatasets();
				})
				.then((insightDatasets) => {
					expect(insightDatasets).to.be.an.instanceof(Array);
					expect(insightDatasets).to.have.length(2);
					let insightDatasetCourses = insightDatasets.find((dataset) => dataset.id === "courses");
					expect(insightDatasetCourses).to.exist;
					expect(insightDatasetCourses).to.deep.equal({
						id: "courses",
						kind: InsightDatasetKind.Courses,
						numRows: 64612,
					});
					insightDatasetCourses = insightDatasets.find((dataset) => dataset.id === "courses-2");
					expect(insightDatasetCourses).to.exist;
					expect(insightDatasetCourses).to.deep.equal({
						id: "courses-2",
						kind: InsightDatasetKind.Courses,
						numRows: 64612,
					});
				});
		});
	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", () => {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);

			this.timeout(10000);

			insightFacade = new InsightFacade();

			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises = [
				insightFacade.addDataset("courses", datasetContents.get("courses") ?? "", InsightDatasetKind.Courses),
			];

			return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			fs.removeSync(persistDir);
		});

		type PQErrorKind = "ResultTooLargeError" | "InsightError";

		folderTest<unknown, Promise<InsightResult[]>, PQErrorKind>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => insightFacade.performQuery(input),
			"./test/resources/queries",
			{
				errorValidator: (error): error is PQErrorKind =>
					error === "ResultTooLargeError" || error === "InsightError",
				assertOnError(actual, expected) {
					if (expected === "ResultTooLargeError") {
						expect(actual).to.be.instanceof(ResultTooLargeError);
					} else {
						expect(actual).to.be.instanceof(InsightError);
					}
				},
				assertOnResult(actual, expected) {
					expect(actual).to.have.deep.members(expected);
				},
			}
		);
	});
});
