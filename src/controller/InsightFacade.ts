import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";
import QueryValidator from "./QueryValidator";

import {countRows, datasetExists, unzipFile} from "./DatasetHelper";
import * as fs from "fs-extra";
import {AST} from "./QueryValidatorInterfaces";
import {buildResponse} from "./QueryResponse";
import {getRooms} from "./RoomHelper";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
// Do we need to store addedIds on disk so that addedIDs persists across instances of InsightFacade?
export default class InsightFacade implements IInsightFacade {
	private datasets: InsightDataset[];
	private datasetIDs: string[];
	private datasetObjects: Map<string, InsightResult[]>;

	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.datasets = [];
		this.datasetIDs = [];
		this.datasetObjects = new Map<string, InsightResult[]>();
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if (id === "" || id === null || id.trim().length === 0 || id.includes("_")) {
			return Promise.reject(new InsightError("invalid id"));
		}
		if(kind !== "courses" && kind !== "rooms") {
			return Promise.reject(new InsightError("invalid dataset kind"));
		}
		if(datasetExists(id, this.datasets)) {
			return Promise.reject(new InsightError("dataset already exists"));
		}
		if(kind === "courses") {
			return unzipFile(content).then((parsedSections) => {
				if (countRows(parsedSections) === 0) {
					return Promise.reject(new InsightError("no valid section"));
				}
				this.datasetObjects.set(id, parsedSections);
				let newDataset: InsightDataset = {
					id: id, kind: kind, numRows: countRows(parsedSections)
				};
				this.datasets.push(newDataset);
				if (!fs.pathExistsSync("./data/")) {
					fs.mkdirsSync("./data/");
				}
				let jsonOut: object[] = Array.from(parsedSections.entries());
				fs.writeFileSync("./data/" + id + ".json", JSON.stringify(jsonOut));
				this.datasetIDs.push(id);
				return Promise.resolve(this.datasetIDs);
			});
		} else {
			return getRooms(content).then((parsedRooms) => {
				if (countRows(parsedRooms) === 0) {
					return Promise.reject(new InsightError("no valid room"));
				}
				this.datasetObjects.set(id, parsedRooms);
				let newDataset: InsightDataset = {
					id: id, kind: kind, numRows: countRows(parsedRooms)
				};
				this.datasets.push(newDataset);
				if (!fs.pathExistsSync("./data/")) {
					fs.mkdirsSync("./data/");
				}
				let jsonOut: object[] = Array.from(parsedRooms.entries());
				fs.writeFileSync("./data/" + id + ".json", JSON.stringify(jsonOut));
				this.datasetIDs.push(id);
				return Promise.resolve(this.datasetIDs);
			});
		}
	}


	public removeDataset(id: string): Promise<string> {
		if(id === "" || id === null) {
			return Promise.reject(new InsightError("id cannot be empty or null"));
		}

		if (id.trim().length === 0 || id.includes("_")) {
			return Promise.reject(new InsightError("id cannot only be whitespace or cannot contain " +
				"an underscore"));
		}

		if(!datasetExists(id, this.datasets)) {
			return Promise.reject(new NotFoundError("dataset does not exist"));
		}

		for (const i of this.datasets) {
			if (i.id === id) {
				this.datasets.splice(this.datasets.indexOf(i),1);
			}
		}
		fs.removeSync("./data" + id + ".json");
		return Promise.resolve(id);
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		// valid query must be JSON object literal; cast to object, reject on error
		let queryObj: object;
		try{
			queryObj = query as object;
		} catch (error) {
			return Promise.reject(new InsightError("Query is not valid JSON object"));
		}
		let validator: QueryValidator = new QueryValidator(queryObj);
		let validAST: AST;
		let queryDataset: string;
		try {
			// Check if query is valid against EBNF grammar and Builds AST
			validAST = validator.validateEBNF();
			// check if query AST has valid semantics and dataSet in query exists
			queryDataset = validator.validateSemantics(this.datasetIDs);
		} catch (insightError) {
			return Promise.reject(insightError);
		}
		// retrieve data and build InsightResult[]
		let queryResponse: InsightResult[] = buildResponse(validAST, queryDataset, this.datasetObjects);
		// return data
		return Promise.resolve(queryResponse);
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(this.datasets);
	}
}
