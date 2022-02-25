import {InsightError, InsightResult, ResultTooLargeError} from "./IInsightFacade";
import {AST} from "./QueryValidatorInterfaces";
import {CourseSection} from "./InsightFacade";

function buildResponse(inputAST: AST, datasets: Map<string, CourseSection[]>): InsightResult[] {
	// pull dataset of interest based on idstring in OPTIONS->COLUMNS
	const columns: AST = inputAST.children[1].children[0];
	const searchID: string = (columns.children[0].value as string).split("_")[0];
	const searchSet: CourseSection[] | undefined = datasets.get(searchID) as CourseSection[] | undefined;
	if (searchSet === undefined) {
		throw new InsightError("dataset " + searchID + " does not exist");
	}
	let matchingSections: CourseSection[];
	// Find matching sections using preorder traversal across WHERE branch
	if (inputAST.children[0].children.length !== 0) {
		matchingSections = findMatchingSet(inputAST.children[0], searchSet as CourseSection[]);
	} else {
		matchingSections = searchSet as CourseSection[];
	}

	// Check if too many results and throw error
	if (matchingSections.length > 5000) {
		throw new ResultTooLargeError("More than 5000 results found. Try to narrow your search.");
	}

	let returnSet: InsightResult[] = [];
	type ColumnKey = keyof typeof columns;
	type SectionKey = keyof CourseSection;
	// Build InsightResult[] from matchingSections and Columns of interest, sorted based on Order
	for (const section in matchingSections) {
		let returnObject: InsightResult = {};
		for (const x in columns.children) {
			let colKey: ColumnKey = columns.children[x].value as ColumnKey;
			let sectKey: SectionKey = (colKey as string).split("_")[1] as SectionKey;
			// let courseSection: CourseSection = searchSet.get(returnUUIDSet[uuid]) as CourseSection;
			let courseSection: CourseSection = matchingSections[section];
			returnObject[colKey] = courseSection[sectKey];
		}
		returnSet.push(returnObject);
	}

	// Check for ORDER Key *** children length is placeholder - find more robust ID for ORDER
	if (inputAST.children[1].children.length === 2) {
		const orderKey: string = inputAST.children[1].children[1].children[0].value as string;
		returnSet.sort(sortSections(orderKey));
	}

	console.log(returnSet);

	return returnSet;
}
// comparison function wrapper for sorting CourseSection in ascending order based on ORDER key
function sortSections(orderKey: string): (a: InsightResult, b: InsightResult) => number {
	return function sortComparator(a: InsightResult, b: InsightResult): number {
		type SectionKey = keyof InsightResult;
		let sortKey: SectionKey = orderKey as SectionKey;
		if (a[sortKey] < b[sortKey]) {
			return -1;
		} else if (a[sortKey] > b[sortKey]) {
			return 1;
		} else {
			return 0;
		}
	};
}

// Works through dataset and returns list of course sections satisfying the query filters
function findMatchingSet(inputAST: AST, searchSet: CourseSection[], notFlag: boolean = false): CourseSection[] {
	let matchingSection: CourseSection[] = [];
	if (inputAST.type === "LOGIC") {
		if (inputAST.value === "AND") {
			// AND needs to update searchSet between children to find union of comparators
			matchingSection = searchSet;
			inputAST.children.forEach((value) => {
				matchingSection = findMatchingSet(value, matchingSection, notFlag);
			});
		} else {
			// OR needs to combine all matches across children, without duplicate.
			inputAST.children.forEach((value) => {
				matchingSection = matchingSection.concat(findMatchingSet(value, searchSet, notFlag));
			});
			matchingSection = Array.from(new Set(matchingSection));
		}
	} else if (inputAST.type === "MCOMP" || inputAST.type === "SCOMP") {
		type SectionKey = keyof CourseSection;
		let key: SectionKey = (inputAST.children[0].value as string).split("_")[1] as keyof CourseSection;
		let val = inputAST.children[1].value;
		searchSet.forEach((value) => {
			if (inputAST.value === "LT" && !notFlag && value[key] < val) {
				matchingSection.push(value);
			} else if (inputAST.value === "LT" && notFlag && value[key] >= val) {
				matchingSection.push(value);
			} else if (inputAST.value === "GT" && !notFlag && value[key] > val) {
				matchingSection.push(value);
			} else if (inputAST.value === "GT" && notFlag && value[key] <= val) {
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

export {buildResponse};
