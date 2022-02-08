import {InsightError, InsightResult} from "./IInsightFacade";
import {brotliCompress} from "zlib";

interface QueryObject {
	WHERE: QueryFilter;
	OPTIONS: QueryOptions;
}

interface QueryFilter {
	AND?: QueryFilter[];
	OR?: QueryFilter[];
	LT?: Comparator;
	GT?: Comparator;
	EQ?: Comparator;
	IS?: Comparator;
	NOT?: QueryFilter;
}

interface ANDFilter extends QueryFilter {
	AND: QueryFilter[];
}
interface ORFilter extends QueryFilter {
	OR: QueryFilter[];
}
interface LTFilter extends QueryFilter {
	LT: Comparator;
}
interface GTFilter extends QueryFilter {
	GT: Comparator;
}
interface EQFilter extends QueryFilter {
	EQ: Comparator;
}
interface ISFilter extends QueryFilter {
	IS: Comparator;
}
interface NOTFilter extends QueryFilter {
	NOT: QueryFilter;
}

interface QueryOptions {
	COLUMNS: string[];
	ORDER: string;
}

interface Comparator {
	KEY: string | number;
}

/**
 * Helper class to validate incoming queries.  Handles EBNF and semantic checks.
 */

export default class QueryValidator {

	public inputQuery: QueryObject;
	private regexColumnKey: RegExp = /(\w)+_(avg|pass|fail|audit|year|dept|id|instructor|title|uuid)$/;
	private regexMKey: RegExp = /(\w)+_(avg|pass|fail|audit|year)$/;
	private regexSKey: RegExp = /(\w)+_(dept|id|instructor|title|uuid)$/;
	private regexFilter: RegExp = /^(AND|OR|LT|GT|EQ|IS|NOT)$/;
	private regexSInput: RegExp = /^\*?\w*\*?$/;

	constructor(query: object) {
		this.inputQuery = query as QueryObject;
	}

	// Check validEBNF of query object
	public validateEBNF() {
		this.checkQUERY();
		this.checkOPTIONS(this.inputQuery["OPTIONS"]);
		// If WHERE:{} no need to check Filters
		if (Object.keys(this.inputQuery["WHERE"]).length !== 0) {
			this.checkFILTER(this.inputQuery["WHERE"]);
		}
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
	private checkFILTER(queryFilter: QueryFilter) {
		// Each Filter should only have one filter parameter
		if (Object.keys(queryFilter).length !== 1
			|| !this.regexFilter.test(Object.keys(queryFilter)[0])) {
			throw new InsightError("Invalid FILTER");
		}
		let newFilter: QueryFilter = queryFilter;
		switch (Object.keys(queryFilter)[0]) {
			case "AND": {
				this.checkAND(queryFilter as ANDFilter);
				break;
			}
			case "OR": {
				this.checkOR(queryFilter as ORFilter);
				break;
			}
			case "LT": {
				this.checkLT(queryFilter as LTFilter);
				break;
			}
			case "GT": {
				this.checkGT(queryFilter as GTFilter);
				break;
			}
			case "EQ": {
				this.checkEQ(queryFilter as EQFilter);
				break;
			}
			case "IS": {
				this.checkIS(queryFilter as ISFilter);
				break;
			}
			case "NOT": {
				this.checkNOT(queryFilter as NOTFilter);
				break;
			}
			default: {
				throw new InsightError("Invalid FILTER");
			}
		}
	}

	private checkAND(andFilter: ANDFilter) {
		// check AND is Array of non-zero length
		if (!(andFilter["AND"] instanceof Array)
			|| Object.keys(andFilter["AND"]).length < 1) {
			throw new InsightError("AND keys must be contained in non-zero Array");
		}
		// iterate through each AND key
		for (const x in andFilter["AND"]) {
			let newFilter = andFilter["AND"][x];
			this.checkFILTER(newFilter);
		}
	}

	private checkOR(orFilter: ORFilter) {
		// check OR is Array of non-zero length
		if (!(orFilter["OR"] instanceof Array)
			|| Object.keys(orFilter["OR"]).length < 1) {
			throw new InsightError("OR keys must be contained in non-zero Array");
		}
		// iterate through each OR key
		for (const x in orFilter["OR"]) {
			let newFilter = orFilter["OR"][x];
			this.checkFILTER(newFilter);
		}
	}

	private checkLT(ltFilter: LTFilter) {
		// check if LT has mKey and value
		let comparator: Comparator = ltFilter["LT"];
		this.checkMComparator(comparator);
	}

	private checkGT(gtFilter: GTFilter) {
		// check if GT has mKey and value
		let comparator: Comparator = gtFilter["GT"];
		this.checkMComparator(comparator);
	}

	private checkEQ(eqFilter: EQFilter) {
		// check if EQ has mKey and value
		const comparator: Comparator = eqFilter["EQ"];
		this.checkMComparator(comparator);
	}

	// checks MCOMPARATOR for valid mKey and value
	private checkMComparator(mComparator: Comparator) {
		if (Object.keys(mComparator).length !== 1) {
			throw new InsightError("Invalid MCOMPARISON FILTER");
		} else if (!(this.regexMKey.test(Object.keys(mComparator)[0]))
			|| (typeof Object.values(mComparator)[0] !== "number")) {
			throw new InsightError("MCOMPARISON FILTER requires numerical field and numeric value");
		}
	}

	private checkIS(isFilter: ISFilter) {
		// check if IS has sKey and value
		let comparator: Comparator = isFilter["IS"];
		if (Object.keys(comparator).length !== 1) {
			throw new InsightError("Invalid IS FILTER");
		} else if (!(this.regexSKey.test(Object.keys(comparator)[0]))
			|| (typeof Object.values(comparator)[0] !== "string")
			|| !(this.regexSInput.test(Object.values(comparator)[0] as string))) {
			throw new InsightError("IS FILTER requires alphanumeric field and string value of form *input*");
		}
	}

	private checkNOT(notFilter: NOTFilter) {
		this.checkFILTER(notFilter["NOT"]);
	}

	// Check for valid COLUMNS and ORDER
	private checkOPTIONS(queryOptions: QueryOptions) {
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
		// check at least one column key, and column keys of type string with correct format
		let queryColumns: string[] = queryOptions["COLUMNS"];
		if (queryColumns.length === 0) {
			throw new InsightError("COLUMNS must contain at least one key");
		} else {
			for (const x in queryColumns) {
				if (typeof queryColumns[x] !== "string") {
					throw new InsightError("COLUMN keys must be of type string");
				} else if (!this.regexColumnKey.test(queryColumns[x])) {
					throw new InsightError("COLUMN keys must be of type: 'idstring_field'\"");
				}
			}
		}
		// Check ORDER key is string with correct format (if applicable)
		if (Object.keys(queryOptions).includes("ORDER")) {
			if (!this.regexColumnKey.test(queryOptions["ORDER"])) {
				throw new InsightError("ORDER key must be of type: 'idstring_field'");
			}
		}
	}

	public validateSemantics() {
		// stub
	}

	public buildResponse(): InsightResult[] {
		return [];
	}
}
