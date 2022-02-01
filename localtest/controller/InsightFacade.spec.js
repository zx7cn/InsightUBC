"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = __importStar(require("chai"));
const chai_as_promised_1 = __importDefault(require("chai-as-promised"));
const InsightFacade_1 = __importDefault(require("../../../src/controller/InsightFacade"));
const IInsightFacade_1 = require("../../../src/controller/IInsightFacade");
const TestUtil_1 = require("../TestUtil");
const folder_test_1 = require("@ubccpsc310/folder-test");
chai_1.default.use(chai_as_promised_1.default);
describe("InsightFacade", function () {
    let courses;
    let newCourse;
    before(function () {
        courses = (0, TestUtil_1.getContentFromArchives)("courses.zip");
        newCourse = (0, TestUtil_1.getContentFromArchives)("courses1.zip");
    });
    describe("List Datasets", function () {
        let facade;
        beforeEach(function () {
            (0, TestUtil_1.clearDisk)();
            facade = new InsightFacade_1.default();
        });
        it("should list no datasets", function () {
            return facade.listDatasets().then((insightDatasets) => {
                (0, chai_1.expect)(insightDatasets).to.deep.equal([]);
            });
        });
        it("should list one dataset", function () {
            return facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses)
                .then((addedIds) => {
                return facade.listDatasets();
            })
                .then((insightDatasets) => {
                (0, chai_1.expect)(insightDatasets).to.deep.equal([{
                        id: "courses",
                        kind: IInsightFacade_1.InsightDatasetKind.Courses,
                        numRows: 64612,
                    }]);
                // expect(insightDatasets).to.be.an.instanceof(Array);
                // expect(insightDatasets).to.have.length(1);
                // const [insightDataset] = insightDatasets;
                // expect(insightDataset).to.have.property("id");
                // expect(insightDataset).to.equal("courses");
            });
        });
        it("should list multiple datasets", function () {
            return facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses).then(() => {
                return facade.addDataset("courses-2", courses, IInsightFacade_1.InsightDatasetKind.Courses);
            }).then(() => {
                return facade.listDatasets();
            }).then((insightDatasets) => {
                const expectedDatasets = [
                    {
                        id: "courses",
                        kind: IInsightFacade_1.InsightDatasetKind.Courses,
                        numRows: 64612,
                    },
                    {
                        id: "courses-2",
                        kind: IInsightFacade_1.InsightDatasetKind.Courses,
                        numRows: 64612,
                    }
                ];
                (0, chai_1.expect)(insightDatasets).to.be.an.instanceof(Array);
                (0, chai_1.expect)(insightDatasets).to.have.length(2);
                (0, chai_1.expect)(insightDatasets).to.have.deep.members(expectedDatasets);
            });
        });
    });
    describe("Add Datasets", function () {
        let facade;
        beforeEach(function () {
            (0, TestUtil_1.clearDisk)();
            facade = new InsightFacade_1.default();
        });
        it("should add a valid dataset", function () {
            const courseAdded = facade.addDataset("courses1", newCourse, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => facade.listDatasets());
            return (0, chai_1.expect)(courseAdded).eventually.to.deep.equal([{
                    id: "courses1",
                    kind: IInsightFacade_1.InsightDatasetKind.Courses,
                    numRows: 2,
                }]);
        });
        it("should fail to add a empty dataset", function () {
            const emptyCourse = (0, TestUtil_1.getContentFromArchives)("emptyCourses.zip");
            const courseAdded = facade.addDataset("empty", emptyCourse, IInsightFacade_1.InsightDatasetKind.Courses);
            return (0, chai_1.expect)(courseAdded).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should fail to add a duplicated dataset", function () {
            const result = facade.addDataset("courses1", newCourse, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => facade.addDataset("courses1", newCourse, IInsightFacade_1.InsightDatasetKind.Courses));
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should fail to add a dataset that has no valid course section", function () {
            const noSectionCourse = (0, TestUtil_1.getContentFromArchives)("noValidSectionCourses.zip");
            const courseAdded = facade.addDataset("noValidSection", noSectionCourse, IInsightFacade_1.InsightDatasetKind.Courses);
            return (0, chai_1.expect)(courseAdded).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should fail to add a dataset whose id contains only whitespace characters", function () {
            const courseAdded = facade.addDataset("  ", newCourse, IInsightFacade_1.InsightDatasetKind.Courses);
            return (0, chai_1.expect)(courseAdded).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should add a dataset whose id contains whitespace characters and other characters", function () {
            const courseAdded = facade.addDataset("course s", newCourse, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => facade.listDatasets());
            return (0, chai_1.expect)(courseAdded).eventually.to.deep.equal([{
                    id: "course s",
                    kind: IInsightFacade_1.InsightDatasetKind.Courses,
                    numRows: 2,
                }]);
        });
        it("should fail to add a dataset whose id contains an underscore", function () {
            const courseAdded = facade.addDataset("course_1", newCourse, IInsightFacade_1.InsightDatasetKind.Courses);
            return (0, chai_1.expect)(courseAdded).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should fail to add a non-zip file", function () {
            const nonzip = (0, TestUtil_1.getContentFromArchives)("FIPR131");
            const courseAdded = facade.addDataset("non-zip", nonzip, IInsightFacade_1.InsightDatasetKind.Courses);
            return (0, chai_1.expect)(courseAdded).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
    });
    describe("Remove Datasets", function () {
        let facade;
        beforeEach(function () {
            (0, TestUtil_1.clearDisk)();
            facade = new InsightFacade_1.default();
        });
        it("should remove a valid dataset", function () {
            const result = facade.addDataset("courses1", newCourse, IInsightFacade_1.InsightDatasetKind.Courses)
                .then(() => facade.removeDataset("courses1"))
                .then(() => facade.listDatasets());
            return (0, chai_1.expect)(result).to.eventually.deep.equal([]);
        });
        it("should fail to remove a dataset that has not been added", async function () {
            const courseAdded = facade.addDataset("courses1", newCourse, IInsightFacade_1.InsightDatasetKind.Courses);
            try {
                await facade.removeDataset("courses2");
                chai_1.expect.fail("should have rejected!");
            }
            catch (err) {
                (0, chai_1.expect)(err).to.be.instanceof(IInsightFacade_1.NotFoundError);
            }
        });
        it("should fail to remove a dataset whose id contains only white space", function () {
            const result = facade.removeDataset("   ");
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
        it("should fail to remove a dataset whose id contains underscores", function () {
            const result = facade.removeDataset("a_b_c");
            return (0, chai_1.expect)(result).eventually.to.be.rejectedWith(IInsightFacade_1.InsightError);
        });
    });
    describe("Perform Query", function () {
        let facade;
        before(function () {
            (0, TestUtil_1.clearDisk)();
            facade = new InsightFacade_1.default();
            return facade.addDataset("courses", courses, IInsightFacade_1.InsightDatasetKind.Courses);
        });
        function assertError(actual, expected) {
            if (expected === "InsightError") {
                (0, chai_1.expect)(actual).to.be.an.instanceOf(IInsightFacade_1.InsightError);
            }
            else {
                (0, chai_1.expect)(actual).to.be.an.instanceOf(IInsightFacade_1.ResultTooLargeError);
            }
        }
        (0, folder_test_1.folderTest)("performQuery tests", (input) => facade.performQuery(input), "./test/resources/queries", {
            errorValidator: (error) => error === "InsightError" || error === "ResultTooLargeError",
            assertOnError: assertError,
        });
    });
});
