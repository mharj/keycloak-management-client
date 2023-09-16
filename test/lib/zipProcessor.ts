import * as zlib from 'zlib';
import {IStoreProcessor} from 'tachyon-drive';

function unzip(data: Buffer): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		zlib.unzip(data, (err, buffer) => {
			if (err) {
				reject(err);
			} else {
				resolve(buffer);
			}
		});
	});
}

function zip(data: Buffer): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		zlib.gzip(data, (err, buffer) => {
			if (err) {
				reject(err);
			} else {
				resolve(buffer);
			}
		});
	});
}

/**
 * GZip compression processor for Tachyon Drive
 */
export const zipProcessor: IStoreProcessor<Buffer> = {
	preStore: (data: Buffer) => zip(data),
	postHydrate: (buffer: Buffer) => unzip(buffer),
};
