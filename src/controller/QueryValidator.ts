import {InsightError, InsightResult} from "./IInsightFacade";
import {
	ANDFilter, AST, Comparator, EQFilter, GTFilter, ISFilter, LTFilter, NOTFilter, ORFilter,
	QueryFilter, QueryObject, QueryOptions
} from "./QueryValidatorInterfaces";

/**
 * Helper class to validate incoming queries.  Handles EBNF and semantic checks.
 */

export default class QueryValidator {

	private inputQuery: QueryObject;
	private queryAST: AST;
	private queryDataset: string;
	private regexColumnKey: RegExp = /[^_]+_(avg|pass|fail|audit|year|dept|id|instructor|title|uuid)$/;
	private regexMKey: RegExp = /[^_]+_(avg|pass|fail|audit|year)$/;
	private regexSKey: RegExp = /[^_]+_(dept|id|instructor|title|uuid)$/;
	private regexFilter: RegExp = /^(AND|OR|LT|GT|EQ|IS|NOT)$/;
	private regexSInput: RegExp = /^\*?\w*(,?\s*\w*)*\*?$/;

	constructor(query: object) {
		this.inputQuery = query as QueryObject;
		this.queryAST = new AST("QUERY", "");
		this.queryDataset = "";
	}

	// Check validEBNF of query object and build AST
	public validateEBNF(): AST {
		this.checkQUERY();

		// Add WHERE and OPTIONS to AST
		let whereAST = new AST("WHERE","");
		let optionsAST = new AST("OPTIONS", "");
		this.queryAST.children.push(whereAST);
		this.queryAST.children.push(optionsAST);

		// If WHERE:{} no need to check Filters
		if (Object.keys(this.inputQuery["WHERE"]).length !== 0) {
			this.checkFILTER(this.inputQuery["WHERE"], whereAST);
		}
		this.checkOPTIONS(this.inputQuery["OPTIONS"], optionsAST);

		return this.queryAST;
	}

	// Check WHERE and OPTIONS exists and no extra parameters passed
	private checkQUERY() {
		if (Object.keys(this.inputQuery).length > 2) {
			throw new InsightError("Excess keys in query");
		} else if (!Object.keys(this.inputQuery).includes("WHERE")) {
			throw new InsightError("Missing WHERE in query");
		} else if (!Object.keys(this.inputQuery).includes("OPTIONS")) {
			throw new InsightError("Missing OPTIONS in query");
		}
	}

	// Check valid filters recursively
	private checkFILTER(queryFilter: QueryFilter, parent: AST) {
		// Each Filter should only have one filter parameter
		if (Object.keys(queryFilter).length !== 1
			|| !this.regexFilter.test(Object.keys(queryFilter)[0])) {
			throw new InsightError("Invalid FILTER");
		}
		switch (Object.keys(queryFilter)[0]) {
			case "AND": {
				this.checkAND(queryFilter as ANDFilter, parent);
				break;
			}
			case "OR": {
				this.checkOR(queryFilter as ORFilter, parent);
				break;
			}
			case "LT": {
				this.checkLT(queryFilter as LTFilter, parent);
				break;
			}
			case "GT": {
				this.checkGT(queryFilter as GTFilter, parent);
				break;
			}
			case "EQ": {
				this.checkEQ(queryFilter as EQFilter, parent);
				break;
			}
			case "IS": {
				this.checkIS(queryFilter as ISFilter, parent);
				break;
			}
			case "NOT": {
				this.checkNOT(queryFilter as NOTFilter, parent);
				break;
			}
			default: {
				throw new InsightError("Invalid FILTER");
			}
		}
	}

	private checkAND(andFilter: ANDFilter, parent: AST) {
		// check AND is Array of non-zero length
		if (!(andFilter["AND"] instanceof Array)
			|| Object.keys(andFilter["AND"]).length < 1) {
			throw new InsightError("AND keys must be contained in non-zero Array");
		}

		// Add AND to AST
		let andAST = new AST("LOGIC", "AND");
		parent.children.push(andAST);

		// iterate through each AND key
		for (const x in andFilter["AND"]) {
			let newFilter = andFilter["AND"][x];
			this.checkFILTER(newFilter, andAST);
		}
	}

	private checkOR(orFilter: ORFilter, parent: AST) {
		// check OR is Array of non-zero length
		if (!(orFilter["OR"] instanceof Array)
			|| Object.keys(orFilter["OR"]).length < 1) {
			throw new InsightError("OR keys must be contained in non-zero Array");
		}

		// add OR to AST
		let orAST = new AST("LOGIC", "OR");
		parent.children.push(orAST);

		// iterate through each OR key
		for (const x in orFilter["OR"]) {
			let newFilter = orFilter["OR"][x];
			this.checkFILTER(newFilter, orAST);
		}
	}

	private checkLT(ltFilter: LTFilter, parent: AST) {
		// add LT to AST
		let ltAST = new AST("MCOMP", "LT");
		parent.children.push(ltAST);

		// check if LT has mKey and value
		let comparator: Comparator = ltFilter["LT"];
		this.checkMComparator(comparator, ltAST);
	}

	private checkGT(gtFilter: GTFilter, parent: AST) {
		// add GT to AST
		let gtAST = new AST("MCOMP", "GT");
		parent.children.push(gtAST);

		// check if GT has mKey and value
		let comparator: Comparator = gtFilter["GT"];
		this.checkMComparator(comparator, gtAST);
	}

	private checkEQ(eqFilter: EQFilter, parent: AST) {
		// add EQ to AST
		let eqAST = new AST("MCOMP", "EQ");
		parent.children.push(eqAST);

		// check if EQ has mKey and value
		const comparator: Comparator = eqFilter["EQ"];
		this.checkMComparator(comparator, eqAST);
	}

	// checks MCOMPARATOR for valid mKey and value
	private checkMComparator(mComparator: Comparator, parent: AST) {
		if (Object.keys(mComparator).length !== 1) {
			throw new InsightError("Invalid MCOMPARISON FILTER");
		} else if (!(this.regexMKey.test(Object.keys(mComparator)[0]))
			|| (typeof Object.values(mComparator)[0] !== "number")) {
			throw new InsightError("MCOMPARISON FILTER requires numerical field and numeric value");
		}

		// add MCOMP key/value to AST
		let mkeyAST = new AST("MKEY", Object.keys(mComparator)[0]);
		parent.children.push(mkeyAST);
		let mvalAST = new AST("MVAL", Object.values(mComparator)[0]);
		parent.children.push(mvalAST);
	}

	private checkIS(isFilter: ISFilter, parent: AST) {
		// check if IS has sKey and value
		let comparator: Comparator = isFilter["IS"];
		if (Object.keys(comparator).length !== 1) {
			throw new InsightError("Invalid IS FILTER");
		} else if (!(this.regexSKey.test(Object.keys(comparator)[0]))
			|| (typeof Object.values(comparator)[0] !== "string")
			|| !(this.regexSInput.test(Object.values(comparator)[0] as string))) {
			throw new InsightError("IS FILTER requires alphanumeric field and string value of form *input*");
		}

		// add IS to AST
		let isAST = new AST("SCOMP", "IS");
		parent.children.push(isAST);
		// add SCOMP key/value to AST
		let skeyAST = new AST("SKEY", Object.keys(comparator)[0]);
		isAST.children.push(skeyAST);
		if (Object.values(comparator)[0] as string ) {
			// REGEXP Check for *
			let matchString: string = (Object.values(comparator)[0] as string).replaceAll("*",".*");
			let svalAST = new AST("SVAL", new RegExp(matchString));
			isAST.children.push(svalAST);
		}
	}

	private checkNOT(notFilter: NOTFilter, parent: AST) {
		// add NOT to AST
		let notAST = new AST("NEG", "NOT");
		parent.children.push(notAST);

		this.checkFILTER(notFilter["NOT"], notAST);
	}

	// Check for valid COLUMNS and ORDER
	private checkOPTIONS(queryOptions: QueryOptions, parent: AST) {
		if (!Object.keys(queryOptions).includes("COLUMNS")) {
			throw new InsightError("Missing COLUMNS in OPTIONS");
		} else if ((!Object.keys(queryOptions).includes("ORDER") && Object.keys(queryOptions).length > 1)
					|| Object.keys(queryOptions).length > 2) {
			throw new InsightError("Invalid keys in OPTIONS");
		}
		// check COLUMNS is array
		if (!(queryOptions["COLUMNS"] instanceof Array)) {
			throw new InsightError("COLUMNS keys must be contained in an Array");
		}

		// add COLUMNS to AST
		let colAST = new AST("COLUMNS", "");
		parent.children.push(colAST);

		// check at least one column key, and column keys of type string with correct format
		let queryColumns: string[] = queryOptions["COLUMNS"];
		if (queryColumns.length === 0) {
			throw new InsightError("COLUMNS must contain at least one key");
		} else {
			let colkeyAST;
			for (const x in queryColumns) {
				if (typeof queryColumns[x] !== "string") {
					throw new InsightError("COLUMN keys must be of type string");
				} else if (!this.regexColumnKey.test(queryColumns[x])) {
					throw new InsightError("COLUMN keys must be of type: 'idstring_field'\"");
				}
				// add column key to AST
				colkeyAST = new AST("KEY", queryColumns[x]);
				colAST.children.push(colkeyAST);
			}
		}

		// Check ORDER key is string with correct format (if applicable)
		if (Object.keys(queryOptions).includes("ORDER")) {
			if (!this.regexColumnKey.test(queryOptions["ORDER"])) {
				throw new InsightError("ORDER key must be of type: 'idstring_field'");
			}

			// add ORDER to AST
			let orderAST = new AST("ORDER", "");
			parent.children.push(orderAST);
			let ordkeyAST = new AST("KEY", queryOptions["ORDER"]);
			orderAST.children.push(ordkeyAST);
		}
	}

	public validateSemantics(datasets: string[]) {
		// Check if ORDER exists and if it occurs in COLUMNS
		if (Object.keys(this.inputQuery.OPTIONS).includes("ORDER")) {
			if (!this.inputQuery.OPTIONS.COLUMNS.includes(this.inputQuery.OPTIONS.ORDER)) {
				throw new InsightError("ORDER key must be in COLUMNS");
			}
		}
		// check all queries reference same dataset DFS
		let todo: AST[] = [this.queryAST.children[0],this.queryAST.children[1]];
		let astNode: AST;
		while (todo.length !== 0) {
			astNode = todo.shift() as AST;
			if (astNode.type === "KEY" || astNode.type === "MKEY" || astNode.type === "SKEY") {
				if (this.queryDataset === "") {
					this.queryDataset = (astNode.value as string).split("_")[0];
				} else {
					if (this.queryDataset !== (astNode.value as string).split("_")[0]) {
						throw new InsightError("Query cannot reference multiple datasets");
					}
				}
			}
			astNode.children.forEach((value) => todo.unshift(value));
		}

		// check if dataset exists
		if (!datasets.includes(this.queryDataset)) {
			throw new InsightError("dataset " + this.queryDataset + " does not exist");
		}
	}
}
