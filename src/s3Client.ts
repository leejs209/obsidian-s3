import blobToIt from "blob-to-it";
import { BucketItem, Client } from "minio";
import { Notice } from "obsidian";
import { join } from "path";
import internal from "stream";

export class S3Client {
	client: Client;
	bucketName: string;
	folderName: string;
	constructor(endPoint: string, accessKey: string, secretKey: string, bucketName: string, folderName: string) {
		if (endPoint.startsWith('https://') || endPoint.startsWith('http://')) {
			const url = new URL(endPoint);
			endPoint = url.hostname;
		}

		this.bucketName = bucketName;
		this.folderName = folderName;

		new Notice("Creating S3 Client");
		this.client = new Client({
			endPoint,
			accessKey,
			secretKey,
			useSSL: true
		});
	}

	public listObjects() {
		return new Promise<BucketItem[]>((resolve) => {
			const s3Index: BucketItem[] = [];
			this.client.listObjects(this.bucketName, this.folderName, true)
				.on('data', (i) => {
					s3Index.push(i)
				})
				.on('end', () => {
					resolve(s3Index)
				});
		})
	}

	public upload(file: File, progress?: (prog: number) => void, cleanup?: () => void) {
		const readable = internal.Readable.from(blobToIt(file));
		let prog = 0;
		readable.on('data', (c) => {
			prog += c.length;
			if (progress) progress(Math.round((prog / file.size) * 100));
		})
		readable.on('close', () => { if (cleanup) cleanup(); })
		return this.client.putObject(this.bucketName,
			join(this.folderName, file.name), readable, file.size);
	}

	public getObject(path: string) {
		return this.client.getObject(this.bucketName, path);
	}

	public removeObject(path: string) {
		return this.client.removeObject(this.bucketName, path);
	}
}


