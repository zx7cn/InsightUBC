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

export interface ANDFilter extends QueryFilter{
	AND: QueryFilter[];
	OR?: never;
	LT?: never;
	GT?: never;
	EQ?: never;
	IS?: never;
	NOT?: never;
}

export interface ORFilter extends QueryFilter {
	AND?: never;
	OR: QueryFilter[];
	LT?: never;
	GT?: never;
	EQ?: never;
	IS?: never;
	NOT?: never;
}

export interface LTFilter extends QueryFilter {
	And?: never;
	OR?: never;
	LT: Comparator;
	GT?: never;
	EQ?: never;
	IS?: never;
	NOT?: never;
}
export interface GTFilter extends QueryFilter {
	And?: never;
	OR?: never;
	LT?: never;
	GT: Comparator;
	EQ?: never;
	IS?: never;
	NOT?: never;
}
export interface EQFilter extends QueryFilter {
	And?: never;
	OR?: never;
	LT?: never;
	GT?: never;
	EQ: Comparator;
	IS?: never;
	NOT?: never;
}
export interface ISFilter extends QueryFilter {
	And?: never;
	OR?: never;
	LT?: never;
	GT?: never;
	EQ?: never;
	IS: Comparator;
	NOT?: never;
}
export interface NOTFilter extends QueryFilter {
	And?: never;
	OR?: never;
	LT?: never;
	GT?: never;
	EQ?: never;
	IS?: never;
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
