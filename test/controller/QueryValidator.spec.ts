/**
 * Unit Tests for ValidateEBNF class
 */

import {expect} from "chai";
import QueryValidator from "../../src/controller/QueryValidator";
import {InsightError} from "../../src/controller/IInsightFacade";

// TODO: When time permits, refactor Test suite to use testFolder

describe("ValidateEBNF", function () {
	let validator: QueryValidator;
	const simpleQuery = {
		WHERE: {GT: {courses_avg: 97}},
		OPTIONS: {COLUMNS: ["courses_dept", "courses_avg"],	ORDER: "courses_avg"}
	};
	const extraQueryKey = {
		BOB: "Great",
		WHERE: {GT: {courses_avg: 97}},
		OPTIONS: {COLUMNS: ["courses_dept", "courses_avg"],	ORDER: "courses_avg"}
	};
	const missingWHERE = {
		OPTIONS: {COLUMNS: ["courses_dept", "courses_avg"],	ORDER: "courses_avg"}
	};
	const missingOPTIONS = {
		WHERE: {GT: {courses_avg: 97}},
	};
	const missingCOLUMNS = {
		WHERE: {GT: {courses_avg: 97}},
		OPTIONS: {ORDER: "courses_avg"}
	};
	const complexQuery = {
		WHERE: {OR: [
			{AND: [{GT: {courses_avg: 90}},{IS: {courses_dept: "adhe"}}]},
			{EQ: {courses_avg: 95}}]
		},
		OPTIONS: {COLUMNS: ["courses_dept",	"courses_id", "courses_avg"], ORDER: "courses_avg"}
	};
	const badAND = {
		WHERE: {OR: [
			{AND: [{GT: {courses_avg: 90}},{courses_dept: "adhe"}]},
			{EQ: {courses_avg: 95}}]
		},
		OPTIONS: {COLUMNS: ["courses_dept",	"courses_id", "courses_avg"], ORDER: "courses_avg"}
	};
	const badOR = {
		WHERE: {OR: []
		},
		OPTIONS: {COLUMNS: ["courses_dept",	"courses_id", "courses_avg"], ORDER: "courses_avg"}
	};
	const badLT = {
		WHERE: {OR: [
			{AND: [{LT: {courses_avg: "90"}},{IS: {courses_dept: "adhe"}}]},
			{EQ: {courses_avg: 95}}]
		},
		OPTIONS: {COLUMNS: ["courses_dept",	"courses_id", "courses_avg"], ORDER: "courses_avg"}
	};
	const badGT = {
		WHERE: {OR: [
			{AND: [{GT: {avg: 90}},{IS: {courses_dept: "adhe"}}]},
			{EQ: {courses_avg: 95}}]
		},
		OPTIONS: {COLUMNS: ["courses_dept",	"courses_id", "courses_avg"], ORDER: "courses_avg"}
	};
	const badEQ = {
		WHERE: {OR: [
			{AND: [{GT: {courses_avg: 90}},{IS: {courses_dept: "adhe"}}]},
			{EQ: [{courses_avg: 95}, {courses_dept: "civl"}]}]
		},
		OPTIONS: {COLUMNS: ["courses_dept",	"courses_id", "courses_avg"], ORDER: "courses_avg"}
	};
	const badIS = {
		WHERE: {OR: [
			{AND: [{GT: {courses_avg: 90}},{IS: {courses_dept: "**sc"}}]},
			{EQ: {courses_avg: 95}}]
		},
		OPTIONS: {COLUMNS: ["courses_dept",	"courses_id", "courses_avg"], ORDER: "courses_avg"}
	};
	const badNOT = {
		WHERE: {OR: [
			{NOT: [{GT: {courses_avg: 90}},{IS: {courses_dept: "adhe"}}]},
			{EQ: {courses_avg: 95}}]
		},
		OPTIONS: {COLUMNS: ["courses_dept",	"courses_id", "courses_avg"], ORDER: "courses_avg"}
	};
	it("should validate a valid simple query", function () {
		try {
			validator = new QueryValidator(simpleQuery);
			validator.validateEBNF();
			validator.validateSemantics(["courses"]);
			expect(true).is.true;
		} catch (e) {
			expect.fail("InsightError not expected");
			console.log(e);
		}
	});

	it("should validate a valid complex query", function () {
		try {
			validator = new QueryValidator(complexQuery);
			validator.validateEBNF();
			expect(true).is.true;
		} catch (e) {
			expect.fail("InsightError not expected");
			console.log(e);
		}
	});

	it("should throw InsightError on invalid extra query key", function () {
		try {
			validator = new QueryValidator(extraQueryKey);
			validator.validateEBNF();
			expect.fail("InsightError expected");
		} catch (e) {
			expect(e).to.be.instanceof(InsightError);
			console.log(e);
		}
	});

	it("should throw InsightError when missing WHERE", function () {
		try {
			validator = new QueryValidator(missingWHERE);
			validator.validateEBNF();
			expect.fail("InsightError expected");
		} catch (e) {
			expect(e).to.be.instanceof(InsightError);
			console.log(e);
		}
	});

	it("should throw InsightError when missing OPTIONS", function () {
		try {
			validator = new QueryValidator(missingOPTIONS);
			validator.validateEBNF();
			expect.fail("InsightError expected");
		} catch (e) {
			expect(e).to.be.instanceof(InsightError);
			console.log(e);
		}
	});

	it("should throw InsightError when missing COLUMNS", function () {
		try {
			validator = new QueryValidator(missingCOLUMNS);
			validator.validateEBNF();
			expect.fail("InsightError expected");
		} catch (e) {
			expect(e).to.be.instanceof(InsightError);
			console.log(e);
		}
	});

	it("should throw InsightError when given bad AND FILTER", function () {
		try {
			validator = new QueryValidator(badAND);
			validator.validateEBNF();
			expect.fail("InsightError expected");
		} catch (e) {
			expect(e).to.be.instanceof(InsightError);
			console.log(e);
		}
	});

	it("should throw InsightError when given bad OR FILTER", function () {
		try {
			validator = new QueryValidator(badOR);
			validator.validateEBNF();
			expect.fail("InsightError expected");
		} catch (e) {
			expect(e).to.be.instanceof(InsightError);
			console.log(e);
		}
	});

	it("should throw InsightError when given bad LT FILTER", function () {
		try {
			validator = new QueryValidator(badLT);
			validator.validateEBNF();
			expect.fail("InsightError expected");
		} catch (e) {
			expect(e).to.be.instanceof(InsightError);
			console.log(e);
		}
	});

	it("should throw InsightError when given bad GT FILTER", function () {
		try {
			validator = new QueryValidator(badGT);
			validator.validateEBNF();
			expect.fail("InsightError expected");
		} catch (e) {
			expect(e).to.be.instanceof(InsightError);
			console.log(e);
		}
	});

	it("should throw InsightError when given bad EQ FILTER", function () {
		try {
			validator = new QueryValidator(badEQ);
			validator.validateEBNF();
			expect.fail("InsightError expected");
		} catch (e) {
			expect(e).to.be.instanceof(InsightError);
			console.log(e);
		}
	});

	it("should throw InsightError when given bad IS FILTER", function () {
		try {
			validator = new QueryValidator(badIS);
			validator.validateEBNF();
			expect.fail("InsightError expected");
		} catch (e) {
			expect(e).to.be.instanceof(InsightError);
			console.log(e);
		}
	});

	it("should throw InsightError when given bad NOT FILTER", function () {
		try {
			validator = new QueryValidator(badNOT);
			validator.validateEBNF();
			expect.fail("InsightError expected");
		} catch (e) {
			expect(e).to.be.instanceof(InsightError);
			console.log(e);
		}
	});
});
