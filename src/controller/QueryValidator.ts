import {InsightError} from "./IInsightFacade";
import {
	ApplyRule, AST, Comparator, QueryFilter, QueryObject, QueryOptions, QuerySort, QueryTransform
} from "./QueryValidatorInterfaces";
import {validateSemantics} from "./SemanticValidator";

/**
 * Class to validate incoming queries.  Handles EBNF and semantic checks.
 * Produces AST representation of received Query
 */
export default class QueryValidator {
	private inputQuery: QueryObject;
	private queryAST: AST;
	private regexSInput: RegExp = /^\*?[^*]*\*?$/;
	private regexApplyKey: RegExp = /^[^_]+$/;
	private regexApplyToken: RegExp = /^MAX|MIN|AVG|COUNT|SUM$/;
	private regexMKey: RegExp = /^[^_]+_(avg|pass|fail|audit|year|lat|lon|seats)$/;
	private regexSKey: RegExp =
		/^[^_]+_(dept|id|instructor|title|uuid|fullname|shortname|number|name|address|type|furniture|href)$/;

	private regexKey: RegExp = new RegExp(this.regexMKey.source + "|" + this.regexSKey.source);
	private regexAnyKey: RegExp =
		new RegExp( this.regexKey.source + "|" + this.regexApplyKey.source);

	constructor(query: object) {
		this.inputQuery = query as QueryObject;
		this.queryAST = new AST("QUERY", "");
	}

	/**
	 * Checks query object for valid EBNF.
	 * @return AST representation of query
	 */
	public validateEBNF(): AST {
		let hasTransform: boolean = this.checkQUERY();
		let whereAST = new AST("WHERE","");
		let optionsAST = new AST("OPTIONS", "");
		this.queryAST.children.push(whereAST);
		this.queryAST.children.push(optionsAST);

		// If WHERE:{} no need to check Filters
		if (Object.keys(this.inputQuery.WHERE).length !== 0) {
			this.checkFILTER(this.inputQuery.WHERE, whereAST);
		}

		this.checkOPTIONS(this.inputQuery.OPTIONS, optionsAST);

		if (hasTransform) {
			let transformAST = new AST("TRANSFORMATIONS", "");
			this.queryAST.children.push(transformAST);
			this.checkTRANSFORMATIONS(this.inputQuery.TRANSFORMATIONS as QueryTransform, transformAST);
		}
		return this.queryAST;
	}

	/**
	 * Verify WHERE and OPTIONS exists and check if query contains TRANSFORMATIONS
	 * @throws InsightError if WHERE or OPTIONS parameters missing.
	 * Also throws InsightError if extra parameters other than TRANSFORMATIONS included.
	 * @return true if query contains TRANSFORMATIONS parameter
	 */
	private checkQUERY(): boolean {
		if (!Object.keys(this.inputQuery).includes("WHERE")) {
			throw new InsightError("Missing WHERE in query");
		} else if (!Object.keys(this.inputQuery).includes("OPTIONS")) {
			throw new InsightError("Missing OPTIONS in query");
		} else if ((Object.keys(this.inputQuery).length > 3)
			|| (Object.keys(this.inputQuery).length > 2	&& !Object.keys(this.inputQuery).includes("TRANSFORMATIONS"))) {
			throw new InsightError("Invalid keys in query. Only WHERE, OPTIONS, TRANSFORMATIONS permitted.");
		}
		return Object.keys(this.inputQuery).includes("TRANSFORMATIONS");
	}

	// Check valid filters recursively
	private checkFILTER(queryFilter: QueryFilter, parent: AST) {
		// Each Filter should only have one filter parameter
		if (Object.keys(queryFilter).length !== 1) {
			throw new InsightError("Invalid FILTER. Exactly one parameter required per FILTER.");
		}
		switch (Object.keys(queryFilter)[0]) {
			case "AND":
			case "OR": {
				this.checkLogic(queryFilter, parent, Object.keys(queryFilter)[0] as keyof QueryFilter);
				break;
			}
			case "LT":
			case "GT":
			case "EQ": {
				this.checkMComparator(queryFilter, parent, Object.keys(queryFilter)[0] as keyof QueryFilter);
				break;
			}
			case "IS": {
				this.checkIS(queryFilter, parent);
				break;
			}
			case "NOT": {
				this.checkNOT(queryFilter, parent);
				break;
			}
			default: {
				throw new InsightError("Invalid FILTER. FILTER must be one of AND, OR, LT, GT, EQ, IS, NOT.");
			}
		}
	}

	private checkLogic(andOrFilter: QueryFilter, parent: AST, key: keyof QueryFilter) {
		// check AND/OR is Array of non-zero length
		if (!(andOrFilter[key] instanceof Array)
			|| Object.keys(andOrFilter[key] as QueryFilter[]).length < 1) {
			throw new InsightError(key + " keys must be contained in non-zero Array");
		}
		// Add AND/OR to AST
		let andOrAST = new AST("LOGIC", key);
		parent.children.push(andOrAST);
		let filter: QueryFilter[] = andOrFilter[key] as QueryFilter[];
		for (const x in filter) {
			let newFilter = filter[x];
			this.checkFILTER(newFilter, andOrAST);
		}
	}

	private checkMComparator(mFilter: QueryFilter, parent: AST, key: keyof QueryFilter) {

		let mCompAST = new AST("MCOMP", key);
		parent.children.push(mCompAST);
		const mComparator: Comparator = mFilter[key] as Comparator;
		if (Object.keys(mComparator).length !== 1) {
			throw new InsightError("Invalid" + key + "FILTER");
		} else if (!(this.regexMKey.test(Object.keys(mComparator)[0]))
			|| (typeof Object.values(mComparator)[0] !== "number")) {
			throw new InsightError(key + " FILTER requires numerical field and numeric value");
		}
		// add MCOMP key/value to AST
		let mkeyAST = new AST("MKEY", Object.keys(mComparator)[0]);
		mCompAST.children.push(mkeyAST);
		let mvalAST = new AST("MVAL", Object.values(mComparator)[0]);
		mCompAST.children.push(mvalAST);
	}

	private checkIS(isFilter: QueryFilter, parent: AST) {
		// check if IS has sKey and value
		let comparator: Comparator = isFilter.IS as Comparator;
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
		let skeyAST = new AST("SKEY", Object.keys(comparator)[0]);
		isAST.children.push(skeyAST);
		if (Object.values(comparator)[0] as string ) {
			let matchString: string = "^" + (Object.values(comparator)[0] as string) + "$";
			matchString = matchString.replaceAll("*", ".*");
			let svalAST = new AST("SVAL", new RegExp(matchString));
			isAST.children.push(svalAST);
		}
	}

	private checkNOT(notFilter: QueryFilter, parent: AST) {
		// add NOT to AST
		let notAST = new AST("NEG", "NOT");
		parent.children.push(notAST);
		this.checkFILTER(notFilter.NOT as QueryFilter, notAST);
	}

	private checkOPTIONS(queryOptions: QueryOptions, parent: AST) {
		if (!Object.keys(queryOptions).includes("COLUMNS")) {
			throw new InsightError("Missing COLUMNS in OPTIONS");
		} else if (queryOptions.COLUMNS.length < 1) {
			throw new InsightError("COLUMNS must be an array containing at least one key");
		} else if ((!Object.keys(queryOptions).includes("ORDER") && Object.keys(queryOptions).length > 1)
			|| Object.keys(queryOptions).length > 2) {
			throw new InsightError("Invalid keys in OPTIONS");
		}
		this.checkCOLUMNS(queryOptions.COLUMNS, parent);
		if (Object.keys(queryOptions).includes("ORDER")) {
			this.checkORDER(queryOptions.ORDER as QuerySort | string, parent);
		}
	}

	private checkCOLUMNS(queryColumns: string[], parent: AST) {
		let colAST = new AST("COLUMNS", "");
		parent.children.push(colAST);
		this.checkArrayKeyHelper(queryColumns, colAST);
	}

	private checkORDER(queryOrder: QuerySort | string, parent: AST) {
		let orderAST = new AST("ORDER", "");
		parent.children.push(orderAST);
		if (typeof queryOrder === "string") {
			this.checkArrayKeyHelper([queryOrder as string], orderAST);
		} else {
			queryOrder = queryOrder as QuerySort;
			if (queryOrder.keys === undefined || queryOrder.keys.length < 1) {
				throw new InsightError("At least one order key is required.");
			}
			let orderKeyAST = new AST("DIRECTION", queryOrder["dir"] as string);
			orderAST.children.push(orderKeyAST);
			this.checkArrayKeyHelper(queryOrder.keys, orderKeyAST);
		}
	}

	private checkArrayKeyHelper (arrayKeys: string[], parent: AST) {
		for (const x in arrayKeys) {
			if ((parent.type !== "GROUP") && !this.regexAnyKey.test(arrayKeys[x])) {
				throw new InsightError(parent.type + " keys must be of form 'idstring_field' or match an applykey.");
			} else if ((parent.type === "GROUP") && !this.regexKey.test(arrayKeys[x])){
				throw new InsightError(parent.type + " keys must be of form 'idstring_field'");
			}
			let orderKeyAST = new AST((parent.type === "GROUP") ? "KEY" : "ANYKEY", arrayKeys[x]);
			parent.children.push(orderKeyAST);
		}
	}

	private checkTRANSFORMATIONS(queryTransform: QueryTransform, parent: AST) {
		if (queryTransform.GROUP.length < 1) {
			throw new InsightError("GROUP must contain an array with at least one key");
		} else if (queryTransform.APPLY.length < 1) {
			throw new InsightError("APPLY must contain an array with at least one rule");
		}
		let groupAST: AST = new AST("GROUP", "");
		parent.children.push(groupAST);
		this.checkArrayKeyHelper(queryTransform.GROUP, groupAST);
		this.checkAPPLY(queryTransform.APPLY, parent);
	}

	private checkAPPLY(applyList: ApplyRule[], parent: AST) {
		let applyAST: AST = new AST("APPLY", "");
		parent.children.push(applyAST);
		for (const x in applyList) {
			if (Object.keys(applyList[x]).length !== 1
				|| !this.regexApplyKey.test(Object.keys(applyList[x])[0])) {
				throw new InsightError("applykey must be one or more characters without underscores.");
			} else if (Object.keys(Object.values(applyList[x])[0]).length !== 1
				|| !this.regexApplyToken.test(Object.keys(Object.values(applyList[x])[0])[0])) {
				throw new InsightError("APPLYTOKEN must be one of MAX, MIN, AVG, COUNT, SUM.");
			} else if (!this.regexKey.test(Object.values(Object.values(applyList[x])[0] as string)[0])) {
				throw new InsightError("APPLYTOKENs must be applied to keys of form 'idstring_field'");
			}
			let applyRuleAST: AST = new AST("APPLYRULE", Object.keys(applyList[x])[0]);
			applyAST.children.push(applyRuleAST);
			let applyTokenAST: AST = new AST(Object.keys(Object.values(applyList[x])[0])[0],
				Object.values(Object.values(applyList[x])[0] as string)[0]);
			applyRuleAST.children.push(applyTokenAST);
		}
	}

	public validateSemantics(datasets: string[]): string {
		return validateSemantics(datasets, this.inputQuery, this.queryAST, this.regexKey, this.regexMKey);
	}
}
