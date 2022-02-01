import chai, {expect} from "chai";
import chaiAsPromised from "chai-as-promised";
import InsightFacade from "../../../src/controller/InsightFacade";
import {
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    InsightResult,
    NotFoundError,
    ResultTooLargeError
} from "../../../src/controller/IInsightFacade";
import {clearDisk, getContentFromArchives} from "../TestUtil";
import {folderTest} from "@ubccpsc310/folder-test";


chai.use(chaiAsPromised);

type Input = unknown;
type Output = Promise<InsightResult[]>;
type Error = "InsightError" | "ResultTooLargeError";


describe("InsightFacade", function () {
    let courses: string;
    let newCourse: string;
    before(function () {
        courses = getContentFromArchives("courses.zip");
        newCourse = getContentFromArchives("courses1.zip");
    });

    describe("List Datasets", function () {

        let facade: IInsightFacade;

        beforeEach(function () {
            clearDisk();
            facade = new InsightFacade();
        });

        it("should list no datasets", function () {
            return facade.listDatasets().then((insightDatasets) => {
                expect(insightDatasets).to.deep.equal([]);
            });
        });

        it("should list one dataset", function () {
           return facade.addDataset("courses", courses, InsightDatasetKind.Courses)
               .then((addedIds) => {
                   return facade.listDatasets();
               })
               .then((insightDatasets)=> {
                    expect(insightDatasets).to.deep.equal([{
                        id: "courses",
                        kind: InsightDatasetKind.Courses,
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
            return facade.addDataset("courses", courses, InsightDatasetKind.Courses).then(() => {
                return facade.addDataset("courses-2", courses, InsightDatasetKind.Courses);
            }).then(() => {
                return facade.listDatasets();
            }).then((insightDatasets) => {
                const expectedDatasets: InsightDataset[] = [
                    {
                        id: "courses",
                        kind: InsightDatasetKind.Courses,
                        numRows:64612,
                    },
                    {
                        id: "courses-2",
                        kind: InsightDatasetKind.Courses,
                        numRows:64612,
                    }
                ];
                expect(insightDatasets).to.be.an.instanceof(Array);
                expect(insightDatasets).to.have.length(2);
                expect(insightDatasets).to.have.deep.members(expectedDatasets);
            })
        });
    })

    describe("Add Datasets", function () {
        let facade: IInsightFacade;

        beforeEach(function () {
            clearDisk();
            facade = new InsightFacade();
        });

        it("should add a valid dataset", function () {
            const courseAdded = facade.addDataset("courses1", newCourse, InsightDatasetKind.Courses)
                .then(() => facade.listDatasets());
            return expect(courseAdded).eventually.to.deep.equal([{
                id: "courses1",
                kind: InsightDatasetKind.Courses,
                numRows: 2,
            }]);
        });

        it("should fail to add a empty dataset", function () {
            const emptyCourse = getContentFromArchives("emptyCourses.zip");
            const courseAdded = facade.addDataset("empty", emptyCourse, InsightDatasetKind.Courses);
            return expect(courseAdded).eventually.to.be.rejectedWith(InsightError);
        });

        it("should fail to add a duplicated dataset", function () {
            const result = facade.addDataset("courses1", newCourse, InsightDatasetKind.Courses)
                .then(() => facade.addDataset("courses1", newCourse, InsightDatasetKind.Courses));
            return expect(result).eventually.to.be.rejectedWith(InsightError);
        });

        it("should fail to add a dataset that has no valid course section", function () {
            const noSectionCourse = getContentFromArchives("noValidSectionCourses.zip");
            const courseAdded = facade.addDataset("noValidSection", noSectionCourse, InsightDatasetKind.Courses);
            return expect(courseAdded).eventually.to.be.rejectedWith(InsightError);
        });

        it("should fail to add a dataset whose id contains only whitespace characters", function () {
            const courseAdded = facade.addDataset("  ", newCourse, InsightDatasetKind.Courses);
            return expect(courseAdded).eventually.to.be.rejectedWith(InsightError);
        });

        it("should add a dataset whose id contains whitespace characters and other characters", function () {
            const courseAdded = facade.addDataset("course s", newCourse, InsightDatasetKind.Courses)
                .then(() => facade.listDatasets());
            return expect(courseAdded).eventually.to.deep.equal([{
                id: "course s",
                kind: InsightDatasetKind.Courses,
                numRows: 2,
            }]);
        });

        it("should fail to add a dataset whose id contains an underscore", function () {
            const courseAdded = facade.addDataset("course_1", newCourse, InsightDatasetKind.Courses);
            return expect(courseAdded).eventually.to.be.rejectedWith(InsightError);
        });

        it("should fail to add a non-zip file", function () {
            const nonzip = getContentFromArchives("FIPR131");
            const courseAdded = facade.addDataset("non-zip", nonzip, InsightDatasetKind.Courses);
            return expect(courseAdded).eventually.to.be.rejectedWith(InsightError);
        })
    });

    describe("Remove Datasets", function () {
        let facade: IInsightFacade;

        beforeEach(function () {
            clearDisk();
            facade = new InsightFacade();
        });

        it("should remove a valid dataset", function () {
            const result = facade.addDataset("courses1", newCourse, InsightDatasetKind.Courses)
                .then(() => facade.removeDataset("courses1"))
                .then(() => facade.listDatasets());
            return expect(result).to.eventually.deep.equal([]);
        });

        it("should fail to remove a dataset that has not been added", async function () {
            const courseAdded = facade.addDataset("courses1", newCourse, InsightDatasetKind.Courses);
            try {
                await facade.removeDataset("courses2");
                expect.fail("should have rejected!");
            } catch(err) {
                expect(err).to.be.instanceof(NotFoundError);
            }
        });

        it("should fail to remove a dataset whose id contains only white space", function () {
            const result = facade.removeDataset("   ");
            return expect(result).eventually.to.be.rejectedWith(InsightError);
        });

        it("should fail to remove a dataset whose id contains underscores", function () {
            const result = facade.removeDataset("a_b_c");
            return expect(result).eventually.to.be.rejectedWith(InsightError);
        });
    });

    describe("Perform Query", function () {
        let facade: IInsightFacade;

        before(function () {
            clearDisk();
            facade = new InsightFacade();
            return facade.addDataset("courses", courses, InsightDatasetKind.Courses);
        });

        function assertError(actual: any, expected: Error): void {
            if (expected === "InsightError") {
                expect(actual).to.be.an.instanceOf(InsightError);
            } else {
                expect(actual).to.be.an.instanceOf(ResultTooLargeError);
            }
        }


        folderTest<Input, Output, Error>(
            "performQuery tests",
            (input: Input): Output => facade.performQuery(input),
            "./test/resources/queries",
            {
                errorValidator: (error): error is Error =>
                    error === "InsightError" || error === "ResultTooLargeError",
                assertOnError: assertError,
            }
        );
    });
});
