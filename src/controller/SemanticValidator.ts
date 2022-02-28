import {InsightError} from "./IInsightFacade";
import {AST, QueryObject} from "./QueryValidatorInterfaces";

function validateSemantics(datasets: string[], inputQuery: QueryObject, queryAST: AST, regexKey: RegExp,
	regexMKey: RegExp): string {
	checkColumnKeys(inputQuery);
	checkOrderKeys(inputQuery);
	return checkDataset(datasets, queryAST, regexKey, regexMKey);
}

function checkColumnKeys (inputQuery: QueryObject) {
	let applyKeys: Set<string> = new Set<string>();
	// Check if GROUP exists and that all COLUMN terms correspond to GROUP key or applykeys
	if (inputQuery.TRANSFORMATIONS !== undefined
		&& Object.keys(inputQuery.TRANSFORMATIONS).includes("GROUP")) {
		for (const x in inputQuery.TRANSFORMATIONS.APPLY) {
			if (applyKeys.has(Object.keys(inputQuery.TRANSFORMATIONS.APPLY[x])[0])) {
				throw new InsightError("applykey must be unique for each APPLYRULE.");
			}
			applyKeys.add(Object.keys(inputQuery.TRANSFORMATIONS.APPLY[x])[0]);
		}
		// Check all Column keys against GROUP and APPLY keys
		for (const x in inputQuery.OPTIONS.COLUMNS) {
			if (!(inputQuery.TRANSFORMATIONS.GROUP.includes(inputQuery.OPTIONS.COLUMNS[x]))
				&& !(applyKeys.has(inputQuery.OPTIONS.COLUMNS[x]))){
				throw new InsightError("COLUMN keys must be found in GROUP or APPLY keys.");
			}
		}
	}
}

function checkOrderKeys(inputQuery: QueryObject){
	// Check if ORDER exists and if order keys occurs in COLUMNS
	if (inputQuery.OPTIONS.ORDER !== undefined) {
		if (typeof inputQuery.OPTIONS.ORDER === "string") {
			if (!inputQuery.OPTIONS.COLUMNS.includes(inputQuery.OPTIONS.ORDER)) {
				throw new InsightError("ORDER key must be in COLUMNS");
			}
		} else {
			for (const x in inputQuery.OPTIONS.ORDER.keys) {
				if (!inputQuery.OPTIONS.COLUMNS.includes(inputQuery.OPTIONS.ORDER.keys[x])) {
					throw new InsightError("ORDER key must be in COLUMNS");
				}
			}
		}
	}
}

function checkDataset(datasets: string[], queryAST: AST, regexKey: RegExp, regexMKey: RegExp): string{
	// check all queries reference same dataset DFS and verify MAX/MIN/AVG/SUM only numeric
	let todo: AST[] = [queryAST.children[0],queryAST.children[1]];
	if (queryAST.children.length === 3) {
		todo.push(queryAST.children[2]);
	}
	let astNode: AST;
	let queryDataset = "";
	while (todo.length !== 0) {
		astNode = todo.shift() as AST;
		if (astNode.type === "KEY" || astNode.type === "MKEY" || astNode.type === "SKEY"
			|| (astNode.type === "ANYKEY" && regexKey.test(astNode.value as string))) {
			if (queryDataset === "") {
				queryDataset = (astNode.value as string).split("_")[0];
			} else {
				if (queryDataset !== (astNode.value as string).split("_")[0]) {
					throw new InsightError("Query cannot reference multiple datasets");
				}
			}
		} else if (astNode.type === "MAX" || astNode.type === "MIN" || astNode.type === "AVG"
			|| astNode.type === "SUM"){
			if (!regexMKey.test(astNode.value as string)) {
				throw new InsightError("MAX, MIN, AVG, SUM should only be applied to numeric fields.");
			}
		}
		astNode.children.forEach((value) => todo.unshift(value));
	}
	// check if dataset exists
	if (!datasets.includes(queryDataset)) {
		throw new InsightError("dataset " + queryDataset + " does not exist");
	}
	return queryDataset;
}

export {validateSemantics};
