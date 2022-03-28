import express, {Application, Request, Response} from "express";
import * as http from "http";
import cors from "cors";
import InsightFacade from "../controller/InsightFacade";
import {InsightDatasetKind, InsightError} from "../controller/IInsightFacade";
import * as fs from "fs-extra";

let insightFacade: InsightFacade;
export default class Server {
	private readonly port: number;
	private express: Application;
	private server: http.Server | undefined;
	// private insightFacade: InsightFacade;

	constructor(port: number) {
		console.info(`Server::<init>( ${port} )`);
		this.port = port;
		this.express = express();

		this.registerMiddleware();
		this.registerRoutes();
		insightFacade = new InsightFacade();
		// preload courses and rooms datasets for C3 frontend Demo
		const datasetContents = new Map<string, string>();
		const datasetsToLoad: {[key: string]: string} = {
			courses: "./test/resources/archives/courses.zip",
			rooms: "./test/resources/archives/rooms.zip"
		};
		for (const key of Object.keys(datasetsToLoad)) {
			const content = fs.readFileSync(datasetsToLoad[key]).toString("base64");
			datasetContents.set(key, content);
		}
		insightFacade.addDataset(
			"courses", datasetContents.get("courses") ?? "", InsightDatasetKind.Courses);
		insightFacade.addDataset(
			"rooms", datasetContents.get("rooms") ?? "", InsightDatasetKind.Rooms);

		// NOTE: you can serve static frontend files in from your express server
		// by uncommenting the line below. This makes files in ./frontend/public
		// accessible at http://localhost:<port>/
		this.express.use(express.static("./frontend/public"));
	}

	/**
	 * Starts the server. Returns a promise that resolves if success. Promises are used
	 * here because starting the server takes some time and we want to know when it
	 * is done (and if it worked).
	 *
	 * @returns {Promise<void>}
	 */
	public start(): Promise<void> {
		return new Promise((resolve, reject) => {
			console.info("Server::start() - start");
			if (this.server !== undefined) {
				console.error("Server::start() - server already listening");
				reject();
			} else {
				this.server = this.express.listen(this.port, () => {
					console.info(`Server::start() - server listening on port: ${this.port}`);
					resolve();
				}).on("error", (err: Error) => {
					// catches errors in server start
					console.error(`Server::start() - server ERROR: ${err.message}`);
					reject(err);
				});
			}
		});
	}

	/**
	 * Stops the server. Again returns a promise so we know when the connections have
	 * actually been fully closed and the port has been released.
	 *
	 * @returns {Promise<void>}
	 */
	public stop(): Promise<void> {
		console.info("Server::stop()");
		return new Promise((resolve, reject) => {
			if (this.server === undefined) {
				console.error("Server::stop() - ERROR: server not started");
				reject();
			} else {
				this.server.close(() => {
					console.info("Server::stop() - server closed");
					resolve();
				});
			}
		});
	}

	// Registers middleware to parse request before passing them to request handlers
	private registerMiddleware() {
		// JSON parser must be place before raw parser because of wildcard matching done by raw parser below
		this.express.use(express.json());
		this.express.use(express.raw({type: "application/*", limit: "10mb"}));

		// enable cors in request headers to allow cross-origin HTTP requests
		this.express.use(cors());
	}

	// Registers all request handlers to routes
	private registerRoutes() {
		// This is an example endpoint this you can invoke by accessing this URL in your browser:
		// http://localhost:4321/echo/hello
		this.express.get("/echo/:msg", Server.echo);
		this.express.put("/dataset/:id/:kind", Server.putDataset);
		this.express.delete("/dataset/:id", Server.deleteDataset);
		this.express.post("/query", Server.postQuery);
		this.express.get("/datasets", Server.getDataset);
	}

	// The next two methods handle the echo service.
	// These are almost certainly not the best place to put these, but are here for your reference.
	// By updating the Server.echo function pointer above, these methods can be easily moved.
	private static echo(req: Request, res: Response) {
		try {
			console.log(`Server::echo(..) - params: ${JSON.stringify(req.params)}`);
			const response = Server.performEcho(req.params.msg);
			res.status(200).json({result: response});
		} catch (err) {
			res.status(400).json({error: err});
		}
	}

	private static performEcho(msg: string): string {
		if (typeof msg !== "undefined" && msg !== null) {
			return `${msg}...${msg}`;
		} else {
			return "Message not provided";
		}
	}

	private static putDataset(req: Request, res: Response) {
		try {
			if(req.params.kind === "courses") {
				insightFacade.addDataset(req.params.id, (req.body as Buffer).toString("base64")
					, InsightDatasetKind.Courses)
					.then((arr) => {
						res.status(200).json({result: arr});
					}).catch((err) => {
						res.status(400).json({error: err});
					});
			} else if(req.params.kind === "rooms") {
				insightFacade.addDataset(req.params.id, (req.body as Buffer).toString("base64")
					, InsightDatasetKind.Rooms)
					.then((arr) => {
						res.status(200).json({result: arr});
					}).catch((err) => {
						res.status(400).json({error: err});
					});
			}
		} catch(err) {
			res.status(400).json({error: err});
		}
	}

	private static deleteDataset(req: Request, res: Response) {
		try {
			insightFacade.removeDataset(req.params.id).then((str) => {
				res.status(200).json({result: str});
			}).catch((err) => {
				if(err instanceof InsightError) {
					res.status(400).json({error: err});
				} else {
					res.status(404).json({error: err});
				}
			});
		} catch (err) {
			res.status(400).json({error: err});
		}
	}

	private static postQuery(req: Request, res: Response) {
		// console.log(req.body);
		// console.log(req.body.WHERE);
		// console.log(req.body.WHERE.AND);
		// console.log(req.body.WHERE.AND[0]);
		// console.log(req.body.WHERE.AND[1]);
		try {
			insightFacade.performQuery(req.body).then((arr) => {
				res.status(200).json({result: arr});
			}).catch((err) => {
				res.status(400).json({InsightError: err.message});
				// console.log(res);
			});
		} catch(err) {
			res.status(400).json({error: err});
		}
	}

	private static getDataset(req: Request, res: Response) {
		try {
			insightFacade.listDatasets().then((arr) => {
				res.status(200).json({result: arr});
			});
		} catch (err) {
			res.status(400).json({error: err});
		}
	}
}
