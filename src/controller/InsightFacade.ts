import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";
import {countRows, datasetExists, parseDataset, unzipFile, validJSONFile} from "./DatasetHelper";
import * as fs from "fs-extra";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	public datasets: InsightDataset[];
	constructor() {
		console.log("InsightFacadeImpl::init()");
		this.datasets = [];
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		if(id.trim().length === 0 || id.includes("_")) {
			return Promise.reject(new InsightError("id cannot only be whitespace or cannot contain " +
				"an underscore"));
		}

		if(id === "" || id === null) {
			return Promise.reject(new InsightError("id cannot be empty or null"));
		}

		if(kind !== "courses") {
			return Promise.reject(new InsightError("invalid dataset kind"));
		}

		if(datasetExists(id, this.datasets)) {
			return Promise.reject(new InsightError("dataset already exists"));
		}
		return unzipFile(content).then((parsedDataArray) => {
			if(countRows(parsedDataArray) === 0) {
				return Promise.reject(new InsightError("no valid section"));
			}

			let newDataset: InsightDataset = {
				id: id,
				kind: kind,
				numRows: countRows(parsedDataArray)
			};
			this.datasets.push(newDataset);
			fs.writeFileSync("./data" + id + ".json", JSON.stringify(parsedDataArray));
			let addedIds: string[] = [];
			for(const i of this.datasets) {
				addedIds.push(i.id);
			}
			return Promise.resolve(addedIds);
		});
	}

	public removeDataset(id: string): Promise<string> {
		if(id.trim().length === 0 || id.includes("_")) {
			return Promise.reject(new InsightError("id cannot only be whitespace or cannot contain " +
				"an underscore"));
		}

		if(id === "" || id === null) {
			return Promise.reject(new InsightError("id cannot be empty or null"));
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
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.resolve(this.datasets);
	}
}
