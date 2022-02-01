import {IInsightFacade, InsightDataset, InsightDatasetKind, InsightError, InsightResult} from "./IInsightFacade";

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
		if(id.trim().length === 0) {
			return Promise.reject(new InsightError("id cannot only be whitespace"));
		}

		if(kind !== InsightDatasetKind.Courses) {
			return Promise.reject(new InsightError("invalid dataset kind"));
		}

		if(id.includes("_")) {
			return Promise.reject(new InsightError("id cannot contain an underscore"));
		}

		if(id === "") {
			return Promise.reject(new InsightError("id cannot be empty"));
		}
		return Promise.reject("Not implemented.");
	}

	public removeDataset(id: string): Promise<string> {
		if(id.trim().length === 0) {
			return Promise.reject(new InsightError("id cannot only be whitespace"));
		}

		if(id.includes("_")) {
			return Promise.reject(new InsightError("id cannot contain an underscore"));
		}
		return Promise.reject("Not implemented.");


	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}
}
