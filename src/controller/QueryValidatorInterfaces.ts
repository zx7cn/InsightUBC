/**
 * Contains interfaces and AST class for QueryValidator
 */

export interface QueryObject {
	WHERE: QueryFilter;
	OPTIONS: QueryOptions;
	TRANSFORMATIONS?: QueryTransform;
}

export interface QueryFilter {
	AND?: QueryFilter[];
	OR?: QueryFilter[];
	LT?: Comparator;
	GT?: Comparator;
	EQ?: Comparator;
	IS?: Comparator;
	NOT?: QueryFilter;
}

export interface Comparator {
	KEY: string | number;
}

export interface QueryOptions {
	COLUMNS: string[];
	ORDER?: QuerySort | string;
}

export interface QuerySort {
	dir: "UP" | "DOWN";
	keys: string[];
}

export interface QueryTransform {
	GROUP: string[];
	APPLY: ApplyRule[];
}

export interface ApplyRule {
	applykey: ApplyToken;
}

export interface ApplyToken {
	MAX?: string;
	MIN?: string;
	AVG?: string;
	COUNT?: string;
	SUM?: string;
}

export class AST {
	public type: string;
	public value: string | number | RegExp;
	public children: AST[];

	constructor(type: string, value: string|number|RegExp, children: AST[] = []) {
		this.type = type;
		this.value = value;
		this.children = children;
	}
}
