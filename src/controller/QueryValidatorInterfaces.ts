/**
 * Contains interfaces and AST class for QueryValidator
 */

export interface QueryObject {
	WHERE: QueryFilter;
	OPTIONS: QueryOptions;
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

export interface ANDFilter extends QueryFilter {
	AND: QueryFilter[];
}
export interface ORFilter extends QueryFilter {
	OR: QueryFilter[];
}
export interface LTFilter extends QueryFilter {
	LT: Comparator;
}
export interface GTFilter extends QueryFilter {
	GT: Comparator;
}
export interface EQFilter extends QueryFilter {
	EQ: Comparator;
}
export interface ISFilter extends QueryFilter {
	IS: Comparator;
}
export interface NOTFilter extends QueryFilter {
	NOT: QueryFilter;
}

export interface QueryOptions {
	COLUMNS: string[];
	ORDER: string;
}

export interface Comparator {
	KEY: string | number;
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
