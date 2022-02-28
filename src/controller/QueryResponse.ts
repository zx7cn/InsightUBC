import {InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";
import {AST} from "./QueryValidatorInterfaces";
import Decimal from "decimal.js";

function buildResponse(inputAST: AST, queryDataset: string, datasets: Map<string, InsightResult[]>): InsightResult[] {
	let searchSet = datasets.get(queryDataset);
	if (searchSet === undefined) {
		throw new InsightError("dataset " + queryDataset + " does not exist");
	}

	let matchingSections = searchSet;
	// Find matching sections using preorder traversal across WHERE branch
	if (inputAST.children[0].children.length !== 0) {
		matchingSections = findMatchingSet(inputAST.children[0], searchSet);
	}

	// If TRANSFORMATION exists, GROUP using Map with combined key, and value as list of matches
	if (inputAST.children.length === 3) {
		matchingSections = applyGroupTransform(inputAST, matchingSections);
	}

	// Check if too many results and throw error
	if (matchingSections.length > 5000) {
		throw new ResultTooLargeError("More than 5000 results found. Try to narrow your search.");
	}

	// Update summary to reflect COLUMNS/GROUP/APPLY keys
	let returnSet: InsightResult[] = [];
	const columns: AST = inputAST.children[1].children[0];
	// Build InsightResult[] from matchingSections and Columns of interest, sorted based on Order
	for (const section in matchingSections) {
		let returnObject: InsightResult = {};
		for (const x in columns.children) {
			let colKey = columns.children[x].value as string;
			let sectKey: string = (colKey.includes("_")) ? colKey.split("_")[1] : colKey;
			returnObject[colKey] = matchingSections[section][sectKey];
		}
		returnSet.push(returnObject);
	}

	// Check for ORDER Key *** children length is placeholder - find more robust ID for ORDER
	if (inputAST.children[1].children.length === 2) {
		// const orderKey = inputAST.children[1].children[1].children[0].value as string;
		let orderKeys: string[] = [];
		let sortKeysAST: AST[] = inputAST.children[1].children[1].children;
		let dir: string = "UP";
		if (sortKeysAST[0].type === "DIRECTION") {
			dir = sortKeysAST[0].value as string;
			sortKeysAST = sortKeysAST[0].children;
		}
		for (const x in sortKeysAST) {
			orderKeys.push(sortKeysAST[x].value as string);
		}
		returnSet.sort(sortSections(orderKeys, dir));
	}

	console.log(returnSet);

	return returnSet;
}
// comparison function wrapper for sorting CourseSection in ascending order based on ORDER key
function sortSections(orderKeys: string[], dir: string): (a: InsightResult, b: InsightResult) => number {
	return function sortComparator(a: InsightResult, b: InsightResult): number {
		for (const key in orderKeys) {
			if (a[orderKeys[key]] < b[orderKeys[key]]) {
				return (dir === "UP") ? -1 : 1;
			} else if (a[orderKeys[key]] > b[orderKeys[key]]) {
				return (dir === "UP") ? 1 : -1;
			}
		}
		return 0;
	};
}

// Works through dataset and returns list of course sections satisfying the query filters
function findMatchingSet(inputAST: AST, searchSet: InsightResult[], notFlag: boolean = false): InsightResult[] {
	let matchingSection: InsightResult[] = [];
	if (inputAST.type === "LOGIC") {
		// AND case covers AND and NOT(OR)     ~(A v B) = ~A ^ ~B
		if ((inputAST.value === "AND" && !notFlag) || (inputAST.value === "OR" && notFlag)) {
			// AND needs to update searchSet between children to find union of comparators
			matchingSection = searchSet;
			inputAST.children.forEach((value) => {
				matchingSection = findMatchingSet(value, matchingSection, notFlag);
			});
		} else {
			// OR case covers OR and NOT(AND)     ~(A ^ B) = ~A v ~B
			// OR needs to combine all matches across children, without duplicate.
			inputAST.children.forEach((value) => {
				matchingSection = matchingSection.concat(findMatchingSet(value, searchSet, notFlag));
			});
			matchingSection = Array.from(new Set(matchingSection));
		}
	} else if (inputAST.type === "MCOMP" || inputAST.type === "SCOMP") {
		let key = (inputAST.children[0].value as string).split("_")[1];
		let val = inputAST.children[1].value;
		searchSet.forEach((value) => {
			if (inputAST.value === "LT" && !notFlag && (value[key]) < val) {
				matchingSection.push(value);
			} else if (inputAST.value === "LT" && notFlag && (value[key]) >= val) {
				matchingSection.push(value);
			} else if (inputAST.value === "GT" && !notFlag && (value[key]) > val) {
				matchingSection.push(value);
			} else if (inputAST.value === "GT" && notFlag && (value[key]) <= val) {
				matchingSection.push(value);
			} else if (inputAST.value === "EQ" && !notFlag && value[key] === val) {
				matchingSection.push(value);
			} else if (inputAST.value === "EQ" && notFlag && value[key] !== val) {
				matchingSection.push(value);
			} else if (inputAST.value === "IS" && !notFlag && (val as RegExp).test(value[key] as string)) {
				matchingSection.push(value);
			} else if (inputAST.value === "IS" && notFlag && !(val as RegExp).test(value[key] as string)) {
				matchingSection.push(value);
			}
		});
	} else if (inputAST.type === "NEG") {
		matchingSection = findMatchingSet(inputAST.children[0], searchSet, !notFlag);
	} else {
		for (const x in inputAST.children) {
			matchingSection = matchingSection.concat(findMatchingSet(inputAST.children[x], searchSet, notFlag));
		}
	}
	return matchingSection;
}

function applyGroupTransform(inputAST: AST, matchingSections: InsightResult[]): InsightResult[] {
	// QUERY[2]->TRANSFORMATIONS[0]->GROUP
	let groupAST: AST = inputAST.children[2].children[0];
	let groupKeys: string[] = [];
	for (const x in groupAST.children) {
		groupKeys.push((groupAST.children[x].value as string).split("_")[1]);
	}
	// let groupMap: Map<InsightResult, Set<InsightResult>> = new Map<InsightResult, Set<InsightResult>>();
	let groupMap: Map<string, Set<InsightResult>> = new Map<string, Set<InsightResult>>();
	matchingSections.forEach((value) => {
		let mapKey: string = "";
		// let mapKey: InsightResult = {};
		for (const x in groupKeys) {
			mapKey += value[groupKeys[x]];
			// mapKey[groupKeys[x]] = value[groupKeys[x]];
		}
		let existingSet = groupMap.get(mapKey);
		if (existingSet === undefined) {
			existingSet = new Set<InsightResult>();
			groupMap.set(mapKey, existingSet);
		}
		existingSet.add(value);
	});

	// create transformed entry from each map value?
	matchingSections = [];
	let applyRules: AST[] = inputAST.children[2].children[1].children;
	groupMap.forEach((groupSet) => {
		let groupResult: InsightResult = {};
		for (const transform in applyRules) {
			let applyKey = applyRules[transform].value as string;
			let applyToken = applyRules[transform].children[0].type;
			let keyField = (applyRules[transform].children[0].value as string).split("_")[1];
			for (const x in groupKeys) {
				groupResult[groupKeys[x]] = [...groupSet][0][groupKeys[x]];
			}
			groupResult[applyKey] = applyTokenTransform(groupSet, applyToken, keyField);
		}
		matchingSections.push(groupResult);
	});
	return matchingSections;
}

function applyTokenTransform(groupSet: Set<InsightResult>, applyToken: string, keyField: string): number {
	let result: number;
	if (applyToken === "MAX") {
		result = -Infinity;
		groupSet.forEach((group) => {
			if (group[keyField] as number > result) {
				result = group[keyField] as number;
			}
		});
	} else if (applyToken === "MIN") {
		result = Infinity;
		groupSet.forEach((group) => {
			if ((group[keyField] as number) < result) {
				result = group[keyField] as number;
			}
		});
	} else if (applyToken === "AVG") {
		let total = new Decimal(0);
		groupSet.forEach((group) => {
			total = total.add(new Decimal(group[keyField]));
		});
		result = Number((total.toNumber() / groupSet.size).toFixed(2));
	} else if (applyToken === "COUNT") {
		let unique: Set<string | number> = new Set<string | number>();
		groupSet.forEach((group) => {
			unique.add(group[keyField]);
		});
		result = unique.size;
	} else if (applyToken === "SUM") {
		result = 0;
		groupSet.forEach((group) => {
			result += group[keyField] as number;
		});
		result = Number(result.toFixed(2));
	} else {
		throw new InsightError("EBNF Validation failed to capture Invalid applyToken.");
	}
	return result;
}

export {buildResponse};
